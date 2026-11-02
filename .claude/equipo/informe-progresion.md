# Informe — Progresión, Fase A

Todos los JS pasan `node --check`. Además probé GameState + datos en Node con un guardado v1: carga, `version: 2`, export/import, rarezas (≈70/25/5), todos los `effect`, ciclo de noche y wipe con meta. No probé en el navegador.

## Qué hice
- **cards.js**: rareza + `RARITY_WEIGHT`, `rollCards` ponderado, `effect(n)` en todas. Nuevas: incendio, cenizas (id; nombre "Lecho cálido"), combustión, resina, sabueso, vigilia, chispa-en-cadena, tributo. Cera y regalo max 3.
- **shop.js**: `effect(n)` en los 12 ítems y los 3 de pozo.
- **progress.js**: `levelThreshold(level, ease=1) = 180×1.62^(n-2)×ease`, `levelProgress(data, ease)` → `{cur, need, pct}`, hito `noches` a 2500.
- **nights.js** (nuevo): reloj, meta, frío, ceniza de amanecer. **meta.js** (nuevo): 8 mejoras de Cenizas, `ashFromRun`.
- **GameState.js**: `version 2`, `settings`, `meta`, `night`, deep merge en `load()`, `wipe({keepMeta})`, `exportSave()`, `importSave(str)`, `rateBreakdown()`, `ashGain()`, `nightInfo()`, `levelInfo()`, `buyMeta()`, mods nuevos.
- **GameScene.js**: integración completa (abajo). `Pit.js` sin cambios.

## Contratos

**Eventos de escena** (`scene.events`):
`night:dusk` · `night:start {n, goal}` · `night:progress {pct, rate, goal, goalMet, cold}` (cada 0,5 s en cualquier fase menos `off`) · `night:dawn {n, success, ash, cardFree, summary}` · `night:fail` (mismo payload que dawn, se emite antes de `night:dawn`) · `prestige:start {gain}`.
`n` en dawn/fail = noche que acaba de terminar.

**Stubs en GameScene** (dopamina los rellena): `playLevelSequence(done)` (por ahora llama `audio.levelUp()` y `done()`; dopamina debe sacar esa línea si su secuencia ya suena), `playDawn(info, done)` (info = payload de `night:dawn`), `playReset(done)`.
Otros métodos: `queueCards(levelUp)` → arma `this.pendingLevel` y llama `playLevelSequence(() => this.showLevelCards())`; `showLevelCards()` hace `setPaused(true)` y `ui.showCards(cards, levels)`. **Ojo dopamina**: el plan dice que la secuencia hace el `showCards` a 900 ms; con mi diseño la secuencia solo anima y llama `done()`, que es quien pausa y muestra las cartas. Si necesita `lockMs`, hay que ponerlo en `showLevelCards`.

**Cartas que recibe `ui.showCards`** (array): `{id, icon, name, desc, rarity, level, max, effect:{label,before,after}}`; segundo arg = niveles `data.cards`.

**`shopItems(tab)`** suma `effect:{label,before,after}` (evaluado con el nivel actual; si está al máximo, con max-1). `need` lo agrega UI.

**`ui.update({...})`** suma: `levelCur`, `levelNeed`, `levelProgress` (= pct), `rateInfo {total, parts:[{id,label,text}]}`, `night` (o `null` si no hay hito noches). `night` = `state.nightInfo()` = `{phase:'off'|'day'|'dusk'|'night', n, tLeft(s), goal(calor/s), pct (avance de la fase), goalMet, cold(0..1)}`.

**Handlers que registro en `ui.bind`**: `ashItems()` → `[{id,icon,name,desc,level,max,maxed,cost,affordable,effect}]`; `ashInfo()` → `{ash, dawns, totalDawns, prestiges, canPrestige, gain, unlocked}`; `buyAsh(id)`; `prestige()` (devuelve bool). Los de ajustes/export/import los agrega UI en fase B llamando a `state.exportSave()` / `state.importSave(str)` (→ `{ok, error?}`; después hay que reiniciar la escena).

**Resumen**: `scene.showSummary(summary)` pausa el juego y llama `ui.showSummary(summary)` **si existe** (si no, toast). UI debe reanudar con el handler `pause(false)` al cerrar. `summary.kind`:
- `'dawn'`: `{n, success, ash, cardFree, goal, ratio, calor, dawns, ashTotal}`
- `'prestige'`: `{ash, ashTotal, prestiges, runCalor, dawns}` (se muestra recién tras el `scene.restart()`, vía `state.pendingSummary`).
La carta gratis del amanecer sale sola en `checkProgress` cuando se cierra el resumen (el juego deja de estar pausado).

**GameState**: `settings {volume:0.8, muted:false, reduceMotion:(matchMedia)}`, `meta {ash, upgrades, totalDawns, prestiges, totalAsh}`, `night {phase,t,n,dawns,fails,coldLvl,inGoal,startTotal,freeCard}`. `state.rate` lo escribe la escena (calor/s suavizado). `mods.comboCap` (1 + 0,1 por carta, techo ×1.3) es el que dopamina aplica al combo.

