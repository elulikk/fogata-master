# Ciclo 4 — re-prueba de la iteración D (tester)

127.0.0.1:8080 (`?v=c4d`), `MouseEvent` reales + `game.step()`, capturas con el truco `toDataURL` → `<img>`. Partida respaldada (todas las claves de localStorage) y restaurada al final con `state.locked = true`; verificado tras 2,5 s: **0 claves distintas, 0 claves extra**. Sin tocar código. Consola: el único error visible (`Cannot read properties of undefined (reading 'position')`) es el de siempre cuando yo destruyo leños a mano con mi `clear()` a mitad de un cuadro; no apareció jugando normal.

## Resumen
C2, C3, C4, C5, C6/C7 y C9 quedan ✓. **C1 solo a medias**: el tipi tiene un pico de calor +19–20 % (carácter "intenso") pero el calor total por leña es igual que la pila; la cabaña sigue ≈ −10 % (n=2 limpias). Además vi un caso nuevo: a veces **solo una pata del tipi / un leño de la cabaña prende y el resto queda "cruda"** (ignición no se propaga entre leños encajados), que dejó la noche 1 por debajo de la meta.

## Ítems
| # | Estado | Números |
|---|---|---|
| C1 tipi (tamaño 0, 4 ramas) | 🟡 | Integral de calor (∑calor/s hasta ceniza, prendiendo 1 leño): pila 21, 21, 28 (media 23,3); tipi 25, 25, 20 (media 23,3) → **0 %** en total. **Pico 4,06 vs 3,40 = +19 %**. Duración 9–12 s ambos. Antes (C): −26 %. |
| C1 cabaña (tamaño 3, 5 ramas) | ✗ (leve) | Pila 42, 36, 37 (media 38,3); cabaña 38 y 28 (media 33) = **−14 %**; la 3.ª corrida la cabaña no ardió (ver D1). Con todo prendido a la vez: pila 36–42 vs cabaña 25–37 (−18 %). Pico 4,6–5,3 vs 5,3–5,9 (menor). Antes: −22 %. No llega a +26 %. |
| Carácter | 🟡 | Tipi: prende rápido (4/4 patas ardiendo a los 5 s, desde 1 fósforo) y pico más alto: se nota. Cabaña: no dura más (8–15 s ceniza, igual que pila) y su pico es menor. |
| C2 | ✓ | Tronco de 175 px en pozo tamaño 0: ranuras ofrecidas = solo tipi, **ninguna resaltada**, soltado sin rotar cae a física libre (queda apoyado sobre las dos piedras a y=565, 4°, dinámico). Rama sin rotar: resalta `base`; barrido horizontal a y=590 sobre todo el pozo: solo `-`/`base`, **nunca tipi**. |
| C3 | ✓ | Modal de cartas abierto con la rama agarrada y resaltada la `base`: el arrastre se cancela y la leña queda **dinámica, sin encajar** (`slot null`, cae a y=643). |
| C4 | ✓ | 10 soltadas con humeda al 0,9–1,15: 4 eventos `full` a lr 1,06 / 1,11 / 1,13 / 1,15 (ya desde 1,06), 3 "Pozo lleno" flotantes, sin toast repetido; cuando bajó de 1,05 no avisó porque entraba. Sin hueco silencioso. |
| C5 | ✓ | Cabaña seguida de tipi: máximo **1 banner** visible a la vez (`maxConc = 1`). |
| C6 | ✓ | Zoom ×3: siluetas secundarias con contorno punteado visible; la resaltada (puente) con relleno cálido y brillo. |
| C7 | ✓ | **Pin de apoyo**: dos círculos blancos brillantes bien legibles en los extremos del puente; **sombra de contacto**: franja oscura bajo la base/puente visible (menos contraste que el pin, pero se ve). `slotPins` 2 visibles, `slotShadows` 2 visibles. |
| C9 | ✓ | Ajustes → "Partida nueva…" abre el mismo diálogo del título ("¿Partida nueva? … Borrar y empezar"). Ya no hay "Reiniciar partida". |
| C10 | 🟡 | Ritmo (aprox., guardado de nivel 2 con pozo forzado a tamaño 0, 1 rama cada 2 s, leña ilimitada): **2.333 de calor en 5 min** con pila; no comparable con una partida de cero (ignora recolección y mejoras). Tipi no comparable (mi bot pierde tiempo reconstruyendo, y colecta chispazos al arrastrar). **Noche 1 con tipi de 4 ramas en tamaño 0**: ritmo 0,4–1,9 /s contra meta 2,5, frío hasta 0,58 y 0,48 al final: no la sostiene (ver D1/D2). |

## Regresión
Menú (título, pausa, Ajustes, Partida nueva con confirmación), guardado/carga de ranuras ya probados en C; hoy no hubo errores nuevos en estructuras, pausa del modal, prestigio no repetido. Guardado y claves restauradas idénticas.

