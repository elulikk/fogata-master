# Ciclo 5 — verificación de la iteración 1 (tester)

127.0.0.1:8080 (`?v=c5b`), `MouseEvent` reales, `game.step()` y capturas del panel (12 JPG `v-*.jpg` en `.claude/equipo/capturas-c5/`). `localStorage` respaldado al empezar (`fogata-ui-tut` + `fogata-master-save-v1` vacíos) y **restaurado al final con `state.locked = true`: idéntico** (verificado). Sin tocar código. Consola: **0 errores** en todo el ciclo. Aviso de método: los timers de los DOM (toasts, pill del tutorial) corren en tiempo real y yo avanzo en tiempo simulado, así que juzgo textos y banners por lo que se ve en cada captura, no por cuánto duran.

## Resumen
El salto es enorme: el cielo cambia de verdad (atardecer violeta, día azul, noche profunda), la llama tiene forma, las etiquetas son píldoras legibles, el tutorial te lleva solo a un **tipi real con la rueda** en un intento, y "rinde +18 %" se siente como premio. Lo más serio: **tocar una pata del tipi para prenderla la agarra y la desencaja** (se derrumba el premio); la mecha corre en 0,1–0,7 s y casi no se lee; y el premio de la cabaña (+8 %) es flojo frente al del tipi.

## 1. Primera sesión (sin conocimiento previo, desde cero)
| Paso | Qué pasa | Captura |
|---|---|---|
| Título | Fondo de atardecer violeta/naranja con el pozo desenfocado; Jugar/Cargar/Ajustes/Créditos. | v-01 |
| 0:01 | Fuego ya prendido sobre un cielo de atardecer (mucho más lindo que antes). Pill arriba: **"Arrastrá una leña hasta el pozo"**. Etiqueta en píldora "Fogatita 1.2/3.5". | v-02 |
| 0:05 | Primer arrastre: silueta en X del tipi, marco punteado, etiqueta con "0/3 ranuras". El pill pasa a *"Llevala al pozo y soltala"*. | v-03 |
| Soltar libre | La rama cae sin encajar. **El tutorial da por cumplidos `drag`, `snap` e `ignite` de golpe** (clave `fogata-ui-tut` = `["drag","snap","ignite"]`) y pasa a *"Inclinala ±60° y soltala al costado: tipi"*. | – |
| Tipi con rueda | 4 patas con 4 pasos de rueda (−, +, −, +): las 4 encajan al primer intento; etiqueta **"Tipi 1/4 +1 % → 2/4 +18 % → 3/4 → Tipi 90 % +25 %"** y banner **"¡Armaste un tipi! rinde +18 % de calor"**. | v-04 |
| Cabaña | Al comprar la 3.ª mejora del pozo (tamaño 3) sale el pill **"Dos bases y un puente encima: cabaña"**. 5 piezas con drags reales → "Cabaña 80 % +8 %", banner "¡Armaste una cabaña! rinde +8 % de calor y entra más leña" y toast "Cabaña: dura más y entra más leña, aunque prende más lento." | v-07 |
**¿El tutorial lleva?** Sí. Orden correcto, sin trabas: no me quedé sin saber qué hacer en ningún paso, y **se llega a un tipi real siguiendo solo el pill** (con rueda y física real: 4/4 encajadas, sin patas sueltas). Dos peros: el "encajar" se da por hecho aunque la leña haya caído libre, y "prender" nunca se enseña (el fuego arranca prendido).

