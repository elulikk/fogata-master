# 🔥 Fogata Master

Un juego de fogata para el navegador: **satisfactorio de tocar** y con una capa de **gestión que se va abriendo de a poco**.

Arrancás con un pozo chico, un tronco prendido y un poco de leña. Arrastrás la leña con el mouse o el dedo, la **encajás** en los lugares de la fogata y el fuego da **calor**: la moneda con la que todo crece. Tienda, cartas de mejora, construcciones, fogatas más grandes, noches que hay que aguantar hasta el amanecer y un prestigio de cenizas para volver a empezar más fuerte.

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
| Elegir herramienta | Barra de abajo o `1` fósforo, `2` pedernal | Tocar la barra |
| Prender | Tocar una leña con la herramienta elegida | Tocar |
| Chispazos | Pasar el mouse por encima | Pasar el dedo |
| Fuelle | Mantener apretado sobre la fogata o **Espacio** | Mantener apretado |
| Comprar leña | **+** de cada casillero de la pila, o tocar uno vacío | Igual |
| Tienda / Construir / Cenizas | **S** / **C** / **A** | Botones |
| Silenciar | **M** | Botón 🔊 |
| Pausa y menú | **Esc** o ⚙️ | ⚙️ |

## Armar la fogata

La leña no tiene física: cada fogata tiene **lugares fijos**, y cada tamaño de pieza va en el suyo. Mientras arrastrás se marcan los lugares libres y la pieza se acomoda en el más cercano, así que ves cómo va a quedar antes de soltar. Si la soltás en otro lado, vuelve a la pila.

- **Lugares**: cada tipi tiene 2 lugares para **ramas** (azul), 2 para **leña** (amarillo) y 2 para **troncos** (rojo). Las cartas de **Hueco** suman más lugares por tamaño. Dónde y en qué orden se pone no importa: el calor se comparte en todo el pozo.
- **Prender es exponencial**: cada tamaño pide unas 6,5 veces más calor y tarda 5 veces más. El fósforo prende ramas (y leña de pino); la leña pide ramas ardiendo y los troncos, un fuego fuerte.
- **Se achican**: a la mitad de su combustible, un tronco se vuelve leña y baja a ese anillo; la leña se vuelve rama; la rama termina en **ceniza**. Así siempre se va liberando lugar arriba. Si abajo no hay lugar, la pieza espera arriba mientras sigue ardiendo; si se termina antes, se hace ceniza.
- **Fogata armada**: con leña de los tres tamaños tira mejor, prende más rápido y da hasta **+28 % de calor**, según cuántos lugares estén ocupados.

## Maderas

Toda pieza es una especie en un tamaño (por ejemplo, *tronco de roble*). Cada escalón de la fogata abre maderas mejores, en la pila y en la tienda:

| Especie | Se abre con | Cómo es |
|---|---|---|
| **Pino** | Fogatita | Prende enseguida y chisporrotea, pero se consume rápido |
| **Lenga** | Fogata | Pareja en todo |
| **Raulí** | Fogón | Llama alta y limpia, poco humo |
| **Roble** | Hogar | Tarda en prender, dura mucho y calienta parejo |
| **Quebracho** | Fragua | Necesita buen fuego debajo, pero rinde como ninguno |

El calor sigue a la leña que arde: más lugares llenos y mejor madera rinden más.

La **madera húmeda** (lo que moja la lluvia) primero se seca, humea y chilla. Las **piñas** ocupan un lugar de rama y largan una llamarada. Los troncos de cualquier especie sirven para pagar en la tienda; se gastan primero los más flojos.

## De dónde sale la leña

El calor es la moneda y la leña es el gasto que no se termina: quemás para ganar y comprás para seguir quemando.

- **Comprarla**: con el **+** de la pila (un manojo de esa madera) o los atados del Mercachifle. El precio sigue a lo que rinde cada especie y sube si comprás de golpe, pero baja solo con el tiempo.
- **Leñador**: se contrata en Construir y te trae leña sin que dejes el fuego, sobre todo de pino y hasta un tope de la pila. Una fogata grande igual hay que comprarla.
- **Ramas del suelo**: si te quedan menos de 6 ramas, aparece una cada 8 segundos. Es la red para no quedar trabado sin leña ni calor.

## Evolución de la fogata

Ocho escalones, cada uno con su dibujo. No solo crece: se va volviendo una obra más refinada, y las ventajas de un escalón se conservan en los siguientes.

