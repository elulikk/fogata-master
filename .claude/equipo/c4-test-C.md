# Ciclo 4 — prueba de C4-B y C4-C (tester)

127.0.0.1:8080 (`?v=c4c`), `MouseEvent` reales sobre el canvas (mousedown/move/up, rueda) y la escena avanzada con `game.step()`. Partida respaldada antes (`__bak_tester`) y restaurada al final; la ranura 1 que creé quedó borrada, la 2 intacta. Sin tocar código. **Consola: 0 errores del juego** (un `TypeError` en `Fire.update` lo provoqué yo llamando `fire.toAsh()` desde fuera; ver nota al final).

## Resumen
Las ranuras magnéticas funcionan y se sienten como el gran paso: base, cabaña de 3 y de 5, tipi de 2 y de 4 patas salen **al primer intento cada pieza** y en 5–10 s simulados, sin parpadeo de la silueta resaltada. Las siluetas **sí se ven** (conseguí capturarlas, ver §2). El menú de título/pausa con 3 ranuras está completo y robusto. Las caps de C4-B ahora coinciden con la física (carga al primer derrame 0,9–1,15 en casi todos los tamaños, antes 0,4–0,76). Lo que queda: **las estructuras rinden ~25 % menos calor que una pila suelta**, un tronco/leño sin rotar puede encajarse como pata de tipi sin que el jugador lo pida y hay un tramo de carga (1,05–1,15) donde la leña rueda afuera sin ningún aviso.

## 1. Encaje (MouseEvent reales, pozo tamaño 3, ramas)
| Caso | Intentos | Tiempo sim | Resultado |
|---|---|---|---|
| Base (1 rama) | 1 | ~1 s | encaja en y=642, ángulo 0°, estática, `log:snap` |
| 2 bases | 1 + 1 | ~2 s | x=603 y x=731, simétricas, sin salirse del pozo |
| Cabaña 3 (2 bases + puente) | 1 por pieza | 5,9 s | `cabana 0.60` al instante |
| Cabaña 5 (2 bases + 2 stack + puente) | 1 por pieza | 9,8 s | `cabana 0.80` |
| Tipi 2 patas (rueda ±4 pasos) | 1 por pata | 4,5 s | `tipi 0.65`, patas a −62°/+62° |
| Tipi 4 patas | 1 por pata | 9 s en total | `tipi 0.90`, etiqueta "Tipi 90%" |
- **Silueta resaltada = la esperada** en todos los casos probados (la que pedía el predicado coincidió con `drag.slot`).
- **Histéresis**: barrido horizontal de ida y vuelta a 4 px/cuadro sobre el pozo (142 cuadros): 9 cambios de silueta en total, corridas de 26–30 cuadros, **sin parpadeo**.
- **Desencajar**: agarrar un leño encajado → `unsnap:grab`, vuelve a dinámico; soltarlo en el lugar lo reencaja. El leño apilado encima recibe `unsnap:support` (esperado).
- **Caída al quemarse la base**: base a ceniza → `unsnap:support`, el puente queda dinámico y cae inclinado (−14°); la estructura baja de cabaña 0,60 a ninguna 0,03. ✓
- **Tronco grueso en pozo chico (tamaño 0)**: no hay ranura `base` para el tronco (175 px en 156 útiles), pero **sí ofrece `tipi`**, y soltado sin rotar en el centro se encajó como pata a −62° (ver C2). No cayó a física libre como se esperaba.
- **Cabaña con ramas pide tamaño ≥3**: confirmado, en tamaño 0 solo ofreció bases/tipi.

