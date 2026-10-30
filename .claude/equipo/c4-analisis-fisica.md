# C4 · Análisis de física e interacción

Mundo 1280×720, suelo en y=650. Matter: gravedad 1.1, 10/8 iteraciones (`main.js:52`). Pozos en x=520/820/1100 (`Pit.js:6`).

## 1. Cómo funciona hoy

- **Arrastre** (`GameScene.startDrag`, :307): `worldConstraint` con `pointA` = puntero y `pointB` = offset del agarre (o centro si salió del estante). Rigidez 0.12/0.18/0.24 según peso, `damping 0.08`, `frictionAir 0.04`. Es físico: la leña cuelga del puntero y rota sola por inercia/colisión. **No existe rotación del jugador.** El ángulo que tiene al soltarla es el que le dieron los choques. Al soltar (`endDrag`, :320) se limita la velocidad a 20 y la angular a ±0.35.
- **Agarrar** (`logAt`, :219): distancia punto-segmento al eje de la leña menos el semigrosor, umbral 8 px (24 en touch).
- **"Está en el pozo"** (`Fire.update`, :329): `pit.contains(centro)`, un rectángulo `[x±half, top..bottom]`, `top = GROUND_Y-230-20·size`. Solo cuenta el centro del leño; lo recalcula cada frame. No hay cuerpos de pared.
- **Geometría**: el pozo son solo dos piedras circulares estáticas a los costados (`Pit.build`, :62) y un labio decorativo. No hay fondo ni paredes altas. `half = 90 + 10·size` → ancho 180 a 240.
- **Capacidad** (`Pit.capacity`, :46): `16000·(1+0.45·size)·mods.capacity`. Cada leño aporta `length·thickness`: rama 1500, seca 3250, húmeda 3510, tronco 7350, piña 1156. **Dos troncos ya llenan un pozo chico.** Con `load>1`, `oxygen = max(0.1, 1-(load-1)·1.4)` (:339). Sobrecargar solo baja el aire (llama/humo/brasas ahogadas), nunca impide soltar más. El tope duro es `MAX_LOGS=45` en todo el mundo.
- **Por qué lo que sobra se desparrama y arde fuera**: no hay nada que lo detenga. Las piedras laterales son bajas (radio 20–26) y la leña las rueda. Un leño fuera del pozo (`l.pit=null`) igual recibe calor de vecinos por `segSegDist` (rango 48, `HEAT_RANGE`, :9; corte a 260 px, :355), se enciende y arde con aire `1 + wind·0.3` (:399), o sea **más aire que dentro de un pozo lleno**. El estante está en x 18–232, a ~290 px del pozo 1. Las piedras laterales son el único contacto.
- **Calor entre leños**: continuo por distancia, sin noción de forma. Solo cuenta "el de arriba recibe 1 vs. 0.6" (:361). Posición relativa, ángulo y contactos no importan.
- **Fuego de pozo**: `amb += p.bed ... * (l.y > GROUND_Y-80 ? 1 : 0.35)` (:381). La altura ya pesa un poco (lecho).

## 2. Propuesta de rotación

Mantener el constraint tal cual (el usuario no se queja del arrastre) y **agregar un torque de rotación sobre el cuerpo agarrado**, no un set de ángulo.

- Estado: `this.drag.spin` (velocidad angular objetivo) y `this.drag.aim` (ángulo deseado acumulado).
- Cada `update` (con `drag` activo): `aim += input·ω`; `torque = k·angleDiff(aim, body.angle) - c·body.angularVelocity` → `Matter.Body.setAngularVelocity(body, av + torque·dt)`, con `c` alto para que se asiente rápido sin oscilar. Limitar `|av| ≤ 0.25`. Al soltar, el `endDrag` ya recorta av a ±0.35.
- **Cuando el usuario no rota**: no aplicar torque (aim se resincroniza a `body.angle`), así el comportamiento actual no cambia.
- Entradas:
  - **Rueda**: `this.input.on('wheel', (p,_,_,dy))` → `aim += sign(dy)·15°` (pasos de 15° con interpolación, sin snap seco).
  - **Q / E**: mantener = giro continuo 3 rad/s en aim (`keydown` activa flags, se lee en update). Shift = fino.
  - **Clic derecho**: `pointerdown` con `p.rightButtonDown()` mientras hay drag: gira 45° por clic. Requiere `input.mouse.disableContextMenu()`.
  - **Táctil**: (a) segundo dedo: `this.input.addPointer(1)`; al apoyar el segundo puntero mientras hay drag, rotar según el ángulo entre ambos dedos (gesto de pinza-giro, delta de ángulo). (b) botones en pantalla ↺ ↻ (los pone UI) que aparecen solo con drag activo en touch; mantener = giro continuo. Recomiendo hacer los dos, el (b) primero.
- Agarrar por el extremo vs. centro ya da rotación natural; no tocar.
- Opcional: ayuda de snap suave a 0°/±45°/±60°/90° dentro del pozo (torque extra pequeño cerca de esos ángulos, solo si se mantiene shift o en touch). No imprescindible.

