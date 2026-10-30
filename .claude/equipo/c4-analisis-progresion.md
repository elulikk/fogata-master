# C4 — Análisis de progresión: escala de tamaños de fogata

Hoy: `size` 0–3 (`agrandar_i`, max 3, 320/950/2600 calor + 2/4/6 troncos). Cada nivel da `half` +10 px, capacidad ×(1+0,45·size) (base 16.000 de área: ≈ 2 troncos o 5 secas o 10 ramas), `calorMult` 1+0,5·size. La intensidad es `min(1,4; heat/3,5)`: **con ~3 leños ya está al tope**, así que agrandar solo multiplica y la capacidad no "se gasta". Eso explica que el pozo se llene (poca capacidad) pero a la vez que no haya motivo para llenarlo mucho.

## 1. Escala propuesta (8 tamaños)
`hs` = escala de calor (sección 1b). Huella = ancho que ocupa en el terreno (2·(half+piedra+10)).

| # | Nombre | Cap (×base) | Aire* | half | Huella | Mult | Costo (calor + troncos) | Llega (calor total) | Qué cambia al jugar |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Fogatita | 1,0 | 1,0 | 90 | 240 | 1,0 | — | 0 | ramas y secas, apilar chico |
| 1 | Fogata | 1,4 | 1,05 | 100 | 264 | 1,4 | 320 + 2 | ~500 | entran 3 leños cómodos |
| 2 | Fogón | 1,9 | 1,10 | 112 | 292 | 1,85 | 950 + 4 | ~1.500 | primer troncos sin ahogar |
| 3 | Hogar | 2,5 | 1,15 | 126 | 324 | 2,4 | 2.600 + 6 | ~4.000 | pide estructura para rendir |
| 4 | Hoguera | 3,3 | 1,20 | 142 | 360 | 3,0 | 7.000 + 10 | ~10.000 | ahoga con ramas sueltas; troncos |
| 5 | Pira | 4,3 | 1,25 | 160 | 400 | 3,7 | 18.000 + 16 | ~25.000 | necesita 8+ leños; la lluvia pesa |
| 6 | Faro | 5,6 | 1,30 | 180 | 444 | 4,5 | 45.000 + 24 | ~60.000 | casi solo troncos; enciende lento |
| 7 | Ceremonial | 7,5 | 1,35 | 205 | 498 | 5,5 | 120.000 + 36 | ~150.000 | meta de prestigio tardío |
\*Aire = multiplicador sobre `oxygen` (suma al tiraje de cartas), no sustituye la regla de carga.

**1b. Que no sea estrictamente mejor** (cambios en la fórmula, en Fire/GameState):
- **Escala de calor**: `intensidad = min(1,4; heat/(3,5·hs))`, `hs = 1+0,2·size` (el tope de intensidad pide más leña). Con 3 leños: S0 rinde 2,8/s, S7 (hs 2,4, relleno bajo) ~1,4/s.
- **Relleno**: el bonus de tamaño se diluye si está vacío: `calorMult_efectivo = 1+(mult−1)·clamp(carga/(0,5·cap),0,1)`. Un pozo grande a medias rinde casi como uno chico; hay que alimentarlo.
- **Inercia térmica**: umbral de ignición ×(1+0,05·size) (prende más lento) pero el lecho de brasas dura ×(1+0,15·size) y el calor entre leños se mantiene → fogata grande = estable, no ágil.
- **Lluvia y viento**: pozos de más de 3 sin techo reciben lluvia ×(1+0,1·size); techo cuesta `220·(1+0,9·size)` calor + `3+size` troncos.
- Grandes: `oxygen` con carga >75% de la capacidad penaliza más si el apilado es plano (lo mide física; con tipi/cabaña el penal se levanta).

