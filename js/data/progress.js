// Desbloqueos graduales: el juego arranca casi vacío y se va abriendo.
// Cada hito se cumple una sola vez y puede mostrar un aviso.

export const MILESTONES = [
  {
    id: 'calor',
    when: (s) => s.totalCalor >= 2,
    toast: 'Tu fogata da calor. El calor es tu moneda: juntalo.',
  },
  {
    id: 'bosque',
    when: (s, g) => s.totalCalor >= 30 || g.woodStock() <= 2,
    toast: 'Se te va a acabar la leña. Podés ir al bosque a buscar más.',
  },
  {
    id: 'chispazos',
    when: (s) => s.totalCalor >= 60,
    toast: 'Los chasquidos fuertes largan chispazos: pasá el mouse por arriba para juntarlos.',
  },
  {
    id: 'tienda',
    when: (s) => s.totalCalor >= 120,
    toast: 'Llegó un mercachifle. Te vende cosas a cambio de calor.',
  },
  {
    id: 'cartas',
    when: (s) => s.totalCalor >= 180,
    toast: null, // lo anuncia la primera subida de nivel
  },
  {
    id: 'clima',
    when: (s) => s.totalCalor >= 450,
    toast: 'Se está nublando… desde ahora puede llover. Mirá el pronóstico arriba.',
  },
  {
    id: 'construir',
    when: (s) => s.totalCalor >= 450,
    toast: 'Ya podés construir: techos, fogatas más grandes y más cosas.',
  },
  {
    id: 'viento',
    when: (s) => s.totalCalor >= 1600,
    toast: 'Empieza a soplar viento: aviva el fuego, pero lo consume más rápido.',
  },
  {
    id: 'noches',
    when: (s) => s.totalCalor >= 3000,
    toast: 'El día se acorta… la primera noche cae en unos 4 minutos. Aguantá el frío hasta el amanecer.',
  },
  {
    id: 'tormentas',
    when: (s) => s.totalCalor >= 5500,
    toast: 'Llegan las tormentas. Más vale tener todo techado.',
  },
];

// Calor total necesario para llegar a cada nivel (el nivel 2 es el primero).
// `ease` es mods.levelEase (meta y mejoras que facilitan subir).
// Los primeros niveles van más espaciados (EARLY); desde el 7 sigue 180×1.62^(n-2).
const EARLY = { 2: 260, 3: 520, 4: 850, 5: 1250, 6: 1650 };
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