## Balance elegido
- Cartas: común 70 / rara 25 / épica 5. Raras: tiraje, fuelle, incendio, vigilia, chispa-en-cadena. Épicas: combustión (+25% calor/nivel, leña −10%), tributo (12 s de calor por nivel, por carta). Incendio +5% calor por leño con llama desde el 3.º (hasta 4 extra). Lecho cálido +0,5 calor/s por pozo con lecho lleno. Sabueso: viaje (loot ×0,4) cada 60 s, −33% de espera por carta extra. Resina: leña +10% y piñas +25%. Vigilia: meta −12% y frío más lento.
- Nivel: 180 × 1.62^(n-2) (nivel 2: 180, 5: 765, 10: ~8,5k).
- Noches: primer día de 90 s al desbloquear; luego DÍA 240 s → atardecer 30 s → NOCHE 480 s. Meta = 4 calor/s × 1.3^(n-1) × `nightEase`. Frío: llega a 1 en 70 s con ritmo 0 (proporcional al déficit), se recupera en 45 s con la meta cumplida; 1 = falla (termina esa noche y se repite el mismo número). Carta gratis si estuvo en meta ≥ 60% de la noche. Ceniza por amanecer: 2 + n (× `ashBonus`). `cold` visible: atardecer 0→0,25; noche 0,25 + 0,75×frío; día se entibia en 15 s.
- Prestigio: requiere `night.dawns >= 1` de la partida actual. Ceniza = floor(√(calorTotal/600) × ashBonus). Conserva: `meta`, `settings`. Resetea: todo lo demás. `semilla` y `atajo` se aplican al empezar.
- Mejoras (costo en ceniza, base×k^n): semilla (3, ×1.5, max5), cosecha +8% calor (3, ×1.45, max10), memoria −6% calor/nivel (4, ×1.6, max5), fiel −4% precios (4, ×1.6, max5), abrigo (5, ×1.6, max5), fortuna +10% ceniza (6, ×1.8, max5), atajo (6, ×2, max3), olfato +15% chispazos/alcance (4, ×1.5, max5).

## Pendientes / sin verificar
- **Todos los números de noches son estimaciones**: la meta de 4 calor/s de la noche 1 hay que probarla en juego (a ~2500 de calor total).
- Nombre de la carta "cenizas" es "Lecho cálido" para no confundir con la moneda Cenizas; el id es `cenizas`.
- El mod `hound` y `mods.pinas` solo los usa GameScene; Fire/Log no tocan nada nuevo salvo `mods.fuel` (ya existente, ahora suma resina y combustión).
- GameScene fue modificada en disco por alguien más mientras trabajaba (no mía); mis cambios están integrados y el archivo pasa `node --check`.

## Necesito de otros
- **UI** (fase B): pestaña Cenizas con `ashItems/ashInfo/buyAsh/prestige`; `ui.showSummary` (reanudar con `pause(false)`); barra `#night` desde `night`; mostrar `rarity`/`effect` de cartas; `need` en tienda; handlers volume/motion/export/import.
- **Dopamina**: rellenar los 3 stubs; usar `cold` y `mods.comboCap`; reaccionar a eventos `night:*`.

---

# Ciclo 2 — Fase A (progresión)

Solo toqué `GameState.js` y `js/data/*.js`. Todo pasa `node --check`; probé en Node (dos instancias de GameState sobre un localStorage falso, logros, sorteo de eventos). Sin navegador.

## Qué cambió
- **B6**: nuevo `state.ashSummary()` → `{ashAvail, ashTotal}` (saldo y total de por vida = `meta.totalAsh`). En fase B el resumen de dawn/prestige los usa en lugar de `ashTotal = meta.ash`; la UI debe rotular `ashAvail` como "disponibles" y `ashTotal` como "en total".
- **B11**: `save(force=false)` devuelve bool. Cada pestaña tiene `state.sid`; cada guardado lleva `session` + `savedAt`. Si lo guardado es de otra pestaña y más nuevo que lo último que esta leyó/escribió, no escribe y marca `state.stale = true` (también por el evento `storage`). Extras: `state.locked` (bloquea `save()`), `state.onStale` (callback para avisar), `state.takeOver()` (retoma y pisa). `importSave` guarda con `force`; `wipe` limpia `stale`. Tras `wipe` la clave no existe, así que `beforeunload` guarda la partida nueva sin conflicto.
- **Getter "te faltan X/s"**: `nightInfo()` ahora suma `rate` y `missing = max(0, goal - rate)`.
- **Eventos de bosque** (`forest.js`): `FOREST_EVENTS` (árbol caído, claro soleado, baúl, viajero, colmena, zorro ladrón) con `chance`, `text`, `loot {k:[min,max]}`, `fosforos`, `calorSecs`, `lootScale`, `dry`, `bad`. `rollForestEvent(state.data)` → evento o null (≈34% por viaje); `forestEventLoot(ev, mult)` → cantidades.
- **Logros** (`achievements.js`): 19 logros con `when(data)` y `reward {calor|fuel|loot|orbs|discount|ash: fracción}`; `rewardLabel(a)` → "+1% calor". Se guardan en `meta.achievements` (sobreviven al prestigio). `state.checkAchievements()` devuelve los nuevos y recalcula `mods` (`state.ach` tiene los bonos sumados; entran en `cosecha`, `fuel`, `orbs`, `loot`, `discount`, `ashBonus`).
- **Stats de por vida** nuevos en `meta.stats = {orbs, forestEvents, maxRate}`: los incrementa la escena (ver fase B). `meta.totalDawns` y `meta.prestiges` ya existían.

## Balance (modelo real)
Del código: calor/s por pozo = `min(1.4, heat/3.5) × 2 × (1+0.5·tamaño)` × mods; `heat` ≈ suma de `heatOut` de los leños (rama ~0,95, seca ~1,6, tronco ~1,5 a pleno) + 0,5×lecho.

