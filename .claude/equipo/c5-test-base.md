# Ciclo 5 — prueba base como jugador nuevo (tester)

127.0.0.1:8080 (`?v=c5`), partida nueva real ("Jugar"), `MouseEvent` reales y `game.step()` + capturas del panel (las 8 capturas están en `.claude/equipo/capturas-c5/`, PNG). El `localStorage` de este origen estaba **vacío** antes de empezar; quedó vacío al final, con `state.locked = true`. Sin tocar código. Consola: 0 errores en todo el ciclo.

**Aviso de método**: la "persona" de las secciones 2–5 es un bot atento (suelta 1 leña cada 3 s, va al bosque cuando se queda sin ramas, compra lo más barato que no sea consumible, elige la primera carta, **no junta chispazos con el mouse** y quema los troncos solo si le sobran más de 8). Da una cota de ritmo razonable, no la de una persona real. Los toasts/avisos no se pueden fechar con este arnés (sus timers corren en tiempo real y yo avanzo 600 s simulados en 25 s), así que las horas de abajo son de sim, no de avisos.

## 1. Línea de tiempo de la primera sesión (sin conocimiento previo)
| t | Qué ve el jugador | Notas |
|---|---|---|
| 0:00 | **Título**: 🔥 "Fogata Master · Prendé, cuidá y hacé crecer tu fogata", botones Jugar / Cargar / Ajustes / Créditos (cap. 01). | Claro y bonito. Jugar es el único botón resaltado. |
| 0:01 | Entra directo a la escena: **ya hay un pozo con dos leños y fuego prendido** (un tronco y una rama), rack "LEÑA" con Ramas ×6 / Troncos ×2, luna, bosque (cap. 02). El HUD de calor todavía no existe; solo "3 fósforos" y los botones ⚙ y 🔊. | El arranque con fuego ya prendido elimina la duda de "¿qué hago?" y es un buen gancho. |
| 0:01 | Sale **un solo hint** abajo: *"Arrastrá leña de la pila y tirala al fuego."* | Se entiende. Texto pequeño (17 px) pegado al suelo y casi sobre la etiqueta del pozo. |
| ~0:03 | Aparece el contador de calor y el toast *"Tu fogata da calor. El calor es tu moneda: juntalo."* | Llega justo a tiempo. |
| ~0:05 | **Primer arrastre** sobre el pozo: el hint cambia a *"Soltá cerca de una silueta y encaja · Rueda/Q·E gira para el tipi"*; se dibujan el marco punteado del pozo y la silueta en X del tipi (cap. 03). | **Aquí se descubre encajar y rotar.** Pero el hint solo aparece cuando ya tenés la leña agarrada sobre el pozo (≈2 s después del primer arrastre). La silueta de `base` no se ve porque las dos leñas que trae el pozo ya la ocupan; el jugador ve primero el X del tipi y piensa que "eso es lo único que se puede hacer". |
| ~0:10 | Si soltás una leña lejos de una silueta (a 80 px), cae libre y se apila sin pasar nada. | Funciona y no castiga. |
| 0:13 (sim) | Toast *"Se te va a acabar la leña. Podés ir al bosque a buscar más."* y aparece "Ir al bosque". | Buen momento. |
| 0:35 | 100 de calor. 0:42 aprox. tienda ("Mercachifle") y cartas (180). 1:02 nivel 2 → primera carta. | Cadencia de desbloqueos buena y rápida. |
| 1:55 | 450: aparecen clima y "Construir". | |
| **Tipi / cabaña** | El tipi se descubre solo por el hint del primer arrastre; en 4 patas todas hacia el mismo lado el juego rota la 3.ª y 4.ª ("Se encaja del otro lado"), la etiqueta cuenta **"Tipi 1/4 → 2/4 → 3/4 → Tipi 90 %"** y un 5.º muestra "No hay más lugar en el tipi" (cap. 08). | **C4-G ✓ completo** (ver §4). |
| | **La cabaña no se descubre jugando**: ningún texto del juego la nombra salvo "Créditos → Cómo armar" y solo se puede armar con pozo tamaño ≥3 (≈ 21 min de juego con mi bot). | Ver H7. |