## 3. Propuesta de estructuras

### Detección (barata, en `Fire.update` cada 0.25 s, no por frame)
Para cada pozo: tomar los leños `l.pit===pit` con `shape!=='cone'`, reposo (`speed<0.5`) y `longitud>=100` (descarta piñas y ramas muy cortas o permitir ramas con peso menor). Ángulo del eje `a∈[0,π)`, altura del centro `h=GROUND_Y-y`.
- **Tipi**: ≥3 leños con `|sin a|>0.6` (inclinados ≥37° de la horizontal), con su **extremo alto** a ≤`0.35·half` del eje del pozo (convergencia), y pendientes mezcladas (algunos `a<90°`, otros `>90°`: lados opuestos). `quality = convergencia·(n/6)·simetría`, donde convergencia = 1 − dispersión (std) de x de los extremos altos / `half`, simetría = 1 − |#izq − #der|/n.
- **Cabaña**: ≥4 leños casi horizontales (`|sin a|<0.3`) en ≥2 capas: agrupar por `y` (bins de ~`thickness`), capas adyacentes con ángulos que difieren ≥50° (cruzados), o paralelas alternadas con leños de 90°. En 2D de perfil, una "cruz" real no se puede distinguir de lado; en la práctica es: **capas horizontales apiladas con más de una capa de altura estable**. `quality = min(capas,4)/4 · (leños apoyados sobre otros)/n`.
- **Montón**: lo demás; `quality` = 0.
- **Contactos**: usar los pares de `collisionactive` (o `Matter.Query.collides`) para contar cuántos leños se **apoyan en otro leño** (soporte), clave para cabaña. Guardar en `log.supports` el nº de contactos con otro leño en el último segundo; limpiar en `collisionend`.
- **Estabilidad exigida**: la estructura solo cuenta si lleva ≥1.5 s sin que ningún leño supere `speed 0.5`. Eso evita que algo que se está cayendo premie al jugador (anti-explotación: no sirve soltar cosas que luego se caen).
- Exponer `pit.structure = { type: 'tipi'|'cabana'|'monton'|'ninguna', quality: 0..1, stable: bool, height }`; se suaviza con lerp (`quality += (target-quality)·dt·1.5`) para evitar saltos.

### Estabilidad física necesaria
Hoy `friction 0.7, frictionStatic 1, restitution 0.12, frictionAir 0.012`, chamfer. Falta: (1) **habilitar sleeping** (`enableSleeping:true` en config + `sleepThreshold` 60) para que las pilas queden quietas y no se "calienten" a nivel de jitter; con cuidado de `Body.sleeping` al arrastrar (despertar al agarrar, Matter lo hace con constraints). (2) subir `friction` a 0.85–0.9 solo cuando el cuerpo está dentro del pozo (cambiar al entrar); inclinados apoyados en otros necesitan fricción alta para no deslizarse. (3) densidad: tronco 0.0016 vs. seca 0.001 está bien; no subir restitución. (4) los leños que arden se achican por `setSize` (solo el sprite, no el cuerpo, ver §5) y cambian el equilibrio visual; mejor no tocar y aceptar que el cuerpo mantiene su tamaño.

### Efectos propuestos en el fuego
Todos sobre `pit.structure`, en `Fire.update`:
- **Tipi** (`quality q`): `air_pit *= 1 + 0.30q` (tiraje de chimenea), prende más rápido (`warm` ×(1−0.35q): los leños en pie reciben calor por abajo), pero se **consume más rápido** (`fuel` rate ×(1+0.2q)); mucha llama y luz (`intensity` +10%).
- **Cabaña**: aire parejo (`oxygen` no baja tan rápido con carga: capacidad efectiva ×(1+0.4q)), **dura más** (`fuel` rate ×(1−0.25q)), calor sostenido y mayor lecho de brasas (`bed` +). Prende lento.
- **Montón**: sin bonus; con sobrecarga el ahogo actual.
- **Calor**: calor de salida `heatOut` ×(1+0.15q) para tipi, ×(1+0.1q) cabaña, o dejarlo a progresión. Lo que sí propongo físico: en `amb` el factor "el calor sube" (`0.6/1`) usar ángulo: leños casi verticales por encima del foco reciben ×1.2.
- Hacer que tipi y cabaña **dependan del tamaño de pozo** (tipi solo con half ≥100, cabaña con half ≥ 110) alinea con el eje de tamaños.

## 4. Capacidad y desborde

