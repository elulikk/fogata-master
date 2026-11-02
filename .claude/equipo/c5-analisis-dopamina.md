# C5 · Dopamina: 5 mejoras para los primeros 30 minutos

Base: el feedback de material ya existe (clac, tock, tump, anillo de chispas, combo, pico, cabaña/tipi con `structureBurst`). Lo que falta es **encadenar** esos momentos y **mostrar** que jugar bien rinde. Sin sistemas nuevos.

## 1. Prender una estructura: la llama sube por la armazón (EL momento) · M · hacer primero
- **Cambia**: hoy armar el tipi/cabaña da un estallido y después el fuego arde igual. Con esto, al encender un pozo con `structure` estable, la ignición no es un parche: una "mecha" de llamas recorre las patas (tipi: sube por cada pata hasta el cruce; cabaña: corre por las bases y salta al puente), con crepitar creciente y un `whump` más grave al llegar arriba. Con el tipi el fuego sube vertical y angosto; con la cabaña, ancho y parejo.
- **Dónde**: `Fire.js` en `ignite`/`onIgnite` (leer `p.structure.type`) + nuevo `structureIgnite(pit)` que reusa `flames.L`/`rise` posicionados por `log.endpoints()` de `fire.slotted(pit)`; `GameScene.onIgnite` lo llama; `FireAudio.ignite(kind)`.
- **Riesgo**: bajo-medio (posiciones por leña ya existen; hay que cortar si se desarma a mitad). Respetar `fx`. Esfuerzo M.

## 2. Mostrar que jugar bien rinde (el juego te lo dice) · S
- **Cambia**: hoy el +22 %/+26 % solo está en un toast la primera vez. Propongo un "rinde ×1,26" flotante discreto sobre la llama al formarse la estructura y, ya encendida, un halo/corona de brasas fijo en el borde del pozo (idea C4) mientras la estructura tira, que se apaga si se pierde. Al cerrar cada noche, una línea de resumen con lo que la estructura aportó.
- **Dónde**: `GameScene` handler `structure:formed` (texto con `pit.structure.quality`), `Fire.update` (corona con `p.structFormed`), UI para la línea nocturna (coordinar con UI).
- **Riesgo**: bajo; no tocar el texto duplicado del tipi. Esfuerzo S.

## 3. Ritmo de recompensas de los primeros 30 min: una escalera visible · M
- **Cambia**: los primeros minutos deben dar un micro-premio cada ~30–45 s: 1ª leña en el pozo (tump + anillo, ya), 1ª ignición (whump), 1ª rotación, 1ª ranura (clac), 1ª estructura, 1º nivel. Hoy hay huecos entre el 1er fuego y el 1er nivel. Agregar un "primera vez" ligero (chispa dorada + campanita corta, no toast) por cada gesto nuevo descubierto, y que la cadena de tono del clac continúe entre estructuras para sentir progreso.
- **Dónde**: `GameScene.setupFeelEvents` con `seenOnce('first_*')`; `FireAudio.firstTime(n)`; progresión decide el nivel 1 más temprano.
- **Riesgo**: medio (no saturar; usar `seenOnce`). Esfuerzo M.

## 4. Sonido de ambiente con vida y mezcla · S
- **Cambia**: mezcla más clara: el rugido (`setFire` con `draft`) es la base y todos los one-shots quedan por encima sin tapar. Añadir un "latido" de crepitar que se acelera con la intensidad, grillos/viento de fondo que bajan cuando el fuego es grande (el fuego "llena" el mundo), y un silencio breve + whump antes del pico. Pausa y menú: filtro pasa-bajos suave en vez de corte.
- **Dónde**: `FireAudio.setFire/ambient`, `GameScene` pausa/menú (`audio.duck(on)`).
- **Riesgo**: bajo, pero requiere escuchar (nadie verificó volúmenes reales). Esfuerzo S.

## 5. Tocar la leña de punta a punta: agarrar y soltar con peso · S
- **Cambia**: agarrar la leña da un "pull" ya, pero falta una respuesta al **soltar fuera de ranura** (hoy solo cae) y al arrastrar sobre un pozo (el fantasma de ranura y el tick de imán ya están). Sumar: leve inclinación/sombra al levantar, "whoosh" muy suave al arrastrar rápido y un halo de la ranura que se enciende al estar a punto de encajar (señal de "ahora").
- **Dónde**: `GameScene` drag handlers + `Log.pop`/sombra (arte coordina), `FireAudio.drag(speed)`.
- **Riesgo**: bajo (solo visual/sonoro). Esfuerzo S.

## Hacer primero: **1**. Es el único que convierte "armé algo" en "lo encendí y mira cómo sube", que es el bucle emocional central. **2** es el complemento barato que hace visible el beneficio.

Resumen:
1. El momento central falta: la ignición de una estructura debería recorrerla (llama que sube por patas/bases) y no parecerse a un fuego común.
2. Jugar bien no se muestra: sumar un "rinde ×N" y una corona de brasas fija mientras la estructura tira.
3. Rellenar el ritmo de los primeros 30 min con micro-premios "primera vez" y una mezcla de sonido donde el rugido sea la base.
