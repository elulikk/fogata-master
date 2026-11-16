// Estado de la partida: recursos, calor, desbloqueos, compras y habilidades.
// Se guarda solo en localStorage.

import { freshNight, nightGoalNow, coldOf, NIGHT_PHASES } from '../data/nights.js';
import { META, KEEP_UNLOCKS, freshMeta, ashFromRun } from '../data/meta.js';
import { MILESTONES, levelProgress } from '../data/progress.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { MAX_SIZE, STRUCTURE, capacityOf, sizeOf, hearthPerks } from '../data/sizes.js';
import { WOODS } from '../data/woods.js';
import { allItems, itemsWithEffects } from '../data/shop.js';
import { SKILLS, canLearn } from '../data/skills.js';
import { emptyMods, applyEffects } from '../data/mods.js';
import { HEAT } from '../utils/heat.js';

// v2: árbol de habilidades y cupos por escalón. Los guardados de antes (con cartas) no se leen.
export const SAVE_KEY = 'fogata-master-save-v2';
const KEY = SAVE_KEY;
const VERSION = 6;
const CALOR_PER_INTENSITY = 2;

// Se arranca con ramas y un pedernal: el primer fuego lo prende el jugador (ver data/tutorial.js).
export const START_RES = { pino_rama: 6, pina: 0, fosforo: 0 };
export const WOOD_KEYS = Object.keys(WOODS);

