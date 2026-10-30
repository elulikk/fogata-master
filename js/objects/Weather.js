// El clima: lluvia, viento y tormentas que aparecen de a poco.
// Siempre avisa antes (pronóstico) para que puedas prepararte.

import { W, H } from '../gfx/textures.js';

const rand = (a, b) => a + Math.random() * (b - a);

export const WEATHER_INFO = {
  lluvia: { icon: '🌧️', name: 'Lluvia' },
  viento: { icon: '🌬️', name: 'Viento' },
  tormenta: { icon: '⛈️', name: 'Tormenta' },
};

export class Weather {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.rain = 0;
    this.wind = 0;
    this.target = { rain: 0, wind: 0 };
    this.phase = 'calma';
    this.timer = 20;
    this.event = null;
    this.flash = 0;

    this.drops = scene.add.particles(0, 0, 'drop', {
      emitting: false,
      lifespan: 820,
      speedY: { min: 820, max: 980 },
      speedX: { min: -80, max: -30 },
      alpha: { start: 0.55, end: 0.3 },
      scaleY: { min: 0.8, max: 1.4 },
    }).setDepth(48);
    this.clouds = scene.add.rectangle(0, 0, W, H, 0x05070c).setOrigin(0).setAlpha(0).setDepth(56);
    this.lightning = scene.add.rectangle(0, 0, W, H, 0xdfe8ff).setOrigin(0).setAlpha(0).setDepth(57)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  // Elegir el próximo evento según lo que ya está desbloqueado.
  pickEvent(unlocked, progress) {
    const kinds = ['lluvia'];
    if (unlocked.viento) kinds.push('viento');
    if (unlocked.tormentas) kinds.push('tormenta', 'lluvia');
    const kind = kinds[(Math.random() * kinds.length) | 0];
    const hard = Math.min(0.3, progress * 0.05);
    if (kind === 'lluvia') return { kind, rain: rand(0.35, 0.8) + hard, wind: 0, duration: rand(25, 45) };
    if (kind === 'viento') return { kind, rain: 0, wind: rand(0.5, 1), duration: rand(25, 40) };
    return { kind, rain: 1, wind: rand(0.5, 0.9), duration: rand(30, 50) };
  }

  update(dt, unlocked, progress) {
    if (!unlocked.clima) {
      this.target.rain = 0;
      this.target.wind = 0;
    } else {
      this.timer -= dt;
      if (this.phase === 'calma' && this.timer <= 0) {
        this.event = this.pickEvent(unlocked, progress);
        this.phase = 'aviso';
        this.timer = 15;
      } else if (this.phase === 'aviso' && this.timer <= 0) {
        this.phase = 'activo';
        this.timer = this.event.duration;
        this.target.rain = this.event.rain;
        this.target.wind = this.event.wind;
      } else if (this.phase === 'activo' && this.timer <= 0) {
        this.phase = 'calma';
        this.timer = rand(70, 130) / (1 + progress * 0.08);
        this.target.rain = 0;
        this.target.wind = 0;
      }
    }

    this.rain += Math.sign(this.target.rain - this.rain) * Math.min(Math.abs(this.target.rain - this.rain), dt * 0.25);
    this.wind += Math.sign(this.target.wind - this.wind) * Math.min(Math.abs(this.target.wind - this.wind), dt * 0.3);

    // Gotas.
    const count = this.rain * dt * 650;
    let whole = Math.floor(count);
    if (Math.random() < count - whole) whole++;
    for (let i = 0; i < whole; i++) this.drops.emitParticleAt(rand(-40, W + 120), rand(-30, -10));
    this.clouds.setAlpha(this.rain * 0.32 + this.wind * 0.05);

    // Relámpagos en tormenta.
    if (this.event?.kind === 'tormenta' && this.phase === 'activo' && Math.random() < dt * 0.12) {
      this.flash = 1;
      this.scene.time.delayedCall(rand(200, 1200), () => this.audio.thunder());
    }
    this.flash = Math.max(0, this.flash - dt * 4);
    this.lightning.setAlpha(this.flash * 0.35 * (Math.random() < 0.7 ? 1 : 0.4));

    this.audio.setWeather(this.rain, this.wind);
  }

  get forecast() {
    if (this.phase === 'calma' || !this.event) return null;
    return { phase: this.phase, kind: this.event.kind, timer: Math.max(0, this.timer) };
  }
}