## 2. Visual de las siluetas (capturas)
Funcionó: tras cada `game.step`, `canvas.toDataURL()` en la misma tarea y el PNG pegado a un `<img>` superpuesto, y de ahí screenshot (el panel no repinta solo).
- **Se ven**: silueta base resaltada con borde claro y brillo, la otra base y las patas de tipi como un "X" tenue, y un **marco punteado** que delimita el pozo (muy útil: se entiende el límite). El texto guía *"Soltá cerca de una silueta y encaja · Rueda/Q-E gira para el tipi"* aparece abajo y se lee bien.
- Con el pozo 2 (tamaño 1) la resaltada ("tipi" a 62°) y el leño que arrastraba (horizontal, encima) se distinguían claro.
- **Débil**: las siluetas *no resaltadas* (la otra base, el X del tipi) casi no se ven sobre el fondo oscuro; con 2 piedras y el suelo, la base del lado derecho es casi invisible. Subir un poco su alfa.
- **No pude distinguir** en mis capturas el pin de apoyo ni la sombra de contacto de los leños ya encajados (el contraste y el tamaño no alcanzan); no lo puedo confirmar ni negar.
- El tipi armado (4 ramas, "¡Armaste un tipi!") se ve muy bien y legible.

## 3. Menú
- **Título al abrir**: logo + "Continuar" con resumen (*Nivel 2 · 🔥 432 · 30 oct, 13:45*), Partida nueva, Cargar, Ajustes, Créditos. ✓ En 812×375 la caja de pausa ocupa ~280/375 px y entra sin cortarse.
- **Pausa** (⚙️ o Esc): "⏸ En pausa" con Continuar, Guardar, Cargar, Ajustes, Volver al título. Con la pausa abierta, 180 cuadros después `Δfuel = 0`, `Δheat = 0`, calor sin cambios: **el fuego y el calor se congelan**. Esc abre y cierra; el foco arranca en "Continuar" y ↓ mueve el foco.
- **Guardar**: 3 ranuras con resumen; guardar en vacía no pregunta, sobre una ocupada pregunta *"¿Pisar la ranura 2?"* (Cancelar resaltado por defecto). Cancelar dejó la ranura 2 intacta. ✓
- **Borrar** (🗑): *"¿Borrar la ranura 1? No se puede deshacer."* → borra de verdad (`localStorage` sin la clave).
- **Cargar**: lista Autoguardado, 3 ranuras, "Copia previa", "Importar archivo…"; las ranuras vacías tienen el botón deshabilitado ✓; confirma *"¿Cargar esta partida? … queda en 'Copia previa'"* y al aceptar vuelve el estado de la ranura (calor 426, pozo tamaño 3).
- **Volver al título** → título con el último resumen; **Partida nueva** pide *"Borrar y empezar"*, hace copia previa y arranca con pozo tamaño 0 / 6 ramas / 2 troncos / 3 fósforos. Cancelar vuelve al título.
- **Créditos** trae "Cómo armar" (base, cabaña, tipi): buena ayuda.
- **Ajustes** desde el título se abre encima. Sigue existiendo "Reiniciar partida" en Ajustes además de "Partida nueva" (duplicado; inofensivo).
- Esc con el evento de teclado sintético solo funcionó con `keyCode: 27` (Phaser lo usa), no con `key` solo: es del arnés de prueba, no del juego.

## 4. C4-B
**Cap mostrada vs física** (ramas lanzadas desde arriba con `addLog`, sin ranuras, hasta que 3 quedan fuera; `loadRatio` en ese momento; 2 corridas):
| Tamaño | half / wallH | cap | `loadRatio` al 1.er derrame | A (antes) |
|---|---|---|---|---|
| 0 | 90 / 69 | 26.000 | 0,63 / 0,92 / 0,92 (18–19 ramas) | 0,98 |
| 2 | 112 / 87 | 37.700 | 1,03 / 1,11 | n/m |
| 4 | 142 / 108 | 54.600 | 1,13 / 1,15 | 0,40–0,51 |
| 7 | 205 / 144 | 88.400 | 0,93 / 1,14 (55–68 ramas) | n/m |
→ **mejora muy grande**: casi todo entre 0,9 y 1,15; un 0,63 en tamaño 0 fue una rama mal caída (ruido). Tope 80 leños suficiente (68 dentro en tamaño 7).

