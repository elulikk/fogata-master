# Ciclo 4: arrastre, acomodo de leña y tamaños de fogata

Pedido del usuario (2026-10-30, después de jugarlo): iterar durante ~5 horas, enfocados **principalmente** en cómo se arrastra y se coloca la leña dentro de la fogata, y en los tamaños de fogata.

## Qué marcó el usuario
- **Quiero acomodarla**: rotar la leña y apilarla en forma de tipi, cabaña o lo que sea. **La forma tiene que importar para el fuego** (aire, tiraje, cómo prende y cuánto dura).
- **El pozo se llena enseguida**: entran pocas leñas, el límite no se ve y lo que sobra se desparrama. El tester también vio leña sobrante que rueda y arde pegada al estante (B21).
- **Más niveles de tamaño**: una escala larga, desde una fogata chica hasta una hoguera enorme, como eje de progresión.
- **Que el tamaño cambie el juego**: más capacidad, más aire y otra forma de cargarla. No solo más calor.

NO marcó: "cuesta apuntar" ni "se siente flotante". El arrastre básico no le molesta, así que no lo rompan.
Trabajo autónomo: el usuario no está disponible para preguntas.

## Restricciones de siempre
- Respetar la dirección del juego: incremental que se desbloquea de a poco, con un núcleo físico táctil (`fogata-design-direction`).
- No romper partidas guardadas (`data.version`, merge en `load()`).
- Un solo escritor por archivo a la vez. No hay git; los respaldos los hace el coordinador.
- Pruebas en el navegador: SIEMPRE en http://127.0.0.1:8080/ (nunca localhost, ahí está la partida del usuario). No levantar servidores.
- Touch: todo gesto nuevo (rotar, etc.) necesita equivalente táctil.
