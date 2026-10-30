# Feedback del tester — Ciclo 1

Probado en el navegador integrado (http://127.0.0.1:8080/, localStorage propio, no toca el de localhost), viewport de escritorio ~800×600 y emulación 812×375 / 375×812. Consola: **0 errores** en toda la sesión.
Los hitos se probaron con `fogata.state.gainCalor()` y moviendo `state.data.night.t` / `coldLvl`. No jugué una noche real de 8 min (el fuego no se sostiene solo): la meta de 4 calor/s no se pudo evaluar jugando, ver Balance.

## Qué funcionó (verificado)
- Arrastrar leña, prender, calor y desbloqueos: 30 bosque, 60 chispazos, 120 tienda, 180 nivel/cartas, 450 clima+construir, 1600 viento, 2500 noches (barra `#night` aparece recién al atardecer).
- Cartas: rareza (`rara`/`comun`), antes→después, teclas 1/2/3, bloqueo anti-misclick (`.locked` ~0,4 s, un click durante el bloqueo no elige). Salto de varios niveles seguidos se encola bien (5 niveles → 5 cartas).
- Tienda: "faltan N 🔥" y costo en rojo (`.short`) correctos.
- Noches: atardecer (`🌅 ... la noche llega en 29 s`), noche (`🌙 Noche 1 · 7:59 · 0.4/4.0 🔥/s`), frío sube (cold 0.26 al empezar), amanecer con resumen (+3 cenizas), Enter cierra.
- Cenizas: compra, prestigio con confirmación (`¿Seguro?…`), resumen "Nuevo comienzo", reinicio limpio (nivel 1, calor 0, `Semilla de leñador` aplica +4 fósf/+3 troncos).
- Menú: volumen, mute (también con M), reducir movimiento (clase `reduce-motion`), todo persiste al recargar; reset pide confirmación y la cancela a los 3 s; `importSave('basura')` devuelve error limpio.
- Atajos S, C, B, M, A, Esc, Enter. Vertical muestra "Girá el dispositivo para jugar".

## Bugs

### Alto
**B1 — Al rotar/redimensionar a horizontal la UI queda calculada con el tamaño anterior** (ui)
Pasos: ventana 375×812 (aviso de rotar) → 812×375. O: pasar de escritorio a 812×375 con la página ya abierta.
Pasa: `#ui` queda con width 520px (de 375) o sin escalar bien: HUD y botones apiñados en el centro, el hint pisa los botones, y en el primer caso `btn-menu`/`#actions` quedan fuera de pantalla (x>812, y>375) → menú y tienda inalcanzables. Un `dispatchEvent(new Event('resize'))` posterior lo arregla, o sea el cálculo es correcto pero corre antes de que `#wrap` cambie de tamaño.
Debería: refitear siempre al tamaño final.
Sospechoso: `Ui.js` `setupFit()` (≈71–88): lee `$('wrap').clientWidth` en el evento `resize`/`orientationchange`, antes de que main.js/Phaser reajuste `#wrap`. Usar `ResizeObserver` sobre `#wrap` (o `requestAnimationFrame` doble). Esto ocurre en el caso real de girar el celular.

**B2 — Tras prestigiar no se pueden gastar las cenizas hasta volver a 2500 de calor** (progresión/ui)
Pasos: ganar una noche, comprar algo, prestigiar. Tras el reinicio `unlocked` queda `{}` y el botón Cenizas (`#btn-ashes`) está oculto (depende del hito `noches`).
Pasa: sobran cenizas (quedaron 2) y no hay dónde gastarlas por ~2500 de calor; la mejora "Camino conocido" que resolvería esto no se puede comprar justo cuando hace falta. Además la "Semilla" no se ve funcionar.
Debería: mostrar Cenizas siempre que `meta.totalDawns>=1` o `prestiges>=1`, aunque `noches` no esté desbloqueado.
Sospechoso: condición de visibilidad de `btn-ashes` en `Ui.js`/`GameScene.js` (`unlocked.noches`).

### Medio
**B3 — Los toasts se superponen y pisan el título "¡Subiste de nivel!"** (ui/dopamina)
Al subir de nivel a la vez que saltan avisos de desbloqueo (clima, chispazos, "Llegó un…") salen 3–4 toasts apilados detrás del modal y uno choca con el título de las cartas. Pasa en escritorio y horizontal.
Debería: pausar/ocultar/encolar toasts mientras hay modal de cartas, o mostrar uno solo.

**B4 — Las cartas se abren encima del panel de tienda sin cerrarlo** (ui)
Con la tienda abierta, el nivel muestra cartas sobre la tienda (el panel se ve detrás y desordena). Debería cerrar el panel al abrir cartas/resumen.

**B5 — Mover el slider de volumen desmutea pero no actualiza checkbox ni ícono** (ui)
Con mute guardado, al subir el slider `muted` pasa a false pero `#set-mute` sigue tildado y `#btn-mute` muestra 🔇 hasta tocar mute (y entonces *des*mutea/mutea al revés). Sospechoso: handler `volume` en `GameScene.bindUi`/`Ui.setupSettings`: llamar a `ui.syncSettings()` tras cambiar volumen.

**B6 — "Cenizas en total" del resumen de prestigio muestra el saldo, no el total** (progresión)
En "Nuevo comienzo": "Cenizas ganadas +2 / Cenizas en total 2" cuando `meta.totalAsh` era 5 (3 del amanecer gastadas). Cambiar valor a `totalAsh` o renombrar a "Cenizas disponibles".

### Bajo
- **B7** Efecto de consumibles muestra "Fósforos: — → +5", "Ramas: — → +6" (antes→después sin sentido). Mejor mostrar solo "+5" o cantidad actual → nueva.
- **B8** Casillas de Silenciar / Reducir movimiento se ven como cuadrados blancos vacíos en tema oscuro; no se distingue el estado tildado (¿falta estilo `:checked`?).
- **B9** El panel de tienda tapa "Ir al bosque" y parte de los botones laterales a 800×600 (el panel en 800×600 recorta la lista a ~4 ítems visibles; hace falta scroll para casi todo).
- **B10** Esc con el menú abierto y el botón "Reiniciar" en estado de confirmación pareció no cerrar el menú la primera vez (se cerró a la segunda). No lo reproduje limpio; revisar que Esc primero cancele la confirmación a propósito.
- **B11** (no confirmado, posible artefacto del navegador de pruebas) tras un reload el localStorage quedó con una partida vieja (calor 11) mientras el estado en memoria seguía en 800+, aunque `state.save()` manual sí escribía. Si dos pestañas/instancias corren a la vez se pisan el guardado. Revisar si hay escritura concurrente (p. ej. `beforeunload` guardando estado viejo tras `wipe`/importar). No bloquea.

## Sensaciones (máx 10)
1. La secuencia de nivel con bloqueo y rareza se siente bien: el azul de "Rara" y el antes→después (`0% → +20%`) hacen la decisión clara y rápida.
2. Las teclas 1/2/3 + Enter en el resumen vuelven el flujo ágil sin mouse.
3. Al empezar de cero lo único que se ve es la pila y una frase; se entiende, pero el primer calor sube muy fácil (6 de calor en segundos, "+13/s" de pico engañoso) y el mensaje "Tu fogata da calor…" aparece tarde frente a esa explosión inicial.
4. "+0.5 /s" en el HUD cuando la fogata es una sola leña desanima: el número que se ve es mucho menor que el que vale para la meta de noche (4/s). El jugador no sabe cuánto es "bueno".
5. La barra de noche + pronóstico + toast apilados arriba al centro se amontonan (el aviso "Viento en 2 s", la barra y el toast de atardecer comparten espacio).
6. El resumen del amanecer aparece con filas que se revelan en escalonado: elegante, pero el resumen con solo 2 filas deja mucho hueco vacío en el modal.
7. Prestigiar a 2500 de calor da +2 🪦 y un amanecer da +3: prestigiar parece un castigo, no una recompensa. Falta aliciente (o ceniza proporcional al calor).
8. Tras el prestigio el arranque es limpio y con fuego ya prendido: bien. Pero sin acceso a Cenizas se siente raro (B2).
9. El fuego se apaga solo al dejar de jugar unos minutos y el mensaje "Se apagó…" es claro; bien para la tensión nocturna.
10. Las cartas en horizontal móvil entran justas; el título y la leyenda quedan apretados.

## Balance
- **Curva de niveles**: 180 → 292 → 473 → 766 → 1.2k… con calor total 2.000 ya estás en nivel 6–7. Con ×1.62 por nivel el ritmo pasa de "rápido" a "a ritmo" recién cerca de nivel 8; los primeros 5 niveles llegan casi sin esfuerzo (entre 120 y 450 de calor hay 3 niveles + tienda). Podría estirar los primeros niveles o dar menos cartas seguidas.
- **Noches**: la meta 4/s en la noche 1 frente a un fuego básico de ~0,4–1,3 calor/s es muy exigente, pero perder solo empuja el frío: con rate 0,4 el frío sube ~0,0128/s → fallás recién a ~78 s. Con una fogata modesta y ayudante parece factible resistir 8 min solo si el frío baja; no pude medirlo real. Conviene probar una noche real con una fogata atendida, y que el HUD diga claramente "necesitás X más".
- **Cenizas**: +3 por amanecer, mejoras 3–6 🪦: se compra algo cada amanecer; razonable. Prestigio (+2) es peor que otro amanecer: bajo.
- **Día 4 min**: llega pronto tras 2500 (≈ nivel 7), sensación de "ya?" antes de tener estructura (leñera, secadero) comprada.

## Arreglos Haiku (ciclo 2)

Archivos tocados: `js/ui/Ui.js`, `css/style.css`. `node --check js/ui/Ui.js` pasa. No se verificó en navegador (no se levantaron servidores).

**Arreglado**
- **B1**: `setupFit()` observa `#wrap` con `ResizeObserver` y, además, refitea con doble `requestAnimationFrame` tras `resize` / `orientationchange`.
- **B4**: `showCards()` y `showSummary()` llaman `closePanel()` antes de abrirse.
- **B5**: el handler del slider `set-volume` llama `syncSettings(muted)` con lo que devuelva `handlers.volume`. Nuevo método `Ui.syncSettings(muted)` que actualiza `#set-mute` y el ícono de `#btn-mute`.
- **B7**: el efecto muestra solo el "después" cuando el "antes" es `—`, `-` o vacío. Aplica a la tienda y a las cartas (helpers `sinAntes` / `efectoTexto`).
- **B8**: casilla propia para `#set-mute` y `#set-motion` (`appearance: none`, fondo oscuro, borde ámbar, tildado con gradiente ember y tilde CSS), en `css/style.css`.
- **B10**: Esc con el menú abierto llama `clearResetConfirm()` y luego `toggleMenu(false)` explícitamente. Leyendo el código, la ruta anterior ya hacía las dos cosas en una pulsación, así que no identifiqué la causa exacta del fallo del tester. Hay que confirmarlo en navegador.

**Pendiente / anotado (fuera de los archivos permitidos o fuera de la lista)**
- **B5, complemento**: para que la sincronización sea exacta, `GameScene.bindUi` (handler `volume`) debería devolver el estado real de mute (`true`/`false`). Hoy `Ui` asume `false` cuando no recibe booleano.
- **B2** (no tocado): la visibilidad de `#btn-ashes` depende de `unlocked.noches` en `GameScene.js`. Hay que mostrarlo también si `meta.totalDawns >= 1` o `prestiges >= 1`.
- **B6** (no tocado): "Cenizas en total" usa `d.ashTotal`, que llega desde la escena. Ahí hay que pasar `meta.totalAsh` o renombrar la etiqueta a "Cenizas disponibles".
- **B3, B9, B11** (no tocados): no estaban en esta tanda.
- **B10**: confirmar en navegador que Esc cierra el menú de una vez con el reset en confirmación.
- **B1, B8**: verificar en navegador la rotación a 812×375 y el aspecto de las casillas en tema oscuro.