**Avisos de pozo lleno**
- Con el pozo en carga 1,1 y 10 soltadas con el mouse: solo 2 eventos `out` (silenciosos), **ningún aviso**, 7 leños terminaron afuera (ver C4).
- Con carga >1,15 (30 ramas apiladas): 10 soltadas, 10 eventos `full` (≈1 cada 1,5 s, el cooldown de 0,8 s se respeta) y un "Pozo lleno" flotante por intento, sin toast repetido ni spam. No salió ningún `wall` en estas pruebas (mis soltadas eran suaves).
- Se alcanzó a ver la etiqueta cambiando (`3.9/3.5 🪵`, `4.1/3.5`) con la carga.

**Etiqueta**: "Fogatita", "3.9/3.5 🪵", "Tipi 90%"; el texto de stackPenalty ("ahogado: armá tipi/cabaña") no se llegó a disparar (necesita tamaño ≥3 y montón con carga >0,75; en mis pilas de 28 ramas a tamaño 3 no la vi porque el lado `p.stackPenalty` quedó en 0; sin verificar).

**Balance (muy rápido, lo que pude)**
- **Estructuras vs pila suelta (mismas ramas, todas prendidas)**:
  | Prueba | calor total hasta ceniza | calor/s medio (6 s) |
  |---|---|---|
  | Tamaño 0, pila de 4 ramas | 19 | 2,56 |
  | Tamaño 0, tipi de 4 patas (0,90, bonus 0,09) | **14 (−26 %)** | **1,93 (−25 %)** |
  | Tamaño 3, pila de 5 ramas | 114 | – |
  | Tamaño 3, cabaña de 5 (0,80) | **89 (−22 %)** | – |
  Es decir, **armar una estructura rinde menos que tirar la leña en montón** (ver C1). El tope de bonus de 30 % no se nota porque el bonus real medido es ~+9 %.
- **Noche 1** (pozo 3, 1 rama cada 6 s con el fuego prendido, 150 s simulados): ritmo 2,1 → 3,6 → 2,3 → 2,0 → 1,4 /s; frío máx 0,21. Aprobable con atención mínima, sin errores.
- **Ritmo hasta 2.500**: **no medido** (sin tiempo; el bot de ciclos anteriores dependía de utilidades que perdí al compactar). El resto del ritmo temprano queda como en C3 (2.500 hacia el min 17–19).

## 5. Regresión
- **Guardado v2** (pits `[3,1]`, `bought.agrandar_*`, sin `settings` ni `night`): `importSave` ok → `version 3`, pits 3 y 1, `settings`/`night` rellenados. Al recargar, los pozos quedan en x 537 y 933 y las ranuras funcionan en el segundo pozo (silueta en el pozo 1, ninguna en el 0).
- **Prestigio** con Hogar heredado nivel 3: pozo inicial tamaño 3 (cap 56.160), +13 🪦, resumen "Nuevo comienzo", sin errores.
- **Noches**: la fase noche corre y sube el frío sin errores.
- **Móvil 812×375**: HUD, menú de pausa y botones ok (cartas/logro de amanecer también).
- **Táctil real** (dock ↺ ↻, 2.º dedo, radio 100 px): **sin verificar** otra vez; Phaser ignora los `TouchEvent` sintéticos.
- Mi `Fire.update` TypeError (nota): llamar `fire.toAsh(log)` desde fuera deja la leña en `ceniza` dentro de `fire.logs` hasta el final del update y `Fire.update` (línea ~632) hace `l.x` en cada cuadro → se rompe. Solo lo provoqué yo; el camino normal limpia al final del mismo update.

