// Definición de las maderas: cada pieza es una especie (pino, roble...) en un tamaño (rama, leña, tronco).
// Las claves son `especie_tamaño` (ej. roble_tronco); la tabla WOODS se arma sola cruzando las dos listas.
//
// Unidades:
//   ignite  temperatura (0..1+) a la que prende.
//   warm    segundos que tarda en calentarse hasta el calor que la rodea.
//   fuel    "segundos de llama plena" que tiene adentro.
//   heat    calor que irradia cuando arde a pleno.

// Tamaños, de menor a mayor. `tier` es el anillo del tipi donde va (0 = centro, ver utils/slots.js).
// Prender es exponencial: cada tamaño pide unas 6,5 veces más calor y tarda 5 veces más en calentarse.
// Un fósforo da 0,8: prende cualquier rama, no la leña (salvo la de pino) y nunca un tronco.
export const CUTS = {
  rama: {
    tier: 0, name: 'Rama', plural: 'ramas', shape: 'stick', length: 84, thickness: 13, bundle: 4, price: 1,
    ignite: 0.12, warm: 0.25, fuel: 10, heat: 0.9, lights: 'Prende con un fósforo o casi nada de calor',
    flame: 'S', flameRate: 1.3, smoke: 0.35, crackle: 5, sparks: 1.3, weight: 'light',
  },
  lena: {
    tier: 1, name: 'Leña', plural: 'leñas', shape: 'log', length: 116, thickness: 22, bundle: 2, price: 7,
    ignite: 0.77, warm: 1.25, fuel: 30, heat: 1.9, lights: 'Prende con ramas ardiendo',
    flame: 'M', flameRate: 1.4, smoke: 0.3, crackle: 3.5, sparks: 1, weight: 'medium',
  },
  tronco: {
    tier: 2, name: 'Tronco', plural: 'troncos', shape: 'log', length: 155, thickness: 34, bundle: 1, price: 20,
    ignite: 5, warm: 6.25, fuel: 75, heat: 2.4, lights: 'Prende solo con un fuego fuerte',
    flame: 'L', flameRate: 1, smoke: 0.6, crackle: 2, sparks: 0.8, weight: 'heavy',
  },
};
export const CUT_ORDER = ['rama', 'lena', 'tronco'];

// Especies. Los números multiplican a los del tamaño. `hearth`: escalón de fogata (índice de data/sizes.js) que
// la abre en la tienda y en las entregas; `weight`: qué tan seguido la trae el leñador; `price`: multiplica el
// precio de cada tamaño (sigue a lo que rinde, así ninguna es regalada); `bars`: lo que muestra la pila (de 1 a 5).
export const SPECIES = {
  pino: {
    name: 'Pino', desc: 'Prende enseguida y chisporrotea, pero se consume rápido.',
    hearth: 0, price: 1, weight: 5, bars: { prende: 5, dura: 1, calor: 2 },
    ignite: 0.7, warm: 0.7, fuel: 0.8, heat: 0.9, smoke: 1.5, crackle: 1.5, sparks: 1.3,
    bark: '#8a5a36', barkLight: '#ad7a4e', barkDark: '#4c2f1b', inner: '#ecd29a',
  },
  lenga: {
    name: 'Lenga', desc: 'Pareja en todo: la leña de todos los días.',
    hearth: 1, price: 1.4, weight: 4, bars: { prende: 3, dura: 2, calor: 3 },
    ignite: 1, warm: 1, fuel: 1, heat: 1, smoke: 1, crackle: 1, sparks: 1,
    bark: '#7c6250', barkLight: '#9c8069', barkDark: '#43342a', inner: '#dcb48c',
  },
  rauli: {
    name: 'Raulí', desc: 'Llama alta y limpia, con poco humo.',
    hearth: 2, price: 2, weight: 3, bars: { prende: 3, dura: 3, calor: 4 },
    ignite: 1.1, warm: 1.1, fuel: 1.15, heat: 1.2, smoke: 0.6, crackle: 0.8, sparks: 0.9,
    bark: '#7a4632', barkLight: '#9c6249', barkDark: '#42241a', inner: '#cf8f6c',
  },
  roble: {
    name: 'Roble', desc: 'Tarda en prender, dura mucho y calienta parejo.',
    hearth: 3, price: 2.8, weight: 2, bars: { prende: 2, dura: 4, calor: 4 },
    ignite: 1.3, warm: 1.4, fuel: 1.6, heat: 1.2, smoke: 0.8, crackle: 0.7, sparks: 0.7,
    bark: '#54483c', barkLight: '#70614f', barkDark: '#2a241e', inner: '#c7a578',
  },
  quebracho: {
    name: 'Quebracho', desc: 'Durísimo: necesita buen fuego debajo, pero rinde como ninguno.',
    hearth: 5, price: 5, weight: 1, bars: { prende: 1, dura: 5, calor: 5 },
    ignite: 1.7, warm: 2, fuel: 2.5, heat: 1.5, smoke: 0.5, crackle: 0.5, sparks: 0.6,
    bark: '#3f2620', barkLight: '#5a382e', barkDark: '#1e110e', inner: '#a4553f',
  },
  humeda: {
    name: 'Húmeda', desc: 'Madera mojada: primero se seca, humea y chilla. El secadero la recupera.',
    hearth: Infinity, price: 0, weight: 0, wet: true, bars: { prende: 1, dura: 2, calor: 1 },
    ignite: 1.3, warm: 1.8, fuel: 0.95, heat: 0.5, smoke: 2.6, crackle: 0.9, sparks: 0.8,
    moisture: 1, dryTime: 9,
    bark: '#4a4034', barkLight: '#5f5446', barkDark: '#241e19', inner: '#9c8a6c',
  },
};
// Orden en la pila (la húmeda, abajo de todo).
export const SPECIES_ORDER = ['pino', 'lenga', 'rauli', 'roble', 'quebracho', 'humeda'];

