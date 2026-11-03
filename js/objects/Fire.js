// El fuego: maneja todas las leñas y los pozos de fogata.
// Cada leña recibe el calor de todo lo que arde en su pozo (no importa dónde esté), se calienta,
// se seca si está húmeda, prende, arde, queda en brasas y termina en ceniza.
// La leña ocupa lugares fijos de cada pozo y se va achicando de anillo en anillo.

import { pointSegDist, lerpColor, clamp } from '../utils/geom.js';
import { GROUND_Y } from '../gfx/textures.js';
import { STRUCTURE } from '../data/sizes.js';
import { FLAMES } from '../data/flames.js';
import { slotStructure, lowerFree } from '../utils/slots.js';

const HEAT_SHARE = 1.6;        // cuánto del calor del pozo le llega a cada leña
const STRUCT_STEP = 0.25;      // la estructura se revisa a 4 Hz
const SHRINK_AT = 0.5;         // fracción de combustible a la que una pieza pasa al tamaño de abajo

export class Fire {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.logs = [];
    this.pits = [];
    this.sources = [];      // fósforos y chispas de pedernal
    this.intensity = 0;
    this.everLit = false;
    this.time = 0;
    this.budget = 1;
    this.motion = true;     // false = movimiento reducido: efectos atenuados
    this.cold = 0;          // 0..1, frío de la noche: baja un poco la luz
    // Fogata pico: intensidad alta sostenida -> onPeak({ pit, intensity }). El bonus lo aplica la escena.
    this.peak = { thresh: 1.0, hold: 5, cooldown: 120, t: 0, cd: 60 };
    this.peakProgress = 0;  // 0..1 hacia el próximo pico (para la UI)
    this.peakGfx = scene.add.graphics().setDepth(41).setBlendMode(Phaser.BlendModes.ADD);
    this.stats = { llama: 0, brasas: 0, hiss: 0 };

    // Callbacks que usa la escena.
    this.onIgnite = null;
    this.onCrackle = null;
    this.onDryStart = null;
    this.onPeak = null;

