# Informe de arte — ciclo 1

Archivo tocado: `js/gfx/textures.js` (único). `node --check` OK; carga en navegador sin errores de consola. Todo se genera una vez al arrancar.

## Cambios
- **Leña** (`drawLog`/`drawCone`): cuerpo cilíndrico con luz arriba y sombra abajo, surcos ondulados de corteza, grietas, nudos con aro de volumen, ramitas cortadas en las ramas, cortes con anillos y grieta radial en seca/troncos. La **húmeda** ahora es más oscura y verdosa, con musgo y gotas. **Piñas**: escamas con sombra/luz y gotas de resina.
- **Piedras** (`stone0..3`, mismos tamaños): volumen, granulado, grieta, musgo y sombra de contacto.
- **Partículas** (mismos tamaños/claves): `flame` es una gota con núcleo claro (64×86, igual que antes), `spark` con cruz de destello, `smoke` es una nube irregular de volutas. Siguen siendo blancas (se tiñen).
- **Fondo** `bg`: estrellas con color y destellos, vía láctea tenue, luna con halo, cráteres y fase, dos cordilleras con niebla, tres capas de pinos con bruma atmosférica, suelo con tierra, hojas, piedritas y pasto.

## Claves nuevas
- Capas con transparencia, todas W×H (1280×720): `bg-sky` (opaca), `bg-hills`, `bg-trees-far`, `bg-trees-mid`, `bg-trees-near`, `bg-ground`. `bg` las compone, así que nada cambia para quien ya usa `bg`.
- `sky-dawn` (1280×720): cielo de amanecer (índigo → rosa → oro, sol bajo y nubes alargadas). Cubre solo y=0..650.
- `spark-streak` (8×24): chispa alargada, punta brillante abajo.

## Pedidos para el ciclo 2
1. **Parallax** — `js/scenes/GameScene.js`, donde se crea `this.add.image(0, 0, 'bg')` (línea ~31): reemplazar por las capas `bg-sky`, `bg-hills`, `bg-trees-far`, `bg-trees-mid`, `bg-trees-near`, `bg-ground` (depth 0..0.5) y moverlas apenas con el mouse/cámara (p. ej. ±4/8/14 px). Para eso las capas de árboles deberían escalarse ~1.03 y centrarse para no mostrar bordes. Alternativa barata: neblina animada con un tween de alpha sobre `bg-trees-far`.
2. **Amanecer** — `GameScene.js` → `playDawn(info, done)` (línea ~684): agregar `this.add.image(0,0,'sky-dawn').setOrigin(0).setDepth(0.1).setAlpha(0)` y hacer un tween de alpha 0→0.85 durante el amanecer. Como `bg-sky` es opaco, hay que mostrarlo encima del cielo y debajo de las capas de árboles (por eso el pedido 1 permite intercalarlo; sin parallax quedaría tapando todo el `bg`, y habría que ponerlo con blend `ADD` o alpha ≤0.5 sobre `bg`).
3. **Chispas alargadas** (dopamina) — `js/objects/Fire.js`, emisor `this.sparks` (línea ~56): usar `spark-streak` con `rotate` según ángulo de velocidad (`rotate: { onEmit/onUpdate }`) para chispas con estela.
4. **Estrellas titilantes** (opcional) — requiere separar una textura de estrellas del cielo; no lo hice para no inflar la carga.

## Ciclo 2
Archivo tocado: `js/scenes/GameScene.js` (create, update, playDawn, updateNight). `node --check` OK; carga sin errores.
- **Parallax**: `bg` reemplazado por capas: `bg-sky` (depth 0), `sky-dawn` (0.05, alpha 0), `bg-hills` (0.1), `bg-trees-far` (0.2), `bg-trees-mid` (0.3), `bg-trees-near` (0.4), `bg-ground` (0.5, fijo). Colinas y árboles escalados 1.04 y desplazados según `activePointer.x` (amplitud 4/8/13/20 px, suavizado); sin movimiento si `this.fx` es false. La textura `bg` sigue existiendo pero ya no se usa.
- **Amanecer**: `playDawn` (solo con `fx` y éxito) sube `dawnSky` a alpha 0.9 en 1800 ms sin tocar tiempos ni sonidos; vuelve a 0 en `updateNight` en los eventos `dusk`/`start` (2.5 s; instantáneo sin fx).
- No hice estrellas titilantes. El frío sigue con `coldTint` (overlay global), sin duplicar.
- Sin verificar visualmente el amanecer (requiere pasar una noche).