## Bugs nuevos
**Medio**
- **D1 — La ignición no siempre se propaga entre leños encajados** (física/fuego). Prendiendo solo 1 leño con fósforo: tipi de 4 → 4/4 en 5 s en 2 corridas, pero en la noche solo ardía 1 pata y las otras 3 quedaron "cruda" (fuel 100 %) durante minutos con el ritmo en 0,4; la cabaña de 5 tuvo una corrida en la que nunca pasó del primer leño (120 s, calor total 9). La pila también se apagó una vez (1/4 → 0). Es intermitente (¿clima/lluvia?, ¿qué leño se prende primero?). El jugador lo vive como "mi tipi no arde".
- **D2 — Las estructuras no cumplen aún lo prometido** (progresión): tipi = pila en calor total (solo pico +19 %), cabaña ≈ −14 %. Hay que subir el calor total por leña (más combustible) o la duración, no solo el pico.

**Bajo**
- **D3 — Tronco grueso sobre pozo chico queda horizontal apoyado en las dos piedras** (a 565 px, sobre el fuego): inofensivo, pero visualmente "flota" sobre el pozo; si se quiere, mandarlo adentro.
- **D4 — `clear`/destroy a mano de leños durante un cuadro produce el `TypeError ... position`** (herramienta de prueba; el juego no destruye leños en uso).

## TOP 3 para seguir
1. **Subir el rendimiento total de las estructuras** (combustible/duración, no solo pico): meta cabaña ≥ +15 % y tipi ≥ +10 % sobre pila en calor total.
2. **Garantizar la ignición entre leños encajados** (D1): que una chispa en una pata/base prenda las vecinas en pocos segundos con cualquier clima.
3. **Verificar táctil real** (dock ↺ ↻, 2.º dedo, radio 100 px) y medir un ritmo hasta 2.500 en partida nueva con una persona.

---

# Sección E — verificación de la iteración E (`?v=c4e`)

Mismo método (1 fósforo/1 leño prendido, 3 corridas de pila, `game.step`). Clima fijado a mano (calma estable, lluvia forzada por cuadro). Partida respaldada y restaurada con `state.locked = true`: 0 claves distintas, 0 extra. Consola: solo el `TypeError ... position` conocido, causado por mi `clear()` (destroy a mano).

| # | Estado | Números |
|---|---|---|
| E-1 tipi ≥ +10 % (tamaño 0, 4 ramas) | ✗ | Integral de calor/s hasta ceniza: pila 25, 25, 25; tipi 20, 20, 20 → **−20 %**. Pico 3,75 vs 3,86–3,91 (+3 %). Duración 11 vs 10 s. Midiendo `heatOut` por leña: pila 26,8 vs tipi 15,5 (−42 %) aunque `structureBonus` = 0,25: las patas encajadas emiten menos calor que leños sueltos. |
| E-1 cabaña ≥ +15 % (tamaño 3, 5 ramas) | ✗ | Pila 40, 41, 41; cabaña 30, 32, 31 (media 31) → **−24 %**. Pico 5,0 vs 6,6. Duración igual (12 s, no +18 %). |
| D1 propagación con lluvia | ✓ | Prendiendo 1 pata: tipi llega a todas las patas en **1,3 s (lluvia 0,3), 1,5 s (0,6), 2,1 s (0,9)**; se mantiene encendido hasta ceniza. La pila suelta sí se queda en 1/4 con lluvia 0,6 y 0,9 (nunca se propaga), o sea: la estructura prende mucho mejor que la pila bajo lluvia. |
| D1 noche 1 con tipi de 4 en tamaño 0 | ✓ | 200 s con un tipi reconstruido cada ~15 s (13 reconstrucciones): ritmo 0,94–3,8 /s, **frío 0,01 al final** (antes 0,58 y 0,48). La sostiene con atención. |
| D3 tronco 175 px en tamaño 0 | ✓ | 4 soltadas a dx 0/±40/25: ninguna ranura ofrecida, todos dinámicos y dentro del pozo (el 1.º a y=594, 31°; los siguientes se apilan sobre él). Ya no queda en el aire sobre las piedras. |
| Regresión/consola | ✓ | Sin errores nuevos. |

## Bugs nuevos
- **E1 (alto, balance)**: pese a los cambios, **las estructuras siguen dando menos calor total que la pila** (tipi −20 %, cabaña −24 % en el calor que el jugador recibe, `state.rate`). La medición de física (+18 %/+27 %) no se reproduce con `state.rate`/`heatOut`. Revisar por qué los leños encajados (estáticos) emiten menos `heatOut` y comparar con la fórmula que se usó en la medición.
- **E2 (bajo)**: la pila suelta no se propaga con lluvia ≥ 0,6 (1/4 encendido hasta apagarse); puede ser lo buscado, pero castiga más al jugador sin estructura que al que arma.

## Resumen de 3 líneas
1. D1 y D3 ✓: el tipi prende entero en 1,3–2,1 s hasta con lluvia 0,9 y sostiene la noche 1 en tamaño 0 (frío 0,01); el tronco largo cae dentro del pozo.
2. E1 ✗: en calor total las estructuras rinden menos que la pila (tipi −20 %, cabaña −24 %, `heatOut` −42 %), muy lejos del +10/+15 % pedido.
3. Consola limpia salvo el error provocado por mi limpieza; partida restaurada y verificada.