## 2. Un pozo grande vs varios chicos
El **terreno** es un presupuesto de ~1.000 px de huella total (hoy `PIT_SLOTS` fijos 520/820/1100 no sirven: S4+ pisa al vecino). Ejemplos: 3×S3 = 972 (cabe), S7+S7 = 996, S5+S5 = 800, S6+S3+S0 = 1.008 ✗. Calor máximo por huella: S3 0,0207/px, S7 0,031/px ⇒ grande rinde más por terreno pero devora leña y pide atención concentrada; varios chicos reparten el riesgo (si uno se apaga, los otros sostienen la noche) y prenden rápido. Costos de la 2.ª y 3.ª fogata se mantienen (1.000/4.500). Pozos con `x` calculados al comprar/agrandar (distribuidos en el ancho disponible), no fijos.

## 3. Economía de la estructura (tipi / cabaña)
Física detecta la forma; progresión solo paga: estructura válida y estable da **+10% calor y −10% consumo** de leña (tipi) / **+15% calor y −15% consumo** (cabaña), tope **+20%** total y solo mientras la forma se sostiene (si se cae, se pierde). Al ser multiplicativo con tope y ≤ ~+20%, no rompe las metas (hoy una buena atención da 120%; el techo sube a ~140% con estructura perfecta, y las noches 3+ ya traen ráfagas). Se aplica en `rateBreakdown` como "Estructura" y en `mods.fuel`. Las noches **no** cambian de meta por esto.

## 4. Cartas y Cenizas nuevas
- Cartas: **Cantera** (común, max 3: agrandar −10%/nivel), **Chimenea** (rara, max 3: bonus de estructura +50%/nivel y −10% penalización de carga), **Fogonero** (épica, max 2: el relleno pleno se logra con 35% en vez de 50%).
- Cenizas: **Hogar heredado** (max 3: empezás con pozo de tamaño 1/2/3), **Arquitecto** (max 3: +15% bonus de estructura), **Cantera eterna** (max 5: −5% costo de agrandar).

## 5. Migración
Los 4 primeros tamaños conservan índice y significado: `pits[i].size` 0–3 mapea **idéntico** (`bought.agrandar_i` = size). Se sube `data.version` a 3 (migración sin cambios de valores) y `max` de `agrandar` pasa de 3 a 7; `pits[i].x` pasa a derivarse del layout (no se guarda). Rebalancear con las nuevas fórmulas de calor porque S1–S3 pierden ~10–15% a carga baja: compensar con `base` 1,15→1,2 o mult de S1–S3 ligeramente mayores.

## 6. Archivos y funciones
- **nuevo `js/data/sizes.js`**: tabla `SIZES` (nombre, cap, aire, half, huella, mult, hs, costo, requires).
- `js/objects/Pit.js`: `half/capacity/calorMult/top` leen `SIZES`; layout dinámico (`x` por huella).
- `js/data/shop.js`: `agrandar` max 7, costo/gating desde `SIZES`, techo escalado.
- `js/state/GameState.js`: `rateBreakdown` (relleno + estructura), mods de Cantera/Chimenea/Fogonero, versión 3, `recompute`.
- `js/data/cards.js`, `meta.js`: cartas y mejoras nuevas.
- `js/objects/Fire.js` (otro dueño): `intensity` con `hs`, ignición/lecho por tamaño, lluvia por huella.
- `js/scenes/GameScene.js`: `create`/`buy` reubican pozos al agrandar o comprar, rack/estante.
- Después: re-simular noches (`stepNight`) con las nuevas fórmulas.

**Resumen:** escala de 8 tamaños (Fogatita→Ceremonial) con costos hasta 120.000 de calor y un terreno de ~1.000 px que obliga a elegir entre un pozo enorme o varios chicos.
El tamaño pasa a importar por relleno, escala de calor, inercia térmica y lluvia (no solo ×calor); la estructura suma hasta +20% con tope.
Migración trivial (tamaños 0–3 idénticos, versión 3); falta re-balancear nivel 1–3 y re-simular noches.
