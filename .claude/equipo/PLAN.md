# Plan del equipo — Tanda 1

Coordinador: la sesión principal. Especialistas: **progresión**, **dopamina**, **ui** (roles en `.claude/agents/fogata-*.md`).
No hay git: respaldo en el scratchpad del coordinador. **Nadie edita archivos fuera de los que le tocan en su fase.**
Al terminar cada fase, cada uno escribe `.claude/equipo/informe-<area>.md` (qué hizo, contratos que expuso, pendientes, dudas) y termina su turno.

## Alcance elegido por el usuario
- **Dopamina**: combo de chispazos · momento de prender · celebración de nivel y desbloqueos (+ fanfarria de amanecer y efecto de prestigio).
- **Progresión**: cartas con rareza + nuevas cartas · rebalanceo de curva · noches + amanecer · prestigio "Cenizas".
- **UI/QoL**: responsive + touch · atajos + cartas seguras · info en tienda y nivel · ajustes + arreglos chicos (+ HUD de noche, pestaña Cenizas, resumen).

## Decisiones del coordinador (resuelven choques del debate)
1. **Combo**: cosmético por defecto (pitch, tamaño y color de números, dings). El bonus de calor solo viene de la carta rara `chispa-en-cadena` (mod `comboCap`, techo ×1.3 sobre el valor del orbe). La lógica del contador `this.combo`/`this.comboT` la escribe **dopamina** en `collectOrbsNear`/`updateOrbs` y aplica `mods.comboCap` (que define progresión).
2. **Efecto legible**: cada ítem de `shop.js` y cada carta de `cards.js` expone `effect: (n) => ({ label, before, after })`, con `n` = nivel actual. Sin número: `{label, before:'—', after:'activo'}`. `shopItems()` pasa `effect` ya evaluado y `showCards` recibe cartas con `effect` evaluado.
3. **Ajustes**: `state.data.settings = { volume: 0.8, muted: false, reduceMotion: false }` con merge profundo en `load()`; lo hace **progresión** en `GameState.js`. El valor inicial de `reduceMotion` sale de `matchMedia('(prefers-reduced-motion: reduce)')` si no hay guardado.
4. **Guardado**: se mantiene la KEY `fogata-master-save-v1`, con `data.version = 2`. Hay merge profundo de `settings`, `meta`, `night` y `res`. `wipe({keepMeta})`, `exportSave()` e `importSave(str)` van en GameState (progresión).
5. **Secuencia de nivel** (un único timer, sin delays duplicados), la maneja **dopamina** con `playLevelSequence(onDone)`:
   - **0 ms**: `ui.fillLevelBar()` y flash dorado.
   - **0–250 ms**: `Fire.flare()`.
   - **150 ms**: `audio.levelUp(tier)`.
   - **900 ms**: `setPaused(true)` y `ui.showCards(cards, levels, { lockMs: 400 })`.

   Detalles:
   - Fanfarria escalada: corta en niveles comunes y completa cada 5 niveles.
   - Con `reduceMotion`: no hay celebración y la llamada es `showCards(..., { lockMs: 450 })` directo.
   - `checkProgress` (progresión) decide **cuándo** hay nivel y llama `this.playLevelSequence(() => this.showLevelCards())`. Progresión deja `playLevelSequence` como stub: `(done) => done()`.
6. **Hooks entre áreas**:
   - Progresión emite eventos de escena y deja stubs; dopamina y UI se enganchan sin tocar la lógica.
   - Eventos: `night:dusk`, `night:start {n, goal}`, `night:progress {pct, rate, goal, goalMet, cold}`, `night:dawn {n, success, ash, cardFree, summary}`, `night:fail`, `prestige:start`.
   - Stubs que deja progresión en GameScene: `playLevelSequence(done)`, `playDawn(info, done)` y `playReset(done)`. Todos llaman `done()` y dopamina los rellena.
   - `doPrestige()` (progresión) llama `this.playReset(() => { ...reset...; scene.restart() })`.
   - Getters de GameState: `nightInfo()` → `{phase, n, tLeft, goal, pct, goalMet, cold}`, donde `cold` va de 0 a 1 y dopamina lo usa para tintar `vignette` y la luz. También `rateBreakdown(...)` y `levelProgress` (en `progress.js`).
7. **Cartas por rareza**: `card.rarity` toma `'comun' | 'rara' | 'epica'`. UI pone las clases `.card.comun/.rara/.epica` y respeta `data-delay` para la animación `deal`. Dopamina define sonido y timing: la épica entra 250 ms tarde, con acorde y destello morado.
8. **Volumen**: dopamina agrega `audio.setVolume(v)`, `getVolume()` y `setMuted(m)`, que respeta `volume`. UI pone el slider, guarda el valor y lo aplica al arrancar.
9. **Noches**: siguen la spec de progresión (desde 2500 de calor total; DÍA 4 min → atardecer 30 s → NOCHE 8 min → amanecer). Si la noche falla no se pierde progreso, solo la recompensa. Tienda de Cenizas con 8 mejoras. Prestigio desde la pestaña Cenizas, con `dawns >= 1`.
10. **UI de lo nuevo**: `#night` es una barra del HUD debajo de `#forecast`. Cenizas va como tercera pestaña de `#panel` (`#btn-ashes`). El resumen de noche/prestigio es el modal `#summary` (`ui.showSummary(data)`). El juego lo pausa `GameScene`, nunca la UI. Prestigio usa el handler `prestige`, aparte de `reset`.

## Fases y dueños de archivos

### Fase A — en paralelo (archivos disjuntos)
| Especialista | Archivos exclusivos |
|---|---|
| **progresión** | `js/scenes/GameScene.js` (único dueño en fase A), `js/state/GameState.js`, `js/data/*.js` (progress, shop, cards, woods, + nuevos `nights.js` y `meta.js`), `js/objects/Pit.js` |
| **dopamina** | `js/audio/FireAudio.js`, `js/objects/Fire.js`, `js/objects/Log.js`, `js/objects/Weather.js` |
| **ui** | `js/ui/Ui.js`, `css/style.css`, `index.html`, `js/main.js` |

En fase A, dopamina y UI programan contra los contratos de este plan: nuevas APIs en sus archivos, sin tocar GameScene. Lo que necesiten de GameScene lo anotan en su informe como "integración pendiente".

### Fase B — GameScene en secuencia
1. **dopamina**: combo (`collectOrbsNear`, `updateOrbs`, `floatText`), `setupFireEvents`/`onIgnite`, rellenar `playLevelSequence`/`playDawn`/`playReset`, destellos de hito en `applyUnlock`, `this.fx` (motion) y la reacción a `cold`.
2. **ui**: `bindUi` (handlers `volume`, `motion`, `export`, `import`, `prestige`), campos `need`/`effect` en `shopItems`, campos de `ui.update` (`levelCur`, `levelNeed`, `rateInfo`, `night`), tap de chispazos en touch (`setupInput`, mínimo) y la aplicación de ajustes al arrancar.

### Fase C — el coordinador verifica en el navegador y reparte los arreglos.

## Reglas comunes
- Estilo del código existente: español, mismos nombres e idioma de comentarios. No romper partidas guardadas.
- `node --check` en cada JS editado. No levantar servidores (el coordinador prueba en el navegador).
- No borrar ni reescribir funciones de otro dueño. Si algo de otra área bloquea, se anota en el informe y no se toca.