---

# Sección F — verificación de la iteración F (`?v=c4f`)

Usé `medir-estructuras.js` tal cual (cargado con fetch + eval) y probé tipis "como persona" con la rueda y `MouseEvent`. Partida respaldada y restaurada con `state.locked = true`: 0 claves distintas, 0 extra. Consola: solo el `TypeError ... position` conocido de mi limpieza.

## 1. Script de física — confirmado ✓
| Caso | Pila (rate / dur / pico) | Estructura | Δ calor | Encajadas |
|---|---|---|---|---|
| Tamaño 0, tipi 4 | 24,7 / 13,1 s / 3,41 | 30,1 / 11,9 s / 4,27 | **+22 %** (pico +25 %) | 4/4 en 3 corridas |
| Tamaño 3, cabaña 5 | 43,0 / 13,2 s / 5,91 | 54,4 / 16,0 s / 5,95 | **+26 %**, dura **+21 %** | 5/5 |
| Tamaño 0 lluvia 0,6 | 19,0 / 13,6–14,3 s | tipi 23,4 / 10,8 s | **+23 %** | 4/4 |
| Tamaño 3 lluvia 0,6 | **0,6 (nada arde en 100 s)** | cabaña 0,6 (nada arde) | – | 5/5 |
Mis cifras viejas (−20 %/−24 %) se explican: refuté mi propio método, mi tipi tenía una pata libre y mi cabaña quizá también (no verifiqué `slot` por leño; el script sí). Los números de física se reproducen.

## 2. ¿Es fácil dejar una pata sin encajar? **Sí.**
- **Una pata sola**: la tolerancia es amplia: rotar 2–7 pasos de rueda (32°–108°) encaja siempre como tipi (hasta el equivalente módulo 180°); 1 paso (15°) y 12 pasos (180°) caen como `base`.
- **Persona simulada** (4 patas, cada una con 3–5 pasos de rueda, signo al azar, soltada ±35 px del centro): **solo 1 de 6 tipis quedó con 4/4**; 4 de 6 con 3/4 y 1 con 2/4 (a su vez sin estructura). Ejemplo: `-3, -3, +3, -3` → la 4.ª queda "LIBRE".
- **Causa**: cada lado admite solo 2 patas. Si el jugador pone 3 inclinadas hacia el mismo lado (lo normal: rotó igual varias veces), la tercera ya **no tiene ranura libre** y cae a física libre **sin ningún aviso**; no se resalta ninguna silueta (desaparecen todas las de ese lado) y la etiqueta solo dice "Tipi 65 %" (no dice cuántas patas) — el jugador piensa que "salió mal" sin saber por qué.
- Efecto en calor: con una pata libre el tipi arde con 3 patas y rinde −20 % (lo que yo medí); el jugador percibe "el tipi no sirve".

## Propuesta (sin implementar)
1. **Mejor, combinada**: cuando se arrastra una leña inclinada y **no queda ranura libre de su lado, ofrecer la del lado opuesto** (espejar el ángulo en la silueta y en la animación de encaje, aviso corto "Se encaja del otro lado"). Así cualquier 4 soltadas con aim de tipi dan 2+2, y no hay forma de fallar por contar mal.
2. **Etiqueta/silueta**: mostrar "Tipi 3/4 patas" (o 2 círculos vacíos) y dejar visibles las siluetas libres del pozo mientras no esté completo.
3. Opcional: si no hay ninguna ranura (todo lleno), un flotante "No hay más lugar en el tipi" en vez de silencio.
Descartada: aumentar el radio (el problema no es la distancia sino la ranura inexistente).

## 3. E2 — pila con lluvia 0,6
✓ en tamaño 0: pila 19,0 / 13,6 s (antes: nunca). Tipi 23,4 (+23 %). **Pero en tamaño 3 con lluvia 0,6 ni la pila de 5 ni la cabaña arden** (rate 0,6 en 100 s): con el pozo grande y más leña la conducción no alcanza.

## Bugs nuevos
- **F1 (medio)**: tipi con 3 patas del mismo lado: la tercera cae libre sin aviso (ver arriba); 5 de 6 tipis de "persona" quedaron incompletos.
- **F2 (bajo)**: tamaño 3 con lluvia 0,6: ninguna leña (pila 5 ni cabaña 5) prende con el fósforo; el pozo grande no se enciende bajo lluvia moderada. Revisar si es intencional.

## Resumen de 3 líneas
1. El script de física se confirma: tipi +22 %, cabaña +26 % (dura +21 %), y con lluvia 0,6 en tamaño 0 tipi +23 % y la pila ya propaga (E2 ✓); mi −20 % venía de una pata suelta.
2. Para el jugador es muy fácil dejar una pata suelta: solo 1 de 6 tipis simulados con rueda quedó 4/4, porque cada lado admite 2 patas y la 3.ª cae libre sin aviso ni silueta; propuesta: encajar del lado opuesto + etiqueta "Tipi n/4".
3. En tamaño 3 con lluvia 0,6 nada arde (F2); partida restaurada y consola limpia salvo el error de mi limpieza.
