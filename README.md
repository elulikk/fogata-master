# 🔥 Fogata Master

Un juego de fogata para el navegador: **satisfactorio de tocar** y con una capa de **gestión que se va abriendo de a poco**.

Arrancás con un pozo chico, un tronco prendido y un poco de leña. Arrastrás la leña con el mouse o el dedo (física real: cae, rebota, se apila), la **encajás** en el pozo para armar un tipi o una cabaña, y el fuego da **calor**: la moneda con la que todo crece. Tienda, cartas de mejora, construcciones, fogatas más grandes, noches que hay que aguantar hasta el amanecer y un prestigio de cenizas para volver a empezar más fuerte.

Sitio estático, sin build, sin archivos de audio ni de imagen: todo (texturas y sonido) se genera por código.

## Cómo correrlo

Usa módulos de JavaScript, así que necesita un servidor local (abrir el `index.html` directo no anda):

```bash
python -m http.server 8080
```

y entrá a http://127.0.0.1:8080. El guardado vive en el `localStorage` de ese origen (no es el mismo que `localhost`).

Para depurar, en la consola está `fogata.state` (por ejemplo `fogata.state.gainCalor(1000)`).

## Controles

| Acción | Mouse / teclado | Táctil |
|---|---|---|
| Agarrar leña | Arrastrar desde la pila (izquierda) | Arrastrar |
| Encajar | Soltar cerca de una **silueta** del pozo | Soltar sobre la silueta |
| Girar la leña agarrada | Rueda (15°), **Q / E** sostenidas (Shift = fino), clic derecho (+45°) | Botones ↺ ↻ o un segundo dedo |
| Prender | Tocar una leña (gasta un fósforo; sin fósforos, pedernal) | Tocar |
| Chispazos | Pasar el mouse por encima | Pasar el dedo |
| Fuelle | Mantener apretado sobre la fogata o **Espacio** | Mantener apretado |
| Tienda / Construir / Cenizas / Bosque | **S** / **C** / **A** / **B** | Botones |
| Silenciar | **M** | Botón 🔊 |
| Pausa y menú | **Esc** o ⚙️ | ⚙️ |

## Armar la fogata

La leña se puede tirar a mano (física libre) o **encajar**: mientras arrastrás sobre un pozo aparecen siluetas de los lugares posibles y, al soltar cerca, la leña se acomoda sola en posición y ángulo y queda quieta. Solo vuelve a moverse si se quema lo que la sostiene o si la agarrás.

- **Base**: leños horizontales en el piso del pozo.
- **Cabaña**: dos bases separadas y un **puente** encima (se puede apilar más). Dura más y quema parejo: **≈ +26 % de calor** y +20 % de duración frente a la misma leña en montón. Con ramas entra desde el pozo *Hogar*; con troncos, desde *Pira*.
- **Tipi**: girá la leña unos 60° y soltala a un costado; las patas se cruzan sobre el centro. Prende rapidísimo y con un pico alto: **≈ +22 % de calor**, aunque dura un poco menos.
- Las estructuras propagan el fuego entre sus piezas aun bajo la lluvia; un montón suelto bajo lluvia fuerte casi no lo hace.
- Si cargás de más un pozo, **se ahoga** (humea, la llama baja) y la leña que sobra rebota afuera con el aviso "Pozo lleno"; si queda tirada, vuelve sola a la pila.

## Tamaños de fogata

Ocho tamaños, de **Fogatita** a **Ceremonial**. Cada uno es más ancho y con paredes más altas (entra más leña), multiplica el calor y cambia cómo se juega:

- un pozo grande **a medio llenar rinde casi como uno chico**: hay que alimentarlo;
- prende más lento pero su lecho de brasas dura más;
- sin techo, sufre más la lluvia;
- el terreno es limitado: **un pozo enorme o varios chicos** (si uno se apaga, los otros sostienen la noche).

## Progresión

Al principio no hay más que la fogata y la pila. Lo demás aparece según el calor total juntado:

