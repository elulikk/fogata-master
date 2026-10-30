# C4 — Análisis de dopamina: acomodar la leña y crecer de tamaño

Principio: el acomodo es el núcleo físico, así que el feedback tiene que ser **de material** (madera, piedra, aire), pequeño y frecuente, con los momentos grandes reservados a estructuras y a crecer. Todo se atenúa con `fire.motion`/`this.fx`; el sonido sigue, bajo.

## 1. Rotar, apoyar, estructura

**Rotar mientras se arrastra** (la física define el gesto; yo pongo la respuesta). Un "clic de madera" por paso angular: cada ~12° acumulados de rotación del tronco arrastrado → `audio.rotateTick(weight)` (golpecito seco, bandpass ~1.4 kHz, 18 ms, pitch +/- 4 % aleatorio; throttle 40 ms). Un paso más fuerte ("tac") cada 45°, que suma un guiño al jugador de que hay posiciones "buenas". Con teclado/touch, el mismo tick por cada paso de rotación. Anclaje: `GameScene.update` mientras `this.drag`, comparando `log.sprite.rotation` con `drag.lastTickAngle`. Sin rueda: se sigue sintiendo igual porque dispara por ángulo, no por input.

**Apoyar bien ("tock")**: `setupCollisions` ya filtra por `rv`; agregar un caso "contacto suave y estable": leña vs leña con `rv` bajo (<2.5) y ambas casi quietas (`speed<0.3`) ⇒ `audio.tock(weight)` (madera hueca: seno 180–260 Hz, 60 ms + clic). Throttle por leña (`log.lastTock`, 300 ms) para que no suene al apilar mil veces. Visual: `Log.pop(0.35)` (el halo ya existe) en la leña que se apoyó. Si la física detecta "encastre" (ángulo cruzado estable), el tock sube un tono (`pitch` 1.12) y deja una chispita de polvo (`ashDust` 2 partículas). El **tock de encastre** es la única recompensa chica al acomodar bien; no tiene que ser siempre.

**Estructura reconocible (tipi/cabaña)**: la detección es de física (`fogata-fisica`); yo defino la respuesta cuando emita `structure {kind, pit, quality}` (0..1):
- `audio.structure(kind)`: tres notas ascendentes de madera + acorde (tipi: quinta abierta; cabaña: acorde mayor), 0,8 s.
- `Fire.structureBurst(pit, kind)`: anillo de chispas (`ring`) + `flash` 0,5 y un halo breve dorado sobre las leñas del conjunto (`Log.pop(0.8)` escalonado 40 ms entre leñas).
- Texto flotante grande una sola vez por pozo: "¡Armaste un tipi!" (`floatText` escala 1.4, con `fx`) y toast. Bonus de descubrimiento la primera vez (progresión decide si es un logro).
- Cooldown por pozo (no repetir si la estructura se mantiene).

## 2. Cómo se ve y suena una estructura que "tira"

Hoy la intensidad de llama solo mueve emisores (`emitFor`) y el gain de `setFire`. Propongo exponer `pit.draft` (0..1, lo calcula física/Fire: aire + estructura) y que lo uso así:
- **Visual**: con `draft` alto, las llamas del pozo suben más (acelerar `accelerationY` y `speedY` por pozo: hoy es global en emisores, así que hay que emitir con `flames.L` más seguido en vez de tocar el emisor), más angostas y con menos humo; la luz `p.light` pierde parpadeo caótico (`flick` más suave) y gana un halo vertical. Un tiraje malo hace lo contrario: humo grueso, llama baja, `flick` nervioso.
- **Sonido**: `setFire(intensity, air)` ya sube el cutoff con `air`. Agregar un parámetro `draft` que baja el `Q` y sube el gain del rugido grave (un "fuuu" limpio y constante) y quita los `crackle` de ahogo; con un montón ahogado (`oxygen<0.5`) suena un siseo `hiss` y un "burbujeo" más seco. Es la forma más barata de decir "esto está bien armado".
- **Indicador**: reusar el anillo del pico: en la estructura buena, el borde del pozo muestra una pequeña "corona" de brasas fija (no un número). Evita UI.

