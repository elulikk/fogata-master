// Escena principal: las fogatas, la pila de leña, el clima y la economía.

import { WOODS, SPECIES, SPECIES_ORDER, CUTS, CUT_ORDER, woodKey } from '../data/woods.js';
import { MILESTONES, milestoneDue, levelThreshold } from '../data/progress.js';
import { allItems, woodOpen, MARKET_RECOVER } from '../data/shop.js';
import { SUPPLIERS } from '../data/supply.js';
import { CARDS, rollCards } from '../data/cards.js';
import { META } from '../data/meta.js';
import { toolOf } from '../data/tools.js';
import { stepNight, nightGoal, dawnAsh, DAY, FIRST_DAY_LEFT } from '../data/nights.js';
import { ACHIEVEMENTS, rewardLabel } from '../data/achievements.js';
import { Log } from '../objects/Log.js';
import { Fire } from '../objects/Fire.js';
import { Pit } from '../objects/Pit.js';
import { Weather } from '../objects/Weather.js';
import { createTextures, W, H, GROUND_Y, layerTint, SKY_KEYS } from '../gfx/textures.js';
import { createHearthTextures } from '../gfx/hearths.js';
import { pointSegDist } from '../utils/geom.js';
import { nearestFree, TIER_TINT } from '../utils/slots.js';
import { SlotController } from './SlotController.js';
import { GROUND_BUDGET, footprint, SIZES, MAX_SIZE, STRUCTURE, capacityOf } from '../data/sizes.js';

