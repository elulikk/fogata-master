// Escena principal: las fogatas, la pila de leña, el clima y la economía.

import { WOODS, WOOD_ORDER } from '../data/woods.js';
import { MILESTONES, levelThreshold } from '../data/progress.js';
import { allItems } from '../data/shop.js';
import { CARDS, rollCards } from '../data/cards.js';
import { META } from '../data/meta.js';
import { stepNight, nightGoal, dawnAsh, DAY, FIRST_DAY_LEFT } from '../data/nights.js';
import { ACHIEVEMENTS, rewardLabel } from '../data/achievements.js';
import { rollForestEvent, forestEventLoot } from '../data/forest.js';
import { Log } from '../objects/Log.js';
import { Fire } from '../objects/Fire.js';
import { Pit } from '../objects/Pit.js';
import { Weather } from '../objects/Weather.js';
import { createTextures, W, H, GROUND_Y, layerTint, SKY_KEYS } from '../gfx/textures.js';
import { pointSegDist, clamp } from '../utils/geom.js';
import { SlotController } from './SlotController.js';
import { GROUND_BUDGET, footprint, SIZES, MAX_SIZE, STRUCTURE, BASE_CAPACITY } from '../data/sizes.js';

// Área de leña de un tronco (la capacidad se muestra en "troncos equivalentes").
const TRONCO_AREA = 7400;

const MAX_LOGS = 80; // con pozos grandes (cap hasta 195.000) 45 ramas no alcanzan para llenarlos
const RACK = { left: 18, right: 232, bottom: GROUND_Y - 4 };
// Textos que hablan de la pila (lluvia, +N del bosque): se corren a la derecha del estante para no taparlo.
const RACK_TEXT_X = RACK.right + 90;
// Números de combo visibles a la vez; los que pasan del tope no se muestran (el calor igual se suma).
const COMBO_TEXT_CAP = 6;

