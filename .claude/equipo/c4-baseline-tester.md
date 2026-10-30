# Ciclo 4 — línea base: arrastrar/colocar leña y pozos (tester)

Medido en 127.0.0.1:8080, partida nueva, sin tocar código. Método: `MouseEvent` reales (mousedown/mousemove/mouseup) sobre el canvas, con trayectoria suave de ~14 pasos y soltando sobre el pozo, y la escena avanzada con `game.step()` (el panel de pruebas no hace rAF, por eso no hay fps de render, ver abajo). Las leñas no se prendieron (se limpió el fuego inicial) para medir solo la física. Consola sin errores propios del juego (un único `TypeError` en `Log.js:104` provocado por mi limpieza, ver H9).

## Resumen en 5 líneas
1. En un pozo base entran **~10 ramas** antes de que la primera ruede afuera (a las 15 hay 11 dentro y 4 fuera) y **3 troncos** (el 4º ya es una torre; el 5º rueda).
2. **Agrandar casi no cambia lo que se ve ni lo que cabe físicamente**: la "capacidad" pasa de 16.000 a 45.120 (×2,8) pero el ancho del pozo solo de 180 a 240 px y las ramas que entran pasan de ~16 a ~18 de 20.
3. **No se puede rotar** la leña a propósito. Solo hay un pseudo-giro al agarrarla por una punta (queda 75° mientras la sostenés) y al soltar cae plana, salvo que se apoye en otra (llegué a 42°).
4. **No hay forma de armar un tipi o cabaña**: las pilas quedan planas (ángulos 0–0,3 rad ≈ ≤17°), apiladas como "montón" o torre vertical de troncos.
5. **Dejar una leña donde querés es fácil en horizontal** (error de ±3 px al soltar en el aire) pero imposible en orientación.

## 1. Capacidad física y la que sobra (pozo base, tamaño 0)

Geometría: el pozo solo tiene **2 piedras estáticas** (`Pit.bodies`, 40 px de ancho c/u) en x=416 y x=624 (y≈636), es decir un hueco de ~190 px entre ellas y **ninguna pared lateral alta**: el "pozo" es un piso con dos topes bajos. No hay fondo ni paredes, por eso lo que sobra rueda.

Medición con ramas (100×15, área 1.500) soltadas una por una a x = centro ±(0–40):
| leños soltados | dentro | fuera |
|---|---|---|
| 10 | 10 | 0 |
| 11 | 9–10 | 1–2 (primera que sale) |
| 15 | 11 | 4 |
| 20 | 16 | 4 |
Altura de la pila: sube de y≈643 a y≈475 (pozo `top`=420). `loadRatio` a 15 ramas = 1,03; a 20 = 1,50.

Con troncos (175×42, área 7.350) soltados al centro: 1→1, 2→2, 3→3, 4→4 (torre vertical, `loadRatio` 1,84), el 5º cae afuera. En otra corrida con x variable el primer derrame fue al 5º/6º. Los 4 apilados llegan a y≈496–533 (techo del pozo en 420).

**Lo que sobra**: rueda y se queda en el suelo pegada a las piedras: x≈366–393 (izquierda) y x≈612–627 (derecha), a ~30–55 px de las piedras; una cayó sobre la piedra (612/588). Con soltado menos centrado salió disparada: **x=755 (tronco), x=967, 1063, 1214 (ramas)**, es decir a hasta 700 px del pozo. Con un flick rápido (arrastre de un solo evento) la rama sale lanzada a x≈1060 (y el drag real del usuario depende de su velocidad al soltar; `endDrag` limita a 20 px/frame). Esa leña fuera del pozo igual **arde si hay calor cerca** (B21) y no cuenta para la carga.

`MAX_LOGS` = 45 (toast "Ya hay demasiada leña tirada").

Oxígeno: `oxygen = 1` hasta `load` 1; a `load` 1,38 (3 troncos) vale 0,47; a ≥1,64 (4 troncos, 1,84) cae al piso 0,1 (ahogado). Es decir, **el jugador ve que "cabe" (pila física) pero el fuego ya se ahoga**: 3 troncos ya ahogan el pozo base, y 10 ramas = 0,94 recién rozan el límite.

## 2. Capacidad por tamaño (`agrandar_0` ×3, medido)
| Tamaño | `half` (px) | ancho | piedras (x) | `top` | `capacity` | `calorMult` | ramas dentro / 20 | 1ª rama afuera | troncos dentro | 1er tronco afuera |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 90 | 180 | 416 / 624 | 420 | 16.000 | ×1,0 | 16 | 11ª | 3 | 5ª |
| 1 | 100 | 200 | 404 / 636 | 400 | 23.200 | ×1,5 | n/m | – | – | – |
| 2 | 110 | 220 | 392 / 648 | 380 | 30.400 (36.480 con carta) | ×2,0 | 12 de 17 | 13ª | 3 de 6 | 5ª |
| 3 | 120 | 240 | 380 / 660 | 360 | 45.120 (con carta) | ×2,5 | 18 de 21 | 11ª* | 4 de 9 | 6ª |
(*el patrón de x en mi prueba se escala con el tamaño; el primer derrame no mejora de forma consistente.)
`capacity = 16000 × (1+0,45·size) × mods.capacity`, solo cuenta en el cálculo de carga (`area`); **la capacidad física (cuántos entran antes de rodar) casi no sube**: la tapa de la pila sigue a ~y 500–530 en todos los tamaños y las piedras siguen siendo dos topes bajos. El efecto neto de agrandar es +50% de calor por nivel y menos ahogo, no "más lugar visible".

