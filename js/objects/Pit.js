// Un pozo de fogata: el anillo de piedras, el lecho de brasas y cenizas,
// la luz que irradia y (si se construyó) su techo.
// La geometría y la capacidad salen de data/sizes.js; la posición la reparte la escena (layoutPits).

import { GROUND_Y } from '../gfx/textures.js';
import { MAX_SIZE, capacityOf, sizeOf, hearthPerks } from '../data/sizes.js';
import { FLAMES } from '../data/flames.js';
import { LOOKS } from '../gfx/hearths.js';
import { CUT_ORDER } from '../data/woods.js';
import { buildSlots, nearestFree, BASE_PER_RING } from '../utils/slots.js';

export class Pit {
  constructor(scene, index, cfg = {}, x = 520) {
    this.scene = scene;
    this.index = index;
    this.x = x;
    this.size = Math.min(MAX_SIZE, Math.max(0, cfg.size | 0));
    this.roof = !!cfg.roof;

    this.bed = 0;       // lecho de brasas (0..1)
    this.ash = 0;
    this.load = 0;
    this.loadRatio = 0;
    this.air = 1;
    this.rain = 0;      // lluvia que le cae
    this.bellows = 0;
    this.intensity = 0;
    this.heat = 0;
    this.lightX = this.x;
    this.lightY = GROUND_Y - 60;
    this.burningLogs = 0;

    // Fogata armada (la revisa Fire): tipi cuando hay leña de los tres tamaños, si no ninguna.
    this.structure = { type: 'ninguna', quality: 0, stable: false, height: 0 };
    this.slotList = []; // lugares de la leña (ver utils/slots.js); se rehacen en build()
    this.structTarget = 0;
    this.structFormed = null;
    this.stableT = 0;
    this.sAir = 1;      // multiplicadores por estructura (Fire los aplica)
    this.sIgnite = 1;
    this.sFuel = 1;
    this.structureBonus = 0; // bonus de calor 0..STRUCTURE.calorCap (lo cobra GameState.rateBreakdown)

    this.stones = [];
    this.ashGfx = scene.add.graphics().setDepth(10);
    this.bedGlow = scene.add.image(this.x, GROUND_Y - 4, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff5a1a).setAlpha(0).setDepth(12);
    this.light = scene.add.image(this.x, GROUND_Y - 80, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(50);
    this.roofObjs = [];
    // Llama persistente y luz del mundo (las mueve Fire.update según la intensidad).
    this.flameBases = [];
    this.flameBase = null;
    this.groundGlow = scene.add.image(this.x, GROUND_Y + 4, 'glow-ground')
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8a40).setAlpha(0).setDepth(7);
    this.stoneGlow = scene.add.image(this.x, GROUND_Y - 6, 'glow-ground')
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff7a30).setAlpha(0).setDepth(31);
    this.treeGlow = scene.add.image(this.x, GROUND_Y - 150, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff6a20).setAlpha(0).setDepth(0.45);
    this.build();
    scene.events.on('postupdate', this.tick, this);
  }

  get spec() { return sizeOf(this.size); }
  get half() { return this.spec.half; }
  // Altura dibujada de la pared.
  get wallH() { return Math.round(this.spec.wallH * Pit.WALL_K); }
  get left() { return this.x - this.half; }
  get right() { return this.x + this.half; }
  get top() { return GROUND_Y - 230 - this.size * 28; }
  get bottom() { return GROUND_Y + 10; }
  get airSize() { return this.spec.air; }
  get hs() { return this.spec.hs; }

  // Área de leña que lo llena: todos sus lugares ocupados con piezas enteras (cartas de "Hueco" incluidas).
  get capacity() { return this.slotList.reduce((sum, s) => sum + s.len * s.th, 0); }

  // Lugares de más: dejan subir el tope de intensidad, si no sumar leña a un pozo a tope no rendiría.
  get roomy() { return Math.sqrt(this.slotList.length / (this.spec.tipis * CUT_ORDER.length * BASE_PER_RING)); }

  // Multiplicador de calor por tamaño, diluido si el pozo está casi vacío: 1 + (m-1)·clamp(carga / (umbral·capacidad
  // base), 0, 1); el umbral es 0,4 (Fogonero lo baja). m = mult/tipis, porque cada tipi de más ya suma su propio calor.
  // Usa la capacidad base: una carta de "Hueco" no tiene que pedir más leña para el mismo bonus.
  get calorMult() {
    const f = Math.min(1, Math.max(0, (this.load || 0) / capacityOf(this.size) / (this.scene.state?.mods.fillThreshold || 0.4)));
    return 1 + (this.spec.mult / this.spec.tipis - 1) * f;
  }

  contains(x, y) {
    return x > this.left && x < this.right && y > this.top && y < this.bottom;
  }

  build() {
    const scene = this.scene;
    for (const s of this.stones) s.destroy();
    this.stones = [];
    this.layoutSlots();

    // Todo lo que se ve sale del escalón: su dibujo (gfx/hearths.js) y su paleta de fuego (data/flames.js).
    const look = LOOKS[this.spec.look];
    const flame = FLAMES[this.spec.flame];
    this.perks = hearthPerks(this.size);
    this.flameKey = flame.baseKey;
    this.groundGlow.setTint(flame.ground);
    this.stoneGlow.setTint(flame.stone);
    this.treeGlow.setTint(flame.tree);
    this.bedGlow.setTint(flame.bed);
    if (flame.light) this.light.setTint(flame.light);
    else this.light.clearTint();

    const add = (img) => { this.stones.push(img); return img; };
    this.glows = [];
    this.smokeAt = look.smoke || null;
    // Lo construido, detrás del fuego.
    if (look.back) add(scene.add.image(this.x, GROUND_Y + 8, `hearth-${this.spec.id}`).setOrigin(0.5, 1).setDepth(8));
    // Lecho oscuro con grava bajo la leña y su borde de carga.
    add(scene.add.image(this.x, GROUND_Y + 2, 'pit-bed').setDisplaySize(this.half * 2, 30).setDepth(9));
    this.ring = add(scene.add.image(this.x, GROUND_Y + 4, 'bed-ring').setDisplaySize(this.half * 2.1, 26).setDepth(11).setAlpha(0.25));
    this.ghost = add(scene.add.image(this.x, GROUND_Y - (this.wallH * 2.2 + 40) / 2, 'pit-ghost')
      .setDisplaySize(this.half * 2, this.wallH * 2.2 + 40).setDepth(8.5).setAlpha(0).setTint(0xffc880));

    // Piedras grandes a los costados.
    if (look.sideStones) {
      const r = Math.min(26, 20 + this.size);
      for (const side of [-1, 1]) {
        const sx = this.x + side * (this.half + r - 6);
        add(scene.add.image(sx, GROUND_Y - r + 8, look.big).setDisplaySize(r * 2.8, r * 2).setDepth(22).setFlipX(side > 0));
        add(scene.add.image(sx + side * r * 1.4, GROUND_Y - 6, look.small).setDepth(22));
      }
    }
    const wh = this.wallH;
    // Paredes bajas y marcas de carga sobre ellas.
    // Móvil horizontal: paredes más discretas (translúcidas) para no tapar el mundo.
    const compact = !!window.matchMedia?.('(max-height: 520px), (max-width: 760px)').matches;
    const wallAlpha = compact ? 0.6 : 0.88;
    this.marks = [];
    for (const side of [-1, 1]) {
      const wx = this.x + side * (this.half - 5);
      add(scene.add.tileSprite(wx, GROUND_Y - wh / 2 + 2, 16, wh + 4, look.wall).setDepth(21).setAlpha(wallAlpha).setTint(0xe0d8d8));
      this.marks.push(add(scene.add.image(wx, GROUND_Y - wh - 8, 'load-notch').setDepth(31).setAlpha(0.5)));
    }
    // Brillos de la construcción: laten con el fuego.
    for (const g of look.glows || []) {
      this.glows.push(add(scene.add.image(this.x + g.x, GROUND_Y + 8 + g.y, 'glow').setScale(g.r)
        .setBlendMode(Phaser.BlendModes.ADD).setTint(g.tint).setAlpha(0).setDepth(8.2)));
    }
    // Labio de adelante (tapa la base de la leña).
    const n = Math.round((this.half * 2) / 26);
    for (let i = 0; i <= n; i++) {
      const sx = this.left - 6 + (i / n) * (this.half * 2 + 12);
      const key = look.lip[i % look.lip.length];
      const img = add(scene.add.image(sx, GROUND_Y + 6 + (i % 2) * 3, key).setDepth(30));
      if (look.lip.length === 1) img.setFlipX(i % 2 === 1).setScale(0.9 + 0.1 * (i % 3));
    }
    this.drawAsh();
    this.drawRoof();
    this.makeFlames();
  }

  // Rehace los lugares para la posición y el tamaño actuales; la leña que ya estaba sigue en su anillo.
  layoutSlots() {
    const logs = this.slotList.filter((s) => s.log).map((s) => s.log);
    this.slotList = buildSlots(this.x, this.half, this.spec.tipis, GROUND_Y, this.scene.state?.mods.extraSlots);
    for (const l of logs) {
      const old = l.slot;
      const slot = this.slotList.find((q) => !q.log && q.tier === old.tier && q.tipi === old.tipi && q.side === old.side)
        || nearestFree(this.slotList, old.tier, old.x, old.y);
      slot.log = l;
      l.slot = slot;
      l.moveAnim = null;
      l.seat();
      l.syncGlow();
    }
  }

  // Cuerpo de la llama: sprites con color pintado y mezcla NORMAL (no se queman a blanco al sumarse);
  // un pozo ancho reparte varios a lo largo del lecho. Detrás de la leña (depth 19).
  makeFlames() {
    for (const o of this.flameBases) o.destroy();
    this.flameBases = [];
    const nb = Math.max(1, Math.min(4, Math.round(this.half / 75)));
    for (let i = 0; i < nb; i++) {
      this.flameBases.push(this.scene.add.image(this.x, GROUND_Y - 20, this.flameKey).setOrigin(0.5, 0.94).setAlpha(0).setDepth(19));
    }
    this.flameBase = this.flameBases[0];
  }

  // Marca de carga: borde del lecho y muescas pasan de naranja a rojo con loadRatio; los brillos laten con el fuego.
  tick() {
    if (!this.ring || !this.ring.active) return;
    const q = Math.min(1.3, this.loadRatio || 0);
    const t = Math.min(1, Math.max(0, (q - 0.55) / 0.55));
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 170, 70), new Phaser.Display.Color(255, 40, 16), 100, t * 100);
    const tint = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    const pulse = q > 1 ? 0.7 + 0.3 * Math.sin(this.scene.time.now / 120) : 1;
    this.ring.setTint(tint).setAlpha((0.22 + 0.6 * Math.min(1, Math.max(0, (q - 0.4) / 0.7))) * pulse);
    for (const m of this.marks) m.setTint(tint).setAlpha((0.35 + 0.6 * t) * pulse);
    // Contorno del volumen: solo mientras se arrastra leña hacia este pozo.
    const sc = this.scene;
    const p = sc.input.activePointer;
    const near = !!sc.drag && Math.abs(p.worldX - this.x) < this.half + 60;
    this.ghost.setAlpha(this.ghost.alpha + ((near ? 0.55 : 0) - this.ghost.alpha) * 0.2);
    const fi = Math.min(1, this.intensity || 0);
    for (const g of this.glows) g.setAlpha(0.15 + 0.7 * fi);
    // Humo de la chimenea, tanto como fuego haya.
    if (this.smokeAt && !sc.paused && Math.random() < 0.12 * fi) {
      sc.fire.smoke.emitParticleAt(this.x + this.smokeAt.x + (Math.random() - 0.5) * 16, GROUND_Y + 8 + this.smokeAt.y);
    }
  }

  setSize(size) {
    this.size = Math.min(MAX_SIZE, Math.max(0, size | 0));
    this.build();
    this.scene.events.emit('pit:grow', { pit: this, size: this.size });
  }

  // Mueve el pozo (layoutPits): la leña se va con él, porque build() rehace sus lugares.
  setX(x) {
    const dx = x - this.x;
    if (Math.abs(dx) < 0.5) return;
    this.x = x;
    this.lightX += dx;
    this.bedGlow.setX(x);
    this.light.setX(x);
    this.build();
  }

  setRoof(on) {
    this.roof = on;
    this.drawRoof();
  }

  drawAsh() {
    const g = this.ashGfx;
    g.clear();
    if (this.ash <= 0.01) return;
    const w = Math.min(this.half * 1.9, 50 + this.ash * 140);
    const h = Math.min(26, 6 + this.ash * 16);
    g.fillStyle(0x3d3733, 1);
    g.fillEllipse(this.x, GROUND_Y, w, h);
    g.fillStyle(0x5c5550, 0.8);
    g.fillEllipse(this.x - w * 0.12, GROUND_Y - h * 0.18, w * 0.6, h * 0.55);
    this.drawnAsh = this.ash;
  }

  // Una construcción con chimenea ya está cubierta: el techo de paja no se dibuja aunque se haya comprado.
  // Techo proporcional al pozo: dos puntales finos y una cubierta de paja sobre una viga de tablas.
  // Un pozo chico queda bajo y angosto; uno grande sube con la pared y el ancho, sin tapar el cielo.
  drawRoof() {
    for (const o of this.roofObjs) o.destroy();
    this.roofObjs = [];
    if (!this.roof || this.perks.covered) return;
    const add = (o) => { this.roofObjs.push(o); return o; };
    const l = this.left - 14, r = this.right + 14;
    const top = GROUND_Y - (this.wallH + 115 + this.size * 9);
    const w = r - l + 44;
    for (const x of [l, r]) {
      add(this.scene.add.tileSprite(x, (top + GROUND_Y + 4) / 2, 10, GROUND_Y + 4 - top, 'roof-support').setDepth(21));
    }
    add(this.scene.add.tileSprite((l + r) / 2, top + 8, w, 18, 'roof-plank').setDepth(36));
    add(this.scene.add.tileSprite((l + r) / 2, top - 14, w + 10, 36, 'roof-thatch').setDepth(37));
  }

  get roofY() { return GROUND_Y - (this.wallH + 115 + this.size * 9); }

  destroy() {
    this.scene.events.off('postupdate', this.tick, this);
    for (const s of this.stones) s.destroy();
    this.ashGfx.destroy();
    this.bedGlow.destroy();
    this.light.destroy();
    for (const o of this.roofObjs) o.destroy();
    for (const o of [...this.flameBases, this.groundGlow, this.stoneGlow, this.treeGlow]) o.destroy();
  }
}

Pit.WALL_K = 1.5;
