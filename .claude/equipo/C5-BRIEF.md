# Ciclo 5: brief

El usuario pidió: "itera de nuevo, y mejora con los sub, yo me voy". Modo autónomo: no hay a quién preguntarle, cada uno decide con criterio y documenta.

## De dónde venimos
El ciclo 4 dejó: rotación de leña, ranuras magnéticas (base, puente/cabaña, tipi), estructuras que rinden más que el montón (tipi +22 %, cabaña +26 %), 8 tamaños de pozo con layout por terreno, menú principal, pausa y 3 ranuras de guardado. Detalle en los informes `informe-*.md` (secciones C4-*) y en `c4-test-*.md`.

## Qué buscamos ahora
Que el juego se sienta **terminado y lindo de jugar los primeros 30 minutos**, en este orden:
1. **Primera sesión**: alguien que nunca jugó entiende qué hacer sin leer, y descubre rotar, encajar, tipi y cabaña porque el juego lo lleva.
2. **Tocar la leña**: agarrar, mover y soltar se siente bien de punta a punta, con o sin ranura.
3. **Se ve bien**: el usuario se quejó de que algo "se ve medio choto". Fuego, leña, pozo y fondo tienen que verse pulidos en una captura real, no solo en teoría.
4. **Vale la pena jugar bien**: las decisiones (estructura, tamaño, uno grande o varios chicos, qué madera) se notan en el calor y en las noches, y el juego lo muestra.

No hace falta sumar sistemas nuevos. Preferí pulir y hacer visible lo que ya existe; si proponés algo nuevo, tiene que ser chico y justificar por qué es mejor que pulir.

## Reglas
- **No hagas `git commit` ni `git push`**: el coordinador hace un commit por iteración. El repo es público: nada de datos personales ni secretos.
- Un solo escritor por archivo a la vez: el coordinador te dice qué archivos son tuyos en cada turno.
- `node --check` en todo JS que toques.
- Probá en http://127.0.0.1:8080/ (nunca localhost). Respaldá la partida antes de tocar nada. Al terminar: restaurala, poné `state.locked = true` antes de cerrar la pestaña, verificá que localStorage quedó igual al respaldo y cerrá la pestaña.
- **Para ver el juego**: el panel oculto no hace rAF. Avanzá con `game.step()`, y en la misma tarea hacé `canvas.toDataURL()`, pegá el PNG en un `<img>` superpuesto y sacá el screenshot. No des por bueno un cambio visual sin haberlo visto así.
- Para comparar estructuras contra montón usá `.claude/equipo/medir-estructuras.js` y validá `encajadas === n`.
- Si no pudiste verificar algo (por ejemplo, táctil real), decilo claro en el informe.
- Cada uno agrega su sección a `informe-<area>.md` y termina con un resumen de 3 líneas.
