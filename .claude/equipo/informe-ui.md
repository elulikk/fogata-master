# Informe UI/QoL — Fase A

Archivos tocados: `js/ui/Ui.js` (reescrito), `css/style.css`, `index.html`, `js/main.js`. `node --check` OK en Ui.js y main.js. No probado en navegador (Fase C).

## Qué hice
- **Responsive/touch**: `fit()` con piso 0.72 y lienzo lógico que se agranda (`#ui` ocupa todo el `#wrap`, los anclajes quedan en los bordes). Clases en `#ui`: `.small` (escala <0.95 o pointer coarse → objetivos de 44px reales vía `--k`), `.compact` (ancho lógico <980: HUD reacomodado, panel a lo ancho, cartas de 150px). `touch-action:none` en wrap/canvas, `#rotate` en vertical (<820px), main.js frena zoom/scroll/menú contextual (deja pasar sliders y `#panel-list`).
- **Teclado** (ignorado con ctrl/alt/meta, en repeticiones y mientras hay modal): Esc (cierra menú → panel → abre menú), S tienda, C construir, A cenizas, B bosque, M mute, 1/2/3 cartas. Con cartas abiertas solo valen 1/2/3 y respetan el bloqueo; con resumen abierto Esc/Enter lo cierran.
- **Cartas**: `.card.comun/.rara/.epica` + etiqueta, `data-delay` (+`animation-delay`; épica +250ms), línea antes→después, tecla 1/2/3, bloqueo `.locked` en `#cards`.
- **Tienda**: costo en rojo (`.short`) por componente, "faltan N 🔥 / N 🪵" (`.need`), línea `.eff` "label: before → after" (oculta si no hay `effect`), `.affordable` respira. Las partes que cambian cada tick se actualizan en el lugar (no se re-renderiza la lista → no parpadea el hover).
- **Nivel**: `#lvl-text` "Nivel N · cur/next" con count-up (rAF, máx 500 ms, snap con reduce-motion / pestaña oculta / diferencia <2 / nivel nuevo). Sin `levelCur/levelNeed` muestra "Nivel N".
- **Ajustes** en `#menu`: volumen (`#set-volume`), silenciar (`#set-mute`), reducir movimiento (`#set-motion`), exportar/importar, reset con confirmación que vence a 3 s.
- **`#away`**: z-index 2; `#hud-right` 6, `#modal` 8, `#summary` 9, `#menu` 10 → mute y menú quedan accesibles.
- **Nuevo**: barra `#night`, pestaña Cenizas (`#btn-ashes`), modal `#summary`.
- **Pulido**: `:focus-visible`, `aria-live` en `#toasts`/`#forecast`, `.reduce-motion` (global en `<html>`, también arranca de `prefers-reduced-motion`), shimmer en `.new`, `kbd` con atajos (ocultos en `.small`).

## API pública de `Ui`
- `bind(handlers)`
- `update(v)` — campos: `calor, rate, bump, levelOn, level, levelProgress, levelCur?, levelNeed?, rateInfo?, matches, forecast, weatherOn, trip, helpers, night?`
- `showCards(cards, levels, { lockMs }?)` / `hideCards()` / `lockCards(ms)` / `fillLevelBar()`
- `showSummary(data)` / `hideSummary()`
- `togglePanel(tab)` (`'tienda'|'construir'|'cenizas'`) / `closePanel()`
- `toggleMenu(on)`, `applySettings({volume, muted, reduceMotion})` (solo refleja en controles; no llama handlers), `setReduceMotion(on)`, `showMuted(m)`
- `reveal(id,on)`, `markNew(id)`, `toast(text,kind,ms)`, `setHint(text)`, `resetView()`, getters `modalOpen`, `reduceMotion`.

### Formas de datos (todas opcionales)
- `night`: `{phase:'dia'|'atardecer'|'noche'|'amanecer', n, tLeft, goal, pct, goalMet, cold}` (= `nightInfo()`). Solo se muestra fuera de `'dia'`. `pct` = avance 0–1 hacia la meta (suposición: confirmar con progresión). `goal` va solo al tooltip.
- `rateInfo`: string, o `{text, mult, lines[]}`; `mult>1.01` agrega " ×1.4" al `+x /s`; el texto es tooltip de `#calor-rate`.
- Ítem de tienda: `{id, icon, name, desc, level, max, maxed, price:{calor?,tronco?,ceniza?}, affordable, need?:{calor?,tronco?,ceniza?}, effect?:{label,before,after}}`. Sin `need`, se deduce el calor faltante.
- Carta: `{id, icon, name, desc, max, rarity?, delay?, effect?:{label,before,after}}`.
- `showSummary`: `{title, sub?, success?(bool), lines:[{icon?,label,value}]|[[label,value,icon?]], button?, onClose?}`. Ignora cierres en los primeros 350 ms. Al cerrar llama `handlers.summaryClose?.(data)` y `data.onClose?.()`.