## 2. Ritmo (bot atento, sin leña infinita, sin chispazos, sin orbes)
| Hito | Tiempo sim |
|---|---|
| 100 de calor total | **0:35** |
| **500** | **2:05** |
| **1.500** | **6:44** |
| **2.500** (se abren las noches) | **11:31** |
| 4.500 (tormentas) | 17:22 |
| 10.485 | 30:00 (nivel 10) |
Referencias: C3 daba 2.500 a los 17–19 min con otro bot; este (más atento, mejoras compradas a tiempo) llega en 11:31: el real debería ir **entre 10 y 18 min**.

**Desbloqueos y compras** (en sim): fuelle 0:57, canasta 1:21, hacha 1:53, botas 2:25, techo 7:05, **fogata más grande (1.er nivel) 10:41** (antes: bot v1 que quemaba troncos nunca podía comprarla), leñera 12:25, secadero 17:05, 2.º nivel de grande 21:37, **2.ª fogata 24:25**, techo 2.ª 25:05, agrandar 2.ª 26:25.
**Niveles**: 2 a 1:02, 3 a 2:12, 4 a 3:41, 5 a 5:30, 6 a 7:30, 7 a 9:11, 8 a 13:53, 9 a 18:50, 10 a 26:25.
**Noche 1**: empieza ~16:02 (≈ 4:30 tras desbloquearse), el bot rinde **5,2/s contra meta 2,5 → ¡vas bien!**, la supera sin que el frío pase de 0 (amanecer ~24:00, +3 cenizas). La noche 2 (meta 2,3) también va holgada. Es decir, con un pozo medio la noche 1 **no es un desafío** para alguien atento.

**Dónde me trabé / aburrí** (sim):
- **6:44 → 10:41, ritmo clavado en ≈2,5/s**: no hay nada que comprar salvo consumibles ("Atado de ramas" de 10🔥 a 81🔥 tras 23 compras). La única mejora importante (Fogata más grande, 286🔥 + **2 troncos**) está bloqueada por los **troncos**, que un bot que los quema (o un jugador que no los guardó) no tiene; la tienda no dice "comprá troncos". Con el bot corregido compró troncos y la mejora llegó a 10:41 y el ritmo se duplicó (5,2/s).
- **12:25 → 17:05 y 17:05 → 21:37**: una compra cada 4–5 min; sobra calor sin nada que gastar.
- **Sobran**: fósforos (9–11 acumulados, 0 usados: el fuego nunca se apagó), piñas (38) y húmeda (16) sin uso claro. **Faltan**: ramas (rack casi siempre en ×1–7; 22 viajes al bosque en 30 min ≈ 1 cada 80 s).

