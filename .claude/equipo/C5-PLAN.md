# Ciclo 5: plan de la iteración 1

Objetivo y reglas: `C5-BRIEF.md`. Insumos: `c5-test-base.md` (bugs H1–H11, capturas en `capturas-c5/`) y `c5-analisis-*.md`.

## Decisiones del coordinador

1. **El fuego va primero.** Es la pieza central y hoy es una mancha: llama con forma, luz que alumbra el mundo y leña que no se lava a naranja plano.
2. **Ciclo de luz (H1).**
   - Antes de que se abran las noches: **atardecer permanente** (violeta y naranja bajo, el fuego luce). Ya no dice "Noche despejada".
   - Con las noches abiertas: día claro y cálido, atardecer, **noche profunda, más oscura que todo lo visto hasta ahí** y amanecer. Así la primera noche se siente como un acontecimiento. Las transiciones son graduales.
   - El clima se nombra sin la palabra "noche" salvo que sea de noche.
3. **Un solo mensaje a la vez en el mundo (H2).** Todo texto flotante de avisos pasa por una cola con prioridad y vida corta. Los números de calor o chispazo no cuentan: siguen flotando.
4. **Enseñar haciendo.** Tutorial por pasos que avanza al lograr la acción: arrastrar → encajar → prender → tipi; la cabaña se enseña recién cuando el pozo la permite (tamaño ≥ 3). Las urgencias (apagón, ahogado) ganan. Quien ya tiene progreso no lo ve.
5. **Prender una estructura es EL momento.** La llama recorre las patas o las bases y el bloque de sonido la acompaña. Después, el juego muestra lo que rinde.
6. **La madera tiene que importar** y la meseta de 6:44–10:41 (H4) se tiene que ir. El juego dice cuál es el próximo objetivo y qué falta.
7. **Táctil**: nadie puede probarlo en un dispositivo real. Quien toque gestos lo deja dicho en su informe. No se agregan gestos nuevos en esta iteración (se descarta doble clic y arrastre hacia arriba).

## Contratos entre equipos

| Quién lo define | Qué | Quién lo usa |
|---|---|---|
| Progresión | `state.nextGoal()` → `{ icon, text, progress (0..1 o null) } \| null` | UI: lo muestra. Se conecta en el turno de UI (`handlers.nextGoal`). |
| Progresión | `state.projectRate(size, load)` → calor/s estimado | Tienda (`effects` de agrandar y nueva fogata). |
| UI | `ui.tutorial(event)` con eventos `'grab'`, `'drop'`, `'snap'`, `'ignite'`, `'rotate'`, `'structure:tipi'`, `'structure:cabana'`, `'pit:grow'` | Escena: se conecta en el turno de UI. |
| UI | `ui.guide(id \| null)`: pulso sobre un elemento | UI. |
| Dopamina | `audio.firstTime(n)`, `audio.ignite(kind)`, `audio.duck(on)`, `audio.drag(speed)`, `audio.collapse()` | Escena: se conecta en el turno de dopamina. |
| Arte | Texturas documentadas en `informe-arte.md` | Arte, en su turno de escena. |
| Física | `js/scenes/SlotController.js` (`scene.slotsCtl`) | Arte, dopamina y UI, si tocan ranuras. |

## Fase 1: en paralelo, cada uno con sus archivos

| Quién | Archivos exclusivos | Qué |
|---|---|---|
| **física** | `js/scenes/GameScene.js`, `js/scenes/SlotController.js` (nuevo), `js/objects/Fire.js`, `js/objects/Log.js`, `js/utils/*` | Corte de ranuras a su archivo. Colapso en cascada. Encaje con caída según distancia. Agarrar la leña correcta con resalte. Soltar sin ranura se asienta. H8. |
| **arte** | `js/gfx/textures.js` | Texturas nuevas: llama, luz de suelo, leña prendida y carbonizada, piedras (H11), postes, adobe, techo, cielo. |
| **UI** | `js/ui/*`, `css/style.css`, `index.html` | Tutorial y guía. Etiqueta del pozo legible (H3, H10). HUD. "Cómo jugar". H9. |
| **progresión** | `js/data/*`, `js/state/GameState.js` | La madera pesa. H4, H5, H6. `nextGoal`, `projectRate`. Margen de las noches. Arquitecto. Salida para la lluvia. |
| **dopamina** | `js/audio/FireAudio.js` | Sonidos nuevos y mezcla. |

## Fase 2: la escena por turnos, en este orden

1. **arte** (`GameScene.js`, `Fire.js`, `Log.js`, `js/objects/Pit.js`): llama, luz del mundo, leña prendida, pozos, techo proporcional y ciclo de luz.
2. **dopamina** (`GameScene.js`, `Fire.js`): la llama recorre la estructura, "rinde ×N", corona de brasas, cola de mensajes (H2), primeras veces, sonidos nuevos conectados.
3. **UI y progresión** (`GameScene.js`, UI primero): `ui.tutorial`, `bonus` y `slotsUsed` en la etiqueta, `nextGoal`, inactividad; después `projectRate` en la tienda.

Después: **tester**, arreglos, commit y push del coordinador.

## Presupuesto de rendimiento
La llama nueva no puede costar más que la actual: medido por el tester, 3,6 ms por cuadro con 72 leñas ardiendo en escritorio (`game.step` + `readPixels`). Si sube, se recorta. Respetar el ajuste de efectos (`fx`) que ya existe.
