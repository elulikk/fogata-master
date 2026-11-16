// De dónde sale la leña que no comprás, y quién atiende el fuego por vos. Cada proveedor es una entrada:
//   level(data, mods)    0 = no está activo; más = cuánto rinde.
//   every(level, mods)   segundos entre entregas.
//   ready(g)             opcional: si es false el contador espera (no hay nada que hacer).
//   run(g, level)        qué hace al cumplirse el tiempo. `g` es la escena.
//   label(level)         nombre en el HUD; sin label no se muestra.
// Para sumar un proveedor alcanza con agregar una entrada: la escena recorre esta lista sola.

import { WOODS, CUTS, CUT_ORDER, woodKey, rollSpecies } from './woods.js';
import { bestHearth, cutOpen } from './shop.js';

// Hasta cuántas piezas de cada tamaño dejan los proveedores en la pila. Comprando no hay tope.
// Es el contrapeso de la leña gratis: no se acumula sin límite, viene sobre todo de pino
// y una fogata grande igual hay que comprarla.
export const PILE_CAP = { rama: 6, lena: 6, tronco: 3 };
// Ramas del suelo: red para no quedar trabado sin leña ni calor.
const GROUND_TWIGS_UNDER = 3;
// Ceniza a partir de la cual el cuidador rastrilla.
const KEEPER_RAKES_AT = 0.9;

const twigs = (res) => Object.keys(WOODS).reduce((sum, k) => sum + (WOODS[k].cut === 'rama' ? res[k] || 0 : 0), 0);

// Entrega de leña: reparte entre las maderas que ya abrió tu mejor fogata y trae solo los cortes que tus fogatas aceptan.
export function rollDelivery(state, rain, scale = 1, rand = Math.random) {
  const d = state.data;
  const m = state.mods.loot * scale;
  const hearth = bestHearth(d);
  const loot = {};
  const addCut = (cut, n) => {
    if (!cutOpen(d, cut)) return;
    for (let i = 0, t = Math.round(n); i < t; i++) {
      const k = woodKey(rollSpecies(hearth, rand), cut);
      loot[k] = (loot[k] || 0) + 1;
    }
  };
  addCut('rama', (1 + rand() * 2) * m);
  if (rand() < 0.7) addCut('lena', (1 + rand()) * m);
  if (d.bought.hacha) addCut('tronco', (0.5 + rand()) * m);
  if (d.totalCalor >= 1000 && (d.res.pina || 0) < 8 && rand() < 0.3) loot.pina = Math.round((1 + rand() * 2) * m * state.mods.pinas);
  if ((d.res.fosforo || 0) < 3 && rand() < 0.25) loot.fosforo = 1;
  // Lo que ya sobra en la pila no se trae.
  for (const cut of CUT_ORDER) {
    const have = Object.keys(WOODS).reduce((sum, k) => sum + (WOODS[k].cut === cut && !WOODS[k].wet ? d.res[k] || 0 : 0), 0); // la húmeda no ocupa lugar: si no, frena las entregas
    let room = Math.max(0, Math.round(PILE_CAP[cut] * state.mods.pileCap) - have);
    for (const k of Object.keys(loot)) {
      if (WOODS[k]?.cut !== cut || WOODS[k].shape === 'cone') continue;
      const take = Math.min(room, loot[k]);
      room -= take;
      loot[k] = take;
    }
  }
  // Con lluvia, las ramas y la leña vienen mojadas.
  if (rain > 0.1) {
    for (const k of Object.keys(loot)) {
      const w = WOODS[k];
      if (!w || w.wet || w.shape === 'cone' || w.cut === 'tronco') continue;
      const wet = Math.round(loot[k] * rain * 0.5);
      if (wet <= 0) continue;
      loot[k] -= wet;
      const h = woodKey('humeda', w.cut);
      loot[h] = (loot[h] || 0) + Math.max(1, Math.round(wet / 2));
    }
  }
  return loot;
}

// La pieza más abundante de ese corte en la pila (sin piñas ni húmeda), o null.
function mostStocked(res, cut) {
  let best = null;
  let have = 0;
  for (const k of Object.keys(WOODS)) {
    const w = WOODS[k];
    if (w.cut === cut && w.shape !== 'cone' && !w.wet && (res[k] || 0) > have) { have = res[k]; best = k; }
  }
  return best;
}

// La fogata con tanta ceniza que el cuidador la rastrilla, o null.
const dirtyPit = (g) => g.pitObjs.find((p) => p.ash >= KEEPER_RAKES_AT) || null;

// Qué cargaría el cuidador ahora: la fogata prendida con más lugar libre de un corte que tengas en la pila.
// A igual lugar libre, primero lo más grueso.
function nextLoad(g) {
  let best = null;
  let bestFree = 0;
  for (const p of g.pitObjs) {
    if (!g.fire.pitIsLit(p)) continue;
    for (let tier = CUT_ORDER.length - 1; tier >= 0; tier--) {
      const slots = p.slotList.filter((s) => s.tier === tier);
      if (!slots.length) continue;
      const free = slots.filter((s) => !s.log).length / slots.length;
      const key = mostStocked(g.state.res, CUT_ORDER[tier]);
      if (free > bestFree && key) { bestFree = free; best = { key, pit: p }; }
    }
  }
  return best;
}

export const SUPPLIERS = [
  {
    id: 'suelo',
    level: () => 1,
    every: () => 8,
    ready: (g) => twigs(g.state.res) < GROUND_TWIGS_UNDER,
    run: (g) => g.giveLoot({ pino_rama: 1 }),
  },
  {
    id: 'lenador',
    level: (d) => d.bought.ayudante || 0,
    every: (n, m) => (30 / (1 + 0.25 * (n - 1))) * m.helperEvery,
    run: (g) => g.giveLoot(rollDelivery(g.state, g.weather.rain, 0.6)),
    label: (n) => `🪓 Leñador${n > 1 ? ` ×${n}` : ''}`,
  },
  {
    id: 'sabueso',
    level: (d) => d.arbol.sabueso || 0,
    every: (n, m) => (60 / (1 + 0.5 * (n - 1))) * m.helperEvery,
    run: (g) => g.giveLoot(rollDelivery(g.state, g.weather.rain, 0.4)),
    label: () => '🐕 Sabueso',
  },
  {
    id: 'cuidador',
    level: (d) => d.bought.cuidador || 0,
    every: (n) => 14 / (1 + 0.6 * (n - 1)),
    ready: (g) => !!dirtyPit(g) || !!nextLoad(g),
    run: (g) => {
      const dirty = dirtyPit(g);
      if (dirty) return g.rake(dirty);
      const load = nextLoad(g);
      if (load) g.dropInto(load.key, load.pit);
    },
    label: (n) => `🧤 Cuidador${n > 1 ? ` ×${n}` : ''}`,
  },
  {
    id: 'secadero',
    level: (d) => d.bought.secadero || 0,
    every: (n) => 14 / n,
    ready: (g) => CUT_ORDER.some((c) => g.state.res[woodKey('humeda', c)] > 0),
    run: (g) => {
      const wet = CUT_ORDER.find((c) => g.state.res[woodKey('humeda', c)] > 0);
      if (!wet) return;
      g.state.add(woodKey('humeda', wet), -1);
      g.state.add(woodKey('pino', wet), 1);
      g.pileText(`+1 ${CUTS[wet].name.toLowerCase()} seca`, '#e6c896');
    },
    label: () => '🧱 Secadero',
  },
];