## 3. Crítica visual (capturas reales)
| Elemento | Captura | Crítica |
|---|---|---|
| Título | 01 | Muy bien: logo con brillo, jerarquía clara. |
| **Cielo / día-noche** | 02, 04, 06, 07 | **El cielo es siempre de noche** (luna y estrellas), también en la fase "Día" de 5 min; arriba aparece "🌙 Noche despejada" incluso de día. La noche no se siente como un cambio. Solo el amanecer pinta distinto. |
| Fuego | 02, 06, 07 | Lo mejor del juego: brasas, chispas, luz cálida sobre el bosque. Pero las llamas son manchas planas amarillo-naranja: el centro blanco se "quema" y los leños dentro del fuego se leen como **rectángulos naranjas lisos** (06, 07), sin veta ni borde. |
| Leña | 02, 03 | En reposo se ve bien (veta, nudos). Con la silueta de rotación 03 el X celeste del tipi queda muy débil frente a la luz del fuego; la silueta de `base` no se aprecia (ocupada). |
| Pozo chico | 02, 08 | Piedras claras "blobs" con ojitos/pecas poco prolijas y de un beige que contrasta mucho con el fondo oscuro: parecen bolitas de algodón. Los dos topes laterales (cajitas grises con triángulo naranja) se leen como "postes". |
| Pozo grande | 07 | Las paredes de piedra del tamaño 5 son bloques naranja plano (iluminados por el fuego); el techo es una **tabla gris larguísima sobre dos postes finos**, desproporcionada y desconectada del pozo (cubre casi la mitad de la pantalla). |
| Pozo apagado + techo | 06, 07 | El 2.º pozo apagado con techo queda oscuro, sin identidad; el techo se ve igual de grande para un pozo chico. |
| **Etiqueta del pozo** | 02, 06, 07 | "Fogón 2.1/6.1 🪵 · Tipi 90 %" está en **12 px con 75 % de opacidad**, pegada al suelo: casi ilegible sobre todo en la captura de 800 px; es justo la información nueva (estructura, carga). |
| HUD | 06 | Calor y "+7.7/s" bien. Barra de nivel muy fina y su texto (13 px) pequeño. La barra de noche (centro) con el pronóstico "Noche despejada" es clara. |
| Textos del mundo | 08 | **Se apilan 4 textos a la vez** en el centro del pozo ("Fogata más grande", "¡Armaste un tipi!", "Se encaja del otro lado", "No hay más lugar en el tipi"), semitransparentes, mezclados con las llamas: ilegible y desprolijo. |
| Tarjetas de evento | 04, 06, 07 | La tarjeta "En el bosque · Claro soleado" queda detrás/encima de la barra de noche y de los toasts (opacidad a medias): ruido visual (puede ser efecto de mi arnés, ver aviso). |
| Botones laterales | 06, 07 | "Ir al bosque / Mercachifle / Construir / Cenizas" con etiquetas "NUEVO" rojas en una esquina: bien. El chip "Secadero" abajo a la derecha **tapa parte de la etiqueta del 2.º pozo** y queda pegado a "Cenizas". |
| Rack | 04, 06 | Bien: madera con veta y números legibles; con 5 filas ocupa media altura. |
| Resumen de amanecer | 05 | Claro y bonito. "Carta gratis: te espera" es ambiguo. |

## 4. Verificación de C4-G (física)
✓ **Todo**: 4 patas con la misma rotación (−4 pasos) → silueta/ranura espejadas a la 3.ª y 4.ª, etiqueta **"Tipi 1/4, 2/4, 3/4" y luego "Tipi 90 %"**, flotante **"Se encaja del otro lado"** y, al soltar un 5.º, **"No hay más lugar en el tipi"** (la leña cae libre). Ver cap. 08 (los textos se superponen, H2).

## 5. Rendimiento (render real incluido)
`game.step()` ejecuta simulación **y** render WebGL; medí con `readPixels` al final para forzar la espera de la GPU. Equipo de escritorio, 1280×720, DPR 1, WebGL:
| Escena (pozo tamaño 7) | Leñas / ardiendo | ms/frame (CPU+render) | con sync GPU |
|---|---|---|---|
| vacío | 0 / 0 | 0,45 | 1,23 |
| 20 leñas | 20 / 18 | 1,47 | 1,54 |
| 40 | 40 / 40 | 2,15 | 2,21 |
| 47 (tope de ardiendo sostenible) | 47 / 47 | 2,55 | 2,78 |
| 72 | 72 / 72 | 3,47 | **3,64** |
Con 72 leñas ardiendo a la vez el costo total es ≈ 3,6 ms (≈ 275 fps de margen en esta GPU). En un celular medio (4–8× más lento) serían 15–30 ms: **es el punto a vigilar** (las llamas/glow ADD por leña). **No medí móvil real**.

