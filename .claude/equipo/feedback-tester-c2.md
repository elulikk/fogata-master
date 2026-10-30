# Feedback del tester — Ciclo 2

Probado en 127.0.0.1:8080. **Consola: 0 errores** en toda la sesión.
Limitación del entorno: el panel del navegador de pruebas corre a ~1 fps, así que el "juego real" se hizo con un bot que avanza la escena con `game.step()` (hasta 28 min de juego simulado: atiende el fuego, va al bosque, compra, junta chispazos, elige carta). Nota: los ajustes (`settings`) sobreviven al `wipe`, por eso parte de la sesión corrió con "reducir movimiento" activo (heredado del ciclo 1) y después lo desactivé para ver efectos.

## Re-test B1–B11
| # | Estado |
|---|---|
| B1 refit al rotar | ✅ Resuelto: portrait→812×375 deja `ui` en 926×520 escalado 0.72 y todo dentro de pantalla. |
| B2 Cenizas tras prestigio | ✅ `#btn-ashes` visible tras prestigiar (solo botón en pantalla). |
| B3 toasts sobre modales | 🟡 Mejorado (cola funciona, ver B12): los toasts esperan, pero una tarjeta de logro se montó sobre "¡Subiste de nivel!". |
| B4 cartas sobre tienda | ✅ (no vi el panel detrás al abrir cartas; el panel se cierra). |
| B5 volumen vs mute | ✅ No reproduje la desincronización (ícono y casilla coinciden tras mover el slider y con M). |
| B6 "Cenizas en total" | ✅ Ahora muestra "disponibles" y "en total". |
| B7 "— → +5" | ✅ Ahora "Fósforos: +5". |
| B8 casillas | ✅ Se ven casillas en el menú (blancas pero visibles); no distingo bien el tildado, ver B16. |
| B9 panel 800×600 | ✅ Ya no tapa botones de acción. |
| B10 Esc + confirmación | ⚪ No lo retesteé a fondo. Esc con panel cerrado abre el menú (diseño), pero ojo: con el panel recién cerrado un segundo Esc abre el menú sin querer (ver B15). |
| B11 guardado concurrente | ⚪ No pude probarlo con dos pestañas reales. Sí vi el efecto "bueno": al hacer `wipe()` + recargar arranca de cero sin que `beforeunload` reescriba la partida vieja. Un `localStorage.clear()` + reload SÍ resucita la partida (el guardado en memoria se reescribe al descargar): esperable, solo aviso. |

## Bugs nuevos

### Medio
**B12 — Tarjeta de logro se superpone al título del modal de nivel** (ui)
Pasos: en horizontal 812×375 (y también escritorio) subir de nivel justo cuando salta un logro ("Veterano"): la tarjeta dorada `#achv` aparece detrás/encima de "¡Subiste de nivel!" y las cartas. `pump()` frena toasts pero el logro entra por otro camino.
Debería: encolarse como los toasts mientras `modalOpen`.
Archivo: `Ui.js` (`achievement()`/`pump()`).

**B13 — El estante de leña tiene dos filas "Madera"** (arte/ui)
Con seca y húmeda ambas se rotulan "Madera" (x4 y x6). Confuso: no se sabe cuál es cuál. Rotular "Seca" y "Húmeda". Archivo: `GameScene.js`/Rack (etiquetas de `woods.js`).

**B14 — El texto flotante "Se mejoraron ramas" y los "+N" se pisan con las etiquetas del estante** (ui)
Aparece sobre el rack ilegible. Subirlo o ponerle fondo.

### Bajo
- **B15** Esc con el panel de tienda abierto lo cierra, y un segundo Esc abre el menú y **pausa** el juego: muy fácil de abrir por accidente. En mi test el juego quedó pausado sin que lo notara (el menú se veía igual de tenue). Sugerencia: no abrir el menú con Esc si se acaba de cerrar un panel (mismo frame/<300 ms).
- **B16** Casillas del menú: tildado poco claro sobre fondo oscuro (cuadrado blanco igual tildado o no).
- **B17** El overlay "Estás en el bosque…" queda visible y la sesión de viaje bloquea "Ir al bosque" pero no avisa cuánto falta; con alt-tab del navegador el viaje no corre (es la propia pestaña oculta, no bug).
- **B18** El cielo de amanecer es un velo marrón-violeta uniforme sobre árboles y estante (los árboles lejanos quedan tintados pero no hay "luz en el horizonte"); correcto pero poco dramático. Probado con éxito de noche forzado: alpha sube 0→0.9 en ~1.8 s y vuelve a 0 al atardecer.
- **B19** El flash de cámara del evento "hallazgo" (220 ms, ámbar claro) en pantalla casi cubre todo con un amarillo lavado; con fotosensibilidad puede ser agresivo. Atenuar (alpha ~0.5) o respetar `reduceMotion` (sí lo respeta: lo vi desactivado).

