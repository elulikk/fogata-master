// Prestigio "Cenizas": progreso permanente entre partidas.
// La ceniza se gana al amanecer (ver nights.js) y al hacer prestigio, y se gasta
// en estas mejoras. Prestigio reinicia la partida pero conserva `meta`
// (ceniza, mejoras, amaneceres totales, prestigios) y los ajustes.

const grow = (base, k, n) => Math.round(base * Math.pow(k, n));
const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}%`;

// Hitos que "atajo" deja desbloqueados al empezar de nuevo, por nivel de la mejora.
export const KEEP_UNLOCKS = [
  ['calor', 'bosque', 'chispazos'],
  ['tienda'],
  ['cartas'],
];

export const META = [
  {
    id: 'semilla', icon: '🌱', name: 'Semilla de leñador', desc: 'Empezás cada partida con más fósforos y troncos.', max: 5,
    cost: (n) => grow(3, 1.5, n),
    effect: (n) => ({ label: 'Al empezar', before: `+${4 * n} fósf. +${3 * n} troncos`, after: `+${4 * (n + 1)} fósf. +${3 * (n + 1)} troncos` }),
  },
  {
    id: 'cosecha', icon: '🌾', name: 'Cosecha de brasas', desc: '+8% de calor de todas las fogatas, para siempre.', max: 10,
    cost: (n) => grow(3, 1.45, n),
    effect: (n) => ({ label: 'Calor', before: pct(8 * n), after: pct(8 * (n + 1)) }),
  },
  {
    id: 'memoria', icon: '📜', name: 'Memoria de fogón', desc: 'Subir de nivel pide 6% menos calor.', max: 5,
    cost: (n) => grow(4, 1.6, n),
    effect: (n) => ({ label: 'Calor por nivel', before: pct((Math.pow(0.94, n) - 1) * 100), after: pct((Math.pow(0.94, n + 1) - 1) * 100) }),
  },
  {
    id: 'fiel', icon: '🧑‍💼', name: 'Cliente fiel', desc: 'El mercachifle te cobra 4% menos.', max: 5,
    cost: (n) => grow(4, 1.6, n),
    effect: (n) => ({ label: 'Precios', before: pct((Math.pow(0.96, n) - 1) * 100), after: pct((Math.pow(0.96, n + 1) - 1) * 100) }),
  },
  {
    id: 'abrigo', icon: '🧣', name: 'Abrigo', desc: 'Las noches piden 8% menos calor y el frío llega más lento.', max: 5,
    cost: (n) => grow(5, 1.6, n),
    effect: (n) => ({ label: 'Meta de la noche', before: pct((Math.pow(0.92, n) - 1) * 100), after: pct((Math.pow(0.92, n + 1) - 1) * 100) }),
  },
  {
    id: 'fortuna', icon: '🍀', name: 'Mano de ceniza', desc: '+10% de ceniza en cada amanecer y prestigio.', max: 5,
    cost: (n) => grow(6, 1.8, n),
    effect: (n) => ({ label: 'Ceniza ganada', before: pct(10 * n), after: pct(10 * (n + 1)) }),
  },
  {
    id: 'atajo', icon: '🧭', name: 'Camino conocido', desc: 'Empezás con parte de lo desbloqueado: bosque y chispazos, luego tienda, luego cartas.', max: 3,
    cost: (n) => grow(6, 2, n),
    effect: (n) => ({ label: 'Desbloqueado al empezar', before: ['nada', 'bosque y chispazos', '+ tienda'][n], after: ['bosque y chispazos', '+ tienda', '+ cartas'][n] }),
  },
  {
    id: 'olfato', icon: '👃', name: 'Olfato de chispa', desc: '+15% de chispazos y de su alcance.', max: 5,
    cost: (n) => grow(4, 1.5, n),
    effect: (n) => ({ label: 'Chispazos', before: pct(15 * n), after: pct(15 * (n + 1)) }),
  },
  {
    id: 'hogar', icon: '🏡', name: 'Hogar heredado', desc: 'Empezás cada partida con una fogata más grande.', max: 3,
    cost: (n) => grow(8, 2.2, n),
    effect: (n) => ({ label: 'Pozo inicial', before: ['Fogatita', 'Fogata', 'Fogón', 'Hogar'][n], after: ['Fogata', 'Fogón', 'Hogar', 'Hogar'][n] }),
  },
  {
    id: 'arquitecto', icon: '📐', name: 'Arquitecto', desc: '+15% al bonus de las estructuras.', max: 3,
    cost: (n) => grow(6, 1.8, n),
    effect: (n) => ({ label: 'Bonus de estructura', before: pct(15 * n), after: pct(15 * (n + 1)) }),
  },
  {
    id: 'canteraeterna', icon: '🪨', name: 'Cantera eterna', desc: 'Agrandar fogatas cuesta 5% menos.', max: 5,
    cost: (n) => grow(4, 1.5, n),
    effect: (n) => ({ label: 'Costo de agrandar', before: pct((Math.pow(0.95, n) - 1) * 100), after: pct((Math.pow(0.95, n + 1) - 1) * 100) }),
  },
];

export function freshMeta() {
  return {
    ash: 0, upgrades: {}, totalDawns: 0, prestiges: 0, totalAsh: 0,
    achievements: {},
    stats: { orbs: 0, forestEvents: 0, maxRate: 0 }, // de por vida
  };
}

// Ceniza que daría hacer prestigio ahora: 2,5·(calor/1000)^0,6 + 0,5 por amanecer.
// Referencia (sin bonos): 2.500 y 1 amanecer → 4; 6.000 y 2 → 8; 15.000 y 3 → 14;
// 50.000 y 5 → 29; 200.000 y 8 → 64 (un amanecer da 3, 4, 5…).
export function ashFromRun(totalCalor, mods, dawns = 0) {
  const base = 2.5 * Math.pow(Math.max(0, totalCalor) / 1000, 0.6) + 0.5 * dawns;
  return Math.floor(base * (mods?.ashBonus ?? 1));
}