## Ciclo 3
Archivo tocado: solo `js/gfx/textures.js`. `node --check` OK; probado forzando `dawnSky.alpha = 1` desde `window.fogata.game`.
- **`sky-dawn` rehecho** (misma clave, 1280×720): gradiente azul profundo → violeta → rosa → naranja → oro en el horizonte (y≈540, a la altura de las colinas), sol naciente con halo ancho y nubes alargadas iluminadas por abajo. Transparente de y≈540 a 610 hacia abajo, así que no lava el suelo ni el estante. Ya no es un velo uniforme: se ve el brillo dorado/rosa detrás de los árboles.
- **Clave nueva `dawn-rays`** (1280×720, aditiva): 14 rayos desde el sol naciente (x≈435, y≈546).
- **Cómo usarla en `playDawn`** (`GameScene.js`, junto a `this.dawnSky`): crear en `create()` `this.dawnRays = this.add.image(0,0,'dawn-rays').setOrigin(0).setDepth(0.06).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0)`; en `playDawn` tween de alpha 0→0.6 (1800 ms, igual que el cielo) y en `dusk`/`start` de `updateNight` volver a 0 igual que `dawnSky`. Quedan debajo de las colinas (depth 0.1), así que no tocan árboles ni suelo.

## C4-A (fase 1: texturas)
Archivo tocado: solo `js/gfx/textures.js`. `node --check` OK; verificadas en el navegador (todas existen y se ven bien; carga sin errores). 16 texturas nuevas, todas chicas (≈ +25 ms estimados); se generan una vez.

### Claves nuevas
| Clave | Tamaño | Uso |
|---|---|---|
| `hewn0`, `hewn1` | 56×38, 44×30 | piedra trabajada (tier 2-3 = size 2-3); `0` = piedra grande lateral/labio, `1` = labio chico |
| `adobe0`, `adobe1` | 56×38, 44×30 | barro cocido (tier 4-5 = size 4-5) |
| `ritual0`, `ritual1` | 56×38, 44×30 | piedra azulada ceremonial (tier 6-7 = size 6-7) |
| `wall-stone`, `wall-adobe`, `wall-ritual` | 64×64 tileable | pared baja: `scene.add.tileSprite(x, GROUND_Y - wallH/2 + 6, ancho, wallH, key)` |
| `post` | 28×150 | poste ceremonial con runa tallada (size 6-7) |
| `rune-glow` | 24×24 blanca | runa luminosa, ADD + tint, encima del poste/pared ceremonial |
| `pit-ghost` | 128×128 blanca | contorno punteado + velo del volumen; estirar a `half*2 × (wallH+altura)` y teñir |
| `bed-ring` | 256×48 blanca | borde elíptico del lecho = marca de carga; teñir 0xffa040 → 0xff3010 |
| `pit-bed` | 256×40 | lecho oscuro con grava bajo la leña, estirar a `half*2 × ~30` |
| `load-mark` | 20×14 blanca | muesca triangular (tope) sobre la pared/labio; mismo tinte que `bed-ring` |
| `shadow-soft` | 64×16 | sombra de contacto bajo un leño (alpha ~0.35) |

Tiers existentes `stone0..3` siguen para size 0-1. Los cortes con anillos de la leña ya estaban en `log-*`; no se tocaron.