| Fuego (1 pozo, sin mejoras) | intensidad | calor/s tamaño 0 | tamaño 1 + calor ×1.45 | 2 pozos así |
|---|---|---|---|---|
| 1 rama | 0,27 | 0,5 | 1,2 | 2,4 |
| 1 seca | 0,46 | 0,9 | 2,0 | 4,0 |
| seca + tronco | 0,89 | 1,8 | 3,9 | 7,7 |
| 2 seca + tronco | 1,34 | 2,7 | 5,8 | 11,7 |
(tope por pozo: 2,8 × multiplicador de tamaño)

- **Meta noche 1: 4 → 2,5** (×1.25 por noche: 2,5 / 3,1 / 3,9 / 4,9 / 6,1 / 7,6). Se alcanza con seca+tronco en un pozo o 1 seca en un pozo agrandado con cartas; una rama sola (0,4–1,3/s) no alcanza y el frío sube, pero perder lleva ~70–140 s según el déficit.
- **Día 4 → 5 min** (`DAY = 300`) y `FIRST_DAY_LEFT = 240`: la primera noche llega ~4 min después de los 2500. **Fase B**: `applyUnlock('noches')` debe usar `FIRST_DAY_LEFT` en vez de `DAY - 90`.
- **Niveles** (acumulado): L2 260, L3 520, L4 850, L5 1250, L6 1650, L7 2008 (igual que antes desde el 7: 3254, 5271, 8539…). Entre 120 y 450 ahora hay 1 nivel en vez de 3.
- **Prestigio**: ceniza = floor((3·√(calor/1000) + amaneceres) × ashBonus). 2500 y 1 amanecer → 5 (vs 3 de un amanecer); 6000 y 2 → 9; 15000 y 3 → 14; 50000 y 5 → 27. Un amanecer da 2+n (3,4,5…), así prestigiar después de 2–3 amaneceres vale 2–3 amaneceres.

## Para la fase B en GameScene (lo haré cuando me avises)
1. **B2**: Cenizas visible si `unlocked.noches || meta.totalDawns >= 1 || meta.prestiges >= 1` (en `applyUnlock`/`create`; revisar con UI qué id usa `ui.reveal`).
2. **Bosque**: en `updateTripAndHelpers` (solo viaje propio) `rollForestEvent` → aplicar `forestEventLoot`, `lootScale`, `dry` (sin mojar), `calorSecs` (× `this.rate`); `ui.toast(ev.text)` + `events.emit('forest:event', ev)` para que dopamina ponga sonido; `meta.stats.forestEvents++`.
3. **Logros**: `state.checkAchievements()` en `checkProgress`; por cada uno `ui.toast('🏆 name · rewardLabel')` y `events.emit('achievement', a)`. Stats: `meta.stats.orbs++` en `collectOrbsNear` (coordinar con dopamina, que toca esa función), `maxRate = max(maxRate, rate)`.
4. **Noches**: `FIRST_DAY_LEFT`; `ui.update.night` ya trae `missing`/`rate`; los resúmenes usan `ashSummary()`.
5. **Guardado**: `state.onStale` → toast "Otra pestaña guardó esta partida; esta no guarda" con acción `takeOver`; el handler del botón lo agrega UI.

---

# Ciclo 2 — Fase B (progresión, GameScene)

`node --check` OK en GameScene y GameState. Sin probar en navegador.

## Integrado
- **B2**: `revealAshes()` (Cenizas visible si `meta.totalDawns>=1 || meta.prestiges>=1`); se llama en `create`, en `applyUnlock('noches')` y al amanecer.
- **Primera tarde**: `applyUnlock('noches')` usa `DAY - FIRST_DAY_LEFT` (240 s de margen).
- **B6**: ambos resúmenes (`dawn` y `prestige`) llevan `...state.ashSummary()` → `ashAvail` (saldo) y `ashTotal` (= `meta.totalAsh`, de por vida). La UI puede mostrar "disponibles" con `ashAvail`.
- **Eventos de bosque**: solo en el viaje propio. `finishTrip()` → `rollForestEvent` → `rollLoot(1, dry)` (`dry` evita mojar) → `applyForestEvent` (lootScale, loot extra, fósforos, `calorSecs × rate`, mín. 5). Llama `audio.forestEvent?.(kind)` (`zorro`→'animal', `viajero`→'viajero', resto 'hallazgo'), `ui.forestEvent?.({icon,title,text})` (sin choices) y emite `forest:event` (payload = el evento). `meta.stats.forestEvents++`.
- **Logros**: `checkProgress` llama `state.checkAchievements()`; por cada uno `ui.achievement?.({icon,name,desc:'desc · +1% calor'})`, `audio.achievement?.()`, `fire.flare(1.2)` si hay fx, y emite `achievement` (payload = el logro). Handler nuevo `achievements()` en `bindUi` para el menú: `[{icon,name,desc,done}]`. Stats: `meta.stats.orbs++` en `collectOrbsNear` (una línea) y `maxRate` en `update`.
- **Fogata pico**: `fire.onPeak = ({pit}) => this.peakBonus(pit)`. `peakBonus(pit)`: `gainCalor(rate × mods.peakSecs)` (`peakSecs = 20` en `recompute`), texto flotante, toast, flash/shake con `fx`, y emite `peak {pit, bonus}`. Fire ya hace el rugido (`peakMoment`) antes de llamar a `onPeak`.
- **Falta X/s**: `ui.update.night` ya trae `missing` y `rate` (de `nightInfo()`); la UI lo lee como `night.missing`.
- **bindUi** (único toque a handlers existentes): `volume` ahora desmutea si `v>0`, persiste `muted=false` y **devuelve `audio.muted`** (lo que B5 de UI necesitaba). También `state.onStale` avisa con un toast; falta que UI ofrezca `state.takeOver()` si se quiere.