### Handlers que usa la UI (todos con `?.`)
`forest, items(tab), buy, pickCard, mute()→bool, pause(on), reset, volume(v 0..1), motion(bool), export()→string, import(text)→true/false/{ok}, prestige, meta()→{ceniza, dawns, canPrestige, gain?, prestigeLabel?}, summaryClose(data)`.
`items('cenizas')` debe devolver la tienda de Cenizas. `meta()` alimenta el encabezado de la pestaña (cenizas/amaneceres + botón de prestigio con confirmación de 2 pasos, vence a 3 s; llama `handlers.prestige`).

## IDs/clases nuevos
IDs: `#night`, `#btn-ashes`, `#panel-meta`, `#btn-prestige` (dinámico), `#summary` (+`-title/-sub/-lines/-ok`), `#lvl-text` (reemplaza `#lvl-num`), `#set-volume/-mute/-motion`, `#btn-export`, `#btn-import`, `#file-import`, `#rotate`.
Clases: `#ui.small/.compact`, `.reduce-motion` (en `<html>`), `#cards.locked`, `.card.comun/.rara/.epica`, `.c-rar/.c-eff/.c-key`, `.item .eff/.need`, `.c.short`, `button.affordable`, `#night.met/.cold/.dusk`, `#toasts.night-on`.

## Plan de Fase B (GameScene.js, UI)
1. **`bindUi`**: agregar
   - `volume: (v) => { audio.setVolume(v); state.data.settings.volume = v; state.save(); }`
   - `motion: (on) => { state.data.settings.reduceMotion = on; this.fx = !on /* dopamina */; state.save(); }`
   - `mute`: además de alternar, `state.data.settings.muted = this.audio.muted; state.save();`
   - `export: () => state.exportSave()`
   - `import: (t) => { const ok = state.importSave(t); if (ok) { this.ui.resetView(); this.scene.restart(); } return ok; }`
   - `prestige: () => this.doPrestige()`
   - `meta: () => ({ ceniza, dawns, canPrestige: dawns >= 1, gain })` leyendo `state.data.meta`
   - `summaryClose` si progresión necesita despausar.
   - En `reset`: tras `wipe()` volver a `ui.applySettings(state.data.settings)` y `audio.setMuted/ setVolume` si `wipe` los resetea.
2. **`shopItems`**: devolver `need` y `effect` evaluado. `effect: it.effect?.(level)`; `need: { calor: max(0, cost.calor - data.calor), tronco: max(0, cost.tronco - tronco disponibles) }` usando `state.price(...)`. Para `tab === 'cenizas'`, price `{ceniza}`.
3. **`ui.update`**: agregar `levelCur: totalCalor - levelThreshold(level)`, `levelNeed: levelThreshold(level+1) - levelThreshold(level)` (o `state.levelProgress`), `rateInfo: state.rateBreakdown(...)`, `night: state.nightInfo()`.
4. **Tap de chispazos en touch**: en `setupInput`, el tap corto sobre una llama/chispa debe funcionar con `pointerdown` (sin depender de hover) y con radio de 44px lógicos mínimo; hoy `pointerdown` ya sirve, solo revisar el radio de acierto.
5. **Reveal de lo nuevo**: `applyUnlock`/evento `night:*` → `ui.reveal('btn-ashes')` (y `markNew`) cuando se cumpla la condición de Cenizas; en `night:dawn` llamar `ui.showSummary(...)` tras `playDawn` y `setPaused(true/false)`.
6. **Ajustes al arrancar**: ya los aplica `main.js` (volumen/mute/`ui.applySettings`). En `create()` solo falta leer `state.data.settings.reduceMotion` para `this.fx`.
7. **Secuencia de nivel** (dopamina): llamar `ui.fillLevelBar()` y `ui.showCards(cards, levels, {lockMs: 400})`; `showCards` ya recibe cartas con `effect`.

## Pedidos a los otros
- **Progresión**: `state.data.settings` con defaults; `exportSave()/importSave()`; `effect` en shop/cards; `nightInfo()` con las fases en español (`'dia'|'atardecer'|'noche'|'amanecer'`) o avisar para mapear; `rarity` en cartas; confirmar si `pct` es avance hacia la meta.
- **Dopamina**: leer `ui.reduceMotion` / `state.data.settings.reduceMotion` para apagar celebración; ya existe `audio.setVolume/setMuted` (los uso en main.js). `.card.epica` ya tiene el glow morado en CSS; el acorde/destello va por tu lado.
- **Nota**: `#lvl-num` ya no existe (nadie fuera de Ui.js lo usaba).

---

# Fase B (UI dueña de GameScene)

`node --check` OK en GameScene.js y Ui.js. No probado en navegador.

## Ui.js — adaptado a los contratos reales
- `night`: fases `'off'|'day'|'dusk'|'night'` (la barra solo aparece en `dusk` y `night`; no hay fase de amanecer). `pct` = avance de la fase → es la barra; en noche el texto muestra `ritmo/meta 🔥/s` (ritmo = `rate` de `update`) y ✓ con `goalMet`; `.cold` si `cold > 0.5`.
- `rateInfo {total, parts:[{label,text}]}` → tooltip de `#calor-rate` (una línea por parte).
- Cenizas: la pestaña usa `ashItems()` (mapea `cost` → `price.ceniza`), `ashInfo()` (cenizas, amaneceres, `canPrestige`, `gain`), `buyAsh(id)` y `prestige()`. Ya no se usa `meta()`. "Faltan N 🪦" sale de `ashInfo().ash`.
- `showSummary(summary)` entiende `kind:'dawn'|'prestige'` (arma título y líneas; falla → "Reintentar"). Al cerrar llama `handlers.pause(false)`.
- Exportar baja `fogata-master-guardado.txt` (el export de GameState es base64, no JSON). Importar acepta `{ok,error?}`.