## 2. El momento de la estructura
- **Prender**: tocando un hueco del pozo (no una leña), la mecha enciende las patas del tipi en **84, 117, 217 y 234 ms**, y la cabaña (5 piezas) en **251, 251, 451, 635 y 668 ms**. Se ve una chispa y listo: es **tan rápido que no se lee como "recorrido"**. La corona/anillo rojizo aparece alrededor del pozo (v-05) y el banner "rinde +18 %" es claro.
- **¿Premio?** El tipi sí (banner, +18 %, etiqueta verde "+25 %"). La cabaña **no**: "+8 %" en el banner (aunque la tabla de física dice +26 % en calor total; el texto promete menos de lo que rinde) y arde con dos llamas altas a los lados (v-07), vistosas pero la etiqueta no lo explica.
- **Colapso en cascada con fuego natural**: con leña igual, las patas/bases se hacen ceniza una tras otra en ~12–14 s **sin que nadie se desencaje ni salga "¡Se derrumbó!"** (0 eventos `unsnap`/`lost` antes del final); el colapso solo se ve cuando una pata se libera a mano (J1). Es sobrio, pero no hay cascada visible.

## 3. Bugs H1–H11 de la base
| # | Estado | Evidencia |
|---|---|---|
| **H1** ciclo de luz | ✓ (amanecer sin ver) | Atardecer permanente antes de las noches (v-01/02); **día** azul claro con sol (v-07), **atardecer** "Atardece, la noche llega en 9 s" (v-09), **noche profunda** negra con luna y estrellas, el pozo como única luz (v-08). Forecast con nombre correcto ("Día despejado", "Atardecer despejado", "Noche despejada"). El **amanecer** no pude verlo (no logré disparar el cielo de amanecer fuera de una noche real). |
| **H2** un mensaje | 🟡 | El mundo muestra un solo texto a la vez (banner del tipi, "¡Se derrumbó!", "Fogata más grande" en capturas distintas). Pero se apilan **4 toasts + modal + texto del mundo** al subir de nivel (v-06) y la cola de DOM no se alterna con la del mundo. |
| **H3** etiqueta | ✓ | Píldora con fondo, "Fogatita 1.4/3.5 · Tipi 90 % +25 %", "Hogar 1/10 · Cabaña 80 % +8 %" (v-04, v-07); 12 px pero con contraste. |
| **H4** meseta | ✓ | Ritmo con `bot-ritmo.js`: `rate60` 3,1 → 3,2 → 3,4 → 3,1 → 3,9 → 5,3 → 5,6 → 7,4 → 7,1 (**sin meseta clavada**); *Fogata más grande* a los **5:15** (antes 10:41). |
| **H5** recursos sin uso | ✗ | Aún sobran fósforos (8) y húmeda (11), y piñas; el ritmo es otro, el uso no. |
| **H6** atado de ramas | ✗ no re-probado | – |
| **H7** cabaña descubrible | ✓ | Pill a los tamaño 3 y toast "Cabaña: dura más…". |
| **H8** base ocupada | 🟡 | Se ve el X del tipi y la etiqueta "0/3 ranuras" (v-03); las dos leñas iniciales siguen ocupando la base. |
| **H9** título | ✓ (parcial) | Tras importar un guardado sale "Continuar · Nivel 6 · 🔥 5.0k · fecha" y "Partida nueva"; sin guardado, solo "Jugar". |
| **H10** hint sobre etiqueta | ✓ | El hint pasó a un pill arriba, centrado, sin pisar el pozo. |
| **H11** materiales | ✓ | Fuego con forma de llama con núcleo claro (v-02, v-07), leños con veta y borde oscuro sin halo (zoom del tronco), piedras grises con volumen, **techo de paja** sobre postes (v-12), pozos con sombra de contacto. Dos pozos a la vez se ven bien (v-11). |

