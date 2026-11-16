# 🔥 Fogata Master

Un juego de fogata para el navegador: **satisfactorio de tocar** y con una capa de **gestión que se va abriendo de a poco**.

Arrancás con un pozo chico, unas ramas sin prender y un pedernal: el primer fuego lo prendés vos. Después arrastrás la leña con el mouse o el dedo, la **encajás** en los lugares de la fogata y el fuego da **calor**: la moneda con la que todo crece. Pyroshop, un árbol de habilidades, construcciones, fogatas más grandes, noches que hay que aguantar hasta el amanecer y las cenizas, para renacer y volver a empezar más fuerte.

Hay dos versiones en este repositorio: la **web en 2D** (esta carpeta, con Phaser) y un **prototipo en 3D** hecho en Godot 4 (carpeta `godot/`). Comparten reglas, números y tablas de contenido.

Sitio estático, sin build, sin archivos de audio ni de imagen: todo (texturas y sonido) se genera por código.

## Cómo correrlo

Usa módulos de JavaScript, así que necesita un servidor local (abrir el `index.html` directo no anda):

```bash
python -m http.server 8080
```

y entrá a http://127.0.0.1:8080. El guardado vive en el `localStorage` de ese origen (no es el mismo que `localhost`).

Para probar sin jugar todo está el **menú de desarrollo**: el botón 🛠 de arriba a la derecha o `F12` (da calor y leña, desbloquea, cambia el clima, acelera el tiempo). Se apaga con `DEV_ON` en `js/data/dev.js`. En la consola también está `fogata.state`.

## Controles

| Acción | Mouse / teclado | Táctil |
|---|---|---|
| Agarrar leña | Arrastrar desde la pila (izquierda) | Arrastrar |
| Encajar | Soltar sobre un **lugar marcado** de la fogata | Igual |
| Sacar leña sin prender | Arrastrarla fuera del fuego: vuelve a la pila | Igual |
| Ver cómo rinde una madera | Pasar el mouse por la pila | Mantener apretado en la pila |
| Elegir herramienta | Barra de abajo o `1` fósforo, `2` pedernal, `3` rastrillo, `4` fuelle | Tocar la barra |
| Prender | Tocar una leña con el fósforo o el pedernal | Tocar |
| Chispazos | Pasar el mouse por encima | Tocarlos |
| Sacar la ceniza | Con el rastrillo elegido, tocar la fogata | Igual |
| Fuelle | Con el fuelle elegido, mantener apretado sobre la fogata; o **Espacio** | Mantener apretado |
| Comprar leña | **+** de cada casillero de la pila, o tocar uno vacío | Igual |
| Pyroshop / Construir / Habilidades / Cenizas | **S** / **C** / **H** / **A** | Botones |
| Silenciar | **M** | Botón 🔊 |
| Pausa y menú | **Esc** o ⚙️ | ⚙️ |

Cualquier ventana abierta **pausa el juego**: el fuego no se consume mientras comprás o elegís habilidades.

## Armar la fogata

La leña no tiene física: cada fogata tiene **lugares fijos**, y cada tamaño de pieza va en el suyo. Mientras arrastrás se marcan los lugares libres y la pieza se acomoda en el más cercano, así que ves cómo va a quedar antes de soltar. Si la soltás en otro lado, vuelve a la pila.

- **Lugares**: cada escalón de fogata dice cuánta leña de cada corte entra. La Fogatita solo acepta **ramas** (azul); al evolucionarla entran **leña** (amarillo) y después **troncos** (rojo), y cada vez más. Las habilidades de *Lugar para…* suman lugares. Dónde y en qué orden se pone no importa: el calor se comparte en todo el pozo.
- **Prender el primer fuego**: con el pedernal, tocando las ramas. No siempre saca chispa. Los fósforos prenden al toque, pero se gastan y hay que comprarlos.
- **Prender es exponencial**: cada tamaño pide unas 6,5 veces más calor y tarda 5 veces más. El fósforo prende ramas (y leña de pino); la leña pide ramas ardiendo y los troncos, un fuego fuerte.
- **Se achican**: a la mitad de su combustible, un tronco se vuelve leña y baja a ese anillo; la leña se vuelve rama; la rama termina en **ceniza**. Así siempre se va liberando lugar arriba. Si abajo no hay lugar, la pieza espera arriba mientras sigue ardiendo; si se termina antes, se hace ceniza.
- **Fogata armada**: con leña de los tres tamaños tira mejor, prende más rápido y da hasta **+28 % de calor**, según cuántos lugares estén ocupados.
- **Ceniza**: cada pieza que se termina deja ceniza en el pozo. Un poco abriga el lecho de brasas; de más, tapa el tiro y **ahoga el fuego** (hasta 25 % menos de aire). El **rastrillo** la saca y aviva las brasas. Las brasas, además, se van cubriendo de ceniza gris a medida que se apagan.