## GameScene.js — cambios
- `bindUi`: `mute` ahora persiste en `settings.muted`; nuevos `volume`, `motion(reduce)` (→ `setMotion(!reduce)`, persiste), `export`, `import` (si `ok`: reaplica volumen/mute/UI y `scene.restart()`; devuelve `{ok,error?}`).
- `shopItems`: suma `need {calor, tronco}` faltantes.
- `applyUnlock('noches')`: `ui.reveal('btn-ashes')` (+`markNew` si es anuncio).
- Touch: `this.touch = p.wasTouch` en `pointerdown`; el toque junta los chispazos cercanos (`collectOrbsNear`), el radio de imán ×1.4 y el de `logAt` 24 px (8 con mouse).
- Ajustes al arrancar: `main.js` (volumen/mute/`ui.applySettings`) y `create()` (`setMotion`, de dopamina). `reset` conserva `settings` porque `wipe()` ya lo hace.

## Pendiente para Fase C (verificar en navegador)
Barra #night con valores reales, tooltip de ritmo, flujo resumen→`pause(false)`→carta gratis, import/export, teclado 1/2/3 con `lockMs`, layout `.compact` en 568×320, `#away` con mute/menú accesibles.

---

# Ciclo 2 — Fase A (UI)

`node --check` OK en Ui.js y main.js. Sin probar en navegador. Archivos: `Ui.js`, `style.css`, `index.html`.

## Revisión de lo de Haiku
B1 (ResizeObserver + doble rAF), B4, B7, B8 y B10 se ven bien. B5: `syncSettings(typeof muted==='boolean' ? muted : false)` asume "desmuteado" si el handler no devuelve nada → **depende de que `bindUi.volume` devuelva el estado de mute** (pendiente en mi Fase B de GameScene).

## Hecho
- **B3 cola de toasts**: `toast()` encola (sin repetidos, máx 8); `pump()` (cada 200 ms y al encolar) los saca solo si no hay modal (`modalOpen`: cartas, menú, resumen, evento) y nunca más de 2 visibles; con cola larga duran ≤2,5 s. `resetView()` vacía las colas.
- **B9 panel**: ahora `right:210px; top:66; bottom:76; width:350` → ya no tapa los botones de acción ni "Ir al bosque", y es más alto (más ítems). En `.compact`: ancho completo y botones de acción en fila.
- **Sensación 5**: `#topc` = columna única arriba al centro (pronóstico → noche → logro → toasts) con gap. Se eliminó el hack `.night-on`. En `.compact` baja a top 64.
- **Sensación 4**: en `night` el HUD muestra `+0.8 / 4.0 /s` (rojo si falta, verde si llega) y la barra `#night` tiene línea "0.8 / 4.0 🔥/s · te faltan 3.2 /s" (usa `night.missing` si existe, si no `goal - rate`) o "¡vas bien! ✓". En atardecer avisa "Necesitás 4.0 🔥/s".
- **Sensación 6**: resumen más chico (caja 400px, filas y paddings reducidos, botón centrado).
- **Sensación 10**: en `.compact` cartas de 170px con títulos/leyendas/efecto en tamaños más aireados.
- **Nuevo** (API):
  - `ui.achievement({icon, name, desc})` → tarjeta dorada en `#achv` (5 s), en cola con los demás avisos.
  - `ui.forestEvent({icon, title, text, choices?:[{label,id}]}, onChoose)` → sin `choices`: tarjeta verde 6,5 s (llama `onChoose(null)` al cerrar); con `choices`: diálogo `#event` modal (teclas 1..n / Enter = primera opción; Esc no lo cierra) que llama `onChoose(id)`. **La UI no pausa el juego**: si el evento debe congelar el viaje, que lo haga la escena.
  - `ui.renderAchievements([{icon,name,desc,done}])` → sección desplegable "🏆 Logros n/m" en el menú. El menú pide la lista al abrirse con el handler `achievements()` si existe.

## Plan para mi turno de Fase B en GameScene
1. `bindUi.volume` → devolver `this.audio.muted` (tras `setVolume`; si el volumen > 0 y estaba muteado, desmutear y persistir `settings.muted=false`).
2. `bindUi.achievements: () => <lista de logros de progresión con done>` (según el formato final de progresión).
3. Conectar los avisos de progresión/dopamina con `ui.achievement(...)` y `ui.forestEvent(...)` (donde ellos dejen los hooks) y resolver la elección del evento (`onChoose`).
4. B2: `btn-ashes` visible si `meta.totalDawns>=1 || meta.prestiges>=1` (en `applyUnlock`/`create`) si progresión no lo hizo.
5. B6: el resumen de prestigio debe pasar `ashTotal = meta.totalAsh` o renombro la línea a "Cenizas disponibles" en `describeSummary`.
6. Chequear que `ui.update.night` incluya `missing` (ya está en `nightInfo`).

