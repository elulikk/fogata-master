// Ranuras magnéticas: siluetas, imán, encaje y guía de ángulo de la leña que se arrastra.
// La escena (scene.slotsCtl) lo llama en cada cuadro; la física de encaje vive en Fire.js y utils/slots.js.

import { W, GROUND_Y } from '../gfx/textures.js';
import { clamp } from '../utils/geom.js';
import { slotsFor, pickSlot, SNAP_R, SNAP_R_TOUCH } from '../utils/slots.js';

const SLOT_TINT = { base: 0xd9c6a0, stack: 0xe8b86a, bridge: 0xffa84d, tipi: 0x9fd8c8 };

export class SlotController {
  constructor(scene) {
    this.scene = scene;
    this.aimGfx = scene.add.graphics().setDepth(85).setBlendMode(Phaser.BlendModes.ADD);
    // siluetas de las ranuras magnéticas (pools de sprites; ver updateSlots)
    this.slotGhosts = [];
    this.slotHi = [];
    this.slotPins = [];
    this.slotShadows = [];
    this.outlineGfx = scene.add.graphics().setDepth(84.5);
    this.hoverGfx = scene.add.graphics().setDepth(86).setBlendMode(Phaser.BlendModes.ADD);
  }

  // Contorno claro de cada silueta: sobre la llama (H8) la silueta rellena se pierde, el borde no.
  drawOutlines(slots, best) {
    const g = this.outlineGfx;
    const pulse = 0.6 + 0.25 * Math.sin(this.scene.time.now / 220);
    for (const s of slots) {
      const hl = s.len / 2;
      const ht = s.th / 2;
      const c = Math.cos(s.angle);
      const sn = Math.sin(s.angle);
      const pts = [[-hl, -ht], [hl, -ht], [hl, ht], [-hl, ht]].map(([x, y]) => ({ x: s.x + x * c - y * sn, y: s.y + x * sn + y * c }));
      g.lineStyle(s === best ? 3 : 2, 0xfff6dc, s === best ? 0.95 : pulse * 0.8);
      g.strokePoints(pts, true);
    }
  }

  // Resalte de la leña bajo el mouse antes de agarrarla (no en touch ni mientras se arrastra).
  drawHover() {
    const sc = this.scene;
    const g = this.hoverGfx;
    g.clear();
    const l = sc.hoverLog;
    if (!l) return;
    if (sc.drag || sc.touch || l.dead || l.state === 'ceniza' || !l.sprite?.body || !sc.fx) { sc.hoverLog = null; return; }
    const a = l.sprite.rotation;
    const hl = l.length / 2 + 2;
    const ht = l.thickness / 2 + 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pts = [[-hl, -ht], [hl, -ht], [hl, ht], [-hl, ht]].map(([x, y]) => ({ x: l.x + x * c - y * s, y: l.y + x * s + y * c }));
    g.lineStyle(2, 0xfff0c0, 0.55 + 0.2 * Math.sin(sc.time.now / 160));
    g.strokePoints(pts, true);
  }

