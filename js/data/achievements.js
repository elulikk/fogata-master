// Logros: se ganan una vez para siempre (quedan en `meta.achievements`, sobreviven a renacer)
// y dan una mejora chica permanente. `effects`: ver data/mods.js; `reward` es cómo se lo cuenta al jugador.
// `when(data)` mira el estado de la partida (`data.meta.stats` es de por vida).

const skillKinds = (s) => Object.keys(s.arbol || {}).length;
const boughtCount = (s) => Object.values(s.bought).reduce((a, b) => a + b, 0);
const hearth = (size) => (s) => s.pits.some((p) => p.size >= size);

export const ACHIEVEMENTS = [
  { id: 'brasa', icon: '🔥', name: 'Brasa viva', desc: 'Juntá 1.000 de calor en una partida.', reward: '+1% calor', effects: { calor: 0.01 }, when: (s) => s.totalCalor >= 1000 },
  { id: 'hoguera', icon: '🏕️', name: 'Hoguera', desc: 'Juntá 10.000 de calor en una partida.', reward: '+1% calor', effects: { calor: 0.01 }, when: (s) => s.totalCalor >= 10000 },
  { id: 'infierno', icon: '🌋', name: 'Infierno', desc: 'Juntá 100.000 de calor en una partida.', reward: '+2% calor', effects: { calor: 0.02 }, when: (s) => s.totalCalor >= 100000 },
  { id: 'nivel5', icon: '⭐', name: 'Aprendiz', desc: 'Llegá al nivel 5.', reward: '+1% duración de la leña', effects: { fuel: 0.01 }, when: (s) => s.level >= 5 },
  { id: 'nivel10', icon: '🌟', name: 'Veterano', desc: 'Llegá al nivel 10.', reward: '+2% duración de la leña', effects: { fuel: 0.02 }, when: (s) => s.level >= 10 },
  { id: 'nivel15', icon: '💫', name: 'Leyenda del fogón', desc: 'Llegá al nivel 15.', reward: '+2% calor', effects: { calor: 0.02 }, when: (s) => s.level >= 15 },
  { id: 'patron', icon: '🪓', name: 'Patrón', desc: 'Contratá un leñador.', reward: '+2% leña por entrega', effects: { loot: 0.02 }, when: (s) => (s.bought.ayudante || 0) >= 1 },
  { id: 'albanil', icon: '🧱', name: 'Albañil', desc: 'Levantá un Hogar.', reward: '+3% leña por entrega', effects: { loot: 0.03 }, when: hearth(3) },
  { id: 'herrero', icon: '🔨', name: 'Herrero', desc: 'Levantá una Fragua.', reward: '+2% calor', effects: { calor: 0.02 }, when: hearth(5) },
  { id: 'forjador', icon: '💠', name: 'Maestro forjador', desc: 'Levantá la Gran Forja.', reward: '+3% calor', effects: { calor: 0.03 }, when: hearth(7) },
  { id: 'estudioso', icon: '🌳', name: 'Estudioso', desc: 'Aprendé 8 habilidades distintas.', reward: '1% de descuento', effects: { discount: 0.99 }, when: (s) => skillKinds(s) >= 8 },
  { id: 'comprador', icon: '🛒', name: 'Cliente habitual', desc: 'Hacé 15 compras en Pyroshop y en construir.', reward: '1% de descuento', effects: { discount: 0.99 }, when: (s) => boughtCount(s) >= 15 },
  { id: 'doble', icon: '🔥', name: 'Doble fuego', desc: 'Construí una segunda fogata.', reward: '+1% calor', effects: { calor: 0.01 }, when: (s) => s.pits.length >= 2 },
  { id: 'amanecer', icon: '🌅', name: 'Primer amanecer', desc: 'Sobreviví una noche.', reward: '+5% ceniza', effects: { ashBonus: 0.05 }, when: (s) => s.meta.totalDawns >= 1 },
  { id: 'noctambulo', icon: '🌄', name: 'Noctámbulo', desc: 'Sobreviví 5 noches en total.', reward: '+5% ceniza', effects: { ashBonus: 0.05 }, when: (s) => s.meta.totalDawns >= 5 },
  { id: 'renacido', icon: '🪦', name: 'Renacido', desc: 'Renacé por primera vez.', reward: '+2% calor', effects: { calor: 0.02 }, when: (s) => s.meta.prestiges >= 1 },
  { id: 'chispero', icon: '💫', name: 'Cazachispas', desc: 'Juntá 100 chispazos en total.', reward: '+3% chispazos', effects: { orbs: 0.03 }, when: (s) => (s.meta.stats.orbs || 0) >= 100 },
  { id: 'chispero2', icon: '✨', name: 'Tormenta de chispas', desc: 'Juntá 500 chispazos en total.', reward: '+3% chispazos', effects: { orbs: 0.03 }, when: (s) => (s.meta.stats.orbs || 0) >= 500 },
  { id: 'armado', icon: '🛖', name: 'Buen armado', desc: 'Armá una fogata con casi todos sus lugares ocupados.', reward: '+1% calor', effects: { calor: 0.01 }, when: (s) => (s.meta.stats.structure90 || 0) >= 1 },
  { id: 'ritmo', icon: '⚡', name: 'A todo fuego', desc: 'Alcanzá 10 calor/s.', reward: '+1% calor', effects: { calor: 0.01 }, when: (s) => (s.meta.stats.maxRate || 0) >= 10 },
];

// "+1% calor" para mostrar en el aviso del logro.
export const rewardLabel = (a) => a.reward;
