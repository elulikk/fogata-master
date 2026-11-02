// Estado de la partida: recursos, calor, desbloqueos, compras y cartas.
// Se guarda solo en localStorage.

import { freshNight, nightGoalNow, coldOf, NIGHT_PHASES } from '../data/nights.js';
import { META, KEEP_UNLOCKS, freshMeta, ashFromRun } from '../data/meta.js';
import { levelProgress } from '../data/progress.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { MAX_SIZE, STRUCTURE, BASE_CAPACITY, sizeOf } from '../data/sizes.js';
import { WOODS } from '../data/woods.js';
import { allItems } from '../data/shop.js';

const KEY = 'fogata-master-save-v1';
const VERSION = 3;
const CALOR_PER_INTENSITY = 2;

export const START_RES = { rama: 6, tronco: 2, seca: 0, humeda: 0, pina: 0, fosforo: 3 };
export const WOOD_KEYS = ['rama', 'seca', 'humeda', 'tronco', 'pina'];

function prefersReducedMotion() {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function fresh() {
  return {
    version: VERSION,
    res: { ...START_RES },
    calor: 0,
    totalCalor: 0,
    level: 1,
    unlocked: {},
    seenWood: { rama: true, tronco: true },
    bought: {},
    cards: {},
    pits: [{ size: 0, roof: false }],
    trips: 0,
    playTime: 0,
    settings: { volume: 0.8, muted: false, reduceMotion: prefersReducedMotion() },
    meta: freshMeta(),
    night: freshNight(),
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Mezcla `saved` sobre `base`: los objetos se unen clave por clave, lo demás se pisa.
function deepMerge(base, saved) {
  const out = { ...base };
  for (const [k, v] of Object.entries(saved || {})) {
    out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

// Lleva cualquier guardado (v1 o v2) a la forma actual.
function migrate(saved) {
  const data = deepMerge(fresh(), saved);
  const s = data.settings;
  s.volume = Math.min(1, Math.max(0, Number(s.volume) || 0));
  // v3: tamaños 0–7. Los pozos viejos (0–3) conservan su tamaño; solo se acota y se
  // sincroniza la compra de "agrandar" con el tamaño real.
  data.pits.forEach((p, i) => {
    p.size = Math.min(MAX_SIZE, Math.max(0, p.size | 0));
    if (p.size) data.bought[`agrandar_${i}`] = p.size;
    else delete data.bought[`agrandar_${i}`];
  });
  data.version = VERSION;
  return data;
}

export class GameState {
  constructor() {
    this.data = fresh();
    this.rate = 0; // calor/s suavizado: lo escribe la escena cada cuadro
    this.pendingSummary = null; // resumen a mostrar tras reiniciar la escena (no se guarda)
    this.sid = Math.random().toString(36).slice(2); // identifica esta pestaña
    this.lastSaved = 0;   // savedAt de lo último que leímos o escribimos
    this.locked = false;  // con true, save() no escribe (mientras se reinicia o importa)
    this.stale = false;   // otra pestaña guardó después: esta ya no pisa el guardado
    this.onStale = null;  // callback opcional para avisar en la UI
    this.recompute();
    try {
      window.addEventListener('storage', (e) => { if (e.key === KEY && e.newValue) this.markStale(); });
    } catch { /* sin window */ }
  }

  markStale() {
    if (this.stale) return;
    this.stale = true;
    this.onStale?.();
  }

  // Esta pestaña retoma el control: la próxima escritura pisa lo de la otra.
  takeOver() {
    this.stale = false;
    this.save(true);
  }

  load() {
    let ok = false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.data = migrate(JSON.parse(raw));
        this.lastSaved = this.data.savedAt || 0;
        ok = true;
      }
    } catch {
      // Sin guardado disponible: arranca de cero.
    }
    this.recompute();
    return ok;
  }

  // Devuelve true si escribió. No escribe si está bloqueado o si otra pestaña
  // guardó algo más nuevo desde que esta leyó (así no se pisan). Con `force` pisa igual.
  save(force = false) {
    if (this.locked || (this.stale && !force)) return false;
    try {
      const prev = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!force && prev && prev.session && prev.session !== this.sid && (prev.savedAt || 0) > this.lastSaved) {
        this.markStale();
        return false;
      }
      this.data.session = this.sid;
      this.data.savedAt = this.lastSaved = Date.now();
      localStorage.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch {
      // Navegador sin almacenamiento: se juega igual, sin guardar.
      return false;
    }
  }

  // Borra la partida. Los ajustes siempre se conservan; con `keepMeta` también
  // la ceniza y sus mejoras (prestigio) y la partida nueva arranca con sus bonos.
  wipe({ keepMeta = false } = {}) {
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
    this.lastSaved = 0;
    this.stale = false;
    const old = this.data;
    this.data = fresh();
    this.data.settings = old.settings;
    if (keepMeta) {
      this.data.meta = old.meta;
      this.applyRunStart();
    }
    this.recompute();
  }

  // Bonos de la meta al empezar una partida.
  applyRunStart() {
    const u = (id) => this.data.meta.upgrades[id] || 0;
    this.data.res.fosforo += 4 * u('semilla');
    this.data.res.tronco += 3 * u('semilla');
    const start = Math.min(3, u('hogar'));
    if (start) {
      this.data.pits[0].size = start;
      this.data.bought.agrandar_0 = start;
    }
    for (let i = 0; i < u('atajo'); i++) {
      for (const id of KEEP_UNLOCKS[i]) this.data.unlocked[id] = true;
    }
  }

  // Guardado como texto (base64 de JSON) para copiar o bajar.
  exportSave() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
  }

  // Carga un guardado exportado (o JSON crudo). Devuelve { ok, error? }.
  importSave(str) {
    try {
      const text = String(str || '').trim();
      let json;
      try { json = JSON.parse(text); } catch { json = JSON.parse(decodeURIComponent(escape(atob(text)))); }
      if (!isObj(json) || typeof json.totalCalor !== 'number' || !isObj(json.res)) {
        return { ok: false, error: 'El texto no parece un guardado de Fogata Master.' };
      }
      this.data = migrate(json);
      this.recompute();
      this.stale = false; // importar es una decisión explícita: manda sobre otra pestaña
      this.save(true);
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo leer el guardado.' };
    }
  }

  get res() { return this.data.res; }
  get unlocked() { return this.data.unlocked; }
  get bought() { return this.data.bought; }
  get cards() { return this.data.cards; }
  get pits() { return this.data.pits; }
  get meta() { return this.data.meta; }

  // Cenizas para mostrar en un resumen: lo ganado, el saldo disponible y el total de por vida.
  ashSummary() {
    return { ashAvail: this.data.meta.ash, ashTotal: this.data.meta.totalAsh };
  }

  // Revisa los logros; devuelve los recién ganados (y recalcula los mods).
  // La escena avisa cuando una estructura queda armada (type 'tipi' | 'cabana', quality 0..1).
  noteStructure(type, quality) {
    if (quality >= 0.9) this.data.meta.stats.structure90 = (this.data.meta.stats.structure90 || 0) + 1;
  }

  // Calor/s estimado de un pozo de tamaño `size` con carga `load` (fracción de su capacidad, 0..1,3),
  // con la mezcla típica seca+tronco. Sirve para mostrar en la tienda qué rinde agrandar.
  projectRate(size, load = 0.5) {
    const z = sizeOf(size);
    const m = this.mods;
    const area = (w) => w.length * w.thickness;
    const dens = (WOODS.seca.heat + WOODS.tronco.heat) / (area(WOODS.seca) + area(WOODS.tronco));
    const heat = Math.max(0, load) * BASE_CAPACITY * z.cap * dens * 0.85;
    const inten = Math.min(1.4 * (1 + 0.3 * (z.hs - 1)), heat / 3.5);
    const f = Math.min(1, Math.max(0, load) / (m.fillThreshold || 0.4));
    return inten * CALOR_PER_INTENSITY * m.base * (1 + (z.mult - 1) * f) * m.calor * m.cosecha;
  }

  // Próximo paso importante: { icon, text, progress (0..1 | null) } o null.
  // `ctx.rain` (0..1) deja avisar de la lluvia en pozos grandes.
  nextGoal(ctx = {}) {
    const d = this.data;
    const have = d.res;
    const pits = d.pits;
    if ((ctx.rain || 0) > 0.3 && pits.some((p) => (p.size || 0) >= 3 && !p.roof)) {
      return {
        icon: '🌧️',
        text: have.pina > 0 ? 'Llueve: en un pozo grande el fósforo no alcanza. Prendé con una piña.' : 'Llueve: en un pozo grande el fósforo no alcanza. Con techo o con piñas prende.',
        progress: null,
      };
    }
    const ORDER = ['agrandar_0', 'hacha', 'canasta', 'fogata_1', 'techo_0', 'lenera', 'botas', 'ayudante', 'secadero', 'agrandar_1', 'techo_1', 'agrandar_2', 'fogata_2'];
    const items = allItems(d).filter((it) => !it.apply && it.cost && (d.bought[it.id] || 0) < (it.max || 1) && it.requires?.(d));
    const rank = (it) => { const k = ORDER.indexOf(it.id); return k < 0 ? 99 : k; };
    items.sort((a, b) => rank(a) - rank(b));
    for (const it of items) {
      if (it.blocked?.()) continue;
      const lvl = d.bought[it.id] || 0;
      const p = this.price(it.cost(lvl));
      const needC = Math.max(0, p.calor - d.calor);
      const needT = Math.max(0, p.tronco - (have.tronco || 0));
      const name = it.name;
      if (!needC && !needT) return { icon: it.icon, text: `${name}: ya podés comprarlo.`, progress: 1 };
      const parts = [];
      if (needC) parts.push(`${Math.ceil(needC)} 🔥`);
      if (needT) parts.push(`${needT} 🪵`);
      let hint = '';
      if (needT) hint = d.bought.hacha ? ', el bosque los trae' : d.unlocked.tienda ? ', el Mercachifle los vende' : ', el bosque los trae';
      const frac = Math.min(p.calor ? d.calor / p.calor : 1, p.tronco ? (have.tronco || 0) / p.tronco : 1);
      return { icon: it.icon, text: `${name}: te faltan ${parts.join(' y ')}${hint}.`, progress: Math.max(0, Math.min(1, frac)) };
    }
    const NEXT = [[1600, 'viento', 'sopla el viento'], [2500, 'noches', 'se abren las noches'], [4500, 'tormentas', 'llegan las tormentas']];
    for (const [at, id, what] of NEXT) {
      if (!d.unlocked[id]) return { icon: '⏳', text: `Seguí hasta ${at} 🔥: ${what}.`, progress: Math.min(1, d.totalCalor / at) };
    }
    return null;
  }

  checkAchievements() {
    const got = this.data.meta.achievements;
    const fresh = ACHIEVEMENTS.filter((a) => !got[a.id] && a.when(this.data));
    for (const a of fresh) got[a.id] = true;
    if (fresh.length) this.recompute();
    return fresh;
  }
  get totalCalor() { return this.data.totalCalor; }

  add(key, n) {
    this.data.res[key] = Math.max(0, (this.data.res[key] || 0) + n);
    if (n > 0 && WOOD_KEYS.includes(key)) this.data.seenWood[key] = true;
  }

  gainCalor(n) {
    this.data.calor += n;
    this.data.totalCalor += n;
  }

  woodStock() {
    return WOOD_KEYS.reduce((sum, k) => sum + (this.data.res[k] || 0), 0);
  }

  price(cost) {
    return {
      calor: Math.ceil((cost.calor || 0) * this.mods.discount * (cost.enlarge ? this.mods.enlargeCost : 1)),
      tronco: cost.tronco || 0,
    };
  }

  canPay(cost) {
    const p = this.price(cost);
    return this.data.calor >= p.calor && this.data.res.tronco >= p.tronco;
  }

  pay(cost) {
    const p = this.price(cost);
    this.data.calor -= p.calor;
    this.data.res.tronco -= p.tronco;
  }

  // --- Nivel, ritmo de calor, noches y ceniza ---

  levelInfo() {
    return levelProgress(this.data, this.mods.levelEase);
  }

  // Calor/s de las fogatas. `pits` son los objetos Pit y `burning` la cantidad de
  // leños con llama. Con `detail` suma `parts`, el desglose que muestra la UI:
  // [{ id, label, text }]. Sin `detail` es barato (se llama en cada cuadro).
  // `structure[i]` = bonus de calor (0..0,2) que la escena saca de la estructura del pozo i.
  rateBreakdown(pits, burning = 0, detail = true, structure = []) {
    const m = this.mods;
    let raw = 0;
    let sized = 0;
    let bed = 0;
    let struct = 0;
    const capS = Math.min(0.30, STRUCTURE.calorCap * m.structureBonus);
    for (let k = 0; k < pits.length; k++) {
      const p = pits[k];
      const i = p.intensity * CALOR_PER_INTENSITY * m.base;
      const sb = Math.min(capS, Math.max(0, (structure[k] || 0) * m.structureBonus));
      raw += i;
      sized += i * p.calorMult * (1 + sb);
      struct += i * p.calorMult * sb;
      bed += p.bed * m.ashHeat;
    }
    const blaze = 1 + m.blaze * Math.min(4, Math.max(0, burning - 2));
    const total = (sized + bed) * m.calor * m.cosecha * blaze;
    if (!detail) return { total, parts: [] };

    const parts = [{ id: 'fuego', label: 'Fuego', text: `${raw.toFixed(1)}/s` }];
    const add = (id, label, mult) => {
      if (Math.abs(mult - 1) > 0.005) parts.push({ id, label, text: `${mult > 1 ? '+' : ''}${Math.round((mult - 1) * 100)}%` });
    };
    if (raw > 0) add('pozos', 'Pozos grandes', (sized - struct) / raw);
    if (struct > 0.005 && sized > struct) parts.push({ id: 'estructura', label: 'Estructura', text: `+${Math.round((struct / (sized - struct)) * 100)}%` });
    if (bed > 0.01) parts.push({ id: 'lecho', label: 'Lecho cálido', text: `+${bed.toFixed(1)}/s` });
    add('cartas', 'Cartas', m.calor);
    add('incendio', 'Incendio', blaze);
    add('cenizas', 'Cenizas', m.cosecha);
    return { total, parts };
  }

  // Estado de la noche para HUD, escena y efectos.
  // phase: 'off' | 'day' | 'dusk' | 'night'; pct = avance de la fase (0..1);
  // cold = 0..1 (0 día, sube de noche; 1 = a punto de perder).
  nightInfo() {
    const nt = this.data.night;
    const goal = nightGoalNow(nt, this.mods);
    const len = NIGHT_PHASES[nt.phase] || 1;
    return {
      phase: nt.phase,
      n: nt.n,
      tLeft: Math.max(0, len - nt.t),
      goal,
      pct: nt.phase === 'off' ? 0 : Math.min(1, nt.t / len),
      goalMet: this.rate >= goal,
      margin: goal > 0 ? this.rate / goal - 1 : 0, // >0: vas sobrado (el amanecer da más ceniza)
      cold: coldOf(nt),
      rate: this.rate,
      missing: Math.max(0, goal - this.rate), // "te faltan X/s"
      gust: nt.gustT > 0, // ráfaga helada en curso (la meta sube 15%)
    };
  }

  // Ceniza que daría un prestigio ahora.
  ashGain() {
    return ashFromRun(this.data.totalCalor, this.mods, this.data.night.dawns);
  }

  canPrestige() {
    return this.data.night.dawns >= 1;
  }

  metaLevel(id) { return this.data.meta.upgrades[id] || 0; }

  metaCost(id) {
    const up = META.find((u) => u.id === id);
    return up ? up.cost(this.metaLevel(id)) : Infinity;
  }

  // Compra una mejora de Cenizas. Devuelve true si se compró.
  buyMeta(id) {
    const up = META.find((u) => u.id === id);
    if (!up) return false;
    const lvl = this.metaLevel(id);
    const cost = up.cost(lvl);
    if (lvl >= up.max || this.data.meta.ash < cost) return false;
    this.data.meta.ash -= cost;
    this.data.meta.upgrades[id] = lvl + 1;
    this.recompute();
    return true;
  }

  addAsh(n) {
    this.data.meta.ash += n;
    this.data.meta.totalAsh += n;
  }

  // Multiplicadores que salen de las cartas, de lo comprado y de la meta.
  recompute() {
    const c = (id) => this.data.cards[id] || 0;
    const b = (id) => this.data.bought[id] || 0;
    const u = (id) => this.data.meta.upgrades[id] || 0;
    const ach = { calor: 0, fuel: 0, loot: 0, orbs: 0, discount: 0, ash: 0 };
    for (const a of ACHIEVEMENTS) {
      if (!this.data.meta.achievements[a.id]) continue;
      for (const [k, v] of Object.entries(a.reward)) ach[k] += v;
    }
    this.ach = ach;
    this.mods = {
      calor: 1 + 0.15 * c('calor') + 0.25 * c('combustion'),
      cosecha: 1 + 0.08 * u('cosecha') + ach.calor,
      fuel: (1 + 0.15 * c('duracion') + 0.1 * c('resina') + ach.fuel) * Math.pow(0.9, c('combustion')),
      embers: 1 + 0.3 * c('brasas'),
      warm: Math.pow(0.8, c('yesca')),
      ignite: Math.pow(0.92, c('yesca')),
      capacity: 1 + 0.2 * c('tiraje'),
      orbs: 0.85 * (1 + 0.3 * c('chispazos') + ach.orbs) * (1 + 0.15 * u('olfato')),
      magnet: (1 + 0.4 * c('iman')) * (1 + 0.15 * u('olfato')),
      loot: (1 + 0.25 * c('canasta') + ach.loot) * (1 + 0.5 * b('canasta')),
      pinas: 1 + 0.25 * c('resina'),
      trip: Math.pow(0.85, c('botas')) * Math.pow(0.8, b('botas')),
      discount: Math.pow(0.9, c('regateo')) * Math.pow(0.96, u('fiel')) * (1 - ach.discount),
      dry: 1 + 0.4 * c('secado'),
      bedDecay: Math.pow(0.7, c('piedras')),
      rainResist: Math.min(0.8, 0.2 * c('lluvia')),
      bellows: 1 + 0.3 * c('fuelle'),
      // Nuevos
      levelEase: Math.pow(0.94, u('memoria')),
      comboCap: 1 + 0.1 * c('chispa-en-cadena'), // techo ×1.3 con 3 cartas
      ashHeat: 0.5 * c('cenizas'),               // calor/s por lecho de brasas lleno
      blaze: 0.05 * c('incendio'),               // +5% por leño ardiendo desde el 3.º (hasta 4 extra)
      hound: c('sabueso'),
      tribute: 12 * c('tributo'),                // segundos de calor por nivel
      nightEase: Math.pow(0.88, c('vigilia')) * Math.pow(0.92, u('abrigo')),
      coldSlow: 1 + 0.2 * c('vigilia') + 0.1 * u('abrigo'),
      ashBonus: 1 + 0.1 * u('fortuna') + ach.ash,
      base: 1.1, // el fuego rinde 10% más; compensa bajar el peso de los chispazos
      enlargeCost: Math.pow(0.9, c('cantera')) * Math.pow(0.95, u('canteraeterna')),
      structureBonus: (1 + 0.5 * c('chimenea')) * (1 + 0.1 * u('arquitecto')),
      fillThreshold: 0.4 - 0.12 * c('fogonero'), // carga (fracción de la capacidad) que da el bonus de tamaño pleno
      startSize: Math.min(3, u('hogar')),
      peakSecs: 20, // fogata pico: segundos de calor que regala
    };
  }
}
