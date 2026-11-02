# Informe de física e interacción

## C4-A (fase 1)

Probado en 127.0.0.1:8080 con MouseEvent reales sobre el canvas (mousedown/move/up, rueda, clic derecho, teclas) y `game.step`. `node --check` OK en todo. Sin errores en consola.

### Antes / después (métricas de `c4-baseline-tester.md` §8)
| Métrica | Antes | Después |
|---|---|---|
| Rotar a propósito | imposible | rueda (15°), Q/E sostenidas (Shift = fino), clic derecho (+45°), `rotateDrag/rotateStep`. Medido: 4 pasos de rueda = 59,6°; clic derecho = 45°; E 0,5 s = 86° |
| Troncos que entran (pozo 0, cap 31.200 con `tiraje` 1,2) | 3 (4º ya ahoga) | 4 caben; el 5º (`loadRatio` > 1,15) rebota a x=508, 58 px fuera, sin arder |
| Ramas que entran | 10–11 | ~24 (cap/1.500 hasta 1,15) |
| Capacidad mostrada = física | no (H1) | misma fórmula: `BASE × SIZES.cap × mods.capacity × (1+0,4·q cabaña)`; `oxygen` baja a partir de `loadRatio` 1 |
| Ancho/paredes | 2 topes bajos | 2 paredes estáticas (`wallH` 46…96) + piedras; ancho 180…410 |
| Leña que sobra | rueda hasta ~700 px y arde (B21/H3) | rebota al lado, no prende por calor de vecinas, apagada en el suelo en 1,5 s → ceniza ~3 s, o vuelve al estante a los 6 s (medido: devolvió 2, `res.tronco` +2) |
| Ángulo de las leñas apoyadas | ≤17° | tipi armado con drags reales: logs a −70/70°, −57/57°; calidad 0,81 |
| Estructuras | no existen | tipi 0,81 (4 leños, pozo tamaño 3), cabaña 0,84 (5 apilados), 8 al azar = `monton` (calidad 0) |
| ms/frame de simulación | 0,9 (~15) | 1,8–2,0 con 35–44 leños (14 ardiendo, sin render) |
| Soltar sobre un pozo (H7) | hasta 20 px/paso | tope 8 y ×0,45 si cae sobre un pozo |
| H9 (`Log.pop` al destruirse) | TypeError | corregido (`onUpdate` revisa `s.active/body` y para el tween) |

### Qué cambió
- **GameScene**: `pitPositions(sizes)`/`layoutPits()` (reparto por huella en 1.000 px a la derecha del estante; separación ≤110 px, grupo corrido a la izquierda; mover un pozo arrastra su leña); input (rueda, Q/E, clic derecho, segundo dedo, `disableContextMenu`, `addPointer(1)`, los ids de puntero evitan que el 2º dedo o el botón derecho suelten la leña); `rotateDrag/rotateStep/addAim/updateDragRotation`; `startDrag/endDrag` (leña agarrada atraviesa paredes, despierta la pila, amortigua al soltar); `removeLog/updateStray/returnLog`; eventos; `rateBreakdown(..., pits.map(p=>p.structureBonus))`; `buy` llama `layoutPits()` tras agrandar o sumar pozo (progresión puede reemplazarlo).
- **Pit**: lee `sizes.js` (`half`, `wallH`, `capacity`, `calorMult` diluido, `airSize`, `hs`); paredes (`pit.walls`, categoría `WALL_CATEGORY`) más un dibujo mínimo (`wallGfx`, depth 19; el arte lo reemplaza); `setX`, `top` = 230+28·size; emite `pit:grow`.
- **Fire**: `trackLogs` (fricción 0,9/estática 1,6 dentro del pozo, rebote, paredes, apagado), `overflow`, `updateStructures/scanStructure` (4 Hz, estable 1,5 s, lerp 1,5/s), efectos de estructura y tamaño, `wakeLogs`, puntales.
- **Log**: flags (`dragged`, `overflow`, `wallPass`, `quench`, `prop`…), `setWallPass`.
- **utils/structure.js** nuevo: `detectStructure(logs, half, groundY)` puro. `main.js`: `enableSleeping: true`.

### Decisión extra: puntales ("clavar" la leña en pie)
Con un solo puntero, nada se queda parado y no se puede armar un tipi. Si soltás una leña en un pozo con más de ~32° de inclinación, un torque amortiguado conserva su ángulo; al quedar quieta se vuelve estática (`prop.frozen`) para que otra se apoye. Se libera cuando la tocan 2 leños, al agarrarla, al salir del pozo o a los 60 s. El A de dos leños se sostiene y los dos se clavan. Un tipi bien armado necesita pozo mediano o grande: con el pozo 0 (paredes de 46 px) el espacio para leños apoyados afuera casi no alcanza, lo que encaja con "el tamaño cambia la forma de cargarla". Si es demasiado, se apaga con `l.prop = null` en `endDrag`.

