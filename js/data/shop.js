// Lo que se compra (al mercachifle) y lo que se construye.
// Cada ítem aparece recién cuando se cumple `requires`, así el juego se abre de a poco.
// cost(nivel) devuelve { calor, tronco? }. `max` es cuántas veces se puede comprar.

import { SIZES, SIZE_AT, MAX_SIZE, canFit } from './sizes.js';
import { SPECIES, woodKey } from './woods.js';

const grow = (base, k, n) => Math.round(base * Math.pow(k, n));
// Consumibles: el precio sube con las compras pero se frena en ×3 (no son una trampa).
const soft = (base, k, n) => Math.round(base * Math.min(3, Math.pow(k, n)));

const sizeInfo = (n) => {
  const z = SIZES[Math.min(MAX_SIZE, n)];
  return `${z.tipis} ${z.tipis > 1 ? 'tipis' : 'tipi'} · aire ×${z.air.toFixed(2)} · calor ×${z.mult}`;
};

// Qué tamaños suman lugares para la leña.
const STRUCT_UNLOCK = { 3: 'Hogar: entra un segundo tipi, con seis lugares más.', 6: 'Faro: entra un tercer tipi.' };

// Atados de cada especie: aparecen cuando el bosque ya la da.
const PACK_PRICE = { lenga: 45, rauli: 90, roble: 180, quebracho: 360 };
const packs = () => Object.entries(PACK_PRICE).map(([sp, price]) => {
  const name = SPECIES[sp].name;
  return {
    id: `pack_${sp}`, tab: 'tienda', icon: '🪵', name: `Atado de ${name.toLowerCase()}`,
    effect: () => ({ label: name, before: '—', after: '+2 leñas, +1 tronco' }),
    desc: `+2 leñas y +1 tronco. ${SPECIES[sp].desc}`,
    requires: (s) => s.unlocked.tienda && s.totalCalor >= SPECIES[sp].from,
    cost: (n) => ({ calor: soft(price, 1.1, n) }),
    apply: (g) => { g.state.add(woodKey(sp, 'lena'), 2); g.state.add(woodKey(sp, 'tronco'), 1); },
  };
});

export const SHOP = [
  {
    id: 'fosforos', tab: 'tienda', icon: '📦', name: 'Caja de fósforos',
    effect: () => ({ label: 'Fósforos', before: '—', after: '+4' }),
    desc: '+4 fósforos. Si te sobran, el mercachifle no los ofrece.',
    requires: (s) => s.unlocked.tienda && (s.res.fosforo || 0) < 5, // si te sobran, no se ofrece
    cost: (n) => ({ calor: soft(15, 1.12, n) }),
    apply: (g) => g.state.add('fosforo', 4),
  },
  {
    id: 'ramas', tab: 'tienda', icon: '🌿', name: 'Atado de ramas',
    effect: () => ({ label: 'Ramas', before: '—', after: '+8' }),
    desc: '+8 ramas de pino: prenden enseguida.',
    requires: (s) => s.unlocked.tienda,
    cost: (n) => ({ calor: soft(10, 1.1, n) }),
    apply: (g) => g.state.add('pino_rama', 8),
  },
  {
    id: 'seca', tab: 'tienda', icon: '🪵', name: 'Leña de pino',
    effect: () => ({ label: 'Leña de pino', before: '—', after: '+3' }),
    desc: '+3 leñas de pino: arden fuerte y prenden troncos.',
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 140,
    cost: (n) => ({ calor: soft(28, 1.1, n) }),
    apply: (g) => g.state.add('pino_lena', 3),
  },
  {
    id: 'troncos', tab: 'tienda', icon: '🪵', name: 'Troncos',
    effect: () => ({ label: 'Troncos', before: '—', after: '+2' }),
    desc: '+2 troncos de pino.',
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 200,
    cost: (n) => ({ calor: soft(35, 1.1, n) }),
    apply: (g) => g.state.add('pino_tronco', 2),
  },
  ...packs(),
  {
    id: 'fuelle', tab: 'tienda', icon: '🪗', name: 'Fuelle',
    effect: () => ({ label: 'Fuelle', before: '—', after: 'activo' }),
    desc: 'Mantené apretado sobre una fogata prendida para soplarla: más llama, más calor, revive brasas.',
    max: 1,
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 170,
    cost: () => ({ calor: 120 }),
  },
  {
    id: 'hacha', tab: 'tienda', icon: '🪓', name: 'Hacha',
    effect: () => ({ label: 'Troncos por viaje', before: 'pocos', after: '+1 a 3' }),
    desc: 'Cada viaje al bosque trae troncos.',
    max: 1,
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 240,
    cost: () => ({ calor: 160 }),
  },
  {
    id: 'canasta', tab: 'tienda', icon: '🧺', name: 'Canasta',
    effect: (n) => ({ label: 'Leña por viaje', before: `+${50 * n}%`, after: `+${50 * (n + 1)}%` }),
    desc: 'Traés 50% más leña de cada viaje.',
    max: 3,
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 300,
    cost: (n) => ({ calor: grow(90, 2.3, n) }),
  },
  {
    id: 'botas', tab: 'tienda', icon: '🥾', name: 'Botas de monte',
    effect: (n) => ({ label: 'Duración del viaje', before: `${Math.round((Math.pow(0.8, n) - 1) * 100)}%`, after: `${Math.round((Math.pow(0.8, n + 1) - 1) * 100)}%` }),
    desc: 'Los viajes al bosque son 20% más rápidos.',
    max: 3,
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 450,
    cost: (n) => ({ calor: grow(140, 2.3, n) }),
  },
  {
    id: 'pinas', tab: 'tienda', icon: '🌰', name: 'Bolsa de piñas',
    effect: () => ({ label: 'Piñas', before: '—', after: '+3' }),
    desc: '+3 piñas: prenden al toque y largan una llamarada.',
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 1100 && (s.res.pina || 0) < 8, // si te sobran, no se ofrece
    cost: (n) => ({ calor: soft(50, 1.1, n) }),
    apply: (g) => g.state.add('pina', 3),
  },

  // --- Construir ---
  {
    id: 'lenera', tab: 'construir', icon: '🏚️', name: 'Leñera techada',
    effect: () => ({ label: 'Pila de leña', before: 'se moja', after: 'seca' }),
    desc: 'La lluvia ya no moja tu pila de leña (las ramas y la leña que se mojan se vuelven madera húmeda).',
    max: 1,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 450,
    cost: () => ({ calor: 380, tronco: 4 }),
  },
  {
    id: 'secadero', tab: 'construir', icon: '🧱', name: 'Secadero',
    effect: (n) => ({ label: 'Secado de húmeda', before: n ? `1 cada ${Math.round(14 / n)} s` : '—', after: `1 cada ${Math.round(14 / (n + 1))} s` }),
    desc: 'Seca de a poco la madera húmeda y la vuelve madera de pino. Cada nivel va más rápido.',
    max: 3,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 800,
    cost: (n) => ({ calor: grow(600, 1.7, n), tronco: 3 }),
  },
  {
    id: 'ayudante', tab: 'construir', icon: '🧑‍🌾', name: 'Ayudante leñero',
    effect: (n) => ({ label: 'Viaje del ayudante', before: n ? `cada ${Math.round(30 / (1 + 0.5 * (n - 1)))} s` : '—', after: `cada ${Math.round(30 / (1 + 0.5 * n))} s` }),
    desc: 'Va solo al bosque cada tanto y te trae leña. Cada nivel va más seguido.',
    max: 5,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 1500,
    cost: (n) => ({ calor: grow(1100, 1.5, n) }),
  },
];

