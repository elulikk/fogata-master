# Ciclo 4 — prueba de la iteración A (tester)

127.0.0.1:8080 (`?v=c4a`), `MouseEvent` reales (mousedown/move/up, rueda, clic derecho, teclas) y la escena avanzada con `game.step()` (el panel no hace rAF). **Consola: 0 errores** salvo uno provocado por mi limpieza (B-A4). Sin tocar código.

## Resumen
Rotación, estructuras, derrame y tamaños funcionan y se sienten como un salto grande respecto a la línea base: se puede armar un **tipi en 2 intentos** (el 1º falló por girar para el lado equivocado), el desborde ya no desparrama la leña a 700 px y vuelve al estante, y hay 8 tamaños con layout que respeta el terreno y avisa por qué no entra. Lo pendiente: la capacidad mostrada sigue por encima de lo que cabe físicamente en pozos grandes, no hay aviso de "pozo lleno" cuando se desborda por pared, hay un texto duplicado al formar el tipi, y no pude verificar el dock táctil visualmente.

## 1. Métricas §8 (antes → después)
Capacidad física con drops lentos de ramas/troncos (cap = área; cartas limpiadas):
| Tamaño | half / wallH | cap | ramas hasta 1er derrame | ramas dentro | troncos dentro (1er derrame) | carga `loadRatio` al llenarse |
|---|---|---|---|---|---|---|
| 0 | 90 / 46 | 26.000 (antes 16.000) | ~10–12 (antes 10–11) | 16–17 de 26 (antes 16 de 20) | 3 (5º) (antes 3, 5º) | 0,98 (lleno ≈ cap: coherente) |
| 1 | 100 / 52 | 36.400 | 12 | 17 de 22 | 3 (5º) | 0,70 |
| 3 | 126 / 64 | 65.000 | 26 | 33 de 40 | 5 (5º) | 0,76 |
| 4 | 142 / 72 | 85.800 | 21 | 23 de 28 | 6 (9º) | 0,40–0,51 |
| 7 | 205 / 96 | 195.000 | no medido (ver nota) | – | – | – |
(Tamaños 2, 5 y 6 no medidos por tiempo; en 2 solo geometría: half 112, wallH 58, cap 49.400.)
- **Capacidad mostrada = física: solo vale en el pozo 0** (lleno a 0,98). Desde el tamaño 1 el pozo derrama con `loadRatio` 0,4–0,76: la capacidad numérica sobrestima ~1,5–2,5× lo que cabe. Los tamaños grandes sí dan más espacio físico (de ~16 a 33 ramas), mejor que antes (casi nada), pero no al ritmo de `cap`.
- **% fuera tras 12 ramas lentas**: 0 % en pozo 0 (antes 0 %); a las 24–26 ramas sobran 2–3 y **vuelven al estante** (antes 4 de 15 quedaban en el suelo). 
- **Ángulo de apoyadas**: 54–59° y 120–131° (tipi con ramas girando 4 pasos de rueda = 60°); antes ≤17°.
- **ms/frame (simulación, sin render)**: no pude sostener 40 leñas (arden y se consumen a los segundos); con 17 ardiendo 0,13 ms/frame. La cifra de física (1,8–2 ms con 35–44) no la reproduje.

