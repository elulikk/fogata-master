// Desbloqueos graduales: el juego arranca casi vacío y se va abriendo.
// Cada hito se cumple una sola vez y puede mostrar un aviso.

// `at`: calor total que lo abre (`when` lo reemplaza si hay otra condición). `goal`: cómo lo anuncia
// el objetivo de arriba: 'early' va antes que las compras y 'late' después. `reveal`: lo que muestra en la interfaz.
export const MILESTONES = [
  {
    id: 'calor', at: 2, reveal: ['hud-calor'],
    toast: 'Tu fogata da calor. El calor es tu moneda: juntalo.',
  },
  {
    id: 'tienda', at: 15, when: (s, g) => s.totalCalor >= 15 || (s.totalCalor >= 4 && g.woodStock() <= 1), reveal: ['btn-shop'],
    goal: 'early', what: 'abre Pyroshop, que vende leña', icon: '🛒',
    toast: 'Abrió Pyroshop: te vende leña a cambio de calor. También podés tocar el + de la pila.',
  },
  {
    id: 'construir', at: 40, reveal: ['btn-build'],
    goal: 'early', what: 'podés evolucionar la fogata', icon: '🔨',
    toast: 'Ya podés construir: evolucioná la fogata para que entre leña.',
  },
  {
    id: 'habilidades', at: 120, reveal: ['level', 'btn-tree'],
    goal: 'early', what: 'se abre el árbol de habilidades', icon: '🌳',
    toast: 'Se abrió el árbol de habilidades: al subir de nivel ganás puntos y los gastás cuando quieras.',
  },
  {
    id: 'clima', at: 450,
    toast: 'Se está nublando… desde ahora puede llover. Mirá el pronóstico arriba.',
  },
  {
    id: 'viento', at: 1600,
    goal: 'late', what: 'empieza a soplar el viento', icon: '💨',
    toast: 'Empieza a soplar viento: aviva el fuego, pero lo consume más rápido.',
  },
  {
    id: 'noches', at: 3000, reveal: ['btn-ashes'],
    goal: 'late', what: 'se abren las noches', icon: '🌙',
    toast: 'El día se acorta… la primera noche cae en unos 4 minutos. Aguantá el frío hasta el amanecer.',
  },
  {
    id: 'tormentas', at: 5500,
    goal: 'late', what: 'llegan las tormentas', icon: '⛈️',
    toast: 'Llegan las tormentas. Más vale tener todo techado.',
  },
];

export const milestoneDue = (m, data, state) => (m.when ? m.when(data, state) : data.totalCalor >= m.at);

// Calor total necesario para llegar a cada nivel (el nivel 2 es el primero).
// `ease` es mods.levelEase (meta y mejoras que facilitan subir).
// Los primeros niveles van a mano (EARLY); desde el 7 sigue 180×1.62^(n-2).
const EARLY = { 2: 120, 3: 300, 4: 560, 5: 900, 6: 1400 };
export function levelThreshold(level, ease = 1) {
  if (level <= 1) return 0;
  const base = EARLY[level] ?? 180 * Math.pow(1.62, level - 2);
  return Math.round(base * ease);
}

// Avance hacia el próximo nivel: { cur, need, pct } en calor.
export function levelProgress(data, ease = 1) {
  const from = levelThreshold(data.level, ease);
  const need = Math.max(1, levelThreshold(data.level + 1, ease) - from);
  const cur = Math.min(need, Math.max(0, data.totalCalor - from));
  return { cur, need, pct: cur / need };
}
