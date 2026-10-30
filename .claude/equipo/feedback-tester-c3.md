# Feedback del tester — Ciclo 3 (prueba final)

Probado en 127.0.0.1:8080 (con `?v=c3` para saltar caché), escritorio 800×600 y emulación 812×375. **Consola: 0 errores** (ni errores de página capturados con `window.onerror`) en toda la sesión, también con reducir movimiento. Nota de método: el panel de pruebas corre a ~1 fps, así que el "juego" lo hizo un bot que avanza la escena con `game.step()`; sirve para comparar, no para medir sensaciones humanas.

## Estado general (para el usuario)
El juego carga sin errores y las piezas nuevas (parallax, amanecer, logros, eventos de bosque, fogata pico, resumen, prestigio con "ahora +N") funcionan y se ven bien; casi todos los bugs reportados quedaron cerrados. Lo que queda son detalles de maquetación en pantallas chicas (avisos que se pisan con la barra de noche y el chip del Secadero) y de pulido. El balance de noches es más tenso desde la 2 pero con un jugador poco atento o con un solo pozo se vuelve demasiado duro; falta una pasada con una persona real jugando una noche entera.

## Re-test B12–B19
| # | Estado |
|---|---|
| B12 logro sobre modal | ✅ Con el modal de nivel abierto `#achv` queda oculto y espera la cola; el logro "Aprendiz" salió después, sin pisar las cartas. |
| B13 rótulos del estante | ✅ Ahora "Seca" / "Húmeda". |
| B14 textos sobre el rack | ✅ No vi textos pisando las etiquetas en esta pasada (probé lluvia/bosque). |
| B15 doble Esc | ✅ Panel abierto + Esc + Esc rápido: el menú queda `hidden` (no abre ni pausa). |
| B16 casillas | ✅ Tildada se ve naranja con tilde; vacía oscura con borde. |
| "⏸ En pausa" | ✅ Etiqueta visible en el menú. |
| B17 (sin cambios pedidos) | ⚪ sin cambios. |
| B18 cielo de amanecer | 🟡 Ver abajo: no pude mirar el amanecer nuevo en una noche real (el bot no sobrevivió la noche 2); sí vi la noche. |
| B19 flash de hallazgo | ⚪ No lo pude repetir (el evento de bosque no salió en esta corrida). |
| "Prestigio ahora: +N" | ✅ "Prestigio ahora: +14 🪦" en Cenizas, botón dice solo "Prestigio". |

## Bugs nuevos

### Medio
**B20 — En horizontal móvil (812×375) la barra de noche se pisa con el título "¡Subiste de nivel!"** (ui)
Pasos: noche en curso, subir de nivel. La barra `#night` (centro-arriba) queda justo debajo del título del modal y se mezclan; también el chip "Secadero" (helpers) cae encima del botón de ajustes (⚙) arriba a la derecha.
Debería: ocultar/atenuar `#topc` mientras haya modal y mover `#helpers` fuera de la esquina del menú en `.compact`.
Archivo: `style.css` (`#topc`, `#helpers`, `.compact`), `Ui.js`.

**B21 — Fuegos "fuera del pozo": leña que sobra rueda y arde en el suelo a la izquierda** (escena/dopamina)
Pasos: soltar 5+ leños seguidos al pozo (el bot lo hacía): los que no caben ruedan hacia el estante y arden contra él (se ven llamas pegadas al rack en 800×600). Con rate de calor no cuentan (no están en el pozo) pero queman y se ven raros; además puede prender el estante visualmente.
Debería: que la leña sin pozo no arda, o que se apague/chisporrotee al caer fuera.
(Puede ser artefacto del bot por soltar en bloque; verificar con un jugador real.)

### Bajo
- **B22** Con 0 fósforos y solo leña húmeda el jugador puede quedarse sin forma cómoda de prender (queda el pedernal que falla). La "Caja de fósforos" cuesta más cuanto más compraste; si el calor está bajo no alcanza. Un mensaje del hint ya lo avisa ("Sin fósforos: tocá la leña para probar con el pedernal"), bien, pero el cuello de botella existe en el arranque tras prestigio con mala racha.
- **B23** La fila "Humeda ×0" del estante se ve casi invisible cuando está en 0 (bien) pero ocupa lugar; sin problema.
- **B24** No pude verificar visualmente el **anillo de pico**: tras activar el cooldown a la fuerza no aparece nada (esperable) y el pozo del bot nunca sostuvo intensidad ≥1 durante 5 s sin amontonar leña fuera del pozo. Pendiente de ver con una persona.
- **B25** El nuevo `sky-dawn` y `dawn-rays` no los vi: `dawn-rays` además no está integrado en `playDawn` (el informe de arte lo deja como pendiente de GameScene). Confirmar.

