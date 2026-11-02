# 🔥 Fogata Master

Un juego de fogata para el navegador: **satisfactorio de tocar** y con una capa de **gestión que se va abriendo de a poco**.

Arrancás con un pozo chico, un tronco prendido y un poco de leña. Arrastrás la leña con el mouse o el dedo, la **encajás** en los lugares de la fogata (ramas al centro, leña al medio, troncos afuera) y el fuego da **calor**: la moneda con la que todo crece. Tienda, cartas de mejora, construcciones, fogatas más grandes, noches que hay que aguantar hasta el amanecer y un prestigio de cenizas para volver a empezar más fuerte.

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
| Encajar | Soltar sobre un **lugar marcado** de la fogata | Igual |
| Sacar leña sin prender | Arrastrarla fuera del fuego: vuelve a la pila | Igual |
| Ver cómo rinde una madera | Pasar el mouse por la pila | Mantener apretado en la pila |
| Prender | Tocar una leña (gasta un fósforo; sin fósforos, pedernal) | Tocar |
| Chispazos | Pasar el mouse por encima | Pasar el dedo |
| Fuelle | Mantener apretado sobre la fogata o **Espacio** | Mantener apretado |
| Tienda / Construir / Cenizas / Bosque | **S** / **C** / **A** / **B** | Botones |
| Silenciar | **M** | Botón 🔊 |
| Pausa y menú | **Esc** o ⚙️ | ⚙️ |

## Armar la fogata

La leña no tiene física: cada fogata tiene **lugares fijos**, y cada tamaño de pieza va en el suyo. Mientras arrastrás se marcan los lugares libres y la pieza se acomoda en el más cercano, así que ves cómo va a quedar antes de soltar. Si la soltás en otro lado, vuelve a la pila.

- **Anillos**: cada tipi tiene 2 lugares para **ramas** (centro, azul), 2 para **leña** (medio, amarillo) y 2 para **troncos** (afuera, rojo). Las piezas se pueden pisar entre sí sin que pase nada.
- **Se achican**: a la mitad de su combustible, un tronco se vuelve leña y baja a ese anillo; la leña se vuelve rama; la rama termina en **ceniza**. Así siempre se va liberando lugar arriba. Si abajo no hay lugar, la pieza espera arriba mientras sigue ardiendo; si se termina antes, se hace ceniza.
- **Fogata armada**: con leña en los tres anillos tira mejor, prende más rápido y da hasta **+28 % de calor**, según cuántos lugares estén ocupados.

## Maderas

Toda pieza es una especie en un tamaño (por ejemplo, *tronco de roble*). Las especies aparecen en el bosque y en la tienda a medida que juntás calor:

| Especie | Desde (calor total) | Cómo es |
|---|---|---|
| **Pino** | 0 | Prende enseguida y chisporrotea, pero se consume rápido |
| **Lenga** | 100 | Pareja en todo |
| **Raulí** | 700 | Llama alta y limpia, poco humo |
| **Roble** | 2.200 | Tarda en prender, dura mucho y calienta parejo |
| **Quebracho** | 6.000 | Necesita buen fuego debajo, pero rinde como ninguno |

La **madera húmeda** (lo que moja la lluvia) primero se seca, humea y chilla. Las **piñas** ocupan un lugar de rama y largan una llamarada. Los troncos de cualquier especie sirven para pagar en la tienda; se gastan primero los más flojos.

## Tamaños de fogata

Ocho tamaños, de **Fogatita** a **Ceremonial**. Cada uno es más ancho y con paredes más altas, multiplica el calor y cambia cómo se juega. Los lugares crecen de a tipis enteros: uno hasta *Fogón*, dos desde *Hogar* y tres desde *Faro*.

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

- **Calor entre leños**: cada leña recibe calor de las que arden cerca (más si están abajo, porque el calor sube). Las piezas que se tocan se prenden entre sí en segundos.
- **Etapas**: cruda → llama → brasas → ceniza. La ceniza deja un lecho de brasas que vuelve a prender lo que le ponés.
- **Aire**: la fogata armada, el fuelle, el viento y algunas cartas dan aire extra.
- **Sonido**: todo sintetizado con Web Audio (crepitar, rugido, golpes de madera, encaje, fósforo, lluvia, viento, truenos).
- **Guardado**: autoguardado más 3 ranuras manuales, copia previa al cargar o empezar de nuevo, y exportar/importar a archivo.

## Tecnología

**Phaser 3** (partículas, tweens) y una interfaz HTML/CSS encima del canvas.

```
FogataMaster/
├── index.html              # Canvas + interfaz HTML (HUD, tienda, cartas, menús)
├── css/style.css
├── js/
│   ├── main.js             # Arranque: estado, audio, UI y Phaser
│   ├── scenes/GameScene.js # Pila de leña, arrastre y encaje, bosque, economía
│   ├── objects/
│   │   ├── Fire.js         # Calor entre leños, etapas, cambio de tamaño, partículas, luz
│   │   ├── Pit.js          # Pozo por tamaño: lugares, paredes, lecho de brasas, techo
│   │   ├── Log.js          # Pieza de leña en su lugar
│   │   └── Weather.js      # Lluvia, viento, tormentas y pronóstico
│   ├── data/               # Maderas, tamaños, tienda, cartas, noches, cenizas, logros, bosque
│   ├── state/GameState.js  # Recursos, compras, cartas, guardado y migraciones
│   ├── audio/FireAudio.js  # Sonido sintetizado
│   ├── gfx/textures.js     # Texturas generadas por código
│   ├── ui/                 # Ui.js (HUD, tienda, avisos) y MainMenu.js (título, pausa, ranuras)
│   └── utils/              # Geometría y lugares de la fogata
└── assets/                 # Vacío: todo se genera por código
```

## Cómo se hace

El juego se desarrolla con un equipo de agentes de [Claude Code](https://claude.com/claude-code) coordinados por una sesión principal. Cada uno tiene su especialidad (interacción, game feel, progresión, UI y comodidades, arte, y un tester que juega y mide). Sus definiciones están en `.claude/agents/`, y los planes, informes y pruebas de cada iteración en `.claude/equipo/`.

## Ideas para seguir

- Probar en un dispositivo táctil real los botones de giro y el segundo dedo.
- Ayudantes visibles caminando al bosque, animales que se acercan al calor.
- Más herramientas (atizador para acomodar brasas, hacha para partir troncos en el lugar).