---

# Ciclo 2 — Fase B (UI, GameScene)

`node --check` OK (GameScene.js, Ui.js). Prueba rápida en 127.0.0.1:8080: sin errores de consola; 4 toasts + logro + diálogo de evento → se ven el logro y 2 toasts apilados, el resto espera en cola.

- **Contratos verificados**: progresión ya integró `ui.achievement({icon,name,desc})`, `ui.forestEvent({icon,title,text})`, handler `achievements()` y `volume` devolviendo `audio.muted` (B5 cerrado). `night.missing` llega en `ui.update.night` y la UI lo lee tal cual. Todo coincide con lo que lee Ui.js.
- **B6**: los resúmenes de amanecer y prestigio muestran "Cenizas disponibles" (`ashAvail`) y "Cenizas en total" (`ashTotal`).
- **Pestaña vieja** (`state.onStale`): ahora abre el diálogo `ui.forestEvent` con opciones "Seguir en esta pestaña" (`state.takeOver()`) / "Dejar como está", en vez de un toast.
- **Cola de toasts**: es global en Ui, así que cubre los avisos de las secuencias de nivel y amanecer sin cambios en la escena.
- Sin tocar lógica de juego, combo, juice ni parallax. Pendiente para el tester: eventos con `choices` (nadie los usa todavía), rotación 812×375 y panel a 800×600.

---

# C4-A (UI) — fase 1

Tocados: `Ui.js`, `style.css`, `index.html`. `node --check` OK. Sin probar en navegador (todavía no hay handlers en la escena).

## Hecho
- **Dock ↺ ↻** (`#rot`, botones de 64 px lógicos; `.small` ≥56 px reales): oculto salvo `ui.setDragging(true)` **y** modo touch (último `pointerdown` fue `touch`, o `pointer:coarse`). Apretar → `handlers.rotate(-1|1)` (continuo); soltar/cancelar/perder captura → `handlers.rotate(0)`. Con mouse se oculta solo. Los botones paran la propagación (no llegan al canvas).
- **Hint de rotación**: `ui.hintRotate(isTouch)` muestra 6 s *"Girá la leña: rueda del mouse o Q / E"* o *"…con los botones ↺ ↻"*, pisa el `setHint` periódico de la escena durante esos 6 s y se cancela con `ui.rotated()`. Una sola vez: `handlers.settingSeen('rotateHint')` debe **devolver `true` si ya se mostró y, si no, marcarlo y devolver `false`**; sin handler usa `localStorage['fogata-ui-seen-rotate']`. Devuelve `true` si lo mostró.
- **`ui.pitInfo(list)`**: `list=[{i, screenX, screenY, size, sizeName, load, cap, structure:{type,quality}}]`. **x/y en coordenadas del MUNDO (1280×720)**; la UI escala por `#ui.clientWidth/1280`. Etiqueta chica (12 px, 75% opacidad, `pointer-events:none`) "Fogón · 5/8 · Tipi 80%" (estructura solo si quality>0.05 y tipo tipi/cabana/monton); roja si `load>=cap`. Etiquetas sobrantes se eliminan.
- **Tienda**: ítems `agrandar_*` muestran `.sizebar` (8 ranuras + "Fogón → Hogar") y 3 líneas antes→después (Capacidad ×1.9→×2.5, Aire +10%→+15%, Calor ×1.85→×2.4) deducidas de `sizes.js`; si el ítem trae `effects[]` se usan esas (y para cualquier ítem, `effects[]` o `effect`). `item.blocked` (texto) deshabilita el botón y muestra "🚧 texto".

## Código para GameScene (fase 2)
```js
// bindUi
rotate: (dir) => this.rotateDrag(dir),           // -1 | 0 | 1
settingSeen: (key) => {                          // true si ya visto; si no, lo marca
  const seen = (this.state.data.settings.seen ||= {});
  if (seen[key]) return true;
  seen[key] = true; this.state.save();
  return false;
},
// startDrag(log, p, spawned): 
this.ui.setDragging(true);
if (this.pitAtLog?.(log)) ...                    // 1.ª vez que la leña agarrada entra en un pozo:
if (!this.rotHintShown && this.fire.pitAt(log.x, log.y)) { this.rotHintShown = true; this.ui.hintRotate(!!this.touch); }
// endDrag(): this.ui.setDragging(false);
// en rotateDrag/rotateStep cuando dir != 0: this.ui.rotated();

// update(), dentro del bloque cada 0,3 s (hintTimer):
this.ui.pitInfo(this.pitObjs.map((p, i) => ({
  i, screenX: p.x, screenY: GROUND_Y + 34, size: p.size, sizeName: SIZES[p.size].name,
  load: p.load, cap: p.capacity, structure: p.structure,
})));
```
(Ajustar `p.load`/`p.capacity` a la unidad que muestre física: debe coincidir con cuándo se ahoga; si son áreas grandes como 26000, pasar leños equivalentes o un porcentaje ×10.)