## 4. Ritmo (`bot-ritmo.js`, política `cheap`)
| Hito | Antes (base) | Ahora |
|---|---|---|
| 500 | 2:05 | **2:05** |
| 1.500 | 6:44 | **5:52** |
| 2.500 (noches) | 11:31 | **7:47** |
| 4.500 | 17:22 | **11:31** |
| 10.000 | – | **19:16** |
Compras: fuelle 0:54, canasta 1:06, hacha 1:27, botas 2:09, canasta 3:07, techo 3:53, **agrandar 5:15**, botas 6:06, leñera 7:00, secadero 8:59 (11 compras en 9 min, antes 5).
**Noche 1** (meta 4,0): el bot rinde 7,5–11 /s, termina con **margen 1,44** (+5 cenizas) y noche 2 (meta 4,4) con 10,9/s: **no es difícil para quien juega atento**.
**Persona que se descuida** (noche 2, 10 leños prendidos al empezar, sin añadir nada): ritmo 10,8 → 3,0 a los 60 s → **0 leños a los 70 s**, el frío sube **0,19 (80 s), 0,48 (100 s), 0,84 (120 s) y se pierde la noche a ~125 s**. Con 60 s de descuido solo llega a 0,19 y se recupera. Es **justo y no imposible**: pide atención en los últimos 60 s antes del colapso.
**Avance muy rápido**: 2.500 a los 7:47 abre las noches temprano (antes ~11 min); revisar si es la intención.

## 5. Crítica visual (captura por captura)
- **Lo que ya está bien**: título, cielos de día/atardecer/noche (v-01, v-07, v-08, v-09), fuego con forma y luz cálida sobre el bosque (v-02, v-11), techo de paja (v-12), etiqueta en píldora, HUD con caja de calor + meta, silueta del tipi (v-03).
- **Sigue feo/mejorable**:
  1. v-06: el modal "¡Subiste de nivel!" tapa y **mezcla 4 toasts, la tarjeta de logro, "Fogata más grande" y la barra de pronóstico** en un mismo bloque borroso.
  2. v-07, v-04: los **banners amarillos de estructura** (2 líneas, sin fondo) sobre las llamas pierden contraste; el "+8 %" de la cabaña no se explica.
  3. v-11 (fx apagado, 2 pozos): las llamas del pozo grande son **dos "cuernos"** separados por un hueco oscuro; con tanto brillo dorado de chispas el pozo chico pierde lectura.
  4. v-10 (lluvia): con la lluvia los dos pozos quedan oscuros, las llamas apagadas y la mancha de rayos de amanecer sigue visible (quedó de mi prueba manual): cielo y luz de lluvia no se distinguen del anochecer.
  5. v-12 (812×375): el HUD izquierdo es muy chico y la zona de botones queda a ras del borde inferior.
  6. Borde claro de los troncos (duda de arte): en el zoom no veo halo claro; hay un trazo oscuro fino y buen volumen. ✓.
- Con `fx` apagado (v-11) el mundo se ve completo y limpio; la lluvia con la luz nueva se ve bien de día (v-10).

## 6. Rendimiento
| Leñas (ardiendo) | Antes | Ahora (render + sync GPU) |
|---|---|---|
| 0 | 1,23 ms | 2,16 ms (primer cuadro frío) |
| 20 | 1,54 | 1,88 |
| 40 | 2,21 | 2,76 (+25 %) |
| 57–64 | 2,78 (47) | **3,67–3,69** |
Tope sostenible 64 ardiendo: **3,7 ms** contra 3,6 ms con 72 (antes). Igual en el techo; +20–25 % en tramos medios. En móvil (4–8×) ≈ 15–30 ms con 60 leñas: sigue siendo el punto a vigilar. **No medí móvil real.**

## 7. Regresión
Guardado **v2 (sin settings/night/meta)** importado y recargado: pozos 3 y 1 (con techo), "Continuar · Nivel 6", **el tutorial queda marcado como completo** (no se muestra a quien ya tiene progreso), meta del HUD "Canasta: ya podés comprarlo". Ranuras: guardar en la 1 ✓. Prestigio: +13 🪦 y pozo inicial tamaño 0, "Nuevo comienzo". Menú nuevo: Continuar/Guardar/Cargar/**Cómo jugar**/Ajustes/Volver al título. 812×375 sin cortes. Consola limpia. (Aviso: `bot-ritmo.js` anula `state.save`: tras correrlo hay que recargar antes de importar/guardar.)