## 2. Rotación (todas probadas)
- **Rueda**: 4 pasos = 60° (15° c/u), preciso.
- **Clic derecho**: +45° exactos.
- **E/Q sostenidas**: 0,5 s ≈ +86° / −86°. **Shift+E**: ≈ +26° en 0,5 s (giro fino).
- Con mouse es **muy controlable**. Un solo punto de fricción: el sentido de la rueda (+ y −) no dice hacia dónde gira; mi 1er tipi quedó en V invertida por eso.
- **Tipi**: intento 1 (ángulos ±60 pero con las bases hacia adentro) = "montón", calidad 0. Intento 2 (4 ramas, 2 con rueda +, 2 con rueda −, cruzadas en el centro) = **tipi 0,82–0,86 en el pozo base** (2 puntales clavados). Tiempo real estimado de un humano: ~40–60 s con 4 leños; en el simulador 2 intentos. El "pozo 0 casi no alcanza" de física no se notó: salió.
- **Cabaña**: apilar 5 leños planos al centro (2 troncos + 3 ramas) = cabaña 0,69. Es una torre, no una cabaña real. Dos capas × 2 ramas a los lados = montón; 4 troncos en 2×2 no caben (solo 2 quedaron).
- **Etiqueta del pozo**: "Fogatita · 0.8/3.5 🪵 · Tipi 88%" bajo el pozo. Muestra tipo y calidad: bien.
- **"Formado"**: sale el texto "¡Armaste un tipi!" y se emite `structure:formed` 1 vez (más `structure:lost` 1 vez al armarlo, esperable). **Bug: el texto aparece duplicado** (dos objetos Text a y=389 y y=370 con el mismo contenido; se ve como "¡¡Armaste un tipi!a!").
- Eventos: `log:rotate` 16 veces para ~190° (cada ~12°), `log:rest` 2.

## 3. Desborde
- Rebota hacia el costado: quedan a 100–130 px del centro (antes hasta 700 px) y **no arden** (probado con 24 ramas y el fuego prendido: 0 fuera ardiendo). A los ~6 s vuelven al estante (`log:returned` ×6–8, `res.rama` se repone).
- **No hay aviso de "pozo lleno"**: con 24 ramas no salió toast ni evento `log:overflow` (el derrame fue por pared física, no por `loadRatio > 1.15`). El jugador no entiende por qué rebota. (Sin spam, pero porque no hay mensaje.)
- Apagado en el suelo y devolver: funcionan.

## 4. Tamaños y layout
- 8 tamaños; probé 0, 1, 3, 4, 7. `half` 90, 100, 112, 126, 142, … 205; `wallH` 46 → 96; el look cambia en cada salto (piedras mayores, labio, y en 3 aparece un marco ceremonial con travesaño: se ve imponente en 812×375).
- **Layout con 2–3 pozos**: pozos (7, 0, 0) en x 300–710 / 795–975 / 1060–1240; (7, 2, 0): 300–710 / 773–997 / 1060–1240. Sin solaparse, gap ≥ 63 px; el pozo 0 se desplaza a la izquierda al sumar pozos (x 691 → 568 → 505) y arrastra su leña.
- **`blocked` con motivo**: "No hay terreno: ocuparía 1022 de 1000. Achicá o quitá otra fogata." ✓ claro. Pero con un pozo 7 ocupando 410 px la tienda aún ofrece "Nueva fogata" y "Tercera fogata": entran por poco; correcto.
- Tienda: texto "Fogatita → Fogata · 3.5 troncos → 5.0 troncos · aire ×1.00 → ×1.05 · calor ×1 → ×1.5". Clara. (Un `cost` leído desde `shopItems` salió {0,0}: el precio real está en `price`, solo fue mi lectura.)
- Un detalle: el pozo 3 con marco y techo cubre la mitad de la pantalla en horizontal móvil y tapa estrellas/luna; no molesta.

## 5. Puntales
Ayudan **muchísimo** para armar el tipi (sin ellos cualquier leña inclinada cae). Se sienten raros cuando la leña queda **clavada en el aire**: una rama sola a 59° queda estática (`body.isStatic`) sin apoyo y se mantiene indefinidamente (probé 30 s). Sugerencia: ancla visible (sombra/estaca) o que solo "clave" si toca la base o a otra leña.