### Contratos expuestos (nombres exactos)
- Escena: `rotateDrag(dir)` (-1|0|1, continuo), `rotateStep(deg)`, `layoutPits()`, `pitPositions(sizes)`, `removeLog(l)`.
- Eventos de `scene.events`: `log:rotate {dir}` (cada ~12°), `log:rest {log, onLog}`, `log:overflow {log, pit}`, `log:returned {log}`, `pit:grow {pit, size}`, `structure:formed {pit, type, quality}` (estable y calidad ≥0,6), `structure:lost {pit, type}`.
- Pit: `structure = {type:'tipi'|'cabana'|'monton'|'ninguna', quality 0..1, stable, height}`, `loadRatio`, `capacity`, `calorMult` (diluido), `structureBonus` (0..0,2 de calor, ya con tope), `sAir/sIgnite/sFuel`, `walls`, `half`, `wallH`, `x`.
- Log: `prop`, `dragged`, `overflow`.

### Efecto en el fuego (valores de `STRUCTURE`, ×calidad)
Tipi: aire ×(1+0,30q), prende ×(1+0,35q) más rápido, combustible ×(1+0,10q). Cabaña: aire +0,15q, prende 15%q más lento, consume −15%q, capacidad +40%q. Calor: `structureBonus` (tope 0,2) lo cobra `rateBreakdown`. Tamaño: aire ×`SIZES.air`; inercia de prendido ×(1+0,05·size); lecho ×(1+0,15·size); lluvia ×(1+0,1·size) sin techo; `hs` solo escala la luz (+30%·(hs−1)) y el tope de intensidad (1,4·(1+0,3·(hs−1))); no se usa para normalizar el calor, así `calorMult` queda como único multiplicador de calor.

### Pendientes / riesgos
- **No probado**: el segundo dedo (touch), aunque la lógica está (ángulo entre dedos, ids de puntero). Falta probar en dispositivo táctil.
- Las paredes se dibujan con un rectángulo provisional; arte debe reemplazarlas por tamaño (`Pit.drawWalls`).
- Los textos de aviso ("el pozo está lleno", hint de rotar) y la UI de carga/estructura son de UI/dopamina.
- `PIT_SLOTS` ya no existe; las posiciones no se guardan.
- Las piedras laterales de los tamaños 6–7 invaden unos px la huella vecina (cosmético).
- La cabaña se detecta como "capas horizontales alineadas y apoyadas"; en 2D de perfil no se distingue del apilado prolijo. Por eso se premia la alineación y la horizontalidad.
- El cuerpo físico no se achica al consumirse la leña (solo el sprite).
- Pedidos: progresión (`canFit`, tope de calor por estructura ya aplicado, mensaje de por qué no entra), UI (dock ↺ ↻ → `scene.rotateDrag(dir)`, `pitInfo` desde `pit.loadRatio/structure`), dopamina (eventos listados), arte (paredes y contorno ghost por `pit.half/wallH`).

## C4-B (fase 1)

Probado con arrastres reales (mousedown/move/up, rueda) y `game.step` en 127.0.0.1:8080. `node --check` OK, consola sin errores.

### A1 · Capacidad calibrada (medido)
Método: soltar ramas o troncos al azar sobre el pozo (±0,55·half) hasta que 3 caen fuera, con el rebote por carga desactivado. Se mide el área que queda adentro. Con las paredes de la iteración A casi no crecía: 25–70% de `cap` entraba desde el tamaño 1 (ramas dentro: 16, 17, 17, 20, 30… de `cap`/1.500 = 17, 24, 32…).

Decisión: físicamente más (paredes ×1,5) **y** `cap` ajustado a lo medido. Subir las paredes más (×2,2) casi no mejoró, y no se puede ensanchar porque el layout manda. `Pit.WALL_K = 1.5` multiplica `wallH` (el getter `Pit.wallH` lo usan física y arte, así que el dibujo acompaña). Además `MAX_LOGS` 45 → 80, porque 45 ramas (67.500) no llenaban los pozos grandes.

| Tamaño | `half` / `wallH` real | Antes: área medida, `cap` viejo | Área que entra ahora (media 4 pruebas) | `cap` antes → ahora |
|---|---|---|---|---|
| 0 | 90 / 69 | 24.000 (0,92 de `cap`) | ~29.000 (ramas 12–17, troncos 5) | 1,0 → 1,0 |
| 1 | 100 / 78 | 25.500 (0,70) | ~28.000 | 1,4 → 1,2 |
| 2 | 112 / 87 | 25.500–40.000 (0,52) | ~38.000 | 1,9 → 1,45 |
| 3 | 126 / 96 | 30.000–44.000 (0,46–0,68) | ~47.000 | 2,5 → 1,8 |
| 4 | 142 / 108 | 45.000 (0,5) | ~45.000 | 3,3 → 2,1 |
| 5 | 160 / 120 | 72.000 (0,64) | ~62.000 | 4,3 → 2,5 |
| 6 | 180 / 132 | 58.000 (0,4) | ~79.000 | 5,6 → 3,0 |
| 7 | 205 / 144 | 70.000 (0,36) | ~87.000 | 7,5 → 3,4 |