### Código para `Pit.build()` (fase 2, aproximado)
```js
import { sizeOf } from '../data/sizes.js';
const TIER = [['stone', 'stone'], ['stone', 'stone'], ['hewn', 'wall-stone'], ['hewn', 'wall-stone'],
              ['adobe', 'wall-adobe'], ['adobe', 'wall-adobe'], ['ritual', 'wall-ritual'], ['ritual', 'wall-ritual']];
// dentro de build(), tras limpiar:
const sz = sizeOf(this.size), [style, wallKey] = TIER[this.size];
const big = style === 'stone' ? 'stone0' : `${style}0`, small = style === 'stone' ? 'stone2' : `${style}1`;
const r = 20 + this.size * 2;
for (const side of [-1, 1]) {                        // piedras laterales (cuerpo físico igual que hoy)
  const sx = this.x + side * (this.half + r - 6);
  this.stones.push(scene.add.image(sx, GROUND_Y - r + 8, big).setDisplaySize(r * 2.8, r * 2).setDepth(22));
  this.stones.push(scene.add.image(sx + side * r * 1.4, GROUND_Y - 6, small).setDepth(22));
}
// pared baja detrás del labio (solo size >= 2): protege la leña y marca el borde
if (this.size >= 2) {
  for (const side of [-1, 1]) {
    const wx = this.x + side * (this.half - 6);
    this.stones.push(scene.add.tileSprite(wx, GROUND_Y - sz.wallH / 2 + 6, 22, sz.wallH, wallKey).setDepth(21));
  }
}
// labio (igual que hoy, con small/`${style}1` alternando stone2/3 en el tier básico)
// lecho
this.stones.push(scene.add.image(this.x, GROUND_Y + 2, 'pit-bed').setDisplaySize(this.half * 2, 30).setDepth(9));
// postes ceremonial (size >= 6) con runas
if (this.size >= 6) for (const side of [-1, 1]) {
  const px = this.x + side * (this.half + r * 2 + 14);
  this.stones.push(scene.add.image(px, GROUND_Y - 70, 'post').setDepth(23));
  this.runes = (this.runes || []).concat(scene.add.image(px, GROUND_Y - 100, 'rune-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff9a40).setAlpha(0.2).setDepth(24));
}
// marca de carga: ring + dos muescas, teñidos según load/capacity
this.loadRing = scene.add.image(this.x, GROUND_Y + 4, 'bed-ring').setDisplaySize(this.half * 2.1, 26).setDepth(11).setAlpha(0.35);
this.ghost = scene.add.image(this.x, GROUND_Y - sz.wallH * 1.5, 'pit-ghost').setDisplaySize(this.half * 2, sz.wallH * 3).setDepth(8).setAlpha(0);
```
Update (cada frame o 4 Hz): `ratio = load / capacity`; `color = Phaser.Display.Color.Interpolate.ColorWithColor(c(0xffa040), c(0xff2810), 100, Math.min(1, Math.max(0, (ratio - 0.6) / 0.5)) * 100)`; `loadRing.setTint(...)` y `setAlpha(0.25 + 0.6 * clamp(ratio - 0.5))`. `ghost` aparece (alpha 0.5) solo mientras se arrastra leña sobre el pozo. Las `runes` de size ≥ 6 suben su alpha con `intensity`. Las piedras que no destruya `build()` (`this.runes`, `loadRing`, `ghost`) hay que destruirlas en `build()` y `destroy()`.

### Sombra de contacto (Log.js / Fire.js, de física)
Un `shadow-soft` por leño en reposo (`depth` 18, alpha 0.35, `setScale(l.length / 64, 1)`, mismo ángulo y posición `+3px` abajo), que se oculta mientras se arrastra. Distingue un tipi (leños inclinados con sombra corrida) de un montón.