## Lo nuevo: qué se ve bien
- **Chispas alargadas**: se ven como estelas orientadas, mucho más vivas que los puntos. Rotación correcta (no salen todas verticales).
- **Juice de leña**: halo al sacar de la pila y anillo de chispas al caer al pozo se notan sin ser pesados.
- **Fogata pico**: se dispara tras ~5 s con intensidad ≥1 (con 4 leños y fuelle conseguí rate 4.8), muestra "¡Fogata en su punto! +62" y da bonus real; cooldown correcto.
- **Combo**: números anaranjados apilados sobre el pozo, legibles; se acumulan bastante y llegan a tapar la llama con muchos chispazos seguidos.
- **Logros**: aviso dorado con icono, nombre, descripción y bonus ("+3% chispazos"); lista "🏆 Logros 7/19" desplegable en el menú. Se otorgaron 7 en 28 min de bot (comprador, nivel5, chispero…).
- **Eventos de bosque**: tarjeta verde "EN EL BOSQUE · Árbol caído" clara; da botín y toast. (No hay elecciones en los eventos de datos probados; las 6 definiciones cargan.)
- **Zona superior**: pronóstico → noche → logro → toasts en columna sin superponerse (salvo B12).
- **"Te faltan X/s"**: HUD en noche `0.6 / 3.4` en color y barra con "te faltan 2.8 /s". Muy claro.
- **Resumen**: compacto, sin hueco, con "Cenizas disponibles / en total".
- **Parallax**: capas de colinas y árboles con profundidad, se ve rico; no vi bordes.
- **Cartas en horizontal móvil**: entran enteras y legibles a 812×375.

## Balance (bot de ~28 min simulados)
- **Ritmo temprano**: bot atento: 134 de calor al min 1, 190 al min 2, 355 al min 3 (nivel 2 a ~260). Entre 120 y 450 ahora hay 1–2 niveles: ✅ mejor.
- **Hito de noches (2500)**: un bot flojo comprando consumibles llegó a ~1000 en 12 min; un bot que prioriza hacha/canasta/botas/piñas y junta chispazos (400+ orbes) llegó en ~16 min. Los chispazos pesan mucho (un tercio del calor): conviene saberlo, un jugador que no los junte irá bastante más lento.
- **Primera noche**: meta 2.5 (2.2 con carta). El bot, atendiendo con errores (rate osciló 0.3–4.4, frío máx 0.75) **superó noches 1, 2 y 3** (metas 2.5/2.75/3.4). Es alcanzable con fuego atendido; demasiado indulgente quizá: nunca llegó cerca de fallar (frío 1). Ya no hay tensión real; tal vez subir un poco el crecimiento o acelerar el frío.
- **Día**: primer día de 4 min tras 2500 (≈ pasa justo después de comprar lo básico): cómodo.
- **Prestigio**: con 3 amaneceres y 9.700 de calor da +12 🪦, el doble que 3 amaneceres (4+5+3=12 acumulados): correcto, ahora atrae, aunque el salto aparece recién a calor alto (a 2500 y 1 amanecer da 5 vs 3).
- **Ceniza vs mejoras**: 12 cenizas en una partida compran 2–3 mejoras de costo 3–6; razonable.

## Sensaciones (máx 10)
1. El juego ahora se ve mucho más rico (parallax + cielo violeta + chispas estiradas): salto grande respecto al ciclo 1.
2. Los logros y eventos le dan ritmo a los tramos planos; el "+3% chispazos" como recompensa es el tipo de micro-premio que funciona.
3. El combo de números naranjas tapa la llama en picos; escalar tamaño/duración hacia abajo o apilar en columna.
4. La fogata pico es un gran momento: pedir un indicador previo (barra "en su punto 3/5 s") para que el jugador lo persiga a propósito.
5. Noches: el "te faltan X/s" convierte la noche en objetivo claro. Pero sin riesgo real de fallar, la noche se vuelve trámite.
6. El estante y los textos flotantes siguen siendo lo más desordenado de la pantalla (B13/B14).
7. Esc/menú que pausa sin avisar (B15) puede confundir: mostrar "En pausa".
8. El amanecer con la fanfarria + cielo es buen premio; el resumen compacto lo cierra bien.
9. Las cartas raras (borde azul) y el antes→después siguen siendo lo mejor de la UI.
10. Prestigio ya tiene sentido; falta un objetivo visible ("Prestigio recomendado: +12 🪦") antes de pulsar.