## Hooks para dopamina
- Evento `peak {pit, bonus}`, `forest:event`, `achievement`: para más juice sin tocar la lógica.
- Si quieren otro bonus de pico, cambiar `mods.peakSecs` en `GameState.recompute` (hoy fijo en 20) o llamar `this.peakBonus(pit)`.

## Pendiente
- Nadie usa todavía `ev.choices` (los eventos son avisos). Si se quiere elegir, extender `forest.js` y `applyForestEvent` con `ui.forestEvent({choices}, onChoose)`.
- Balance de noches/prestigio sin jugar: la tabla del modelo está en la Fase A; conviene que el tester mida la noche 1 real.

---

# Ciclo 3 — Progresión (datos + GameState; GameScene sin tocar)

`node --check` OK. Simulado en Node (`stepNight` con perfiles de calor/s oscilantes), sin navegador.

## 1. Tensión de noches (la 1 queda igual, es el tutorial)
Desde la noche 2:
- **Metas**: 3,1 / 3,9 / 5,0 / 6,3 / 8,0 (antes 3,1 / 3,9 / 4,9 / 6,1 / 7,6): casi igual; el riesgo viene de la dinámica, no de pedir mucho más.
- **Frío que acelera con el déficit sostenido**: tras 60 s seguidos bajo la meta el frío sube hasta el doble de rápido (`night.deficitT`). Recuperar tarda 60 s en vez de 45.
- **Ráfaga helada**: cada 80–150 s dura 20 s y la meta pide +15%. Evento `{type:'gust', dur}` de `stepNight` (la escena hoy lo ignora) y `nightInfo().gust` (bool) para UI/dopamina; **fase de integración pendiente**: emitir `night:gust` desde `updateNight` y avisar con toast/sonido.
- `nightGoalNow(night, mods)` (nuevo, en nights.js) es la meta con ráfaga; `nightInfo().goal/missing` ya la usan. GameScene sigue usando `nightGoal` (sin ráfaga) para el toast del atardecer: correcto.

| Perfil del jugador (media × meta vieja, ±70%) | Noche 2–5 antes (frío máx) | Ahora |
|---|---|---|
| 1,3× (muy atento) | 0,34 | 0,53–0,62 |
| 1,2× | 0,47 | 0,76–0,87 |
| 1,1× | 0,63 | falla ~220–230 s (de 480) |
| 0,9× (descuidado) | 0,99 | falla ~195 s |
Noche 1 sin cambios (0,99 con 0,9×; 0,58 con 1,1×). Antes, un jugador ~10% sobre la meta no corría riesgo; ahora necesita ~20% de margen y atender. Si resulta duro, bajar `GUST_BOOST` o `DEFICIT_RAMP` (constantes arriba de nights.js).

## 2. Dependencia de chispazos
Los chispazos eran ~1/3 del calor. Bajé el peso apenas: `mods.base = 1.15` (el fuego rinde +15%, entra en `rateBreakdown` como "Fuego") y la probabilidad de chispazos ×0,85 (`orbs` arranca en 0,85). Con 2/3 de fuego y 1/3 de chispazos: sin juntarlos pasás de 0,67 a 0,77 del total (+15%); juntándolos todos, 1,00 → 1,05. La ventaja de juntar baja de 1,50× a 1,36×. Es un cambio chico a propósito. El fuego +15% también alivia las noches (ya contemplado en la simulación con ×1,05).

## 3. Prestigio en todo el rango
Fórmula nueva: `2,5·(calor/1000)^0,6 + 0,5·amaneceres` (× bonos).
| Calor / amaneceres | Antes | Ahora | Un amanecer da |
|---|---|---|---|
| 2.500 / 1 | 5 | 4 | 3 |
| 6.000 / 2 | 9 | 8 | 3–4 |
| 15.000 / 3 | 14 | 14 | 3–5 |
| 50.000 / 5 | 26 | 28 | 3–7 |
| 200.000 / 8 | 50 | 64 | 3–10 |
A calor bajo ya no es tan tentador (prestigiar a 2.500 vale poco más que un amanecer y cuesta toda la partida); a calor alto sube más rápido, así el prestigio tardío recompensa. Para la UI: `state.ashGain()` da el valor en vivo (el tester pidió mostrar "Prestigio recomendado: +N").

---

# Cierre — noche 2 como puerta

`nights.js` (node --check OK; simulado en Node con rate = meta × (f + 0,5·sen(t/40))).

| | Antes (Ciclo 3) | Ahora |
|---|---|---|
| Metas noches 1–5 | 2,5 / 3,1 / 3,9 / 5,0 / 6,3 | 2,5 / **2,3** / 3,0 / 3,9 / 5,1 |
| Ráfagas heladas | desde la noche 2 | desde la **3** |
| Aceleración del frío (60 s en déficit) | ×2 desde la 2 | **×1,5 en la 2**, ×2 desde la 3 |
| Recuperación con meta cumplida | 60 s desde la 2 | **52 s en la 2**, 60 s desde la 3 |