Con `mods.capacity` 1,0. En el juego base se multiplica por 1,2 con `tiraje`. Pedido a progresión: `shop.js` ya calcula "N troncos" desde `cap`; los números nuevos bajan la capacidad prometida de los pozos grandes (de 7,5 a 3,4 × BASE). Si querían más, hay que ganarlo con ancho (`half`) o con más paredes, no con `cap`.

### Cambios
- **A2 · `log:overflow`** ahora trae `reason`: `'full'` (carga >1,15), `'wall'` (leña soltada que rebota contra la pared con velocidad relativa >3) y `'out'` (soltada sobre un pozo y termina fuera). Cooldown de 800 ms por pozo (`Fire.notifyOverflow`). Medido: 30 ramas al azar → 7 avisos.
- **A4**: `updateDragRotation` suelta el drag si la leña ya no tiene cuerpo.
- **A5 · Puntal**: solo se clava si está apoyado (`Fire.isSupported`: punta en el piso, pared u otra leña). Un puntal clavado que pierde su apoyo se suelta (revisión a 4 Hz).
- **A6 · Cabaña real** (`utils/structure.js`): capas de leños casi horizontales con apoyo en los DOS extremos sobre leños o pared ("puente") y hueco debajo del medio; mínimo 2 capas y 1 puente. Una torre de planos es `monton`. Probado: 2 ramas base + tronco puente + 2 postes + 2º puente = cabaña 0,79 (se emitió `structure:formed`); 5 troncos apilados = `monton`, calidad 0; tipi de 4 ramas = 0,88. `detectStructure(logs, half, groundY, walls)` ahora recibe las paredes `[{x, h}]`.
- **Oxígeno en pozos grandes**: con tamaño ≥3 y estructura `monton`, `p.stackPenalty = 0,4·clamp((carga−0,75)/0,4, 0, 1)` multiplica el oxígeno. Medido: 28 ramas (carga 0,90) → penalidad 0,15, oxígeno 0,85. Tipi y cabaña no la sufren. `pit.stackPenalty` queda expuesto para la UI.

### Contratos nuevos
`log:overflow {log, pit, reason}`, `Pit.WALL_K`, `pit.stackPenalty`, `fire.isSupported(log)`, `fire.notifyOverflow(log, pit, reason)`.

### Pendientes
- Medición con 3 salidas como corte es ruidosa (±30%); conviene que el tester repita con drops de jugador real.
- Las paredes ×1,5 cambian el aspecto de todos los pozos: el arte debe revisarlo (marcas de carga, ghost, `tileSprite`).
- El segundo dedo táctil sigue sin probar en dispositivo real.

## C4-C · Ranuras magnéticas

Pedido del usuario: que la leña encaje (imán/grilla) en vez de depender de soltarla a mano. Implementado en `utils/slots.js` (funciones puras) + Fire.js + GameScene.js + Log.js/Pit.js.

### Decisiones
- **Ranuras generadas para la leña que se arrastra** (usan su largo/grosor reales) y solo durante el drag, sobre el pozo más cercano (≈10–20 ranuras × ≤15 leñas encajadas: despreciable). Fuera del drag `pit.slots = []`.
- Tipos: `base` (piso; dos separadas dejando hueco si `2·ih − 2·L ≥ 14`, si no una al centro; en pozos grandes la fila crece hacia afuera), `stack` (sobre cualquier leño horizontal encajado), `bridge` (entre dos leños horizontales a la misma altura con hueco 8..L−12 px: es la cabaña), `tipi` (patas a ∓62° que se cruzan al centro; la 2ª pata de cada lado solo después de la 1ª de ese lado).
- **Habilitación = apoyo ocupado** (`slot.requires`): bridge necesita 2 leños, stack 1, 2ª pata de tipi 1. Una ranura que choca con una ocupada (distancia de ejes < espesor) no se ofrece; las patas de tipi de lados opuestos sí se cruzan.
- **Elección**: radio 70 px con mouse / 100 px con touch (`this.touch`), la distancia vertical pesa ×0,5 (se suelta desde arriba). Sin rotar gana la horizontal (el tipi suma +35 de penalidad); si el jugador rotó (`drag.aim`), solo valen ranuras a <40° de su ángulo y el ángulo pesa. Puente −10, histéresis −18 para que no parpadee. Tirón suave: el punto de agarre se acerca 40 % a la ranura resaltada.
- **Soltar con ranura**: animación propia de 150 ms (ease out cuadrático, se avanza en `Fire.trackLogs` con dt, no con tweens de Phaser) a posición y ángulo (equivalente módulo π); cuerpo **estático** y categoría `SNAP_CATEGORY=0x0008` (la leña agarrada la atraviesa, igual que las paredes). Sin ranura: física libre como antes. Un pozo con `loadRatio > 1,05` no ofrece ranuras (y > 1,1 al soltar no encaja): lo lleno sigue rigiendo por el desborde de C4-B.
- **Desencajar**: agarrar una encajada la libera (un toque sin mover la reencaja sola). `Fire.reevalSlots` (4 Hz) suelta toda leña cuyo `requires` murió (ceniza, destruida, desencajada): vuelve a ser dinámica y cae. `pit:grow` (`setSize`) suelta todas las del pozo.
- **Estructura directa desde ranuras** (`slotStructure`): sin esperar 1,5 s y la calidad sube de golpe. Tipi: 1 par = 0,65, 2 pares = 0,90. Cabaña: 2 bases + puente = 0,60; +2 `stack` debajo del puente = 0,80; 2 puentes = +0,2. Se usa la mejor entre ranuras y detección física (structure.js sin cambios).
- Cabaña con ramas (100 px) requiere pozo de tamaño ≥ 3 (`2·ih − 2·L ≥ 14`); con troncos de 130, tamaño ≥ 5. Es una razón física para agrandar el pozo.