## Arreglos Haiku UI (ciclo 3)

Alcance: `js/ui/Ui.js`, `css/style.css`, `index.html`. Verificado con `node --check js/ui/Ui.js` (sin errores). No se levantaron servidores: los puntos de abajo están revisados en código, pendientes de prueba visual en el navegador.

- **B12 (logro sobre modal de nivel): arreglado.** `pump()` ahora, con un modal abierto (`modalOpen`), retira el logro que está en pantalla y lo devuelve al frente de la cola (`noticeQ.unshift`); sale al cerrar el modal. Se agregó `endNotice()` para que el temporizador de retiro no quede colgado. `showCards`, `showSummary` y `toggleMenu` llaman a `pump()` al abrirse, así el logro desaparece al instante y no a los 200 ms del intervalo.
- **B15 (Esc doble abre y pausa el menú): arreglado.** `closePanel()` guarda `panelClosedAt`; el Esc no abre el menú si un panel se cerró hace menos de 300 ms.
- **Indicador "En pausa": agregado.** Etiqueta `.pause-tag` "⏸ En pausa" dentro del título del menú (`index.html`). Se ve siempre que el menú está abierto, que es cuando se pausa el juego.
- **B16 (casillas del menú): arreglado.** Casilla vacía: caja oscura con borde claro. Tildada: relleno ember, tilde oscura dibujada como fondo SVG (ya no depende de `::after`, que en algunos navegadores no se pinta sobre `<input>`) y halo. Se quitó la regla `::after`.
- **Sensación 10 (ganancia de prestigio): arreglado.** En la pestaña Cenizas aparece "Prestigio ahora: +N 🪦" (`.meta-gain`) antes del botón, usando `ashInfo().gain`; solo se muestra si `canPrestige` es verdadero. El botón ahora dice solo "Prestigio" para no repetir el número.
- **Pendiente / fuera de alcance:** B13 y B14 (rótulos del estante y textos flotantes) son de `GameScene.js`/`woods.js` y el feedback del bosque (B17–B19) no se tocó. Conviene probar en navegador: el logro sobre modal, Esc doble y el tildado de casillas.

## Arreglos Haiku escena (ciclo 3)

Archivo tocado: `js/scenes/GameScene.js` (sin cambios de lógica, balance ni guardado). `node --check` OK. No se levantó servidor, así que no se verificó en el navegador.

- **B13 (estante "Madera" x2)**: nueva función `rackLabel()` que saca el prefijo "Madera" de los nombres: ahora las filas dicen "Seca" y "Húmeda". Ramas, Troncos y Piñas no cambian. `woods.js` no se tocó.
- **B14 (textos sobre el estante)**: los textos que hablan de la pila (lluvia "Se mojaron ramas" / "Se mojó madera seca", "+N" del bosque, "+1 seca" del secadero) ahora van en `RACK_TEXT_X` (a 90 px a la derecha del borde del estante) en vez de `RACK.right - 60`. Siguen con su contorno negro.
- **Sensación 3 (combo tapa la llama)**: los números de combo pasan por `comboFloat()`: tope de `COMBO_TEXT_CAP = 6` a la vez (si está lleno no se muestra el número, el calor se suma igual), se abren en abanico (±28 px) y duran 850 ms con subida de 26 px. Tamaño reducido: "+N" de 0.85 a 1.05 (antes 1.0 a 1.6) y "xN" de 1.05 (antes 1.4). `floatText()` acepta un 6º parámetro opcional `opts` (`dur`, `rise`, `combo`); las llamadas viejas siguen igual.
- **B19 (flash de hallazgo)**: el flash pasa de (255, 230, 150) a (128, 115, 75), o sea la mitad de intensidad, con la misma duración de 220 ms. Sigue respetando `reduceMotion`.

Pendiente: verificar en navegador el efecto visual de B14 con la pila llena (5 maderas vistas) y el abanico del combo con muchos chispazos.