| Escalón | Tipis | Calor lleno | Consumo | Ventaja |
|---|---|---|---|---|
| **Fogatita** | 1 | ×1 | ×1 | Un anillo de piedras |
| **Fogata** | 1 | ×1,5 | ×1,05 | Pirca: las brasas duran más. Abre la lenga |
| **Fogón** | 1 | ×2 | ×1,15 | Parrilla: la leña prende más rápido. Abre el raulí |
| **Hogar** | 2 | ×3,5 | ×1,25 | Chimenea: no le llega la lluvia. Abre el roble |
| **Horno de barro** | 2 | ×4,5 | ×1 | Gasta menos leña y el lecho casi no se enfría |
| **Fragua** | 2 | ×6,4 | ×1,7 | Fuelle propio y fuego más blanco. Abre el quebracho |
| **Alto horno** | 3 | ×10 | ×1,8 | Muchos más chispazos |
| **Gran Forja** | 3 | ×15 | ×2,1 | Fuego azul: las noches piden 20 % menos |

- una fogata grande **a medio llenar rinde casi como una chica**: hay que alimentarla;
- prende más lento pero su lecho de brasas dura más;
- el terreno es limitado: **una construcción enorme o varias chicas** (si una se apaga, las otras sostienen la noche).

## Sumar contenido

Todo sale de tablas, así que ampliar el juego es agregar una entrada:

| Para sumar | Se edita |
|---|---|
| Un escalón de fogata | `js/data/sizes.js`, y su dibujo en `js/gfx/hearths.js` |
| Un color de fuego | `js/data/flames.js` |
| Una ventaja nueva | `PERK_RULES` en `js/data/sizes.js`, y dónde tiene efecto |
| Una madera | `SPECIES` en `js/data/woods.js` (su precio y su textura salen solos) |
| Un proveedor de leña | `SUPPLIERS` en `js/data/supply.js` |
| Algo para comprar o construir | `js/data/shop.js` |
| Un desbloqueo | `MILESTONES` en `js/data/progress.js` |

## Progresión

Al principio no hay más que la fogata y la pila. Lo demás aparece según el calor total juntado:

| Calor total | Se desbloquea |
|---|---|
| 2 | Contador de calor |
| 30 (o si te quedás sin leña) | **Mercachifle** y el **+** de la pila: empezás a comprar leña |
| 60 | Chispazos |
| 180 | **Niveles y cartas** con rareza: en cada nivel elegís 1 de 3 mejoras |
| 450 | **Clima** (lluvia con pronóstico) y **Construir**: evolucionar la fogata, leñador, techos, leñera, secadero, nuevas fogatas |
| 1.600 | Viento |
| 3.000 | **Noches**: hay que sostener un ritmo de calor hasta el amanecer o el frío gana |
| 5.500 | Tormentas |

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
│   ├── scenes/GameScene.js # Pila de leña, arrastre y encaje, compras, economía
│   ├── objects/
│   │   ├── Fire.js         # Calor entre leños, etapas, cambio de tamaño, partículas, luz
│   │   ├── Pit.js          # Fogata según su escalón: lugares, construcción, lecho de brasas, techo
│   │   ├── Log.js          # Pieza de leña en su lugar
│   │   └── Weather.js      # Lluvia, viento, tormentas y pronóstico
│   ├── data/               # Maderas, escalones, fuegos, proveedores, tienda, cartas, noches, cenizas, logros
│   ├── state/GameState.js  # Recursos, compras, cartas, guardado y migraciones
│   ├── audio/FireAudio.js  # Sonido sintetizado
│   ├── gfx/                # textures.js y hearths.js (el dibujo de cada escalón), todo por código
│   ├── ui/                 # Ui.js (HUD, tienda, avisos) y MainMenu.js (título, pausa, ranuras)
│   └── utils/              # Geometría y lugares de la fogata
└── assets/                 # Vacío: todo se genera por código
```

## Cómo se hace

El juego se desarrolla con un equipo de agentes de [Claude Code](https://claude.com/claude-code) coordinados por una sesión principal. Cada uno tiene su especialidad (interacción, game feel, progresión, UI y comodidades, arte, y un tester que juega y mide). Sus definiciones están en `.claude/agents/`, y los planes, informes y pruebas de cada iteración en `.claude/equipo/`.

## Ideas para seguir

- Probar en un dispositivo táctil real los botones de giro y el segundo dedo.
- Un cargador automático para las fogatas grandes, y animales que se acercan al calor.
- Más herramientas (atizador para acomodar brasas, hacha para partir troncos en el lugar).