## Pedidos
- **Progresión**: `shopItems` debe pasar `blocked: 'No entra en el terreno'` (texto) y, si quiere líneas propias, `effects:[{label,before,after}]`. `settings.seen` (objeto) con merge profundo.
- **Física**: `scene.rotateDrag(dir)`, `ui.rotated()` al rotar, y la unidad de `pit.load`.

---

# C4-A fase 2 (UI en GameScene)

`node --check` OK (GameScene.js, Ui.js). Probado en 127.0.0.1:8080: sin errores de consola (salvo el `setPointerCapture` con un puntero sintético, ya envuelto en try/catch); dock visible con `setDragging(true)` + touch, `handlers.rotate(-1)` y `rotate(0)` al soltar; `pitInfo` dibuja 3 etiquetas bajo los pozos. **No probé** un arrastre real con dedo ni móvil horizontal.

## Conectado en GameScene
- `bindUi`: `rotate → rotateDrag`, `settingSeen → seenOnce(key)` (persiste en `settings.seen`, devuelve true si ya estaba visto).
- `startDrag` → `ui.setDragging(true)`; `endDrag` → `setDragging(false)` y `rotUi = 0` (suelta el dock aunque el dedo siga apretado). El dock solo aparece si el último puntero fue touch (lo decide Ui). `addAim` llama `ui.rotated()` (cancela la pista).
- **Hint de rotación**: en el bloque de 0,3 s, 1.ª vez que la leña agarrada está dentro de un pozo → `ui.hintRotate(this.touch)` (una vez por jugador).
- **`pitInfo`** cada 0,3 s con `pitInfoList()`: coordenadas del mundo (`p.x`, `GROUND_Y + 18`; la cámara no se mueve), carga/capacidad en **troncos equivalentes** (`area / 7400`, 🪵), estructura de `pit.structure`. `load = loadRatio × cap`.
- **Tienda**: `shopItems` pasa `blocked: it.blocked?.() || null`; `buy` rechaza con toast "🚧 motivo" si hay `blocked`. La escala de tamaños (ranuras, nombre siguiente, capacidad/aire/calor antes→después) la deduce Ui de `sizes.js`.
- **Avisos**: `log:overflow` → toast "El Fogón está lleno: agrandalo o armá una cabaña…" (cooldown 15 s, además del texto flotante de dopamina); `structure:formed` → toast explicativo la primera vez de cada tipo (tipi / cabaña), persistido en `settings.seen.struct_*`.

## Pendiente / a mirar
- Mirar en dispositivo táctil: ubicación del dock (abajo-izquierda) frente a la pila de leña y al hint.
- `pitInfo` y las etiquetas de pozos tamaño ≥5 (huella grande) podrían solaparse entre sí.
- `settings.seen` depende de que `load()` conserve claves desconocidas (deep merge): verificado que `settings` se guarda tal cual.

---

# C4-B fase 1 (UI)

`node --check` OK en Ui.js. Sin probar en navegador (la prueba visual va tras la fase 2).

## Hecho
- **A7**: `ui.hintRotate(false)` → *"Girar: rueda ↑ = ↺, ↓ = ↻ · Q ↺ / E ↻ · clic derecho · Shift = fino"* (9 s; touch 6 s). Sentidos verificados contra la escena: rueda abajo (`dy>0`) = +15° horario, E = horario, Q = antihorario.
- **Etiqueta de pozo** (`ui.pitInfo`): ahora `nombre · barra de carga · n/cap 🪵 · estructura`. Barra verde (<70%), ámbar (70–95%), roja (≥95%); sin barra si no llegan `load/cap`. En `.small`/`.compact`: sin nombre, y en `.small` sin números → solo barra + estructura (renglones cortos).
- **Aviso de lleno**: nueva `ui.pitFull(i, texto)`: parpadea la etiqueta del pozo `i` (rojo, 4 pulsos) y muestra el toast **una sola vez por jugador** (`handlers.settingSeen('pitFull')`; sin handler, una vez por sesión). Las siguientes veces solo parpadea.

## Para GameScene en la fase 2
1. **Hint en desktop**: en `startDrag` (o el bloque de 0,3 s) ya existe el disparo `ui.hintRotate(!!this.touch)` cuando la leña agarrada entra en un pozo. En desktop no se vio porque ese bloque corre solo si `!this.paused` y la leña a veces nunca está "dentro" (`pitAt`); disparar también en el primer `startDrag` de una leña **sacada del estante** (`spawned`) cuando `!this.rotHintShown`, con `this.ui.hintRotate(!!this.touch)`.
2. **Overflow**: en el listener de `log:overflow` reemplazar el `ui.toast(...)` propio por `this.ui.pitFull(this.pitObjs.indexOf(pit), \`${nombre} está lleno: agrandalo o armá una cabaña para que entre más.\`)` (sin cooldown de toast, el parpadeo se encarga). Cuando física emita overflow por pared, que use el mismo evento.
3. **A3 (texto "¡Armaste un tipi!" duplicado)** — causa localizada, no tocada: hay **un solo** `floatText` de "Armaste" (`GameScene.js:587`, listener de `structure:formed`) y un solo `emit` (`Fire.js:435`). Los listeners de `setupFeelEvents()` (llamada desde `create`) **nunca se desregistran**: `this.events` sobrevive a `scene.restart()` (importar, reset, prestigio), así que cada reinicio suma otro listener y el texto sale 2×, 3×… (y también sonido/flash/`pit:grow`, etc.). Arreglo: al inicio de `setupFeelEvents()` (y de los `events.on` de noches/pico) hacer `for (const n of ['log:rotate','log:rest','log:overflow','log:returned','structure:formed','structure:lost','pit:grow', …]) this.events.off(n);`, o registrar con `this.events.once('shutdown', () => …off…)`. Revisar todos los `events.on(` del archivo.

