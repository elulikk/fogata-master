// Definición de los tipos de madera.
// Cada madera define cómo prende, cuánto dura, cuánto calor da y cómo se ve.
//
// Unidades:
//   ignite  temperatura (0..1+) a la que prende.
//   warm    segundos que tarda en calentarse hasta el calor que la rodea.
//   fuel    "segundos de llama plena" que tiene adentro.
//   heat    calor que irradia cuando arde a pleno.

export const WOODS = {
  rama: {
    name: 'Ramas',
    desc: 'Prenden con un fósforo. Arden rápido y duran poco.',
    shape: 'stick', length: 100, thickness: 15, density: 0.0012,
    bark: '#6e5641', barkLight: '#8f735a', barkDark: '#3b2c20', inner: '#c9a77a',
    ignite: 0.22, warm: 0.6, moisture: 0,
    fuel: 10, heat: 0.95,
    flame: 'S', flameRate: 1.3, smoke: 0.35, crackle: 5, sparks: 1.3,
    weight: 'light',
  },
  seca: {
    name: 'Madera seca',
    desc: 'Arde limpia y fuerte. Ideal para encender troncos.',
    shape: 'log', length: 130, thickness: 25, density: 0.001,
    bark: '#9a7a52', barkLight: '#bf9c6c', barkDark: '#5c452d', inner: '#e6c896',
    ignite: 0.38, warm: 1.4, moisture: 0,
    fuel: 30, heat: 1.6,
    flame: 'M', flameRate: 1.4, smoke: 0.15, crackle: 3.5, sparks: 1,
    weight: 'medium',
  },
  humeda: {
    name: 'Madera húmeda',
    desc: 'Primero se seca: humea y chilla. Después arde como cualquiera.',
    shape: 'log', length: 130, thickness: 27, density: 0.0018,
    bark: '#4a4034', barkLight: '#5f5446', barkDark: '#241e19', inner: '#9c8a6c',
    wet: true,
    ignite: 0.5, warm: 2.5, moisture: 1, dryTime: 9,
    fuel: 28, heat: 0.95,
    flame: 'M', flameRate: 1, smoke: 1.6, crackle: 3, sparks: 0.8,
    weight: 'medium',
  },
  tronco: {
    name: 'Troncos',
    desc: 'Tardan en prender, pero arden muchísimo tiempo.',
    shape: 'log', length: 175, thickness: 42, density: 0.0016,
    bark: '#5a3f2b', barkLight: '#77553a', barkDark: '#2c1d13', inner: '#d1a978',
    ignite: 0.75, warm: 6, moisture: 0,
    fuel: 75, heat: 1.5,
    flame: 'L', flameRate: 1, smoke: 0.6, crackle: 2, sparks: 0.8,
    weight: 'heavy',
  },
  pina: {
    name: 'Piñas',
    desc: 'Llenas de resina: prenden al toque y largan una llamarada.',
    shape: 'cone', length: 34, thickness: 34, density: 0.0014,
    bark: '#7a5233', barkLight: '#a2734a', barkDark: '#3a2516', inner: '#d4a15e',
    ignite: 0.18, warm: 0.4, moisture: 0,
    fuel: 6, heat: 3,
    flame: 'M', flameRate: 2.6, smoke: 0.5, crackle: 9, sparks: 3,
    weight: 'light',
  },
};

// Orden en la pila de leña.
export const WOOD_ORDER = ['rama', 'seca', 'humeda', 'tronco', 'pina'];