| Calor total | Se desbloquea |
|---|---|
| 2 | Contador de calor |
| 30 (o si te quedás sin leña) | **Ir al bosque**: un viaje corto con eventos; el fuego queda solo |
| 60 | Chispazos |
| 120 | **Mercachifle** (tienda) |
| 180 | **Niveles y cartas** con rareza: en cada nivel elegís 1 de 3 mejoras |
| 450 | **Clima** (lluvia con pronóstico) y **Construir**: techos, agrandar fogatas, leñera, secadero, ayudante, nuevas fogatas |
| 1.600 | Viento |
| 2.500 | **Noches**: hay que sostener un ritmo de calor hasta el amanecer o el frío gana |
| 4.500 | Tormentas |

Más adelante, las **Cenizas** (prestigio) reinician la partida a cambio de mejoras permanentes (más calor, fogata inicial más grande, bonus de estructuras, etc.). También hay logros, combos de chispazos y celebraciones al subir de nivel.

## Sistemas

- **Maderas**: ramas (prenden con fósforo, duran poco), madera seca (fuerte y limpia), húmeda (primero se seca: humea y chilla), troncos (tardan en prender, duran mucho), piñas (llamarada).
- **Calor entre leños**: cada leña recibe calor de las que arden cerca (más si están abajo, porque el calor sube). Las piezas encajadas que se tocan se prenden entre sí en segundos.
- **Etapas**: cruda → llama → brasas → ceniza. La ceniza deja un lecho de brasas que vuelve a prender lo que le tirás.
- **Aire**: cada pozo tiene capacidad; el tipi, el fuelle, el viento y algunas cartas dan aire extra.
- **Sonido**: todo sintetizado con Web Audio (crepitar, rugido, golpes de madera, encaje, fósforo, lluvia, viento, truenos).
- **Guardado**: autoguardado más 3 ranuras manuales, copia previa al cargar o empezar de nuevo, y exportar/importar a archivo.

## Tecnología

**Phaser 3** (Matter.js para la física, partículas, tweens) y una interfaz HTML/CSS encima del canvas.

```
FogataMaster/
├── index.html              # Canvas + interfaz HTML (HUD, tienda, cartas, menús)
├── css/style.css
├── js/
│   ├── main.js             # Arranque: estado, audio, UI y Phaser
│   ├── scenes/GameScene.js # Pila de leña, arrastre/rotación/encaje, bosque, economía
│   ├── objects/
│   │   ├── Fire.js         # Calor entre leños, etapas, estructuras, partículas, luz
│   │   ├── Pit.js          # Pozo por tamaño: paredes, lecho de brasas, techo
│   │   ├── Log.js          # Leña física
│   │   └── Weather.js      # Lluvia, viento, tormentas y pronóstico
│   ├── data/               # Maderas, tamaños, tienda, cartas, noches, cenizas, logros, bosque
│   ├── state/GameState.js  # Recursos, compras, cartas, guardado y migraciones
│   ├── audio/FireAudio.js  # Sonido sintetizado
│   ├── gfx/textures.js     # Texturas generadas por código
│   ├── ui/                 # Ui.js (HUD, tienda, avisos) y MainMenu.js (título, pausa, ranuras)
│   └── utils/              # Geometría, ranuras magnéticas y detección de estructuras
└── assets/                 # Vacío: todo se genera por código
```

## Cómo se hace

El juego se desarrolla con un equipo de agentes de [Claude Code](https://claude.com/claude-code) coordinados por una sesión principal. Cada uno tiene su especialidad (física e interacción, game feel, progresión, UI y comodidades, arte, y un tester que juega y mide). Sus definiciones están en `.claude/agents/`, y los planes, informes y pruebas de cada iteración en `.claude/equipo/`.

## Ideas para seguir

- Probar en un dispositivo táctil real los botones de giro y el segundo dedo.
- Ayudantes visibles caminando al bosque, animales que se acercan al calor.
- Más herramientas (atizador para acomodar brasas, hacha para partir troncos en el lugar).
