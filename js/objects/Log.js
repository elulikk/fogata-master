// Leña que se puede agarrar, tirar y apilar.
// Su comportamiento sale de los datos de la madera (ver data/woods.js).
// El estado de quemado (temperatura, combustible, llama) lo maneja Fire.js.

import { WOODS } from '../data/woods.js';
import { WALL_CATEGORY } from './Pit.js';

// Categoría de las leñas encajadas en una ranura (estáticas): la leña agarrada las atraviesa.
export const SNAP_CATEGORY = 0x0008;

export class Log {
  constructor(scene, x, y, woodKey, angle = 0) {
    const wood = WOODS[woodKey];
    this.scene = scene;
    this.key = woodKey;
    this.wood = wood;

    const bodyOpts = {
      density: wood.density,
      friction: 0.7,
      frictionStatic: 1,
      restitution: 0.12,
      frictionAir: 0.012,
      label: 'log',
    };
    if (wood.shape === 'cone') bodyOpts.shape = { type: 'circle', radius: wood.length / 2 - 1 };
    else bodyOpts.chamfer = { radius: wood.thickness * 0.45 };

    this.sprite = scene.matter.add.image(x, y, `log-${woodKey}`, null, bodyOpts);
    this.sprite.setRotation(angle).setDepth(20);
    if (Math.random() < 0.5) this.sprite.setFlipX(true);
    this.sprite.logRef = this;

    this.glow = scene.add.image(x, y, `log-${woodKey}`)
      .setTintFill(0xff9a40)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(21)
      .setFlipX(this.sprite.flipX);
    this.glowColor = 0xff9a40;

    this.state = 'cruda'; // cruda → llama → brasas → ceniza
    this.temp = 0;
    this.moisture = wood.moisture;
    this.maxFuel = wood.fuel * (scene.state ? scene.state.mods.fuel : 1);
    this.fuel = this.maxFuel;
    this.flame = 0;
    this.glowLevel = 0;
    this.heatOut = 0;
    this.size = 1;
    this.char = -1;
    this.choked = false;
    this.lowTime = 0;
    this.reTime = 0;
    this.drying = 0;
    this.pit = null;
    this.air = 1;
    this.phase = Math.random() * 10;
    this.acc = { flame: 0, smoke: 0, steam: 0 };
    this.lastHit = 0;
    this.dragged = false;
    this.wallPass = false;
    this.overflow = false;
    this.overChecked = false;
    this.lastPit = null;
    this.offT = 0;       // segundos ardiendo en el suelo fuera de un pozo
    this.idleOut = 0;    // segundos quieta y cruda fuera de un pozo
    this.quench = false;
    this.releasedAt = 0;
    this.restEmitted = true;
    this.slot = null;       // ranura magnética en la que está encajada (ver utils/slots.js)
    this.snapping = false;  // true durante el tween de encaje
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get length() { return this.wood.length * this.size; }
  get thickness() { return this.wood.thickness * this.size; }
  get area() { return this.length * this.thickness; }
  get burning() { return this.state === 'llama' || this.state === 'brasas'; }

  endpoints() {
    const r = this.sprite.rotation;
    const h = this.wood.shape === 'cone' ? 0 : this.length / 2 - this.thickness / 2;
    const c = Math.cos(r) * h;
    const s = Math.sin(r) * h;
    return [this.x - c, this.y - s, this.x + c, this.y + s];
  }

  pointAlong(t) {
    const r = this.sprite.rotation;
    const d = (t - 0.5) * (this.wood.shape === 'cone' ? 0.4 : 1) * this.length;
    return { x: this.x + Math.cos(r) * d, y: this.y + Math.sin(r) * d };
  }

  setSize(s) {
    this.size = s;
    this.sprite.setScale(s);
    this.glow.setScale(s);
  }

  // La leña agarrada o rebotada atraviesa las paredes bajas del pozo.
  setWallPass(on) {
    this.wallPass = on;
    if (this.sprite.body) this.sprite.body.collisionFilter.mask = on ? (0xFFFFFFFF & ~(WALL_CATEGORY | SNAP_CATEGORY)) : 0xFFFFFFFF;
  }

  syncGlow() {
    this.glow.setPosition(this.sprite.x, this.sprite.y).setRotation(this.sprite.rotation);
  }

  // Pop visual al sacarla de la pila: un halo blanco que se expande (no toca el cuerpo físico).
  pop(strength = 1) {
    if (this.scene.fire && this.scene.fire.motion === false) return;
    const s = this.sprite;
    const halo = this.scene.add.image(s.x, s.y, s.texture.key)
      .setTintFill(0xffffff).setBlendMode(Phaser.BlendModes.ADD)
      .setRotation(s.rotation).setFlipX(s.flipX).setScale(this.size).setAlpha(0.55 * strength).setDepth(22);
    const tw = this.scene.tweens.add({
      targets: halo,
      alpha: 0,
      scaleX: this.size * 1.18,
      scaleY: this.size * 1.3,
      duration: 220,
      ease: 'quad.out',
      onUpdate: () => {
        // La leña pudo destruirse (ceniza, devuelta al estante) antes de terminar el halo.
        if (!s.active || !s.body) { tw.remove(); halo.destroy(); return; }
        halo.setPosition(s.x, s.y).setRotation(s.rotation);
      },
      onComplete: () => halo.destroy(),
    });
  }

  destroy() {
    this.dead = true;
    this.slot = null;
    this.sprite.destroy();
    this.glow.destroy();
  }
}
