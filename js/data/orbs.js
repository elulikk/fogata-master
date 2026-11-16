// Las chispas que suben del fuego y se juntan pasando el cursor por encima. Valen calor.
// Las mejoras salen de mods: orbs (cuántas salen), magnet (alcance del cursor), orbPull (la red las atrae),
// orbValue (cuánto vale cada una), comboCap (juntar seguido sube el valor).

export const ORBS = {
  life: 6.5,        // segundos que flota una chispa antes de apagarse
  every: 2.6,       // segundos promedio entre chispas de una fogata a pleno
  minimum: 0.3,     // una fogata chiquita también larga alguna
  perCrackle: 0.06, // probabilidad de que un chasquido largue una chispa extra
  baseValue: 1,
  rateValue: 1.2,   // segundos de ritmo de calor que vale cada chispa
  reach: 50,        // radio del cursor en pantalla, por magnet
  netRadius: 150,   // radio de la red mágica, por nivel de orbPull
  netSpeed: 450,    // px por segundo con que la red las arrastra
  comboStep: 0.04,
  comboTime: 2.2,
  cap: 40,          // chispas a la vez como mucho
};
