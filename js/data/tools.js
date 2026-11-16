// Herramientas de la barra de abajo: se elige una y se usa tocando. Para sumar otra alcanza con agregarla acá.
//   res     recurso que gasta cada uso (sin `res`, no se gasta).
//   heat    calor que da en el punto, ttl cuánto dura y r su alcance (ver Fire.strike).
//   odds    probabilidad de que prenda, y `rainOdds` cuánto se la baja la lluvia a pleno.
//   rakes   en vez de prender, saca la ceniza del pozo. blows: sopla la fogata mientras se mantiene apretado.
//   opens   logro de `unlocked` que la deja usar (ver GameScene.checkProgress); si gasta un recurso, se abre al tener uno.
//   buy     ítem de la tienda que hace falta tener.

export const TOOLS = [
  {
    id: 'fosforo', name: 'Fósforo', icon: '<i class="match"></i>', key: '1', res: 'fosforo', opens: 'fosforo', sound: 'match',
    heat: 0.8, ttl: 1.8, r: 110, odds: 1, rainOdds: 0.5, sparks: 3,
    desc: 'Prende ramas al toque y la leña de pino. Se gasta.',
  },
  {
    id: 'pedernal', name: 'Pedernal', icon: '🪨', key: '2', sound: 'flint',
    heat: 0.5, ttl: 0.6, r: 70, odds: 0.4, rainOdds: 0.6, sparks: 8,
    desc: 'No se gasta, pero cuesta sacarle una chispa. Solo alcanza para ramas.',
  },
  {
    id: 'rastrillo', name: 'Rastrillo', icon: '🧹', key: '3', opens: 'rastrillo', rakes: true,
    desc: 'Saca la ceniza que ahoga el fuego y aviva las brasas.',
  },
  {
    id: 'fuelle', name: 'Fuelle', icon: '🪗', key: '4', buy: 'fuelle', blows: true,
    desc: 'Mantené apretado sobre una fogata prendida (o la barra espaciadora).',
  },
];

export const toolOf = (id) => TOOLS.find((t) => t.id === id) || TOOLS[0];

// ¿La tiene el jugador? Se compra o se abre con el juego.
export function toolAvailable(d, t) {
  if (t.buy) return (d.bought[t.buy] || 0) > 0;
  return t.opens ? !!d.unlocked[t.opens] : true;
}
