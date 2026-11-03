// Escalera de evolución de la fogata. Para sumar un escalón alcanza con agregar una entrada acá
// (y su dibujo en gfx/hearths.js, si no reutiliza uno): tienda, ventajas, lugares y fuego salen de esta tabla.
// - look: dibujo (LOOKS de gfx/hearths.js); flame: paleta del fuego (data/flames.js).
// - tipis, air, half, wallH, margin: lugares y geometría; hs: inercia y luz; burn: qué tan rápido come la leña.
// - mult: cuánto rinde LLENA respecto de una Fogatita llena (ya cuenta los tipis de más).
// - perk: ventaja que suma este escalón y conservan los siguientes (ver PERK_RULES).
// Los índices 0–7 coinciden con el tamaño de las partidas viejas (bought.agrandar_i = size).

import { TIPI_AREA } from './woods.js';

// Ancho de terreno disponible para todos los pozos (px de huella sumada).
export const GROUND_BUDGET = 1000;

export const SIZES = [
  {
    id: 'fogatita', name: 'Fogatita', look: 'ronda', flame: 'fuego', cost: null,
    tipis: 1, air: 1.00, half: 90, wallH: 46, margin: 30, mult: 1.0, hs: 1.0, burn: 1.0,
  },
  {
    id: 'fogata', name: 'Fogata', look: 'pirca', flame: 'fuego', cost: { calor: 320, tronco: 1 },
    tipis: 1, air: 1.05, half: 100, wallH: 52, margin: 30, mult: 1.5, hs: 1.2, burn: 1.05,
    perk: { text: 'Piedras calzadas: las brasas duran más.', bedDecay: 0.8 },
  },
  {
    id: 'fogon', name: 'Fogón', look: 'parrilla', flame: 'fuego', cost: { calor: 950, tronco: 2 },
    tipis: 1, air: 1.10, half: 112, wallH: 58, margin: 34, mult: 2.0, hs: 1.4, burn: 1.15,
    perk: { text: 'Parrilla de hierro: la leña prende más rápido.', ignite: 0.8 },
  },
  {
    id: 'hogar', name: 'Hogar', look: 'chimenea', flame: 'fuego', cost: { calor: 2000, tronco: 3 },
    tipis: 2, air: 1.15, half: 126, wallH: 64, margin: 36, mult: 3.5, hs: 1.6, burn: 1.25,
    perk: { text: 'Chimenea de ladrillo: la lluvia no le llega, no hace falta techo.', covered: true },
  },
  {
    id: 'horno', name: 'Horno de barro', look: 'horno', flame: 'fuego', cost: { calor: 6000, tronco: 5 },
    tipis: 2, air: 1.20, half: 142, wallH: 72, margin: 44, mult: 4.5, hs: 1.8, burn: 1.0,
    perk: { text: 'El barro guarda el calor: gasta menos leña que el Hogar y el lecho casi no se enfría.', bedDecay: 0.6 },
  },
  {
    id: 'fragua', name: 'Fragua', look: 'fragua', flame: 'forja', cost: { calor: 20000, tronco: 8 },
    tipis: 2, air: 1.25, half: 160, wallH: 80, margin: 62, mult: 6.4, hs: 2.0, burn: 1.7,
    perk: { text: 'Fuelle propio: sopla sola y tira más, pero come leña. Abre el quebracho.', bellows: 0.3 },
  },
  {
    id: 'altohorno', name: 'Alto horno', look: 'altohorno', flame: 'forja', cost: { calor: 80000, tronco: 12 },
    tipis: 3, air: 1.30, half: 180, wallH: 88, margin: 62, mult: 10, hs: 2.2, burn: 1.8,
    perk: { text: 'Tiro alto: larga muchos más chispazos.', orbs: 1.6 },
  },
  {
    id: 'granforja', name: 'Gran Forja', look: 'granforja', flame: 'azul', cost: { calor: 300000, tronco: 18 },
    tipis: 3, air: 1.35, half: 205, wallH: 96, margin: 62, mult: 15, hs: 2.4, burn: 2.1,
    perk: { text: 'Fuego azul: su calor espanta el frío y las noches piden 20% menos.', nightEase: 0.8 },
  },
];

export const MAX_SIZE = SIZES.length - 1;

export const sizeOf = (size) => SIZES[Math.max(0, Math.min(MAX_SIZE, size | 0))];

// Cómo se acumula cada ventaja de la escalera: se multiplica, se suma o queda el mayor.
// Una ventaja nueva es una regla acá más su lectura donde tenga efecto.
const PERK_RULES = {
  bedDecay: (a = 1, b) => a * b,
  ignite: (a = 1, b) => a * b,
  orbs: (a = 1, b) => a * b,
  nightEase: (a = 1, b) => a * b,
  bellows: (a = 0, b) => Math.max(a, b),
  covered: (a, b) => a || b,
};
const NO_PERKS = { bedDecay: 1, ignite: 1, orbs: 1, nightEase: 1, bellows: 0, covered: false };

// Ventajas acumuladas de un escalón: las suyas y las de todos los de abajo.
export function hearthPerks(size) {
  const out = { ...NO_PERKS };
  for (const { perk } of SIZES.slice(0, SIZES.indexOf(sizeOf(size)) + 1)) {
    if (!perk) continue;
    for (const [k, merge] of Object.entries(PERK_RULES)) if (k in perk) out[k] = merge(out[k], perk[k]);
  }
  return out;
}

// Área de leña que llena un pozo de ese tamaño.
export const capacityOf = (size) => sizeOf(size).tipis * TIPI_AREA;

// Ancho que ocupa un pozo en el terreno (construcción y margen incluidos).
export const footprint = (size) => 2 * (sizeOf(size).half + sizeOf(size).margin);

// Bonus de la fogata armada, con leña de los tres tamaños (lo pagan Fire/GameState). q = calidad 0..1.
// Tope total de calor: +30%.
export const STRUCTURE = {
  tipi:   { air: 0.30, ignite: 0.35, fuel: +0.10, calor: 0.28 }, // tira mucho, prende rápido, consume más
  calorCap: 0.30,
};

// ¿Entran estos pozos (lista de tamaños) en el terreno? { ok, used, budget, reason }.
export function canFit(sizes) {
  const used = sizes.reduce((sum, s) => sum + footprint(s), 0);
  if (used <= GROUND_BUDGET) return { ok: true, used, budget: GROUND_BUDGET, reason: null };
  return {
    ok: false, used, budget: GROUND_BUDGET,
    reason: `No hay terreno: ocuparía ${used} de ${GROUND_BUDGET}. Tus fogatas no entran juntas.`,
  };
}