## 3. Rotar
- No hay tecla, rueda ni gesto de rotación (grep en `GameScene.js`: solo `setAngularVelocity` acotado ±0,35 en `endDrag`).
- `startDrag` usa un `worldConstraint` blando (rigidez 0,24 / 0,18 / 0,12 según peso) con `pointB` = punto agarrado. Si se agarra una leña ya puesta por una punta, la leña **cuelga/gira** (medí −1,31 rad ≈ 75° con el cursor sobre el pozo). Spawn desde el estante agarra siempre por el centro, así que nace horizontal.
- Al soltar cae plana (−0,08 rad) salvo que apoye en otra: logré −0,73 rad (≈42°) apoyando una rama contra un tronco central. No es controlable ni explícito; en touch sería muy difícil.

## 4. Formas (tipi / cabaña)
- Con un tronco central y ramas soltadas a ±55/70 px: ángulos −0,26, +0,27, 0, 0 rad (≤15°) → quedan **apoyadas planas a los costados**, no inclinadas.
- Pilas de 10–15 ramas: ángulos entre −0,6 y +0,5 rad, todas casi horizontales; se ve un montón desordenado, no una estructura.
- Troncos al centro: torre vertical (cabaña "plana" involuntaria). Eso sí le da al fuego algo (apilados altos arden entre sí), pero nadie lo diseñó: es el efecto de soltar en el mismo x.
- Resultado: **no se puede armar un tipi con la mecánica actual**; para lograrlo hace falta rotación explícita y ángulo estable (rozamiento/estática) o "snap" de estructuras.

## 5. Facilidad de dejar una leña donde querés
- Posición horizontal: excelente. Soltando a 3 puntos (x=460, 520, 580) quedaron a 0, +1, +3 px del objetivo en x al caer (150 ms de caída ~280 px). Tan fácil como arrastrar y soltar.
- Altura/orden: la leña cae por gravedad hasta apoyarse; no se "queda" en el aire ni se encaja (sin snap).
- Orientación: no controlable (sección 3).
- Velocidad al soltar: un movimiento rápido la lanza (hasta 700 px del pozo). Con soltar quieto 100–300 ms antes cae vertical. Un jugador con mouse suele soltar en movimiento: parte del "desparramo" que ve el usuario viene de ahí.

## 6. Rendimiento
No pude medir fps de render (el panel de pruebas está sin rAF: `loop.frame` no avanza solo; `actualFps` queda congelado). Medí el costo de la simulación (física + fuego + partículas, sin dibujar) con `game.step` en un navegador de escritorio:
| leños | ms/frame (sim) |
|---|---|
| 0 | 0,09 |
| 10 (ardiendo) | 0,64 |
| ~15–25 | 0,4–0,9 |
Muy por debajo de 16 ms: **10–25 leños no son problema de cómputo**; el techo de 45 también debería ser cómodo. El render (partículas del fuego, `glow` ADD por leño) no se midió.

## 7. Hallazgos / bugs
- **H1 (alto)**: la capacidad mostrada (`capacity`) y la física no coinciden: 3 troncos ya dan `load` 1,38 y oxígeno 0,47, y a 4 el fuego se ahoga (0,1) aunque visualmente "caben" y no rueda ninguno. El jugador no ve el límite (queja del usuario).
- **H2 (alto)**: "agrandar" no agrega espacio físico perceptible (ancho +10 px por lado por nivel, 2 topes de 40–52 px).
- **H3 (alto)**: la leña sobrante rueda y se desparrama hasta ~700 px; arde fuera del pozo (B21).
- **H4 (medio)**: no existe rotación; el único giro es por el punto de agarre y es incontrolable.
- **H5 (medio)**: no se pueden formar estructuras (tipi/cabaña); las pilas son planas.
- **H6 (bajo)**: el spawn desde la pila agarra siempre por el centro y nace horizontal; no se puede elegir cómo agarrarla.
- **H7 (bajo)**: tras soltar en movimiento, la leña recibe hasta 20 px/frame de velocidad (tope en `endDrag`) y vuela; sugerir amortiguar si el cursor está sobre el pozo.
- **H8 (bajo)**: la pila de ramas llega a y≈475 (techo del pozo 420), a ~55 px del límite superior: muy poco margen vertical a tamaño 0.
- **H9 (bajo, técnico)**: `Log.pop()` crea un halo con tween que referencia `this.x` (`Log.js:104`); si la leña se destruye antes de terminar el tween (220 ms) → `TypeError: Cannot read properties of undefined (reading 'position')` en `onUpdate`. Hoy es difícil de provocar jugando (la leña recién spawneada no se destruye), pero conviene proteger con `if (!this.sprite.body) return` o parar el tween en `destroy()`.

## 8. Qué mediría el equipo al terminar (métricas objetivo)
- Leñas que entran antes de derramar: base ≥ 10 ramas / 3 troncos (mantener) y nivel 3+ ≥ 25 ramas / 7 troncos.
- Ancho del pozo por tamaño y número de niveles (hoy 4 tamaños: 180/200/220/240 px).
- % de leña fuera del pozo tras soltar 12 ramas lentas (hoy 0 si <10; 4 de 15 a 15 ramas).
- Ángulo medio de las leñas apoyadas (hoy ≤17°; un tipi pide 55–75°).
- ms/frame de simulación con 45 leñas (hoy 0,9 ms con ~15).