### API
- `pit.slots`: ranuras libres y habilitadas `{kind, layer, x, y, angle, len, th, seg, requires, side|sign|tk}` (vacío fuera del drag). `scene.drag.slot` / `drag.slotPit`: la resaltada.
- `log.slot` (`{kind, layer, angle, sign, tk, requires}` o null), `log.snapping`, `log.snapAnim`. `fire.slotted(pit)`, `fire.snapLog(log, pit, slot)`, `fire.unsnap(log, reason)`, `fire.releaseSlots(pit)`. `Log.js` exporta `SNAP_CATEGORY`.
- Eventos: `log:snap {log, pit, slot}`, `log:unsnap {log, pit, reason: 'grab'|'support'|'resize'}`. `structure:formed/lost` siguen igual.

### Pruebas (127.0.0.1:8080, MouseEvent reales, pozo tamaño 3, ramas)
| Caso | Resultado | Tiempo de juego aprox. |
|---|---|---|
| Base (1 rama a 100 px sobre la ranura) | encaja en el piso (y=642), estática, `log:snap:base` | ~1 s |
| Cabaña 3 ramas (2 bases + puente) | `structure:formed:cabana` q = 0,60 | ~4 s |
| Cabaña 5 ramas (2 bases, 2 apoyos, puente) | q = 0,80 estable al instante | ~7 s |
| Tipi 2 patas (rotar ±60°) / 4 patas | q 0,65 / 0,90, `structure:formed:tipi` | ~3 s / ~7 s |
| Quitar una base (ceniza) | su apilado y el puente caen (dinámicos), el resto sigue | – |
| Agarrar una encajada | `unsnap:grab`, dinámica; soltar en el lugar la reencaja | – |
| Tronco ardiendo encajado | pasa a llama y sigue estático en su ranura | – |

Los tiempos son estimados desde los pasos simulados (≈1 s por leña, + rotación). Consola: 0 errores. El panel oculto no renderiza: **las siluetas de las ranuras no se vieron en pantalla** (se verificó la lógica, no el dibujo).

### Qué deberían hacer los demás
- **Arte**: `updateSlots()` en GameScene dibuja siluetas simples en `slotGfx` (depth 84: relleno tenue, la resaltada con pulso). Pulirlas (textura de leña fantasma, color por tipo, marca de apoyo) y revisar que una leña estática encajada se vea asentada (sombra de contacto).
- **Dopamina**: `log:snap` → "clac" con peso según `log.wood.weight` + chispa/polvo en el contacto; `log:unsnap` con `reason:'support'` → crujido/caída. Un aviso de estructura más vistoso si se formó por ranuras (es instantáneo).
- **UI**: una pista la primera vez que se arrastra sobre un pozo ("se encaja al soltar cerca de la silueta"); en touch el radio de 100 px ya es generoso, no hace falta botón.
- **Progresión**: la cabaña depende del tamaño del pozo (ver arriba); reflejarlo en el texto de la tienda.

### Pendiente / riesgos
- Dibujo de las siluetas y táctil real sin verificar (el segundo dedo sigue pendiente desde C4-B).
- Troncos gruesos de 175 px en pozos chicos no tienen base: caen a física libre.

## C4-D · Correcciones del test C

Archivos: GameScene.js, Fire.js, utils/slots.js y `STRUCTURE` en data/sizes.js (GameState.js no hizo falta).

### C1 · Rendimiento de las estructuras
Medición: calor integrado (`S.rate` × dt) desde que se prenden todas las ramas hasta la ceniza, mismas ramas, sin lluvia ni viento, 2 corridas por caso (la pila suelta varía según cómo caen).

