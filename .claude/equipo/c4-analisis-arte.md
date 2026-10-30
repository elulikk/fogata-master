# C4 — Análisis de arte: pozos por tamaño y leña acomodada

## Hoy
`Pit.build()` pone 2 piedras grandes físicas a los costados (`stone0` estirada + `stone2`), un labio de piedras chicas (`stone2/3`) al frente (depth 30) y un óvalo de ceniza (`drawAsh`). El tamaño solo cambia `half` (90+10·size), el radio de las piedras (+2/nivel) y la cantidad de piedras del labio. **Todos los tamaños se ven igual, solo más anchos.** No hay lecho visible (solo el glow aditivo `bedGlow`) ni indicio de capacidad. Ojo: los slots `PIT_SLOTS` están a 280–300 px, así que `half` > ~130 (size ≥4) se pisa con el vecino; la escala larga necesita menos pozos simultáneos o slots dinámicos (decisión de progresión/física).

## 1. Escalones propuestos (8)
| # | Nombre | half | Look |
|---|---|---|---|
| 0 | Anillo chico | 90 | Piedras sueltas, tierra pelada con hollín |
| 1 | Anillo medio | 100 | Más piedras, 2 filas, algunas con musgo |
| 2 | Pozo | 120 | Hoyo hundido: borde de tierra oscura + piedras grandes apiladas en 2 alturas |
| 3 | Pozo grande | 140 | Piedras de 3 tamaños, lecho de brasas con grava |
| 4 | Brasero de piedra | 150 | Muro bajo de piedras calzadas (mampostería), borde superior claro |
| 5 | Fogón de barro | 170 | Base de barro cocido con grietas y borde enrojecido por el calor, boca de arco |
| 6 | Fogón con chimenea | 190 | Barro + piedra, lomo ceniciento, tiraje alto |
| 7 | Hoguera ceremonial | 220 | Plataforma de piedras en círculo con 4 postes/tótems a los lados, runas claras que brillan con el fuego |

Lenguaje: de tierra y piedra suelta (0-3) a obra (4-6) a monumental (7); a más tamaño, más calidez de materiales y marcas de uso (hollín, color rojizo).

## 2. Leña acomodada: que se lea
- Los cortes con anillos ya existen en `log-seca/humeda/tronco` (2 extremos). Para rotación libre no hace falta nada más: el sprite gira y los anillos se ven. Mejora barata: **cortes más contrastados** (anillo exterior más claro, centro oscuro) y la **punta clara de la rama** también en el otro extremo.
- **Sombra de contacto entre leños**: el sprite ya trae sombra abajo, pero entre leños apilados no hay oclusión. Opción en `Log.js`/Fire (no textura): un sprite `shadow-soft` (nuevo, óvalo oscuro suave 64×16, ~0 costo) bajo cada leño en reposo, depth justo debajo, alpha 0.35, con rotación del leño. Hace que un tipi (leños inclinados apoyados) se lea distinto de un montón (leños planos y sombra corrida).
- Un **leño apoyado** (inclinado contra otro) podría mostrar un borde de luz cálida del lado del fuego: tinte aditivo `log-*` ya se usa para brasa (`glow` en Log.js), no hace falta textura nueva.

## 3. Límite de capacidad en el mundo
Que el borde del lecho "diga" hasta dónde se puede cargar:
- **Marca en las piedras**: dos piedras claras/hendidas (`stone-mark`) en el labio a ambos lados del ancho útil; cuando la carga se acerca al tope, pulsan en rojo cálido (tinte + alpha, sin textura nueva).
- **Borde del lecho**: anillo de tierra quemada elíptico (`bed-ring`, textura) del ancho exacto de capacidad, apenas visible; al llenarse sube su alpha y se enrojece. Es el equivalente visual de "lleno".
- Para un tope vertical: línea de brasas tenue (aditiva) a la altura máxima (Fire/Pit, dibujo).
El ancho/alto del indicador sale de `half` y la capacidad en leños que defina física.

## 4. Texturas nuevas, costo y reparto
**Mías (`js/gfx/textures.js`)**, todo generado una vez al arrancar:
- `pit-stone-a..d` (4 piedras extra, 60–90 px, con hollín y rojez por tono): ~1 ms c/u.
- `pit-brick` (mampostería/mur muro, 64×32, tileable) y `pit-clay` (barro con grietas, 64×32): ~2 ms.
- `pit-bed` (lecho oscuro con grava/hollín, 256×48) y `bed-ring` (anillo de capacidad, 256×48).
- `pit-totem` (poste ceremonial, 28×140) + `pit-rune` (runa brillante, 24×24).
- `shadow-soft` (64×16), `stone-mark` (36×28).
Total ≈ 12 texturas, <40 ms en frío (sin impacto notable). Para escalas continuas conviene hacer variantes por **tono** parametrizando `drawStone(…, tone, seed)` (ya existe) en vez de texturas por nivel.

**De otros (`Pit.js`, `Fire.js`, `Log.js`)**: elegir qué textura va en cada escalón, cuántas piedras y dónde (`Pit.build()`), tamaño físico de los cuerpos, indicador de capacidad (alpha/tinte, `Pit.update`/`Fire.update`), sombras de contacto por leño. El arte provee las claves y tamaños; ellos las colocan.

## 5. Archivos y funciones
- `js/gfx/textures.js`: nuevas `drawStone` variantes, `drawBrick`, `drawClay`, `drawBed`, `drawBedRing`, `drawTotem`, y en `createTextures()` las claves de arriba.
- `js/objects/Pit.js`: `build()` (tabla de estilos por `size`: textura de piedra/muro, cantidad, doble fila, postes), nuevo `drawBed()`, indicador de capacidad en el ciclo de update; `half/top` si cambia la escala.
- `js/objects/Log.js` / `Fire.js`: sombra de contacto por leño.
- `js/data/` (un `pitSizes.js` con `half`, `stoneStyle`, `capacity`, nombre) para no hardcodear la escala en `Pit.js`.

Resumen: hoy todos los pozos son el mismo anillo ensanchado; propongo 8 escalones con materiales cada vez más "de obra" y un anillo/marcas que muestren la capacidad.
Texturas: ~12 nuevas, <40 ms, las genero yo; la colocación y el indicador dinámico son de Pit/Fire/Log.
Riesgo a resolver antes: con `PIT_SLOTS` fijos, los tamaños grandes se pisan con el pozo vecino.