## Bugs priorizados
**Alto**
- **C1 — Las estructuras rinden ~25 % menos calor que la pila suelta** (progresión/física). Tipi 4 ramas: 14 vs 19 calor, 1,93 vs 2,56 /s; cabaña 5 en tamaño 3: 89 vs 114. El bonus de estructura (~+9 %) no compensa lo que se pierde (probable: las leñas encajadas son estáticas y no ganan contacto/aire/ignición como en una pila). Hoy no hay motivo económico para armar tipi o cabaña. Revisar `structureBonus` vs la quema de leños estáticos.

**Medio**
- **C2 — Leña sin rotar se encaja como pata de tipi** (física). Sobre el pozo chico un tronco de 175 px no tiene base y soltarlo encajó a −62°, estático, como una pata solitaria. También un leño horizontal de rama por encima del centro resalta el tipi (en el barrido, 9 cuadros) y soltarlo lo rota 62° sin que el jugador lo pidiera. Debería: sin `drag.aim`, no ofrecer ranuras de tipi (o exigir rotar), y caer a física libre.
- **C3 — Un modal que se abre en pleno arrastre cancela el arrastre y la leña se suelta con encaje** (ui/física). Pasó con el modal de nivel; el jugador pierde el agarre y la leña queda encajada donde pasaba (en mi caso una pata de tipi). Debería: soltar sin encajar o diferir el modal hasta soltar.
- **C4 — Hueco sin aviso entre carga 1,05 y 1,15** (física/ui). El pozo ya no ofrece ranuras (>1,05) pero `full` recién salta a >1,15; las soltadas ruedan afuera como `out` (silencioso): 10 soltadas, 7 leños afuera, **ningún aviso**. Unificar los umbrales (avisar a >1,05).

**Bajo**
- **C5 — Banners de estructura superpuestos**: "¡Armaste una cabaña!" y "¡Armaste un tipi!" visibles a la vez cuando se arma algo y se rearma enseguida; quedan encimados (el duplicado del mismo texto, A3, ya no ocurre).
- **C6 — Siluetas no resaltadas casi invisibles** (arte): ver §2; subir alfa o contorno.
- **C7 — No pude ver el pin de apoyo ni la sombra de contacto** en captura (arte/QA): revisar con zoom real.
- **C8 — Dock táctil, 2.º dedo y radio 100 px sin verificar** (QA): dispositivo real.
- **C9 — "Reiniciar partida" (Ajustes) y "Partida nueva" (título) duplicados** (ui): consolidar.
- **C10 — Ritmo hasta 2.500 no medido** (QA).

## Sensaciones
1. Encajar la leña por fin se siente **limpio**: sueltas cerca y listo; se acabó "se sale de la hitbox".
2. La silueta resaltada brilla justo donde esperás; el marco punteado del pozo explica el límite.
3. El tipi con la rueda en pasos de 15° y la silueta guía es casi un puzzle simpático.
4. La cabaña de 3 piezas (dos bases + puente) es rapidísima y visible: buen primer logro.
5. Cuando la leña no se encaja (pozo lleno) y vuelve sin explicar, sigue confundiendo en el rango 1,05–1,15.
6. El menú con 3 ranuras, confirmaciones y copia previa da tranquilidad; pausa congela de verdad.
7. Falta un incentivo: armar una estructura "queda lindo" pero quema peor que tirar leña (C1).

## TOP 5 para la próxima iteración
1. **Arreglar el rendimiento de las estructuras (C1)**: que tipi/cabaña rindan más que la pila suelta (≥ +15 %), si no ranuras y estructuras son solo estética.
2. **No encajar en tipi sin rotar (C2)** y dejar caer a física libre los leños que no tienen ranura de base (troncos gruesos en pozo chico).
3. **Aviso de pozo lleno desde carga 1,05 (C4)**, mismo umbral que "no ofrece ranuras".
4. **Modal en pleno arrastre (C3)**: soltar sin encajar o esperar a que suelte.
5. **Verificar en táctil real** (dock, 2.º dedo, radio 100 px) y subir el alfa de las siluetas secundarias (C6/C8); revisar pin y sombra de contacto con zoom.
