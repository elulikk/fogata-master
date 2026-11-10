class_name Chispas
# Las chispas que suben del fuego y se juntan pasando el cursor por encima. Valen calor.
# Las mejoras salen de mods: orbs (cuántas salen), magnet (alcance del cursor), orb_pull (la red las atrae),
# orb_value (cuánto vale cada una), combo_cap (juntar seguido sube el valor).

const VIDA := 6.5 # segundos que flota una chispa antes de apagarse
const CADA := 2.6 # segundos promedio entre chispas de una fogata a pleno
const MINIMO := 0.3 # una fogata chiquita también larga alguna
const POR_CHASQUIDO := 0.06 # probabilidad de que un chasquido largue una chispa extra
const SUENA_CHASQUIDO := 0.3 # parte de los chasquidos que suenan aparte del bucle del fuego
const VALOR_BASE := 1.0
const VALOR_RITMO := 1.2 # segundos de ritmo de calor que vale cada chispa
const ALCANCE_PX := 44.0 # radio del cursor en pantalla, por magnet
const ATRAE_PX := 150.0 # radio de la red mágica, por nivel de orb_pull
const ATRAE_VELOCIDAD := 2.5 # metros por segundo con que la red las arrastra
const COMBO_SUBE := 0.04
const COMBO_DURA := 2.2
const TOPE := 40 # chispas a la vez como mucho
