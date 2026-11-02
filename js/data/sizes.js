// Escala de tamaños de fogata (ciclo 4). Contrato compartido entre equipos:
// - progresión es dueña de los números (balance, costos, gating);
// - Pit.js lee la geometría (half, wallH, huella) y cuántos tipis entran;
// - Fire.js lee la escala de calor (hs), el aire y la inercia.
// Los tamaños 0–3 conservan el índice de las partidas viejas (bought.agrandar_i = size).

import { TIPI_AREA } from './woods.js';

// Ancho de terreno disponible para todos los pozos (px de huella sumada).
export const GROUND_BUDGET = 1000;

export const SIZES = [
  //  nombre         tipis  aire   half  wallH  mult  hs    costo (calor, troncos)
  { name: 'Fogatita',   tipis: 1, air: 1.00, half: 90,  wallH: 46, mult: 1.0, hs: 1.0, cost: null },
  { name: 'Fogata',     tipis: 1, air: 1.05, half: 100, wallH: 52, mult: 1.5, hs: 1.2, cost: { calor: 320, tronco: 1 } },
  { name: 'Fogón',      tipis: 1, air: 1.10, half: 112, wallH: 58, mult: 2.0, hs: 1.4, cost: { calor: 950, tronco: 2 } },
  { name: 'Hogar',      tipis: 2, air: 1.15, half: 126, wallH: 64, mult: 2.6, hs: 1.6, cost: { calor: 2000, tronco: 3 } },
  { name: 'Hoguera',    tipis: 2, air: 1.20, half: 142, wallH: 72, mult: 3.4, hs: 1.8, cost: { calor: 5500, tronco: 5 } },
  { name: 'Pira',       tipis: 2, air: 1.25, half: 160, wallH: 80, mult: 4.2, hs: 2.0, cost: { calor: 14000, tronco: 8 } },
  { name: 'Faro',       tipis: 3, air: 1.30, half: 180, wallH: 88, mult: 5.2, hs: 2.2, cost: { calor: 45000, tronco: 12 } },
  { name: 'Ceremonial', tipis: 3, air: 1.35, half: 205, wallH: 96, mult: 6.5, hs: 2.4, cost: { calor: 120000, tronco: 18 } },
];

export const MAX_SIZE = SIZES.length - 1;

export const sizeOf = (size) => SIZES[Math.max(0, Math.min(MAX_SIZE, size | 0))];

// Área de leña que llena un pozo de ese tamaño.
export const capacityOf = (size) => sizeOf(size).tipis * TIPI_AREA;

// Ancho que ocupa un pozo en el terreno (piedras y margen incluidos).
export const footprint = (size) => 2 * (sizeOf(size).half + 30);

// Bonus de la fogata armada, con leña en los tres anillos (lo pagan Fire/GameState). q = calidad 0..1.
// Tope total de calor: +30%.
export const STRUCTURE = {
  tipi:   { air: 0.30, ignite: 0.35, fuel: +0.10, calor: 0.28 }, // tira mucho, prende rápido, consume más
  calorCap: 0.30,
};

// Calor total aproximado en que cada tamaño "llega" (la tienda lo ofrece desde el 70%).
export const SIZE_AT = [0, 500, 1500, 4000, 10000, 25000, 60000, 150000];

// ¿Entran estos pozos (lista de tamaños) en el terreno? { ok, used, budget, reason }.
export function canFit(sizes) {
  const used = sizes.reduce((sum, s) => sum + footprint(s), 0);
  if (used <= GROUND_BUDGET) return { ok: true, used, budget: GROUND_BUDGET, reason: null };
  return {
    ok: false, used, budget: GROUND_BUDGET,
    reason: `No hay terreno: ocuparía ${used} de ${GROUND_BUDGET}. Achicá o quitá otra fogata.`,
  };
}
