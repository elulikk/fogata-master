# C4 — Análisis UI: affordances de acomodo y tamaños de pozo

Sin tocar código. Base: `Pit.js` ya expone `size`, `capacity`, `half`, `top`, `calorMult`; la tienda ya soporta `effect {label,before,after}`; `ui.toast`/`setHint` existen; cola de avisos y `#topc` ya apilan sin pisarse.

## 1. Enseñar a rotar sin tutorial
- **Hint contextual único**: la primera vez que una leña arrastrada entra en el pozo (o la 1.ª vez que se suelta una leña y queda "acostada"), `setHint` con prioridad sobre las demás pistas: *"Rueda del mouse o Q/E para girarla · tocá ↻ en pantalla"*. En touch el texto cambia a *"Usá el botón ↻ para girar la leña"*. Se oculta al primer giro o a los 6 s de soltarla. Flag persistente `settings.seen.rotar` (merge profundo ya soporta claves nuevas) para no repetir.
- **Segunda oportunidad**: si el jugador suelta ≥3 leñas sin rotar ninguna dentro del pozo y el calor/aire es bajo, repetir el hint una vez (`seen.rotar2`). Nunca modal ni toast: el hint ya está en el centro-abajo, lugar de mirada.
- **Affordance visual** (Phaser/dopamina): al arrastrar dentro del pozo, un arco tenue ↻ alrededor del leño y tecla `Q E` pequeña en la esquina. Mouse: cursor `grab` + rotación con rueda sin necesitar modificador.
- Detalle de API que pido a física: evento `scene.events.emit('log:rotated')` y `log:dragIn` para disparar/cerrar el hint sin acoplar la UI al input.

## 2. Control táctil de rotación
Recomiendo **botones flotantes ↺ ↻ + giro con segundo dedo** (el segundo dedo como atajo para quien lo descubra, no como único medio).
- Mientras `scene.drag` está activo y el puntero es táctil, mostrar `#rot` (div de 2 botones, `pointer-events:auto`) **anclado cerca del dedo**: a ~90 px del punto de contacto, del lado más alejado del borde. Cada botón 52×52 lógicos (>44 px reales con `--k`≥0.85; en `.small` usar `calc(44px/var(--k))` mínimo ya establecido). Giro de 15° por toque y **auto-repetición** al mantener (cada 120 ms) — esencial porque con el dedo ocupado arrastrando, el botón se pulsa con el *otro* pulgar: por eso el anclaje no debe seguir al dedo en cada frame (tiembla); usar posición fija por arrastre (se calcula al comenzar el drag, lado opuesto) o dock fijo abajo-izquierda/derecha si el pulgar libre ya está ahí. Decisión: **dock fijo** en el lado opuesto de `#actions` (abajo-izquierda sobre la pila, que la mano izquierda alcanza) — más estable que seguir el dedo.
- Un dial arrastrable queda descartado: exige un segundo gesto continuo de precisión.
- Segundo dedo: giro por ángulo relativo del 2.º puntero respecto del 1.º (pinch-rotate). Física lo implementa en `setupInput`; la UI solo muestra el dock cuando `this.touch && drag`.
- Teclado: Q/E (y rueda) los maneja `Ui.setupKeys` → `handlers.rotate?.(dir)`; la UI ignora Q/E si hay modal.
- Handler nuevo: `rotate(dirDeg)`; estado `ui.setDragging(on)` desde la escena para mostrar/ocultar el dock.

## 3. Indicador de capacidad: HUD vs. mundo
**En el mundo, con un respaldo mínimo en HUD.** Justificación: el jugador mira el pozo mientras arrastra; un número en el HUD obliga a desviar la vista y no dice *cuál* pozo. Con 3 pozos y tamaños distintos la capacidad es por pozo.
- **Mundo (Phaser, `Pit.js`)**: marcas de ocupación sobre las piedras: una fila de N puntitos/ranuras bajo el pozo (N = capacidad, llenos = leños), color ámbar → naranja → rojo por encima del ~85%; al pasar 100% parpadea y se vuelve rojo ("se ahoga"). Más una **línea de tope** discreta (`pit.top`) visible solo mientras se arrastra, así el límite deja de ser invisible. Es una barra de *aire* implícita: usar el mismo gráfico para ambos (ocupación vs. aire) confunde → mostrar ocupación; el aire ya tiene el hint "Se está ahogando".
- **HUD** (`#hint` o chip bajo `#matches`): solo texto cuando se sobrepasa: "Pozo lleno 8/8" por 2 s al intentar soltar de más. Reemplaza el desparramo silencioso (B21).
- Pedido a progresión/física: `pit.load` (leños contados en el pozo) y `pit.capacity` expuestos y estables.