## C4-A fase 2 (Pit.js)
Archivo tocado: solo `js/objects/Pit.js`. `node --check` OK; sin errores de consola. Probado forzando `setSize` + `layoutPits()` con tamaños 0, 1, 2, 4, 6 y 7 (2–3 pozos); cada rebuild recrea sin dejar objetos (las piedras por tier cambian de 19 a 32 imágenes). Los 8 tamaños no los vi uno por uno en pantalla (el screenshot del navegador sale con retraso): vi 2, 4 y 6 juntos.
- **`TIERS`** (arriba del archivo): `[estilo de piedra, textura de pared]` por tamaño → 0-1 `stone*` + `wall-stone`; 2-3 `hewn*`; 4-5 `adobe*` + `wall-adobe`; 6-7 `ritual*` + `wall-ritual`.
- **`build()`** ahora dibuja: lecho `pit-bed` (depth 9), `bed-ring` (11, marca de carga), `pit-ghost` (8), piedras laterales y labio por tier, pared visual con `tileSprite` (depth 21, sobre el cuerpo físico, sin tocarlo), muesca `load-mark` sobre cada pared (31) y, en tamaño ≥6, un `post` con `rune-glow` (ADD) a cada lado. Todo va en `this.stones` (se destruye en el rebuild) y las refs `ring/ghost/marks/runes` se recrean. `wallGfx` y `drawWalls` eliminados.
- **`tick()`** (escucha `postupdate` de la escena, se desengancha en `destroy()`): tiñe `bed-ring` y muescas de naranja a rojo según `loadRatio` (0.55→1.1) y pulsan sobre 1; el `ghost` aparece mientras `scene.drag` es verdadero y el puntero está cerca del pozo; las runas suben con `intensity`.
- No hice la sombra de contacto por leño (es de `Log.js`/`Fire.js`; la textura `shadow-soft` está lista).
- Pendiente: los postes (half+38) y el labio se pisan visualmente con el pozo vecino cuando el layout los junta (separación ≤110 px). Si molesta, física reduce la separación mínima o el arte acorta el alcance de los postes.

## C4-B (Pit.js)
Archivo tocado: solo `js/objects/Pit.js`. `node --check` OK; sin errores. Vi en pantalla los tamaños 0 y 7 (`wallH` 69 y 144); los tamaños 3 y 5 no los vi uno por uno.
- El dibujo ya leía `this.wallH` (getter ×1,5): tileSprite, muescas de carga y pared acompañan sin desfasaje. El `ghost` ahora mide `wallH*2.2+40` (antes ×3, llegaba a 470 px).
- **A9 (móvil)**: `compact = matchMedia('(max-height: 520px), (max-width: 760px)')` → paredes con alpha 0,6 (0,88 en desktop, más tinte gris claro para bajar el contraste), postes ceremoniales a escala 0,5 y alpha 0,7 (desktop: escala 0,78, antes 1). Se decide al construir; si el jugador rota el dispositivo, se aplica en el próximo `build()`.
- Cabaña/tipi contra paredes altas: las paredes son solo laterales y ahora translúcidas (alpha 0,88), así que la leña apoyada se sigue viendo. No probado con una cabaña real armada.

## C4-C fase 1 (textures.js): ranuras magnéticas
Texturas nuevas, todas **blancas** (se tiñen con `setTint`). Sin tocar claves previas. `node --check` OK; no se vio en pantalla (GameScene todavía no las usa).

| Clave | Tamaño | Uso |
|---|---|---|
| `slot-ghost` | 128×32 | Silueta fantasma: cápsula con relleno tenue, borde punteado y veta. |
| `slot-ghost-hi` | 128×32 | Resaltada: borde claro con brillo cálido y relleno dorado. |
| `slot-pin` | 16×16 | Marca de apoyo: punto con halo y anillo, donde se apoya la pieza. |
| `shadow-contact` | 128×16 | Sombra de contacto de leña encajada (plana abajo, bordes suaves). |

**Escala:** `slot.len` y `slot.th` son largo y grosor de la leña. `slot-ghost` → `setDisplaySize(len, th)`, `setRotation(slot.angle)`, origen 0.5. Las tapas se deforman poco (grosor 14–30). Si Phaser ≥3.60 conviene `scene.add.nineslice(x,y,'slot-ghost',null,len,th,16,16,0,0)` y las tapas quedan redondas.
**Tinte por tipo** (en `slot-ghost`; la resaltada va con `slot-ghost-hi` sin tinte o con el mismo tinte aclarado):
- `base`: 0xd9c6a0 (arena)
- `stack`: 0xe8b86a (ámbar)
- `bridge` (cabaña): 0xffa84d (naranja cálido)
- `tipi`: 0x9fd8c8 (verde agua), así se distingue del resto a primera vista.
Alpha sugerido: 0.55 normal; resaltada pulsa 0.8–1.0 (`slot-ghost-hi`, depth encima de la fantasma).
**Marca de apoyo:** `slot-pin` a 0.8–1.0 de escala, tinte 0xfff0c0, uno en cada extremo de apoyo (ranura `bridge`: extremos sobre los dos leños; `base`: bajo la leña en el piso; `tipi`: en el punto de cruce).
**Sombra de contacto:** al encajar (`log:snap`), sprite `shadow-contact` con `setDisplaySize(log.len*0.95, log.th*0.35)`, centrado en `log.y + th/2` (apoyo), rotación de la leña, alpha 0.5, depth justo bajo la leña. Destruir en `log:unsnap`/destruir la leña. Para leña inclinada (tipi) bajar alpha a 0.3.

