// Herramientas de la barra de abajo: se elige una y se usa tocando la leña. Para sumar otra alcanza con agregarla acá.
//   res     recurso que gasta cada uso (sin `res`, no se gasta).
//   heat    calor que da en el punto, ttl cuánto dura y r su alcance (ver Fire.strike).
//   odds    probabilidad de que prenda, y `rainOdds` cuánto se la baja la lluvia a pleno.

export const TOOLS = [
  {
    id: 'fosforo', name: 'Fósforo', icon: '<i class="match"></i>', key: '1', res: 'fosforo', sound: 'match',
    heat: 0.8, ttl: 1.8, r: 110, odds: 1, rainOdds: 0.5, sparks: 3,
    desc: 'Prende ramas al toque y la leña de pino. Se gasta.',
  },
  {
    id: 'pedernal', name: 'Pedernal', icon: '🪨', key: '2', sound: 'flint',
    heat: 0.5, ttl: 0.6, r: 70, odds: 0.3, rainOdds: 0.6, sparks: 8,
    desc: 'No se gasta, pero cuesta sacarle una chispa. Solo alcanza para ramas.',
  },
];

export const toolOf = (id) => TOOLS.find((t) => t.id === id) || TOOLS[0];