---

# C4-B fase 2 (UI en GameScene)

`node --check` OK (GameScene.js, Ui.js). Probado en 127.0.0.1:8080: tras `scene.restart()` los listeners de `structure:formed` quedan en 2 (los 2 handlers del archivo, antes se sumaban 2 por reinicio) → A3 resuelto de raíz; `pitFull` devuelve true solo la 1.ª vez; la etiqueta muestra "Tipi 80% · ahogado: armá tipi/cabaña". Sin errores nuevos de consola (el `setPointerCapture` del log es de la prueba anterior con un puntero sintético, ya con try/catch). **No probé** un arrastre real ni móvil horizontal.

## Cambios en GameScene
- **A3**: `setupFeelEvents()` empieza con `events.off(...)` de los 7 eventos propios (los de escena sobreviven a `restart`), así "¡Armaste un tipi!", sonidos y flashes ya no se multiplican.
- **Aviso único de lleno**: se eliminó mi toast con cooldown. `log:overflow`: `reason 'full'` → `ui.pitFull(idx, texto)` (toast solo la 1.ª vez del jugador; devuelve true si lo mostró) y el "Pozo lleno" flotante de dopamina solo si no hubo toast (cooldown 4 s intacto); `reason 'wall'` → `woodTock` + parpadeo de la etiqueta (`pitFull(idx)` sin texto); `'out'` → nada.
- **Hint de rotación en desktop**: el chequeo "arrastrando sobre un pozo" pasó del bloque de 0,3 s a cada frame (`pitAt` en la posición de la leña o a `GROUND_Y-60`), así no se pierde con arrastres rápidos. Se muestra una sola vez por jugador (`settings.seen.rotateHint`); si ya figura como visto no sale (para repetirlo: `fogata.state.data.settings.seen = {}`).
- **`pitInfoList()`** suma `stackPenalty`; la etiqueta muestra "ahogado: armá tipi/cabaña" cuando es > 0,05.

## Pendiente
Verificar a ojo en móvil horizontal el ancho de la etiqueta con aviso, y arrastre real en táctil (dock, 2.º dedo).

## Menú principal

Archivos: `js/ui/MainMenu.js` (nuevo), `Ui.js`, `index.html` (`#mm`), `css/style.css`. No toqué GameScene.js ni main.js: **no hace falta ningún hook**, todo usa los handlers existentes.

- **Título** al abrir (`ui.mm.open('title')` en el constructor de Ui): Continuar (con nivel, calor, noches y fecha; foco inicial, Enter lo activa), Partida nueva (confirma si hay partida), Cargar, Ajustes, Créditos. Sin partida guardada: "Jugar".
- **Pausa** (Esc o ⚙️ → `toggleMenu(true)` → `mm.open('pause')`): Continuar, Guardar, Cargar, Ajustes, Volver al título. Pausa vía `handlers.pause(true/false)` (ya existe: `setPaused`). `Ui.bind` pausa si el título ya estaba abierto antes de que existiera la escena.
- **Ranuras**: 3 manuales en `fogata-master-slot-N` (`{v, savedAt, info, save}`, donde `save` es `handlers.export()`); autoguardado = `fogata-master-save-v1` sin cambios; `fogata-master-prev` = copia de lo pisado por Nueva/Cargar/Reiniciar (aparece como "Copia previa"). Cargar = `ui.importSave(texto)` → `handlers.import`. Borrar y pisar piden confirmación.
- **Ajustes** reutiliza `#menu` (ahora "Ajustes", botón "Volver"); exportar/importar siguen ahí, y "Importar archivo…" también en Cargar.
- Teclado: Esc vuelve un nivel (en pausa, continúa), Tab con trampa de foco, ↑/↓ entre botones, atajos del juego (S, C, B, Q, E…) bloqueados con el menú abierto. Móvil 812×375: sin scroll horizontal, objetivos ≥44 px.

**Hooks pendientes para GameScene/main.js: ninguno obligatorio.** Opcionales:
1. `window.fogata.state` ya existe; no hace falta más.
2. `GameScene.setPaused(on)`: hoy solo pausa `matter.world`. Si el fuego (Fire.update / calor / noche) corre aunque `this.paused`, `update()` debe salir temprano con `if (this.paused) return;` (ya verifiqué que `paused` pasa a true/false con el menú; no auditado qué más avanza).
3. `GameScene.create()`: al reiniciar con `scene.restart()` debe dejar `this.paused = false` (hoy `pause(false)` lo hace el cierre del menú).