## Bugs nuevos (priorizados)
**Alto**
- **J1 — Tocar una pata para prenderla la agarra y desencaja** (física/UX). Pasos: armar un tipi (4/4), tocar con el mouse una de sus patas (lo natural para "prender"). Resultado: `unsnap:grab` → esa pata cae libre y las que dependían de ella la siguen; sale "**¡Se derrumbó!**" y la etiqueta pasa a "Tipi 2/4" justo al prender; el premio se rompe. Solo funciona tocar un hueco del pozo. Debería: un toque corto (sin mover) sobre una leña encajada la prende (o al menos la reencaja), y el tutorial enseñar "tocá el pozo".

**Medio**
- **J2 — La mecha es instantánea** (dopamina): tipi 84–234 ms, cabaña 251–668 ms entre la primera y la última leña; no se lee como recorrido. Alargar a ~0,8–1,5 s.
- **J3 — Premio de la cabaña débil y números distintos**: banner "+8 %" (cabaña) frente a "+18 %" (tipi) y etiqueta "+25 %"/"+8 %" que no coinciden con el banner del tipi (+18 vs +25). Unificar y explicar ("rinde X % y dura Y %").
- **J4 — Pila al azar se lee como "Cabaña 38 % +4 %"** en tamaño 0 (el novice ve cabaña sin buscarla, mientras el tutorial le pide tipi).
- **J5 — Toasts y modal de nivel apilados** (v-06): los avisos de milestones (viento, noches, chispazos) llegan en el mismo instante que "¡Subiste de nivel!".

**Bajo**
- **J6 — El tutorial acredita "encajar" e "ignite" sin hacerlos** (soltar libre cumple `snap`; el fuego ya está prendido).
- **J7 — Meta inicial del HUD**: a 0 y 38 de calor muestra "Seguí hasta 1600 🔥: sopla el viento" (salta los hitos de 30/120/180).
- **J8 — Sin "Cabaña n/5" mientras se construye** (la etiqueta solo aparece cuando ya está formada).
- **J9 — Madera mezclada**: poner una base de seca y luego una rama no ofrece ranura (`noslot`, sin aviso), porque cambian los largos.
- **J10 — Amanecer sin verificar** (cielo/rayos): no pude disparar un amanecer real.
- **J11 — El cielo de la lluvia** no se distingue del atardecer/noche (v-10).

## TOP 5 para la próxima iteración
1. **Arreglar J1**: tocar (sin mover) una leña encajada prende o reencaja; enseñar "tocá el pozo para prender" en el tutorial.
2. **Hacer que prender una estructura sea un momento** (J2): mecha de ~1 s con sonido y flash por pata, y un banner que diga cuánto rinde y por qué.
3. **Unificar los números de estructura** (J3): mismo valor en banner y etiqueta; subir el premio visible de la cabaña.
4. **Ordenar los avisos** (J5/H2): un solo canal con cola (toasts + mundo + tarjetas de logro) y sin mostrar nada mientras hay modal.
5. **Revisar el ritmo** ("2.500 a los 7:47" abre las noches casi al doble de rápido) y subir la meta de la noche 1 si se busca tensión; hoy un jugador atento sobra con margen 1,44.

## Resumen de 3 líneas
1. La iteración funciona: cielo de día/atardecer/noche, llama con forma, etiquetas legibles y un tutorial que lleva a un tipi real en un intento (cabaña descubrible a tamaño 3); H1, H3, H4, H7, H10 y H11 ✓.
2. Peor problema: tocar una pata del tipi para prenderla la desencaja y se rompe el premio (J1); además la mecha dura 0,1–0,7 s, el "+8 %" de la cabaña es flojo y los avisos se apilan con el modal de nivel.
3. Ritmo: 2.500 a 7:47 (antes 11:31), noche 1 holgada con margen 1,44, y descuidarse 2 min en la noche 2 pierde (justo); render 3,7 ms con 64 leñas ardiendo; localStorage restaurado y consola limpia.