- **Hacer visible el límite**: línea de brasa/piedras con medidor `loadRatio` (0..1.0+) que dibuja arte sobre el labio del pozo (`fire.pits[i].loadRatio` ya existe, `Fire.js:338`), y un contorno "ghost" del volumen en el que cabe la leña. El borde se pone naranja→rojo al pasar de 0.85→1. Con touch no hay hover, mejor siempre visible.
- **Más capacidad**: subir `BASE_CAPACITY` a ~30000 (≈4 troncos de entrada) y escala por tamaño más agresiva (ver abajo). Hoy 2 troncos llenan; con 4 la cabaña/tipi es posible.
- **Qué hacer con lo que no entra**, mi recomendación en capas:
  1. **Paredes físicas** del pozo (cuerpos estáticos rectangulares bajos, `isStatic`, altura ~60 px, por encima del labio) que contienen la leña dentro: los cuerpos se crean en `Pit.build` junto a las piedras actuales. Combinadas con una **abertura en el techo** (nada), la leña que cae dentro rebota adentro y no rueda a los costados.
  2. Si `loadRatio > 1.15` y se suelta otra leña: **rebota** (impulso lateral hacia afuera, no hacia el estante) y se marca `l.overflow = true`.
  3. Un leño `overflow` o fuera de todo pozo **no puede prender** (`Fire.updateLog`: `amb` de otros leños se corta si `!l.pit` y l está en `state==='cruda'`; solo fósforo/pedernal lo prenden), y si ya ardía y toca el suelo fuera del pozo se **apaga a brasa/ceniza** en ~1.5 s (`toEmbers(l,true)`). Esto resuelve B21.
  4. Al soltar fuera de pozo y estante > N segundos sin tocar nada: **vuelve al estante** (`state.add(key,+1)` + destroy con tween) si sigue cruda y `speed<0.3`. Evita basura y la saturación de `MAX_LOGS`.
- **Escala de la geometría con el tamaño**: `half = 90 + 10·size` con max 3 (240 ancho). Para una escala larga (p. ej. 8 niveles) propongo `half = 80 + 22·size` hasta ~250 (ancho 500) y `top` más alto con pared que crece (`wallH = 50 + 12·size`). **Conflicto de layout**: slots en 520/820/1100 con espaciado 300/280; un pozo grande se pisa con el vecino (half 250 + stones ≈ 290 de radio). Hace falta que la escena reubique los pozos con `PIT_SLOTS` dependiente del tamaño o limite el tamaño con varios pozos (decisión de progresión: "una hoguera enorme" mejor sin vecinos; o repartir con layout dinámico).
- Capacidad: `BASE·(1+0.7·size)` (más superficie y volumen), aire propio: `air bonus = 0.05·size`.

## 5. Riesgos de rendimiento y estabilidad

- `Fire.update` es O(n²) (:350); con 45 leños son ~1000 pares, ok. Si la capacidad sube y MAX_LOGS también (>80) conviene una cuadrícula espacial o limitar a pares con `heatOut>0` (ya corta rápido). Detección de estructura a 4 Hz, no cada frame.
- **El cuerpo no se achica** cuando el sprite se consume (`Log.setSize` solo escala sprite/glow, :80), así que el cuerpo mantiene su hitbox; las pilas armadas no colapsan al arder, pero el humo visual y el cuerpo divergen. Dejarlo así por estabilidad; si se quisiera, `Body.scale` hace saltos de contacto y rompe pilas.
- Sleeping con constraints de arrastre y `Body.setStatic`: probar bien al agarrar un leño dormido de una pila (debe despertarlo y a los apoyados).
- `Body.setAngularVelocity` cada frame no es lento; no usar `setAngle` (teletransporta y atraviesa).
- Posible tunneling con leños finos veloces: las ramas (15 px) con velocidad 20 ya están limitadas; no subir el tope de velocidad.
- Más paredes/pozos = más estáticos (3 pozos × ~6 cuerpos): despreciable.
- Guardado: `pit.structure` y flags de overflow son estado de runtime, no van a `data`.

## 6. Archivos y funciones que tocaría

- `scenes/GameScene.js`: `setupInput` (rueda, Q/E, clic derecho, segundo puntero), `startDrag`/`endDrag`/`update` (torque), manejo de `overflow` y devolución al estante, `collisionstart/active/end` (contactos).
- `objects/Pit.js`: `build` (paredes físicas), `half`/`top`/`capacity` con nueva escala, `structure`, anillo/medidor de carga.
- `objects/Fire.js`: `update` (detección de estructura a 4 Hz, efectos sobre aire/prendido/consumo), `updateLog` (no prender si `overflow`, apagar fuera de pozo).
- `objects/Log.js`: fricción dinámica dentro/fuera, `overflow`, `supports`.
- `main.js`: `enableSleeping`.
- Nuevo `utils/structure.js` (detección pura, testeable).

**Pedidos**: Progresión: escala larga de tamaños (n niveles, costos, `PIT_SLOTS` dinámicos o tope por nº de pozos), `BASE_CAPACITY`, bonus numéricos de §3. Dopamina: sonido/chispas al "armar" tipi o cabaña (quality > 0.6) y al rebotar overflow. UI: botones ↺ ↻ en touch, tooltip de rotación (rueda/Q/E), indicador de estructura y tamaño del pozo, medidor de carga. Arte: paredes y labio del pozo por tamaño, contorno ghost del volumen, borde de carga, apagado de brasa fuera del pozo.
