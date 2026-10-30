# Ciclo 4: plan de la iteración A (acomodo, capacidad y tamaños)

Lo pidió el usuario: `C4-BRIEF.md`. Los análisis son `c4-analisis-*.md` y `c4-baseline-tester.md`.
Contrato compartido: **`js/data/sizes.js`** (lo creó el coordinador). Los números son de progresión; la geometría y la capacidad las lee física.

## Decisiones del coordinador
1. **Rotación**: torque sobre el cuerpo agarrado, sin `setAngle` (análisis de física §2).
   - Mouse: rueda (pasos de 15° interpolados), Q/E sostenidas (Shift = giro fino) y clic derecho (+45°).
   - Touch: dock ↺ ↻ de 44 px que aparece mientras arrastrás (lo hace UI), y además un segundo dedo (física).
   - Si el jugador no rota, el comportamiento es idéntico al actual.
   - API de escena para UI: `scene.rotateDrag(dir)` (dir = -1 | 0 | 1, continuo mientras ≠ 0) y `scene.rotateStep(deg)`.
2. **Contención**: paredes físicas bajas por pozo (`wallH` de sizes.js), además de las piedras. Leña desbordada:
   - Si `loadRatio > 1.15` al entrar, rebota hacia afuera y queda `l.overflow = true`.
   - Fuera de un pozo NO prende por calor de vecinos (solo con fósforo o pedernal). Si ya ardía y toca el suelo fuera de un pozo, se apaga a brasa y ceniza en ~1,5 s. Esto cierra B21.
   - Leña cruda quieta fuera de pozo y estante durante 6 s vuelve al estante con tween y `state.add`.
   - Al soltar sobre un pozo, se amortigua la velocidad del lanzamiento (H7).
3. **Capacidad**: `BASE_CAPACITY` pasa a 26000 (sizes.js). Capacidad = `BASE × SIZES[size].cap × mods.capacity × (1 + cabana.capacity·q si hay cabaña)`. La que se muestra y la física tienen que coincidir: el pozo se ve "lleno" cuando se ahoga.
4. **Estructuras**: detección pura en el nuevo `js/utils/structure.js`, que corre a 4 Hz, con estabilidad de 1,5 s y lerp de la calidad.
   - Se expone `pit.structure = {type: 'tipi'|'cabana'|'monton'|'ninguna', quality, stable, height}`.
   - Efectos en Fire según `STRUCTURE` de sizes.js, con tope de calor +20%.
   - Pozo en reposo con sleeping (`enableSleeping`) y fricción alta dentro del pozo.
   - Eventos de escena: `structure:formed {pit, type, quality}` (cuando quality cruza 0.6 estable) y `structure:lost {pit, type}`.
5. **Tamaños**: 8 (sizes.js). Ya no hay `PIT_SLOTS` fijos: hay un layout dinámico por huella dentro de `GROUND_BUDGET`, con la función `layoutPits()` en la escena. Si un pozo agrandado no entra, la tienda no ofrece agrandar (lo valida progresión con `canFit(sizes)`) y avisa por qué.
   - En Fire: escala de calor `hs`, dilución por relleno (`calorMult_efectivo = 1 + (mult−1)·clamp(carga/(0,5·cap), 0, 1)`), inercia (ignición ×(1+0,05·size), lecho ×(1+0,15·size)) y lluvia ×(1+0,1·size) sin techo.
   - Guardado `data.version = 3`; los tamaños 0–3 quedan idénticos y los `x` de los pozos no se guardan.
6. Eventos que mueve la escena para el feel: `log:rotate {dir}` (cada paso de ~12°), `log:rest {log, onLog}` (apoyo estable sobre otra leña), `log:overflow {log, pit}`, `log:returned {log}`, `pit:grow {pit, size}`.

## Iteración A, fase 1: en paralelo, cada uno con sus archivos
| Quién | Archivos exclusivos | Qué |
|---|---|---|
| **física** | `js/scenes/GameScene.js`, `js/objects/Pit.js`, `js/objects/Log.js`, `js/objects/Fire.js`, `js/main.js`, nuevo `js/utils/structure.js` | Decisiones 1–5 y los eventos de la 6 (solo el `emit`). Pit lee sizes.js. Hace el layout dinámico y aplica los efectos de estructura y tamaño en Fire. |
| **progresión** | `js/data/sizes.js` (ajustar números), `js/data/shop.js`, `js/data/cards.js`, `js/data/meta.js`, `js/state/GameState.js` | `agrandar` hasta 7 con costos de sizes.js y techo escalado; `canFit`; versión 3 con migración; mods de cartas y cenizas nuevas (Cantera, Chimenea, Fogonero, Hogar heredado, Arquitecto, Cantera eterna); "Estructura" en `rateBreakdown`. |
| **dopamina** | `js/audio/FireAudio.js` | Sonidos: `rotateTick()`, `woodTock(weight)`, `structureFormed(type)`, `overflowReject()`, `logReturn()`, `pitGrow(size)`. |
| **arte** | `js/gfx/textures.js` | Texturas por tamaño (piedras y labio por tier, barro, postes ceremoniales), sombra de contacto, contorno "ghost" del volumen y borde de carga. Claves nuevas documentadas. |
| **UI** | `js/ui/Ui.js`, `css/style.css`, `index.html` | Dock ↺ ↻ táctil (llama `handlers.rotate(dir)`); hint contextual de rotación, que aparece una sola vez y queda guardado en settings; `ui.pitInfo([{i, size, sizeName, load, cap, structure}])` (chip o etiqueta sobre cada pozo, en coordenadas de mundo que se pasan); presentación en la tienda de la escala de tamaños con un antes→después de capacidad, aire y calor. |

## Iteración A, fase 2: GameScene.js por turnos
1. **dopamina**: engancha los eventos de la decisión 6 con sonido y efectos (chispa en overflow, momento de estructura formada, crecimiento épico del pozo), en GameScene y Fire.js.
2. **arte**: dibujo de los pozos por tamaño en `Pit.js` (tier visual, ghost y borde de carga) usando sus texturas.
3. **UI**: `bindUi` (rotate, pitInfo cada 0,3 s), la conexión del dock y el hint.
4. **progresión**: `buy` de agrandar (reubicar con `layoutPits`, `pit:grow`), la tienda con `canFit`, y la re-simulación de noches con las fórmulas nuevas.

Después: **tester**, con las métricas de `c4-baseline-tester.md` §8, y **arreglos** (Haiku o el dueño). Luego la iteración B.

## Reglas
`node --check` en todo JS. Probar en http://127.0.0.1:8080/ (nunca localhost). No romper partidas guardadas. Cada uno agrega su sección "C4-A" a su informe (`informe-<area>.md`; física usa `informe-fisica.md`) y termina con un resumen de 3 líneas.
