# Ciclo 2: arreglos del tester y nuevas mejoras

Base: `feedback-tester.md` (bugs B1–B11, sensaciones y balance) e `informe-arte.md` (pedidos para el ciclo 2).
Valen las mismas reglas del PLAN.md: un solo dueño por archivo a la vez, `node --check`, no levantar servidores ni romper partidas guardadas. Cada uno escribe su sección en su informe.

## Fase A: en paralelo, con archivos que no se pisan
| Quién | Archivos | Qué |
|---|---|---|
| **arreglos-ui** (Haiku) | `js/ui/Ui.js`, `css/style.css`, `index.html` | B1 (refit con ResizeObserver/doble rAF), B4 (cerrar panel al abrir cartas/resumen), B5 (el slider de volumen sincroniza mute, checkbox e ícono; si hace falta, exponer `ui.syncSettings()`), B7 (si `before` es '—', mostrar solo `after`), B8 (checkboxes visibles en tema oscuro), B10 (Esc con confirmación de reset: cancelarla y cerrar el menú en un solo Esc) |
| **progresión** (Sonnet) | `js/state/GameState.js`, `js/data/*.js` | B6, B11 (guardado concurrente/viejo: que `beforeunload` no pise después de `wipe`/importar y que no se pisen dos pestañas), balance (ver abajo) y contenido nuevo: **eventos de bosque** (datos) y **logros** (datos + mods) |
| **dopamina** (Sonnet) | `js/objects/Fire.js`, `js/objects/Log.js`, `js/audio/FireAudio.js`, `js/objects/Weather.js` | chispas alargadas con `spark-streak` (pedido 3 de arte), APIs para el juice de leña (pop/squash al sacar, anillo de chispas y "tump" al caer en el pozo), **fogata pico** (detección y efecto en Fire, sonido), sonidos de eventos de bosque y de logro |

### Balance pedido a progresión
- Los primeros niveles llegan demasiado rápido (3 niveles entre 120 y 450): estirar los primeros niveles sin tocar el ritmo de los tardíos.
- Noche 1 con meta de 4/s contra un fuego básico de 0,4–1,3/s: medí o estimá con el modelo real y dejala alcanzable con una fogata atendida y algo de estructura. El HUD tiene que poder mostrar "te faltan X/s".
- El primer día llega muy pronto después de 2500: dar margen (más días antes de la primera noche, o un primer día más largo).
- Prestigiar da menos que un amanecer: que la ceniza del prestigio escale con el calor de la partida y sea claramente atractiva después de 2–3 amaneceres.
- B2: Cenizas tiene que verse siempre que `meta.totalDawns >= 1 || meta.prestiges >= 1` (la integración va en la fase B, en `GameScene.applyUnlock`/`create`).

## Fase B: GameScene.js por turnos
1. **progresión**: B2, eventos de bosque en `rollLoot`/`giveLoot`/viaje, logros (chequeo y aviso), el nuevo balance de noches y los datos para "te faltan X/s" en `ui.update`.
2. **dopamina**: juice de leña (`setupInput`, rama slot, `setupCollisions`), fogata pico (bonus vía `gainCalor` coordinado con progresión), y engancharse a eventos y logros.
3. **arte**: parallax con las capas `bg-*` y `sky-dawn` en `playDawn`.
4. **ui** (Sonnet): B3 (cola de toasts mientras hay modal), B9 (layout del panel a 800×600), apilado de pronóstico/noche/toast arriba al centro, "+X/s vs meta" legible, resumen con menos hueco, cartas en horizontal móvil y la UI de logros y eventos.

## Fase C
El tester vuelve a probar en 127.0.0.1 y los arreglos chicos van a sesiones Haiku.
