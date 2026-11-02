# C5 · Análisis de progresión (solo lectura, nada del juego tocado)

Diagnóstico: hoy el calor sale de "llenar el pozo y esperar". Un S0 lleno rinde 3,2/s sin importar la madera; estructura +22/26 % es un extra, no una decisión. Las noches 1–3 (2,5 / 2,3 / 3,0) las pasa quien junta leña y llena un pozo: piden **juntar más, no jugar mejor**. Con tope de bonus en 30 % y Chimenea/Arquitecto, la estructura pasa a ser un número oculto.

## 1. Que la madera importe en el calor (hacer primero) — M
- Qué cambia: seca = llama alta pero corta; tronco = lenta y larga; rama = barata y floja; húmeda = apaga. Hoy `heat` por leño existe pero el tope `min(1.4, heat/3.5)` aplana la diferencia. Bajar el tope de saturación (o subirlo a 1.7) hace que "2 secas + tronco" gane de verdad a "5 ramas" y cambia qué se junta/compra.
- Archivos: `GameState.rateBreakdown` (el `I`), `data/sizes.js` (mult), `Fire.js` heat por tipo (física, solo lectura).
- Riesgo: rompe el balance de noches 1–3 (re-simular con `t6/t7`). Efecto lateral en el ritmo a 2.500 calor.

## 2. Noches que premien jugar bien — M
- Qué cambia: la meta de las noches 1–3 queda igual, pero se agrega un "margen" visible: calor sostenido > meta da brasas/ceniza extra (`dawnAsh`) y una noche perfecta (sin bajar de la meta) cuenta para logros. Quien arma tipi/cabaña o mantiene 2 pozos cruza la meta con holgura y lo ve.
- Archivos: `data/nights.js` (`stepNight`, `dawnAsh`), `GameState.nightInfo` (campo `margin`), HUD de noche (UI).
- Riesgo: bajo; no sube la dificultad. Pedir a UI el texto "+margen".

## 3. Uno grande vs varios chicos: mostrarlo — S/M
- Qué cambia: la tienda ya dice mult/cap; falta el número que decide: **calor/s por tu leña actual**. En "Agrandar" y "Otra fogata" mostrar "con tu pila actual: 4,1 → 6,0/s". Hoy el trade-off (relleno ≥40 %) existe pero es invisible hasta que el pozo rinde poco.
- Archivos: `data/shop.js` (`effect` de `agrandar_i`/`fogata_i`), `GameState` (helper `projectRate(pits, size)`), `GameScene.shopItems` (pasar la carga real).
- Riesgo: bajo; es información. Esfuerzo S si solo muestra el rate lleno vs actual; M si usa la carga real.

## 4. Salida para la lluvia en pozos grandes (pregunta de física C4-G) — S
- Recomendación: **no dejarlo así**, porque un fósforo que no prende en S3+ con lluvia 0,6 es una pared sin aviso. Dar una salida cara pero clara: (a) "Piña" ya prende al toque, hacer que seque 2× (se compra con troncos), (b) el Techo (ya existe) debería ser la respuesta, y avisar "Lluvia: poné techo o usá piña" en el pozo grande. Fuelle ya ayuda.
- Archivos: `data/shop.js` (desc del techo, costo), `cards.js` (`secado` o carta rara nueva solo si hace falta), `Fire.js` secado por piña (física).
- Riesgo: medio si se toca el secado; bajo si solo es aviso + que el techo sea el camino. Preferir el aviso.

## 5. Estructuras: cobrar el esfuerzo, no regalarlo — S
- Qué cambia: con calidad instantánea y tope 30 %, Chimenea ×3 + Arquitecto ×3 llegan al tope sin armar nada difícil. Propongo: Arquitecto +10 %/nivel (no +15) y que cada estructura de calidad ≥0,9 dé un logro/ceniza la primera vez. Así el jugador "descubre" el tipi y la cabaña y las cartas no lo reemplazan.
- Archivos: `data/meta.js` (`arquitecto`), `cards.js` (`chimenea`), `data/achievements.js` (nuevo logro tipi/cabaña), `GameState.recompute`.
- Riesgo: bajo; M de balance si se toca el tope.

## Orden
1 (madera) → 3 (mostrar tamaño) → 2 (noches) → 5 → 4. La madera hace que las decisiones existan; las demás las hacen visibles.

## Resumen (3 líneas)
1. Hoy el calor depende de llenar el pozo; las noches 1–3 piden juntar más, no jugar mejor.
2. Lo primero: que el tipo de madera pese en el calor (tope de saturación) y mostrar en la tienda el calor/s con tu leña actual.
3. La lluvia en pozos grandes necesita salida clara (techo/piña con aviso), y Chimenea/Arquitecto no deben reemplazar armar la estructura.
