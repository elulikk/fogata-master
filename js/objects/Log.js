// Una pieza de leña encajada en un lugar de la fogata. No tiene física: la coloca su lugar.
// Su comportamiento sale de los datos de la madera (ver data/woods.js).
// El estado de quemado (temperatura, combustible, llama) lo maneja Fire.js.

import { WOODS } from '../data/woods.js';

export class Log {
  constructor(scene, x, y, woodKey, angle = 0) {
    this.scene = scene;
    this.sprite = scene.add.image(x, y, `log-${woodKey}`);
    this.sprite.setRotation(angle);
    if (Math.random() < 0.5) this.sprite.setFlipX(true);

    this.glow = scene.add.image(x, y, 'log-glow-under')
      .setTintFill(0xff9a40)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.charImg = null;  // carbonizado y grietas (se crean al arder, ver Fire.syncLog)
    this.crackImg = null;
    this.glowColor = 0xff9a40;
    this.size = 1;
    this.setWood(woodKey);

    this.state = 'cruda'; // cruda → llama → brasas → ceniza
    this.temp = 0;
    this.moisture = this.wood.moisture;
    this.maxFuel = this.wood.fuel * (scene.state ? scene.state.mods.fuel : 1);
    this.fuel = this.maxFuel;
    this.flame = 0;
    this.glowLevel = 0;
    this.heatOut = 0;
    this.char = -1;
    this.choked = false;
    this.lowTime = 0;
    this.reTime = 0;
    this.drying = 0;
    this.pit = null;
    this.air = 1;
    this.phase = Math.random() * 10;
    this.acc = { flame: 0, smoke: 0, steam: 0 };
    this.slot = null;     // lugar de la fogata que ocupa (ver utils/slots.js)
    this.moveAnim = null; // viaje hacia su lugar (al encajar o al achicarse)
  }

  // Cambia de madera conservando el fuego: textura, tamaño de las capas y orden de dibujo (lo de adentro va adelante).
  setWood(key) {
    const wood = WOODS[key];
    this.key = key;
    this.wood = wood;
    this.cone = wood.shape === 'cone';
    this.sprite.setTexture(`log-${key}`);
    this.glowSX = this.cone ? 1 : wood.length / 128;
    this.glowSY = this.cone ? 1 : wood.thickness / 32;
    if (this.cone) this.glow.setTexture(`log-${key}`).setFlipX(this.sprite.flipX);
    const d = 20 + (2 - wood.tier) * 2;
    this.sprite.setDepth(d);
    this.charImg?.setDepth(d + 0.5);
    this.glow.setDepth(d + 1);
    this.crackImg?.setDepth(d + 1.5);
    this.setSize(this.size);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get length() { return this.wood.length * this.size; }
  get thickness() { return this.wood.thickness * this.size; }
  get area() { return this.length * this.thickness; }
  get burning() { return this.state === 'llama' || this.state === 'brasas'; }

  endpoints() {
    const r = this.sprite.rotation;
    const h = this.cone ? 0 : this.length / 2 - this.thickness / 2;
    const c = Math.cos(r) * h;
    const s = Math.sin(r) * h;
    return [this.x - c, this.y - s, this.x + c, this.y + s];
  }

  pointAlong(t) {
    const r = this.sprite.rotation;
    const d = (t - 0.5) * (this.cone ? 0.4 : 1) * this.length;
    return { x: this.x + Math.cos(r) * d, y: this.y + Math.sin(r) * d };
  }

  // Dónde va en su lugar: con el pie apoyado, aunque se haya achicado. La piña, sobre el piso.
  seatPose(slot = this.slot) {
    if (this.cone) return { x: slot.fx, y: slot.fy - 19, angle: 0 };
    const half = this.length / 2;
    return { x: slot.fx + slot.dx * half, y: slot.fy + slot.dy * half, angle: slot.angle };
  }

  seat() {
    if (!this.slot || this.moveAnim) return;
    const p = this.seatPose();
    this.sprite.setPosition(p.x, p.y).setRotation(p.angle);
  }

  setSize(s) {
    this.size = s;
    this.sprite.setScale(s);
    this.glow.setScale(this.glowSX * s, this.glowSY * s);
    this.charImg?.setScale(this.glowSX * s, this.glowSY * s);
    this.crackImg?.setScale(this.glowSX * s, this.glowSY * s);
    this.seat();
  }

  // Capas de leña prendida: carbonizado (normal) y grietas incandescentes (ADD). Solo para troncos.
  ensureOverlays() {
    if (this.cone || this.charImg) return;
    const sc = this.scene;
    const sx = this.glowSX * this.size, sy = this.glowSY * this.size;
    const d = this.sprite.depth;
    this.charImg = sc.add.image(this.x, this.y, 'log-char0').setScale(sx, sy).setDepth(d + 0.5).setAlpha(0);
    this.crackImg = sc.add.image(this.x, this.y, 'log-cracks').setScale(sx, sy).setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffa040).setAlpha(0).setDepth(d + 1.5).setFlipX(this.sprite.flipX);
  }

  syncGlow() {
    const x = this.sprite.x, y = this.sprite.y, r = this.sprite.rotation;
    this.glow.setPosition(x, y).setRotation(r);
    this.charImg?.setPosition(x, y).setRotation(r);
    this.crackImg?.setPosition(x, y).setRotation(r);
  }

  // Pop visual al encajar: un halo blanco que se expande.
  pop(strength = 1) {
    if (this.scene.fire && this.scene.fire.motion === false) return;
    const s = this.sprite;
    const halo = this.scene.add.image(s.x, s.y, s.texture.key)
      .setTintFill(0xffffff).setBlendMode(Phaser.BlendModes.ADD)
      .setRotation(s.rotation).setFlipX(s.flipX).setScale(this.size).setAlpha(0.55 * strength).setDepth(s.depth + 2);
    const tw = this.scene.tweens.add({
      targets: halo,
      alpha: 0,
      scaleX: this.size * 1.18,
      scaleY: this.size * 1.3,
      duration: 220,
      ease: 'quad.out',
      onUpdate: () => {
        // La leña pudo destruirse antes de terminar el halo.
        if (!s.active) { tw.remove(); halo.destroy(); return; }
        halo.setPosition(s.x, s.y).setRotation(s.rotation);
      },
      onComplete: () => halo.destroy(),
    });
  }

  destroy() {
    this.dead = true;
    if (this.slot) this.slot.log = null;
    this.slot = null;
    this.sprite.destroy();
    this.glow.destroy();
    this.charImg?.destroy();
    this.crackImg?.destroy();
  }
}