## 6. Regresión
- **Guardado viejo (v2)**: `importSave` → `version 3`, pits migrados (3 y 1), `bought.agrandar_1` derivado, recursos y nivel intactos; los pozos se acomodan solos (x 537 y 933).
- **Noches**: con el cambio de capacidad la noche 1 falló sola mientras yo simulaba minutos con el pozo 7 apagado: "El frío ganó la noche 1" con mensaje y botón "Reintentar": OK.
- **Prestigio** con Hogar heredado nivel 3: tras prestigiar `pits[0].size = 3`, `cap 65.000`, resumen "Nuevo comienzo", sin errores. La ganancia de ese prestigio con 1.500 de calor y 2 amaneceres fue sólo +4 🪦 (normal).
- **Móvil horizontal 812×375**: HUD y botones bien; cartas en horizontal legibles.
- **Dock ↺ ↻**: el elemento `#rot` existe con 2 botones y **rota** (86° con 0,5 s de pulsación simulada) pero **quedó `hidden` en mis drags con mouse** (se muestra solo con touch real). No pude emular touch real (Phaser ignora `TouchEvent` sintéticos en este entorno), así que **el dock visible, el segundo dedo y el hint de rotación no se verificaron**.
- **Consola**: sin errores. Un `TypeError` en `GameScene.updateDragRotation` (línea ~407) al destruir a mano una leña agarrada: lo causé yo con `l.destroy()` durante un drag; en el juego una leña agarrada no se destruye, pero conviene un `if (!body) return`.

## Bugs priorizados
**Alto**
- **A1 — Capacidad mostrada ≠ capacidad física desde el tamaño 1** (física/progresión): `loadRatio` al derramar 0,4–0,76 en tamaños 1–4. El pozo "se ve lleno" pero la barra marca la mitad. Ajustar `cap` por tamaño al número real de leños que entran o ampliar las paredes.
- **A2 — No hay aviso de pozo lleno** cuando rebota por pared (física/ui): `log:overflow` nunca se emitió con 24 ramas; el rebote parece un bug al jugador.

**Medio**
- **A3 — Texto "¡Armaste un tipi!" duplicado** (dopamina/ui): dos `Text` con el mismo mensaje y 19 px de diferencia; se ven encimados.
- **A4 — `updateDragRotation` rompe si la leña agarrada se destruyó** (física): `TypeError ... isSleeping` en `GameScene.js:407`. Proteger con `if (!l.sprite.body)`.
- **A5 — Puntal deja leña "colgada" sin apoyo** (física): una rama sola a 59° queda estática en el aire.
- **A6 — Cabaña = torre vertical** (física): 5 apiladas al centro dan "cabaña 0,69"; no hay forma de armar una cabaña de verdad en 2D sin que sea apilar. Considerar premiar capas cruzadas en ancho.

**Bajo**
- **A7** Sentido de la rueda no explicado (el hint solo se ve en touch; mostrar "rueda = rotar" en desktop la primera vez).
- **A8** Dock táctil y 2º dedo sin verificar (probar en dispositivo real).
- **A9** Pozos 2–3 con marco ceremonial ocupan mucho en horizontal móvil.
- **A10** Mis medidas de tamaños 2, 5, 6 y 7 faltan; y la de 40+ leñas (se queman antes).

## Sensaciones
1. La rueda en pasos de 15° y el clic derecho de 45° se sienten bien: precisos y sin sorpresas.
2. Armar un tipi por primera vez da gusto; el cartel "Tipi 88%" y el texto de logro son un premio claro.
3. El derrame ya no se siente "bug": rebota cerca y la leña vuelve sola.
4. Los puntales hacen posible lo que antes era imposible, pero se notan "mágicos".
5. El salto visual entre tamaños es evidente; el marco ceremonial es espectacular.
6. Falta decir por qué el pozo rechaza leña ("lleno").
7. La etiqueta del pozo mezcla cap y texto en una línea larga: legible pero chica en móvil.

## TOP 5 para la iteración B
1. **Aviso de "pozo lleno"** con el mismo umbral que el rebote, y mostrar en la etiqueta una barra de carga al lado de la capacidad.
2. **Calibrar `cap` por tamaño** con las leñas que realmente entran (hoy sobrestima en 1–4).
3. **Rotación en desktop visible**: primer arrastre con hint "Rueda / Q·E / clic derecho para girar" y fantasma del ángulo.
4. **Cabaña real**: premiar leños cruzados en capas (no solo apilar) y mostrar un contorno guía de tipi/cabaña mientras arrastrás.
5. **Verificar en táctil real** el dock ↺ ↻, el segundo dedo y el hint, y arreglar duplicado de texto y puntal en el aire.