## C4-C fase 2 (GameScene.js): ranuras con mis texturas
- `updateSlots()` ya no usa `slotGfx` (eliminado). Pools de sprites `slotGhosts`, `slotHi`, `slotPins`, `slotShadows` (helpers `slotPoolGet/slotPoolTrim`: se crean una vez, se ocultan al sobrar; nada se crea ni destruye por frame).
- Cada ranura libre: `slot-ghost` (depth 84) a largo×grosor y ángulo de la ranura, tinte `SLOT_TINT` por tipo (base/stack/bridge/tipi), alpha 0,5. La resaltada baja a 0,25 y suma `slot-ghost-hi` (depth 85, +6 px, pulso 0,6–1,0) y dos `slot-pin` en los extremos de apoyo. La leña arrastrada (depth 20, fuera de la física) no queda tapada por las ranuras pues están sobre ella solo como contorno tenue.
- `updateSlotShadows()` (cada frame, tras `updateSlots`): una `shadow-contact` (depth 19, debajo del sprite de la leña, 20, y de la llama) por cada leña con `log.slot`, no muerta ni en ceniza; pegada al borde inferior; rotada con la leña, y si está inclinada (tipi) se vuelve una sombra corta sin rotar con alpha 0,3. Se oculta al desencajar o quemarse a ceniza.
- Verificado en 127.0.0.1:8080: texturas existen, sombra aparece con `log.slot` simulado en la posición de la leña (depth 19, alpha 0,5) y se oculta al quitarlo; 0 errores. El panel no renderiza (dt=0), así que **el dibujo de las siluetas con un arrastre real no se vio**; el pool de ranuras se probó solo creando un sprite a mano.

## C4-D (visibilidad de siluetas, C6/C7)
- `slot-ghost`: relleno 0,16→0,28; contorno doble (oscuro de 4 px por fuera que lo separa del fondo y de las piedras + punteado casi blanco de 2 px). En escena alpha 0,5→0,8 (resaltada 0,35 para que mande `slot-ghost-hi`).
- `slot-pin`: 16→24 px, núcleo blanco sólido con borde oscuro y halo; escala 1,1 y alpha 0,85–1.
- `shadow-contact`: opacidad 0,65→0,9 en la textura; en escena alto `max(8, th·0,5)` y alpha 0,8 (0,5 en leña inclinada).
- Visto con `game.step()` + `toDataURL()` sobre `<img>` (4 siluetas sintéticas + resaltada con pines + sombra, pozo 0): el contorno se lee sobre el fondo oscuro y la resaltada se distingue claramente. El pin y la sombra se ven pero chicos a tamaño de pantalla; no probé un arrastre real. Puse `state.locked=true` para no tocar el guardado (no modifiqué la partida).

## C5 fase 1 (textures.js): texturas nuevas
Solo `textures.js`. `node --check` OK. Vistas aisladas en una hoja (módulo importado con una escena falsa, sin tocar el juego): llamas teñidas en ADD, piedras, bloques, leña, techo, y los 4 cielos con capas y tintes. Cuando entre en escena (fase 2) falta verlas integradas.

