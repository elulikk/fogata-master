// Un pozo de fogata: el anillo de piedras, el lecho de brasas y cenizas,
// la luz que irradia y (si se construyó) su techo.
// La geometría y la capacidad salen de data/sizes.js; la posición la reparte la escena (layoutPits).

import { GROUND_Y } from '../gfx/textures.js';
import { BASE_CAPACITY, MAX_SIZE, STRUCTURE, sizeOf } from '../data/sizes.js';

// Categoría de colisión de las paredes del pozo: la leña agarrada (o rebotada) las atraviesa.
export const WALL_CATEGORY = 0x0004;

// [estilo de piedra, textura de pared] por tamaño (0-1 anillo, 2-3 trabajada, 4-5 adobe, 6-7 ceremonial).
const TIERS = [['stone', 'wall-stone'], ['stone', 'wall-stone'], ['hewn', 'wall-stone'], ['hewn', 'wall-stone'],
  ['adobe', 'wall-adobe'], ['adobe', 'wall-adobe'], ['ritual', 'wall-ritual'], ['ritual', 'wall-ritual']];

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
    this.oxygen = 1;
    this.air = 1;
    this.rain = 0;      // lluvia que le cae
    this.bellows = 0;
    this.intensity = 0;
    this.heat = 0;
    this.lightX = this.x;
    this.lightY = GROUND_Y - 60;
    this.burningLogs = 0;

    // Estructura de la leña apilada (la detecta Fire): tipi, cabana, monton o ninguna.
    this.structure = { type: 'ninguna', quality: 0, stable: false, height: 0 };
    this.slots = []; // ranuras magnéticas libres (solo se calculan mientras se arrastra leña sobre el pozo)
    this.structTarget = 0;
    this.structFormed = null;
    this.stableT = 0;
    this.sAir = 1;      // multiplicadores por estructura (Fire los aplica)
    this.sIgnite = 1;
    this.sFuel = 1;
    this.structureBonus = 0; // bonus de calor 0..STRUCTURE.calorCap (lo cobra GameState.rateBreakdown)

    this.stones = [];
    this.bodies = [];
    this.walls = [];
    this.ashGfx = scene.add.graphics().setDepth(10);
    this.bedGlow = scene.add.image(this.x, GROUND_Y - 4, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff5a1a).setAlpha(0).setDepth(12);
    this.light = scene.add.image(this.x, GROUND_Y - 80, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(50);
    this.roofGfx = scene.add.graphics().setDepth(36);
    this.build();
    scene.events.on('postupdate', this.tick, this);
  }

  get spec() { return sizeOf(this.size); }
  get half() { return this.spec.half; }
  // Altura física Y dibujada de la pared: un pozo con paredes más altas contiene más leña apilada.
  get wallH() { return Math.round(this.spec.wallH * Pit.WALL_K); }
  get left() { return this.x - this.half; }
  get right() { return this.x + this.half; }
  get top() { return GROUND_Y - 230 - this.size * 28; }
  get bottom() { return GROUND_Y + 10; }
  get airSize() { return this.spec.air; }
  get hs() { return this.spec.hs; }

  get capacity() {
    const s = this.structure;
    const cabin = s.type === 'cabana' ? 1 + STRUCTURE.cabana.capacity * s.quality : 1;
    return BASE_CAPACITY * this.spec.cap * (this.scene.state?.mods.capacity || 1) * cabin;
  }

  // Multiplicador de calor por tamaño, diluido si el pozo está casi vacío:
  // 1 + (mult-1)·clamp(carga / (umbral·capacidad), 0, 1); el umbral es 0,4 (Fogonero lo baja).
  get calorMult() {
    const f = Math.min(1, Math.max(0, (this.loadRatio || 0) / (this.scene.state?.mods.fillThreshold || 0.4)));
    return 1 + (this.spec.mult - 1) * f;
  }

  contains(x, y) {
    return x > this.left && x < this.right && y > this.top && y < this.bottom;
  }

  build() {
    const scene = this.scene;
    for (const s of this.stones) s.destroy();
    for (const b of this.bodies) scene.matter.world.remove(b);
    this.stones = [];
    this.bodies = [];
    this.walls = [];

    // Tier visual: 0-1 anillo de piedras, 2-3 piedra trabajada, 4-5 adobe, 6-7 ceremonial.
    const [style, wallKey] = TIERS[this.size];
    const big = style === 'stone' ? 'stone0' : `${style}0`;
    const add = (img) => { this.stones.push(img); return img; };
    this.runes = [];
    // Lecho oscuro con grava bajo la leña y su borde de carga.
    add(scene.add.image(this.x, GROUND_Y + 2, 'pit-bed').setDisplaySize(this.half * 2, 30).setDepth(9));
    this.ring = add(scene.add.image(this.x, GROUND_Y + 4, 'bed-ring').setDisplaySize(this.half * 2.1, 26).setDepth(11).setAlpha(0.25));
    this.ghost = add(scene.add.image(this.x, GROUND_Y - (this.wallH * 2.2 + 40) / 2, 'pit-ghost')
      .setDisplaySize(this.half * 2, this.wallH * 2.2 + 40).setDepth(8).setAlpha(0).setTint(0xffc880));

    // Piedras grandes a los costados (físicas: la leña rebota contra ellas).
    const r = Math.min(26, 20 + this.size);
    for (const side of [-1, 1]) {
      const sx = this.x + side * (this.half + r - 6);
      const body = scene.matter.add.circle(sx, GROUND_Y - r + 6, r, { isStatic: true, label: 'stone', friction: 0.9 });
      this.bodies.push(body);
      add(scene.add.image(sx, GROUND_Y - r + 8, big).setDisplaySize(r * 2.8, r * 2).setDepth(22).setFlipX(side > 0));
      add(scene.add.image(sx + side * r * 1.4, GROUND_Y - 6, style === 'stone' ? 'stone2' : `${style}1`).setDepth(22));
    }
    // Paredes bajas del pozo: contienen la leña. Atravesables mientras se agarra (WALL_CATEGORY).
    const wh = this.wallH;
    for (const side of [-1, 1]) {
      const wx = this.x + side * (this.half - 5);
      const wall = scene.matter.add.rectangle(wx, GROUND_Y - wh / 2, 14, wh, {
        isStatic: true, label: 'wall-pit', friction: 0.9,
        collisionFilter: { category: WALL_CATEGORY, mask: 0xFFFFFFFF, group: 0 },
      });
      this.bodies.push(wall);
      this.walls.push(wall);
    }
    // Dibujo de las paredes (piedra / adobe / ritual según tier) y marcas de carga sobre ellas.
    // Móvil horizontal: paredes y postes más discretos (translúcidos y bajos) para no tapar el mundo.
    const compact = !!window.matchMedia?.('(max-height: 520px), (max-width: 760px)').matches;
    const wallAlpha = compact ? 0.6 : 0.88;
    const ps = compact ? 0.5 : 0.78;      // escala de los postes
    this.marks = [];
    for (const side of [-1, 1]) {
      const wx = this.x + side * (this.half - 5);
      add(scene.add.tileSprite(wx, GROUND_Y - wh / 2 + 2, 16, wh + 4, wallKey).setDepth(21).setAlpha(wallAlpha).setTint(0xe0d8d8));
      this.marks.push(add(scene.add.image(wx, GROUND_Y - wh - 8, 'load-mark').setDepth(31).setAlpha(0.5)));
      if (this.size >= 6) {
        const px = this.x + side * (this.half + 38);
        add(scene.add.image(px, GROUND_Y + 4 - 75 * ps, 'post').setScale(ps).setDepth(21).setAlpha(compact ? 0.7 : 1));
        this.runes.push(add(scene.add.image(px, GROUND_Y + 4 - 116 * ps, 'rune-glow').setScale(ps).setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0xff9a40).setAlpha(0.2).setDepth(24)));
      }
    }
    // Labio de piedras adelante (tapa la base de la leña).
    const n = Math.round((this.half * 2) / 26);
    for (let i = 0; i <= n; i++) {
      const sx = this.left - 6 + (i / n) * (this.half * 2 + 12);
      const key = style === 'stone' ? `stone${2 + (i % 2)}` : `${style}1`;
      const img = add(scene.add.image(sx, GROUND_Y + 6 + (i % 2) * 3, key).setDepth(30));
      if (style !== 'stone') img.setFlipX(i % 2 === 1).setScale(0.9 + 0.1 * (i % 3));
    }
    this.drawAsh();
    this.drawRoof();
  }

  // Marca de carga: borde del lecho y muescas pasan de naranja a rojo con loadRatio; runas laten con el fuego.
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
    for (const r of this.runes) r.setAlpha(0.15 + 0.6 * Math.min(1, this.intensity || 0));
  }

  setSize(size) {
    this.size = Math.min(MAX_SIZE, Math.max(0, size | 0));
    this.scene.fire?.releaseSlots(this); // la geometría cambia: la leña encajada vuelve a la física
    this.build();
    this.scene.events.emit('pit:grow', { pit: this, size: this.size });
  }

  // Mueve el pozo (layoutPits): arrastra con él la leña que tiene adentro.
  setX(x) {
    const dx = x - this.x;
    if (Math.abs(dx) < 0.5) return;
    for (const l of this.scene.fire.logs) {
      if (l.pit !== this || !l.sprite.body) continue;
      l.sprite.setPosition(l.x + dx, l.y);
      l.syncGlow();
    }
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

  drawRoof() {
    const g = this.roofGfx;
    g.clear();
    if (!this.roof) return;
    const l = this.left - 40;
    const r = this.right + 40;
    const top = this.top - 70;
    g.fillStyle(0x3a2716, 1);
    g.fillRect(l - 5, top, 10, GROUND_Y - top);
    g.fillRect(r - 5, top + 24, 10, GROUND_Y - top - 24);
    // Chapa inclinada.
    g.fillStyle(0x4d4a48, 1);
    g.beginPath();
    g.moveTo(l - 30, top - 8);
    g.lineTo(r + 30, top + 18);
    g.lineTo(r + 30, top + 30);
    g.lineTo(l - 30, top + 4);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x6d6966, 0.8);
    for (let x = l - 20; x < r + 30; x += 18) {
      const t = (x - (l - 30)) / (r - l + 60);
      g.lineBetween(x, top - 8 + t * 26, x, top + 4 + t * 26);
    }
  }

  get roofY() { return this.top - 60; }

  destroy() {
    this.scene.events.off('postupdate', this.tick, this);
    for (const s of this.stones) s.destroy();
    for (const b of this.bodies) this.scene.matter.world.remove(b);
    this.ashGfx.destroy();
    this.bedGlow.destroy();
    this.light.destroy();
    this.roofGfx.destroy();
  }
}

Pit.WALL_K = 1.5;
