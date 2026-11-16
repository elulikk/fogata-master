// Todo lo que se puede mejorar en el juego. Habilidades, mejoras de ceniza, logros y compras declaran
// `effects: { mod: valor }` y acá se resuelven igual: 'sum' acumula valor·nivel, 'mul' hace valor^nivel.
// Un efecto nuevo es una línea acá más su lectura donde tenga efecto.

export const MODS = {
  calor: [1, 'sum'], cosecha: [1, 'sum'], fuel: [1, 'sum'], fuelMult: [1, 'mul'], embers: [1, 'sum'],
  warm: [1, 'mul'], ignite: [1, 'mul'], draft: [1, 'sum'], orbs: [0.85, 'sum'], magnet: [1, 'sum'],
  loot: [1, 'sum'], pinas: [1, 'sum'], helperEvery: [1, 'mul'], pileCap: [1, 'sum'], discount: [1, 'mul'],
  dry: [1, 'sum'], bedDecay: [1, 'mul'], rainResist: [0, 'sum'], bellows: [1, 'sum'], levelEase: [1, 'mul'],
  comboCap: [1, 'sum'], ashHeat: [0, 'sum'], blaze: [0, 'sum'], tribute: [0, 'sum'], nightEase: [1, 'mul'],
  coldSlow: [1, 'sum'], ashBonus: [1, 'sum'], enlargeCost: [1, 'mul'], structureBonus: [1, 'sum'],
  fillThreshold: [0.4, 'sum'], orbValue: [1, 'sum'], orbPull: [0, 'sum'],
  slotRama: [0, 'sum'], slotLena: [0, 'sum'], slotTronco: [0, 'sum'],
};

export function emptyMods() {
  const m = {};
  for (const [k, [base]] of Object.entries(MODS)) m[k] = base;
  return m;
}

export function applyEffects(m, effects, level) {
  if (!effects || !(level > 0)) return;
  for (const [k, v] of Object.entries(effects)) {
    if (MODS[k][1] === 'sum') m[k] += v * level;
    else m[k] *= Math.pow(v, level);
  }
}