**Llama** (blancas, ADD, `setTint`/`color` del emisor): `flame-a` (recta), `flame-b` (punta curva a la derecha), `flame-c` (a la izquierda), todas 48×120; `flame-lick` 24×60 (lengüeta suelta), `flame-core` 32×56 (núcleo claro, chico y estable). Uso: partículas angostas que suben con vaivén; escala de 0,6 a 1,1 y luego se afina; alterná a/b/c con `frame`-por-textura o varios emisores. `flame-base` 160×220: **colores horneados** (rojo/naranja/amarillo/blanco, 4 lenguas), una por pozo, blend ADD, origen (0.5, 1) en el lecho; animar scaleY 0,9–1,1 y scaleX/skew leve; alpha y escala siguen `intensity`. `flame` (original) sigue existiendo.
**Luz:** `glow-ground` 512×128 (elipse blanca, tintar 0xff9040, ADD) para suelo y piedras: centrar en el lecho, ancho ≈ `half*4`, alpha con `intensity` y parpadeo. `mist` 1280×160 (blanca, alpha 0,15–0,3; teñir según la hora) para bruma de profundidad entre capas. Ya existía `vignette`.
**Leña prendida** (128×32, `setDisplaySize(length, thickness)` y rotación de la leña, sobre el sprite): `log-glow-under` (brillo abajo y en las puntas, tinte 0xff8a2a, ADD, alpha=glowLevel), `log-cracks` (grietas incandescentes, tinte 0xffb050→0xff7a20, ADD, pulso), `log-char0` (carbonizado parcial, normal, alpha 0–1 con el avance de quemado) y `log-char1` (carbón casi total, para brasas). Así el tronco conserva corteza y se ve el rescoldo, en vez de teñirlo todo.
**Pozo:** `stone0..3`, `hewn0/1`, `adobe0/1`, `wall-*` y `post` (mismas claves y tamaños) rehechos: rocas facetadas gris frío con hollín y musgo solo en el filo; sillares biselados; adobe tostado y apagado con paja y hollín; poste con capitel de cuernos y disco, sin triángulo. `load-notch` 14×18 (placa con punta, blanca, tinte naranja→rojo): reemplaza a `load-mark` en los topes. Techo: `roof-plank` 128×18 y `roof-thatch` 128×36 (tileSprite horizontal, alto fijo; ancho = ancho del pozo + margen) y `roof-support` 10×64 (tileSprite vertical, fino) en lugar de la tabla gruesa con dos postes; apoyar el techo a `top - 60` como hoy.
**Ciclo de luz:** cielos completos W×H: `sky-day`, `sky-dusk` (atardecer permanente), `sky-deep` (noche profunda); noche actual = `bg-sky`; amanecer = `sky-dawn`. Capas iluminables en colores de día: `bg-hills-lit`, `bg-trees-far-lit`, `bg-trees-mid-lit`, `bg-trees-near-lit`, `bg-ground-lit`. Se llevan a cada hora con `setTint(layerTint(capa, fase))` (exportada de textures.js; capas `hills|far|mid|near|ground`, fases `day|dusk|dawn|night|deep`) y el cielo con `SKY_KEYS[fase]`. La fase `night` da el mismo color que las capas originales; `deep` es ~55 % de eso. Las capas viejas siguen existiendo. Transiciones: tween de color entre tints (interpolar RGB) y alpha entre cielos.
Costo: ~14 texturas de 1280×720 nuevas (3,7 MB c/u en GPU, ~45 MB) de las que 8 son de fondo; si pesa, se pueden generar a demanda (la capa `-lit` reemplaza a la oscura, no hace falta mantener ambas).
No verificado: la integración en escena y el rendimiento en móvil.

## C5 fase 2 (Fire, Log, Pit, GameScene): texturas en el juego
`node --check` OK en los 5 archivos. Capturas con `game.step()` + `toDataURL()` en `capturas-c5/arte-*` (01 antes de la llama; 03 noche; 04 día; 05 pozo grande con techo al atardecer; 06 atardecer permanente). Partida: no se tocó (`state.locked = true`, localStorage vacío como estaba).