Noche 2 (meta 2,3): media 1,2× (2,8/s) → frío máx 0,35; 1,1× (2,5/s) → 0,56; 1,0× (2,3/s) → 0,81; 0,8× (1,8/s) → falla ~210 s; el bot del tester (1,5/s = 0,65×) falla ~190 s. Un pozo bien atendido (2,5–2,8/s, 110–120%) pasa con holgura; descuidar sigue costando. Noches 3–4: 1,1× pasa (0,76–0,79), 1,0× falla ~228 s. Nota: la meta de la noche 2 (2,3) queda bajo la de la 1 (2,5) a propósito; si molesta, bajar `BASE_GOAL` o subir `GOAL_2` a 2,5.

---

# C4-A — Tamaños, cartas y Cenizas (progresión)

`node --check` OK en shop/cards/meta/sizes/GameState. Probado en Node con un guardado v2 (pozos 3 y 1): migración, precios, bloqueos, mods y `rateBreakdown`. Sin navegador. No toqué GameScene/Pit/Fire.

## Hecho
- **sizes.js** (solo agregué exports, sin cambiar nombres): `SIZE_AT` (calor total en que llega cada tamaño: 0/500/1.500/4.000/10.000/25.000/60.000/150.000) y `canFit(sizes)` → `{ok, used, budget, reason}` con `footprint` y `GROUND_BUDGET`. Números de la tabla sin cambios (no hubo razón para tocarlos: ver simulación pendiente en fase 2).
- **shop.js**: `agrandar_i` con `max = 7`, nombre dinámico ("Agrandar a Hoguera · fogata 2"), costo de `SIZES[n+1].cost` × (1 + 0,8·i) con `enlarge: true`, `effect(n)` = `{label:'Hogar → Hoguera', before:'8.8 troncos · aire ×1.15 · calor ×2.4', after:'11.7 troncos · aire ×1.20 · calor ×3'}`, aparece al 70% de `SIZE_AT`. Techo escalado: `220·(1+1,5i)·(1+0,9·size)` calor y `3+size` troncos. Campo nuevo `blocked()` en `agrandar_*` y `fogata_*`: devuelve el motivo (string de `canFit`) o `null`.
- **GameState.js**: `version = 3`; `migrate` acota `size` a 0–7 y sincroniza `bought.agrandar_i = size` (los pozos 0–3 quedan idénticos). `price()` aplica `mods.enlargeCost` si el costo trae `enlarge`. `applyRunStart` aplica Hogar heredado. `rateBreakdown(pits, burning, detail, structure = [])`: `structure[i]` = bonus de calor del pozo i (0…0,2, ya con la calidad) × `mods.structureBonus`, con tope `min(0,35; 0,20 × structureBonus)`; suma el renglón "Estructura".
- **Mods nuevos en `recompute`**: `enlargeCost`, `structureBonus`, `fillThreshold` (0,5 − 0,15·Fogonero), `startSize`.
- **Cartas**: Cantera (común, max 3, −10% agrandar), Chimenea (rara, max 3, +50% estructura), Fogonero (épica, max 2, relleno pleno a 35% / 20%; requiere un pozo ≥ tamaño 2).
- **Cenizas** (11 mejoras ahora): Hogar heredado (max 3, pozo inicial Fogata/Fogón/Hogar, costo 8×2,2ⁿ), Arquitecto (max 3, +15% estructura, 6×1,8ⁿ), Cantera eterna (max 5, −5% agrandar, 4×1,5ⁿ).

## Para la fase 2 (GameScene, mi turno)
- `buy('agrandar_i')`: comprobar `it.blocked?.()` y, si hay motivo, toast y no cobrar; reubicar con `layoutPits()` y `emit('pit:grow', {pit, size})`.
- `shopItems()`: pasar `blocked` (string|null) a la UI para mostrar el motivo.
- Pasar `structure` a `rateBreakdown`: `this.pitObjs.map(p => (STRUCTURE[p.structure?.type]?.calor || 0) * (p.structure?.stable ? p.structure.quality : 0))`.
- Física debe leer `mods.fillThreshold` (en vez de 0,5 fijo) para el relleno y `mods.startSize` ya lo aplica `applyRunStart`.
- Re-simular noches con `hs` y relleno; si el rendimiento baja ~10–15% en S1–S3, compensar `mods.base` (1,15) o `mult` de la tabla.

---

# C4-A fase 2 (progresión, GameScene)

`node --check` OK (GameScene, GameState, Pit, data). Verificado en 127.0.0.1:8080 (hay que recargar tras cada cambio: los módulos se cachean): carga sin errores, `version 3`, la tienda ofrece "Agrandar a Hoguera" con antes→después, `buy('agrandar_0')` sube el pozo a tamaño 4 y `layoutPits` lo reubica. (Esa partida de prueba quedó modificada: +9000 calor, +30 troncos.)

## Revisado / integrado
- Ya estaba hecho por física/UI y lo revisé: `shopItems` pasa `blocked`, `buy` lo respeta y llama `layoutPits()`, `pit:grow` lo emite `Pit.setSize`, `rateBreakdown` recibe `pitObjs.map(p => p.structureBonus)`, `enlargeCost` entra por `state.price` (cost.enlarge), `structureBonus` por `rateBreakdown`.
- **Cambio en Pit.js (único, para balance)**: `calorMult` usa `mods.fillThreshold` (fallback 0,4) en vez de 0,5 fijo.
- **startSize / Hogar heredado**: `wipe({keepMeta})` → `applyRunStart` fija `pits[0].size` y `bought.agrandar_0` antes del `scene.restart`, y `create` construye el pozo con ese tamaño. No hizo falta tocar GameScene.