## Bugs
**Medio**
- **H1 — Nunca se ve de día.** El cielo es de noche en todas las fases; la etiqueta dice "Noche despejada" en pleno día. Rompe el sentido del ciclo y de "aguantá hasta el amanecer" (el amanecer es lo único que cambia el cielo). (arte/escena)
- **H2 — Textos flotantes apilados** (cap. 08): 4 mensajes a la vez sobre el pozo, con avisos viejos ("Fogata más grande") todavía visibles. Hace falta una cola o distinto anclaje y vida más corta. (ui/dopamina)
- **H3 — Etiqueta del pozo ilegible**: 12 px / 75 % de opacidad, pegada al suelo; contiene lo más nuevo (estructura n/4, carga). Y el chip "Secadero" la tapa en el 2.º pozo. (ui)
- **H4 — Zona muerta de progresión 6:44–10:41 (y 12–22 min con 1 compra cada 4–5 min)**: el ritmo se clava en ≈2,5/s porque la única mejora (Fogata más grande) pide 2 troncos y el juego no lo señala; sobra calor sin destino. (progresión/ui)
- **H7 — La cabaña no se descubre**: sin hint ni objetivo; en tamaño <3 es imposible y el juego no lo dice. El tipi sí tiene su hint. (ui/progresión)

**Bajo**
- **H5 — Recursos sin uso**: fósforos (9–11 sobrantes), piñas (38), húmeda (16); en cambio faltan ramas (22 viajes en 30 min).
- **H6 — "Atado de ramas" sube de 10🔥 a 81🔥 tras 23 compras**: trampa de gasto para el jugador que lo usa para no ir al bosque.
- **H8 — Las dos leñas iniciales ocupan la base**, así que en el primer arrastre no se ve la silueta de `base`, solo el X del tipi.
- **H9 — El título tras "Partida nueva" muestra "Continuar · Nivel 1 · 🔥 0"** (un guardado vacío), poco claro.
- **H10 — El hint inicial (17 px) queda sobre la etiqueta del pozo**, y las llamas lo tapan cuando el fuego crece.
- **H11 — Piedras beige y topes grises del pozo se ven "de juguete"** frente al resto del arte (ver §3).

## TOP 5 para mejorar la experiencia
1. **Ciclo día/noche visible**: cielo, luz y paleta distintas en día, atardecer, noche y amanecer; cambiar "Noche despejada" por el clima real. Hoy el juego parece siempre de noche.
2. **Un solo mensaje a la vez sobre el pozo** (cola/stack con vida corta) y subir la legibilidad de la etiqueta del pozo (14–16 px, opacidad completa, fondo suave), sin que el chip "Secadero" la tape.
3. **Guiar la progresión media**: mostrar "Próximo objetivo" (p. ej. *"Fogata más grande: 286🔥 + 2🪵 — el Mercachifle vende troncos"*) y avisar qué falta; evitar la meseta de 7–11 min.
4. **Hacer descubribles la cabaña y las decisiones**: hint de cabaña cuando el pozo llega a tamaño 3, silueta previa, y un mini-objetivo "armá tu primera cabaña/tipi"; mostrar por qué rinde más.
5. **Pulir los materiales**: leños dentro del fuego (rectángulos lisos), piedras del pozo (bolitas beige) y techo (tabla enorme); medir el render en móvil real con 40+ leñas ardiendo.

## Resumen de 3 líneas
1. Primeros 5 min: buen arranque (fuego ya prendido, un hint claro, silueta/tipi descubiertos en el primer arrastre) y C4-G ✓ (Tipi 1/4…90 %, "del otro lado", "No hay más lugar"); la cabaña no se descubre y el juego nunca se ve de día.
2. Ritmo (bot atento): 500 a 2:05, 1.500 a 6:44, 2.500 a 11:31, 4.500 a 17:22; hay una meseta de 6:44 a 10:41 (Fogata más grande pide 2 troncos y nadie lo avisa) y noches 1–2 holgadas (5,2/s contra 2,5).
3. Render: 3,6 ms/frame con 72 leñas ardiendo (WebGL, escritorio); lo más feo a pulir es el texto apilado sobre el pozo, la etiqueta de 12 px y los materiales del fuego/pozo/techo.
