// Lo que se compra (al mercachifle) y lo que se construye.
// Cada ítem aparece recién cuando se cumple `requires`, así el juego se abre de a poco.
// cost(nivel) devuelve { calor, tronco? }. `max` es cuántas veces se puede comprar.
// `market: true`: consumible con precio de mercado: cost recibe la demanda (sube al comprar y baja sola).
// `tab: 'pila'`: se compra desde el + de la pila, no aparece en los paneles.
// `goal`: orden en que el objetivo de arriba sugiere comprarlo (menor = antes).

import { SIZES, MAX_SIZE, canFit, hearthPerks, sizeOf } from './sizes.js';
import { SPECIES, SPECIES_ORDER, CUTS, CUT_ORDER, woodKey } from './woods.js';

const grow = (base, k, n) => Math.round(base * Math.pow(k, n));
// Con la demanda el precio sube de a poco y se frena en ×3: no es una trampa, es un motivo para no comprar de golpe.
const soft = (base, k, n) => Math.round(base * Math.min(3, Math.pow(k, n)));

// Segundos en que la demanda de un consumible baja un punto.
export const MARKET_RECOVER = 15;

const bestHearth = (s) => Math.max(...s.pits.map((p) => p.size | 0));
export const woodOpen = (s, sp) => s.unlocked.tienda && bestHearth(s) >= SPECIES[sp].hearth;

const sizeInfo = (n) => {
  const z = SIZES[Math.min(MAX_SIZE, n)];
  return `${z.tipis} ${z.tipis > 1 ? 'tipis' : 'tipi'} · calor ×${z.mult}`;
};

const unitPrice = (sp, cut) => CUTS[cut].bundle * CUTS[cut].price * SPECIES[sp].price;
const buyableSpecies = SPECIES_ORDER.filter((sp) => Number.isFinite(SPECIES[sp].hearth));

// Comprar del + de la pila: un manojo de un tamaño de una especie.
const pileItems = () => buyableSpecies.flatMap((sp) => CUT_ORDER.map((cut) => ({
  id: `wood_${sp}_${cut}`, tab: 'pila', market: true, key: woodKey(sp, cut), bundle: CUTS[cut].bundle,
  requires: (s) => woodOpen(s, sp),
  cost: (n) => ({ calor: soft(unitPrice(sp, cut), 1.08, n) }),
  apply: (g) => g.state.add(woodKey(sp, cut), CUTS[cut].bundle),
  effect: () => ({ label: CUTS[cut].plural, before: '—', after: `+${CUTS[cut].bundle}` }),
  icon: '🪵', name: `${CUTS[cut].plural} de ${SPECIES[sp].name.toLowerCase()}`, desc: '',
})));

// Atado de cada especie: un manojo de cada tamaño, algo más barato que por separado.
const ATADO_OFF = 0.85;
const atados = () => buyableSpecies.map((sp) => {
  const name = SPECIES[sp].name;
  const price = CUT_ORDER.reduce((sum, c) => sum + unitPrice(sp, c), 0) * ATADO_OFF;
  const what = CUT_ORDER.map((c) => `+${CUTS[c].bundle} ${CUTS[c].bundle > 1 ? CUTS[c].plural : CUTS[c].name.toLowerCase()}`).join(', ');
  return {
    id: `pack_${sp}`, tab: 'tienda', market: true, icon: '🪵', name: `Atado de ${name.toLowerCase()}`,
    effect: () => ({ label: name, before: '—', after: what }),
    desc: `${what}. ${SPECIES[sp].desc}`,
    requires: (s) => woodOpen(s, sp),
    cost: (n) => ({ calor: soft(price, 1.08, n) }),
    apply: (g) => { for (const c of CUT_ORDER) g.state.add(woodKey(sp, c), CUTS[c].bundle); },
  };
});

