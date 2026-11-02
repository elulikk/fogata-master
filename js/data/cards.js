// Cartas de mejora: cada vez que subís de nivel elegís 1 de 3.
// Se apilan hasta `max`. Las que tienen `apply` dan algo en el momento.
// `rarity`: 'comun' | 'rara' | 'epica'. `effect(n)` (n = nivel actual) devuelve
// { label, before, after } para mostrar qué cambia al elegirla.

export const RARITY_WEIGHT = { comun: 70, rara: 25, epica: 5 };

const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}%`;
// Efecto lineal: cada nivel suma `step` por ciento.
const lin = (label, step) => (n) => ({ label, before: pct(step * n), after: pct(step * (n + 1)) });
// Efecto que multiplica por `k` por nivel (se muestra como reducción o aumento).
const mul = (label, k) => (n) => ({
  label,
  before: pct((Math.pow(k, n) - 1) * 100),
  after: pct((Math.pow(k, n + 1) - 1) * 100),
});
const flag = (label) => () => ({ label, before: '—', after: 'activo' });

export const CARDS = [
  { id: 'calor', rarity: 'comun', icon: '🔥', name: 'Brasas generosas', desc: '+15% de calor de todas las fogatas.', max: 8, effect: lin('Calor', 15) },
  { id: 'duracion', rarity: 'comun', icon: '🪵', name: 'Leña bien curada', desc: 'La leña dura 15% más.', max: 5, effect: lin('Duración de la leña', 15) },
  { id: 'brasas', rarity: 'comun', icon: '🟠', name: 'Brasas tercas', desc: 'Las brasas duran 30% más.', max: 5, effect: lin('Duración de brasas', 30) },
  { id: 'yesca', rarity: 'comun', icon: '✨', name: 'Yesca', desc: 'La leña prende más rápido y con menos calor.', max: 4, effect: mul('Calor que pide para prender', 0.8) },
  { id: 'tiraje', rarity: 'rara', icon: '💨', name: 'Buen tiraje', desc: 'Las fogatas tiran mejor: 10% más de aire y más llama.', max: 5, effect: lin('Aire', 10) },
  { id: 'chispazos', rarity: 'comun', icon: '💫', name: 'Chispas de la suerte', desc: 'Salen 30% más chispazos.', max: 5, requires: (s) => s.unlocked.chispazos, effect: lin('Chispazos', 30) },
  { id: 'iman', rarity: 'comun', icon: '🧲', name: 'Manos rápidas', desc: 'Juntás chispazos desde más lejos.', max: 3, requires: (s) => s.unlocked.chispazos, effect: lin('Alcance', 40) },
  { id: 'canasta', rarity: 'comun', icon: '🧺', name: 'Ojo de leñador', desc: 'Traés 25% más leña del bosque.', max: 5, requires: (s) => s.unlocked.bosque, effect: lin('Leña del bosque', 25) },
  { id: 'botas', rarity: 'comun', icon: '🥾', name: 'Paso firme', desc: 'Los viajes al bosque son 15% más rápidos.', max: 4, requires: (s) => s.unlocked.bosque, effect: mul('Duración del viaje', 0.85) },
  { id: 'regateo', rarity: 'comun', icon: '🤝', name: 'Regateo', desc: 'El mercachifle te cobra 10% menos.', max: 4, requires: (s) => s.unlocked.tienda, effect: mul('Precios', 0.9) },
  { id: 'secado', rarity: 'comun', icon: '♨️', name: 'Secado al calor', desc: 'La madera húmeda se seca 40% más rápido.', max: 4, effect: lin('Velocidad de secado', 40) },
  { id: 'piedras', rarity: 'comun', icon: '🪨', name: 'Piedras refractarias', desc: 'El lecho de brasas se enfría 30% más lento.', max: 4, effect: mul('Enfriado del lecho', 0.7) },
  { id: 'lluvia', rarity: 'comun', icon: '☂️', name: 'Piel curtida', desc: 'La lluvia afecta 20% menos a tus fogatas.', max: 4, requires: (s) => s.unlocked.clima, effect: (n) => ({ label: 'Resistencia a la lluvia', before: pct(Math.min(80, 20 * n)), after: pct(Math.min(80, 20 * (n + 1))) }) },
  { id: 'fuelle', rarity: 'rara', icon: '🪗', name: 'Pulmones de acero', desc: 'El fuelle sopla 30% más fuerte.', max: 4, requires: (s) => s.bought.fuelle, effect: lin('Fuerza del fuelle', 30) },
  {
    id: 'cenizas', rarity: 'comun', icon: '🌫️', name: 'Lecho cálido', desc: 'El lecho de brasas de cada pozo suma calor.', max: 4,
    effect: (n) => ({ label: 'Calor por lecho (a pleno)', before: `+${(0.5 * n).toFixed(1)}/s`, after: `+${(0.5 * (n + 1)).toFixed(1)}/s` }),
  },
  { id: 'resina', rarity: 'comun', icon: '🍯', name: 'Resina', desc: 'La leña dura 10% más y el bosque da más piñas.', max: 4, requires: (s) => s.unlocked.bosque, effect: lin('Duración y piñas', 10) },
  {
    id: 'sabueso', rarity: 'comun', icon: '🐕', name: 'Sabueso', desc: 'Un perro te trae leña del bosque cada tanto.', max: 3, requires: (s) => s.unlocked.bosque,
    effect: (n) => ({ label: 'Viaje del sabueso', before: n ? `cada ${Math.round(60 / (1 + 0.5 * (n - 1)))} s` : '—', after: `cada ${Math.round(60 / (1 + 0.5 * n))} s` }),
  },
  {
    id: 'incendio', rarity: 'rara', icon: '🌋', name: 'Incendio', desc: 'Cada leño ardiendo de más (desde el 3.º) sube el calor 5%.', max: 3,
    effect: (n) => ({ label: 'Calor por leño extra', before: pct(5 * n), after: pct(5 * (n + 1)) }),
  },
  {
    id: 'vigilia', rarity: 'rara', icon: '🌙', name: 'Vigilia', desc: 'Las noches piden menos calor y el frío llega más lento.', max: 3, requires: (s) => s.unlocked.noches,
    effect: (n) => ({ label: 'Meta de la noche', before: pct((Math.pow(0.88, n) - 1) * 100), after: pct((Math.pow(0.88, n + 1) - 1) * 100) }),
  },
  {
    id: 'chispa-en-cadena', rarity: 'rara', icon: '⛓️', name: 'Chispa en cadena', desc: 'Juntar chispazos seguidos sube el valor de cada chispazo, hasta ×1.3.', max: 3, requires: (s) => s.unlocked.chispazos,
    effect: (n) => ({ label: 'Techo del combo', before: `×${(1 + 0.1 * n).toFixed(1)}`, after: `×${(1 + 0.1 * (n + 1)).toFixed(1)}` }),
  },
  {
    id: 'cantera', rarity: 'comun', icon: '⛏️', name: 'Cantera', desc: 'Agrandar una fogata cuesta 10% menos.', max: 3, requires: (s) => s.unlocked.construir,
    effect: mul('Costo de agrandar', 0.9),
  },
  {
    id: 'chimenea', rarity: 'rara', icon: '🏠', name: 'Chimenea', desc: 'Las fogatas armadas (leña en los tres anillos) rinden 50% más.', max: 3, requires: (s) => s.unlocked.construir,
    effect: lin('Bonus de estructura', 50),
  },
  {
    id: 'fogonero', rarity: 'epica', icon: '🧑‍🚒', name: 'Fogonero', desc: 'El bonus de tamaño llega con menos pozo lleno.', max: 2, requires: (s) => s.pits.some((p) => p.size >= 2),
    effect: (n) => ({ label: 'Relleno para el bonus pleno', before: `${Math.round((0.4 - 0.12 * n) * 100)}%`, after: `${Math.round((0.4 - 0.12 * (n + 1)) * 100)}%` }),
  },
  {
    id: 'combustion', rarity: 'epica', icon: '☄️', name: 'Combustión', desc: '+25% de calor, pero la leña dura 10% menos.', max: 3,
    effect: (n) => ({ label: 'Calor', before: pct(25 * n), after: pct(25 * (n + 1)) }),
  },
  {
    id: 'tributo', rarity: 'epica', icon: '🎖️', name: 'Tributo', desc: 'Cada vez que subís de nivel, el fuego te regala 12 segundos de calor.', max: 3,
    effect: (n) => ({ label: 'Calor por nivel', before: `${12 * n} s de calor`, after: `${12 * (n + 1)} s de calor` }),
  },
  {
    id: 'cera', rarity: 'comun', icon: '🕯️', name: 'Fósforos de cera', desc: '+4 fósforos ahora.', max: 3, effect: flag('+4 fósforos'),
    apply: (g) => g.state.add('fosforo', 4),
  },
  {
    id: 'regalo', rarity: 'comun', icon: '🎁', name: 'Leñador amigo', desc: '+3 troncos y +4 ramas ahora.', max: 3, effect: flag('+3 troncos, +4 ramas'),
    apply: (g) => { g.state.add('pino_tronco', 3); g.state.add('pino_rama', 4); },
  },
];

// Elige `count` cartas distintas. La rareza de cada una se sortea con peso
// (común 70 / rara 25 / épica 5) entre las rarezas que todavía tienen cartas.
export function rollCards(s, count = 3) {
  const pool = CARDS.filter((c) => (s.cards[c.id] || 0) < c.max && (!c.requires || c.requires(s)));
  const picked = [];
  while (picked.length < count && pool.length) {
    const avail = Object.keys(RARITY_WEIGHT).filter((r) => pool.some((c) => c.rarity === r));
    let roll = Math.random() * avail.reduce((sum, r) => sum + RARITY_WEIGHT[r], 0);
    let rarity = avail[avail.length - 1];
    for (const r of avail) {
      roll -= RARITY_WEIGHT[r];
      if (roll < 0) { rarity = r; break; }
    }
    const ofRarity = pool.filter((c) => c.rarity === rarity);
    const card = ofRarity[(Math.random() * ofRarity.length) | 0];
    pool.splice(pool.indexOf(card), 1);
    picked.push(card);
  }
  return picked;
}
