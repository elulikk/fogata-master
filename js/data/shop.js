// Lo que se compra en Pyroshop y lo que se construye. Se paga solo con calor.
// Cada ítem aparece recién cuando se cumple `requires`, así el juego se abre de a poco.
// cost(nivel) devuelve { calor }. `max` es cuántas veces se puede comprar.
// `market: true`: consumible con precio de mercado: cost recibe la demanda (sube al comprar y baja sola).
// `key`: madera que vende; también se compra desde el + de su casillero en la pila.
// `effects`: mejoras permanentes por nivel (ver data/mods.js). `effect(n)`: cómo se lo cuenta la tienda (antes → después).
// `goal`: orden en que el objetivo de arriba sugiere comprarlo (menor = antes).

import { SIZES, MAX_SIZE, canFit, hearthPerks, sizeOf } from './sizes.js';
import { SPECIES, SPECIES_ORDER, CUTS, CUT_ORDER, woodKey } from './woods.js';

const grow = (base, k, n) => Math.round(base * Math.pow(k, n));
// Con la demanda el precio sube de a poco y se frena en ×3: no es una trampa, es un motivo para no comprar de golpe.
const soft = (base, k, n) => Math.round(base * Math.min(3, Math.pow(k, n)));

// Segundos en que la demanda de un consumible baja un punto.
export const MARKET_RECOVER = 15;

export const bestHearth = (s) => Math.max(...s.pits.map((p) => p.size | 0));
// ¿Alguna fogata acepta este corte?
export const cutOpen = (s, cut) => s.pits.some((p) => sizeOf(p.size).slots[cut] > 0);
export const speciesOpen = (s, sp) => bestHearth(s) >= SPECIES[sp].hearth;
export const woodOpen = (s, sp, cut) => !!s.unlocked.tienda && cutOpen(s, cut) && speciesOpen(s, sp);

const x = (n) => `×${String(Number(n.toFixed(2)))}`;

// Cómo cambia la fogata al evolucionar: lo que cambia se muestra antes → después.
export function compareSizes(a, b) {
  const out = [];
  for (const cut of CUT_ORDER) {
    if (b.slots[cut] > 0) out.push({ label: `Lugares de ${CUTS[cut].plural}`, before: a.slots[cut] === b.slots[cut] ? '—' : `${a.slots[cut]}`, after: `${b.slots[cut]}` });
  }
  out.push({ label: 'Calor', before: x(a.mult), after: x(b.mult) });
  if (a.burn !== b.burn) out.push({ label: 'Consumo de leña', before: x(a.burn), after: x(b.burn) });
  if (a.tipis !== b.tipis) out.push({ label: 'Tipis', before: `${a.tipis}`, after: `${b.tipis}` });
  return out;
}

const unitPrice = (sp, cut) => CUTS[cut].bundle * CUTS[cut].price * SPECIES[sp].price;
const buyableSpecies = SPECIES_ORDER.filter((sp) => Number.isFinite(SPECIES[sp].hearth));
// Las ramas se venden de pocas especies: son la leña más barata y no conviene llenar la tienda con ellas.
export const TWIG_SPECIES = ['pino'];
const sold = (sp, cut) => cut !== 'rama' || TWIG_SPECIES.includes(sp);

// Un manojo de un corte de una especie. Solo se ofrecen los cortes que alguna fogata acepta.
const woodItems = () => buyableSpecies.flatMap((sp) => CUT_ORDER.filter((cut) => sold(sp, cut)).map((cut) => {
  const c = CUTS[cut];
  const what = c.bundle > 1 ? c.plural : c.name.toLowerCase();
  return {
    id: `wood_${sp}_${cut}`, tab: 'tienda', market: true, key: woodKey(sp, cut), bundle: c.bundle, icon: '🪵',
    name: `${what[0].toUpperCase()}${what.slice(1)} de ${SPECIES[sp].name.toLowerCase()}`, desc: SPECIES[sp].desc,
    requires: (s) => woodOpen(s, sp, cut),
    cost: (n) => ({ calor: soft(unitPrice(sp, cut), 1.08, n) }),
    apply: (g) => g.state.add(woodKey(sp, cut), c.bundle),
    effect: () => ({ label: c.plural, before: '—', after: `+${c.bundle}` }),
  };
}));

