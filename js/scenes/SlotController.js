// Lugares de la fogata mientras se arrastra leña: siluetas de los libres, el elegido resaltado,
// y los efectos de encajar. La escena (scene.slotsCtl) lo llama en cada cuadro.

import { nearestFree, TIER_TINT } from '../utils/slots.js';

export class SlotController {
  constructor(scene) {
    this.scene = scene;
    // siluetas de los lugares (pools de sprites)
    this.slotGhosts = [];
    this.slotHi = [];
    this.slotShadows = [];
    this.outlineGfx = scene.add.graphics().setDepth(84.5);
    this.hoverGfx = scene.add.graphics().setDepth(86).setBlendMode(Phaser.BlendModes.ADD);
  }

  // Contorno claro de cada silueta: sobre la llama la silueta rellena se pierde, el borde no.
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
    if (sc.drag || sc.touch || l.dead || l.state !== 'cruda' || !sc.fx) { sc.hoverLog = null; return; }
    const a = l.sprite.rotation;
    const hl = l.length / 2 + 2;
    const ht = l.thickness / 2 + 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pts = [[-hl, -ht], [hl, -ht], [hl, ht], [-hl, ht]].map(([x, y]) => ({ x: l.x + x * c - y * s, y: l.y + x * s + y * c }));
    g.lineStyle(2, 0xfff0c0, 0.55 + 0.2 * Math.sin(sc.time.now / 160));
    g.strokePoints(pts, true);
  }

  // Elige el pozo y el lugar para la leña que se arrastra: el pozo más cercano al puntero y,
  // dentro de él, el lugar libre de su tamaño más cercano. Muestra las siluetas de los libres.
  updateSlots() {
    const sc = this.scene;
    const d = sc.drag;
    this.outlineGfx.clear();
    if (!d) {
      this.slotPoolTrim(this.slotGhosts, 0);
      this.slotPoolTrim(this.slotHi, 0);
      return;
    }
    let pit = null;
    for (const q of sc.fire.pits) {
      if (Math.abs(d.px - q.x) < q.half + 70 && d.py > q.top - 80 && (!pit || Math.abs(d.px - q.x) < Math.abs(d.px - pit.x))) pit = q;
    }
    d.pit = pit;
    d.slot = pit ? nearestFree(pit.slotList, d.tier, d.px, d.py) : null;
    // Con un pozo a tiro se muestran sus lugares; sin ninguno, los de todos para decir adónde llevarla.
    const free = (pit ? [pit] : sc.fire.pits).flatMap((q) => q.slotList.filter((s) => s.tier === d.tier && !s.log));
    let gi = 0;
    const pulse = 0.75 + 0.25 * Math.sin(sc.time.now / 140);
    for (const s of free) {
      const hi = s === d.slot;
      this.slotPoolGet(this.slotGhosts, gi++, 'slot-ghost', 84)
        .setPosition(s.x, s.y).setRotation(s.angle).setDisplaySize(s.len, s.th)
        .setTint(TIER_TINT[s.tier]).setAlpha(hi ? 0.35 : 0.8);
      if (hi) {
        this.slotPoolGet(this.slotHi, 0, 'slot-ghost-hi', 85)
          .setPosition(s.x, s.y).setRotation(s.angle).setDisplaySize(s.len + 6, s.th + 6)
          .setAlpha(0.6 + 0.4 * pulse);
      }
    }
    this.drawOutlines(free, d.slot);
    this.slotPoolTrim(this.slotGhosts, gi);
    if (!d.slot) this.slotPoolTrim(this.slotHi, 0);
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

  // Sombra de contacto al pie de cada leña (debajo del sprite, así no tapa la llama).
  updateSlotShadows() {
    let n = 0;
    for (const l of this.scene.fire.logs) {
      if (!l.slot || l.dead || l.state === 'ceniza') continue;
      this.slotPoolGet(this.slotShadows, n++, 'shadow-contact', 19)
        .setPosition(l.slot.fx, l.slot.fy - 3).setRotation(0)
        .setDisplaySize(l.thickness * 1.6, Math.max(8, l.thickness * 0.5))
        .setAlpha(0.5);
    }
    this.slotPoolTrim(this.slotShadows, n);
  }

  // Imán audible: un tick al resaltar un lugar distinto. Histéresis temporal para que no repiquetee
  // si el resaltado salta entre dos lugares vecinos.
  slotMagnetTick() {
    const s = this.scene.drag?.slot || null;
    if (s && s !== this.lastMagnetSlot && this.scene.time.now - (this.lastMagnetT || 0) > 180) {
      this.scene.audio.slotTick();
      this.lastMagnetT = this.scene.time.now;
    }
    this.lastMagnetSlot = s;
  }

  // Encaje: clac con tono creciente por pieza seguida, polvo y chispas al pie de la pata.
  onSlotSnap({ log, pit, slot }) {
    const now = this.scene.time.now;
    const ch = pit.snapChain && now - pit.snapChain.t < 7000 ? pit.snapChain : (pit.snapChain = { n: 0, t: now });
    ch.t = now;
    this.scene.audio.snapClack(log.wood.weight, ch.n);
    ch.n++;
    if (!this.scene.fx) return;
    const k = this.scene.fire.fxScale;
    const heavy = log.wood.weight === 'heavy' ? 1.5 : log.wood.weight === 'medium' ? 1 : 0.7;
    this.scene.time.delayedCall(140, () => {
      if (!log.sprite?.active || !log.slot) return;
      this.scene.fire.ashDust.emitParticleAt(slot.fx, slot.fy - 4, Math.max(1, Math.round(4 * heavy * k)));
      this.scene.fire.sparkAt({ x: slot.fx, y: slot.fy - 6 }, 1 + Math.floor(Math.random() * 3));
      log.pop(0.4);
    });
  }
}