| Caso | Antes (calor / duración) | Después (calor / duración) | Δ vs pila |
|---|---|---|---|
| Tamaño 3, pila 4 ramas | 33,1 / 12,8 s | 33,1 / 12,8 s | – |
| Tamaño 3, tipi 4 patas (q 0,90) | 34 / 11,7 s | **39 / 11,7 s** | antes +3 %, **ahora +18 %** |
| Tamaño 3, pila 5 ramas | 42,4 / 12,7 s | 42,4 y 30,9 / 12,7 y 10,5 s | – |
| Tamaño 3, cabaña 5 (q 0,80) | 52 y 43 / 14,4 y 11,4 s | **54 y 39 / 14,4 y 11,1 s** | **+26 % promedio** (la corrida corta es una base que se quemó y colapsó) |
| Tamaño 0, pila 4 ramas | 19,1 / 9,6 s | 24,4 / 12,8 s (caída distinta) | – |
| Tamaño 0, tipi 4 patas | 25,8 / 11,7 s | **29,7 / 11,7 s** | **+22 %** |

- **Causa**: el tipi ya compensaba el aire (+27 %) pero su `fuel +0,10` lo hace durar menos y el bonus de calor era +9 %: neto ≈ 0 (en la prueba del tester, con prendido natural, −25 %). Las encajadas estáticas no pierden contacto ni aire: las vecinas se calientan igual (`segSegDist` usa sus ejes, no su movimiento).
- **Cambio**: `STRUCTURE.tipi.calor` 0,10 → **0,28**, `cabana.calor` 0,15 → **0,20**, `calorCap` 0,20 → **0,30** (GameState lo topa en 0,30 × cartas). Carácter: el tipi prende rápido (`ignite −35 %`), pico más alto (5,7 contra 4,6 /s) y dura menos (11,7 s); la cabaña dura más (14,4 s contra 12,7 s) y es pareja.
- Aviso: la medición de la pila suelta es ruidosa (±15 %); conviene que el tester repita su prueba de ceniza completa.

### C2 · Tipi solo si el jugador rotó
`pickSlot` no ofrece ranuras `tipi` si `drag.aim` es nulo (y si rotó, solo las de ángulo a <40°). Rama sin rotar sobre el centro: resalta `base`. Tronco de 175 px (130 en el log de la prueba) sin rotar en pozo tamaño 0: sin ranura, física libre.

### C3 · Modal en pleno arrastre
`endDrag(noSnap)`: las cuatro liberaciones del sistema (modal/pausa vía `setPaused`, viaje, ceniza, leña eliminada) pasan `noSnap = true`; solo la que suelta el jugador encaja. Probado: ranura resaltada, `setPaused(true)` → la leña queda dinámica, sin `log:snap`.

### C4 · Umbrales unificados
`OVERFLOW_RATIO` 1,15 → **1,05**, igual que "no se ofrecen ranuras" y "no encaja" (antes 1,1). Desde 1,05 la leña rebota con `log:overflow {reason:'full'}`, con el cooldown de 800 ms por pozo: llenando un pozo con 120 ramas salieron 14 avisos `full`; 3 soltadas con pozo en 1,28 dieron 6 eventos en ~5 s, sin spam.

### C5 · Banners de estructura
`floatText` devuelve el `Text`; `structure:formed` destruye el banner anterior (y sus tweens) antes de crear el nuevo. Probado: dos `formed` seguidos dejan un solo texto activo.

### Extra
`pitInfoList()` incluye `slotsUsed` (cantidad de leñas encajadas del pozo).

### Notas
- Nota de arnés: tras abrir un modal hay que llamar `scene.setPaused(false)` (poner `paused=false` no reactiva Matter): las mediciones previas a ese punto en esta sesión se repitieron.
- Partida del usuario: respaldada y restaurada en localStorage; la pestaña de prueba sigue abierta con estado en memoria modificado (calor/recursos), no la recargues antes de guardar desde el juego.

## C4-E · Ignición entre encajadas y calor total

Archivos: Fire.js, GameScene.js (`endDrag`), `STRUCTURE.cabana` en data/sizes.js.

### D1 · Ignición
Reproducido con lluvia ≥ 0,3: al prender una sola leña de un tipi o cabaña, las demás quedaban crudas indefinidamente. Dos causas en Fire.js:
1. **Lluvia re-moja cada cuadro**: la leña seca por el calor vecino y la lluvia la vuelve a mojar en el mismo cuadro; mientras `moisture > 0` la temperatura se topa en 0,36 y nunca llega a la de ignición. Ahora la lluvia solo moja si `amb < 0,3` (si el fuego la calienta, se seca más rápido de lo que se moja).
2. **Calor insuficiente de una llama recién nacida** (flama 0,3 × peso 0,6 hacia arriba): ahora, si una leña **encajada** toca o cruza (distancia de ejes ≤ 3 px) a una vecina ardiendo (llama > 0,2 o brasas), recibe `max(amb, calor_vecina × 2,4 + 0,2)` (lo de abajo prende lo de arriba: peso 1 contra 0,7), aun con lluvia.