## Maderas

Toda pieza es una especie en un tamaño (por ejemplo, *tronco de roble*). Cada escalón de la fogata abre maderas mejores, en la pila y en Pyroshop:

| Especie | Se abre con | Cómo es |
|---|---|---|
| **Pino** | Fogatita | Prende enseguida y chisporrotea, pero se consume rápido |
| **Lenga** | Fogata | Pareja en todo |
| **Raulí** | Fogón | Llama alta y limpia, poco humo |
| **Roble** | Hogar | Tarda en prender, dura mucho y calienta parejo |
| **Quebracho** | Fragua | Necesita buen fuego debajo, pero rinde como ninguno |

El calor sigue a la leña que arde: más lugares llenos y mejor madera rinden más.

La **madera húmeda** (lo que moja la lluvia) primero se seca, humea y chilla. Las **piñas** ocupan un lugar de rama y largan una llamarada.

## De dónde sale la leña

El calor es la moneda y la leña es el gasto que no se termina: quemás para ganar y comprás para seguir quemando.

- **Comprarla**: con el **+** de la pila o en Pyroshop (un manojo de esa madera). Solo se ofrecen los cortes que alguna de tus fogatas acepta, y las ramas solo de pino. El precio sigue a lo que rinde cada especie y sube si comprás de golpe, pero baja solo con el tiempo. Todo se paga solo con calor.
- **Leñador**: se contrata en Construir y te trae leña sin que dejes el fuego, sobre todo de pino y hasta un tope de la pila. Una fogata grande igual hay que comprarla.
- **Sabueso**: una habilidad del árbol; un perro que también trae leña cada tanto.
- **Cuidador del fuego**: se contrata en Construir. Carga solo la leña de la pila en las fogatas prendidas y rastrilla la ceniza que las ahoga.
- **Ramas del suelo**: si te quedan menos de 3 ramas, aparece una cada 8 segundos. Es la red para no quedar trabado sin leña ni calor.

## Evolución de la fogata

Ocho escalones, cada uno con su dibujo. No solo crece: se va volviendo una obra más refinada, y las ventajas de un escalón se conservan en los siguientes.

| Escalón | Cuesta | Ramas · leñas · troncos | Calor lleno | Consumo | Ventaja |
|---|---|---|---|---|---|
| **Fogatita** | — | 5 · 0 · 0 | ×1 | ×1 | Un anillo de piedras |
| **Fogata** | 70 | 6 · 2 · 0 | ×1,5 | ×1,05 | Pirca: entra leña y las brasas duran más. Abre la lenga |
| **Fogón** | 420 | 6 · 4 · 1 | ×2 | ×1,15 | Parrilla: entra un tronco y la leña prende más rápido. Abre el raulí |
| **Hogar** | 2.000 | 8 · 4 · 2 | ×3,5 | ×1,25 | Chimenea: no le llega la lluvia. Abre el roble |
| **Horno de barro** | 6.000 | 8 · 6 · 3 | ×4,5 | ×1 | Gasta menos leña y el lecho casi no se enfría |
| **Fragua** | 20.000 | 10 · 6 · 4 | ×6,4 | ×1,7 | Fuelle propio y fuego más blanco. Abre el quebracho |
| **Alto horno** | 80.000 | 12 · 8 · 6 | ×10 | ×1,8 | Muchos más chispazos |
| **Gran Forja** | 300.000 | 14 · 10 · 8 | ×15 | ×2,1 | Fuego azul: las noches piden 20 % menos |

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
| Una habilidad del árbol | `SKILLS` en `js/data/skills.js` |
| Una herramienta de la barra | `TOOLS` en `js/data/tools.js` |
| Un efecto de mejora nuevo | Una línea en `js/data/mods.js`, y dónde tiene efecto |
| Un paso del tutorial | `js/data/tutorial.js` |
| Un botón del menú de desarrollo | `js/data/dev.js` |
| Un desbloqueo | `MILESTONES` en `js/data/progress.js` |

Habilidades, mejoras de ceniza, logros y compras declaran sus mejoras con `effects: { mod: valor }` y se resuelven todas igual, por la tabla de `js/data/mods.js`.