  // Ranuras magnéticas: mientras se arrastra leña sobre un pozo se calculan las ranuras libres y
  // habilitadas, se resalta la mejor dentro del radio magnético y se tira suave hacia ella.
  updateSlots() {
    const d = this.scene.drag;
    for (const q of this.scene.fire.pits) if (!d || q !== d.slotPit) q.slots = [];
    this.outlineGfx.clear();
    this.slotPoolTrim(this.slotGhosts, 0);
    this.slotPoolTrim(this.slotHi, 0);
    this.slotPoolTrim(this.slotPins, 0);
    if (!d) return;
    const l = d.log;
    const prevSlot = d.slot;
    d.slot = null;
    d.slotPit = null;
    const body = l.sprite?.body;
    if (!body || l.dead || l.wood.shape === 'cone') return;
    let pit = null;
    for (const q of this.scene.fire.pits) {
      if (Math.abs(l.x - q.x) < q.half + 50 && l.y > q.top - 80 && (!pit || Math.abs(l.x - q.x) < Math.abs(l.x - pit.x))) pit = q;
    }
    if (!pit || pit.loadRatio > 1.05) return; // pozo lleno: nada se ofrece, rige el desborde
    pit.slots = slotsFor(pit, l, GROUND_Y, this.scene.fire.slotted(pit, l));
    d.slotPit = pit;
    const radius = this.scene.touch ? SNAP_R_TOUCH : SNAP_R;
    d.slot = pickSlot(pit.slots, l.x, l.y, body.angle, d.aim != null, radius, prevSlot);
    // Pata inclinada sin ranura libre de su lado: se ofrece la del lado opuesto (ángulo espejado).
    d.mirror = false;
    d.tiltedAim = d.aim != null && Math.abs(Math.sin(body.angle)) > 0.35;
    if (!d.slot && d.tiltedAim) {
      const alt = pickSlot(pit.slots.filter((q) => q.kind === 'tipi'), l.x, l.y, -body.angle, true, radius, prevSlot);
      if (alt) { d.slot = alt; d.mirror = true; }
    }
    // Tirón suave del punto de agarre hacia la ranura resaltada.
    if (d.px != null) {
      const k = d.slot ? 0.4 : 0;
      d.c.pointA.x = clamp(d.px + (d.slot ? (d.slot.x - d.px) * k : 0), 10, W - 10);
      d.c.pointA.y = clamp(d.py + (d.slot ? (d.slot.y - d.py) * k : 0), -200, GROUND_Y + 30);
    }
    const pulse = 0.75 + 0.25 * Math.sin(this.scene.time.now / 140);
    let gi = 0;
    let pi = 0;
    for (const s of pit.slots) {
      const hi = s === d.slot;
      const sp = this.slotPoolGet(this.slotGhosts, gi++, 'slot-ghost', 84);
      sp.setPosition(s.x, s.y).setRotation(s.angle).setDisplaySize(s.len, s.th)
        .setTint(SLOT_TINT[s.kind] ?? 0xd9c6a0).setAlpha(hi ? 0.35 : 0.8);
      if (hi) {
        const h = this.slotPoolGet(this.slotHi, 0, 'slot-ghost-hi', 85);
        h.setPosition(s.x, s.y).setRotation(s.angle).setDisplaySize(s.len + 6, s.th + 6)
          .setAlpha(0.6 + 0.4 * pulse);
        // marcas de apoyo en los extremos de la pieza
        const hl = s.len / 2 - 4;
        for (const sg of [-1, 1]) {
          const pn = this.slotPoolGet(this.slotPins, pi++, 'slot-pin', 85);
          pn.setPosition(s.x + Math.cos(s.angle) * hl * sg, s.y + Math.sin(s.angle) * hl * sg + s.th / 2)
            .setTint(0xfff0c0).setAlpha(0.85 + 0.15 * pulse).setScale(1.1);
        }
      }
    }
    this.drawOutlines(pit.slots, d.slot);
    this.slotPoolTrim(this.slotGhosts, gi);
    this.slotPoolTrim(this.slotPins, pi);
    if (!d.slot) this.slotPoolTrim(this.slotHi, 0);
  }

  // Aviso corto sobre el pozo (tipi); con enfriamiento para que no repita en cada leña.
  tipiNotice(pit, text, color) {
    const now = this.scene.time.now;
    if (this.tipiNoticeT && now - this.tipiNoticeT < 2500) return;
    this.tipiNoticeT = now;
    this.scene.floatText(pit.x, GROUND_Y - 200, text, color, 1);
  }

  // Pool de sprites: se crean una vez y se ocultan al sobrar.
  slotPoolGet(pool, i, key, depth) {
    let s = pool[i];
    if (!s) {
      s = this.scene.add.image(0, 0, key).setDepth(depth);
      pool[i] = s;
    }
    return s.setVisible(true);
  }

  slotPoolTrim(pool, used) {
    for (let i = used; i < pool.length; i++) pool[i].setVisible(false);
  }

  // Sombra de contacto bajo cada leña encajada (debajo del sprite, así no tapa la llama).
  updateSlotShadows() {
    let n = 0;
    for (const l of this.scene.fire.logs) {
      if (!l.slot || l.dead || l.state === 'ceniza' || !l.sprite?.body) continue;
      const sh = this.slotPoolGet(this.slotShadows, n++, 'shadow-contact', 19);
      const a = l.sprite.rotation;
      const tilt = Math.abs(Math.sin(a)) > 0.5;
      sh.setPosition(l.x, l.y + l.thickness * 0.5 + 1).setRotation(tilt ? 0 : a)
        .setDisplaySize(tilt ? l.thickness * 1.6 : l.length * 0.95, Math.max(8, l.thickness * 0.5))
        .setAlpha(tilt ? 0.5 : 0.8);
    }
    this.slotPoolTrim(this.slotShadows, n);
  }