Tiempo hasta que arden todas las leñas (una sola prendida: la primera pata / el primer leño, pozo tamaño 3):
| Lluvia | Tipi antes | Tipi ahora | Cabaña antes | Cabaña ahora |
|---|---|---|---|---|
| 0 | 1 s | 1 s | 1 s | 1 s |
| 0,3 | nunca (1 de 4) | 1 s | nunca (1 de 5) | 2 s |
| 0,6 | nunca | 2 s | nunca | 3 s |
| 0,9 | nunca | 3 s | nunca | 5 s |
La pila suelta (no encajada) con lluvia 0,6 sigue sin propagarse (4,6 de calor en 100 s): las estructuras son la forma de sostener el fuego bajo la lluvia, a propósito.

### D2 · Calor total (una sola leña prendida, sin lluvia, tamaño 3)
Calor integrado hasta la ceniza / duración / pico. Pila: 3 corridas (salen casi iguales).
| Caso | Antes | Ahora | Δ calor vs pila |
|---|---|---|---|
| Pila 4 ramas | 33,0 / 13,6 s / 4,6 | igual | – |
| Tipi 4 patas (q 0,90) | 39 / 12,2 s / 5,7 | 39 / 12,2 s / 5,7 | **+18 %**, pico +24 %, dura −10 % |
| Pila 5 ramas | 42,3 / 13,6 s / 5,8 | igual | – |
| Cabaña 5 (q 0,80) | 54 / 15,1 s / 6,3 | **54 / 16,1 s / 5,9** | **+27 %**, dura +18 % |
Con el arreglo de D1 el tipi y la cabaña ya cumplen la meta (tipi ≥ +10 %, cabaña ≥ +15 %); la diferencia con el tester era que las patas no se prendían. Para que la cabaña dure visiblemente más: `STRUCTURE.cabana` `fuel −0,15 → −0,22` y `calor 0,20 → 0,10` (el total queda igual, +18 % de duración). Con lluvia 0,3: pila 4 = 25,7, tipi = 32,5 (+26 %); pila 5 = 34,6, cabaña = 46,4 (+34 %).

### D3 · Tronco en pozo chico
Al soltar sin ranura un leño más largo que el hueco del pozo (`length > 2·(half − 12) − 6`), `endDrag` lo centra y lo inclina lo justo (`L·cos θ + T·sin θ ≤ hueco`) para que caiga adentro. Tronco de 175 px en tamaño 0: queda dentro del pozo (x −17, y 594, 0,55 rad), ya no flota sobre las piedras.

### Notas
- Partida del usuario respaldada y restaurada; `state.locked = true` antes de cerrar; `localStorage` verificado igual al respaldo.

## C4-F · Script de medición compartido y calor total

### El script
`.claude/equipo/medir-estructuras.js`: se carga en la consola con el juego abierto en 127.0.0.1:8080 (ej. `fetch('/.claude/equipo/medir-estructuras.js')`, quitar lo que precede a `async function medir` y `eval`) y se llama `await medir({size, runs, rain, kinds})`. Arma la pila (`addLog` soltado en x al azar) o la estructura (ranuras reales con MouseEvent y `rotateStep`; **si no quedan todas encajadas la rearma, hasta 4 veces**), prende UN leño con `fire.strike(x, y, 0.8, 1.8)` (el camino del fósforo), avanza con `game.step` hasta la ceniza y devuelve por corrida `{n, encajadas, struct, rate, calor, heat, pico, dur, ho}`: `rate` = ∫`state.rate`, `calor` = Δ`state.data.calor`, `heat` = ∫Σ`heatOut`, `ho` = `heatOut` medio por leño encendido. Respaldar la partida antes y restaurarla después (anula `state.save`).

### Reproducción de las cifras del tester
- Con el script, sin lluvia, 3 corridas (casi idénticas): **tipi +22 % y cabaña +26 %** sobre la pila. `rate` y `calor` coinciden; el `heatOut` por leño es igual (0,74 contra 0,70); no hay diferencia de variable ni de modo de prender.
- Lo que sí reproduce el −20 %: **un tipi mal armado**. Si una de las cuatro leñas no queda encajada (la rotación de la prueba se acumuló de más y la 4.ª pata se quedó suelta, a 45 px del centro) o si el fósforo cae en la pata cuyo vecino queda fuera de contacto, solo arden 3 de 4: calor 18,6 contra 24,7 de la pila (−25 %), con duración parecida. El tester mide con su propio bot que reconstruye cada 15 s: el mismo síntoma. Con 4 patas realmente encajadas el fuego pasa a todas (1 s) y rinde 30,1.
- No hay un defecto de emisión de las leñas estáticas (aire, oxígeno, sleeping, contacto y `stackPenalty` dan lo mismo que en la pila). Por eso no cambié esas fórmulas.