Verificado en 127.0.0.1:8080: título, Continuar, Esc→pausa (`scene.paused` true), guardar en ranura 2, cargar con confirmación, Copia previa creada, Esc en sub-pantallas, atajo `S` bloqueado, 812×375 sin desbordar. No verificado: touch real, Importar archivo desde Cargar, Nueva partida confirmada (borra la clave de 127.0.0.1).

## C4-C (pista de ranuras magnéticas)

- `Ui.hintRotate` cambia el texto: desktop "Soltá cerca de una silueta y encaja · Rueda/Q·E gira para el tipi"; touch "Soltá sobre la silueta y encaja · ↺ ↻ para inclinar". El flag persistente pasó de `rotateHint` a `snapHint` para que también lo vean quienes ya vieron la pista vieja. El disparo sigue en GameScene sin cambios.
- Créditos (MainMenu.js) ahora arranca con 3 líneas de ayuda: base, cabaña (2 bases + puente), tipi (±60° y soltar a los costados). Toqué MainMenu.js, que no es de otra sesión.
- `pitInfo` (punto 3) no se hizo: `pit.slots` solo existe durante el arrastre y `pitInfoList` no lo pasa; la etiqueta ya muestra la estructura. Si se quiere, GameScene debería agregar `slotsUsed/slotsTotal` a cada item y la UI lo muestra.
- No verificado en pantalla (solo `node --check`).

## C4-D (C9: reinicio duplicado)

- "Reiniciar partida" de Ajustes ahora es "Partida nueva…" y llama a `mm.askNew()`, el mismo flujo del título: confirmación en pantalla (Cancelar resaltado, vuelve a Ajustes) + copia previa (`backup()`) + `handlers.reset`. Se quitó la confirmación propia de dos toques en Ui.js. Sin partida guardada cierra el menú sin borrar.
- Solo `node --check`; no probado en el navegador.

## C5 fase 1 (tutorial y legibilidad)

Archivos: `Ui.js`, `MainMenu.js`, `index.html`, `style.css`. Probado a mano en 127.0.0.1:8080 llamando a la API (partida respaldada y restaurada, `locked = true`, pestaña cerrada). Sin tocar GameScene/GameState.

**Hecho**
- **Tutorial** `ui.tutorial(event, data)`: pasos arrastrar → encajar → prender (resalta 🔥 fósforos) → tipi → cabaña (solo con tamaño ≥3). Avanza al lograr la acción; un evento cumple su paso y los anteriores; un paso sin cumplirse vence (45/45/30/60/60 s) para no insistir. Progreso en `localStorage['fogata-ui-tut']`. Urgencias (se apagó, ahogando, brasas, bosque, lleno) ganan: `setHint(text, force, urgent)` deduce `urgent` por texto; la escena puede pasarlo explícito. `hintRotate` no sale mientras el tutorial está activo.
- **`ui.guide(id|null)`**: clase `.guide` con pulso; sin animación con reduce-motion.
- **Etiqueta del pozo**: 15 px, opaca, fondo suave; nuevos campos `bonus` (fracción: 0.22 → "+22%", o texto), `slotsUsed`/`slotsTotal` ("3/8 ranuras", se oculta en compact).
- **Pista (H10)**: ahora vive dentro de `#topc` (arriba al centro, píldora con fondo), nunca sobre llamas ni etiqueta. **Chip Secadero (H3)**: columna arriba a la derecha.
- **HUD**: calor/s 19 px; ⓘ y clic/hover/foco abren el desglose (`rateInfo.parts`); barra de nivel 11 px y 230 px. **Próximo objetivo** `#goal` bajo el nivel desde `handlers.nextGoal()` (sondeo cada 0,5 s; sin handler, no aparece).
- **Cómo jugar** en la pausa (con "Ver la guía paso a paso" que reinicia el tutorial); Créditos queda solo con créditos.
- **H9**: "Continuar" solo si el guardado tiene progreso (calor > 0 o nivel > 1). **Amanecer**: "Premio del alba · elegís 1 carta gratis".

**Pendiente en GameScene (mi turno de fase 2), lista exacta**
1. Al terminar `create()`: `ui.tutorial('load', { progress: state.totalCalor > 0 || state.data.level > 1, size: <mayor size de pozo> })`. Tras Partida nueva (`reset`) el `restart` de la escena vuelve a llamarlo con progress false (resetView ya reinicia el tutorial).
2. Llamar `ui.tutorial(ev)` en: `startDrag` ('grab'), `endDrag` ('drop'), `log:snap` ('snap'), encendido con fósforo/toque ('ignite'), `rotateDrag`/`addAim` ('rotate'), `structure:formed` ('structure:tipi' / 'structure:cabana'), `pit:grow` ('pit:grow', `{size}`).
3. `pitInfoList`: agregar `bonus` (fracción de calor de la estructura), `slotsUsed`, `slotsTotal`.
4. `bindUi`: `nextGoal: () => this.state.nextGoal()`.
5. `setHint(text, false, urgent)` en `update()` si se quiere marcar urgencias sin depender del texto.