**1. Llama (Fire.js `createEmitters`/`emitFor`/`update`).** Emisores S/M/L pasaron a `flame-lick/b/a` (+ `flamesAlt` con `flame-c` para variar la curva y `flameCore`, el núcleo claro); partículas angostas (scaleX 1,1→0,25, scaleY 1→0,55), alpha 0,27, color crema→naranja→rojo oscuro, nacen sobre el borde superior de la leña (antes cubrían el tronco). Por pozo, una **llama persistente** (`pit.flameBase`, `flame-base`, depth 19, detrás de la leña) cuya escala y alpha siguen `intensity` con vaivén (respeta `motion`). Antes: 3–4 globos naranjas pegados al leño; ahora silueta con lenguas, núcleo claro y puntas sueltas. Costo medido (`game.step` + `readPixels`, tamaño 7, 52 leñas ardiendo — tope del juego): **2,6 ms/cuadro**; referencia del tester 3,6 ms con 72 leñas (no es la misma carga; no tengo el "antes" en la misma prueba).
**2. Luz del mundo (Pit.js + Fire.update).** Por pozo: `groundGlow` (`glow-ground` sobre el suelo, depth 7), `stoneGlow` (muy suave sobre piedras, depth 31) y `treeGlow` (brillo cálido detrás de los árboles cercanos, depth 0,45), todos con `intensity`, parpadeo y `cold`. La luz grande `p.light` se bajó (alpha máx 0,5 y escala menor) porque lavaba todo. Con cielo claro la luz aditiva se atenúa (`scene.skyBright`).
**3. Leña prendida (Log.js + `Fire.syncLog`).** El brillo de los troncos pasó a `log-glow-under` (cara inferior y puntas); se crean al arder `charImg` (`log-char0/1`, alpha según el avance de quemado) y `crackImg` (`log-cracks`, pulsa en brasas); el tinte global del tronco es más suave (0x3a2e28, ×0,8). Las piñas conservan el brillo anterior.
**4. Pozos y techo.** Piedras, bloques, adobe y postes ya vienen de la fase 1. `load-notch` reemplaza al triángulo de las paredes; runas reubicadas en el nuevo poste. Techo: ahora puntales finos + viga de tablas + paja (`roof-support/plank/thatch`), alto `wallH + 115 + 9·tamaño` y ancho del pozo +28 (antes una chapa gigante a `top - 70`); `roofY` sigue siendo un getter (no lo usa nadie).
**5. Ciclo de luz (GameScene `lightTarget/updateLight`).** Cielos `bg-sky` (noche), `sky-deep`, `sky-dusk`, `sky-day` apilados con alpha normalizado; capas `-lit` con `layerTint` ponderado por fase. Sin noches desbloqueadas: atardecer permanente. Con noches: día → atardecer (30 s: día→dusk→noche) → noche que se vuelve profunda en el primer tercio → (el amanecer lo sigue poniendo `playDawn` con `dawnSky`, que se apaga durante los primeros 40 s del día). Pesos suavizados (dt·0,9). Vistos: atardecer, día, noche profunda (noche 2). **No visto**: amanecer con `playDawn` real y el paso noche→amanecer→día en vivo.
**Etiqueta "Noche despejada":** la escena ya manda `skyLabel` en `ui.update` ('🌙 Noche despejada' / '☀️ Día despejado' / '🌇 Atardecer despejado'). Falta **una línea en `Ui.js` `updateForecast`** (no es mío en este turno): `fc.textContent = v.skyLabel || '🌙 Noche despejada';`.
**6. Fondo:** el cielo y las capas tienen la bruma pintada; `mist` (textura) no se usó (no hizo falta). La viñeta ya existía.
**Ajustes por lo que se vio:** la primera versión quemaba a blanco (muchos ADD sobre un cielo claro) y el tronco parecía de vidrio: bajé el alpha de partículas, el de la luz grande y el brillo del leño, y subí el origen de las llamas.
**No visto / sin verificar:** táctil y móvil real, modo `fx` apagado y reduce-motion (solo leí el código: `fxScale`/`motion` se respetan), lluvia con la nueva luz, dos pozos a la vez, el estante y la UI sobre el nuevo fondo (HUD sobre cielo claro de día puede perder contraste: revisar con UI), tipi/cabaña con las nuevas piedras.