export const SHOP = [
  ...atados(),
  ...pileItems(),
  {
    id: 'fosforos', tab: 'tienda', market: true, icon: '📦', name: 'Caja de fósforos',
    effect: () => ({ label: 'Fósforos', before: '—', after: '+4' }),
    desc: '+4 fósforos. Si te sobran, el mercachifle no los ofrece.',
    requires: (s) => s.unlocked.tienda && (s.res.fosforo || 0) < 5, // si te sobran, no se ofrece
    cost: (n) => ({ calor: soft(15, 1.12, n) }),
    apply: (g) => g.state.add('fosforo', 4),
  },
  {
    id: 'fuelle', tab: 'tienda', icon: '🪗', name: 'Fuelle',
    effect: () => ({ label: 'Fuelle', before: '—', after: 'activo' }),
    desc: 'Mantené apretado sobre una fogata prendida para soplarla: más llama, más calor, revive brasas.',
    max: 1, goal: 8,
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 170,
    cost: () => ({ calor: 120 }),
  },
  {
    id: 'pinas', tab: 'tienda', market: true, icon: '🌰', name: 'Bolsa de piñas',
    effect: () => ({ label: 'Piñas', before: '—', after: '+3' }),
    desc: '+3 piñas: prenden al toque y largan una llamarada.',
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 1100 && (s.res.pina || 0) < 8, // si te sobran, no se ofrece
    cost: (n) => ({ calor: soft(50, 1.1, n) }),
    apply: (g) => g.state.add('pina', 3),
  },

  // --- Construir ---
  {
    id: 'ayudante', tab: 'construir', icon: '🪓', name: 'Leñador',
    effect: (n) => ({ label: 'Entrega de leña', before: n ? `cada ${Math.round(30 / (1 + 0.25 * (n - 1)))} s` : '—', after: `cada ${Math.round(30 / (1 + 0.25 * n))} s` }),
    desc: 'Te trae leña a la pila sin que tengas que comprarla, hasta que la pila se llena. Cada nivel viene más seguido.',
    max: 5, goal: 2,
    requires: (s) => s.unlocked.construir,
    cost: (n) => ({ calor: grow(320, 1.7, n) }),
  },
  {
    id: 'hacha', tab: 'construir', icon: '🪓', name: 'Hacha para el leñador',
    effect: () => ({ label: 'Troncos por entrega', before: '0', after: 'hasta 1' }),
    desc: 'El leñador también te trae troncos.',
    max: 1, goal: 4,
    requires: (s) => s.bought.ayudante,
    cost: () => ({ calor: 450 }),
  },
  {
    id: 'canasta', tab: 'construir', icon: '🛒', name: 'Carretilla',
    effect: (n) => ({ label: 'Leña por entrega', before: `+${25 * n}%`, after: `+${25 * (n + 1)}%` }),
    desc: 'El leñador trae 25% más en cada entrega.',
    max: 3, goal: 6,
    requires: (s) => s.bought.ayudante,
    cost: (n) => ({ calor: grow(500, 2.1, n) }),
  },
  {
    id: 'lenera', tab: 'construir', icon: '🏚️', name: 'Leñera techada',
    effect: () => ({ label: 'Pila de leña', before: 'se moja, tope normal', after: 'seca, doble de tope' }),
    desc: 'La lluvia ya no moja tu pila de leña y el leñador la llena hasta el doble.',
    max: 1, goal: 5,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 450,
    cost: () => ({ calor: 380, tronco: 4 }),
  },
  {
    id: 'secadero', tab: 'construir', icon: '🧱', name: 'Secadero',
    effect: (n) => ({ label: 'Secado de húmeda', before: n ? `1 cada ${Math.round(14 / n)} s` : '—', after: `1 cada ${Math.round(14 / (n + 1))} s` }),
    desc: 'Seca de a poco la madera húmeda y la vuelve madera de pino. Cada nivel va más rápido.',
    max: 3, goal: 9,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 800,
    cost: (n) => ({ calor: grow(600, 1.7, n), tronco: 3 }),
  },
];

// Ítems que dependen de cada fogata construida.
export function pitItems(s) {
  const items = [];
  s.pits.forEach((pit, i) => {
    const label = s.pits.length > 1 ? ` · fogata ${i + 1}` : '';
    const size = Math.min(MAX_SIZE, pit.size || 0);
    const next = SIZES[size + 1];
    items.push({
      id: `techo_${i}`, tab: 'construir', icon: '🛖', name: `Techo${label}`,
      desc: 'La lluvia no le cae a esta fogata. Cuesta más cuanto más grande es.',
      max: 1, pit: i, goal: 3 + 4 * i,
      effect: () => ({ label: 'Lluvia sobre la fogata', before: 'moja', after: 'protegida' }),
      requires: () => s.unlocked.construir && !hearthPerks(size).covered, // una chimenea ya la protege
      cost: () => ({ calor: Math.round(220 * (1 + i * 1.5) * (1 + 0.9 * size)), tronco: 3 + size }),
    });
    items.push({
      id: `agrandar_${i}`, tab: 'construir', icon: '🔨',
      name: next ? `Evolucionar a ${next.name}${label}` : `${SIZES[size].name}: al máximo${label}`,
      desc: next ? `${next.perk?.text || ''}${next.burn > SIZES[size].burn ? ' Quema la leña más rápido.' : ''}`.trim() : 'No hay nada más grande… por ahora.',
      max: MAX_SIZE, pit: i, goal: 1 + 9 * i,
      effect: (n) => ({ label: `${sizeOf(n).name} → ${sizeOf(n + 1).name}`, before: sizeInfo(n), after: sizeInfo(n + 1) }),
      // Se ofrece poco antes de poder pagarlo. Las fogatas 2 y 3 ya cumplieron esto al evolucionar la primera.
      requires: () => s.unlocked.construir && (!next || s.totalCalor >= Math.max(520, next.cost.calor * 0.9)),
      // Motivo por el que no se puede comprar ahora (la tienda lo muestra), o null.
      blocked: () => {
        if (size >= MAX_SIZE) return null;
        const sizes = s.pits.map((p, j) => (j === i ? size + 1 : p.size || 0));
        return canFit(sizes).reason;
      },
      cost: (n) => {
        const c = sizeOf(n + 1).cost;
        return { calor: Math.round(c.calor * (1 + i * 0.5)), tronco: c.tronco, enlarge: true };
      },
    });
  });
  if (s.pits.length < 3) {
    const i = s.pits.length;
    items.push({
      id: `fogata_${i}`, tab: 'construir', icon: '🔥', name: i === 1 ? 'Nueva fogata' : 'Tercera fogata',
      desc: 'Otro pozo de piedras. Más fogatas, más calor.',
      max: 1, goal: i === 1 ? 3 : 12,
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