**No verificado**: el tutorial con el juego real (solo eventos llamados a mano), táctil, y el 812×375 de los cambios nuevos (la etiqueta y el HUD se vieron en pantalla de escritorio pequeña). El desglose abierto empuja hacia abajo la barra de nivel (no flota).

## C5 fase 2 (conexión con la escena, contraste, móvil)

**GameScene.js** (único dueño este turno): `create()` llama `ui.tutorial('load', {progress, size})` (progress = calor total > 120, nivel > 1 o algo desbloqueado); `startDrag` → 'grab'; `endDrag` → 'drop' (solo si la suelta el jugador sobre un pozo); `log:snap` → 'snap'; `log:rotate` → 'rotate'; `fire.onIgnite` → 'ignite' (antes del corte por `fx`); `structure:formed` → `structure:tipi|cabana`; `pit:grow` → 'pit:grow' `{size}`. `pitInfoList` suma `bonus` (calor de la estructura × calidad) y `slotsTotal` (ocupadas + libres, solo mientras se arrastra; fuera del arrastre `slotsTotal` es 0 y la etiqueta no muestra ranuras). `bindUi.nextGoal = () => state.nextGoal({ rain: weather.rain })`. Las urgencias de `setHint` se deducen por texto en la UI (no hizo falta marcar nada en la escena).

**Probado en 127.0.0.1:8080** (partida vacía respaldada y restaurada; `locked = true`; pestaña cerrada), con el panel oculto: `game.step()` para avanzar y MouseEvent reales con `left_click_drag` / `left_click`:
- "Jugar" → paso **arrastrar**; un arrastre real de una rama al pozo cumplió **arrastrar + encajar** de una vez (cumplir un paso cumple los anteriores) → paso **prender**; el clic sobre la rama gastó el fósforo y, tras ~240 cuadros, 'ignite' llegó y pasó a **tipi**. Ningún paso quedó trabado. Texto corto y a tiempo (el primero sale al abrir).
- Urgencia ("Se está ahogando…") interrumpe y, al limpiarla, vuelve el paso en curso. `structure:formed` emitido a mano cierra el tipi; la cabaña no aparece con tamaño < 3 (probado con API).
- Con partida (calor 500) el tutorial no arranca ni deja pista; `localStorage['fogata-ui-tut']` guarda el avance.
- `nextGoal` real se ve en el HUD ("⏳ Seguí hasta 1600 🔥…").

**Contraste**: de día (cielo claro) y atardecer el HUD de calor lleva fondo oscuro suave (`#ui.sky-day/-dusk`, clase puesta por `Ui.update` desde `skyLabel`); en día también chip de fósforos, pista, etiqueta y pronóstico más opacos. Usé screenshot real del panel (no `toDataURL`) en día, atardecer (primer arranque) y 812×375; noche no se re-capturó (el fondo oscuro es el diseño original).

**812×375**: sin scroll horizontal. Objetivo, pista, etiqueta y calor/s se leen; la etiqueta del pozo rozaba el botón "Ir al bosque" → en compact barra y márgenes más cortos (no re-capturado tras ese ajuste). Con 2 pozos juntos podría haber roce.

**Desglose del calor/s**: ahora flota (absoluto), ya no empuja la barra de nivel.

**No verificado**: táctil real (dock, segundo dedo, hint táctil), rotar con rueda/Q·E durante el arrastre real y soltar un tipi real (probé 'rotate' y el tipi por eventos, no con física), noche con la UI nueva, etiqueta de 2 pozos en compact.

## C5 iteración 2

Solo `Ui.js`, `MainMenu.js`, `style.css`. `node --check` OK. Probado en 127.0.0.1:8080 por API (partida respaldada y restaurada).

- **J5/H2 avisos**: un solo canal con prioridad (bad > unlock > info), máximo 2 toasts visibles (1 si hay tarjeta de logro), cola de 5 sin duplicados, urgencias desplazan al más viejo. Con modal abierto los toasts visibles se retiran y vuelven a la cola, y `#topc` se oculta sin fundido. Logros duplicados no se encolan. Verificado: 5 avisos → 2 visibles; con modal 0 visibles; al cerrar vuelven en orden.
- **J6 tutorial**: se quitó el paso "prender" de la cadena (la ignición natural ya no cumple nada); "soltar libre" solo cumple "arrastrar", "encajar" solo con `snap` real. "Prender" pasa a ayuda contextual: cualquier pista con "prender/fósforo" gana sobre el tutorial y resalta los fósforos. **Línea pendiente en GameScene (`currentHint`)**: si hay una leña cruda apoyada en un pozo sin llama hace > 8 s y nunca se prendió a mano, devolver `'Tocá la leña del pozo para prenderla con un fósforo.'`.
- **Móvil 812×375**: calor, ritmo, nivel y objetivo más grandes en `.compact`; botones inferiores con margen y `safe-area`. No re-capturado en pantalla.
- **Título**: "Continuar" muestra el calor actual (el del HUD), no el acumulado.
- **Rendimiento**: `backdrop-filter` solo existe en el menú; se desactiva en `.small`/táctil. Sin otros efectos caros.
- **No verificado**: captura 812×375 tras los cambios, táctil real, la pista de prender (depende de la línea pendiente).