## Re-simulación (calor/s con `base` 1,15, intensidad `min(1,4; heat/3,5)`)
Dilución por relleno con la capacidad de 26.000 (antes/ahora = diseño viejo sin dilución / fórmulas nuevas ya ajustadas).

| Leña en el pozo | S0 | S1 | S2 | S3 |
|---|---|---|---|---|
| 4 ramas | 2,5 → 2,5 | 3,7 → 3,0 | 5,0 → 3,3 | 6,2 → 3,4 |
| 1 seca + 1 tronco | 2,0 → 2,0 | 3,1 → 2,8 | 4,1 → 3,1 | 5,1 → 3,4 |
| 2 secas + 1 tronco | 3,1 → 3,1 | 4,6 → 4,6 | 6,2 → 5,3 | 7,7 → 5,7 |
| 2 secas + 2 troncos | 3,2 → 3,2 | 4,8 → 4,8 | 6,4 → 6,4 | 8,0 → 7,4 |

Sin ajuste, las cargas flacas en S1–S3 perdían 25–40%. Ajustes: `mult` S1 1,4→**1,5**, S2 1,85→**2,0**, S3 2,4→**2,6** (sizes.js) y umbral de relleno 0,5→**0,4** (`fillThreshold`, Fogonero ahora 0,28/0,16; la carta lo muestra). Resultado: una carga mediana (2 secas + tronco) no pierde nada en S1 y ~15% en S2–S3; una carga flaca pierde 10–45% (el trade-off buscado: un pozo grande a medio llenar rinde como uno chico).
- **Ritmo hasta 2500**: S0 sin cambios (misma fórmula) y los S1/S2 con carga mediana rinden ≥ 4,6/s ⇒ sin cambio relevante en el tiempo hasta los hitos; 1 seca+1 tronco en S1–S2 rinde 2,8–3,1 (antes 3,1–4,1), unos minutos más lento si el jugador carga poco.
- **Noches 1–3 (metas 2,5 / 2,3 / 3,0)**: carga mediana en S1–S3 da 4,6–5,7 (≥150% de la meta) y la carga mínima (1 seca + 1 tronco) 2,8–3,4 (≥ 110% de la 1 y la 2; justo en la 3). No toqué `nights.js`. La noche 4 (3,9) ya pide carga mediana o estructura.

## Pendiente
- Medir en juego una noche real con pozo grande y poca leña. Si el tester la ve dura, bajar `fillThreshold` a 0,35.
- Las piedras de los tamaños 6–7 invaden la huella vecina (cosmético, ya anotado por física).

## C4-B fase 2 — rebalanceo con las caps de física

Caps nuevas (1.0, 1.2, 1.45, 1.8, 2.1, 2.5, 3.0, 3.4) las dejé tal cual; no toqué geometría. Problema: con las caps más bajas, subir de Hogar a Hoguera daba solo +15% de calor por 7000 de costo. Subí `mult` de S4–S7 (3.0→3.4, 3.7→4.2, 4.5→5.2, 5.5→6.5) para que cada paso rinda ~+25–30% y la eficiencia por leña (mult/cap) crezca 1.0 → 1.9. S0–S3 sin cambios (noches 1–3 intactas: metas 2.5/2.3/3.0, cargas medianas ≥150%). Costos y `SIZE_AT` sin cambios (tiempos estimados por tramo ~220 s, 250, 430, 730, 1300, 2600, 5000 s).

Calor/s estimado (calor de leña 1.15 base, sin cartas). ligera = 13000 de área (~4 ramas+1 seca), media = 21200 (2 secas+2 troncos), llena = pozo >40% de relleno con fuego fuerte.

| Tamaño | cap | huella | mult antes→después | ligera | media | llena | calor/s por 100 px de huella (llena) |
|---|---|---|---|---|---|---|---|
| 0 Fogatita | 1.0 | 240 | 1.0 | 2.3 | 3.2 | 3.2 | 1.34 |
| 1 Fogata | 1.2 | 260 | 1.5 | 3.4 | 4.8 | 4.8 | 1.86 |
| 2 Fogón | 1.45 | 284 | 2.0 | 4.3 | 6.4 | 6.4 | 2.27 |
| 3 Hogar | 1.8 | 312 | 2.6 | 4.9 | 8.4 | 8.4 | 2.68 |
| 4 Hoguera | 2.1 | 344 | 3.0→3.4 | 5.0→5.6 | 9.5→10.7 | 9.7→10.9 | 3.18 |
| 5 Pira | 2.5 | 380 | 3.7→4.2 | 5.4→6.0 | 10.3→11.6 | 11.9→13.5 | 3.56 |
| 6 Faro | 3.0 | 420 | 4.5→5.2 | 5.7→6.3 | 10.9→12.4 | 14.5→16.7 | 3.99 |
| 7 Ceremonial | 3.4 | 470 | 5.5→6.5 | 6.1→7.0 | 11.9→13.8 | 17.7→20.9 | 4.45 |

Trade-off vivo: un pozo grande con carga ligera rinde mucho menos que lleno (S7: 7 vs 21), pide más leña y tarda más en encender; varios chicos rinden poco por huella pero ahorran leña y se llenan fácil. Con el terreno (1000 px), 4 S0 = 12.8/s contra 2 S4 = 21.8/s o 1 S7 + 1 S3 = 29/s si hay leña para llenarlos.