### Tabla del script (calor `rate`, duración s, pico) — sin lluvia
| Caso | Pila | Estructura | Δ calor | Duración |
|---|---|---|---|---|
| Tamaño 0, tipi 4 patas (q 0,90) | 24,7 / 13,1 s / 3,4 | 30,1 / 11,9 s / 4,3 | **+22 %** | −9 %, pico +25 % |
| Tamaño 3, cabaña 5 (q 0,80) | 43,1 / 13,3 s / 5,9 | 54,4 / 16,0 s / 5,95 | **+26 %** | **+20 %** |
Tipo de leña: rama. Resultados idénticos entre 3 corridas (±0,1).

### E2 · Pila suelta bajo la lluvia
La conducción por contacto (`touch`) ahora vale para toda leña: la encajada recibe `calor_vecina × 2,4 + 0,2` y la suelta `× 1,1 + 0,05`, que alcanza para dejar de mojarse (`amb ≥ 0,3`) y secarse despacio.
| Lluvia (tamaño 0, 4 ramas) | Pila antes | Pila ahora | Tipi ahora |
|---|---|---|---|
| 0,3 | propaga | 21,6 / 11,7 s | 25,7 / 10,6 s (+19 %) |
| 0,6 | **nunca** (4,6 en 100 s) | 19–21 / 13 s | 23,4 / 10,8 s (+19 %) |
| 0,9 | nunca | nunca (0,4) | nunca (0,5): ni el fósforo logra sostener una llama |
Sin lluvia la pila no cambió (24,7 y 43,1).

### Notas
- Partida respaldada y restaurada, `state.locked = true`, `localStorage` idéntico al respaldo, pestaña cerrada.
- Para el tester: validar siempre `encajadas === n` (el script lo devuelve) antes de comparar una estructura con la pila.


## C4-G · Tipi incompleto sin aviso (F1)

Archivos: GameScene.js (`updateSlots`, `endDrag`, `tipiNotice`, `pitInfoList`), ui/Ui.js (`pitInfo`), Fire.js (lluvia sobre estructuras), `ttl` opcional en medir-estructuras.js.

### F1 · Causa y arreglo
Cada lado del tipi tiene 2 ranuras (k=0 y k=1). La 3.ª pata inclinada hacia el mismo lado no tenía ranura y caía libre sin aviso.
1. **Ranura espejo**: si el jugador inclinó la leña (aim, |sen| > 0,35) y no hay ranura libre de ese lado, se ofrece la del lado opuesto (se busca con el ángulo espejado). La silueta resaltada ya es la espejada y la animación de encaje va hacia `slot.angle`, así que gira hacia el otro lado. Flotante "Se encaja del otro lado" al soltar (enfriamiento 2,5 s, `tipiNotice`).
2. **Etiqueta**: `pitInfoList` agrega `tipiLegs` y `cabinPieces`; la etiqueta muestra "Tipi 3/4" mientras faltan patas y "Cabaña 4/5 60%" para la cabaña incompleta. Las siluetas libres del pozo se dibujan durante todo el arrastre sobre él (no hubo que cambiarlo).
3. **Sin lugar**: con patas encajadas y ninguna ranura tipi libre, al soltar una leña inclinada sale "No hay más lugar en el tipi" (mismo enfriamiento).

### Validación (pozo tamaño 0 y 3, "persona" con signo al azar, 4 patas con `rotateStep`)
| Caso | Antes | Ahora |
|---|---|---|
| 12 tipis, signo al azar | 1 de 6 completo (tester) | **12/12 con 4 patas encajadas y tipi 0,90** |
| `++++` / `----` / `---+` / `+++-` | 3.ª y 4.ª pata libres | completos; espejo en la 3.ª o 4.ª |
| 5.ª pata sobre un tipi completo | silencio | "No hay más lugar en el tipi" (la 6.ª, dentro de 2,5 s, no repite) |
Nota de arnés: con `rotateStep` el ángulo a veces no llega a 62° (~37°) y la primera leña cae de base; no es del espejo.

### Extra · lluvia 0,6 en pozo grande
El problema no era la conducción: el fósforo (1,8 s) no alcanza para secar leña mojada en tamaño 3 (`rain × (1 + 0,1·tamaño)` y `−0,4·rain` en `amb`). Cambio en Fire.js: tipi y cabaña escurren agua, `p.rain *= 1 − 0,35·calidad` (cabaña 0,8 → lluvia 0,78 a 0,56). Tamaño 3, lluvia 0,6, fuente de calor de 3 s (`medir({ttl: 3})`): pila 5 = 34,2, **cabaña = 45,1 (+32 %)**, dura 16 s; con el fósforo de 1,8 s ninguna prende (a propósito: hace falta una llama más larga, pedernal o bellows). Sin lluvia nada cambió (pila 43,0, cabaña 54,4).