  // Imán audible: un tick al resaltar una ranura distinta. Histéresis temporal para que no repiquetee
  // si el resaltado salta entre dos ranuras vecinas.
  slotMagnetTick() {
    const s = this.scene.drag?.slot || null;
    if (s && s !== this.lastMagnetSlot && this.scene.time.now - (this.lastMagnetT || 0) > 180) {
      this.scene.audio.slotTick();
      this.lastMagnetT = this.scene.time.now;
    }
    this.lastMagnetSlot = s;
  }

  // Encaje: clac con tono creciente por pieza de la misma estructura, polvo y chispas en el contacto,
  // y un asentamiento visual (halo) cuando termina la animación de 150 ms. No toca el cuerpo físico.
  onSlotSnap({ log, pit, slot }) {
    const now = this.scene.time.now;
    const ch = pit.snapChain && now - pit.snapChain.t < 7000 ? pit.snapChain : (pit.snapChain = { n: 0, t: now });
    ch.t = now;
    this.scene.audio.snapClack(log.wood.weight, ch.n);
    ch.n++;
    if (!this.scene.fx) return;
    const k = this.scene.fire.fxScale;
    const heavy = log.wood.weight === 'heavy' ? 1.5 : log.wood.weight === 'medium' ? 1 : 0.7;
    const cx = slot.x;
    const cy = slot.y + slot.th / 2;
    this.scene.time.delayedCall(140, () => {
      if (!log.sprite?.active || !log.slot) return;
      this.scene.fire.ashDust.emitParticleAt(cx - slot.len * 0.3, cy, Math.max(1, Math.round(2 * heavy * k)));
      this.scene.fire.ashDust.emitParticleAt(cx + slot.len * 0.3, cy, Math.max(1, Math.round(2 * heavy * k)));
      this.scene.fire.sparkAt({ x: cx, y: cy }, 1 + Math.floor(Math.random() * 3));
      log.pop(0.4);
    });
  }

  // Guía de ángulo mientras se rota la leña agarrada: arco desde la horizontal, marcas en 45° y 60°.
  drawAimGhost() {
    const g = this.aimGfx;
    g.clear();
    const d = this.scene.drag;
    if (!this.scene.fx || !d || !d.lastRotT || !d.log.sprite?.body) return;
    const age = this.scene.time.now - d.lastRotT;
    if (age > 1400) return;
    const fade = Math.min(1, (1400 - age) / 500);
    const l = d.log;
    const cx = l.x;
    const cy = l.y;
    const R = Math.max(54, l.length * 0.55);
    // Ángulo de la leña plegado a [-90°, 90°] (una leña no tiene "cabeza").
    let a = Phaser.Math.Angle.Wrap(l.sprite.body.angle);
    if (a > Math.PI / 2) a -= Math.PI;
    if (a < -Math.PI / 2) a += Math.PI;
    const deg = Phaser.Math.RadToDeg(a);
    // Horizontal de referencia, muy tenue.
    g.lineStyle(1, 0xffe9b0, 0.18 * fade);
    g.lineBetween(cx - R, cy, cx + R, cy);
    // Marcas a 45° y 60° de la horizontal (a ambos lados); se encienden si estás cerca.
    for (const m of [45, 60]) {
      for (const sgn of [-1, 1]) {
        const r = Phaser.Math.DegToRad(m * sgn);
        const near = Math.abs(deg - m * sgn) < 4;
        g.lineStyle(near ? 3 : 2, near ? 0xffd36b : 0xffe9b0, (near ? 0.9 : 0.35) * fade);
        g.lineBetween(cx + Math.cos(r) * (R - 6), cy + Math.sin(r) * (R - 6), cx + Math.cos(r) * (R + 8), cy + Math.sin(r) * (R + 8));
      }
    }
    // Arco desde la horizontal hasta el ángulo actual.
    g.lineStyle(2, 0xffb347, 0.6 * fade);
    g.beginPath();
    g.arc(cx, cy, R, 0, a, a < 0);
    g.strokePath();
    // Eje de la leña, tenue.
    g.lineStyle(1, 0xffb347, 0.4 * fade);
    g.lineBetween(cx - Math.cos(a) * R, cy - Math.sin(a) * R, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
}
