// Eventos del bosque: a veces un viaje (el tuyo, no el del ayudante) trae algo más.
// Son datos puros; GameScene los aplica en el viaje:
//   loot       { recurso: [mín, máx] } se suma a lo que traés (se redondea con `mods.loot`).
//   fosforos   [mín, máx] fósforos extra.
//   calorSecs  regalo de calor: tantos segundos de la producción actual.
//   lootScale  multiplica lo que traés ese viaje (menos de 1 es un mal evento).
//   dry        true: lo que traés no se moja con la lluvia en este viaje.

export const FOREST_EVENTS = [
  {
    id: 'arbol', icon: '🌲', name: 'Árbol caído', chance: 0.09, bad: false,
    text: 'Encontraste un árbol caído: troncos de sobra.',
    loot: { tronco: [2, 3] },
  },
  {
    id: 'claro', icon: '☀️', name: 'Claro soleado', chance: 0.08, bad: false,
    text: 'Un claro seco al sol: leña seca y sin una gota de humedad.',
    loot: { seca: [3, 4] }, dry: true,
  },
  {
    id: 'bau', icon: '🧰', name: 'Baúl viejo', chance: 0.04, bad: false,
    text: 'Un baúl olvidado: fósforos y unas brasas guardadas.',
    fosforos: [3, 5], calorSecs: 15,
  },
  {
    id: 'viajero', icon: '🧙', name: 'Viajero', chance: 0.03, bad: false,
    text: 'Un viajero comparte su calor contigo antes de seguir.',
    calorSecs: 40,
  },
  {
    id: 'colmena', icon: '🍯', name: 'Colmena', chance: 0.05, bad: false, requires: (s) => s.totalCalor >= 1000,
    text: 'Una colmena abandonada: piñas con resina.',
    loot: { pina: [2, 3] },
  },
  {
    id: 'zorro', icon: '🦊', name: 'Zorro ladrón', chance: 0.05, bad: true,
    text: 'Un zorro se llevó parte de tu leña.',
    lootScale: 0.6,
  },
];

// Sortea a lo sumo un evento. `s` es state.data; `rand` devuelve 0..1.
export function rollForestEvent(s, rand = Math.random) {
  let roll = rand();
  for (const ev of FOREST_EVENTS) {
    if (ev.requires && !ev.requires(s)) continue;
    if (roll < ev.chance) return ev;
    roll -= ev.chance;
  }
  return null;
}

// Convierte `ev.loot` y `ev.fosforos` en cantidades concretas.
export function forestEventLoot(ev, mult = 1, rand = Math.random) {
  const out = {};
  const pick = ([a, b]) => a + Math.floor(rand() * (b - a + 1));
  for (const [k, range] of Object.entries(ev.loot || {})) out[k] = Math.max(1, Math.round(pick(range) * mult));
  if (ev.fosforos) out.fosforo = pick(ev.fosforos);
  return out;
}