### Notas
- Partida respaldada y restaurada, `state.locked = true`, `localStorage` idéntico, pestaña cerrada. `node --check` OK (GameScene, Ui, Fire, medir-estructuras).
- Pendiente para el tester: la etiqueta "Tipi n/4" y los flotantes con dedo real; para progresión: con lluvia el fósforo no prende en pozos grandes.


## C5 fase 1 · Tocar la leña y separar las ranuras

Archivos: GameScene.js, nuevo `js/scenes/SlotController.js`, Fire.js. Arnés reutilizable: `.claude/equipo/harness-fisica.js` (define `window.H` con `put`/`up`/`shot`).

1. **Corte**: `updateSlots`, `tipiNotice`, `slotPoolGet/Trim`, `updateSlotShadows`, `slotMagnetTick`, `onSlotSnap` y `drawAimGhost` pasaron a `SlotController` (`scene.slotsCtl`). GameScene queda en 1.550 líneas. Sin cambio de comportamiento: arrastre real con ranura → `base`, 3 siluetas, encaja, sombra de contacto. Medición igual que antes (tipi +22 %, cabaña +27 % sobre la pila).
2. **Colapso en cascada** (`Fire.startWobble/stepWobble`, `reevalSlots`): al perder el apoyo, la leña tiembla 0,26–0,36 s con chispas y humo en el contacto y recién entonces cae con un empujón hacia adentro del pozo; lo que se apoyaba en ella sigue después (cascada natural). Emite `structure:collapse {pit}` (una vez por pozo cada 2,5 s). Probado en una cabaña de 5: al apagarse la base izquierda, evento a 0,18 s, la pila sobre ella cae a 0,52 s, el puente a 0,97 s; la otra pila queda en su lugar. Flotante y sonido: dopamina.
3. **Encaje con caída** (`snapLog`/`stepSnap`): duración 90–220 ms según la distancia (57 px → 193 ms) y asentamiento de 90 ms (se hunde 2 px y vuelve). Con movimiento reducido es instantáneo.
4. **Agarre** (`logAt`): si el punto cae dentro de varias leñas gana la más alta en pantalla; si no, la más cercana. Alcance táctil 28 px (mouse 8). Resalte con contorno pulsante bajo el mouse (`SlotController.drawHover`, `scene.hoverLog`): no aparece arrastrando, ni en touch, ni con efectos reducidos.
5. **Soltar sin ranura** (`endDrag`): dentro de un pozo, 0,5 s de `frictionAir` 0,1 y giro limitado; una rama soltada a 220 px sobre el pozo bajó y quedó quieta (645,641 → 646,642) sin rebotar.
6. **H8**: las leñas iniciales no ocupan la ranura de base; la silueta rellena se perdía dentro de la llama. Ahora cada silueta tiene un **contorno claro** (`drawOutlines`) y en el primer arrastre se ve el rectángulo de la base junto al X del tipi (comprobado con captura). No moví las leñas iniciales.

No pude verificar: táctil real (alcance de 28 px y que el resalte no aparezca), el colapso con un incendio natural (en la prueba forcé la ceniza de una base; quemándose todas a la vez casi no hay cascada), ni cómo se ve el resalte en vivo (el panel oculto no repinta; usé `toDataURL`). Partida: localStorage estaba vacío; lo dejé vacío, `state.locked = true`, pestaña cerrada. `node --check` OK.

## C5 iteración 2 (física)
Hecho (solo `node --check`; sin prueba en el navegador, el panel dejó de abrir 127.0.0.1:8080):
- **J1**: una leña encajada ya no se agarra al apretar; queda `pending` y solo se desencaja si el puntero se mueve >8 px (14 en touch). Un toque corto llama a `strikeMatch` (prende si está cruda; si arde, no hace nada).
- **Derrumbe natural**: `Fire.crumbling(r)`: un apoyo en brasas con ≤12 % de combustible (`CRUMBLE_FUEL`) deja de sostener; lo que se apoya en él tiembla y cae en cascada con `structure:collapse`. Falta medir con `medir-estructuras.js` que el calor siga ≥ +15 % (si cae, bajar `CRUMBLE_FUEL`).
- **J4**: estructura detectada solo por física exige calidad ≥ 0,5 (`STRUCT_MIN_PHYS`); debajo es montón.
- **J9**: junto a cada base encajada se ofrece el hueco de al lado con la separación para el puente, sea cual sea el largo; si no hay ninguna ranura sale "No hay lugar para esta leña: probá con otra más corta".
- **J8**: `pitInfoList` ya manda `cabinPieces`; `Ui.js` solo muestra "Cabaña n/5" si `quality > 0.05`, y con ranuras a medias la calidad es 0: lo tiene que ajustar UI.
- **H8**: sin cambios nuevos (los contornos de la iteración 1 siguen); falta ver una captura del primer arrastre.