export const woodKey = (species, cut) => `${species}_${cut}`;

function build() {
  const out = {};
  for (const sp of SPECIES_ORDER) {
    const s = SPECIES[sp];
    CUT_ORDER.forEach((cut, i) => {
      const c = CUTS[cut];
      out[woodKey(sp, cut)] = {
        name: `${c.name} de ${s.name.toLowerCase()}`, short: c.name, desc: s.desc, lights: c.lights, species: sp, cut,
        tier: c.tier, shape: c.shape, length: c.length, thickness: c.thickness, weight: c.weight,
        bark: s.bark, barkLight: s.barkLight, barkDark: s.barkDark, inner: s.inner,
        wet: !!s.wet, moisture: s.moisture || 0, dryTime: s.dryTime,
        ignite: c.ignite * s.ignite, warm: c.warm * s.warm, fuel: c.fuel * s.fuel, heat: c.heat * s.heat,
        flame: c.flame, flameRate: c.flameRate, smoke: c.smoke * s.smoke, crackle: c.crackle * s.crackle, sparks: c.sparks * s.sparks,
        next: i > 0 ? woodKey(sp, CUT_ORDER[i - 1]) : null, // en qué se transforma al consumirse
      };
    });
  }
  // La piña no tiene especie ni se transforma: ocupa un lugar de rama y larga una llamarada.
  out.pina = {
    name: 'Piña', short: 'Piña', desc: 'Llena de resina: prende al toque y larga una llamarada. Va en un lugar de rama.', species: 'pina', cut: 'rama',
    tier: 0, shape: 'cone', length: 34, thickness: 34, weight: 'light',
    bark: '#7a5233', barkLight: '#a2734a', barkDark: '#3a2516', inner: '#d4a15e',
    wet: false, moisture: 0, ignite: 0.08, warm: 0.2, fuel: 6, heat: 3,
    flame: 'M', flameRate: 2.6, smoke: 0.5, crackle: 9, sparks: 3, next: null,
  };
  return out;
}

export const WOODS = build();

// Área de un tipi completo: dos piezas de cada tamaño (de acá sale cuánta leña "llena" un pozo).
export const TIPI_AREA = CUT_ORDER.reduce((sum, c) => sum + 2 * CUTS[c].length * CUTS[c].thickness, 0);

// Especie que trae una entrega, según tu mejor fogata: las nuevas aparecen menos que las comunes.
export function rollSpecies(hearth, rand = Math.random) {
  const open = SPECIES_ORDER.filter((sp) => hearth >= SPECIES[sp].hearth);
  let roll = rand() * open.reduce((sum, sp) => sum + SPECIES[sp].weight, 0);
  for (const sp of open) {
    roll -= SPECIES[sp].weight;
    if (roll < 0) return sp;
  }
  return open[0];
}