## Progresión

Al principio no hay más que la fogata, unas ramas y el pedernal. Lo demás aparece según el calor total juntado:

| Calor total | Se desbloquea |
|---|---|
| 2 | Contador de calor |
| 15 (o si te quedás sin leña) | **Pyroshop** y el **+** de la pila: empezás a comprar leña |
| 40 | **Construir**: evolucionar la fogata para que entre leña; después leñador, cuidador, leñera, secadero y más fogatas |
| 120 | **Árbol de habilidades**: cada nivel da un punto y se gasta cuando quieras |
| 450 | **Clima**: lluvia con pronóstico, y techos |
| 1.600 | Viento |
| 3.000 | **Noches**: hay que sostener un ritmo de calor hasta el amanecer o el frío gana |
| 5.500 | Tormentas |

El **árbol de habilidades** tiene cinco ramas (Fuego, Leña, Oficio, Chispas e Intemperie). No hay cartas al azar: los puntos se juntan y cada uno elige su camino. Una buena noche regala un punto extra.

Las **chispas** suben del fuego desde el primer momento y valen calor; la **red mágica** de Pyroshop las atrae hacia el cursor.

Más adelante, las **Cenizas** dejan **renacer**: reinician la partida a cambio de mejoras permanentes (más calor, fogata inicial más grande, bonus de fogatas armadas, etc.). También hay logros, combos de chispazos y celebraciones al subir de nivel.

## Sistemas

- **Calor entre leños**: cada leña recibe calor de las que arden cerca (más si están abajo, porque el calor sube). Las piezas que se tocan se prenden entre sí en segundos.
- **Etapas**: cruda → llama → brasas → ceniza. La ceniza deja un lecho de brasas que vuelve a prender lo que le ponés.
- **Aire**: la fogata armada, el fuelle, el viento y algunas habilidades dan aire extra; la ceniza de más lo quita.
- **Sonido**: todo sintetizado con Web Audio (crepitar, rugido, golpes de madera, encaje, fósforo, lluvia, viento, truenos).
- **Guardado**: autoguardado más 3 ranuras manuales, copia previa al cargar o empezar de nuevo, y exportar/importar a archivo.

## Tecnología

**Phaser 3** (partículas, tweens) y una interfaz HTML/CSS encima del canvas.

```
FogataMaster/
├── index.html              # Canvas + interfaz HTML (HUD, ventanas, menús)
├── css/style.css
├── js/
│   ├── main.js             # Arranque: estado, audio, UI y Phaser
│   ├── scenes/GameScene.js # Pila de leña, arrastre y encaje, compras, economía
│   ├── objects/
│   │   ├── Fire.js         # Calor entre leños, etapas, cambio de tamaño, partículas, luz
│   │   ├── Pit.js          # Fogata según su escalón: lugares, construcción, lecho de brasas, techo
│   │   ├── Log.js          # Pieza de leña en su lugar
│   │   └── Weather.js      # Lluvia, viento, tormentas y pronóstico
│   ├── data/               # Maderas, escalones, fuegos, proveedores, tienda, habilidades, mods, herramientas, tutorial, noches, cenizas, logros, dev
│   ├── state/GameState.js  # Recursos, compras, habilidades, mods y guardado
│   ├── audio/FireAudio.js  # Sonido sintetizado
│   ├── gfx/                # textures.js y hearths.js (el dibujo de cada escalón), todo por código
│   ├── ui/                 # Ui.js (HUD, ventanas, árbol, avisos) y MainMenu.js (título, pausa, ranuras)
│   └── utils/              # Geometría y lugares de la fogata
├── assets/                 # Vacío: todo se genera por código
└── godot/                  # Prototipo 3D en Godot 4 (reglas en nucleo/, tablas en datos/)
```

Los guardados de antes del árbol de habilidades no se leen: la versión nueva empieza de cero.

## Cómo se hace

El juego se desarrolla con un equipo de agentes de [Claude Code](https://claude.com/claude-code) coordinados por una sesión principal. Cada uno tiene su especialidad (interacción, game feel, progresión, UI y comodidades, arte, y un tester que juega y mide). Sus definiciones están en `.claude/agents/`, y los planes, informes y pruebas de cada iteración en `.claude/equipo/`.

## Ideas para seguir

- Probar en un dispositivo táctil real los botones de giro y el segundo dedo.
- Animales que se acercan al calor.
- Más herramientas (atizador para acomodar brasas, hacha para partir troncos en el lugar).