export const SHOP = [
  ...woodItems(),
  {
    id: 'fosforos', tab: 'tienda', market: true, icon: '📦', name: 'Caja de fósforos',
    effect: () => ({ label: 'Fósforos', before: '—', after: '+4' }),
    desc: '+4 fósforos: prenden al toque. Si te sobran, no se ofrecen.',
    requires: (s) => s.unlocked.tienda && (s.res.fosforo || 0) < 5,
    cost: (n) => ({ calor: soft(15, 1.12, n) }),
    apply: (g) => g.state.add('fosforo', 4),
  },
  {
    id: 'red_chispas', tab: 'tienda', icon: '🕸️', name: 'Red mágica de chispas',
    effect: (n) => ({ label: 'Valor de cada chispa', before: `+${30 * n}%`, after: `+${30 * (n + 1)}%` }),
    desc: 'Atrapa chispas desde lejos y las arrastra hacia el cursor. Cada nivel, más grande y cada chispa vale 30% más.',
    max: 4, goal: 1, effects: { magnet: 0.5, orbPull: 1, orbValue: 0.3 },
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 40,
    cost: (n) => ({ calor: grow(60, 2.6, n) }),
  },
  {
    id: 'pinas', tab: 'tienda', market: true, icon: '🌰', name: 'Bolsa de piñas',
    effect: () => ({ label: 'Piñas', before: '—', after: '+3' }),
    desc: '+3 piñas: prenden al toque y largan una llamarada.',
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 1100 && (s.res.pina || 0) < 8, // si te sobran, no se ofrece
    cost: (n) => ({ calor: soft(50, 1.1, n) }),
    apply: (g) => g.state.add('pina', 3),
  },
  {
    id: 'fuelle', tab: 'tienda', icon: '🪗', name: 'Fuelle',
    effect: () => ({ label: 'Fuelle', before: '—', after: 'herramienta nueva' }),
    desc: 'Herramienta: soplá una fogata prendida para más llama y calor. Revive las brasas.',
    max: 1, goal: 8,
    requires: (s) => s.unlocked.tienda && s.totalCalor >= 170,
    cost: () => ({ calor: 120 }),
  },

  // --- Construir ---
  {
    id: 'ayudante', tab: 'construir', icon: '🪓', name: 'Leñador',
    effect: (n) => ({ label: 'Entrega de leña', before: n ? `cada ${Math.round(30 / (1 + 0.25 * (n - 1)))} s` : '—', after: `cada ${Math.round(30 / (1 + 0.25 * n))} s` }),
    desc: 'Te trae leña a la pila sin que tengas que comprarla, hasta que la pila se llena. Cada nivel viene más seguido.',
    max: 5, goal: 2,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 250,
    cost: (n) => ({ calor: grow(320, 1.7, n) }),
  },
  {
    id: 'cuidador', tab: 'construir', icon: '🧤', name: 'Cuidador del fuego',
    effect: (n) => ({ label: 'Atiende el fuego', before: n ? `cada ${Math.round(14 / (1 + 0.6 * (n - 1)))} s` : '—', after: `cada ${Math.round(14 / (1 + 0.6 * n))} s` }),
    desc: 'Carga solo la leña de la pila en las fogatas prendidas y rastrilla la ceniza que las ahoga. Cada nivel, más seguido.',
    max: 3, goal: 7,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 1200,
    cost: (n) => ({ calor: grow(900, 2, n) }),
  },
  {
    id: 'hacha', tab: 'construir', icon: '🪓', name: 'Hacha para el leñador',
    effect: () => ({ label: 'Troncos por entrega', before: '0', after: 'hasta 1' }),
    desc: 'El leñador también te trae troncos.',
    max: 1, goal: 4,
    requires: (s) => s.bought.ayudante && cutOpen(s, 'tronco'),
    cost: () => ({ calor: 450 }),
  },
  {
    id: 'canasta', tab: 'construir', icon: '🛒', name: 'Carretilla',
    effect: (n) => ({ label: 'Leña por entrega', before: `+${25 * n}%`, after: `+${25 * (n + 1)}%` }),
    desc: 'El leñador trae 25% más en cada entrega.',
    max: 3, goal: 6, effects: { loot: 0.25 },
    requires: (s) => s.bought.ayudante,
    cost: (n) => ({ calor: grow(500, 2.1, n) }),
  },
  {
    id: 'lenera', tab: 'construir', icon: '🏚️', name: 'Leñera techada',
    effect: () => ({ label: 'Pila de leña', before: 'se moja, tope normal', after: 'seca, doble de tope' }),
    desc: 'La lluvia ya no moja tu pila de leña y el leñador la llena hasta el doble.',
    max: 1, goal: 5, effects: { pileCap: 1 },
    requires: (s) => s.unlocked.construir && s.totalCalor >= 450,
    cost: () => ({ calor: 550 }),
  },
  {
    id: 'secadero', tab: 'construir', icon: '🧱', name: 'Secadero',
    effect: (n) => ({ label: 'Secado de húmeda', before: n ? `1 cada ${Math.round(14 / n)} s` : '—', after: `1 cada ${Math.round(14 / (n + 1))} s` }),
    desc: 'Seca de a poco la madera húmeda y la vuelve madera de pino. Cada nivel va más rápido.',
    max: 3, goal: 9,
    requires: (s) => s.unlocked.construir && s.totalCalor >= 800,
    cost: (n) => ({ calor: grow(700, 1.7, n) }),
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
      requires: () => s.unlocked.clima && !hearthPerks(size).covered, // una chimenea ya la protege
      cost: () => ({ calor: Math.round(280 * (1 + i * 1.5) * (1 + 0.9 * size)) }),
    });
    items.push({
      id: `agrandar_${i}`, tab: 'construir', icon: '🔨',
      name: next ? `Evolucionar a ${next.name}${label}` : `${SIZES[size].name}: al máximo${label}`,
      desc: next ? next.perk?.text || '' : 'No hay nada más grande… por ahora.',
      max: MAX_SIZE, pit: i, goal: 1 + 9 * i,
      effect: (n) => ({ label: `${sizeOf(n).name} → ${sizeOf(n + 1).name}`, before: x(sizeOf(n).mult), after: x(sizeOf(n + 1).mult) }),
      // Se ofrece poco antes de poder pagarlo.
      requires: () => s.unlocked.construir && (!next || s.totalCalor >= next.cost * 0.5),
      // Motivo por el que no se puede comprar ahora (la tienda lo muestra), o null.
      blocked: () => {
        if (size >= MAX_SIZE) return null;
        const sizes = s.pits.map((p, j) => (j === i ? size + 1 : p.size || 0));
        return canFit(sizes).reason;
      },
      cost: (n) => ({ calor: Math.round(sizeOf(n + 1).cost * (1 + i * 0.5)), enlarge: true }),
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
      cost: () => ({ calor: i === 1 ? 1100 : 4500 }),
    });
  }
  return items;
}

export function allItems(s) {
  return [...SHOP, ...pitItems(s)];
}

// Ítems que dan efectos permanentes: los lee GameState.recompute.
export const itemsWithEffects = () => SHOP.filter((it) => it.effects);
