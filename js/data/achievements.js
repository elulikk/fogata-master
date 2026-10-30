// Logros: se ganan una vez para siempre (quedan en `meta.achievements`, sobreviven
// al prestigio) y dan una mejora chica permanente.
// `reward` suma a un bonus: calor, fuel (duración de leña), loot, orbs, discount
// (descuento) o ash (ceniza ganada). GameState.recompute los suma a los mods.
// `when(data)` mira el estado de la partida (`data.meta.stats` es de por vida).

const cardKinds = (s) => Object.keys(s.cards).length;
const boughtCount = (s) => Object.values(s.bought).reduce((a, b) => a + b, 0);

export const ACHIEVEMENTS = [
  { id: 'brasa', icon: '🔥', name: 'Brasa viva', desc: 'Juntá 1.000 de calor en una partida.', when: (s) => s.totalCalor >= 1000, reward: { calor: 0.01 } },
  { id: 'hoguera', icon: '🏕️', name: 'Hoguera', desc: 'Juntá 10.000 de calor en una partida.', when: (s) => s.totalCalor >= 10000, reward: { calor: 0.01 } },
  { id: 'infierno', icon: '🌋', name: 'Infierno', desc: 'Juntá 100.000 de calor en una partida.', when: (s) => s.totalCalor >= 100000, reward: { calor: 0.02 } },
  { id: 'nivel5', icon: '⭐', name: 'Aprendiz', desc: 'Llegá al nivel 5.', when: (s) => s.level >= 5, reward: { fuel: 0.01 } },
  { id: 'nivel10', icon: '🌟', name: 'Veterano', desc: 'Llegá al nivel 10.', when: (s) => s.level >= 10, reward: { fuel: 0.02 } },
  { id: 'nivel15', icon: '💫', name: 'Leyenda del fogón', desc: 'Llegá al nivel 15.', when: (s) => s.level >= 15, reward: { calor: 0.02 } },
  { id: 'viajero', icon: '🥾', name: 'Caminante', desc: 'Hacé 10 viajes al bosque.', when: (s) => s.trips >= 10, reward: { loot: 0.02 } },
  { id: 'explorador', icon: '🧭', name: 'Conocedor del monte', desc: 'Hacé 50 viajes al bosque.', when: (s) => s.trips >= 50, reward: { loot: 0.03 } },
  { id: 'hallazgos', icon: '🎒', name: 'Ojo atento', desc: 'Vivé 5 eventos del bosque.', when: (s) => (s.meta.stats.forestEvents || 0) >= 5, reward: { loot: 0.02 } },
  { id: 'cartas8', icon: '🃏', name: 'Coleccionista', desc: 'Tené 8 cartas distintas.', when: (s) => cardKinds(s) >= 8, reward: { discount: 0.01 } },
  { id: 'comprador', icon: '🛒', name: 'Cliente habitual', desc: 'Hacé 15 compras en la tienda y en construir.', when: (s) => boughtCount(s) >= 15, reward: { discount: 0.01 } },
  { id: 'dos-fogatas', icon: '🔥', name: 'Doble fuego', desc: 'Construí una segunda fogata.', when: (s) => s.pits.length >= 2, reward: { calor: 0.01 } },
  { id: 'pozo-grande', icon: '🪨', name: 'Pozo mayor', desc: 'Agrandá una fogata al máximo.', when: (s) => s.pits.some((p) => p.size >= 3), reward: { calor: 0.01 } },
  { id: 'primer-amanecer', icon: '🌅', name: 'Primer amanecer', desc: 'Sobreviví una noche.', when: (s) => s.meta.totalDawns >= 1, reward: { ash: 0.05 } },
  { id: 'cinco-amaneceres', icon: '🌄', name: 'Noctámbulo', desc: 'Sobreviví 5 noches en total.', when: (s) => s.meta.totalDawns >= 5, reward: { ash: 0.05 } },
  { id: 'renacido', icon: '🪦', name: 'Renacido', desc: 'Hacé tu primer prestigio.', when: (s) => s.meta.prestiges >= 1, reward: { calor: 0.02 } },
  { id: 'chispero', icon: '💫', name: 'Cazachispas', desc: 'Juntá 100 chispazos en total.', when: (s) => (s.meta.stats.orbs || 0) >= 100, reward: { orbs: 0.03 } },
  { id: 'chispero2', icon: '✨', name: 'Tormenta de chispas', desc: 'Juntá 500 chispazos en total.', when: (s) => (s.meta.stats.orbs || 0) >= 500, reward: { orbs: 0.03 } },
  { id: 'ritmo10', icon: '⚡', name: 'A todo fuego', desc: 'Alcanzá 10 calor/s.', when: (s) => (s.meta.stats.maxRate || 0) >= 10, reward: { calor: 0.01 } },
];

export const REWARD_TEXT = {
  calor: 'calor', fuel: 'duración de la leña', loot: 'leña del bosque',
  orbs: 'chispazos', discount: 'descuento', ash: 'ceniza ganada',
};

// "+1% calor" para mostrar en el aviso del logro.
export function rewardLabel(a) {
  const [k, v] = Object.entries(a.reward)[0];
  return `+${Math.round(v * 100)}% ${REWARD_TEXT[k]}`;
}