Pendiente: probar en navegador una noche real con S5+ y poca leña (si resulta dura, `fillThreshold` 0.35). Solo cambié `js/data/sizes.js` (`node --check` OK).

## C4-C — ranuras magnéticas y estructuras

- **Tienda:** la descripción de "Agrandar a X" agrega qué desbloquea: Hogar → "ya entra una cabaña de ramas", Pira → "cabaña de troncos" (`STRUCT_UNLOCK` en shop.js).
- **Balance:** con calidad instantánea, el bonus base ya no es gradual: tipi 0,65×0,10 = +6,5% (0,9 → +9%), cabaña 0,8×0,15 = +12% (máx. +15%). Dentro del tope +20% de Fire.js, eso es razonable y no se rompe: la cabaña requiere pozo Hogar+ y ramas/troncos. El riesgo está en las cartas: Chimenea ×3 (×2,5) y Arquitecto ×3 (×1,45) multiplican hasta ×3,6 y el tope de GameState (`min(0.35, 0.2·mult)`) deja pasar hasta +35%, que con calidad gratis llega sin esfuerzo.
- **Propuesta (no aplicada: GameState.js no estaba en este turno):** bajar el tope duro de `rateBreakdown` de 0,35 a 0,30 y/o contar Arquitecto como +10% por nivel en vez de +15%. Con tope 0,30 la cabaña base (+12%) llega al máximo con ×2,5 (Chimenea 3 solo), así que Arquitecto sería el extra. Dejé cartas y meta sin cambios.

## C5 fase 1 — la madera pesa, meseta, nextGoal

Archivos tocados: `data/woods.js`, `sizes.js`, `shop.js`, `meta.js`, `nights.js`, `achievements.js`, `state/GameState.js` (`node --check` OK; navegador 127.0.0.1:8080 sin errores, version 3, guardado intacto).

**1. Madera.** Leí Fire.js: el calor de un pozo es `min(1.4·(1+0,3·(hs−1)), Σ heatOut/3,5)`, así que la punta se satura igual con 5 ramas que con 2 secas+tronco; lo que cambia es cuánto dura. Cambié `heat`: rama 0,95→0,8, húmeda 0,95→0,8, seca 1,6→1,9, tronco 1,5→2,4 (piña igual). Medido en juego (Fogatita, un fósforo, total calor / duración / calor por s):

| Mezcla | Antes | Después |
|---|---|---|
| 5 ramas | 25 / 13 s / 1,9 | 24 / 13 s / 1,8 |
| 2 secas + 1 tronco | 120–182 / 105 s / 1,2–1,7 | 152–216 / 102 s / 1,5–2,1 |
| 2 secas + 2 troncos | 173–237 / 96 s / 1,8–2,5 | 203–271 / 97 s / 2,1–2,8 |
| 3 secas | 76–140 / 38 s | 80–149 / 38 s |
Resultado: una pieza buena rinde ~8× la de rama (antes ~6×) y el ritmo sostenido sube 20–25%. No cambié `fuel` ni Fire.js. Aviso: la saturación incluye `hs` (el pozo grande satura más alto), así que S3+ rinden algo más que mi tabla C4-B (S3 lleno ≈ 9,9/s, S7 ≈ 30/s); no rompe las noches 1–3 (S0 no cambia).

**2. Meseta (H4).** El cuello era el tronco: agrandar pedía 2,4,6… troncos y nadie lo avisaba. Troncos de agrandar a la mitad (1,2,3,5,8,12,18), 2.ª fogata 6→4 troncos, tercera 12→8; los tamaños se ofrecen desde el 55 % de `SIZE_AT` (antes 70 %). `nextGoal` dice qué falta y dónde conseguirlo.

**3. `state.nextGoal(ctx)`** → `{icon, text, progress}` o null. Orden: Agrandar → Hacha → Canasta → Nueva fogata → Techo → Leñera → Botas → Ayudante → Secadero…; si no hay nada, el próximo hito (viento 1.600, noches 2.500, tormentas 4.500). Ej.: "Agrandar a Fogata: te faltan 220 🔥 y 1 🪵, el Mercachifle los vende." Con `ctx.rain > 0.3` y un pozo ≥ 3 sin techo avisa: "Llueve: en un pozo grande el fósforo no alcanza. Con techo o con piñas prende." **`state.projectRate(size, load)`**: calor/s estimado con mezcla seca+tronco (load = fracción de la capacidad). Ej. con cartas base: S0 0,15→0,9 / 0,4→2,4; S3 0,4→9,9; S5 17,6; S7 29,7.

**4. H5.** Fósforos y piñas no se ofrecen si tenés ≥6 / ≥8; consumibles con precio topado en ×3 (**H6**: Atado de ramas 10→30, no 81); Atado da 8 ramas (antes 6).

**5. Noches.** Metas sin cambio (2,5 / 2,3 / 3,0 …). Nuevo: `nightInfo().margin` (= rate/meta − 1) y el evento `dawn` trae `margin` (ritmo medio de la noche sobre la meta); `dawnAsh(n, mods, margin)` suma +50 % de ceniza por cada 100 % de margen (tope 150 %). Noche 1 con 5,2/s ≈ margen 108 % → 3 → 5 cenizas.

**6. Arquitecto** +10 % por nivel. Logro "Buen armado" (calidad ≥0,9, +1 % calor) usa `meta.stats.structure90`.