## 4. Mostrar estructura y calidad
- **Etiqueta del pozo** en el mundo, sobre el fuego, 14 px: `Tipi · 80%` con ícono (🔺 tipi, 🛖 cabaña, 🪵 caótica). Calidad = barra fina de 3 px bajo el texto, color verde/ámbar/gris. Aparece al detectarse una estructura y se atenúa a 40% de alpha a los 3 s (reaparece con hover/drag en ese pozo).
- **Tooltip/panel**: al pasar el mouse/tocar la etiqueta, una tarjeta (`#struct`, reutiliza estilos de `.toast`/`#night`): *"Tipi · 80% — +25% tiraje, +20% duración. Para 100%: 2 leños más inclinados al centro"*. El "qué le falta" lo calcula física (`struct.hint` string corto); la UI solo lo pinta.
- **Primera vez**: toast `unlock` "🔺 ¡Armaste un tipi! El fuego prende más rápido" + registro en la lista de logros (`ui.achievement`) para estructuras nuevas.
- Contrato: `pit.structure = {id, name, icon, quality 0..1, bonus:[{label,text}], hint}`; o `null` → "Pila suelta".

## 5. Escala de tamaños en la tienda
- Ítem "Agrandar" ya muestra `Nivel n/max` y efecto. Con escala larga (≥6 saltos) proponer **fila de ranuras**: `▮▮▮▯▯▯ Tamaño 3/6 · Hoguera mediana` bajo el nombre; el nombre del tamaño cambia por salto (Fogatita → Fogata → Fogón → Hoguera → Gran hoguera → Pira).
- **Antes→después multi-línea**: reemplazar `effect` único por `effects: [{label, before, after}]`: Capacidad `8 → 11 leños`, Aire `+0% → +15%`, Calor `+50% → +100%`, y nueva "forma": desbloquea `Cabaña` en tamaño 3. La UI pinta hasta 3 líneas (compacto en `.compact`: solo 1 + "ver más" al tocar).
- **Vista previa**: miniatura SVG/CSS (silueta del pozo a escala relativa, 2 colores) junto al ícono: dos siluetas "ahora → después" de ancho proporcional a `half`. Barata, sin Phaser. En el mundo, al pasar sobre el botón "Comprar", dibujar un contorno fantasma del pozo agrandado (`handlers.preview(id)` / `previewEnd`) — opcional, segunda prioridad.
- Los saltos grandes (nueva forma posible, nueva capacidad) destacar con borde ámbar y etiqueta "Hito".

## 6. Archivos e IDs
- `index.html`: `#rot` (dock ↺ ↻), `#struct` (tarjeta), contenedor de miniatura en ítems.
- `css/style.css`: `#rot`, `#rot button` (52 px, `.small` ≥44 reales), `#struct`, `.size-slots`, `.item .effs`, `.item .thumb`.
- `js/ui/Ui.js`: `setDragging(on)`, `showStructure(pitIdx, structure)`, `rotate` en `setupKeys` (Q/E), `renderPanel` con `effects[]` y ranuras, handler `preview/previewEnd`, flag `seen.rotar`.
- `js/scenes/GameScene.js` (cuando toque): `bindUi.rotate`, emitir `log:dragIn`/`log:rotated`, `shopItems.effects`, hint contextual en `currentHint`.
- `js/objects/Pit.js` (progresión/física): marcas de ocupación, etiqueta de estructura, línea de tope.
- `js/data/shop.js`: `effects[]`, nombres de tamaños.

## Resumen
1. Hint único de rotación contextual (mouse/touch distinto) con flag persistente; dock fijo ↺ ↻ de 44+ px con auto-repetición para touch, más giro con 2 dedos como extra.
2. Capacidad dentro del mundo (ranuras de ocupación + línea de tope al arrastrar), con texto "Pozo lleno" en HUD solo al exceder; estructura como etiqueta "Tipi · 80%" sobre el fuego con tarjeta de bonus y "qué falta".
3. Tienda: fila de ranuras de tamaño con nombres, `effects[]` multi-línea antes→después y miniatura de silueta; contratos pedidos: `pit.load/capacity/structure`, `log:*` eventos, `rotate` handler.
