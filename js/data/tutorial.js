// Los primeros pasos: el jugador prende su primer fuego con el pedernal. Cada paso se muestra abajo hasta que se cumple.
// done(g): `g` es la escena. `touch`: el mismo texto para pantallas táctiles. Para sumar un paso alcanza con una entrada.
// El avance se guarda en data.tuto.

export const TUTORIAL = [
  {
    text: 'Hace frío. Hay unas ramas en el pozo y tenés un pedernal: hacé clic sobre ellas para golpearlo. Insistí: no siempre prende la chispa.',
    touch: 'Hace frío. Hay unas ramas en el pozo y tenés un pedernal: tocalas para golpearlo. Insistí: no siempre prende la chispa.',
    done: (g) => g.fire.everLit,
  },
  {
    text: '¡Prendió! Las chispas que suben valen calor: pasá el cursor por encima para juntarlas.',
    touch: '¡Prendió! Las chispas que suben valen calor: tocalas para juntarlas.',
    done: (g) => g.state.meta.stats.orbs >= 3,
  },
  {
    text: 'Alimentá el fuego antes de que se apague: arrastrá una rama de la pila hasta un lugar marcado.',
    done: (g) => g.state.data.dropped >= 2,
  },
];

export const TUTORIAL_END = '🔥 ¡Tu primer fuego! Mantenelo vivo: el calor que da es tu moneda.';