    this.createEmitters();
  }

  get mods() { return this.scene.state.mods; }

  createEmitters() {
    // Llamas: lenguas afiladas (flame-a/b/c, 48×120) que suben y se afinan; el color pasa de crema a rojo
    // oscuro con la vida. Dos texturas por tamaño dan variedad de curva; flameCore es el núcleo claro.
    this.flameSets = {};
    const set = this.flameSetOf('fuego');
    this.flames = { S: set.S, M: set.M, L: set.L };
    this.flamesAlt = { S: null, M: set.altM, L: set.altL };
    this.flameCore = set.core;
    this.createEffects();
  }

  // Un juego de emisores por paleta de fuego (data/flames.js); se crea la primera vez que hace falta.
  flameSetOf(id) {
    if (this.flameSets[id]) return this.flameSets[id];
    const s = this.scene;
    const color = FLAMES[id].particles;
    const flame = (tex, scale, life, speed, alpha = 0.27, depth = 19.5) => s.add.particles(0, 0, tex, {
      emitting: false,
      lifespan: { min: life * 0.6, max: life },
      speedX: { min: -12, max: 12 },
      speedY: { min: -speed, max: -speed * 0.55 },
      accelerationY: -50,
      rotate: { min: -7, max: 7 },
      scaleX: { start: scale * 1.1, end: scale * 0.25 },
      scaleY: { start: scale, end: scale * 0.55 },
      alpha: { start: alpha, end: 0 },
      color,
      colorEase: 'quad.out',
      blendMode: 'ADD',
    }).setDepth(depth);
    return (this.flameSets[id] = {
      S: flame('flame-lick', 0.9, 650, 100, 0.27, 40),
      M: flame('flame-b', 0.75, 800, 120),
      L: flame('flame-a', 0.95, 950, 140),
      altM: flame('flame-c', 0.75, 800, 120),
      altL: flame('flame-c', 0.95, 950, 140),
      core: flame('flame-core', 0.55, 520, 90, 0.18, 40),
    });
  }

  flameSet(pit) {
    return this.flameSetOf(pit?.spec.flame || 'fuego');
  }

  createEffects() {
    const s = this.scene;
    // Chispas alargadas: la punta brillante apunta en el sentido de la velocidad.
    const streak = {
      onEmit: () => 0,
      onUpdate: (p) => Phaser.Math.RadToDeg(Math.atan2(-p.velocityX, p.velocityY)),
    };
    this.sparks = s.add.particles(0, 0, 'spark-streak', {
      emitting: false,
      lifespan: { min: 500, max: 1500 },
      speed: { min: 60, max: 260 },
      angle: { min: -125, max: -55 },
      gravityY: 170,
      rotate: streak,
      scale: { start: 0.9, end: 0.1 },
      color: [0xffffe0, 0xffc040, 0xff5010],
      blendMode: 'ADD',
    }).setDepth(42);
    this.smoke = s.add.particles(0, 0, 'smoke', {
      emitting: false,
      lifespan: { min: 2200, max: 3400 },
      speedX: { min: -12, max: 12 },
      speedY: { min: -65, max: -30 },
      gravityX: 6,
      rotate: { min: 0, max: 360 },
      scale: { start: 0.4, end: 2.2 },
      alpha: { start: 0.3, end: 0 },
      color: [0x9a8f86, 0x4a4440],
    }).setDepth(45);
    this.smokeHeavy = s.add.particles(0, 0, 'smoke', {
      emitting: false,
      lifespan: { min: 2600, max: 4000 },
      speedX: { min: -14, max: 14 },
      speedY: { min: -55, max: -25 },
      rotate: { min: 0, max: 360 },
      scale: { start: 0.6, end: 2.8 },
      alpha: { start: 0.42, end: 0 },
      color: [0x77736f, 0x2e2c2b],
    }).setDepth(45);
    this.steam = s.add.particles(0, 0, 'smoke', {
      emitting: false,
      lifespan: { min: 900, max: 1500 },
      speedX: { min: -20, max: 20 },
      speedY: { min: -90, max: -50 },
      scale: { start: 0.25, end: 1.1 },
      alpha: { start: 0.4, end: 0 },
      color: [0xf0f2f8, 0xc0c4cc],
    }).setDepth(45);
    this.ashDust = s.add.particles(0, 0, 'spark', {
      emitting: false,
      lifespan: { min: 800, max: 1600 },
      speedX: { min: -30, max: 30 },
      speedY: { min: -60, max: -15 },
      gravityY: 40,
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.8, end: 0 },
      color: [0xb0a8a0, 0x605850],
    }).setDepth(41);
    // Anillo de chispas al caer leña en el pozo.
    this.ring = s.add.particles(0, 0, 'spark-streak', {
      emitting: false,
      lifespan: { min: 300, max: 600 },
      speed: { min: 90, max: 230 },
      angle: { min: -172, max: -8 },
      gravityY: 380,
      rotate: streak,
      scale: { start: 0.8, end: 0.1 },
      color: [0xffffe0, 0xffc040, 0xff7020],
      blendMode: 'ADD',
    }).setDepth(42);
    // Brasas que suben lento (prestigio).
    this.rise = s.add.particles(0, 0, 'spark', {
      emitting: false,
      lifespan: { min: 2200, max: 4200 },
      speedX: { min: -25, max: 25 },
      speedY: { min: -140, max: -50 },
      accelerationY: -10,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      color: [0xffffe0, 0xffc040, 0xff5010],
      blendMode: 'ADD',
    }).setDepth(43);
    this.air = s.add.particles(0, 0, 'smoke', {
      emitting: false,
      lifespan: { min: 300, max: 550 },
      speedX: { min: -380, max: -240 },
      speedY: { min: -40, max: 10 },
      scale: { start: 0.2, end: 0.9 },
      alpha: { start: 0.14, end: 0 },
    }).setDepth(44);
  }

  addPit(pit) { this.pits.push(pit); }
  addLog(log) { this.logs.push(log); }

  pitAt(x, y) {
    for (const p of this.pits) if (p.contains(x, y)) return p;
    return null;
  }

  nearestPit(x) {
    let best = null;
    let bd = Infinity;
    for (const p of this.pits) {
      const d = Math.abs(p.x - x);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  get isOut() {
    if (this.sources.length) return false;
    for (const l of this.logs) if (l.burning) return false;
    for (const p of this.pits) if (p.bed > 0.08) return false;
    return true;
  }

  pitIsLit(pit) {
    if (pit.bed > 0.08) return true;
    return this.logs.some((l) => l.pit === pit && l.burning);
  }

  // Fósforo o pedernal: una fuente de calor corta en un punto.
  strike(x, y, heat, ttl, r = 55) {
    this.sources.push({ x, y, heat, ttl, r, acc: 0 });
  }

  // ¿Alcanza ese calor para prender esta leña sin nada más? La húmeda se deja probar: primero se seca.
  canLight(l, heat, ttl) {
    const w = l.wood;
    if (l.moisture > 0) return true;
    const warm = w.warm * this.mods.warm * (l.pit ? (1 + 0.05 * l.pit.size) / l.pit.sIgnite : 1);
    return l.temp + (heat - l.temp) * (1 - Math.exp(-ttl / warm)) >= w.ignite * this.mods.ignite;
  }

  // Qué tan cerca está de prender (0..1): cada tamaño tiene su umbral, y la humedad frena en un valor bajo.
  warmth(l) {
    return l.moisture > 0 ? l.temp : Math.min(1, l.temp / (l.wood.ignite * this.mods.ignite));
  }

  pump(pit) {
    pit.bellows = Math.min(1.3, pit.bellows + 0.55 * this.mods.bellows);
    this.audio.whoosh(0.8);
    const nx = pit.right + 40;
    for (let i = 0; i < 10; i++) this.air.emitParticleAt(nx + Math.random() * 20, GROUND_Y - 30 + Math.random() * 16);
    if (this.pitIsLit(pit)) this.sparkAt({ x: pit.x + (Math.random() - 0.5) * pit.half, y: GROUND_Y - 30 }, 6 + ((Math.random() * 6) | 0));
  }

  // --- Mecha de la estructura (C5) ---

  // Al prender una fogata armada, una mecha de fuego sube por cada pata hasta el cruce.
  // Devuelve el tipo de estructura (para el sonido) o null si no hay mecha.
  startWick(l) {
    const p = l.pit;
    const now = this.scene.time.now;
    if (!p || !p.structFormed || p.wick || now - (p.wickT || -1e9) < 8000) return null;
    const parts = this.slotted(p);
    if (parts.length < 2) return null;
    const segs = parts.map((o, i) => ({ o, delay: i * 0.1, dur: 0.7 }));
    p.wick = { t: 0, segs, cab: false, total: Math.max(...segs.map((g) => g.delay + g.dur)) };
    p.wickT = now;
    return p.structFormed;
  }

  // Punto de la leña a la fracción u del recorrido, de abajo hacia arriba.
  wickPoint(g, p, u) {
    const e = g.o.endpoints();
    let a = { x: e[0], y: e[1] };
    let b = { x: e[2], y: e[3] };
    if (a.y < b.y) [a, b] = [b, a]; // de abajo hacia arriba
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }

  updateWicks(dt) {
    const k = this.fxScale;
    for (const p of this.pits) {
      const w = p.wick;
      if (!w) continue;
      if (!p.structFormed) { p.wick = null; continue; } // se desarmó: la mecha se corta
      w.t += dt;
      let top = null;
      for (const g of w.segs) {
        const o = g.o;
        if (!o.slot || o.dead || o.state === 'ceniza') continue; // pieza perdida: se corta ahí
        const u = (w.t - g.delay) / g.dur;
        if (u < 0) continue;
        const pt = this.wickPoint(g, p, Math.min(1, u));
        if (!top || pt.y < top.y) top = pt;
        if (u <= 1.0) {
          if (Math.random() < 0.8 * k) this.flames.L.emitParticleAt(pt.x, pt.y);
          if (Math.random() < 0.5 * k) this.flames.M.emitParticleAt(pt.x + (Math.random() - 0.5) * 8, pt.y - 4);
          if (Math.random() < 0.25 * k) this.sparkAt(pt, 1 + ((Math.random() * 2) | 0));
        }
      }
      p.flash = Math.max(p.flash || 0, (0.3 + 0.5 * Math.min(1, w.t / w.total)) * k);
      if (w.t >= w.total) {
        // Remate: la llama llega arriba.
        const tx = top ? top.x : p.x;
        const ty = top ? top.y : GROUND_Y - 120;
        for (let i = 0, n = Math.round((w.cab ? 8 : 6) * k); i < n; i++) {
          this.flames.L.emitParticleAt(tx + (Math.random() - 0.5) * (w.cab ? 60 : 16), ty - Math.random() * 10);
        }
        this.sparkAt({ x: tx, y: ty }, Math.round(12 * k));
        if (w.cab) this.ring.emitParticleAt(tx, ty, Math.round(12 * k));
        p.flash = Math.max(p.flash || 0, 1.1 * k);
        p.wick = null;
      }
    }
  }

  // Corona de brasas fija en el borde del pozo mientras la estructura tira; se apaga si se pierde.
  updateCrowns(dt) {
    const N = 9;
    const k = this.fxScale;
    for (const p of this.pits) {
      const on = p.structFormed && this.pitIsLit(p);
      if (!p.crown) {
        if (!on) continue;
        p.crown = [];
        for (let i = 0; i < N; i++) p.crown.push(this.scene.add.image(0, 0, 'spark').setBlendMode(Phaser.BlendModes.ADD).setDepth(21).setTint(0xff8a30).setAlpha(0));
        p.crownA = 0;
      }
      const target = on ? (0.5 + 0.3 * p.structure.quality) * (k < 1 ? 0.6 : 1) : 0;
      p.crownA += (target - p.crownA) * Math.min(1, dt * 2);
      const vis = p.crownA > 0.01;
      const t = this.time;
      for (let i = 0; i < N; i++) {
        const e = p.crown[i];
        e.setVisible(vis);
        if (!vis) continue;
        const f = (i / (N - 1)) * 2 - 1;
        e.setPosition(p.x + f * (p.half - 8), GROUND_Y + 1 - 3 * (1 - f * f))
          .setScale(0.7 + (k < 1 ? 0 : 0.2 * Math.sin(t * 3 + i * 1.7)))
          .setAlpha(p.crownA * (k < 1 ? 1 : 0.75 + 0.25 * Math.sin(t * 4.1 + i * 2.3)));
      }
    }
  }

  sparkAt(p, n) {
    this.sparks.emitParticleAt(p.x, p.y, n);
  }

  // Factor de intensidad de los efectos de celebración (movimiento reducido los atenúa).
  get fxScale() { return this.motion ? 1 : 0.3; }

  // Llamarada: todos los pozos prendidos flamean un instante. strength ~1 nivel, ~1.6 hito.
  flare(strength = 1) {
    const k = this.fxScale;
    for (const p of this.pits) {
      if (!this.pitIsLit(p)) continue;
      p.flash = Math.max(p.flash || 0, 1.2 * strength * k);
      const n = Math.round(10 * strength * k);
      for (let i = 0; i < n; i++) {
        this.flameSet(p).L.emitParticleAt(p.x + (Math.random() - 0.5) * p.half * 1.4, GROUND_Y - 40 - Math.random() * 30);
      }
      this.sparkAt({ x: p.x, y: GROUND_Y - 50 }, Math.round(24 * strength * k));
    }
  }

  // Prestigio: una lluvia de brasas sube del fuego durante ms milisegundos.
  emberRise(ms = 1800) {
    const k = this.fxScale;
    const steps = Math.max(4, Math.round(ms / 60 * k));
    const every = ms / steps;
    for (let i = 0; i < steps; i++) {
      this.scene.time.delayedCall(i * every, () => {
        const p = this.pits.length ? this.pits[(Math.random() * this.pits.length) | 0] : null;
        const x = p ? p.x + (Math.random() - 0.5) * p.half * 2 : this.scene.scale.width / 2;
        this.rise.emitParticleAt(x, GROUND_Y - 20, 3);
        if (p) p.flash = Math.max(p.flash || 0, 0.5 * k);
      });
    }
  }

  // Una leña cayó en el pozo (la escena lo llama desde la colisión). power 0..1.
  landInPit(log, power = 1) {
    this.audio.tump(log.wood.weight, power);
    const k = this.fxScale;
    const mul = log.wood.weight === 'heavy' ? 1.5 : log.wood.weight === 'medium' ? 1 : 0.6;
    this.ring.emitParticleAt(log.x, GROUND_Y - 24, Math.max(2, Math.round((5 + 12 * power) * mul * k)));
    if (log.pit) log.pit.flash = Math.max(log.pit.flash || 0, 0.15 * power * k);
  }

  // Momento pico: llamas extra, luz y rugido. No da calor; eso lo decide la escena en onPeak.
  peakMoment(pit) {
    const k = this.fxScale;
    this.audio.peakRoar();
    this.flare(1.8);
    pit.flash = Math.max(pit.flash || 0, 1.6 * k);
    for (let i = 0, n = Math.round(30 * k); i < n; i++) {
      this.scene.time.delayedCall(i * 35, () => {
        this.flameSet(pit).L.emitParticleAt(pit.x + (Math.random() - 0.5) * pit.half * 1.2, GROUND_Y - 60 - Math.random() * 40);
        if (i % 3 === 0) this.sparkAt({ x: pit.x + (Math.random() - 0.5) * pit.half, y: GROUND_Y - 70 }, 3);
      });
    }
    this.onPeak?.({ pit, intensity: pit.intensity });
  }

  // Llamarada en columna al quedar armada la fogata.
  structureBurst(pit, type, quality = 1) {
    const k = this.fxScale;
    pit.flash = Math.max(pit.flash || 0, (0.6 + 0.5 * quality) * k);
    const n = Math.round(18 * k);
    const spread = pit.half * 0.25;
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 25, () => {
        this.flameSet(pit).L.emitParticleAt(pit.x + (Math.random() - 0.5) * spread, GROUND_Y - 50 - Math.random() * 30);
      });
    }
    this.ring.emitParticleAt(pit.x, GROUND_Y - 30, Math.max(2, Math.round(14 * k)));
  }

  // Calidad de la estructura estable del pozo (0 si no hay): "tira" mejor.
  draftOf(p) {
    const s = p.structure;
    return s && s.stable && s.type === 'tipi' ? s.quality : 0;
  }

  // Resalta el pozo más cercano a x (p. ej. con un combo alto).
  glowNear(x, amount = 0.3) {
    const p = this.nearestPit(x);
    if (p) p.flash = Math.max(p.flash || 0, amount * this.fxScale);
  }

  // Anillo de brasas alrededor de cada pozo que se llena mientras se sostiene la intensidad de pico.
  updatePeak(dt) {
    const pk = this.peak;
    const g = this.peakGfx;
    g.clear();
    pk.cd = Math.max(0, pk.cd - dt);
    this.peakProgress = 0;
    if (pk.cd > 0) {
      for (const p of this.pits) { p.peakT = 0; }
      return;
    }
    let hit = null;
    for (const p of this.pits) {
      const on = p.intensity >= pk.thresh;
      // Se llena a ritmo normal y se vacía suave si se corta la condición.
      p.peakT = on ? (p.peakT || 0) + dt : Math.max(0, (p.peakT || 0) - dt * 0.6);
      const prog = clamp(p.peakT / pk.hold, 0, 1);
      this.peakProgress = Math.max(this.peakProgress, prog);
      if (prog >= 1 && !hit) hit = p;
      if (prog > 0.02) this.drawPeakRing(p, prog, on, dt);
    }
    if (hit) {
      for (const p of this.pits) p.peakT = 0;
      pk.cd = pk.cooldown;
      this.peakProgress = 0;
      g.clear();
      this.peakMoment(hit);
    }
  }

  drawPeakRing(p, prog, on, dt) {
    const g = this.peakGfx;
    const k = this.fxScale;
    const cx = p.x;
    const cy = GROUND_Y - 40;
    const rx = p.half + 16;
    const ry = 38;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * (6 + prog * 10));
    const pt = (a) => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    const start = -Math.PI / 2;
    // Fondo tenue del anillo completo.
    g.lineStyle(this.motion ? 3 : 2, 0xff7a30, 0.14);
    g.beginPath();
    for (let a = 0; a <= 64; a++) { const [x, y] = pt(start + (a / 64) * Math.PI * 2); a ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokePath();
    // Tramo lleno: del naranja al amarillo cálido.
    const col = prog > 0.8 ? 0xffe9a0 : prog > 0.5 ? 0xffb347 : 0xff7a30;
    g.lineStyle(this.motion ? 5 : 3, col, (0.55 + 0.35 * prog) * (this.motion ? pulse : 1));
    g.beginPath();
    const n = Math.max(2, Math.round(64 * prog));
    for (let a = 0; a <= n; a++) { const [x, y] = pt(start + (a / 64) * Math.PI * 2); a ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokePath();
    if (!on) return;
    // Brasita en la punta del arco y pulso + tono creciente.
    const [tx, ty] = pt(start + prog * Math.PI * 2);
    if (this.motion && Math.random() < dt * 14) this.sparks.emitParticleAt(tx, ty, 1);
    p.peakTick = (p.peakTick || 0) - dt;
    if (p.peakTick <= 0) {
      p.peakTick = 0.55 - 0.3 * prog;
      this.audio.peakTick(prog);
      p.flash = Math.max(p.flash || 0, (0.12 + 0.2 * prog) * k);
    }
  }

  // Viajes de la leña hacia su lugar.
  trackLogs(dt) {
    for (const l of this.logs) if (l.moveAnim && l.state !== 'ceniza') this.stepMove(l, dt);
  }

  // --- Lugares de la fogata (ver utils/slots.js) ---

  // Leñas encajadas en un pozo.
  slotted(pit) {
    return pit.slotList.filter((s) => s.log).map((s) => s.log);
  }

  // Encaja la leña en su lugar: un viaje corto hasta él, o directo con `instant` (arranque de la partida).
  placeLog(l, pit, slot, instant = false) {
    l.pit = pit;
    l.slot = slot;
    slot.log = l;
    if (instant) {
      l.seat();
      l.syncGlow();
      return;
    }
    this.startMove(l);
    this.scene.events.emit('log:snap', { log: l, pit, slot });
  }

  // Saca una leña del fuego sin dejar rastro (el jugador la sacó de su lugar).
  removeLog(l) {
    const i = this.logs.indexOf(l);
    if (i >= 0) this.logs.splice(i, 1);
    l.state = 'ceniza';
    l.destroy();
  }

  startMove(l) {
    const s = l.sprite;
    const dist = Math.hypot(l.slot.x - s.x, l.slot.y - s.y);
    const dur = this.motion === false ? 0.001 : clamp(0.09 + dist * 0.0018, 0.09, 0.26);
    l.moveAnim = { t: 0, dur, x0: s.x, y0: s.y, a0: s.rotation };
  }

  // Ease out cuadrático hasta el lugar (se recalcula cada cuadro: la pieza puede estar achicándose).
  stepMove(l, dt) {
    const a = l.moveAnim;
    a.t = Math.min(1, a.t + dt / a.dur);
    const e = 1 - (1 - a.t) * (1 - a.t);
    const pose = l.seatPose();
    l.sprite.setPosition(a.x0 + (pose.x - a.x0) * e, a.y0 + (pose.y - a.y0) * e);
    l.sprite.setRotation(a.a0 + Phaser.Math.Angle.Wrap(pose.angle - a.a0) * e);
    if (a.t >= 1) {
      l.moveAnim = null;
      l.seat();
    }
  }

  updateStructures(dt) {
    this.structT = (this.structT || 0) + dt;
    const scan = this.structT >= STRUCT_STEP;
    if (scan) this.structT = 0;
    for (const p of this.pits) {
      const s = p.structure;
      if (scan) {
        const r = slotStructure(p.slotList);
        p.structTarget = r.quality;
        s.stable = r.quality > 0;
        if (r.quality > 0) s.type = r.type;
        else if (s.quality < 0.05) s.type = 'ninguna';
      }
      s.quality += (p.structTarget - s.quality) * Math.min(1, dt * 1.5);
      if (p.structTarget > s.quality) s.quality = p.structTarget; // al encajar sube de golpe
      if (p.structTarget === 0 && s.quality < 0.01) s.quality = 0;
      if (s.quality >= 0.9 && !p.structNoted) {
        p.structNoted = true;
        this.scene.state.noteStructure(s.type, s.quality);
      } else if (s.quality < 0.8) {
        p.structNoted = false;
      }
      const armed = s.type === 'tipi';
      if (!p.structFormed && s.stable && armed && s.quality >= 0.6) {
        p.structFormed = s.type;
        this.scene.events.emit('structure:formed', { pit: p, type: s.type, quality: s.quality });
      } else if (p.structFormed && (!armed || s.quality < 0.4)) {
        this.scene.events.emit('structure:lost', { pit: p, type: p.structFormed });
        p.structFormed = null;
      }
      const st = armed ? STRUCTURE.tipi : null;
      const q = st ? s.quality : 0;
      p.sAir = 1 + (st ? st.air : 0) * q;
      p.sIgnite = 1 + (st ? st.ignite : 0) * q;
      p.sFuel = 1 + (st ? st.fuel : 0) * q;
      p.structureBonus = Math.min(STRUCTURE.calorCap, (st ? st.calor : 0) * q);
    }
  }

  burst(x, y, n) {
    this.sparks.emitParticleAt(x, y, n);
    this.audio.crackle(0.7);
  }

  update(dt, weather) {
    this.time += dt;
    const logs = this.logs;
    const n = logs.length;
    const mods = this.mods;
    const wind = weather.wind;
    const rainAll = weather.rain * (1 - mods.rainResist);

    // --- Aire de cada pozo ---
    for (const p of this.pits) { p.load = 0; p.burningLogs = 0; }
    for (const l of logs) {
      l.pit.load += l.area;
      if (l.burning) l.pit.burningLogs++;
    }
    for (const p of this.pits) {
      p.loadRatio = p.load / p.capacity;
      p.bellows = Math.max(0, p.bellows - dt * 0.7);
      p.flash = Math.max(0, (p.flash || 0) - dt * 2.2);
      p.bellows = Math.max(p.bellows, p.perks.bellows); // la fragua sopla sola
      p.air = Math.min(1.5, (1 + p.bellows * 0.6 + wind * 0.3) * p.airSize * p.sAir * mods.draft);
      // Un pozo más grande se moja más si no tiene techo.
      p.rain = p.roof || p.perks.covered ? 0 : rainAll * (1 + 0.1 * p.size);
      // Una fogata armada escurre parte del agua: aguanta la lluvia moderada en pozos grandes.
      if (p.rain > 0 && p.structure.type === 'tipi') p.rain *= 1 - 0.35 * p.structure.quality;
    }
    this.trackLogs(dt);
    this.updateStructures(dt);

    // --- Calor que recibe cada leña ---
    // Se comparte en todo el pozo: da igual dónde esté cada pieza y en qué orden se puso.
    const amb = new Float32Array(n);
    for (const p of this.pits) p.logHeat = 0;
    for (const l of logs) l.pit.logHeat += l.heatOut;
    for (let k = this.sources.length - 1; k >= 0; k--) {
      const s = this.sources[k];
      s.ttl -= dt;
      s.acc += dt * 30;
      while (s.acc >= 1) { s.acc -= 1; this.flames.S.emitParticleAt(s.x + (Math.random() - 0.5) * 6, s.y); }
      if (s.ttl <= 0) this.sources.splice(k, 1);
    }
    for (let i = 0; i < n; i++) {
      const l = logs[i];
      let src = 0;
      for (const s of this.sources) {
        const d = Math.max(0, pointSegDist(s.x, s.y, ...l.endpoints()) - l.thickness / 2);
        src += s.heat * Math.exp(-(d * d) / (s.r * s.r));
      }
      const p = l.pit;
      amb[i] += src + (p.logHeat - l.heatOut) * HEAT_SHARE;
      amb[i] += p.bed * (0.55 + 0.6 * p.bellows) * (1 + 0.15 * p.size);
      amb[i] *= 1 + 0.3 * p.bellows;
      amb[i] -= p.rain * 0.4;
    }

    // --- Estados ---
    let burningCount = 0;
    for (const l of logs) if (l.flame > 0.03) burningCount++;
    this.budget = Math.min(1, 14 / Math.max(1, burningCount));
    this.stats.llama = 0;
    this.stats.brasas = 0;
    this.stats.hiss = 0;
    for (let i = 0; i < n; i++) {
      const l = logs[i];
      const p = l.pit;
      l.air = p ? p.air : 1 + wind * 0.3;
      l.rain = p ? p.rain : rainAll;
      this.updateLog(l, Math.max(0, amb[i]), dt, wind);
    }

    // --- Visuales y emisión ---
    const time = this.scene.time.now;
    for (const l of logs) {
      if (l.state === 'ceniza') continue;
      this.syncLog(l, time);
      this.emitFor(l, dt, wind);
    }
    for (let i = logs.length - 1; i >= 0; i--) if (logs[i].state === 'ceniza') logs.splice(i, 1);

    // --- Lecho, luz e intensidad por pozo ---
    // Con cielo claro (día, atardecer) la luz aditiva se atenúa para no quemar la imagen.
    const bright = this.scene.skyBright || 0;
    const flick = 1 + 0.07 * Math.sin(this.time * 13) + 0.05 * Math.sin(this.time * 29 + 1) + Math.random() * 0.04;
    let total = 0;
    for (const p of this.pits) {
      p.bed = Math.max(0, p.bed - dt * (0.012 * mods.bedDecay * p.perks.bedDecay + p.rain * 0.08));
      let heat = p.bed * 0.5 * (1 + p.bellows);
      let lx = 0, ly = 0, lw = 0;
      for (const l of logs) {
        if (l.pit !== p || l.heatOut <= 0) continue;
        heat += l.heatOut;
        lx += l.x * l.heatOut;
        ly += l.y * l.heatOut;
        lw += l.heatOut;
      }
      for (const s of this.sources) if (Math.abs(s.x - p.x) < p.half) heat += 0.3;
      p.heat = heat;
      // El calor sigue a la leña que arde: más lugares llenos y mejor madera rinden más. El tope solo frena excesos.
      const target = clamp(heat / 3.5, 0, 5 * p.spec.tipis * p.roomy);
      p.intensity += (target - p.intensity) * Math.min(1, dt * 2.5);
      if (lw > 0.05) {
        p.lightX += (lx / lw - p.lightX) * Math.min(1, dt * 2);
        p.lightY += (ly / lw - 40 - p.lightY) * Math.min(1, dt * 2);
      }
      const I = p.intensity;
      const fl = p.flash || 0;
      const dim = 1 - 0.25 * this.cold;
      // Con buen tiraje la luz parpadea menos y se estira hacia arriba (llama ordenada).
      const dq = this.draftOf(p);
      const fk = 1 + (flick - 1) * (1 - 0.6 * dq);
      const sc = (1.5 + Math.min(1.2, I) * 1.9) * (1 + 0.3 * (p.hs - 1)) * fk * (1 + fl * 0.6);
      p.light.setPosition(p.lightX, p.lightY)
        .setScale(sc, sc * (1 + 0.18 * dq))
        .setAlpha(Math.min(1, Math.min(0.3, I * 0.3) * flick * dim + fl * 0.2) * (1 - 0.65 * bright));
      // Llama persistente, luz de suelo/piedras y brillo en los árboles cercanos.
      const fi = Math.min(1, I);
      const ff = 1 + 0.05 * Math.sin(this.time * 9 + p.index) + 0.03 * Math.sin(this.time * 23);
      const fs = (0.45 + 0.85 * fi) * (0.7 + 0.3 * Math.min(1.5, p.half / 90)) * (this.motion ? ff : 1);
      const nb = p.flameBases.length;
      for (let bi = 0; bi < nb; bi++) {
        const off = nb === 1 ? 0 : (bi / (nb - 1) - 0.5) * 2;
        const ph = p.index * 1.7 + bi * 2.3;
        const sk = (nb > 1 ? 0.85 - 0.1 * Math.abs(off) : 1) * fs;
        p.flameBases[bi]
          .setPosition(clamp(p.lightX + off * p.half * 0.55, p.left + 30, p.right - 30), p.lightY + 36)
          .setScale(sk * (1 + 0.06 * Math.sin(this.time * 6.3 + ph)), sk * (1 + 0.08 * Math.sin(this.time * 7.1 + ph)))
          .setRotation(this.motion ? 0.035 * Math.sin(this.time * 3.1 + ph) : 0)
          .setAlpha(Math.min(0.9, fi * 1.2) * dim);
      }
      const gl = (Math.min(1, I * 0.8) * flick * dim + fl * 0.3) * (1 - 0.5 * bright);
      const gw = p.half * 6.5 / 512;
      p.groundGlow.setPosition(p.x, GROUND_Y + 4).setScale(gw, gw * 1.1).setAlpha(Math.min(0.95, gl * 1.0));
      p.stoneGlow.setPosition(p.x, GROUND_Y - 8).setScale(gw * 0.7, gw * 0.5).setAlpha(Math.min(0.16, gl * 0.18));
      p.treeGlow.setPosition(p.x, GROUND_Y - 150).setScale(p.half / 26, p.half / 40).setAlpha(Math.min(0.6, gl * 0.55) * (1 - 0.7 * bright));
      p.bedGlow.setScale(p.half / 110, 0.16).setAlpha(Math.min(1, p.bed * (0.7 + 0.5 * p.bellows)) * flick);
      if (Math.abs(p.ash - (p.drawnAsh || 0)) > 0.02) p.drawAsh();
      total += I;
    }
    this.intensity = total;
    this.updatePeak(dt);
    this.updateWicks(dt);
    this.updateCrowns(dt);

    // Viento: las llamas y el humo se inclinan.
    const lean = wind * 140 * Math.sin(this.time * 0.7) + wind * 90;
    const allFlames = Object.values(this.flameSets).flatMap((set) => Object.values(set));
    for (const e of [...allFlames, this.smoke]) e.accelerationX = lean;

    // Con cielo claro las partículas aditivas se apagan (si no, se ven blancas).
    for (const e of allFlames) e.setAlpha(1 - 0.6 * bright);
    let air = 1;
    for (const p of this.pits) if (p.burningLogs) air = Math.min(air, p.air);
    let draft = 0;
    for (const p of this.pits) draft = Math.max(draft, this.draftOf(p));
    this.audio.setFire(Math.min(1.3, total), air, draft);
    this.audio.setHiss(this.stats.hiss);
  }

  updateLog(l, amb, dt, wind) {
    const w = l.wood;
    const mods = this.mods;
    const p = l.pit;
    const bellows = p ? p.bellows : 0;
    l.amb = amb;

    if (l.state === 'cruda') {
      // Inercia del pozo grande (+5% por nivel) y efecto de la estructura (tipi prende más rápido).
      const warm = w.warm * mods.warm * (p ? ((1 + 0.05 * p.size) * p.perks.ignite) / p.sIgnite : 1);
      const k = amb > l.temp ? dt / warm : dt / (warm * 4);
      l.temp += (amb - l.temp) * Math.min(1, k);
      // La lluvia moja la leña a la intemperie (si el fuego la calienta, se seca más rápido de lo que se moja).
      if (l.rain > 0.05 && amb < 0.3 && w.shape !== 'cone') l.moisture = Math.min(1, l.moisture + l.rain * 0.025 * dt);
      if (l.moisture > 0) {
        if (l.temp > 0.3) {
          const wasDry = l.drying === 0;
          l.moisture = Math.max(0, l.moisture - (Math.min(amb, 1.6) - 0.25) * dt * mods.dry / (w.dryTime || 6));
          l.temp = Math.min(l.temp, 0.36);
          l.drying = clamp((amb - 0.3) / 0.8, 0.15, 1);
          this.stats.hiss += l.drying * 0.6;
          if (wasDry) this.onDryStart?.(l);
        } else {
          l.drying = 0;
        }
      } else {
        l.drying = 0;
        if (l.temp >= w.ignite * mods.ignite) this.ignite(l);
      }
      l.heatOut = 0;
      l.flame = Math.max(0, l.flame - dt * 2);
    } else if (l.state === 'llama') {
      let target = Math.min(1.3, (0.55 + amb * 0.45) * l.air) - l.rain * 0.35;
      target *= 1 + 0.25 * bellows;
      l.flame += (target - l.flame) * Math.min(1, dt * 1.6);
      l.flame = Math.max(0, l.flame);
      l.fuel -= dt * (0.45 + l.flame * 0.75) * (1 + wind * 0.4) * (p ? p.sFuel * p.spec.burn : 1);
      l.heatOut = w.heat * l.flame;
      l.lowTime = l.flame < 0.22 ? l.lowTime + dt : 0;
      this.stats.llama++;
      if (l.lowTime > 2.2) this.toEmbers(l, true);
      else if (l.fuel <= l.maxFuel * 0.2) this.toEmbers(l, false);
    } else if (l.state === 'brasas') {
      const base = l.choked ? 1 : 0.35 + 0.65 * clamp(l.fuel / (l.maxFuel * 0.2), 0, 1);
      l.glowLevel = base * clamp(l.air, 0.3, 1.3) * (1 - l.rain * 0.4);
      l.fuel -= dt * (l.choked ? 0.12 : 0.3) * (1 + bellows * 1.5 + l.rain * 2 + wind * 0.5) / mods.embers * (p ? p.sFuel * p.spec.burn : 1);
      l.heatOut = w.heat * 0.5 * l.glowLevel;
      l.flame = Math.max(0, l.flame - dt * 1.5);
      this.stats.brasas++;
      if (l.choked && l.air > 0.8 && l.rain < 0.5) {
        l.reTime += dt;
        if (l.reTime > 0.8) this.ignite(l, true);
      } else {
        l.reTime = 0;
      }
      if (l.choked && l.fuel <= l.maxFuel * 0.2) l.choked = false;
      if (l.fuel <= 0) this.toAsh(l);
    }
    if (l.burning) this.tryShrink(l);
  }

  // A la mitad de su combustible la pieza se transforma en la del tamaño de abajo y baja a ese anillo, dejando
  // libre su lugar. Si abajo no hay lugar espera acá arriba, gastándose: si se termina antes, se hace ceniza.
  tryShrink(l) {
    const next = l.wood.next;
    if (!next || l.fuel > l.maxFuel * SHRINK_AT) return;
    const to = lowerFree(l.pit.slotList, l.slot);
    if (!to) return;
    const from = l.slot;
    from.log = null;
    to.log = l;
    l.slot = to;
    this.startMove(l);
    l.setWood(next);
    l.maxFuel = l.fuel; // el combustible que le queda sigue siendo suyo, ahora con el calor del tamaño nuevo
    l.setSize(1);
    l.char = -1;
    const k = this.fxScale;
    this.ashDust.emitParticleAt(from.x, from.y, Math.max(1, Math.round(5 * k)));
    this.sparkAt({ x: from.x, y: from.y }, Math.round(5 * k) + 1);
    this.audio.crackle(0.6);
    l.pit.flash = Math.max(l.pit.flash || 0, 0.2 * k);
  }

  ignite(l, soft = false) {
    l.state = 'llama';
    l.temp = 1;
    l.flame = soft ? 0.3 : 0.15;
    l.lowTime = 0;
    l.reTime = 0;
    l.choked = false;
    this.everLit = true;
    const size = Math.min(1, l.wood.thickness / 34 + 0.2);
    const k = this.fxScale;
    // Pozo con estructura formada: la llama recorre la armazón (mecha) y suena su ignición propia.
    this.audio.ignite(this.startWick(l) || size);
    // Pulso de luz y ráfaga de chispas proporcionales al grosor (rebrotar de brasas: más suave).
    if (l.pit) l.pit.flash = Math.max(l.pit.flash || 0, (soft ? 0.35 : 0.5 + 0.7 * size) * k);
    this.sparkAt(l, Math.round((6 + l.wood.thickness * (soft ? 0.4 : 0.9)) * (k < 1 ? 0.5 : 1)));
    const em = this.flames[l.wood.flame];
    for (let i = 0; i < 8; i++) {
      const p = l.pointAlong(Math.random());
      em.emitParticleAt(p.x, p.y - l.thickness * 0.3);
    }
    this.onIgnite?.(l);
  }

  toEmbers(l, choked) {
    l.state = 'brasas';
    l.choked = choked;
    if (choked) {
      this.audio.sizzle(0.5);
      for (let i = 0; i < 6; i++) {
        const p = l.pointAlong(Math.random());
        this.smoke.emitParticleAt(p.x, p.y - l.thickness * 0.5);
      }
    }
  }

  toAsh(l) {
    l.state = 'ceniza';
    const s = l.sprite;
    // Reemplazo la leña por una imagen que se desarma.
    const ghost = this.scene.add.image(s.x, s.y, s.texture.key)
      .setRotation(s.rotation).setScale(l.size).setFlipX(s.flipX).setTint(0x6a625c).setDepth(19);
    if (l.pit) {
      l.pit.ash = Math.min(1.5, l.pit.ash + 0.06);
      l.pit.bed = Math.min(1, l.pit.bed + 0.18 * l.wood.heat);
    }
    for (let i = 0; i < 10; i++) {
      const p = l.pointAlong(Math.random());
      this.ashDust.emitParticleAt(p.x, p.y);
    }
    this.sparkAt(l, 5);
    this.audio.crackle(0.5);
    l.destroy();
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleY: l.size * 0.25,
      y: ghost.y + l.thickness * 0.4,
      duration: 1100,
      ease: 'quad.in',
      onComplete: () => ghost.destroy(),
    });
  }

  syncLog(l, time) {
    l.syncGlow();
    let char;
    if (l.state === 'cruda') char = clamp((this.warmth(l) - 0.15) * 0.6, 0, 0.25);
    else char = clamp(0.3 + (1 - l.fuel / l.maxFuel) * 1.1, 0, 0.92);
    if (Math.abs(char - l.char) > 0.01 || l.burnTint !== l.burning) {
      l.burnTint = l.burning;
      l.char = char;
      l.sprite.setTint(lerpColor(0xffffff, 0x2a201c, Math.min(0.85, char * 0.8 + (l.burning ? 0.35 : 0))));
    }
    let a = 0;
    let color = 0xff8030;
    if (l.state === 'llama') {
      a = (0.2 + 0.3 * l.flame) * (0.85 + 0.15 * Math.sin(time * 0.02 + l.phase));
    } else if (l.state === 'brasas') {
      a = l.glowLevel * (0.55 + 0.25 * Math.sin(time * 0.0025 + l.phase) + 0.08 * Math.sin(time * 0.011 + l.phase * 3));
      color = 0xff4a12;
    } else if (this.warmth(l) > 0.35) {
      a = (this.warmth(l) - 0.35) * 0.4;
    }
    l.glow.setAlpha(Math.min(1, a * (l.cone ? 1 : 0.8)));
    // Carbonizado progresivo y grietas incandescentes (solo troncos; se crean cuando empiezan a arder).
    if (!l.cone && (char > 0.3 || l.state === 'brasas')) {
      l.ensureOverlays();
      l.charImg.setAlpha(clamp((char - 0.25) * 1.3, 0, 0.95));
      const heavy = char > 0.7 ? 'log-char1' : 'log-char0';
      if (l.charImg.texture.key !== heavy) l.charImg.setTexture(heavy);
      let ca = 0;
      if (l.state === 'llama') ca = 0.25 * l.flame * (0.8 + 0.2 * Math.sin(time * 0.012 + l.phase));
      else if (l.state === 'brasas') ca = l.glowLevel * (0.55 + 0.45 * Math.sin(time * 0.0035 + l.phase));
      l.crackImg.setAlpha(Math.min(1, ca));
      l.crackImg.setTint(l.state === 'brasas' ? 0xff6a20 : 0xffb050);
    }
    if (l.glowColor !== color) {
      l.glow.setTintFill(color);
      l.glowColor = color;
    }
    // Se achica a medida que se consume.
    const size = 0.55 + 0.45 * Math.max(0, l.fuel) / l.maxFuel;
    if (l.size - size > 0.04) l.setSize(size);
  }

  emitFor(l, dt, wind) {
    const w = l.wood;
    const rnd = Math.random;
    const p = l.pit;
    const boost = p ? p.bellows : 0;

    if (l.flame > 0.03) {
      // Buen tiraje: más llama, más ordenada.
      const dq = p ? this.draftOf(p) : 0;
      const cap = p ? (() => { const n = 5 + 2 * p.size; return Math.min(1, n / Math.max(n, p.burningLogs || 0)); })() : 1; // el brillo no crece con la cantidad de leña
      const rate = cap * 50 * l.flame * (Math.max(60, l.length) / 100) * w.flameRate * (1 + 0.7 * boost) * this.budget * (1 + 0.3 * dq);
      l.acc.flame += rate * dt;
      const set = this.flameSet(p);
      const em = set[w.flame];
      const alt = set[`alt${w.flame}`];
      while (l.acc.flame >= 1) {
        l.acc.flame -= 1;
        const q = l.pointAlong(0.1 + rnd() * 0.8);
        (alt && rnd() < 0.5 ? alt : em).emitParticleAt(q.x + (rnd() - 0.5) * 4, q.y - l.thickness * 0.85);
        if (rnd() < 0.08) set.core.emitParticleAt(q.x + (rnd() - 0.5) * 3, q.y - l.thickness * 0.9);
      }
      if (rnd() < w.crackle * l.flame * dt) {
        const strength = 0.4 + 0.6 * Math.min(1, l.flame);
        this.audio.crackle(strength);
        const q = l.pointAlong(rnd());
        if (rnd() < 0.5) this.sparkAt(q, 1 + ((rnd() * 3) | 0));
        this.onCrackle?.(q.x, q.y - l.thickness, strength, l);
      }
      if (rnd() < w.sparks * l.flame * dt * (1 + 2 * boost + wind)) this.sparkAt(l.pointAlong(rnd()), 1 + ((rnd() * 2) | 0));
    }
    if (l.state === 'brasas') {
      if (rnd() < 0.5 * l.glowLevel * dt) this.audio.crackle(0.25);
      if (rnd() < (0.6 + 3 * boost) * l.glowLevel * dt) this.sparkAt(l.pointAlong(rnd()), 1);
      if (boost > 0.1) {
        l.acc.flame += 20 * l.glowLevel * boost * dt;
        while (l.acc.flame >= 1) {
          l.acc.flame -= 1;
          const q = l.pointAlong(rnd());
          this.flameSet(p).S.emitParticleAt(q.x, q.y - l.thickness * 0.3);
        }
      }
    }
    // Humo.
    let smoke = 0;
    if (l.state === 'cruda' && this.warmth(l) > 0.2) smoke = (this.warmth(l) - 0.2) * 5 * w.smoke;
    else if (l.state === 'llama') smoke = w.smoke * (0.6 + 6 * Math.max(0, 1 - l.air));
    else if (l.state === 'brasas') smoke = (l.choked ? 3.5 : 0.6) * (0.4 + l.glowLevel * 0.6);
    if (p) smoke *= 1 - 0.5 * this.draftOf(p);
    l.acc.smoke += smoke * dt;
    while (l.acc.smoke >= 1) {
      l.acc.smoke -= 1;
      const q = l.pointAlong(rnd());
      this.smoke.emitParticleAt(q.x, q.y - l.thickness * 0.5);
    }
    // Vapor: madera secándose o lluvia sobre el fuego.
    const steam = l.drying * 10 + (l.burning ? l.rain * 8 : 0);
    if (steam > 0) {
      l.acc.steam += steam * dt;
      while (l.acc.steam >= 1) {
        l.acc.steam -= 1;
        const q = l.pointAlong(rnd());
        this.steam.emitParticleAt(q.x, q.y - l.thickness * 0.5);
      }
      if (l.drying > 0 && rnd() < 1.2 * l.drying * dt) {
        this.audio.pop(0.5 + l.drying * 0.5);
        this.sparkAt(l.pointAlong(rnd()), 3 + ((rnd() * 3) | 0));
      }
      if (l.burning && l.rain > 0.1 && rnd() < l.rain * dt * 2) this.audio.sizzle(l.rain);
      if (l.burning) this.stats.hiss += l.rain * 0.4;
    }
  }
}
