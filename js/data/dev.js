// Menú de desarrollo (F12 o el botón 🛠 arriba a la derecha). No va en el juego final: con DEV_ON en false desaparece.
// Cada botón es una entrada: { id, icon, name, run(g) } con `g` la escena. Una entrada con solo `section` es un título.

import { WOODS } from './woods.js';

export const DEV_ON = true;
const SPEEDS = [1, 4, 10];

export const DEV_ACTIONS = [
  { section: 'Recursos' },
  { id: 'calor', icon: '🔥', name: '+1.000 calor', run: (g) => g.state.gainCalor(1000) },
  { id: 'calor2', icon: '💰', name: '+100.000 calor', run: (g) => g.state.gainCalor(100000) },
  { id: 'lena', icon: '🪵', name: '+20 de cada leña', run: (g) => { for (const k of Object.keys(WOODS)) if (WOODS[k].shape !== 'cone') g.state.add(k, 20); } },
  { id: 'fosforos', icon: '📦', name: '+10 fósforos y piñas', run: (g) => { g.state.add('fosforo', 10); g.state.add('pina', 10); } },
  { id: 'ceniza', icon: '🪦', name: '+50 ceniza', run: (g) => g.state.addAsh(50) },
  { id: 'puntos', icon: '●', name: '+5 puntos de habilidad', run: (g) => { g.devUnlock('habilidades'); g.state.data.extraPoints += 5; } },
  { section: 'Progreso' },
  { id: 'todo', icon: '🔓', name: 'Desbloquear todo', run: (g) => g.devUnlockAll() },
  { id: 'tuto', icon: '⏭', name: 'Saltear tutorial', run: (g) => { g.state.data.tuto = 99; } },
  { id: 'crecer', icon: '🔨', name: 'Evolucionar fogata 1', run: (g) => g.growPit(0) },
  { id: 'fogata', icon: '➕', name: 'Otra fogata', run: (g) => { if (g.pitObjs.length < 3) g.addPit(); } },
  { id: 'pyroshop', icon: '🛒', name: 'Todo lo de Pyroshop', run: (g) => g.devBuyAll() },
  { section: 'Fuego' },
  { id: 'prender', icon: '⚡', name: 'Prender todo', run: (g) => g.devLightAll() },
  { id: 'llenar', icon: '🧺', name: 'Llenar las fogatas', run: (g) => g.devFill() },
  { id: 'chispas', icon: '💫', name: 'Lluvia de chispas', run: (g) => g.devOrbs(30) },
  { id: 'cenizapozo', icon: '🌫️', name: 'Ceniza en los pozos', run: (g) => { for (const p of g.pitObjs) p.ash = 1.2; } },
  { section: 'Clima y noches' },
  { id: 'lluvia', icon: '🌧️', name: 'Que llueva', run: (g) => g.devWeather('lluvia') },
  { id: 'tormenta', icon: '⛈️', name: 'Tormenta', run: (g) => g.devWeather('tormenta') },
  { id: 'despejar', icon: '☀️', name: 'Despejar', run: (g) => g.devWeather('') },
  { id: 'noche', icon: '🌙', name: 'Que caiga la noche', run: (g) => g.devNight('noche') },
  { id: 'amanecer', icon: '🌅', name: 'Que amanezca', run: (g) => g.devNight('amanecer') },
  { section: 'Tiempo' },
  { id: 'velocidad', icon: '⏩', name: 'Velocidad ×1 / ×4 / ×10', run: (g) => { g.devSpeed = SPEEDS[(SPEEDS.indexOf(g.devSpeed || 1) + 1) % SPEEDS.length]; g.ui.toast(`⏩ Velocidad ×${g.devSpeed}`, 'info', 1500); } },
  { id: 'nueva', icon: '🗑', name: 'Partida nueva ya', run: (g) => g.devNewGame() },
];
