// Sonido 100% sintetizado con Web Audio: no necesita archivos.
// Crepitar, rugido del fuego, chasquidos, "fuuum" al prender, golpes de leña,
// silbido de la madera húmeda, lluvia, viento y fuelle.

export class FireAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.9;
    this.last = {};
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 5;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      // Pausa/menú: pasa-bajos suave entre el master y el compresor (ver duck()).
      this.duckF = ctx.createBiquadFilter();
      this.duckF.type = 'lowpass';
      this.duckF.frequency.value = 20000;
      this.duckG = ctx.createGain();
      this.master.connect(this.duckF).connect(this.duckG).connect(comp);
      comp.connect(ctx.destination);

      this.white = this.makeNoise(2, false);
      this.brown = this.makeNoise(4, true);
      this.roar = this.loop(this.brown, 'lowpass', 300, 0.7);
      this.hiss = this.loop(this.white, 'highpass', 3800, 0.5);
      this.rain = this.loop(this.white, 'bandpass', 2400, 0.4);
      this.rainLow = this.loop(this.brown, 'lowpass', 500, 0.5);
      this.wind = this.loop(this.brown, 'bandpass', 380, 1.2);
      // Capas de ambiente: grillos y brisa de fondo (bajan con el fuego grande) y un lecho de crepitar
      // cuya cadencia sube con la intensidad.
      this.crickets = this.modLoop(this.white, 'bandpass', 4300, 18, 16);
      this.breeze = this.loop(this.brown, 'lowpass', 260, 0.6);
      this.crackBed = this.modLoop(this.white, 'bandpass', 3200, 0.8, 6);
      this.night = 0.5;
      this.fireI = 0;
      this.mixAmbient();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  makeNoise(seconds, brown) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = w;
      }
    }
    return buf;
  }

  loop(buffer, type, freq, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start(0, Math.random() * buffer.duration);
    return { f, g };
  }

  // Ruido filtrado con modulación de amplitud por un LFO (grillos, lecho de crepitar). Nivel en `g`.
  modLoop(buffer, type, freq, q, lfoHz) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const mod = ctx.createGain();
    mod.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = type === 'bandpass' && freq > 4000 ? 'square' : 'sawtooth';
    lfo.frequency.value = lfoHz;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(mod.gain);
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(mod).connect(g).connect(this.master);
    src.start(0, Math.random() * buffer.duration);
    lfo.start();
    return { f, g, lfo };
  }

  get on() {
    return !!this.ctx && this.ctx.state === 'running' && !this.muted;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, +v || 0));
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  getVolume() { return this.volume; }

  setMuted(m) {
    this.muted = !!m;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  throttle(name, ms) {
    const now = performance.now();
    if (now - (this.last[name] || 0) < ms) return false;
    this.last[name] = now;
    return true;
  }

  // --- Ambiente continuo ---

  // draft 0..1: estructura que tira bien = rugido más limpio y presente.
  setFire(intensity, air, draft = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.roar.g.gain.setTargetAtTime(Math.min(0.45, intensity * (0.31 + 0.09 * draft)), t, 0.25);
    this.roar.f.Q.setTargetAtTime(0.7 + 1.1 * draft, t, 0.4);
    this.roar.f.frequency.setTargetAtTime(160 + intensity * 520 * Math.min(1, air), t, 0.3);
    this.fireI = Math.min(1, intensity);
    this.crackBed.lfo.frequency.setTargetAtTime(4 + intensity * 14, t, 0.5); // crepitar que se acelera
    this.mixAmbient();
  }

  // night 0..1: de noche suenan más los grillos y la brisa.
  setAmbient(night = 0.5) {
    this.night = Math.max(0, Math.min(1, night));
    this.mixAmbient();
  }

  // Mezcla de fondo: el fuego grande llena el mundo y los grillos/brisa bajan; el crepitar sube.
  mixAmbient() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const hush = 1 - 0.8 * this.fireI;
    this.crickets.g.gain.setTargetAtTime(0.035 * this.night * hush, t, 0.8);
    this.breeze.g.gain.setTargetAtTime(0.06 * (0.4 + 0.6 * this.night) * hush, t, 0.8);
    this.crackBed.g.gain.setTargetAtTime(0.05 * this.fireI, t, 0.4);
  }

  // Pausa/menú: pasa-bajos suave y un poco menos de volumen; false lo devuelve.
  duck(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.duckF.frequency.setTargetAtTime(on ? 900 : 20000, t, on ? 0.15 : 0.25);
    this.duckG.gain.setTargetAtTime(on ? 0.7 : 1, t, 0.15);
  }

  setHiss(a) {
    if (!this.ctx) return;
    this.hiss.g.gain.setTargetAtTime(Math.min(1, a) * 0.05, this.ctx.currentTime, 0.2);
  }

  setWeather(rain, wind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rain.g.gain.setTargetAtTime(rain * 0.12, t, 0.5);
    this.rainLow.g.gain.setTargetAtTime(rain * 0.3, t, 0.5);
    this.wind.g.gain.setTargetAtTime(wind * 0.35, t, 0.6);
    this.wind.f.frequency.setTargetAtTime(300 + wind * 250 + Math.random() * 120, t, 0.8);
  }

  // --- Sonidos sueltos ---

  burst({ buf, type, freq, freqEnd, q = 1, attack = 0.001, decay = 0.05, vol = 0.3, when = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = buf || this.white;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(f).connect(g).connect(this.master);
    const dur = attack + decay + 0.05;
    src.start(t, Math.random() * Math.max(0, src.buffer.duration - dur - 0.01), dur);
  }

  tone({ type = 'sine', freq, freqEnd, attack = 0.003, decay = 0.15, vol = 0.3, when = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  crackle(strength = 1) {
    if (!this.on || !this.throttle('crackle', 16)) return;
    const n = Math.random() < 0.35 ? 2 + ((Math.random() * 2) | 0) : 1;
    let when = 0;
    for (let k = 0; k < n; k++) {
      this.burst({
        type: 'bandpass',
        freq: 1200 + Math.random() * 4800,
        q: 0.7 + Math.random() * 2.5,
        decay: 0.006 + Math.random() * 0.03,
        vol: (0.12 + Math.random() * 0.4) * strength,
        when,
      });
      when += 0.008 + Math.random() * 0.04;
    }
  }

  pop(strength = 1) {
    if (!this.on || !this.throttle('pop', 50)) return;
    this.burst({ type: 'bandpass', freq: 500 + Math.random() * 700, q: 1.5, decay: 0.06, vol: 0.6 * strength });
    this.tone({ type: 'triangle', freq: 900 + Math.random() * 400, freqEnd: 300, decay: 0.03, vol: 0.15 * strength });
  }

  // size: número 0..1 (fuego común) o kind: 'tipi' | 'cabana' | 'comun'.
  ignite(size = 0.5, when = 0) {
    if (typeof size === 'string') return this.igniteKind(size, when);
    if (!this.on || !this.throttle('ignite', 140)) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.brown;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(150, t);
    f.frequency.exponentialRampToValueAtTime(400 + 1400 * size, t + 0.22);
    f.frequency.exponentialRampToValueAtTime(220, t + 1.0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.6 * size + 0.1, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 2, 1.2);
    for (let i = 0; i < 3; i++) {
      this.burst({ type: 'bandpass', freq: 2000 + Math.random() * 3000, q: 2, decay: 0.02, vol: 0.25, when: when + 0.1 + Math.random() * 0.4 });
    }
    // "Whump" grave: más hondo y largo cuanto más grande es la leña.
    this.tone({ freq: 95 - 35 * size, freqEnd: 38, attack: 0.01, decay: 0.25 + 0.35 * size, vol: 0.18 + 0.42 * size, when });
  }

  // Prender una estructura: crepitar creciente mientras la llama sube y "whump" grave al llegar arriba.
  // Tipi: sube rápido y angosto (~0,9 s), whump más agudo. Cabaña: corre ancha y lenta (~1,4 s), whump hondo.
  igniteKind(kind, when = 0) {
    if (kind !== 'tipi' && kind !== 'cabana') return this.ignite(0.5, when);
    if (!this.on || !this.throttle('ignite', 140)) return;
    const cab = kind === 'cabana';
    const dur = cab ? 1.4 : 0.9;
    const n = cab ? 16 : 20;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const at = when + dur * Math.pow(u, 0.8); // cada vez más seguidos
      this.burst({ type: 'bandpass', freq: (cab ? 1000 : 1600) + u * (cab ? 1500 : 3200) + Math.random() * 800, q: 1.5 + Math.random() * 2, decay: 0.012 + Math.random() * 0.02, vol: 0.08 + 0.22 * u, when: at });
    }
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.brown;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cab ? 120 : 180, t);
    f.frequency.exponentialRampToValueAtTime(cab ? 700 : 1300, t + dur);
    f.frequency.exponentialRampToValueAtTime(220, t + dur + 0.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(cab ? 0.5 : 0.4, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.8);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 2, dur + 1);
    // Whump al llegar arriba.
    const top = when + dur;
    this.tone({ freq: cab ? 62 : 85, freqEnd: cab ? 34 : 42, attack: 0.01, decay: cab ? 0.7 : 0.5, vol: cab ? 0.5 : 0.4, when: top });
    this.burst({ buf: this.brown, type: 'lowpass', freq: cab ? 380 : 520, decay: 0.3, vol: 0.3, when: top });
  }

  // Primera vez de un gesto (n = 0,1,2…): campanita corta que sube por la escala pentatónica.
  firstTime(n = 0) {
    if (!this.on || !this.throttle('firstTime', 150)) return;
    const pent = [523, 587, 659, 784, 880, 1047];
    const f = pent[Math.min(pent.length - 1, Math.max(0, n | 0))];
    this.tone({ type: 'sine', freq: f, decay: 0.35, vol: 0.09 });
    this.tone({ type: 'sine', freq: f * 2, decay: 0.2, vol: 0.03, when: 0.04 });
    this.burst({ type: 'highpass', freq: 7000, decay: 0.12, vol: 0.04, when: 0.03 });
  }

  // Arrastrar rápido: whoosh muy suave. speed en px/s.
  drag(speed = 0) {
    if (!this.on || speed < 500 || !this.throttle('dragWhoosh', 110)) return;
    const s = Math.min(1, (speed - 500) / 1500);
    this.burst({ buf: this.brown, type: 'bandpass', freq: 400 + 500 * s, freqEnd: 700 + 700 * s, q: 0.8, attack: 0.04, decay: 0.12, vol: 0.05 + 0.07 * s });
  }

  // Derrumbe de una estructura o pila: cascada de golpes de madera que baja de tono y retumba.
  collapse() {
    if (!this.on || !this.throttle('collapse', 400)) return;
    for (let i = 0; i < 6; i++) {
      const w = i * 0.07 + Math.random() * 0.03;
      const base = 240 - i * 18 + Math.random() * 20;
      this.tone({ type: 'sine', freq: base * 1.5, freqEnd: base, attack: 0.002, decay: 0.07, vol: 0.2, when: w });
      this.burst({ type: 'bandpass', freq: 1000 + Math.random() * 500, q: 1.4, decay: 0.02, vol: 0.14, when: w });
    }
    this.burst({ buf: this.brown, type: 'lowpass', freq: 300, decay: 0.6, vol: 0.4 });
    this.tone({ freq: 70, freqEnd: 40, attack: 0.02, decay: 0.5, vol: 0.25, when: 0.15 });
  }

  match(success = true) {
    if (!this.on) return;
    this.burst({ type: 'bandpass', freq: 2800, q: 0.9, attack: 0.03, decay: 0.12, vol: 0.35 });
    this.burst({ type: 'bandpass', freq: 3600, q: 1.2, attack: 0.01, decay: 0.08, vol: 0.25, when: 0.06 });
    if (success) this.ignite(0.3, 0.12);
  }

  flint(success) {
    if (!this.on) return;
    this.tone({ type: 'square', freq: 2600, freqEnd: 1800, decay: 0.03, vol: 0.12 });
    this.burst({ type: 'highpass', freq: 5000, decay: 0.04, vol: 0.3 });
    if (success) this.ignite(0.2, 0.05);
  }

  thud(power, weight) {
    if (!this.on || power <= 0) return;
    const base = weight === 'heavy' ? 70 : weight === 'medium' ? 120 : 210;
    const decay = weight === 'heavy' ? 0.35 : 0.18;
    this.tone({ freq: base * 1.6, freqEnd: base * 0.7, attack: 0.004, decay, vol: power * 0.8 });
    this.tone({ type: 'triangle', freq: base * (4 + Math.random()), freqEnd: base * 2.5, decay: 0.05, vol: power * 0.3 });
    this.burst({ type: 'lowpass', freq: 1200, decay: 0.04, vol: power * 0.4 });
  }

  whoosh(power = 1) {
    if (!this.on) return;
    this.burst({ buf: this.brown, type: 'bandpass', freq: 380, freqEnd: 900, q: 0.8, attack: 0.12, decay: 0.35, vol: 0.5 * power });
  }

  sizzle(a = 1) {
    if (!this.on || !this.throttle('sizzle', 200)) return;
    this.burst({ type: 'highpass', freq: 3000, attack: 0.02, decay: 0.9, vol: 0.18 * a });
  }

  chop() {
    if (!this.on) return;
    this.tone({ type: 'triangle', freq: 520, freqEnd: 260, decay: 0.07, vol: 0.4 });
    this.burst({ type: 'bandpass', freq: 1500, q: 1.2, decay: 0.06, vol: 0.45 });
  }

  steps() {
    if (!this.on) return;
    for (let i = 0; i < 4; i++) {
      this.burst({ type: 'lowpass', freq: 700, decay: 0.08, vol: 0.18, when: i * 0.22 });
    }
  }

  // pitch sube en los combos; el brillo (armónico) también.
  coin(pitch = 1) {
    if (!this.on || !this.throttle('coin', 30)) return;
    this.tone({ type: 'sine', freq: 880 * pitch, freqEnd: 1320 * pitch, attack: 0.005, decay: 0.12, vol: 0.12 });
    this.tone({ type: 'triangle', freq: 1760 * pitch, freqEnd: 2640 * pitch, attack: 0.004, decay: 0.07, vol: 0.04 });
  }

  // Ding de hito de combo (tier 1, 2, 3...): campanita que sube por la escala pentatónica.
  comboDing(tier = 1) {
    if (!this.on || !this.throttle('comboDing', 60)) return;
    const penta = [1, 1.125, 1.25, 1.5, 1.667, 2];
    const f = 660 * penta[Math.min(penta.length - 1, Math.max(0, tier - 1))];
    this.tone({ type: 'sine', freq: f, decay: 0.35, vol: 0.14 });
    this.tone({ type: 'sine', freq: f * 2, decay: 0.22, vol: 0.06, when: 0.02 });
    this.tone({ type: 'triangle', freq: f * 1.5, decay: 0.3, vol: 0.07, when: 0.07 });
  }

  // Se cortó el combo: tono descendente suave (no castiga, solo avisa).
  comboBreak() {
    if (!this.on || !this.throttle('comboBreak', 400)) return;
    this.tone({ type: 'triangle', freq: 660, freqEnd: 330, attack: 0.01, decay: 0.28, vol: 0.09 });
  }

  buy() {
    if (!this.on) return;
    this.tone({ type: 'triangle', freq: 520, decay: 0.08, vol: 0.2 });
    this.tone({ type: 'triangle', freq: 780, decay: 0.12, vol: 0.2, when: 0.07 });
  }

  unlock_() {
    if (!this.on) return;
    [523, 659, 784, 1046, 1568].forEach((f, i) => this.tone({ type: 'triangle', freq: f, decay: i === 4 ? 0.6 : 0.25, vol: i === 4 ? 0.12 : 0.16, when: i * 0.08 }));
  }

  // tier 0: fanfarria corta (niveles comunes). tier >= 1: completa (cada 5 niveles).
  levelUp(tier = 0) {
    if (!this.on) return;
    if (tier < 1) {
      [523, 659, 784, 1046].forEach((f, i) => this.tone({ type: 'sine', freq: f, decay: 0.3, vol: 0.17, when: i * 0.05 }));
      return;
    }
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ type: 'sine', freq: f, decay: 0.45, vol: 0.18, when: i * 0.07 }));
    [523, 659, 784].forEach((f) => this.tone({ type: 'triangle', freq: f, decay: 1.1, vol: 0.12, when: 0.5 }));
    this.tone({ type: 'sine', freq: 130, freqEnd: 98, decay: 0.9, vol: 0.2, when: 0.5 });
    this.burst({ type: 'highpass', freq: 6000, attack: 0.05, decay: 0.6, vol: 0.1, when: 0.5 });
  }

  // Carta rara: arpegio brillante. Épica: acorde lleno con brillo y subgrave.
  rarity(kind = 'rara') {
    if (!this.on) return;
    if (kind === 'epica') {
      [392, 494, 587, 740].forEach((f) => this.tone({ type: 'sine', freq: f, attack: 0.02, decay: 1.4, vol: 0.12 }));
      [784, 988, 1175].forEach((f, i) => this.tone({ type: 'triangle', freq: f, decay: 0.9, vol: 0.07, when: 0.05 + i * 0.05 }));
      this.tone({ type: 'sine', freq: 98, freqEnd: 65, decay: 1.0, vol: 0.2 });
      this.burst({ type: 'highpass', freq: 5500, attack: 0.04, decay: 0.7, vol: 0.12 });
      return;
    }
    [659, 880, 1109, 1318].forEach((f, i) => this.tone({ type: 'sine', freq: f, decay: 0.4, vol: 0.12, when: i * 0.05 }));
  }

  // Amanecer: acorde mayor que se abre despacio, con pájaros encima.
  dawn() {
    if (!this.on) return;
    [262, 330, 392, 523].forEach((f, i) => this.tone({ type: 'sine', freq: f, attack: 0.4, decay: 2.4, vol: 0.1, when: i * 0.25 }));
    [784, 1046].forEach((f, i) => this.tone({ type: 'triangle', freq: f, attack: 0.5, decay: 1.8, vol: 0.05, when: 1.2 + i * 0.3 }));
    this.birds(1.6);
  }

  // Pajaritos: trinos cortos al azar. delay en segundos.
  birds(delay = 0) {
    if (!this.on) return;
    const n = 4 + ((Math.random() * 3) | 0);
    let when = delay;
    for (let k = 0; k < n; k++) {
      const base = 2200 + Math.random() * 1600;
      const up = Math.random() < 0.5;
      this.tone({ type: 'sine', freq: base, freqEnd: base * (up ? 1.35 : 0.75), attack: 0.005, decay: 0.07, vol: 0.05, when });
      this.tone({ type: 'sine', freq: base * (up ? 1.35 : 0.75), freqEnd: base * 1.1, attack: 0.005, decay: 0.06, vol: 0.04, when: when + 0.08 });
      when += 0.14 + Math.random() * 0.3 + (Math.random() < 0.25 ? 0.4 : 0);
    }
  }

  // Prestigio: el fuego se "apaga" hacia las cenizas (descenso grave + soplo).
  reset() {
    if (!this.on) return;
    this.tone({ type: 'sine', freq: 440, freqEnd: 55, attack: 0.02, decay: 1.8, vol: 0.2 });
    this.tone({ type: 'triangle', freq: 220, freqEnd: 40, attack: 0.02, decay: 2.0, vol: 0.12 });
    this.burst({ buf: this.brown, type: 'lowpass', freq: 900, freqEnd: 90, attack: 0.1, decay: 2.0, vol: 0.6 });
    this.sizzle(0.8);
  }

  // Sacar una leña de la pila: "plop" corto, más grave cuanto más pesada.
  pull(weight = 'light') {
    if (!this.on || !this.throttle('pull', 50)) return;
    const base = weight === 'heavy' ? 180 : weight === 'medium' ? 260 : 360;
    this.tone({ type: 'sine', freq: base, freqEnd: base * 1.8, attack: 0.004, decay: 0.07, vol: 0.14 });
    this.burst({ type: 'bandpass', freq: 1800, q: 1.2, decay: 0.025, vol: 0.12 });
  }

  // La leña cae al pozo: "tump" grave. Pitch y largo según el peso de la madera.
  tump(weight = 'light', power = 1) {
    if (!this.on || !this.throttle('tump', 70)) return;
    const base = weight === 'heavy' ? 62 : weight === 'medium' ? 88 : 125;
    const v = 0.25 + 0.55 * power;
    this.tone({ freq: base * 1.8, freqEnd: base * 0.6, attack: 0.004, decay: weight === 'heavy' ? 0.4 : 0.22, vol: v });
    this.burst({ buf: this.brown, type: 'lowpass', freq: 500, decay: 0.08, vol: 0.35 * power });
    this.burst({ type: 'bandpass', freq: 2600, q: 1.5, decay: 0.03, vol: 0.12 * power, when: 0.02 });
  }

  // Pulso al acercarse a la fogata pico: sube de tono con el progreso (0..1).
  peakTick(prog = 0) {
    if (!this.on || !this.throttle('peakTick', 120)) return;
    const f = 330 * Math.pow(2, prog * 1.5);
    this.tone({ type: 'sine', freq: f, decay: 0.18, vol: 0.05 + 0.06 * prog });
    this.tone({ type: 'triangle', freq: f * 1.5, decay: 0.1, vol: 0.03 * prog, when: 0.03 });
  }

  // Fogata pico: rugido que crece y estalla (~2 s).
  peakRoar() {
    if (!this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.brown;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(140, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 1.1);
    f.frequency.exponentialRampToValueAtTime(300, t + 2.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 2, 2.4);
    this.tone({ freq: 70, freqEnd: 140, attack: 0.9, decay: 0.5, vol: 0.2 });
    this.tone({ type: 'triangle', freq: 392, attack: 0.9, decay: 0.8, vol: 0.06, when: 0.9 });
    for (let i = 0; i < 6; i++) this.burst({ type: 'bandpass', freq: 2000 + Math.random() * 3500, q: 2, decay: 0.02, vol: 0.25, when: 1.0 + Math.random() * 0.8 });
  }

  // Encuentro en el bosque. kind: 'hallazgo' | 'animal' | 'viajero' | 'peligro'; otro valor = 'hallazgo'.
  forestEvent(kind = 'hallazgo') {
    if (!this.on) return;
    if (kind === 'animal') {
      // Ramas que crujen y un gruñido corto.
      for (let i = 0; i < 3; i++) this.burst({ type: 'bandpass', freq: 1500 + Math.random() * 1500, q: 2, decay: 0.03, vol: 0.2, when: i * 0.09 });
      this.tone({ type: 'sawtooth', freq: 220, freqEnd: 150, attack: 0.05, decay: 0.3, vol: 0.06, when: 0.3 });
    } else if (kind === 'viajero') {
      // Pasos y dos notas amables.
      for (let i = 0; i < 3; i++) this.burst({ type: 'lowpass', freq: 700, decay: 0.07, vol: 0.16, when: i * 0.18 });
      this.tone({ type: 'triangle', freq: 392, decay: 0.2, vol: 0.14, when: 0.6 });
      this.tone({ type: 'triangle', freq: 523, decay: 0.3, vol: 0.14, when: 0.75 });
    } else if (kind === 'peligro') {
      // Golpe grave disonante.
      this.tone({ type: 'sawtooth', freq: 110, freqEnd: 90, decay: 0.7, vol: 0.12 });
      this.tone({ type: 'sawtooth', freq: 117, freqEnd: 95, decay: 0.7, vol: 0.1 });
      this.burst({ buf: this.brown, type: 'lowpass', freq: 400, decay: 0.5, vol: 0.5 });
    } else {
      // Hallazgo: campanitas de tesoro.
      [784, 988, 1175, 1568].forEach((f, i) => this.tone({ type: 'sine', freq: f, decay: 0.4, vol: 0.12, when: i * 0.07 }));
      this.burst({ type: 'highpass', freq: 6500, decay: 0.2, vol: 0.08, when: 0.2 });
    }
  }

  // Logro desbloqueado: fanfarria brillante, distinta de levelUp (campana + brillo).
  achievement() {
    if (!this.on) return;
    [659, 784, 988, 1318].forEach((f, i) => {
      this.tone({ type: 'triangle', freq: f, decay: 0.5, vol: 0.13, when: i * 0.09 });
      this.tone({ type: 'sine', freq: f * 2, decay: 0.35, vol: 0.05, when: i * 0.09 });
    });
    this.tone({ type: 'sine', freq: 1568, attack: 0.02, decay: 0.9, vol: 0.1, when: 0.4 });
    this.burst({ type: 'highpass', freq: 7000, attack: 0.1, decay: 0.5, vol: 0.1, when: 0.3 });
  }

  // --- Acomodo de leña (C4) ---

  // Clic de madera sutil por paso de rotación (~12°), con variación de tono.
  rotateTick() {
    if (!this.on || !this.throttle('rotateTick', 40)) return;
    const f = 1500 * (0.92 + Math.random() * 0.16);
    this.burst({ type: 'bandpass', freq: f, q: 2.2, decay: 0.014, vol: 0.13 });
    this.tone({ type: 'triangle', freq: f * 0.45, freqEnd: f * 0.3, attack: 0.002, decay: 0.025, vol: 0.05 });
  }

  // Leña apoyada sobre otra leña: "tock" hueco de madera, distinto del thud contra el suelo.
  // soft: versión más suave (contra la piedra del pozo).
  woodTock(weight = 'medium', soft = false) {
    if (!this.on || !this.throttle('woodTock', 80)) return;
    const g = soft ? 0.55 : 1;
    const base = weight === 'heavy' ? 150 : weight === 'medium' ? 210 : 290;
    const j = 0.95 + Math.random() * 0.1;
    this.tone({ type: 'sine', freq: base * 1.5 * j, freqEnd: base * j, attack: 0.002, decay: 0.07, vol: 0.28 * g });
    this.tone({ type: 'triangle', freq: base * 3.1 * j, freqEnd: base * 2.2, attack: 0.001, decay: 0.03, vol: 0.1 });
    this.burst({ type: 'bandpass', freq: 1100, q: 1.4, decay: 0.02, vol: 0.18 });
  }

  // Leña que encaja en una ranura: "clac" seco de madera. step (0..6) = pieza de la misma estructura:
  // cada una sube el tono un paso de escala mayor, así la cadena culmina en el acorde de structureFormed.
  snapClack(weight = 'medium', step = 0) {
    if (!this.on || !this.throttle('snapClack', 60)) return;
    const base = weight === 'heavy' ? 130 : weight === 'medium' ? 185 : 260;
    const semis = [0, 2, 4, 5, 7, 9, 11][Math.min(6, Math.max(0, step))];
    const j = Math.pow(2, semis / 12) * (0.985 + Math.random() * 0.03);
    this.burst({ type: 'bandpass', freq: 2400 * j, q: 1.8, decay: 0.012, vol: 0.2 });
    this.tone({ type: 'sine', freq: base * 1.7 * j, freqEnd: base * j, attack: 0.001, decay: 0.06, vol: 0.26 });
    this.tone({ type: 'triangle', freq: base * 4.2 * j, freqEnd: base * 3 * j, attack: 0.001, decay: 0.025, vol: 0.07 });
    this.burst({ buf: this.brown, type: 'lowpass', freq: 600, decay: 0.05, vol: 0.12 });
  }

  // Desencajar. 'grab': "tic" suave al despegar. 'support': crujido y caída al perder el apoyo.
  unsnap(reason = 'grab') {
    if (!this.on) return;
    if (reason === 'support') {
      if (!this.throttle('unsnapSupport', 250)) return;
      for (let i = 0; i < 3; i++) this.burst({ type: 'bandpass', freq: 900 + Math.random() * 900, q: 3, decay: 0.025, vol: 0.14, when: i * 0.05 });
      this.tone({ type: 'sine', freq: 160, freqEnd: 90, attack: 0.01, decay: 0.18, vol: 0.12, when: 0.1 });
      return;
    }
    if (reason !== 'grab' || !this.throttle('unsnapGrab', 80)) return;
    this.burst({ type: 'bandpass', freq: 2000 * (0.95 + Math.random() * 0.1), q: 2, decay: 0.01, vol: 0.09 });
    this.tone({ type: 'triangle', freq: 520, freqEnd: 420, attack: 0.001, decay: 0.02, vol: 0.04 });
  }

  // Imán audible: tick muy sutil al resaltar una ranura nueva durante el drag.
  slotTick() {
    if (!this.on || !this.throttle('slotTick', 120)) return;
    this.tone({ type: 'sine', freq: 880 * (0.97 + Math.random() * 0.06), freqEnd: 780, attack: 0.001, decay: 0.018, vol: 0.035 });
  }

  // Estructura formada. 'tipi': brillante y ascendente. 'cabana': grave y sólida.
  // pieces: cuántas piezas encajadas tenía; con 3 o más suma un brillo final de "encajó la última".
  structureFormed(type = 'tipi', pieces = 0) {
    if (!this.on) return;
    if (pieces >= 3) {
      this.tone({ type: 'sine', freq: type === 'cabana' ? 523 : 1047, attack: 0.02, decay: 0.9, vol: 0.07, when: 0.3 });
      this.burst({ type: 'highpass', freq: 6500, attack: 0.08, decay: 0.35, vol: 0.06, when: 0.3 });
    }
    if (type === 'cabana') {
      [131, 196, 262].forEach((f, i) => this.tone({ type: 'triangle', freq: f, attack: 0.01, decay: 0.7, vol: 0.22, when: i * 0.1 }));
      this.tone({ type: 'sine', freq: 65, freqEnd: 55, decay: 0.9, vol: 0.25, when: 0.2 });
      this.burst({ buf: this.brown, type: 'lowpass', freq: 400, decay: 0.3, vol: 0.4, when: 0.2 });
      this.woodTock('heavy');
      return;
    }
    [392, 494, 587, 784].forEach((f, i) => {
      this.tone({ type: 'sine', freq: f, decay: 0.5, vol: 0.14, when: i * 0.07 });
      this.tone({ type: 'triangle', freq: f * 2, decay: 0.25, vol: 0.05, when: i * 0.07 });
    });
    this.burst({ type: 'highpass', freq: 6000, attack: 0.05, decay: 0.4, vol: 0.09, when: 0.25 });
  }

  // Estructura perdida: suspiro descendente suave.
  structureLost() {
    if (!this.on || !this.throttle('structureLost', 600)) return;
    this.tone({ type: 'triangle', freq: 392, freqEnd: 247, attack: 0.01, decay: 0.3, vol: 0.07 });
  }

  // Pozo lleno y se tira otra: "tuc" apagado + susurro de aire, sin castigo.
  overflowReject() {
    if (!this.on || !this.throttle('overflowReject', 200)) return;
    this.tone({ type: 'sine', freq: 180, freqEnd: 110, attack: 0.005, decay: 0.12, vol: 0.2 });
    this.burst({ type: 'bandpass', freq: 900, freqEnd: 400, q: 0.8, attack: 0.02, decay: 0.14, vol: 0.14 });
    this.tone({ type: 'triangle', freq: 330, freqEnd: 260, attack: 0.01, decay: 0.1, vol: 0.06, when: 0.06 });
  }

  // La leña abandonada vuelve al estante: whoosh corto ascendente y "plop" de apoyo.
  logReturn() {
    if (!this.on || !this.throttle('logReturn', 120)) return;
    this.burst({ buf: this.brown, type: 'bandpass', freq: 300, freqEnd: 900, q: 0.9, attack: 0.06, decay: 0.2, vol: 0.25 });
    this.tone({ type: 'sine', freq: 300, freqEnd: 520, attack: 0.005, decay: 0.08, vol: 0.1, when: 0.22 });
  }

  // Agrandar el pozo (size 1..7): piedras que se acomodan, rugido grave; más épico cuanto más grande.
  pitGrow(size = 1) {
    if (!this.on) return;
    const k = Math.min(1, size / 7);
    // Piedras: golpes secos escalonados.
    const stones = 3 + Math.min(5, size);
    for (let i = 0; i < stones; i++) {
      const w = 0.35 + i * 0.09 + Math.random() * 0.03;
      this.tone({ freq: 140 - 40 * k + Math.random() * 20, freqEnd: 55, attack: 0.003, decay: 0.16, vol: 0.28, when: w });
      this.burst({ type: 'lowpass', freq: 900, decay: 0.05, vol: 0.3, when: w });
    }
    // Rugido grave que crece.
    const len = 1.0 + 0.9 * k;
    this.tone({ freq: 90, freqEnd: 42, attack: 0.08, decay: len, vol: 0.35 });
    this.burst({ buf: this.brown, type: 'lowpass', freq: 200, freqEnd: 900, attack: 0.3, decay: len, vol: 0.5 + 0.2 * k });
    // Remate brillante a partir de tamaño 3.
    if (size >= 3) {
      [262, 330, 392, 523].forEach((f, i) => this.tone({ type: 'triangle', freq: f, decay: 0.6, vol: 0.1, when: 0.9 + i * 0.07 }));
    }
    if (size >= 6) this.levelUp(1);
  }

  thunder() {
    if (!this.on) return;
    this.burst({ buf: this.brown, type: 'lowpass', freq: 600, freqEnd: 80, attack: 0.05, decay: 2.5, vol: 0.9 });
  }
}
