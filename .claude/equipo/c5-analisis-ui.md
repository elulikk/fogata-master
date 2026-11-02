# C5 — Análisis UI: primera sesión y legibilidad (solo lectura)

Estado hoy: una sola pista de arrastre (`currentHint`, GameScene:1572, "Arrastrá leña… " solo los primeros 25 s), una pista de encaje/rotación (`Ui.hintRotate`, flag `snapHint`), toasts de primera estructura (GameScene:666) y "Cómo armar" escondido en Créditos. Nada guía de "base" a "cabaña" a "tipi", ni explica qué mira el jugador para decidir.

## 1. Tutorial contextual por pasos (HACERLO PRIMERO) — esfuerzo M, riesgo medio
- **Cambia**: una cadena de 5 pistas cortas, una por vez, que avanza al lograr el paso (no por tiempo): arrastrar leña al pozo → soltar sobre una silueta (encaja) → prender (tocar) → "sumá un puente sobre dos bases: cabaña" → "inclinala ±60° y soltala al costado: tipi". Cada paso se marca visto y no vuelve.
- **Dónde**: `Ui.js`: nuevo `tutorial(step)` + `setHint(text, force)` (ya prioriza sobre otras pistas) y flags en `settings.seen` vía `handlers.settingSeen` (`tut1..tut5`). Los disparadores son eventos ya existentes en GameScene: `log:snap`, `structure:formed`, `log:rotate`, encendido; GameScene solo llama `ui.tutorial('snap')` etc. (dueño de GameScene: dopamina/física, 5–8 líneas).
- **Riesgo**: pisa `currentHint` (apagón, ahogado): esas urgentes deben ganar. Quien ya jugó no debe ver el tutorial: marcar los pasos como vistos si `totalCalor > 0` al cargar.

## 2. Resaltar el objetivo, no solo texto — S/M, riesgo bajo
- **Cambia**: en cada paso, un resplandor/flecha (pulso CSS) sobre el elemento relevante: la pila de leña en el paso 1, el botón 🔥 Fósforos, el botón 🔨 Construir/🌲 cuando se desbloquea. Sin esto el hint se lee pero no se sabe dónde mirar.
- **Dónde**: `style.css` (`.guide` con pulso, respeta `.reduce-motion`), `Ui.js` `guide(id|null)`. Las siluetas del mundo son de arte.
- **Riesgo**: bajo; solo clases.

## 3. Etiqueta del pozo que informa decisiones — S, riesgo bajo
- **Cambia**: hoy "Tamaño n/cap 🪵 · Tipi 80%". Falta qué aporta la estructura en calor y qué falta para la siguiente: sumar "+22 % calor" junto a la estructura y, al pasar el cursor/tocar, una línea "Para cabaña: 2 bases + puente". También ranuras ocupadas (idea abierta de C4-C).
- **Dónde**: `Ui.pitInfo` (`.t-st`, `.t-warn`); `GameScene.pitInfoList` debe pasar `bonus` (de `structure`) y `slotsUsed/slotsTotal` (GameScene, otra sesión).
- **Riesgo**: etiqueta más larga en móvil: usar `.compact` y mostrar el detalle solo al tocar.

## 4. Legibilidad del HUD: qué importa ahora — S, riesgo bajo
- **Cambia**: el calor/s (`#calor-rate`) es el número que decide todo y es pequeño. Subir contraste/tamaño, y mostrar el desglose (`rateInfo.parts`: fuego, pozos, estructura, cartas) con un toque o hover — ya existe el dato, falta que el jugador lo descubra (hoy sin affordance). Con la noche activa, `#night` ya compara ritmo vs meta; asegurar que no tape las etiquetas de pozo (revisar a 812×375).
- **Dónde**: `index.html #hud-calor`, `style.css`, `Ui.update` (rateInfo). Sin tocar escena.
- **Riesgo**: bajo; revisar apilado con `#topc`.

## 5. Ayuda siempre a mano y "no sé qué hacer" — S, riesgo bajo
- **Cambia**: botón "?" en el HUD / entrada "Cómo jugar" en la pausa que reabre la pista del paso actual y la guía de armado (hoy escondida en "Créditos"). Si el jugador pasa 40 s sin acción útil, el hint contextual dice la siguiente acción (después del 25 s inicial no hay nada).
- **Dónde**: `MainMenu.js` (pantalla `howto`, mover las 3 líneas), `Ui.js` botón/atajo `H`; el temporizador de inactividad vive en `currentHint` (GameScene) o en Ui con `update()` recibiendo `idle`.
- **Riesgo**: bajo. Toca GameScene solo si el temporizador va en la escena.

## Lo que falta para decidir (datos sin mostrar)
Cuánto rinde cada estructura vs montón (+22/+26 %), qué da agrandar el pozo contra sumar uno chico, y qué madera quema más/menos. La tienda ya muestra antes→después para tamaño; falta lo mismo para madera y estructura (alimentar `effects[]` desde progresión).

## Límites
Todo sin verificar táctil real (sigue pendiente el segundo dedo y el dock). El tutorial depende de eventos de física/dopamina que no controlo.

**Resumen (3 líneas)**
1. Primero: tutorial por pasos que avanza al lograr cada acción (arrastrar → encajar → prender → cabaña → tipi), más resalte pulsante del objetivo.
2. Después: etiqueta del pozo con bono y requisito de la próxima estructura, calor/s legible con desglose, y "Cómo jugar" accesible.
3. Requiere 5–8 líneas en GameScene (llamar a `ui.tutorial` y pasar `bonus/slots` a `pitInfoList`); el resto es Ui/CSS.