const RACK = { left: 18, right: 232, bottom: GROUND_Y - 4 };
const RACK_MIN_TOP = 214; // techo de la pila: su título queda debajo del HUD de calor
// Textos que hablan de la pila (lluvia, +N de una entrega): se corren a la derecha del estante para no taparlo.
const RACK_TEXT_X = RACK.right + 90;
// Números de combo visibles a la vez; los que pasan del tope no se muestran (el calor igual se suma).
const COMBO_TEXT_CAP = 6;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.state = this.registry.get('state');
    this.audio = this.registry.get('audio');
    this.ui = this.registry.get('ui');
    const data = this.state.data;

    createTextures(this);
    createHearthTextures(this);
    // Fondo en capas (depth 0..0.5, debajo de todo lo demás); el cielo de amanecer se funde entre cielo y colinas.
    this.skyLayer = this.add.image(0, 0, 'bg-sky').setOrigin(0).setDepth(0);
    // Ciclo de luz: cielos apilados (noche → noche profunda → atardecer → día) con alpha normalizado.
    this.skies = [['night', this.skyLayer], ...[['deep', 0.01], ['dusk', 0.02], ['day', 0.03]].map(([ph, d]) =>
      [ph, this.add.image(0, 0, SKY_KEYS[ph]).setOrigin(0).setDepth(d).setAlpha(0).setScale(ph === 'deep' ? 1 : 2)])];
    this.skyW = null; // pesos suavizados por fase (se inicializan en el primer updateLight)
    this.dawnSky = this.add.image(0, 0, 'sky-dawn').setOrigin(0).setScale(2).setDepth(0.05).setAlpha(0);
    // Rayos del sol naciente (x≈435, 104 px sobre el piso): el origen queda en el sol para que el giro sea alrededor de él.
    this.dawnRays = this.add.image(W * 0.34, GROUND_Y - 104, 'dawn-rays').setScale(2).setOrigin(0.34, (GROUND_Y - 104) / H).setDepth(0.06).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.parallax = [['hills', 'bg-hills-lit', 0.1, 4], ['far', 'bg-trees-far-lit', 0.2, 8], ['mid', 'bg-trees-mid-lit', 0.3, 13], ['near', 'bg-trees-near-lit', 0.4, 20]].map(([layer, key, depth, amp]) =>
      ({ layer, amp, img: this.add.image(W / 2, H / 2, key).setScale(1.04).setDepth(depth) }));
    this.groundLayer = this.add.image(0, 0, 'bg-ground-lit').setOrigin(0).setDepth(0.5);
    this.parallaxX = 0;

    this.fire = new Fire(this, this.audio);
    const pitXs = this.pitPositions(data.pits.map((c) => c.size | 0));
    this.pitObjs = data.pits.map((cfg, i) => new Pit(this, i, cfg, pitXs[i]));
    this.pitObjs.forEach((p) => this.fire.addPit(p));
    this.weather = new Weather(this, this.audio);

    this.warm = this.add.rectangle(0, 0, W, H, 0xff6a20).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(55);
    this.coldTint = this.add.rectangle(0, 0, W, H, 0x1c2f78).setOrigin(0).setAlpha(0).setDepth(56);
    this.slotsCtl = new SlotController(this);
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setScale(2).setDepth(60);

    this.orbs = [];
    this.drag = null;
    this.paused = false;
    this.bellowsPit = null;
    this.lastPump = 0;
    this.rate = 0;
    this.supplyTimers = {}; // avance (0..1) de cada proveedor de data/supply.js
    this.demandTimer = 0;
    this.pendingLevel = null;
    this.resetting = false;
    this.nightTimer = 0;
    this.rateInfo = { total: 0, parts: [] };
    this.wetTimer = 0;
    this.checkTimer = 0;
    this.saveTimer = 0;
    this.hintTimer = 0;
    this.sinceStart = 0;
    this.combo = 0;
    this.comboT = 0;
    this.comboFloats = 0; // números de combo activos (tope COMBO_TEXT_CAP)
    this.comboSeq = 0;    // para abrirlos en abanico
    this.setMotion(!data.settings?.reduceMotion);

    this.createRack();
    this.setupInput();
    this.setupFireEvents();
    this.setupFeelEvents();
    this.bindUi();

    // Arranque: una fogata con leña ya prendida. Al volver a una partida
    // guardada solo queda una rama encendida (la leña en el fuego no se guarda).
    const pit = this.pitObjs[0];
    if (data.playTime < 1) this.fire.ignite(this.addLog('pino_tronco', pit), true);
    this.fire.ignite(this.addLog('pino_rama', pit), true);

    // Al cargar una partida, vuelvo a mostrar lo que ya estaba desbloqueado.
    for (const id of Object.keys(data.unlocked)) this.applyUnlock(id, false);
    this.revealAshes();
    // Tutorial: quien ya tiene partida no lo ve; el progreso del tutorial se guarda en la UI.
    this.ui.tutorial('load', {
      progress: data.totalCalor > 120 || (data.level | 0) > 1 || Object.keys(data.unlocked).length > 0,
      size: Math.max(0, ...data.pits.map((q) => q.size | 0)),
    });
    this.state.onStale = () => this.ui.eventCard?.({
      icon: '⚠️',
      title: 'Otra pestaña guardó esta partida',
      text: 'Esta pestaña ya no guarda para no pisar el progreso. ¿Querés seguir acá y pisar el guardado?',
      choices: [{ label: 'Seguir en esta pestaña', id: 'take' }, { label: 'Dejar como está', id: 'keep' }],
    }, (id) => { if (id === 'take') this.state.takeOver(); });
    if (data.unlocked.clima) this.weather.timer = 40;

    // Tras un prestigio, el resumen se muestra con la escena ya reiniciada.
    if (this.state.pendingSummary && this.fx) this.cameras.main.fadeIn(700, 10, 6, 4);
    const summary = this.state.pendingSummary;
    if (summary) {
      this.state.pendingSummary = null;
      this.showSummary(summary);
    }
  }

  // --- Pozos ---

  // Posiciones x de los pozos según su huella: se reparten en el terreno de GROUND_BUDGET px,
  // a la derecha del estante, con la separación que sobre (tope 110 px) y el grupo corrido a la izquierda.
  pitPositions(sizes) {
    const ground = RACK.right + 38;
    const foot = sizes.map((s) => footprint(s));
    const total = foot.reduce((a, b) => a + b, 0);
    const n = sizes.length;
    const gap = n > 1 ? Math.max(0, Math.min(110, (GROUND_BUDGET - total) / (n - 1))) : 0;
    const used = total + gap * (n - 1);
    let x = ground + Math.max(0, GROUND_BUDGET - used) * 0.35;
    return foot.map((f) => {
      const cx = x + f / 2;
      x += f + gap;
      return cx;
    });
  }

  // Reubica los pozos (al agrandar o sumar uno): la leña de adentro se va con su pozo.
  layoutPits() {
    const xs = this.pitPositions(this.pitObjs.map((p) => p.size));
    this.pitObjs.forEach((p, i) => p.setX(xs[i]));
  }

  // Pone una pieza directamente en un lugar libre del pozo (arranque de la partida).
  addLog(key, pit) {
    const slot = nearestFree(pit.slotList, WOODS[key].tier, pit.x, GROUND_Y);
    const log = new Log(this, slot.x, slot.y, key, slot.angle);
    this.fire.addLog(log);
    this.fire.placeLog(log, pit, slot, true);
    return log;
  }

  // --- Pila de leña ---
  // Una fila por especie (las que ya aparecieron) y una columna por tamaño, con los colores de sus lugares.

  createRack() {
    this.rackGfx = this.add.graphics().setDepth(5);
    this.rackItems = [];
    this.cells = [];
    this.rackSig = '';
    this.rackInfo = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka, system-ui', fontSize: '14px', color: '#f3e6d3', backgroundColor: '#1a1009ee',
      padding: { x: 10, y: 8 }, wordWrap: { width: 250 }, lineSpacing: 3,
    }).setDepth(88).setVisible(false);
    this.layoutRack();
  }

  layoutRack() {
    const seen = this.state.data.seenWood;
    const rows = SPECIES_ORDER.filter((sp) => seen[sp] || woodOpen(this.state.data, sp));
    if (seen.pina) rows.push('pina');
    const sig = rows.join(',');
    if (sig === this.rackSig) return;
    this.rackSig = sig;

    for (const o of this.rackItems) o.destroy();
    this.rackItems = [];
    this.cells = [];
    const g = this.rackGfx;
    g.clear();

    // Con muchas especies las filas se aprietan para que la pila no suba hasta el HUD.
    const ROW_H = Math.min(56, Math.floor((RACK.bottom - RACK_MIN_TOP - 26) / rows.length));
    const top = RACK.bottom - rows.length * ROW_H - 26;
    const cw = (RACK.right - RACK.left - 8) / CUT_ORDER.length;
    const textStyle = (size, color) => ({ fontFamily: 'Fredoka, system-ui', fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 3 });

    // Estantería de madera.
    g.fillStyle(0x2a1b10, 1);
    g.fillRect(RACK.left, top, 10, RACK.bottom - top + 4);
    g.fillRect(RACK.right - 10, top, 10, RACK.bottom - top + 4);
    g.fillStyle(0x3a2616, 1);
    g.fillRect(RACK.left - 4, top - 6, RACK.right - RACK.left + 8, 10);
    this.rackItems.push(this.add.text((RACK.left + RACK.right) / 2, top - 22, 'LEÑA', {
      fontFamily: 'Fredoka, system-ui', fontSize: '16px', color: '#c9a77a', fontStyle: '600',
    }).setOrigin(0.5).setDepth(6));
    CUT_ORDER.forEach((cut, i) => {
      const color = `#${TIER_TINT[i].toString(16).padStart(6, '0')}`;
      this.rackItems.push(this.add.text(RACK.left + 4 + cw * (i + 0.5), top + 13, CUTS[cut].name, textStyle(13, color)).setOrigin(0.5).setDepth(7));
    });

    rows.forEach((sp, r) => {
      const bottom = RACK.bottom - (rows.length - 1 - r) * ROW_H;
      g.fillStyle(0x3a2616, 1);
      g.fillRect(RACK.left - 2, bottom - 6, RACK.right - RACK.left + 4, 8);
      const name = sp === 'pina' ? 'Piñas' : SPECIES[sp].name;
      this.rackItems.push(this.add.text(RACK.left + 12, bottom - ROW_H + 3, name, textStyle(12, '#c9a77a')).setDepth(7));
      const keys = sp === 'pina' ? ['pina'] : CUT_ORDER.map((c) => woodKey(sp, c));
      keys.forEach((key, i) => {
        const x = RACK.left + 4 + cw * i;
        const wood = WOODS[key];
        const scale = Math.min(1, (cw - 8) / wood.length);
        const img = this.add.image(x + cw / 2, bottom - 24, `log-${key}`).setScale(scale).setDepth(6);
        const label = this.add.text(x + cw - 2, bottom - 7, '', textStyle(13, '#f3e6d3')).setOrigin(1, 1).setDepth(7);
        // El + compra un manojo ahí mismo: la pila es también el mostrador del mercachifle.
        const item = allItems(this.state.data).find((it) => it.key === key);
        const plus = item ? this.add.text(x + cw - 3, bottom - ROW_H + 4, '+', textStyle(18, '#ffd36b')).setOrigin(1, 0).setDepth(7).setVisible(false) : null;
        this.rackItems.push(img, label);
        if (plus) this.rackItems.push(plus);
        this.cells.push({
          key, rect: new Phaser.Geom.Rectangle(x, bottom - ROW_H, cw, ROW_H), img, label, count: -1, item, plus,
          plusRect: new Phaser.Geom.Rectangle(x + cw - 26, bottom - ROW_H, 26, 26),
        });
      });
    });
  }

  updateRack() {
    this.layoutRack();
    const res = this.state.res;
    for (const c of this.cells) {
      if (c.plus) {
        const open = c.item.requires(this.state.data);
        c.plus.setVisible(!!open);
        if (open) c.plus.setAlpha(this.state.canPay(c.item.cost(this.state.priceLevel(c.item))) ? 1 : 0.35);
      }
      const n = res[c.key] || 0;
      if (n === c.count) continue;
      c.count = n;
      c.label.setText(`×${n}`).setColor(n ? '#f3e6d3' : '#8a7a68');
      c.img.setAlpha(n ? 1 : 0.25);
    }
  }

  cellAt(x, y) {
    return this.cells.find((c) => c.rect.contains(x, y));
  }

  // Compra un manojo de esa madera desde la pila. Devuelve false si todavía no se vende.
  buyFromPile(cell) {
    const it = cell.item;
    if (!it || !it.requires(this.state.data)) return false;
    const cost = it.cost(this.state.priceLevel(it));
    if (!this.state.canPay(cost)) {
      const missing = Math.ceil(this.state.price(cost).calor - this.state.data.calor);
      this.floatText(cell.rect.centerX, cell.rect.y - 8, `Te faltan ${missing} de calor`, '#ff9a80');
      this.audio.overflowReject();
      return true;
    }
    this.buy(it.id);
    this.floatText(cell.rect.centerX, cell.rect.y - 8, `+${it.bundle}`, '#cfe8b0');
    return true;
  }

  // Ficha de la madera al lado de la pila: qué es y cómo rinde.
  showRackInfo(cell) {
    if (!cell) return this.rackInfo.setVisible(false);
    const wood = WOODS[cell.key];
    const bars = SPECIES[wood.species]?.bars;
    const dots = (n) => '●'.repeat(n) + '○'.repeat(5 - n);
    const stats = bars ? `\nPrende ${dots(bars.prende)}\nDura   ${dots(bars.dura)}\nCalor  ${dots(bars.calor)}` : '';
    const it = cell.item?.requires(this.state.data) ? cell.item : null;
    const offer = it ? `\n+ ${it.bundle} por ${this.state.price(it.cost(this.state.priceLevel(it))).calor} de calor` : '';
    this.rackInfo.setText(`${wood.name}\n${wood.desc}${wood.lights ? `\n${wood.lights}.` : ''}${stats}${offer}`)
      .setPosition(RACK.right + 12, Math.min(cell.rect.y, GROUND_Y - 150)).setVisible(true);
    return this.rackInfo;
  }

  // --- Entrada ---

  // Leña sin prender bajo el puntero (la que arde no se toca). Son cápsulas simples y se pueden pisar:
  // si el punto cae dentro de varias gana la de adentro, que es la que se ve adelante. Si no cae dentro
  // de ninguna, la más cercana dentro del alcance (28 px con el dedo, 8 con el mouse).
  logAt(x, y) {
    const reach = this.touch ? 28 : 8;
    let best = null;
    let bs = Infinity;
    for (const l of this.fire.logs) {
      if (l.state !== 'cruda' || l.dead) continue;
      const d = pointSegDist(x, y, ...l.endpoints()) - l.thickness / 2;
      if (d >= reach) continue;
      const score = d <= 0 ? l.wood.tier - 1e4 : d;
      if (score < bs) { bs = score; best = l; }
    }
    return best;
  }

  setupInput() {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p) => {
      this.audio.unlock();
      this.touch = !!p.wasTouch;
      if (this.paused || this.drag || p.button === 2) return;
      const x = p.worldX;
      const y = p.worldY;
      this.hoverLog = null;
      this.down = { x, y, t: this.time.now };
      // En touch no hay "pasar el mouse": el toque también junta los chispazos cercanos.
      if (this.touch) this.collectOrbsNear(x, y);

      // Sobre leña sin prender: si el puntero se mueve se saca de su lugar; un toque corto usa la herramienta.
      const log = this.logAt(x, y);
      if (log) {
        this.pending = { log, pid: p.id, x, y };
        return;
      }

      const cell = this.cellAt(x, y);
      if (cell) {
        const wantsBuy = cell.plusRect.contains(x, y) || !(this.state.res[cell.key] > 0);
        if (wantsBuy && this.buyFromPile(cell)) return;
        if (this.state.res[cell.key] > 0) {
          this.startDrag(cell.key, p);
          if (this.touch) this.showRackInfo(cell);
        } else {
          this.floatText(x, y - 20, `No te queda: ${WOODS[cell.key].name.toLowerCase()}`, '#ff9a80');
        }
        return;
      }

      const pit = this.fire.pitAt(x, y) || this.fire.pitAt(x, Math.max(y, GROUND_Y - 100));
      if (pit && this.state.bought.fuelle && this.fire.pitIsLit(pit)) {
        this.bellowsPit = pit;
        this.pump(pit);
        return;
      }
      this.useTool(x, y);
    });

    this.input.on('pointermove', (p) => {
      const x = p.worldX;
      const y = p.worldY;
      if (this.pending && p.id === this.pending.pid) {
        const pd = this.pending;
        if (Math.hypot(x - pd.x, y - pd.y) > (this.touch || p.wasTouch ? 14 : 8)) {
          this.pending = null;
          if (!pd.log.dead && pd.log.state === 'cruda') this.pickUp(pd.log, p);
        }
      }
      if (this.drag && p.id !== this.drag.pid) return;
      if (this.drag) {
        this.drag.px = x;
        this.drag.py = y;
      }
      this.collectOrbsNear(x, y);
      let cursor = 'default';
      this.hoverLog = null;
      const cell = !this.drag && !this.touch && !p.wasTouch ? this.cellAt(x, y) : null;
      if (!this.touch && !p.wasTouch) this.showRackInfo(cell);
      if (this.drag) cursor = 'grabbing';
      else if (this.logAt(x, y) || this.cellAt(x, y)) {
        cursor = 'grab';
        if (!this.touch && !p.wasTouch) this.hoverLog = this.logAt(x, y); // resalte solo con mouse y sin arrastrar
      }
      else if (this.state.bought.fuelle && this.fire.pitAt(x, y) && this.fire.pitIsLit(this.fire.pitAt(x, y))) cursor = 'pointer';
      this.input.setDefaultCursor(cursor);
    });

    const up = (p) => {
      if (p && p.button > 0) return;
      if (this.drag && p && p.id !== this.drag.pid) return;
      this.bellowsPit = null;
      if (this.pending && (!p || p.id === this.pending.pid)) {
        const pd = this.pending;
        this.pending = null;
        if (this.time.now - this.down.t < 600) this.useTool(pd.x, pd.y);
        return;
      }
      this.endDrag();
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);

    this.input.keyboard.addCapture('SPACE');
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.state.bought.fuelle || this.paused) return;
      const pit = this.fire.nearestPit(this.input.activePointer.worldX);
      if (pit && this.fire.pitIsLit(pit)) {
        if (!this.bellowsPit) this.pump(pit);
        this.bellowsPit = pit;
      }
    });
    this.input.keyboard.on('keyup-SPACE', () => { this.bellowsPit = null; });
  }

  // --- Arrastre ---
  // Lo que se arrastra es solo una imagen; la leña recién existe en el fuego al soltarla sobre un lugar.
  // La pila no se descuenta hasta entonces, así que soltar en cualquier otro lado no cambia nada.

  startDrag(key, p) {
    const img = this.add.image(p.worldX, p.worldY, `log-${key}`).setDepth(88);
    this.drag = { key, img, tier: WOODS[key].tier, pid: p.id, px: p.worldX, py: p.worldY, slot: null, pit: null };
    this.audio.pull(WOODS[key].weight);
    this.ui.setDragging(true);
    this.ui.tutorial('grab');
    this.input.setDefaultCursor('grabbing');
  }

  // Saca de su lugar una leña sin prender: vuelve a la pila y queda en la mano.
  pickUp(log, p) {
    const { key, x, y } = log;
    const rot = log.sprite.rotation;
    this.state.add(key, 1);
    this.fire.removeLog(log);
    this.audio.unsnap('grab');
    this.startDrag(key, p);
    this.drag.img.setPosition(x, y).setRotation(rot);
  }

  // La imagen sigue al puntero; con un lugar elegido se acomoda en él, así se ve cómo va a quedar antes de soltar.
  updateDrag(dt) {
    const d = this.drag;
    if (!d) return;
    const cone = WOODS[d.key].shape === 'cone';
    const s = d.slot;
    const tx = s ? (cone ? s.fx : s.x) : d.px;
    const ty = s ? (cone ? s.fy - 19 : s.y) : d.py;
    const ta = s && !cone ? s.angle : 0;
    const k = 1 - Math.exp(-dt * (s ? 22 : 40));
    d.img.setPosition(d.img.x + (tx - d.img.x) * k, d.img.y + (ty - d.img.y) * k);
    d.img.setRotation(d.img.rotation + Phaser.Math.Angle.Wrap(ta - d.img.rotation) * k);
    this.audio.drag(Math.hypot(d.px - (d.lpx ?? d.px), d.py - (d.lpy ?? d.py)) / Math.max(dt, 0.001));
    d.lpx = d.px;
    d.lpy = d.py;
  }

  // cancel: la soltó el sistema (un modal), no el jugador: siempre vuelve a la pila.
  endDrag(cancel = false) {
    const d = this.drag;
    this.showRackInfo(null);
    if (!d) return;
    this.drag = null;
    this.ui.setDragging(false);
    if (!cancel && d.slot && this.state.res[d.key] > 0) {
      this.state.add(d.key, -1);
      const log = new Log(this, d.img.x, d.img.y, d.key, d.img.rotation);
      this.fire.addLog(log);
      this.fire.placeLog(log, d.pit, d.slot);
      d.img.destroy();
      return;
    }
    if (!cancel && d.pit && !d.slot) {
      this.audio.overflowReject();
      this.worldMsg(d.pit, `No hay lugar para más ${CUTS[WOODS[d.key].cut].plural}`, '#ffb36b', 1, 1);
    }
    this.flyToRack(d.img, d.key);
  }

  // La imagen vuelve volando a su casillero.
  flyToRack(img, key) {
    const cell = this.cells.find((c) => c.key === key);
    this.audio.logReturn();
    this.tweens.add({
      targets: img, x: cell ? cell.rect.centerX : RACK.left + 80, y: cell ? cell.rect.centerY : GROUND_Y - 100,
      alpha: 0, scale: 0.4, rotation: 0, duration: 320, ease: 'quad.in', onComplete: () => img.destroy(),
    });
  }

  // Elige la herramienta de la barra de abajo (lo llama la UI).
  selectTool(id) {
    if (this.state.data.tool === id) return;
    this.state.data.tool = id;
    this.audio.slotTick();
  }

  // Usa la herramienta elegida sobre la leña sin prender que haya cerca.
  useTool(x, y) {
    const near = this.fire.logs.filter((l) => l.state === 'cruda' && pointSegDist(x, y, ...l.endpoints()) < 70);
    if (!near.length) return;
    const tool = toolOf(this.state.data.tool);
    const res = this.state.res;
    if (tool.res && !(res[tool.res] > 0)) {
      this.floatText(x, y - 20, `No te quedan: ${tool.name.toLowerCase()}`, '#ff9a80');
      return;
    }
    // Si no alcanza para nada de lo que hay cerca, ni se gasta.
    if (!near.some((l) => this.fire.canLight(l, tool.heat, tool.ttl))) {
      this.floatText(x, y - 20, 'Muy grueso para esto: prendé algo más chico', '#ffb36b');
      return;
    }
    if (tool.res) this.state.add(tool.res, -1);
    const pit = this.fire.pitAt(x, y);
    const rain = pit ? pit.rain : this.weather.rain;
    const ok = Math.random() < tool.odds * (1 - rain * tool.rainOdds);
    this.audio[tool.sound](ok);
    this.fire.sparkAt({ x, y }, ok ? tool.sparks : Math.ceil(tool.sparks / 2));
    if (ok) this.fire.strike(x, y, tool.heat, tool.ttl, tool.r);
    else if (tool.res) this.floatText(x, y - 20, 'La lluvia lo apagó', '#8fb8e8');
    if (tool.res && !res[tool.res]) {
      this.state.data.tool = 'pedernal';
      this.ui.toast('Te quedaste sin fósforos: pasaste al pedernal (cuesta más).', 'bad');
    }
  }

  // Una carta cambió cuántos lugares entran: rehace los de todos los pozos (la leña sigue donde estaba).
  refreshSlots() {
    this.state.recompute();
    for (const p of this.pitObjs) p.layoutSlots();
  }

  pump(pit) {
    this.lastPump = this.time.now;
    this.fire.pump(pit);
    if (!this.bellowsImg) {
      this.bellowsImg = this.add.image(0, 0, 'bellows').setOrigin(0.05, 0.5).setDepth(34);
    }
    const b = this.bellowsImg;
    b.setPosition(pit.right + 30, GROUND_Y - 22).setAlpha(1).setScale(1);
    this.tweens.killTweensOf(b);
    this.tweens.add({ targets: b, scaleY: 0.55, duration: 150, yoyo: true, ease: 'quad.out' });
    this.tweens.add({ targets: b, alpha: 0, delay: 900, duration: 400 });
  }

  // Feedback de encajar, de la fogata armada y del tamaño.
  setupFeelEvents() {
    const ev = this.events;
    // Los eventos de escena sobreviven a scene.restart(): sin esto cada reinicio duplicaba los listeners.
    for (const name of ['structure:formed', 'structure:lost', 'pit:grow', 'log:snap']) ev.off(name);
    ev.on('log:snap', (e) => {
      this.slotsCtl.onSlotSnap(e);
      this.fire.landInPit(e.log, 0.5);
      this.ui.tutorial('snap');
      this.firstTime('pit', e.slot.x, e.slot.y);
    });
    // Fogata armada: leña de los tres tamaños. Se arma y se desarma seguido (la leña se va achicando),
    // así que se festeja solo de vez en cuando.
    ev.on('structure:formed', ({ pit, type, quality }) => {
      this.ui.tutorial('structure:tipi');
      const now = this.time.now;
      if (now - (pit.formedT ?? -1e9) < 60000) return;
      pit.formedT = now;
      const pieces = pit.snapChain && now - pit.snapChain.t < 7000 ? pit.snapChain.n : 0;
      pit.snapChain = null;
      this.audio.structureFormed(type, pieces);
      this.fire.structureBurst(pit, type, quality);
      if (this.seenOnce('struct_tipi') === false) this.ui.toast('🔺 Fogata armada: con ramas, leña y troncos tira mejor, prende más rápido y da más calor.', 'unlock', 7000);
      if (!this.fx) return;
      this.cameras.main.flash(160, 255, 215, 130, false);
      const pct = Math.round((STRUCTURE.tipi.calor || 0) * quality * 100);
      this.worldMsg(pit, `¡Fogata armada!\nrinde +${pct} % de calor`, '#ffd36b', 1.3, 2, 2600);
      this.time.delayedCall(700, () => this.firstTime('structure', pit.x, GROUND_Y - 140));
    });
    ev.on('structure:lost', ({ pit }) => {
      const now = this.time.now;
      if (now - (pit.lostT ?? -1e9) < 60000) return;
      pit.lostT = now;
      this.audio.structureLost();
    });
    // Crecer de tamaño.
    ev.on('pit:grow', ({ pit, size }) => {
      this.ui.tutorial('pit:grow', { size });
      if (this.sinceStart > 1) this.playGrow(pit, size);
    });
  }

  // Un solo mensaje a la vez sobre el mundo, con prioridad (3 urgencia/pico, 2 estructura o derrumbe,
  // 1 avisos de lugar). Uno de menor prioridad se descarta mientras uno mayor sigue vigente; igual o mayor
  // lo reemplaza. Se mantiene legible (sombra, trazo) y se desvanece al final. Los números de calor no pasan por acá.
  worldMsg(pit, text, color = '#f3e6d3', scale = 1, prio = 1, life = 1700) {
    const now = this.time.now;
    const cur = this.worldMsgCur;
    if (cur?.t.active) {
      if (prio < cur.prio && now < cur.until) return null;
      this.tweens.killTweensOf(cur.t);
      cur.t.destroy();
    }
    const x = Phaser.Math.Clamp(typeof pit === 'number' ? pit : pit.x, 160, W - 160);
    const y = GROUND_Y - 300 - (pit?.size || 0) * 8;
    const t = this.add.text(x, y, text, {
      fontFamily: 'Fredoka, system-ui', fontSize: `${Math.round(17 * scale)}px`, color, align: 'center', lineSpacing: 4,
      stroke: '#000', strokeThickness: 5, fontStyle: '600',
    }).setOrigin(0.5).setDepth(90).setShadow(0, 2, '#000', 6, true, true);
    if (this.fx) {
      t.setScale(0.7);
      this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'back.out' });
    }
    this.tweens.add({
      targets: t, y: y - 18, duration: life, ease: 'sine.out',
    });
    this.tweens.add({
      targets: t, alpha: 0, delay: life * 0.65, duration: life * 0.35,
      onComplete: () => { if (this.worldMsgCur?.t === t) this.worldMsgCur = null; t.destroy(); },
    });
    this.worldMsgCur = { t, prio, until: now + life * 0.8 };
    return t;
  }

  // Primera vez de un gesto: campanita y chispa dorada, sin toast. Una sola vez por partida guardada.
  firstTime(key, x, y) {
    if (this.seenOnce(`first_${key}`)) return;
    const n = ['pit', 'ignite', 'rotate', 'snap', 'structure'].indexOf(key);
    this.audio.firstTime(Math.max(0, n));
    if (this.fx) this.fire.sparkAt({ x, y }, 10);
  }

  // Marca una pista/aviso como visto (persiste en settings.seen). Devuelve true si ya estaba visto.
  seenOnce(key) {
    const st = this.state.data.settings;
    const seen = (st.seen = st.seen || {});
    if (seen[key]) return true;
    seen[key] = true;
    this.state.save();
    return false;
  }

  // Etiquetas de la UI sobre cada pozo (coordenadas del mundo; la UI las escala).
  pitInfoList() {
    return this.pitObjs.map((p, i) => ({
      i, screenX: p.x, screenY: GROUND_Y + 6, size: p.size, sizeName: SIZES[p.size]?.name,
      load: this.fire.slotted(p).length, cap: p.slotList.length, structure: p.structure,
      bonus: p.structure.type === 'tipi' ? STRUCTURE.tipi.calor * p.structure.quality : 0,
    }));
  }

  // Agrandar el pozo: sonido grave, shake, piedras que caen, llamarada y brasas.
  playGrow(pit, size) {
    this.audio.pitGrow(size);
    if (!this.fx) return;
    const k = Math.min(1, size / 7);
    this.cameras.main.shake(300 + 300 * k, 0.003 + 0.004 * k);
    this.time.delayedCall(350, () => this.fire.ring.emitParticleAt(pit.x, GROUND_Y - 20, Math.round(20 + 30 * k)));
    this.time.delayedCall(800, () => {
      this.fire.flare(1.2 + 0.6 * k);
      this.fire.emberRise(900 + 900 * k);
      this.cameras.main.flash(220, 255, 190, 110, false);
    });
    this.worldMsg(pit, `¡${SIZES[size].name}!`, '#ffd36b', 1.5, 2, 2600);
    const perk = SIZES[size].perk?.text;
    if (perk) this.ui.toast(`🔨 ${SIZES[size].name}. ${perk}`, 'unlock', 7000);
  }

  setupFireEvents() {
    this.fire.onCrackle = (x, y, strength, log) => {
      if (!this.state.unlocked.chispazos || !log.pit) return;
      if (Math.random() < 0.09 * this.state.mods.orbs * log.pit.perks.orbs * strength) this.spawnOrb(x, y);
    };
    this.fire.onIgnite = (log) => {
      // Fire ya hace el sonido, el pulso de luz y las chispas; acá solo la cámara.
      if (this.sinceStart < 1) return;
      this.ui.tutorial('ignite');
      if (!this.fx) return;
      this.firstTime('ignite', log.x, log.y - 10);
      if (log.wood.thickness >= 24) this.cameras.main.shake(110, 0.0018);
    };
    this.fire.onPeak = ({ pit }) => this.peakBonus(pit);
    this.fire.onDryStart = (log) => {
      if (log.wood.wet && !this.tipHumeda) {
        this.tipHumeda = true;
        this.ui.toast('La madera húmeda primero se seca: humea y chilla. Después prende.');
      }
    };
  }

  // Fogata en su punto: regala `mods.peakSecs` segundos de calor. Lo llama Fire.onPeak.
  peakBonus(pit) {
    const bonus = Math.round(this.rate * this.state.mods.peakSecs);
    if (bonus > 0) this.state.gainCalor(bonus);
    this.worldMsg(pit, `¡Fogata en su punto! +${bonus}`, '#ffb347', 1.5, 3, 2400);
    this.ui.toast('🔥 ¡Fogata en su punto máximo!', 'unlock', 3500);
    if (this.fx) {
      this.cameras.main.flash(300, 255, 200, 120, false);
      this.cameras.main.shake(260, 0.003);
    }
    this.events.emit('peak', { pit, bonus });
  }

  // --- Chispazos (se juntan pasando el mouse) ---

  spawnOrb(x, y) {
    const value = Math.max(1, Math.round(1 + this.rate * 0.8));
    const img = this.add.image(x, y, 'orb').setBlendMode(Phaser.BlendModes.ADD).setDepth(70).setScale(0.2);
    this.tweens.add({ targets: img, scale: 0.5 + Math.min(0.35, value / 60), duration: 300, ease: 'back.out' });
    this.orbs.push({ img, value, vx: (Math.random() - 0.5) * 60, vy: -70 - Math.random() * 40, life: 7, phase: Math.random() * 6 });
  }

  updateOrbs(dt) {
    const p = this.input.activePointer;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        if (this.combo >= 3) this.audio.comboBreak();
        this.combo = 0;
      }
    }
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      o.vy *= 0.97;
      o.vx *= 0.97;
      o.img.x += (o.vx + Math.sin(this.time.now * 0.004 + o.phase) * 20) * dt;
      o.img.y += o.vy * dt;
      o.img.setAlpha(Math.min(1, o.life) * (0.8 + 0.2 * Math.sin(this.time.now * 0.02 + o.phase)));
      if (o.life <= 0) {
        o.img.destroy();
        this.orbs.splice(i, 1);
      }
    }
    if (!this.paused && p) this.collectOrbsNear(p.worldX, p.worldY);
  }

  collectOrbsNear(x, y) {
    const r = 50 * this.state.mods.magnet * (this.touch ? 1.4 : 1);
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      if (Math.hypot(o.img.x - x, o.img.y - y) > r) continue;
      this.orbs.splice(i, 1);
      this.state.meta.stats.orbs++;
      // Combo: cosmético (pitch, tamaño y color); el bonus de calor lo limita mods.comboCap (1 = sin bonus).
      const c = ++this.combo;
      if (c >= 10 && c % 2 === 0) this.fire.glowNear(o.img.x, 0.25 + Math.min(0.3, (c - 10) * 0.02)); // combo alto: la llama brilla
      this.comboT = 2.2;
      const value = Math.max(1, Math.round(o.value * Math.min(this.state.mods.comboCap || 1, 1 + c * 0.03)));
      this.audio.coin(Math.min(2.2, 1 + c * 0.05 + Math.random() * 0.08));
      if (c % 5 === 0) {
        this.audio.comboDing(Math.min(6, c / 5));
        this.comboFloat(o.img.x, o.img.y - 36, `x${c}`, '#ff9a3c', 1.05);
      }
      const col = c >= 15 ? '#ff7a30' : c >= 8 ? '#ffb347' : '#ffd36b';
      this.comboFloat(o.img.x, o.img.y - 10, `+${value}`, col, 0.85 + Math.min(0.2, c * 0.02));
      this.tweens.add({
        targets: o.img, x: 70, y: 40, scale: 0.3, duration: 450, ease: 'quad.in',
        onComplete: () => {
          this.state.gainCalor(value);
          o.img.destroy();
        },
      });
    }
  }

  // opts: dur y rise (duración y subida en px); combo: cuenta para el tope COMBO_TEXT_CAP.
  floatText(x, y, text, color = '#f3e6d3', scale = 1, opts = {}) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Fredoka, system-ui', fontSize: `${Math.round(17 * scale)}px`, color, stroke: '#000', strokeThickness: 4, fontStyle: '600',
    }).setOrigin(0.5).setDepth(90);
    // Aparece con un pequeño "pop" (sin él en movimiento reducido).
    if (this.fx && scale > 1) {
      t.setScale(0.6);
      this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'back.out' });
    }
    if (opts.combo) this.comboFloats++;
    this.tweens.add({
      targets: t, y: y - (opts.rise ?? 40), alpha: 0, duration: opts.dur ?? 1400, ease: 'quad.out',
      onComplete: () => { if (opts.combo) this.comboFloats--; t.destroy(); },
    });
    return t;
  }

  // Números de combo: como mucho COMBO_TEXT_CAP a la vez, en abanico para no apilarse sobre el fuego.
  comboFloat(x, y, text, color, scale) {
    if (this.comboFloats >= COMBO_TEXT_CAP) return;
    const k = this.comboSeq++ % 5;
    this.floatText(x + (k - 2) * 14, y, text, color, scale, { combo: true, dur: 850, rise: 26 });
  }

  // --- Proveedores de leña ---

  // Texto al lado de la pila; los que caen juntos se abren en cascada.
  pileText(text, color) {
    const i = this.pileTextN = ((this.pileTextN || 0) + 1) % 6;
    this.floatText(RACK_TEXT_X, 300 - i * 18, text, color);
  }

  giveLoot(loot) {
    for (const [k, n] of Object.entries(loot)) {
      if (!n) continue;
      this.state.add(k, n);
      this.pileText(`+${n} ${k === 'fosforo' ? 'fósforos' : WOODS[k].name.toLowerCase()}`, '#cfe8b0');
    }
  }

  updateSupply(dt) {
    const { data, mods, res } = this.state;
    const b = data.bought;
    for (const sup of SUPPLIERS) {
      const level = sup.level(data, mods);
      if (!level || (sup.ready && !sup.ready(this))) continue;
      const t = (this.supplyTimers[sup.id] || 0) + dt / sup.every(level, mods);
      this.supplyTimers[sup.id] = t >= 1 ? 0 : t;
      if (t >= 1) sup.run(this, level);
    }
    // Lo que se compró de más se va olvidando: el precio de mercado vuelve solo.
    this.demandTimer += dt;
    if (this.demandTimer >= MARKET_RECOVER) {
      this.demandTimer = 0;
      for (const id of Object.keys(data.demand)) {
        if (data.demand[id] > 1) data.demand[id]--;
        else delete data.demand[id];
      }
    }
    // La lluvia moja las ramas y la leña de la pila si no hay leñera (los troncos aguantan).
    if (this.weather.rain > 0.2 && !b.lenera) {
      this.wetTimer += dt * this.weather.rain;
      if (this.wetTimer >= 5) {
        this.wetTimer = 0;
        const dry = Object.keys(WOODS).filter((k) => res[k] > 0 && !WOODS[k].wet && WOODS[k].shape !== 'cone' && WOODS[k].cut !== 'tronco');
        if (dry.length) {
          const k = dry[(Math.random() * dry.length) | 0];
          this.state.add(k, -1);
          this.state.add(woodKey('humeda', WOODS[k].cut), 1);
          this.pileText(`Se mojó: ${WOODS[k].name.toLowerCase()}`, '#8fb8e8');
          if (!this.tipLenera) {
            this.tipLenera = true;
            this.ui.toast('La lluvia te moja la pila de leña. Una leñera techada lo evita.', 'bad');
          }
        }
      }
    }
  }

  // --- Progreso, compras y cartas ---

  applyUnlock(id, announce) {
    const ui = this.ui;
    const reveal = MILESTONES.find((m) => m.id === id)?.reveal;
    if (reveal) {
      ui.reveal(reveal);
      if (announce && reveal.startsWith('btn-')) ui.markNew(reveal);
    }
    if (id === 'clima' && announce) this.weather.timer = 25;
    if (announce && this.fx) {
      // Destello de hito.
      this.fire.flare(1.6);
      this.cameras.main.flash(250, 255, 211, 107, false);
    }
    if (id === 'noches' && this.state.data.night.phase === 'off') {
      // Margen para armar estructura: la primera tarde llega con FIRST_DAY_LEFT s por delante.
      const night = this.state.data.night;
      night.phase = 'day';
      night.t = announce ? DAY - FIRST_DAY_LEFT : 0;
    }
  }

  // Cenizas se ve en cuanto hay con qué gastar, aunque el hito 'noches' esté reiniciado.
  revealAshes() {
    const m = this.state.data.meta;
    if (m.totalDawns >= 1 || m.prestiges >= 1) this.ui.reveal('btn-ashes');
  }

  checkProgress() {
    const data = this.state.data;
    for (const m of MILESTONES) {
      if (data.unlocked[m.id] || !milestoneDue(m, data, this.state)) continue;
      data.unlocked[m.id] = true;
      this.applyUnlock(m.id, true);
      if (m.toast) {
        this.ui.toast(m.toast, 'unlock', 7000);
        this.audio.unlock_();
      }
    }
    // Ítems nuevos en la tienda o en construir.
    data.seenItems = data.seenItems || {};
    for (const it of allItems(data)) {
      if (it.tab === 'pila' || data.seenItems[it.id] || !it.requires(data)) continue;
      data.seenItems[it.id] = true;
      if (Object.keys(data.seenItems).length > 2) this.ui.markNew(it.tab === 'tienda' ? 'btn-shop' : 'btn-build');
    }
    // Logros.
    for (const a of this.state.checkAchievements()) {
      this.ui.achievement?.({ icon: a.icon, name: a.name, desc: `${a.desc} · ${rewardLabel(a)}` });
      this.audio.achievement?.();
      if (this.fx) this.fire.flare?.(1.2);
      this.events.emit('achievement', a);
    }
    // Subida de nivel, o carta gratis de un amanecer.
    if (data.unlocked.cartas && !this.paused && !this.pendingLevel) {
      if (data.night.freeCard) {
        data.night.freeCard = false;
        this.queueCards(false);
      } else if (data.totalCalor >= levelThreshold(data.level + 1, this.state.mods.levelEase)) {
        this.queueCards(true);
      }
    }
  }

  // Sortea las cartas y arranca la secuencia; `levelUp` suma nivel (y Tributo).
  queueCards(levelUp) {
    const data = this.state.data;
    const cards = rollCards(data, 3);
    if (levelUp) {
      data.level++;
      const secs = this.state.mods.tribute;
      if (secs > 0) {
        const gift = Math.round(this.rate * secs);
        if (gift > 0) {
          this.state.gainCalor(gift);
          this.floatText(this.pitObjs[0].x, GROUND_Y - 260, `Tributo +${gift}`, '#ffd36b');
        }
      }
    }
    if (!cards.length) return;
    this.pendingLevel = { level: data.level, cards, levelUp };
    this.playLevelSequence((opts) => this.showLevelCards(opts));
  }

  showLevelCards(opts = {}) {
    const p = this.pendingLevel;
    if (!p) return;
    const owned = this.state.data.cards;
    this.setPaused(true);
    // Sonido de rareza: la épica entra 250 ms tarde (igual que su animación).
    const top = p.cards.some((c) => c.rarity === 'epica') ? 'epica' : p.cards.some((c) => c.rarity === 'rara') ? 'rara' : null;
    if (top) {
      this.time.delayedCall(top === 'epica' ? 250 : 80, () => this.audio.rarity(top));
      if (top === 'epica' && this.fx) this.cameras.main.flash(300, 170, 90, 255, false);
    }
    this.ui.showCards(p.cards.map((c) => ({
      id: c.id, icon: c.icon, name: c.name, desc: c.desc, rarity: c.rarity,
      level: owned[c.id] || 0, max: c.max, effect: c.effect(owned[c.id] || 0),
    })), owned, { lockMs: opts.lockMs ?? 400 });
  }

  // --- Efectos de celebración ---

  // Movimiento reducido: la UI lo llama desde su handler `motion` (on = reducir).
  setMotion(on) {
    this.fx = !!on;
    if (this.fire) this.fire.motion = this.fx;
  }

  // Celebración de nivel antes de mostrar las cartas (un solo timer, tiempos del plan).
  playLevelSequence(done) {
    if (!this.fx) {
      done({ lockMs: 450 });
      return;
    }
    const tier = this.state.data.level % 5 === 0 ? 1 : 0;
    this.ui.fillLevelBar?.();                            // 0 ms
    this.cameras.main.flash(180, 255, 211, 107, false);
    this.fire.flare(tier ? 1.6 : 1);                     // 0–250 ms
    this.time.delayedCall(150, () => this.audio.levelUp(tier));
    this.time.delayedCall(900, () => done({ lockMs: 400 }));
  }

  // Amanecer: `info` es el payload de 'night:dawn'.
  playDawn(info, done) {
    if (!info.success) {
      this.audio.sizzle(0.6);
      done();
      return;
    }
    this.audio.dawn();
    // Rayos: siempre se funden (igual que el cielo); el giro lento solo con fx.
    this.tweens.killTweensOf(this.dawnRays);
    this.dawnRays.setRotation(0);
    this.tweens.add({ targets: this.dawnRays, alpha: 0.6, duration: 1800, ease: 'Sine.easeInOut' });
    if (!this.fx) {
      this.time.delayedCall(600, done);
      return;
    }
    this.cameras.main.flash(1200, 255, 190, 120, false);
    this.fire.flare(1.4);
    // Cielo de amanecer: sube y vuelve a 0 cuando llega el día.
    this.tweens.killTweensOf(this.dawnSky);
    this.tweens.add({ targets: this.dawnSky, alpha: 0.9, duration: 1800, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.dawnRays, rotation: 0.05, duration: 4000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    this.time.delayedCall(2600, done);
  }

  // Efecto de prestigio; al terminar se reinicia la partida.
  playReset(done) {
    this.audio.reset();
    if (!this.fx) {
      this.time.delayedCall(400, done);
      return;
    }
    this.fire.emberRise(1800);
    this.cameras.main.fadeOut(1800, 10, 6, 4);
    this.time.delayedCall(2000, done);
  }

  // --- Noches ---

  updateNight(dt) {
    const data = this.state.data;
    const night = data.night;
    if (night.phase === 'off') return;
    const mods = this.state.mods;
    for (const ev of stepNight(night, dt, this.rate, mods)) {
      if (ev.type === 'dusk' || ev.type === 'start') {
        this.tweens.killTweensOf(this.dawnSky);
        if (this.dawnSky.alpha > 0) this.tweens.add({ targets: this.dawnSky, alpha: 0, duration: this.fx ? 2500 : 1, ease: 'Sine.easeInOut' });
        this.tweens.killTweensOf(this.dawnRays);
        if (this.dawnRays.alpha > 0) this.tweens.add({ targets: this.dawnRays, alpha: 0, duration: this.fx ? 2500 : 1, ease: 'Sine.easeInOut' });
      }
      if (ev.type === 'dusk') {
        const goal = nightGoal(night.n, mods);
        this.events.emit('night:dusk');
        this.ui.toast(`Cae la tarde. La noche ${night.n} pide ${goal.toFixed(1)} calor/s: no dejes que se apague.`, 'unlock', 6000);
      } else if (ev.type === 'start') {
        night.startTotal = data.totalCalor;
        this.events.emit('night:start', { n: night.n, goal: nightGoal(night.n, mods) });
      } else if (ev.type === 'dawn') {
        this.onDawn(ev);
      }
    }
    this.nightTimer += dt;
    if (this.nightTimer > 0.5) {
      this.nightTimer = 0;
      const info = this.state.nightInfo();
      this.events.emit('night:progress', { pct: info.pct, rate: this.rate, goal: info.goal, goalMet: info.goalMet, cold: info.cold });
    }
  }

  onDawn(ev) {
    const data = this.state.data;
    const night = data.night;
    const n = night.n;
    const goal = nightGoal(n, this.state.mods);
    const margin = ev.margin || 0;
    const ash = ev.success ? dawnAsh(n, this.state.mods, margin) : 0;
    if (ev.success) {
      night.n++;
      night.dawns++;
      data.meta.totalDawns++;
      this.state.addAsh(ash);
    } else {
      night.fails++;
    }
    const cardFree = !!ev.cardFree && !!data.unlocked.cartas;
    if (cardFree) night.freeCard = true;
    const summary = {
      kind: 'dawn', n, success: ev.success, ash, cardFree, goal, margin,
      ratio: ev.ratio, calor: Math.round(data.totalCalor - night.startTotal),
      dawns: night.dawns, ...this.state.ashSummary(),
    };
    const info = { n, success: ev.success, ash, cardFree, summary };
    if (ev.failed) this.events.emit('night:fail', info);
    this.events.emit('night:dawn', info);
    this.revealAshes();
    this.state.save();
    this.playDawn(info, () => this.showSummary(summary));
  }

  // Resumen de noche o de prestigio. Pausa el juego: la UI lo reanuda con el handler `pause(false)`.
  showSummary(summary) {
    if (this.ui.showSummary) {
      this.setPaused(true);
      this.ui.showSummary(summary);
    } else if (summary.kind === 'dawn') {
      this.ui.toast(summary.success ? `Amaneció. +${summary.ash} ceniza.` : 'El frío ganó esta noche. Probá de nuevo.', 'info', 5000);
    }
  }

  // --- Prestigio: Cenizas ---

  doPrestige() {
    const s = this.state;
    if (this.resetting || !s.canPrestige()) return false;
    this.resetting = true;
    const gain = s.ashGain();
    this.events.emit('prestige:start', { gain });
    this.playReset(() => {
      const runCalor = Math.round(s.data.totalCalor);
      const dawns = s.data.night.dawns;
      s.addAsh(gain);
      s.meta.prestiges++;
      s.wipe({ keepMeta: true });
      s.pendingSummary = {
        kind: 'prestige', ash: gain, ...s.ashSummary(), prestiges: s.meta.prestiges, runCalor, dawns,
      };
      s.save();
      this.ui.resetView();
      this.scene.restart();
    });
    return true;
  }

  ashItems() {
    const s = this.state;
    return META.map((u) => {
      const level = s.metaLevel(u.id);
      const maxed = level >= u.max;
      const cost = u.cost(Math.min(level, u.max - 1));
      return {
        id: u.id, icon: u.icon, name: u.name, desc: u.desc, level, max: u.max, maxed, cost,
        affordable: !maxed && s.meta.ash >= cost, effect: u.effect(Math.min(level, u.max - 1)),
      };
    });
  }

  ashInfo() {
    const s = this.state;
    return {
      ash: s.meta.ash, dawns: s.data.night.dawns, totalDawns: s.meta.totalDawns, prestiges: s.meta.prestiges,
      canPrestige: s.canPrestige(), gain: s.ashGain(), unlocked: !!s.data.unlocked.noches,
    };
  }

  buyAsh(id) {
    if (!this.state.buyMeta(id)) return;
    this.audio.buy();
    this.state.save();
  }

  pickCard(id) {
    const card = CARDS.find((c) => c.id === id);
    if (!card) return;
    const data = this.state.data;
    data.cards[id] = (data.cards[id] || 0) + 1;
    card.apply?.(this);
    this.pendingLevel = null;
    this.state.recompute();
    this.ui.hideCards();
    this.setPaused(false);
    this.audio.buy();
    this.ui.toast(`${card.icon} ${card.name}`, 'unlock', 2500);
    this.state.save();
  }

  shopItems(tab) {
    const data = this.state.data;
    return allItems(data)
      .filter((it) => it.tab === tab && it.requires(data))
      .map((it) => {
        const level = data.bought[it.id] || 0;
        const max = it.max || 99;
        const maxed = !it.market && level >= max;
        const cost = it.cost(it.market ? this.state.priceLevel(it) : Math.min(level, max - 1));
        const price = this.state.price(cost);
        return {
          id: it.id, icon: it.icon, name: it.name, desc: it.desc, level, max, maxed, price,
          need: {
            calor: Math.max(0, Math.ceil(price.calor - data.calor)),
            tronco: Math.max(0, Math.ceil(price.tronco - this.state.troncos())),
          },
          affordable: this.state.canPay(cost),
          effect: it.effect(Math.min(level, max - 1)),
          effects: this.projectEffects(it, level),
          blocked: maxed ? null : it.blocked?.() || null,
        };
      });
  }

  // Efectos de "Agrandar": capacidad, aire, calor y "con tu leña" (calor estimado con la carga real del pozo).
  projectEffects(it, level) {
    if (!it.id.startsWith('agrandar_') || level >= MAX_SIZE) return undefined;
    const a = SIZES[level];
    const b = SIZES[level + 1];
    const eff = [
      { label: 'Tipis', before: `${a.tipis}`, after: `${b.tipis}` },
      { label: 'Aire', before: `+${Math.round((a.air - 1) * 100)}%`, after: `+${Math.round((b.air - 1) * 100)}%` },
      { label: 'Calor', before: `×${a.mult}`, after: `×${b.mult}` },
      { label: 'Consumo de leña', before: `×${a.burn}`, after: `×${b.burn}` },
    ];
    const pit = this.pitObjs[Number(it.id.split('_')[1])];
    if (pit && (pit.loadRatio || 0) > 0.02) {
      // La carga real (área de leña) pasa a fracción de la capacidad del tamaño nuevo.
      const load = Math.min(1, pit.loadRatio || 0);
      const nextLoad = (load * capacityOf(level)) / capacityOf(level + 1);
      const now = this.state.projectRate(level, load);
      const then = this.state.projectRate(level + 1, nextLoad);
      eff.push({ label: 'Con tu leña', before: `${now.toFixed(1)}/s`, after: `${then.toFixed(1)}/s` });
    }
    return eff;
  }

  buy(id) {
    const data = this.state.data;
    const it = allItems(data).find((i) => i.id === id);
    if (!it) return;
    const level = data.bought[id] || 0;
    if (!it.market && level >= (it.max || 99)) return;
    const why = it.blocked?.();
    if (why) return this.ui.toast(`🚧 ${why}`, 'bad', 3500);
    const cost = it.cost(this.state.priceLevel(it));
    if (!this.state.canPay(cost)) return;
    this.state.pay(cost);
    data.bought[id] = level + 1;
    if (it.market) data.demand[id] = (data.demand[id] || 0) + 1;
    it.apply?.(this);

    const [kind, idx] = id.split('_');
    if (kind === 'techo') {
      data.pits[idx].roof = true;
      this.pitObjs[idx].setRoof(true);
    } else if (kind === 'agrandar') {
      data.pits[idx].size = level + 1;
      this.pitObjs[idx].setSize(level + 1);
      this.layoutPits();
    } else if (kind === 'fogata') {
      data.pits.push({ size: 0, roof: false });
      const pit = new Pit(this, data.pits.length - 1, data.pits[data.pits.length - 1], 0);
      this.pitObjs.push(pit);
      this.fire.addPit(pit);
      this.layoutPits();
      this.ui.toast('Nueva fogata lista. Cargala de leña y prendela.', 'unlock');
    }
    if (id === 'fuelle') this.ui.toast('Fuelle: mantené apretado sobre una fogata prendida (o la barra espaciadora).', 'unlock', 7000);
    this.state.recompute();
    this.audio.buy();
    this.state.save();
  }

  // Ciclo de luz (H1): sin noches desbloqueadas, atardecer permanente; con ellas, día → atardecer →
  // noche (que se vuelve profunda) → amanecer (lo pone playDawn con dawnSky). Mezcla gradual entre fases.
  lightTarget() {
    const d = this.state.data;
    const w = { day: 0, dusk: 0, night: 0, deep: 0 };
    if (!d.unlocked.noches || d.night.phase === 'off') { w.dusk = 1; return w; }
    const ni = this.state.nightInfo();
    const p = ni.pct;
    if (ni.phase === 'day') w.day = 1;
    else if (ni.phase === 'dusk') {
      if (p < 0.5) { w.day = 1 - 2 * p; w.dusk = 2 * p; } else { w.dusk = 2 - 2 * p; w.night = 2 * p - 1; }
    } else {
      const k = Math.min(1, p * 3);
      const e = k * k * (3 - 2 * k);
      w.night = 1 - e; w.deep = e;
    }
    return w;
  }

  updateLight(dt) {
    const tgt = this.lightTarget();
    if (!this.skyW) this.skyW = { ...tgt };
    const a = Math.min(1, dt * 0.9);
    for (const k of Object.keys(tgt)) this.skyW[k] += (tgt[k] - this.skyW[k]) * a;
    const w = this.skyW;
    this.skyBright = w.day + w.dusk * 0.55 + w.night * 0.1;
    // El amanecer se va apagando durante el día.
    const nd = this.state.data.night;
    if (nd.phase === 'day' && this.dawnSky.alpha > 0 && !this.tweens.isTweening(this.dawnSky)) {
      const f = Math.min(1, nd.t / 40);
      this.dawnSky.setAlpha(Math.min(this.dawnSky.alpha, 0.9 * (1 - f)));
      this.dawnRays.setAlpha(Math.min(this.dawnRays.alpha, 0.6 * (1 - f)));
    }
    // Cielos: pintados en orden, cada uno con alpha = peso / acumulado (mezcla exacta).
    let cum = 0;
    for (const [ph, img] of this.skies) {
      cum += w[ph];
      img.setAlpha(cum > 0.0001 ? Math.min(1, w[ph] / cum) : 0).setVisible(w[ph] > 0.002 || ph === 'night');
    }
    this.skyLayer.setAlpha(1).setVisible(true);
    // Capas con tinte por fase (mezcla de los tintes ponderada) y sol naciente.
    const da = this.dawnSky.alpha / 0.9;
    for (const l of this.parallax.concat([{ layer: 'ground', img: this.groundLayer }])) {
      let r = 0, g = 0, b = 0, sum = 0;
      for (const ph of ['day', 'dusk', 'night', 'deep']) {
        if (w[ph] <= 0.001) continue;
        const c = layerTint(l.layer, ph);
        r += ((c >> 16) & 255) * w[ph]; g += ((c >> 8) & 255) * w[ph]; b += (c & 255) * w[ph]; sum += w[ph];
      }
      r /= sum || 1; g /= sum || 1; b /= sum || 1;
      if (da > 0.01) {
        const c = layerTint(l.layer, 'dawn');
        r += (((c >> 16) & 255) - r) * da; g += (((c >> 8) & 255) - g) * da; b += ((c & 255) - b) * da;
      }
      l.img.setTint((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b));
    }
    // Etiqueta del cielo para la UI (sin decir "noche" si no lo es).
    const amb = Math.round(Math.min(1, w.deep + w.night + 0.3 * w.dusk) * 10) / 10;
    if (amb !== this.lastAmb) { this.lastAmb = amb; this.audio.setAmbient(amb); }
    this.skyLabel = w.deep + w.night > 0.5 ? '🌙 Noche despejada' : w.day > 0.5 ? '☀️ Día despejado' : '🌇 Atardecer despejado';
  }

  setPaused(on) {
    this.paused = on;
    this.audio.duck(on);
    if (on) this.endDrag(true);
  }

  bindUi() {
    this.ui.bind({
      selectTool: (id) => this.selectTool(id),
      nextGoal: () => this.state.nextGoal({ rain: this.weather.rain }),
      settingSeen: (key) => this.seenOnce(key),
      items: (tab) => this.shopItems(tab),
      buy: (id) => this.buy(id),
      pickCard: (id) => this.pickCard(id),
      mute: () => {
        this.audio.setMuted(!this.audio.muted);
        this.state.data.settings.muted = this.audio.muted;
        this.state.save();
        return this.audio.muted;
      },
      volume: (v) => {
        this.audio.setVolume(v);
        this.state.data.settings.volume = v;
        if (v > 0 && this.audio.muted) {
          this.audio.setMuted(false);
          this.state.data.settings.muted = false;
        }
        this.state.save();
        return this.audio.muted;
      },
      achievements: () => ACHIEVEMENTS.map((a) => ({
        icon: a.icon, name: a.name, desc: `${a.desc} (${rewardLabel(a)})`, done: !!this.state.meta.achievements[a.id],
      })),
      motion: (reduce) => {
        this.state.data.settings.reduceMotion = !!reduce;
        this.setMotion(!reduce);
        this.state.save();
      },
      export: () => this.state.exportSave(),
      import: (text) => {
        const r = this.state.importSave(text);
        if (r.ok) {
          const st = this.state.data.settings;
          this.audio.setVolume(st.volume);
          this.audio.setMuted(st.muted);
          this.ui.applySettings(st);
          this.ui.resetView();
          this.scene.restart();
        }
        return r;
      },
      pause: (on) => this.setPaused(on),
      ashItems: () => this.ashItems(),
      ashInfo: () => this.ashInfo(),
      buyAsh: (id) => this.buyAsh(id),
      prestige: () => this.doPrestige(),
      reset: () => {
        this.state.wipe();
        this.ui.resetView();
        this.scene.restart();
      },
    });
  }

  // --- Pistas de qué hacer ---

  currentHint() {
    const s = this.state;
    if (this.fire.isOut) {
      return s.res.fosforo > 0
        ? 'Se apagó. Poné ramas y tocalas para prender un fósforo.'
        : 'Sin fósforos: poné ramas y tocalas para probar con el pedernal.';
    }
    if (this.sinceStart < 25 && s.totalCalor < 15) return 'Arrastrá leña de la pila a un lugar marcado del fuego.';
    if (this.fire.stats.llama === 0 && this.fire.stats.brasas > 0) return 'Quedan brasas… poné ramas, que prenden con poco.';
    if (s.woodStock() === 0 && s.unlocked.tienda) return 'No te queda leña: tocá el + de la pila para comprar.';
    return '';
  }

  // --- Bucle ---

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const data = this.state.data;

    if (!this.paused) {
      this.sinceStart += dt;
      data.playTime += dt;
      const progress = this.pitObjs.length + data.level / 4;
      this.weather.update(dt, data.unlocked, progress);
      this.fire.update(dt, this.weather);

      // Calor que generan las fogatas.
      const rate = this.state.rateBreakdown(this.pitObjs, this.fire.stats.llama, false, this.pitObjs.map((p) => p.structureBonus)).total;
      this.rate += (rate - this.rate) * Math.min(1, dt * 2);
      this.state.rate = this.rate;
      if (this.rate > this.state.meta.stats.maxRate) this.state.meta.stats.maxRate = this.rate;
      this.state.gainCalor(rate * dt);
      this.updateNight(dt);

      this.updateSupply(dt);
      if (this.bellowsPit && this.time.now - this.lastPump > 420) {
        if (this.fire.pitIsLit(this.bellowsPit)) this.pump(this.bellowsPit);
      }

      this.slotsCtl.updateSlots();
      this.updateDrag(dt);
      this.slotsCtl.updateSlotShadows();
      this.slotsCtl.slotMagnetTick();
      this.slotsCtl.drawHover();

      this.checkTimer += dt;
      if (this.checkTimer > 0.4) {
        this.checkTimer = 0;
        this.checkProgress();
      }
    }
    this.updateOrbs(dt);

    // Parallax sutil según el puntero (quieto si el movimiento está reducido).
    const target = this.fx ? Phaser.Math.Clamp(this.input.activePointer.x / W - 0.5, -0.5, 0.5) : 0;
    this.parallaxX += (target - this.parallaxX) * Math.min(1, dt * 3);
    for (const l of this.parallax) l.img.x = W / 2 - this.parallaxX * l.amp * 2;

    this.updateLight(dt);
    const I =Math.min(1.2, this.fire.intensity);
    this.warm.setAlpha(Math.min(0.12, I * 0.07) * (1 - 0.7 * (this.skyBright || 0)));
    // Frío de la noche: luz más débil, viñeta más cerrada y un velo azul.
    const cold = this.state.data.unlocked.noches ? this.state.nightInfo().cold * (this.fx ? 1 : 0.4) : 0;
    this.fire.cold = cold;
    this.coldTint.setAlpha(0.22 * cold);
    this.vignette.setAlpha(Math.min(1, 0.92 - 0.4 * Math.min(1, I) + 0.08 * cold));
    this.updateRack();

    this.hintTimer += dt;
    if (this.hintTimer > 0.3) {
      this.hintTimer = 0;
      this.ui.setHint(this.currentHint());
      this.ui.pitInfo(this.pitInfoList());
      const helpers = SUPPLIERS.filter((sup) => sup.label && sup.level(data, this.state.mods))
        .map((sup) => ({ id: sup.id, label: sup.label(sup.level(data, this.state.mods)), progress: this.supplyTimers[sup.id] || 0 }));
      const lvl = this.state.levelInfo();
      this.rateInfo = this.state.rateBreakdown(this.pitObjs, this.fire.stats.llama, true, this.pitObjs.map((p) => p.structureBonus));
      this.ui.update({
        calor: data.calor,
        rate: this.rate,
        bump: true,
        levelOn: !!data.unlocked.cartas,
        level: data.level,
        levelProgress: lvl.pct,
        levelCur: lvl.cur,
        levelNeed: lvl.need,
        rateInfo: this.rateInfo,
        night: data.unlocked.noches ? this.state.nightInfo() : null,
        tool: data.tool,
        res: this.state.res,
        forecast: data.unlocked.clima ? this.weather.forecast : null,
        weatherOn: !!data.unlocked.clima,
        skyLabel: this.skyLabel,
        helpers,
      });
    }

    this.saveTimer += dt;
    if (this.saveTimer > 10) {
      this.saveTimer = 0;
      this.state.save();
    }
  }
}