function prefersReducedMotion() {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function fresh() {
  return {
    version: VERSION,
    res: { ...START_RES },
    tool: 'pedernal', // herramienta elegida en la barra (ver data/tools.js)
    tuto: 0,          // paso del tutorial (ver data/tutorial.js)
    dropped: 0,       // piezas de leña puestas en el fuego
    calor: 0,
    totalCalor: 0,
    level: 1,
    extraPoints: 0,   // puntos de habilidad que regalan los amaneceres
    arbol: {},        // habilidad -> nivel (ver data/skills.js)
    unlocked: {},
    seenWood: { pino: true },
    bought: {},
    demand: {}, // demanda de los consumibles: sube al comprar, baja sola (ver data/shop.js)
    pits: [{ size: 0, roof: false }],
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

// Lleva un guardado a la forma actual: completa lo que falte y acota los tamaños.
function migrate(saved) {
  const data = deepMerge(fresh(), saved);
  const s = data.settings;
  s.volume = Math.min(1, Math.max(0, Number(s.volume) || 0));
  data.pits.forEach((p, i) => {
    p.size = Math.min(MAX_SIZE, Math.max(0, p.size | 0));
    if (p.size) data.bought[`agrandar_${i}`] = p.size;
    else delete data.bought[`agrandar_${i}`];
  });
  for (const id of Object.keys(data.arbol)) if (!SKILLS[id]) delete data.arbol[id];
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
    this.add('fosforo', 4 * u('semilla'));
    this.add('pino_rama', 4 * u('semilla'));
    if (u('semilla')) this.data.unlocked.fosforo = true;
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
      if ((json.version || 1) < VERSION) return { ok: false, error: 'Ese guardado es de una versión anterior del juego.' };
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
  // con la mezcla típica leña+tronco. Sirve para mostrar en la tienda qué rinde agrandar.
  projectRate(size, load = 0.5) {
    const z = sizeOf(size);
    const m = this.mods;
    const area = (w) => w.length * w.thickness;
    const dens = (WOODS.lenga_lena.heat + WOODS.lenga_tronco.heat) / (area(WOODS.lenga_lena) + area(WOODS.lenga_tronco));
    const heat = Math.max(0, load) * capacityOf(size) * dens * 0.85;
    const inten = heat / 3.5;
    const f = Math.min(1, Math.max(0, load) / (m.fillThreshold || 0.4));
    return inten * CALOR_PER_INTENSITY * m.base * (1 + (z.mult / z.tipis - 1) * f) * m.calor * m.cosecha;
  }

  // Próximo hito de calor sin desbloquear de esa etapa ('early' | 'late'): { icon, text, progress } o null.
  nextMilestone(goal) {
    const d = this.data;
    for (const m of MILESTONES) {
      if (m.goal === goal && !d.unlocked[m.id]) return { icon: m.icon || '⏳', text: `Juntá ${m.at} ${HEAT}: ${m.what}.`, progress: Math.min(1, d.totalCalor / m.at) };
    }
    return null;
  }

  // Nivel con el que se calcula el precio de un ítem: la demanda si es de mercado, las compras si no.
  priceLevel(it) {
    return it.market ? this.data.demand[it.id] || 0 : this.data.bought[it.id] || 0;
  }

  // Próximo paso importante: { icon, text, progress (0..1 | null) } o null.
  // `ctx.rain` (0..1) deja avisar de la lluvia en pozos grandes.
  nextGoal(ctx = {}) {
    const d = this.data;
    const have = d.res;
    const pits = d.pits;
    if (!d.unlocked.calor) return null; // el tutorial manda al principio
    const early = this.nextMilestone('early');
    if (early) return early;
    if ((ctx.rain || 0) > 0.3 && pits.some((p) => (p.size || 0) >= 2 && !p.roof && !hearthPerks(p.size).covered)) {
      return {
        icon: '🌧️',
        text: have.pina > 0 ? 'Llueve: en un pozo grande el fósforo falla seguido. Prendé con una piña.' : 'Llueve: en un pozo grande el fósforo falla seguido. Con techo o con piñas prende.',
        progress: null,
      };
    }
    const items = allItems(d).filter((it) => !it.market && it.cost && (d.bought[it.id] || 0) < (it.max || 1) && it.requires?.(d));
    items.sort((a, b) => (a.goal ?? 99) - (b.goal ?? 99));
    for (const it of items) {
      if (it.blocked?.()) continue;
      const p = this.price(it.cost(d.bought[it.id] || 0));
      const need = Math.max(0, p.calor - d.calor);
      if (!need) return { icon: it.icon, text: `${it.name}: ya podés comprarlo.`, progress: 1 };
      return { icon: it.icon, text: `${it.name}: te faltan ${Math.ceil(need)} ${HEAT}.`, progress: Math.max(0, Math.min(1, p.calor ? d.calor / p.calor : 1)) };
    }
    return this.nextMilestone('late');
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
    if (n > 0 && WOODS[key]) this.data.seenWood[WOODS[key].species] = true;
  }

  gainCalor(n) {
    this.data.calor += n;
    this.data.totalCalor += n;
  }

  woodStock() {
    return WOOD_KEYS.reduce((sum, k) => sum + (this.data.res[k] || 0), 0);
  }

  price(cost) {
    return { calor: Math.ceil((cost.calor || 0) * this.mods.discount * (cost.enlarge ? this.mods.enlargeCost : 1)) };
  }

  canPay(cost) {
    return this.data.calor >= this.price(cost).calor;
  }

  pay(cost) {
    this.data.calor -= this.price(cost).calor;
  }

  // Gasta un punto de habilidad en ese nodo. Devuelve true si se pudo.
  spendPoint(id) {
    if (!canLearn(this.data, id)) return false;
    this.data.arbol[id] = (this.data.arbol[id] || 0) + 1;
    this.recompute();
    return true;
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
    add('habilidades', 'Habilidades', m.calor);
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

  // Todos los efectos del juego, de cualquier origen, se resuelven igual (ver data/mods.js):
  // habilidades, mejoras de ceniza, logros y compras declaran `effects`.
  recompute() {
    const d = this.data;
    const m = emptyMods();
    for (const [id, n] of Object.entries(d.arbol)) applyEffects(m, SKILLS[id]?.effects, n);
    for (const u of META) applyEffects(m, u.effects, d.meta.upgrades[u.id] || 0);
    for (const a of ACHIEVEMENTS) if (d.meta.achievements[a.id]) applyEffects(m, a.effects, 1);
    for (const it of itemsWithEffects()) applyEffects(m, it.effects, d.bought[it.id] || 0);
    // Lo que no sale directo de la tabla.
    m.fuel *= m.fuelMult;
    m.rainResist = Math.min(0.8, m.rainResist);
    m.nightEase *= Math.min(...d.pits.map((p) => hearthPerks(p.size).nightEase));
    m.base = 0.6;
    m.peakSecs = 20; // fogata pico: segundos de calor que regala
    m.extraSlots = [m.slotRama, m.slotLena, m.slotTronco]; // lugares de más por fogata, por corte
    this.mods = m;
  }
}