// Ítems que dependen de cada fogata construida.
export function pitItems(s) {
  const items = [];
  s.pits.forEach((pit, i) => {
    const label = s.pits.length > 1 ? ` · fogata ${i + 1}` : '';
    const size = Math.min(MAX_SIZE, pit.size || 0);
    items.push({
      id: `techo_${i}`, tab: 'construir', icon: '🛖', name: `Techo${label}`,
      desc: 'La lluvia no le cae a esta fogata. Cuesta más cuanto más grande es.',
      max: 1, pit: i,
      effect: () => ({ label: 'Lluvia sobre la fogata', before: 'moja', after: 'protegida' }),
      requires: () => s.unlocked.construir,
      cost: () => ({ calor: Math.round(220 * (1 + i * 1.5) * (1 + 0.9 * size)), tronco: 3 + size }),
    });
    items.push({
      id: `agrandar_${i}`, tab: 'construir', icon: '🪨',
      name: size >= MAX_SIZE ? `Tamaño máximo${label}` : `Agrandar a ${SIZES[size + 1].name}${label}`,
      desc: 'Más aire y más calor, pero un pozo grande pide más leña para rendir y ocupa terreno.' + (STRUCT_UNLOCK[size + 1] ? ' ' + STRUCT_UNLOCK[size + 1] : ''),
      max: MAX_SIZE, pit: i,
      effect: (n) => ({ label: `${SIZES[Math.min(n, MAX_SIZE)].name} → ${SIZES[Math.min(n + 1, MAX_SIZE)].name}`, before: sizeInfo(n), after: sizeInfo(n + 1) }),
      requires: () => s.unlocked.construir && s.totalCalor >= Math.max(520, SIZE_AT[Math.min(MAX_SIZE, size + 1)] * 0.55),
      // Motivo por el que no se puede comprar ahora (la tienda lo muestra), o null.
      blocked: () => {
        if (size >= MAX_SIZE) return null;
        const sizes = s.pits.map((p, j) => (j === i ? size + 1 : p.size || 0));
        return canFit(sizes).reason;
      },
      cost: (n) => {
        const c = SIZES[Math.min(MAX_SIZE, n + 1)].cost;
        return { calor: Math.round(c.calor * (1 + i * 0.5)), tronco: c.tronco, enlarge: true };
      },
    });
  });
  if (s.pits.length < 3) {
    const i = s.pits.length;
    items.push({
      id: `fogata_${i}`, tab: 'construir', icon: '🔥', name: i === 1 ? 'Nueva fogata' : 'Tercera fogata',
      desc: 'Otro pozo de piedras. Más fogatas, más calor.',
      max: 1,
      effect: () => ({ label: 'Fogatas', before: `${i}`, after: `${i + 1}` }),
      requires: () => s.unlocked.construir && s.totalCalor >= (i === 1 ? 900 : 4000),
      blocked: () => canFit([...s.pits.map((p) => p.size || 0), 0]).reason,
      cost: () => (i === 1 ? { calor: 900, tronco: 4 } : { calor: 3500, tronco: 8 }),
    });
  }
  return items;
}

export function allItems(s) {
  return [...SHOP, ...pitItems(s)];
}