## 3. Capacidad: pozo lleno y tirás otra

Hoy `p.oxygen` cae sin aviso hasta ahogar; el usuario siente que "el límite no se ve". Escala de feedback, **sin rechazo duro** (frustra):
- **0,8–1,0 de carga**: un tick de humo extra y un "crujido de madera" al apoyar nuevas leñas; el borde de piedras se ilumina tenue.
- **>1,0 (sobrecarga)**: al soltar una leña dentro, la leña "rebota" con `landInPit` más corto y un `audio.overfull()` (tump amortiguado + susurro de aire), un puñado de brasitas que saltan hacia afuera y el borde del pozo se pone ámbar parpadeando una vez. Nunca bloquea; avisa y cuesta aire.
- **Arrastrando hacia un pozo lleno**: el cursor sobre `pit.contains` cambia el tinte del contorno de piedras (`rojizo`) y el "tick" de rotar se vuelve más grave. Es feedback previo, sin interrumpir.
Anclaje: `Fire.update` ya calcula `p.loadRatio`; exponer un evento `pit:full` una vez al cruzar 1.0 con cooldown y `Fire.overfullPoof(pit)`.

## 4. Agrandar el pozo: momento épico

Se dispara en `applyUnlock`/`buy` (`agrandar_*`) → `this.pitObjs[idx].setSize(level+1)` → `Pit.build()` recrea piedras de golpe (hoy es un salto seco). Secuencia (1,6 s) a cargo de `GameScene.playGrow(pit, level, done)`:
1. 0 ms: `audio.grow(level)` (subgrave que baja 90→50 Hz + temblor de roca, más largo cuanto más grande) y `cameras.main.shake(300, 0.004)`.
2. 0–400 ms: las piedras actuales **salen despedidas** hacia afuera con tween (`x ± 40`, alpha 0) y polvo (`ashDust`).
3. 400 ms: `pit.setSize(...)` y las piedras nuevas entran **desde arriba** con `back.out` y un "tump" por piedra escalonado 60 ms (`audio.tump('heavy')`).
4. 700–1000 ms: `fire.flare(1.2 + 0.15*level)`, brasas `emberRise(1200)` y flash cálido.
5. Texto "Fogata más grande" y el nombre del tamaño (progresión define la escala de niveles).
Los niveles altos (ej. ≥5 "hoguera") suman `levelUp(1)` y una columna de chispas. Requiere `Pit.build(animated)` (de física/progresión) o que yo tweenee las imágenes de `pit.stones` antes de llamarlo.

## 5. Dónde tocaría

- **FireAudio**: `rotateTick(weight)`, `tock(weight, tone)`, `structure(kind)`, `overfull()`, `grow(level)`; ampliar `setFire(intensity, air, draft)`.
- **Fire**: `structureBurst(pit, kind)`, `overfullPoof(pit)`, `pit.draft` en el cálculo de luz/emisión, evento `pit:full`.
- **Log**: `pop(strength)` ya sirve; agregar `lastTock` y un `nudge()` (hacer brillar el contacto).
- **GameScene**: tick de rotación en `update` (mientras `this.drag`), caso "contacto suave" en `setupCollisions`, `playGrow` desde `buy`/`applyUnlock`, hook a `structure` y `pit:full`, feedback previo al arrastrar sobre un pozo lleno.

## Pedidos a otros
- **Física**: eventos `structure {kind, pit, quality}` y valor `pit.draft`; avisar si rotar tiene input propio (rueda/tecla/gesto) para atar los ticks.
- **Progresión**: nombre de cada tamaño y si descubrir estructuras da logro/bonus.
- **UI**: nada obligatorio; opcional un toast de "tiraje" si el jugador lo pide.

Resumen: (1) feedback de material en cada gesto (tick al rotar, tock al apoyar) y un solo momento grande por estructura; (2) el buen tiraje se nota en llama alta/limpia + rugido claro vs humo y siseo; (3) capacidad con aviso gradual sin rechazo, y agrandar el pozo como secuencia épica de 1,6 s.