### Ritmo (ESTIMADO, no pude correr el bot): base del tester → con los cambios
Supuesto: el jugador compra Agrandar a la 1.ª Fogata ~4:00 (nextGoal lo guía y pide 1 tronco), el Fogón ~8:00, ritmo 5,2/s y luego ≈6,9/s.
| Hito | Antes | Después (est.) |
|---|---|---|
| 500 | 2:05 | 2:05 |
| 1.500 | 6:44 | ~6:00 |
| 2.500 | 11:31 | ~9:20 |
| 4.500 | 17:22 | ~14:00 |
| Noches 1–3 (2,5/2,3/3,0) | holgadas (5,2/s) | iguales; el sobrante ahora da ceniza |
El tester debe re-medir; si 2.500 cae antes de 9 min, subir el hito.

### Para la fase 2 (escena/tienda/UI), lista exacta
1. `GameScene` amanecer (~l.1189): `dawnAsh(n, this.state.mods, ev.margin)` y mostrar el margen en el resumen.
2. En `structure:formed`/estructura estable: `state.noteStructure(type, quality)`.
3. HUD: `handlers.nextGoal = () => state.nextGoal({ rain: this.weather.rain })`, refrescar ~1 vez/s.
4. `shopItems()`: en Agrandar y Nueva fogata agregar "con tu leña: X → Y/s" con `state.projectRate(size, load real del pozo)`.
5. `rollLoot` (~l.857): ramas `(4 + r()*4)`; piñas solo si `res.pina < 8`; fósforos solo si `res.fosforo < 6` (si no, 0,05); húmeda baja la fracción mojada a 0,5.
6. Gust `night:gust` sigue sin emitirse (pendiente viejo).

## C5 fase 2 — escena conectada y ritmo MEDIDO

**Conectado en `GameScene.js`** (nextGoal ya lo había cableado UI; no lo dupliqué): `dawnAsh(n, mods, ev.margin)` + `margin` en el resumen (`Ui.describeSummary` agrega "Margen sobre la meta +X %", una línea); `state.noteStructure(type, quality)` en `structure:formed`; `shopItems()` pasa `effects` en Agrandar (capacidad, aire, calor y "Con tu leña: X → Y/s" con `projectRate` y la carga real del pozo; se oculta si el pozo está vacío); `rollLoot`: ramas 4–8 por viaje, piñas solo con < 8, fósforos 0,03 con ≥ 6, húmeda por lluvia ×0,5. `node --check` OK en data, GameState, GameScene, Ui; 0 errores de consola.

**Bot**: `.claude/equipo/bot-ritmo.js` (pegar en la consola con una partida nueva en 127.0.0.1:8080; `await botRitmo.run(600)` en tandas; `botRitmo.policy = 'goal'` sigue el orden de nextGoal). Persona del tester: 1 leña cada 3 s (seca → troncos de sobra > 8 → ramas), bosque cuando no tiene ramas o leña buena, compra lo más barato que no sea consumible, 1.ª carta, sin chispazos. Mismo bot en el código de antes (commit inicial) y el actual, 2.400 s simulados.

| Hito | Antes (bot) | Después (bot) |
|---|---|---|
| 500 | 2:13 | 1:49 |
| 1.500 | 5:54 | 5:36 |
| 2.500 | 8:09 | 8:09 |
| 4.500 | 12:37 | 13:30 |
| 10.000 | 22:34 | 24:13 |
| ritmo a los 20 / 40 min | 7,4 / 10,4 | 8,1 / 11,9 |
| Noche 1 (t, meta, margen) | 20:38, 2,5, sin medir | 20:38, **4,0, +67 %** |
| Noche 2 | 34:08, 2,3 | 34:08, **4,4, +98 %** |

Compras (después): fuelle 0:58, hacha 1:13, canasta 1:43, botas 1:49, techo 3:37, **Agrandar 1 a 5:09** (antes 5:20), leñera 6:44, secadero 9:19, **2.ª fogata 13:05**, Agrandar 2.ª fogata 14:06, Fogón 16:23, ayudante 21:34, 3.ª fogata 41:26. Hueco máximo entre compras: ≤ 2:15 hasta el minuto 20, de 2:20 a 2:50 entre 20 y 29 min, y **de 3 a 3,5 min después** (ritmo de la persona clavado en 8–12/s con ramas, costos 2.000–3.500).

**Cambios para llegar ahí**: ramas 0,9 (0,8 hundía el arranque: 500 a 2:51); `mods.base` 1,15→1,1; ayudante 1.100×1,5ⁿ, secadero 600×1,7ⁿ, 2.ª pozo ×1,5 (antes ×1,8), tamaños 3/4/5 a 2.000/5.500/14.000, 2.ª fogata 900 y 3.ª 3.500; **metas de noche 1/2 = 4,0/4,4** (antes 2,5/2,3; noche 3 = 5,7) porque a esa hora el pozo ya rinde 6–8/s; un descuido de ~2 min (fuego muerto o solo ramas en un pozo chico) hace perder la noche 1; quien juega razonable pasa con margen 60–100 %.

**Límites**: el bot nunca usa chispazos ni mezcla buena a propósito, así que 2.500 a 8:09 es el piso; una persona real va entre 9 y 14 min (tester: 10–18). Los huecos tardíos (> 29 min) siguen > 2 min: la salida es que el jugador use seca/tronco (más ritmo) o bajar más los costos tardíos; no lo toqué para no abaratar el final. La partida del navegador de pruebas quedó con el guardado automático del juego nuevo (654 caracteres), sin datos míos; `state.locked = true`.
