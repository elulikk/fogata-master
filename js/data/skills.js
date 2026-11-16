// Árbol de habilidades: al subir de nivel ganás puntos y los gastás cuando quieras.
// Para sumar una habilidad alcanza con una entrada:
// - branch y row ubican el nodo; requires: { habilidad: nivel } lo abre; cost: puntos por nivel.
// - effects: ver data/mods.js. Lo que no es un número (el sabueso) lo lee quien lo usa (data/supply.js).

import { HEAT } from '../utils/heat.js';

export const BRANCHES = [
  { id: 'fuego', name: 'Fuego', icon: '🔥' },
  { id: 'lena', name: 'Leña', icon: '🪵' },
  { id: 'oficio', name: 'Oficio', icon: '🪓' },
  { id: 'chispa', name: 'Chispas', icon: '💫' },
  { id: 'noche', name: 'Intemperie', icon: '🌙' },
];

export const SKILLS = {
  calor: { branch: 'fuego', row: 0, col: 0, icon: HEAT, name: 'Brasas generosas', desc: '+15% de calor por nivel.', max: 8, cost: 1, effects: { calor: 0.15 } },
  tiraje: { branch: 'fuego', row: 1, col: 0, icon: '💨', name: 'Buen tiraje', desc: '+10% de aire por nivel: más llama.', max: 5, cost: 1, requires: { calor: 2 }, effects: { draft: 0.1 } },
  yesca: { branch: 'fuego', row: 1, col: 1, icon: '✨', name: 'Yesca', desc: 'La leña prende más rápido y con menos calor.', max: 4, cost: 1, requires: { calor: 1 }, effects: { warm: 0.8, ignite: 0.92 } },
  lecho: { branch: 'fuego', row: 2, col: 1, icon: '🌫️', name: 'Lecho cálido', desc: 'El lecho de brasas suma +0,5 calor/s por nivel.', max: 4, cost: 1, requires: { yesca: 1 }, effects: { ashHeat: 0.5 } },
  incendio: { branch: 'fuego', row: 2, col: 0, icon: '🌋', name: 'Incendio', desc: 'Cada leño ardiendo desde el 3.º sube el calor 5%.', max: 3, cost: 2, requires: { tiraje: 2 }, effects: { blaze: 0.05 } },
  combustion: { branch: 'fuego', row: 3, col: 0, icon: '☄️', name: 'Combustión', desc: '+25% de calor, pero la leña dura 10% menos.', max: 3, cost: 3, requires: { incendio: 2 }, effects: { calor: 0.25, fuelMult: 0.9 } },
  fogonero: { branch: 'fuego', row: 3, col: 1, icon: '🧑‍🚒', name: 'Fogonero', desc: 'El bonus de tamaño llega con menos pozo lleno.', max: 2, cost: 3, requires: { lecho: 2 }, effects: { fillThreshold: -0.12 } },

  curada: { branch: 'lena', row: 0, col: 0, icon: '🪵', name: 'Leña bien curada', desc: 'La leña dura 15% más por nivel.', max: 5, cost: 1, effects: { fuel: 0.15 } },
  brasas: { branch: 'lena', row: 1, col: 0, icon: '🟠', name: 'Brasas tercas', desc: 'Las brasas duran 30% más por nivel.', max: 5, cost: 1, requires: { curada: 1 }, effects: { embers: 0.3 } },
  piedras: { branch: 'lena', row: 2, col: 0, icon: '🪨', name: 'Piedras refractarias', desc: 'El lecho de brasas se enfría 30% más lento.', max: 4, cost: 1, requires: { brasas: 1 }, effects: { bedDecay: 0.7 } },
  hueco_rama: { branch: 'lena', row: 1, col: 1, icon: '🌿', name: 'Lugar para ramas', desc: '+1 rama en cada fogata que las acepte.', max: 4, cost: 1, requires: { curada: 1 }, effects: { slotRama: 1 } },
  hueco_lena: { branch: 'lena', row: 2, col: 1, icon: '🪵', name: 'Lugar para leña', desc: '+1 leña en cada fogata que la acepte.', max: 3, cost: 2, requires: { hueco_rama: 2 }, effects: { slotLena: 1 } },
  hueco_tronco: { branch: 'lena', row: 3, col: 1, icon: '🌳', name: 'Lugar para troncos', desc: '+1 tronco en cada fogata que los acepte.', max: 2, cost: 3, requires: { hueco_lena: 2 }, effects: { slotTronco: 1 } },
  resina: { branch: 'lena', row: 3, col: 0, icon: '🍯', name: 'Resina', desc: 'La leña dura 10% más y las entregas traen más piñas.', max: 4, cost: 1, requires: { piedras: 1 }, effects: { fuel: 0.1, pinas: 0.25 } },

  regateo: { branch: 'oficio', row: 0, col: 0, icon: '🤝', name: 'Regateo', desc: 'Pyroshop te cobra 10% menos por nivel.', max: 4, cost: 1, effects: { discount: 0.9 } },
  cantera: { branch: 'oficio', row: 1, col: 0, icon: '⛏️', name: 'Cantera', desc: 'Agrandar una fogata cuesta 10% menos por nivel.', max: 3, cost: 1, requires: { regateo: 1 }, effects: { enlargeCost: 0.9 } },
  chimenea: { branch: 'oficio', row: 2, col: 0, icon: '🏠', name: 'Buen armado', desc: 'Las fogatas con los tres cortes rinden 50% más de su bonus.', max: 3, cost: 2, requires: { cantera: 1 }, effects: { structureBonus: 0.5 } },
  tributo: { branch: 'oficio', row: 3, col: 0, icon: '🎖️', name: 'Tributo', desc: 'Al subir de nivel, el fuego regala 12 s de calor.', max: 3, cost: 3, requires: { chimenea: 1 }, effects: { tribute: 12 } },
  sabueso: { branch: 'oficio', row: 1, col: 1, icon: '🐕', name: 'Sabueso', desc: 'Un perro te trae leña cada tanto.', max: 3, cost: 1, requires: { regateo: 1 } },
  canasta: { branch: 'oficio', row: 2, col: 1, icon: '🧺', name: 'Ojo de leñador', desc: 'Cada entrega trae 15% más leña.', max: 5, cost: 1, requires: { sabueso: 1 }, effects: { loot: 0.15 } },
  botas: { branch: 'oficio', row: 3, col: 1, icon: '🥾', name: 'Paso firme', desc: 'Las entregas llegan 15% más seguido.', max: 4, cost: 1, requires: { canasta: 1 }, effects: { helperEvery: 0.85 } },

  chispazos: { branch: 'chispa', row: 0, col: 0, icon: '💫', name: 'Chispas de la suerte', desc: 'Salen 30% más chispazos.', max: 5, cost: 1, effects: { orbs: 0.3 } },
  iman: { branch: 'chispa', row: 1, col: 0, icon: '🧲', name: 'Manos rápidas', desc: 'Juntás chispazos desde 40% más lejos.', max: 3, cost: 1, requires: { chispazos: 1 }, effects: { magnet: 0.4 } },
  cadena: { branch: 'chispa', row: 2, col: 0, icon: '⛓️', name: 'Chispa en cadena', desc: 'Juntar seguido sube el valor de cada chispazo.', max: 3, cost: 2, requires: { iman: 1 }, effects: { comboCap: 0.1 } },
  pulmones: { branch: 'chispa', row: 3, col: 0, icon: '🪗', name: 'Pulmones de acero', desc: 'El fuelle sopla 30% más fuerte.', max: 4, cost: 1, requires: { cadena: 1 }, effects: { bellows: 0.3 } },

  lluvia: { branch: 'noche', row: 0, col: 0, icon: '☂️', name: 'Piel curtida', desc: 'La lluvia afecta 20% menos a tus fogatas.', max: 4, cost: 1, effects: { rainResist: 0.2 } },
  secado: { branch: 'noche', row: 1, col: 0, icon: '♨️', name: 'Secado al calor', desc: 'La madera húmeda se seca 40% más rápido.', max: 4, cost: 1, requires: { lluvia: 1 }, effects: { dry: 0.4 } },
  vigilia: { branch: 'noche', row: 2, col: 0, icon: '🌙', name: 'Vigilia', desc: 'Las noches piden 12% menos y el frío llega más lento.', max: 3, cost: 2, requires: { secado: 1 }, effects: { nightEase: 0.88, coldSlow: 0.2 } },
};

// ¿Están cumplidos los requisitos del nodo?
export function skillOpen(d, id) {
  return Object.entries(SKILLS[id].requires || {}).every(([req, lvl]) => (d.arbol[req] || 0) >= lvl);
}

// Puntos: uno por nivel subido, más los que regalan los amaneceres, menos los gastados.
export function skillPoints(d) {
  const spent = Object.entries(d.arbol).reduce((sum, [id, n]) => sum + n * (SKILLS[id]?.cost || 0), 0);
  return (d.level | 0) - 1 + (d.extraPoints | 0) - spent;
}

export function canLearn(d, id) {
  const s = SKILLS[id];
  return !!s && skillOpen(d, id) && (d.arbol[id] || 0) < s.max && skillPoints(d) >= s.cost;
}

// Qué le falta al nodo para abrirse: "Yesca nivel 1".
export function skillNeeds(d, id) {
  return Object.entries(SKILLS[id].requires || {})
    .filter(([req, lvl]) => (d.arbol[req] || 0) < lvl)
    .map(([req, lvl]) => `${SKILLS[req].name} nivel ${lvl}`);
}