## Balance (bot, hasta noche 2)
- **Ritmo temprano** (bot atento, con chispazos): 157 de calor al min 1, 297 al 2, 456 al 3, 662 al 4, 1.748 al 10; 2.500 hacia el min 17–19 si no se queda sin fósforos. Parecido al ciclo 2 (pesa un poco menos el chispazo: bien).
- **Sin chispazos**: no logré aislar el efecto (el bot se quedó sin fósforos y madera a los ~17 min); el calor/s medio del fuego rondó 1–3.5 con 5 troncos, así que el peso real del fuego es ~la mitad de lo necesario para las metas 2.7–3.1 de la noche 2.
- **Noche 1**: con la meta suave, superada (ciclo 2 y también aquí, partida anterior del bot).
- **Noche 2–3 con el bot**: **fallaron 10 de 11 noches** (frío máx 0,95) con rate medio 1,5 contra meta 2,7–3,1 (el bot solo usa un pozo y 3–5 leños). Con un humano atento (2 pozos, pozo agrandado, ayudante) debería alcanzar, pero un jugador con un solo pozo se queda sin chances en la 2. Que no haya penalización por fallar suaviza, pero genera una cadena de noches fallidas y de "calor total ~16.000 estancado" en mi bot.
- **Recomendación de balance**: revisar noche 2 como "puerta": asegurar que 1 pozo con buena atención llegue a ~110–120% de la meta, o dar a la noche 2 una meta 25% menor que la fórmula. Y que las ráfagas heladas solo aparezcan desde la noche 3.
- **Prestigio**: a ~12.4k de calor y 1 amanecer da +14 🪦, buen salto.

## Sensaciones (máx 10)
1. Pantalla de noche con barra "1.9 / 2.7 /s · te faltan 0.8" es clara y genera tensión sana.
2. Las casillas del menú y el "⏸ En pausa" quitan fricción.
3. "Prestigio ahora: +14" anima a prestigiar de verdad.
4. El rack con "Seca/Húmeda" se lee mucho mejor.
5. El pozo se satura fácil: tirar 5–6 leños seguidos termina en fuegos desparramados en el suelo (B21).
6. Las noches se sienten una pared si no se invirtió en un segundo pozo; falta señalizar al jugador qué hacer ("construí otra fogata", "agrandá el pozo") cuando el frío sube.
7. El HUD arriba al centro (pronóstico + barra) es bueno en escritorio y se pisa en horizontal móvil.
8. Los logros dan recompensa constante; con 9/19 a los ~30 min el ritmo es bueno.
9. Los modales (cartas, resumen, menú) con cola de avisos ya no se pisan en escritorio.
10. Parallax + cielo siguen siendo lo mejor del apartado visual.

## TOP 5 para un próximo ciclo
1. **Pasada de balance con una persona real en las noches 2–3** (y un modo de prueba que adelante el reloj) para fijar la meta y la ráfaga; hoy el bot sugiere que son demasiado duras con un solo pozo.
2. **Guía de supervivencia nocturna**: consejos contextuales cuando sube el frío (segundo pozo, fuelle, techo) y mostrar "pico en N s" del anillo en la UI.
3. **Orden de pantalla en móvil horizontal**: reubicar `#topc`, helpers y barra de noche para que no se pisen con modales ni con los botones.
4. **Leña fuera del pozo**: que se apague o no arda, y límite visual de capacidad del pozo para evitar el desparramo.
5. **Herramientas de prueba / guardado**: modo debug visible (adelantar noche, dar fósforos) y un aviso claro cuando el guardado quedó tomado por otra pestaña; además estabilizar fósforos al inicio tras prestigio.

## Arreglo Haiku B25

- **Integración de `dawn-rays`** en `js/scenes/GameScene.js` (único archivo tocado): `this.dawnRays` creada en `create()` junto a `dawnSky` (depth 0.06, blend ADD, alpha 0). El origen queda en el sol (x≈435, y≈546) para que el giro sea alrededor de él.
- **`playDawn`** (solo con éxito): fundido de alpha 0→0.6 en 1800 ms, igual que el cielo. Se hace también con `fx` desactivado. Con `fx` activo se suma un giro lento (yoyo ±0.05 rad, 4 s); sin `fx` no hay movimiento ni rotación.
- **`updateNight`** (`dusk`/`start`): los rayos vuelven a alpha 0 con el mismo criterio que `dawnSky` (2.5 s con fx, instantáneo sin fx).
- Tiempos y sonidos de `playDawn` sin cambios. `node --check js/scenes/GameScene.js` OK. No se levantó servidor ni se verificó visualmente; queda pendiente ver el amanecer en partida.
- Nota: al desvanecer, el giro se detiene (el `killTweensOf` corta también la rotación); con 0.05 rad no se nota.

## Arreglo Haiku B20

- **Modal y barra de arriba:** `Ui.pump()` (que ya corre cada 200 ms y al abrir/cerrar modales) pone la clase `modal-open` en `#ui` mientras haya cartas, resumen, menú o evento abierto. En CSS, `#ui.modal-open #topc` la oculta (`opacity: 0`, `pointer-events: none`) con transición de 0.2 s. Así no se pisa con el título "¡Subiste de nivel!".
- **Chip de ayudantes:** en `.compact`, `#helpers` baja de `top: 62px` a `top: 84px`. Motivo: en esa escala `#ui.small` hace los botones ⚙/🔊 de 44 px físicos, es decir unos 61 px lógicos, así que `#hud-right` termina cerca de y=77 y el chip (que estaba en 62) lo tapaba.
- **Verificación:** `node --check js/ui/Ui.js` pasa. No corrí el juego en 812×375 (no se levantaron servidores), así que el arreglo es por lectura del CSS y falta confirmarlo a ojo.
- **Ojo con la condición:** con `k = max(0.72, w/1280)`, a 812 px de ancho `lw` da unos 1128 y `.compact` (lw < 980) no se activaría. Si el tester ve `.compact` ahí, el ancho del `#wrap` debe ser menor que la ventana. Conviene revisarlo.