### C5 fase 2: memoria de fondos
Medido en el navegador (suma de texturas de más de 0,5 MB, RGBA):
- **Antes de C5** (juego original): 10 texturas de 1280×720 (`bg-sky`, `bg-hills`, `bg-trees-far/mid/near`, `bg-ground`, `bg`, `sky-dawn`, `dawn-rays`) + `vignette` = **≈ 40,6 MB**.
- **Mi fase 1 tal como la dejé**: 18 de 1280×720 + `mist` = **≈ 67 MB** (el "45 MB" del informe estaba mal calculado).
- **Ahora**: **29 MB**. Se retiraron `bg-hills`, `bg-trees-far/mid/near`, `bg-ground`, `bg` (compuesta) y `mist`, y las funciones de dibujo que quedaban sin uso (el tinte `night` de las capas `-lit` reproduce esas capas). Los cielos de gradiente suave (`sky-day`, `sky-dusk`, `sky-dawn`, `dawn-rays`) y `vignette` pasaron a **640×360** (`halfTex`, la escena los muestra con `setScale(2)`); quedan a 1280×720 solo `bg-sky` y `sky-deep` (tienen estrellas de 1 px), las 4 capas de árboles/colinas y el suelo `-lit`.
- Verificado en pantalla (día): sin errores de consola y sin diferencias visibles. Si hace falta bajar más: las capas `-lit` pueden ir a 960×540 con `setScale(1,333)`, perdiendo algo de nitidez en el pasto del suelo.

## C5 fase 2, segunda pasada
`node --check` OK (Fire, Pit, GameScene, textures, Ui). Capturas en `capturas-c5/arte2-*` (01–03 pozo 5 en atardecer / noche profunda / día; 04–05 pozo 7 de día y de noche; 06 pozo 7 con 33 leñas ardiendo; 07 pozo chico al atardecer). Todo visto con `game.step` + `toDataURL`.
1. **Fuego grande quemado a blanco.** El cuerpo de la llama ya no es ADD: `pit.flameBases` (1–4 sprites `flame-base` por pozo según `half`, mezcla NORMAL, color pintado, depth 19) lleva la silueta; las partículas ADD son un complemento. El brillo no depende de la cantidad: la emisión por pozo se topa en `5 + 2·size` leñas (`cap` en `emitFor`), el alpha de las partículas bajó (0,27; núcleo 0,18) y con cielo claro se apagan (`bright`: día/atardecer). La luz grande `p.light` bajó a alpha máx 0,3. Visto en pozo 5 y 7, atardecer/noche profunda/día: lenguas naranjas y rojas con forma, sin masa blanca.
2. **Leña de vidrio.** Causa real: el brillo `log-glow-under` (ADD) velaba todo el tronco. Ahora la textura solo ilumina el borde inferior y las puntas; el tronco ardiendo tiene un tinte más oscuro (hasta 0,85 hacia 0x2a201c); el grueso de las llamas (L/M) quedó detrás de la leña (depth 19,5) y delante solo las lengüetas S y el núcleo (depth 40, 8 % de probabilidad). Queda un borde claro tenue en algunos troncos; no me convence del todo, es el costado del `crack`/glow.
3. **Árboles translúcidos de día.** Había dos causas: el sombreado de cada pino con `source-atop` sobre toda la capa (bandas verticales fantasma sobre los vecinos) y las franjas de bruma translúcidas. Ahora cada pino se dibuja en su lienzo, con bruma solo dentro de su silueta, las capas son opacas, la perspectiva atmosférica va en el color (colinas y fondo más claros, cercanos más oscuros) y una loma del color de la capa tapa los troncos de la base (no quedan troncos sueltos sobre el suelo).
4. **Orbes.** Son los chispazos coleccionables: `orb` ahora es un destello de 4 puntas con halo mínimo, y nacen más chicos (escala 0,5–0,85 en vez de 0,8–1,4).
- `Ui.js` `updateForecast`: `fc.textContent = v.skyLabel || '🌙 Noche despejada';` (única línea).
- Además: el brillo de luz de los árboles se atenúa de día.
**Costo** (`game.step` + `readPixels`, 1280×720, pozo 7, noche): **2,0 ms/cuadro con 33 leñas ardiendo** (no pude sostener 52–72: se consumen/caen); referencia anterior de esta sesión, mismo tamaño y 52 leñas con la llama de la primera versión: 2,6 ms; baseline del tester: 3,6 ms con 72.
**Dudas / no visto:** tras `setSize` con el panel pausado los cuerpos de llama no se mueven (por diseño, igual que las partículas); la llama de un pozo muy ancho puede verse algo simétrica (3–4 conos); móvil y táctil sin ver; `fx` apagado y reduce-motion solo leídos; dos pozos a la vez sin ver; el borde claro de los troncos en brasas.