// Etiqueta corta del estante: "Madera seca" -> "Seca". El resto usa la primera palabra ("Ramas", "Piñas").
function rackLabel(name) {
  const w = name.split(' ');
  const s = w[0] === 'Madera' && w[1] ? w.slice(1).join(' ') : w[0];
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
    // Fondo en capas (depth 0..0.5, debajo de todo lo demás); el cielo de amanecer se funde entre cielo y colinas.
    this.skyLayer = this.add.image(0, 0, 'bg-sky').setOrigin(0).setDepth(0);
    // Ciclo de luz: cielos apilados (noche → noche profunda → atardecer → día) con alpha normalizado.
    this.skies = [['night', this.skyLayer], ...[['deep', 0.01], ['dusk', 0.02], ['day', 0.03]].map(([ph, d]) =>
      [ph, this.add.image(0, 0, SKY_KEYS[ph]).setOrigin(0).setDepth(d).setAlpha(0).setScale(ph === 'deep' ? 1 : 2)])];
    this.skyW = null; // pesos suavizados por fase (se inicializan en el primer updateLight)
    this.dawnSky = this.add.image(0, 0, 'sky-dawn').setOrigin(0).setScale(2).setDepth(0.05).setAlpha(0);
    // Rayos del sol naciente (x≈435, y≈546): el origen queda en el sol para que el giro sea alrededor de él.
    this.dawnRays = this.add.image(W * 0.34, 546, 'dawn-rays').setScale(2).setOrigin(0.34, 546 / H).setDepth(0.06).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.parallax = [['hills', 'bg-hills-lit', 0.1, 4], ['far', 'bg-trees-far-lit', 0.2, 8], ['mid', 'bg-trees-mid-lit', 0.3, 13], ['near', 'bg-trees-near-lit', 0.4, 20]].map(([layer, key, depth, amp]) =>
      ({ layer, amp, img: this.add.image(W / 2, H / 2, key).setScale(1.04).setDepth(depth) }));
    this.groundLayer = this.add.image(0, 0, 'bg-ground-lit').setOrigin(0).setDepth(0.5);
    this.parallaxX = 0;
    this.createWorld();

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
    this.trip = null;
    this.paused = false;
    this.bellowsPit = null;
    this.lastPump = 0;
    this.rate = 0;
    this.helperTimers = { ayudante: 0, secadero: 0, sabueso: 0 };
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
    this.setupCollisions();
    this.setupFireEvents();
    this.setupFeelEvents();
    this.bindUi();

    // Arranque: una fogata con leña ya prendida. Al volver a una partida
    // guardada solo queda una rama encendida (la leña en el fuego no se guarda).
    const pit = this.pitObjs[0];
    if (data.playTime < 1) this.fire.ignite(this.addLog('tronco', pit.x, GROUND_Y - 30, 0.05), true);
    this.fire.ignite(this.addLog('rama', pit.x - 10, GROUND_Y - 70, -0.25), true);

    // Al cargar una partida, vuelvo a mostrar lo que ya estaba desbloqueado.
    for (const id of Object.keys(data.unlocked)) this.applyUnlock(id, false);
    this.revealAshes();
    // Tutorial: quien ya tiene partida no lo ve; el progreso del tutorial se guarda en la UI.
    this.ui.tutorial('load', {
      progress: data.totalCalor > 120 || (data.level | 0) > 1 || Object.keys(data.unlocked).length > 0,
      size: Math.max(0, ...data.pits.map((q) => q.size | 0)),
    });
    this.state.onStale = () => this.ui.forestEvent?.({
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

  // --- Mundo físico ---

  createWorld() {
    const opts = { isStatic: true, friction: 0.9, label: 'ground' };
    this.matter.add.rectangle(W / 2, GROUND_Y + 60, W * 2, 120, opts);
    this.matter.add.rectangle(-30, H / 2 - 400, 60, H * 3, { isStatic: true, label: 'wall' });
    this.matter.add.rectangle(W + 30, H / 2 - 400, 60, H * 3, { isStatic: true, label: 'wall' });
    this.matter.add.rectangle(W / 2, -900, W * 2, 60, { isStatic: true, label: 'wall' });
  }

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

  addLog(key, x, y, angle = 0) {
    const log = new Log(this, x, y, key, angle);
    this.fire.addLog(log);
    return log;
  }

  // --- Pila de leña ---

  createRack() {
    this.rackGfx = this.add.graphics().setDepth(5);
    this.rackItems = [];
    this.slots = [];
    this.rackSig = '';
    this.layoutRack();
  }

  layoutRack() {
    const seen = this.state.data.seenWood;
    const keys = WOOD_ORDER.filter((k) => seen[k]);
    const sig = keys.join(',');
    if (sig === this.rackSig) return;
    this.rackSig = sig;

    for (const o of this.rackItems) o.destroy();
    this.rackItems = [];
    this.slots = [];
    const g = this.rackGfx;
    g.clear();

    let y = RACK.bottom;
    const slotsInfo = [];
    for (const key of [...keys].reverse()) {
      const wood = WOODS[key];
      const scale = Math.min(0.85, 130 / wood.length);
      const th = wood.thickness * scale;
      const h = Math.max(54, th * 2.4 + 26);
      slotsInfo.push({ key, top: y - h, bottom: y, scale, th });
      y -= h;
    }
    const top = y - 26;

    // Estantería de madera.
    g.fillStyle(0x2a1b10, 1);
    g.fillRect(RACK.left, top, 10, RACK.bottom - top + 4);
    g.fillRect(RACK.right - 10, top, 10, RACK.bottom - top + 4);
    g.fillStyle(0x3a2616, 1);
    g.fillRect(RACK.left - 4, top - 6, RACK.right - RACK.left + 8, 10);
    const title = this.add.text((RACK.left + RACK.right) / 2, top - 22, 'LEÑA', {
      fontFamily: 'Fredoka, system-ui', fontSize: '16px', color: '#c9a77a', fontStyle: '600',
    }).setOrigin(0.5).setDepth(6);
    this.rackItems.push(title);

    for (const s of slotsInfo) {
      g.fillStyle(0x3a2616, 1);
      g.fillRect(RACK.left - 2, s.bottom - 6, RACK.right - RACK.left + 4, 8);
      const cx = RACK.left + 82;
      const imgs = [];
      const pos = [[-6, -s.th * 0.5 - 6], [8, -s.th * 0.5 - 6], [1, -s.th * 1.45 - 6]];
      if (WOODS[s.key].shape === 'cone') { pos[0][0] = -26; pos[1][0] = 10; pos[2][0] = -8; }
      for (const [dx, dy] of pos) {
        imgs.push(this.add.image(cx + dx, s.bottom + dy, `log-${s.key}`).setScale(WOODS[s.key].shape === 'cone' ? 0.85 : s.scale).setDepth(6));
      }
      const label = this.add.text(RACK.right - 16, s.bottom - 10, '', {
        fontFamily: 'Fredoka, system-ui', fontSize: '15px', color: '#f3e6d3', align: 'right',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(1, 1).setDepth(7);
      this.rackItems.push(...imgs, label);
      this.slots.push({ key: s.key, rect: new Phaser.Geom.Rectangle(RACK.left, s.top, RACK.right - RACK.left, s.bottom - s.top), imgs, label, count: -1 });
    }
  }

  updateRack() {
    this.layoutRack();
    const res = this.state.res;
    for (const s of this.slots) {
      const n = res[s.key] || 0;
      if (n === s.count) continue;
      s.count = n;
      s.label.setText(`${rackLabel(WOODS[s.key].name)}\n×${n}`);
      s.label.setColor(n ? '#f3e6d3' : '#8a7a68');
      s.imgs.forEach((img, i) => img.setAlpha(n > i ? 1 : 0.18));
    }
  }

  slotAt(x, y) {
    return this.slots.find((s) => s.rect.contains(x, y));
  }

  // --- Entrada ---

  // Leña bajo el puntero. Si el punto cae dentro de varias gana la de más arriba y a la vista (la más
  // alta en pantalla; la que está encima de la pila, no la de abajo); si no cae dentro de ninguna, la
  // más cercana dentro del alcance (28 px con el dedo, 8 con el mouse).
  logAt(x, y) {
    const reach = this.touch ? 28 : 8;
    let best = null;
    let bs = Infinity;
    for (const l of this.fire.logs) {
      if (l.state === 'ceniza' || l.dead) continue;
      const d = pointSegDist(x, y, ...l.endpoints()) - l.thickness / 2;
      if (d >= reach) continue;
      // dentro (d <= 0): ordena por altura; fuera: por distancia, siempre después de las que están dentro
      const score = d <= 0 ? l.y - 1e4 : d;
      if (score < bs) { bs = score; best = l; }
    }
    return best;
  }

  setupInput() {
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(1); // segundo dedo para rotar en touch
    this.input.on('pointerdown', (p) => {
      this.audio.unlock();
      this.touch = !!p.wasTouch;
      if (this.paused || this.trip) return;
      // Clic derecho con una leña agarrada: gira 45°. Sin leña no hace nada.
      if (p.button === 2 || p.rightButtonDown()) {
        if (this.drag) this.rotateStep(45);
        return;
      }
      // Segundo dedo con una leña agarrada: gira siguiendo el ángulo entre los dos dedos.
      if (this.drag && p.id !== this.drag.pid) {
        const a = this.input.manager.pointers.find((q) => q.id === this.drag.pid);
        if (a) this.drag.twist = { id: p.id, ang: Math.atan2(p.worldY - a.worldY, p.worldX - a.worldX) };
        return;
      }
      const x = p.worldX;
      const y = p.worldY;
      this.hoverLog = null;
      this.down = { x, y, t: this.time.now };
      // En touch no hay "pasar el mouse": el toque también junta los chispazos cercanos.
      if (this.touch) this.collectOrbsNear(x, y);

      const log = this.logAt(x, y);
      if (log) return this.startDrag(log, p, false);

      const slot = this.slotAt(x, y);
      if (slot) {
        if (this.state.res[slot.key] > 0) {
          if (this.fire.logs.length >= MAX_LOGS) return this.ui.toast('Ya hay demasiada leña tirada.', 'bad', 2500);
          this.state.add(slot.key, -1);
          const l = this.addLog(slot.key, x, y, 0);
          this.startDrag(l, p, true);
          l.pop();
          this.audio.pull(l.wood.weight);
        } else {
          this.floatText(x, y - 20, `No te quedan ${WOODS[slot.key].name.toLowerCase()}`, '#ff9a80');
        }
        return;
      }

      const pit = this.fire.pitAt(x, y) || this.fire.pitAt(x, Math.max(y, GROUND_Y - 100));
      if (pit && this.state.bought.fuelle && this.fire.pitIsLit(pit)) {
        this.bellowsPit = pit;
        this.pump(pit);
        return;
      }
      this.strikeMatch(x, y);
    });

    this.input.on('pointermove', (p) => {
      const x = p.worldX;
      const y = p.worldY;
      if (this.drag?.twist && (p.id === this.drag.twist.id || p.id === this.drag.pid)) {
        const a = this.input.manager.pointers.find((q) => q.id === this.drag.pid);
        const b = this.input.manager.pointers.find((q) => q.id === this.drag.twist.id);
        if (a && b) {
          const ang = Math.atan2(b.worldY - a.worldY, b.worldX - a.worldX);
          this.addAim(Phaser.Math.Angle.Wrap(ang - this.drag.twist.ang));
          this.drag.twist.ang = ang;
        }
      }
      if (this.drag && p.id !== this.drag.pid) return;
      if (this.drag) {
        this.drag.c.pointA.x = clamp(x, 10, W - 10);
        this.drag.c.pointA.y = clamp(y, -200, GROUND_Y + 30);
        this.drag.px = x;
        this.drag.py = y;
        this.drag.moved = Math.max(this.drag.moved, Math.hypot(x - this.down.x, y - this.down.y));
      }
      this.collectOrbsNear(x, y);
      let cursor = 'default';
      this.hoverLog = null;
      if (this.drag) cursor = 'grabbing';
      else if (this.logAt(x, y) || this.slotAt(x, y)) {
        cursor = 'grab';
        if (!this.touch && !p.wasTouch) this.hoverLog = this.logAt(x, y); // resalte solo con mouse y sin arrastrar
      }
      else if (this.state.bought.fuelle && this.fire.pitAt(x, y) && this.fire.pitIsLit(this.fire.pitAt(x, y))) cursor = 'pointer';
      this.input.setDefaultCursor(cursor);
    });

    const up = (p) => {
      if (p && p.button > 0) return; // soltar el clic derecho no suelta la leña
      if (this.drag && p && p.id !== this.drag.pid) { this.drag.twist = null; return; }
      this.bellowsPit = null;
      if (!this.drag) return;
      const d = this.drag;
      const tap = !d.spawned && d.moved < 8 && this.time.now - this.down.t < 250;
      this.endDrag();
      if (tap) this.strikeMatch(this.down.x, this.down.y);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);

    this.input.keyboard.addCapture('SPACE');
    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.state.bought.fuelle || this.paused || this.trip) return;
      const pit = this.fire.nearestPit(this.input.activePointer.worldX);
      if (pit && this.fire.pitIsLit(pit)) {
        if (!this.bellowsPit) this.pump(pit);
        this.bellowsPit = pit;
      }
    });
    this.input.keyboard.on('keyup-SPACE', () => { this.bellowsPit = null; });

    // Rotar la leña agarrada: rueda (pasos de 15°), Q/E sostenidas (Shift = fino).
    this.rotKeys = { q: 0, e: 0 };
    this.rotUi = 0;
    this.rotFine = false;
    this.input.on('wheel', (p, over, dx, dy) => {
      if (this.drag && dy) this.rotateStep(Math.sign(dy) * 15);
    });
    const key = (k, v) => (ev) => { this.rotKeys[k] = v; this.rotFine = !!ev.shiftKey; };
    this.input.keyboard.on('keydown-Q', key('q', 1));
    this.input.keyboard.on('keyup-Q', key('q', 0));
    this.input.keyboard.on('keydown-E', key('e', 1));
    this.input.keyboard.on('keyup-E', key('e', 0));
  }

  // --- Rotación de la leña agarrada ---
  // No se fija el ángulo: se acumula un ángulo deseado (aim) y un torque amortiguado
  // lleva la velocidad angular hacia él. Si el jugador no rota, aim queda nulo y no se toca nada.

  // dir = -1 | 0 | 1: giro continuo mientras sea distinto de 0 (lo usa el dock táctil de la UI).
  rotateDrag(dir) {
    this.rotUi = Math.sign(dir || 0);
  }

  // Un paso de giro en grados (positivo = horario).
  rotateStep(deg) {
    this.addAim(Phaser.Math.DegToRad(deg));
  }

  addAim(rad) {
    const d = this.drag;
    if (!d || !rad) return;
    this.ui.rotated();
    if (d.aim == null) d.aim = d.log.sprite.body.angle;
    d.aim += rad;
    d.rotAcc = (d.rotAcc || 0) + rad;
    const step = Phaser.Math.DegToRad(12);
    while (Math.abs(d.rotAcc) >= step) {
      const dir = Math.sign(d.rotAcc);
      d.rotAcc -= dir * step;
      this.events.emit('log:rotate', { dir });
    }
  }

  updateDragRotation(dt) {
    const d = this.drag;
    if (!d) return;
    const body = d.log.sprite?.body;
    if (!body || d.log.dead) { this.drag = null; return; }
    Phaser.Physics.Matter.Matter.Sleeping.set(body, false);
    const dir = clamp(this.rotUi + this.rotKeys.e - this.rotKeys.q, -1, 1);
    if (dir) this.addAim(dir * (this.rotFine ? 0.9 : 3) * dt);
    if (d.aim == null) return;
    const diff = Phaser.Math.Angle.Wrap(d.aim - body.angle);
    const want = clamp(diff * 0.35, -0.14, 0.14);
    const av = body.angularVelocity + (want - body.angularVelocity) * Math.min(1, dt * 14);
    d.log.sprite.setAngularVelocity(av);
  }

  startDrag(log, p, spawned) {
    const body = log.sprite.body;
    this.fire.unsnap(log, 'grab'); // agarrar una leña encajada la desencaja
    const stiffness = { light: 0.24, medium: 0.18, heavy: 0.12 }[log.wood.weight];
    const c = this.matter.add.worldConstraint(body, 0, stiffness, {
      pointA: { x: p.worldX, y: p.worldY },
      pointB: spawned ? { x: 0, y: 0 } : { x: p.worldX - body.position.x, y: p.worldY - body.position.y },
      damping: 0.08,
    });
    log.sprite.setFrictionAir(0.04);
    log.dragged = true;
    this.fire.releaseProp(log);
    log.overflow = false;
    log.idleOut = 0;
    log.setWallPass(true); // agarrada, atraviesa las paredes del pozo
    if (log.pit) this.fire.wakeLogs(log.pit);
    Phaser.Physics.Matter.Matter.Sleeping.set(body, false);
    this.drag = { log, c, spawned, moved: 0, pid: p.id, aim: null, rotAcc: 0, twist: null, px: p.worldX, py: p.worldY, slot: null, slotPit: null };
    this.ui.setDragging(true);
    this.ui.tutorial('grab');
    this.input.setDefaultCursor('grabbing');
  }

  // noSnap: la soltó el sistema (modal, ceniza, viaje), no el jugador: no se encaja.
  endDrag(noSnap = false) {
    if (!this.drag) return;
    const { log, c, slot, slotPit, mirror, tiltedAim } = this.drag;
    this.matter.world.removeConstraint(c);
    this.drag = null;
    this.rotUi = 0;
    this.ui.setDragging(false);
    if (log.state === 'ceniza') return;
    const s = log.sprite;
    const pitNow = this.fire.pitAt(s.x, s.y) || this.fire.pitAt(s.x, GROUND_Y - 60);
    if (!noSnap && pitNow) this.ui.tutorial('drop');
    log.dragged = false;
    log.overChecked = false;
    log.releasedAt = this.time.now;
    log.dropPit = pitNow || null;
    log.restEmitted = false;
    s.setFrictionAir(0.012);
    const ang = ((s.rotation % Math.PI) + Math.PI) % Math.PI;
    log.prop = pitNow && log.wood.shape !== 'cone' && Math.min(ang, Math.PI - ang) >= 0.55 ? { aim: s.rotation, t: 0 } : null;
    const v = s.body.velocity;
    const sp = Math.hypot(v.x, v.y);
    // Soltada sobre un pozo: se amortigua el lanzamiento para que caiga adentro y no salga volando.
    const pit = pitNow;
    const cap = pit ? 8 : 20;
    const k = pit ? 0.45 : 1;
    if (sp * k > cap) s.setVelocity((v.x / sp) * cap, (v.y / sp) * cap);
    else if (k < 1) s.setVelocity(v.x * k, v.y * k);
    s.setAngularVelocity(clamp(s.body.angularVelocity * (pit ? 0.5 : 1), -0.35, 0.35));
    // Soltada con una ranura resaltada: encaja (salvo que el pozo esté lleno).
    if (!noSnap && slot && slotPit && !log.dead && slotPit.loadRatio <= 1.05) {
      this.fire.snapLog(log, slotPit, slot);
      if (mirror) this.slotsCtl.tipiNotice(slotPit, 'Se encaja del otro lado', '#ffd9a0');
    } else if (!noSnap && !slot && tiltedAim && slotPit && !log.dead && this.fire.slotted(slotPit).some((o) => o.slot.kind === 'tipi')
      && !slotPit.slots.some((q) => q.kind === 'tipi')) {
      this.slotsCtl.tipiNotice(slotPit, 'No hay más lugar en el tipi', '#ff9a80');
    }
    // Soltada sin ranura dentro de un pozo: unos instantes de amortiguación para que se asiente sin rebotar.
    if (pit && !log.snapping && !log.slot && !log.dead) {
      s.setFrictionAir(0.1);
      s.setAngularVelocity(clamp(s.body.angularVelocity, -0.15, 0.15));
      log.settleT = 0.5;
      this.audio.woodTock(log.wood.weight, true); // asentado suave
    }
    // Un leño que no cabe horizontal en el pozo (tronco grueso en pozo chico) no se queda apoyado en las
    // piedras: se inclina lo justo para caer adentro.
    if (!log.snapping && !log.slot && pit && !log.dead && log.wood.shape !== 'cone') {
      const inner = 2 * (pit.half - 12) - 6;
      if (log.length > inner) {
        let th = 0;
        while (th < 1.4 && log.length * Math.cos(th) + log.thickness * Math.sin(th) > inner) th += 0.05;
        const sg = Math.sin(s.rotation) >= 0 ? 1 : -1;
        s.setPosition(pit.x, Math.min(s.y, pit.top + 60));
        s.setRotation(sg * th);
        s.setVelocity(0, 0);
        s.setAngularVelocity(0);
      }
    }
    for (const q of this.fire.pits) q.slots = [];
  }

  strikeMatch(x, y) {
    // Solo gasto un fósforo si hay algo para prender cerca.
    const near = this.fire.logs.some((l) => l.state === 'cruda' && pointSegDist(x, y, ...l.endpoints()) < 70);
    if (!near) return;
    const res = this.state.res;
    const pit = this.fire.pitAt(x, y);
    const rain = pit ? pit.rain : this.weather.rain;
    if (res.fosforo > 0) {
      res.fosforo--;
      if (Math.random() < rain * 0.5) {
        this.audio.match(false);
        this.fire.sparkAt({ x, y }, 3);
        this.floatText(x, y - 20, 'La lluvia apagó el fósforo', '#8fb8e8');
        return;
      }
      this.audio.match(true);
      this.fire.strike(x, y, 0.8, 1.8);
      if (res.fosforo === 0) this.ui.toast('Te quedaste sin fósforos. Podés probar con el pedernal (cuesta más).', 'bad');
    } else {
      const ok = Math.random() < 0.3 * (1 - rain * 0.6);
      this.audio.flint(ok);
      this.fire.sparkAt({ x, y }, ok ? 8 : 4);
      if (ok) this.fire.strike(x, y, 0.5, 0.6, 35);
    }
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

  // --- Choques: golpes, chispas ---

  setupCollisions() {
    this.matter.world.on('collisionstart', (ev) => {
      const now = this.time.now;
      for (const pair of ev.pairs) {
        const a = pair.bodyA.parent;
        const b = pair.bodyB.parent;
        const la = a.gameObject?.logRef;
        const lb = b.gameObject?.logRef;
        if (!la && !lb) continue;
        const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        // Apoyo estable: una leña recién soltada se asienta sobre otra (para el feel de acomodar).
        if (la && lb) {
          const mover = !la.restEmitted && now - la.releasedAt < 1500 ? la : !lb.restEmitted && now - lb.releasedAt < 1500 ? lb : null;
          if (mover && rv < 2.5 && now - mover.releasedAt > 60) {
            mover.restEmitted = true;
            this.events.emit('log:rest', { log: mover, onLog: mover === la ? lb : la });
          }
        }
        // Leña recién soltada que rebota contra la pared de un pozo: no hay lugar, se avisa.
        const wl = a.label === 'wall-pit' ? b.gameObject?.logRef : b.label === 'wall-pit' ? a.gameObject?.logRef : null;
        if (wl && rv > 3 && now - wl.releasedAt < 2000 && !wl.dragged) {
          const wb = a.label === 'wall-pit' ? a : b;
          const wp = this.pitObjs.find((p) => p.walls.includes(wb));
          if (wp) this.fire.notifyOverflow(wl, wp, 'wall');
        }
        if (rv < 2) continue;
        const log = la && lb ? (la.area > lb.area ? la : lb) : la || lb;
        if (now - log.lastHit < 90) continue;
        log.lastHit = now;
        const power = clamp((rv - 2) / 12, 0, 1);
        if (log.pit && power > 0.2 && now - (log.lastLand || 0) > 250) {
          log.lastLand = now;
          this.fire.landInPit(log, power); // tump + anillo de chispas
          this.firstTime('pit', log.x, log.y);
        } else {
          this.audio.thud(power, log.wood.weight);
        }
        if (log.wood.weight === 'heavy' && power > 0.45) this.cameras.main.shake(90, 0.003 * power);
        const sup = pair.collision?.supports?.[0];
        const pos = sup ? { x: sup.x, y: sup.y } : { x: log.x, y: log.y };
        const burning = (la && la.burning) || (lb && lb.burning);
        const pit = this.fire.pitAt(pos.x, pos.y);
        if (burning || (pit && pit.bed > 0.2)) this.fire.burst(pos.x, pos.y, Math.round(4 + power * 18));
      }
    });
  }

  // Feedback del acomodo de leña, la capacidad, las estructuras y el tamaño (eventos de física).
  setupFeelEvents() {
    const ev = this.events;
    // Los eventos de escena sobreviven a scene.restart(): sin esto cada reinicio duplicaba los listeners
    // (texto "¡Armaste un tipi!" doble, sonidos y flashes repetidos).
    for (const name of ['log:rotate', 'log:rest', 'log:overflow', 'log:returned', 'structure:formed', 'structure:lost', 'structure:collapse', 'pit:grow', 'log:snap', 'log:unsnap']) ev.off(name);
    ev.on('log:snap', (e) => {
      this.slotsCtl.onSlotSnap(e);
      this.ui.tutorial('snap');
      this.firstTime('snap', e.slot.x, e.slot.y);
    });
    ev.on('log:unsnap', ({ log, pit, reason }) => {
      if (pit?.snapChain && reason !== 'grab') pit.snapChain = null;
      if (reason === 'grab' && pit?.snapChain) pit.snapChain.n = Math.max(0, pit.snapChain.n - 1);
      this.audio.unsnap(reason);
      if (reason === 'support' && this.fx && log.sprite?.active) {
        this.fire.ashDust.emitParticleAt(log.x, log.y, 3);
      }
    });
    // Rotar: un clic por paso (~12°).
    ev.on('log:rotate', () => {
      this.audio.rotateTick();
      if (this.drag) {
        this.drag.lastRotT = this.time.now;
        this.ui.tutorial('rotate');
        this.firstTime('rotate', this.drag.log.x, this.drag.log.y - 20);
      }
    });
    // Apoyo estable sobre otra leña.
    ev.on('log:rest', ({ log }) => {
      this.audio.woodTock(log.wood.weight);
      if (this.fx && log.sprite?.active) log.pop(0.3);
    });
    // Pozo lleno: rechazo suave (sonido, brasitas hacia afuera, aviso con cooldown).
    // reason: 'full' (rechazo con chispa), 'wall' (tock suave contra la piedra), 'out' (casi nada).
    ev.on('log:overflow', ({ log, pit, reason }) => {
      if (reason === 'out') return;
      const idx = this.pitObjs.indexOf(pit);
      if (reason === 'wall') {
        this.audio.woodTock('light', true);
        this.ui.pitFull(idx);
        return;
      }
      this.audio.overflowReject();
      // Un solo aviso: la 1.ª vez del jugador, un toast que explica qué hacer; después, el texto en el
      // mundo y el parpadeo de la barra de la etiqueta.
      const name = SIZES[pit.size]?.name || 'El pozo';
      const toasted = this.ui.pitFull(idx, pit.size < MAX_SIZE
        ? `${name} está lleno: agrandalo o armá una cabaña para que entre más.`
        : `${name} está lleno: armá una cabaña para que entre más.`);
      if (!this.fx) return;
      this.fire.ring.emitParticleAt(log.x + (log.x < pit.x ? -10 : 10), log.y, 5);
      pit.flash = Math.max(pit.flash || 0, 0.2);
      if (!toasted && this.time.now - (pit.lastFullMsg || -1e9) > 4000) {
        pit.lastFullMsg = this.time.now;
        this.worldMsg(pit, 'Pozo lleno', '#ffb36b', 1, 1);
      }
    });
    // Vuelve al estante.
    ev.on('log:returned', () => {
      this.audio.logReturn();
      if (this.fx) this.floatText(RACK.right - 60, 300, '↩', '#cfe8b0');
    });
    // Estructura: un solo momento por pozo al formarse.
    ev.on('structure:formed', ({ pit, type, quality }) => {
      const pieces = pit.snapChain && this.time.now - pit.snapChain.t < 7000 ? pit.snapChain.n : 0;
      pit.snapChain = null;
      this.audio.structureFormed(type, pieces);
      this.fire.structureBurst(pit, type, quality + (pieces >= 3 ? 0.1 : 0));
      if (!this.fx) return;
      if (type === 'cabana') this.cameras.main.flash(260, 255, 170, 80, false);
      else this.cameras.main.flash(160, 255, 215, 130, false);
      // Un solo mensaje a la vez: título y, debajo, lo que rinde.
      const pct = Math.round((STRUCTURE[type]?.calor || 0) * quality * 100);
      const title = type === 'cabana' ? '¡Armaste una cabaña!' : '¡Armaste un tipi!';
      const extra = type === 'cabana' ? `rinde +${pct} % de calor y entra más leña` : `rinde +${pct} % de calor`;
      this.worldMsg(pit, `${title}
${extra}`, '#ffd36b', 1.3, 2, 2600);
      this.time.delayedCall(700, () => this.firstTime('structure', pit.x, GROUND_Y - 140));
    });
    // Derrumbe: se perdió el apoyo de una pieza y la estructura cae.
    ev.on('structure:collapse', ({ pit }) => {
      this.audio.collapse();
      if (this.fx) this.worldMsg(pit, '¡Se derrumbó!', '#ff9a80', 1.2, 2, 1800);
    });
    // La primera vez de cada estructura, un toast explica qué hace.
    ev.on('structure:formed', ({ type, quality }) => {
      this.state.noteStructure(type, quality);
      this.ui.tutorial(`structure:${type}`);
      const info = {
        tipi: '🔺 Tipi: tira más aire y prende rápido, pero gasta un poco más de leña.',
        cabana: '🛖 Cabaña: dura más y entra más leña, aunque prende más lento.',
      }[type];
      if (info && !this.seenOnce(`struct_${type}`)) this.ui.toast(info, 'unlock', 7000);
    });
    ev.on('structure:lost', () => this.audio.structureLost());
    // Crecer de tamaño.
    ev.on('pit:grow', ({ pit, size }) => {
      this.ui.tutorial('pit:grow', { size });
      if (this.sinceStart > 1) this.playGrow(pit, size);
    });
  }

  // Un solo mensaje a la vez sobre el mundo, con prioridad (3 urgencia/pico, 2 estructura o derrumbe,
  // 1 avisos de encaje). Uno de menor prioridad se descarta mientras uno mayor sigue vigente; igual o mayor
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
    return this.pitObjs.map((p, i) => {
      const cap = p.capacity / TRONCO_AREA;
      return {
        i, screenX: p.x, screenY: GROUND_Y + 18, size: p.size, sizeName: SIZES[p.size]?.name,
        load: Math.min(cap * 1.5, (p.loadRatio || 0) * cap), cap, structure: p.structure, stackPenalty: p.stackPenalty || 0, slotsUsed: this.fire.slotted(p).length,
        slotsTotal: p.slots?.length ? this.fire.slotted(p).length + p.slots.length : 0, // las libres solo existen mientras se arrastra
        bonus: p.structure && STRUCTURE[p.structure.type] ? (STRUCTURE[p.structure.type].calor || 0) * p.structure.quality : 0,
        tipiLegs: this.fire.slotted(p).filter((o) => o.slot.kind === 'tipi').length,
        cabinPieces: this.fire.slotted(p).filter((o) => o.slot.kind !== 'tipi').length,
      };
    });
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
    this.worldMsg(pit, 'Fogata más grande', '#ffd36b', 1.4, 2, 2200);
  }

  setupFireEvents() {
    this.fire.onAsh = (log) => {
      if (this.drag?.log === log) this.endDrag(true);
    };
    this.fire.onCrackle = (x, y, strength, log) => {
      if (!this.state.unlocked.chispazos || !log.pit) return;
      if (Math.random() < 0.09 * this.state.mods.orbs * strength) this.spawnOrb(x, y);
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
      if (log.key === 'humeda' && !this.tipHumeda) {
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
    if (!this.paused && !this.trip && p) this.collectOrbsNear(p.worldX, p.worldY);
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

  // --- Bosque y ayudantes ---

  startTrip() {
    if (this.trip || this.paused) return;
    this.endDrag(true);
    this.ui.closePanel();
    this.trip = { t: 0, dur: 7 * this.state.mods.trip };
    this.audio.steps();
  }

  rollLoot(scale = 1, dry = false) {
    const s = this.state;
    const m = s.mods.loot * scale;
    const r = Math.random;
    const loot = {};
    const add = (k, n) => { n = Math.round(n); if (n > 0) loot[k] = (loot[k] || 0) + n; };
    add('rama', (4 + r() * 4) * m);
    if (s.bought.hacha) add('tronco', (1 + r() * 2) * m);
    else if (r() < 0.35) add('tronco', 1);
    if (s.unlocked.tienda && r() < 0.35) add('seca', (1 + r()) * m);
    if (s.totalCalor >= 1000 && s.res.pina < 8 && r() < 0.4) add('pina', (1 + r() * 2) * m * s.mods.pinas);
    if (scale >= 1 && r() < (s.res.fosforo < 3 ? 0.5 : s.res.fosforo < 6 ? 0.12 : 0.03)) add('fosforo', 1 + (r() < 0.3 ? 1 : 0));
    // Con lluvia, lo que juntás viene mojado.
    const rain = this.weather.rain;
    if (rain > 0.1 && !dry) {
      for (const k of ['rama', 'seca']) {
        if (!loot[k]) continue;
        const wet = Math.round(loot[k] * rain * 0.5);
        loot[k] -= wet;
        if (wet > 0) loot.humeda = (loot.humeda || 0) + Math.max(1, Math.round(wet / 2));
      }
    }
    return loot;
  }

  // Vuelta del bosque propio: botín y, a veces, un evento (ver data/forest.js).
  finishTrip() {
    const ev = rollForestEvent(this.state.data);
    const loot = this.rollLoot(1, !!ev?.dry);
    if (ev) this.applyForestEvent(ev, loot);
    this.giveLoot(loot, 'vos');
  }

  applyForestEvent(ev, loot) {
    const s = this.state;
    if (ev.lootScale) for (const k of Object.keys(loot)) loot[k] = Math.max(0, Math.round(loot[k] * ev.lootScale));
    for (const [k, n] of Object.entries(forestEventLoot(ev, s.mods.loot))) loot[k] = (loot[k] || 0) + n;
    let text = ev.text;
    if (ev.calorSecs) {
      const gift = Math.max(5, Math.round(this.rate * ev.calorSecs));
      s.gainCalor(gift);
      text += ` +${gift} 🔥`;
    }
    s.meta.stats.forestEvents++;
    const kind = ev.id === 'zorro' ? 'animal' : ev.id === 'viajero' ? 'viajero' : 'hallazgo';
    this.audio.forestEvent?.(kind);
    // Flash a mitad de intensidad (antes 255, 230, 150): color más oscuro, menos lavado.
    if (this.fx && kind === 'hallazgo') this.cameras.main.flash(220, 128, 115, 75, false);
    this.ui.forestEvent?.({ icon: ev.icon, title: ev.name, text });
    this.events.emit('forest:event', ev);
  }

  giveLoot(loot, who) {
    const names = { rama: 'ramas', tronco: 'troncos', seca: 'seca', humeda: 'húmeda', pina: 'piñas', fosforo: 'fósforos' };
    const parts = [];
    let i = 0;
    for (const [k, n] of Object.entries(loot)) {
      if (!n) continue;
      this.state.add(k, n);
      parts.push(`+${n} ${names[k]}`);
      this.time.delayedCall(i * 160, () => this.floatText(RACK_TEXT_X, 280 - i * 4, `+${n} ${names[k]}`, '#cfe8b0'));
      i++;
    }
    if (who === 'vos') this.ui.toast(`Volviste del bosque: ${parts.join(', ') || 'nada'}.`, 'info', 3500);
  }

  updateTripAndHelpers(dt) {
    if (this.trip) {
      this.trip.t += dt;
      if (this.trip.t >= this.trip.dur) {
        this.trip = null;
        this.state.data.trips++;
        this.audio.chop();
        this.finishTrip();
      }
    }
    const b = this.state.bought;
    if (b.ayudante) {
      const every = 30 / (1 + 0.5 * (b.ayudante - 1));
      this.helperTimers.ayudante += dt / every;
      if (this.helperTimers.ayudante >= 1) {
        this.helperTimers.ayudante = 0;
        this.giveLoot(this.rollLoot(0.6), 'ayudante');
      }
    }
    const hound = this.state.mods.hound;
    if (hound) {
      const every = 60 / (1 + 0.5 * (hound - 1));
      this.helperTimers.sabueso += dt / every;
      if (this.helperTimers.sabueso >= 1) {
        this.helperTimers.sabueso = 0;
        this.giveLoot(this.rollLoot(0.4), 'sabueso');
      }
    }
    if (b.secadero) {
      const every = 14 / b.secadero;
      if (this.state.res.humeda > 0) this.helperTimers.secadero += dt / every;
      if (this.helperTimers.secadero >= 1) {
        this.helperTimers.secadero = 0;
        this.state.add('humeda', -1);
        this.state.add('seca', 1);
        this.floatText(RACK_TEXT_X, 300, '+1 seca', '#e6c896');
      }
    }
    // La lluvia moja la pila si no hay leñera.
    if (this.weather.rain > 0.2 && !b.lenera) {
      this.wetTimer += dt * this.weather.rain;
      if (this.wetTimer >= 5) {
        this.wetTimer = 0;
        const res = this.state.res;
        const k = res.seca > 0 && Math.random() < 0.5 ? 'seca' : res.rama > 0 ? 'rama' : res.seca > 0 ? 'seca' : null;
        if (k) {
          this.state.add(k, -1);
          if (k === 'seca' || Math.random() < 0.5) this.state.add('humeda', 1);
          this.floatText(RACK_TEXT_X, 260, k === 'seca' ? 'Se mojó madera seca' : 'Se mojaron ramas', '#8fb8e8');
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
    if (id === 'calor') ui.reveal('hud-calor');
    if (id === 'bosque') ui.reveal('btn-forest');
    if (id === 'tienda') { ui.reveal('btn-shop'); if (announce) ui.markNew('btn-shop'); }
    if (id === 'cartas') ui.reveal('level');
    if (id === 'noches') { ui.reveal('btn-ashes'); if (announce) ui.markNew('btn-ashes'); }
    if (id === 'noches') this.revealAshes();
    if (id === 'clima' && announce) this.weather.timer = 25;
    if (id === 'construir') { ui.reveal('btn-build'); if (announce) ui.markNew('btn-build'); }
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
      if (data.unlocked[m.id] || !m.when(data, this.state)) continue;
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
      if (data.seenItems[it.id] || !it.requires(data)) continue;
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
        const maxed = level >= max;
        const price = this.state.price(it.cost(Math.min(level, max - 1)));
        return {
          id: it.id, icon: it.icon, name: it.name, desc: it.desc, level, max, maxed, price,
          need: {
            calor: Math.max(0, Math.ceil(price.calor - data.calor)),
            tronco: Math.max(0, Math.ceil(price.tronco - data.res.tronco)),
          },
          affordable: this.state.canPay(it.cost(Math.min(level, max - 1))),
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
      { label: 'Capacidad', before: `×${a.cap}`, after: `×${b.cap}` },
      { label: 'Aire', before: `+${Math.round((a.air - 1) * 100)}%`, after: `+${Math.round((b.air - 1) * 100)}%` },
      { label: 'Calor', before: `×${a.mult}`, after: `×${b.mult}` },
    ];
    const pit = this.pitObjs[Number(it.id.split('_')[1])];
    if (pit && pit.capacity > 0 && (pit.loadRatio || 0) > 0.02) {
      // La carga real (área de leña) pasa a fracción de la capacidad del tamaño nuevo.
      const load = Math.min(1.3, pit.loadRatio || 0);
      const nextLoad = Math.min(1.3, (load * pit.capacity) / (BASE_CAPACITY * b.cap * (this.state.mods.capacity || 1)));
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
    if (level >= (it.max || 99)) return;
    const why = it.blocked?.();
    if (why) return this.ui.toast(`🚧 ${why}`, 'bad', 3500);
    const cost = it.cost(level);
    if (!this.state.canPay(cost)) return;
    this.state.pay(cost);
    data.bought[id] = level + 1;
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
    if (on) {
      this.endDrag(true);
      this.matter.world.pause();
    } else {
      this.matter.world.resume();
    }
  }

  bindUi() {
    this.ui.bind({
      forest: () => this.startTrip(),
      rotate: (dir) => this.rotateDrag(dir),
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
    if (this.trip) return '';
    if (this.fire.isOut) {
      return s.res.fosforo > 0
        ? 'Se apagó. Tirá ramas al pozo y tocalas para prender un fósforo.'
        : 'Sin fósforos: tocá la leña para probar con el pedernal.';
    }
    if (this.sinceStart < 25 && s.totalCalor < 15) return 'Arrastrá leña de la pila y tirala al fuego.';
    const choked = this.pitObjs.find((p) => p.burningLogs > 0 && p.air < 0.5);
    if (choked) return s.bought.fuelle ? 'Se está ahogando: sacá leña o soplá con el fuelle.' : 'Se está ahogando: sacá un poco de leña.';
    if (this.fire.stats.llama === 0 && this.fire.stats.brasas > 0) return 'Quedan brasas… echale ramas encima.';
    if (s.woodStock() === 0 && s.unlocked.bosque) return 'No te queda leña: andá al bosque.';
    return '';
  }

  // --- Leña suelta ---

  // Saca una leña del juego sin dejar el cuerpo flotando (el Fire la quita de su lista).
  removeLog(l) {
    const i = this.fire.logs.indexOf(l);
    if (i >= 0) this.fire.logs.splice(i, 1);
    if (this.drag?.log === l) this.endDrag(true);
    l.state = 'ceniza';
    l.destroy();
  }

  // Leña cruda quieta fuera de un pozo: tras 6 s vuelve al estante. Lo que cae del mundo se descarta.
  updateStray(dt) {
    for (const l of this.fire.logs.slice()) {
      if (l.state === 'ceniza' || !l.sprite.body) continue;
      if (l.y > H + 100) { this.removeLog(l); continue; }
      const still = l.sprite.body.speed < 0.4 || l.sprite.body.isSleeping;
      if (!l.pit && l.state === 'cruda' && !l.dragged && still && l.y > GROUND_Y - 120) {
        l.idleOut += dt;
        if (l.idleOut > 6) this.returnLog(l);
      } else {
        l.idleOut = 0;
      }
    }
  }

  returnLog(l) {
    const slot = this.slots?.find((s) => s.key === l.key);
    const tx = slot ? slot.rect.centerX : RACK.left + 80;
    const ty = slot ? slot.rect.centerY : GROUND_Y - 100;
    const s = l.sprite;
    const ghost = this.add.image(s.x, s.y, s.texture.key)
      .setRotation(s.rotation).setScale(l.size).setFlipX(s.flipX).setAlpha(0.9).setDepth(25);
    this.state.add(l.key, 1);
    this.removeLog(l);
    this.tweens.add({
      targets: ghost, x: tx, y: ty, alpha: 0, scale: 0.4, rotation: 0,
      duration: 480, ease: 'quad.in', onComplete: () => ghost.destroy(),
    });
    this.events.emit('log:returned', { log: l });
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

      this.updateTripAndHelpers(dt);
      if (this.bellowsPit && this.time.now - this.lastPump > 420) {
        if (this.fire.pitIsLit(this.bellowsPit)) this.pump(this.bellowsPit);
      }

      this.updateDragRotation(dt);
      if (this.drag) {
        const d = this.drag;
        this.audio.drag(Math.hypot(d.px - (d.lpx ?? d.px), d.py - (d.lpy ?? d.py)) / Math.max(dt, 0.001));
        d.lpx = d.px;
        d.lpy = d.py;
      }
      this.slotsCtl.updateSlots();
      this.slotsCtl.updateSlotShadows();
      this.slotsCtl.slotMagnetTick();
      this.slotsCtl.drawAimGhost();
      this.slotsCtl.drawHover();
      this.updateStray(dt);

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

    // Primera vez que arrastrás una leña sobre un pozo: pista de rotación (se mira cada frame).
    if (this.drag && !this.rotHintShown) {
      const s = this.drag.log.sprite;
      if (this.fire.pitAt(s.x, s.y) || this.fire.pitAt(s.x, GROUND_Y - 60)) {
        this.rotHintShown = true;
        this.ui.hintRotate(!!this.touch);
      }
    }

    this.hintTimer += dt;
    if (this.hintTimer > 0.3) {
      this.hintTimer = 0;
      this.ui.setHint(this.currentHint());
      this.ui.pitInfo(this.pitInfoList());
      const b = this.state.bought;
      const helpers = [];
      if (b.ayudante) helpers.push({ id: 'ayudante', label: `🧑‍🌾 Ayudante ${b.ayudante > 1 ? `×${b.ayudante}` : ''}`, progress: this.helperTimers.ayudante });
      if (b.secadero) helpers.push({ id: 'secadero', label: '🧱 Secadero', progress: this.helperTimers.secadero });
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
        matches: this.state.res.fosforo,
        forecast: data.unlocked.clima ? this.weather.forecast : null,
        weatherOn: !!data.unlocked.clima,
        skyLabel: this.skyLabel,
        trip: this.trip ? { progress: this.trip.t / this.trip.dur } : null,
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
