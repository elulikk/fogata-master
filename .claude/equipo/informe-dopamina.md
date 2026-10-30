# Informe dopamina — Fase A

Archivos tocados: `js/audio/FireAudio.js`, `js/objects/Fire.js`. `Log.js` y `Weather.js` NO hicieron falta (Weather ya tiene `flash` de relámpago + trueno). `node --check` OK en ambos.

## APIs nuevas

### FireAudio
| Firma | Qué hace |
|---|---|
| `setVolume(v)` / `getVolume()` | 0..1, default 0.9. `master = muted ? 0 : volume`. `unlock()` usa `this.volume`. |
| `setMuted(m)` | respeta `volume` al desmutear. |
| `coin(pitch=1)` | ahora con armónico agudo; pitch libre (usar 1..2.2). |
| `comboDing(tier=1)` | campanita pentatónica, sube con el tier (1..6). |
| `comboBreak()` | tono descendente suave al cortarse el combo. |
| `ignite(size, when)` | + "whump" grave, más hondo/largo con `size`. |
| `unlock_()` | 5º tono (1568 Hz, largo). |
| `levelUp(tier=0)` | tier 0 = fanfarria corta (4 notas); tier >= 1 = completa (6 notas + acorde + subgrave + brillo). |
| `rarity('rara'\|'epica')` | rara: arpegio brillante; épica: acorde lleno + subgrave + brillo. |
| `dawn()` | acorde mayor lento (~3 s) + `birds(1.6)`. |
| `birds(delay=0)` | trinos cortos aleatorios. |
| `reset()` | prestigio: descenso grave + soplo. |

### Fire
| Firma | Qué hace |
|---|---|
| `fire.motion` (bool, default `true`) | `false` = efectos de celebración al ~30 % (`fxScale`). |
| `fire.cold` (0..1) | baja hasta 25 % la luz de los pozos. La escena lo setea cada frame. |
| `flare(strength=1)` | llamarada en cada pozo prendido: `p.flash`, flamas L, chispas. Nivel = 1, hito = 1.6. Duración visible ≈ 0.5 s. |
| `emberRise(ms=1800)` | lluvia de brasas que suben (emisor `rise`) + parpadeo de luz. Para el prestigio. |
| `p.flash` | pulso de luz por pozo, decae en `update` (−2.2/s) y alimenta escala y alpha de `p.light`. |
| `ignite()` | ahora da pulso de luz y chispas proporcionales al grosor (rebrote desde brasas: más suave). |

## Plan fase B (GameScene.js) — código casi exacto

### 1. Constructor / `create()`
```js
this.combo = 0;
this.comboT = 0;
this.fx = true;                    // = !settings.reduceMotion
this.fire.motion = this.fx;
```
Cuando UI cambie el ajuste (handler `motion`): `this.fx = !v; this.fire.motion = this.fx;`

### 2. Combo en `collectOrbsNear` / `updateOrbs` / `floatText`
```js
// updateOrbs(dt), al principio:
if (this.comboT > 0) {
  this.comboT -= dt;
  if (this.comboT <= 0) {
    if (this.combo >= 3) this.audio.comboBreak();
    this.combo = 0;
  }
}

// collectOrbsNear, dentro del if de cada orbe recogido (reemplaza coin/floatText):
this.combo++;
this.comboT = 2.2;                                   // ventana en segundos
const c = this.combo;
const cap = this.state.mods.comboCap || 0;           // 0 por defecto; 0.3 con chispa-en-cadena
const mult = 1 + Math.min(cap, c * 0.03);
const value = Math.max(1, Math.round(o.value * mult));
this.audio.coin(Math.min(2.2, 1 + c * 0.05 + Math.random() * 0.08));
if (c % 5 === 0) {
  this.audio.comboDing(Math.min(6, c / 5));
  this.floatText(o.img.x, o.img.y - 34, `x${c}`, '#ff9a3c', 1.4);
}
const col = c >= 15 ? '#ff7a30' : c >= 8 ? '#ffb347' : '#ffd36b';
this.floatText(o.img.x, o.img.y - 10, `+${value}`, col, 1 + Math.min(0.6, c * 0.03));
// y en el onComplete del tween: this.state.gainCalor(value);
```

`floatText(x, y, text, color, scale = 1)`:
```js
const t = this.add.text(x, y, text, { ...mismo estilo..., fontSize: `${Math.round(17 * scale)}px` })
  .setOrigin(0.5).setDepth(90).setScale(0.6);
this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'back.out' });
// (el tween de subida/alpha queda igual)
```
Con `!this.fx`: sin `back.out` (scale directo a 1).

### 3. `onIgnite` en `setupFireEvents`
Fire ya hace el audio, el flash y las chispas. En escena solo lo extra:
```js
this.fire.onIgnite = (log) => {
  if (!this.fx) return;
  const big = log.wood.thickness >= 24;               // troncos
  if (big) this.cameras.main.shake(120, 0.002);
  this.state.data.totalCalor > 0 && this.squash?.(log.sprite); // opcional, ver Log abajo
};
```

### 4. Los 3 stubs (un solo timer, tiempos del plan)
```js
playLevelSequence(done) {
  const tier = this.state.data.level % 5 === 0 ? 1 : 0;
  if (!this.fx) { done({ lockMs: 450 }); return; }   // done recibe opciones; GameScene arma showCards(..., { lockMs })
  this.ui.fillLevelBar?.();                           // 0 ms
  this.cameras.main.flash(180, 255, 211, 107);        // flash dorado
  this.fire.flare(tier ? 1.6 : 1);                    // 0–250 ms
  this.time.delayedCall(150, () => this.audio.levelUp(tier));
  this.time.delayedCall(900, () => done({ lockMs: 400 }));
}
```
`checkProgress` hace `this.setPaused(true)` recién a los 900 ms → el stub hace `done` y `done` pausa y muestra cartas. Nota para progresión: `done` no debe pausar antes.

```js
playDawn(info, done) {                                // info: {n, success, ash, cardFree, summary}
  if (!info.success) { this.audio.sizzle(0.6); done(); return; }
  this.audio.dawn();                                  // 0 ms (acorde + pájaros a 1.6 s)
  if (this.fx) {
    this.cameras.main.flash(1200, 255, 190, 120);
    this.fire.flare(1.4);
    this.tweens.add({ targets: this.vignette, alpha: 0.35, duration: 1500, ease: 'sine.inOut' });
    this.time.delayedCall(2600, () => done());
  } else this.time.delayedCall(600, () => done());
}

playReset(done) {
  this.audio.reset();
  if (this.fx) {
    this.fire.emberRise(1800);
    this.cameras.main.fadeOut(1800, 10, 6, 4);
    this.time.delayedCall(2000, () => done());
  } else this.time.delayedCall(400, () => done());
}
```
(Con `fadeOut` la escena se reinicia con `scene.restart()`; el `fadeIn(500)` va al arranque de `create()` si hubo prestigio.)

### 5. `applyUnlock` — destello de hito
Al final, solo si `announce`:
```js
if (announce && this.fx) { this.fire.flare(1.6); this.cameras.main.flash(250, 255, 211, 107, false); }
```
(`checkProgress` ya llama `audio.unlock_()` si hay toast.)

### 6. `this.fx` y reacción a `cold`
En `update()`, donde ya setea `vignette`:
```js
const ni = this.state.nightInfo();
const cold = this.fx ? ni.cold : ni.cold * 0.4;
this.fire.cold = cold;
this.vignette.setAlpha(0.92 - 0.4 * Math.min(1, I) + 0.08 * cold);
this.vignette.setTint(lerpColor(0xffffff, 0x8fa6e0, cold * 0.7));  // import lerpColor de utils/geom.js
```

### 7. Cartas con rareza (al mostrar cartas)
Cuando se muestre cada carta con `rarity !== 'comun'`: `this.audio.rarity(card.rarity)` al mismo ms que su animación `deal` (rara: delay normal; épica entra 250 ms tarde, con `setTimeout/delayedCall(250 + i*80)`).
Opcional: `cameras.main.flash(200, 170, 90, 255)` para épica.

## Pedidos a UI
- Clases `.card.comun/.rara/.epica` (rara: borde dorado con brillo; épica: morado con glow pulsante).
- `data-delay` en cada carta (ms) para el stagger de `deal`; épica = base + 250.
- `showCards(cards, levels, { lockMs })` ya contemplado en el plan.
- Si `reduceMotion`, quitar la animación de glow pulsante por CSS.

## Notas / dudas
- `mods.comboCap` lo define progresión (carta `chispa-en-cadena`); sin él el combo es 100 % cosmético.
- `done` en `playLevelSequence` recibe `{lockMs}` solo si la firma de progresión lo permite; si no, el stub llama `done()` y progresión usa lockMs fijo 400/450.
- Camera shake/flash: no usé `Weather.js`; el flash de trueno ya existe.

# Fase B — GameScene (hecho)
`node --check` OK. No probado en navegador.

- **Combo**: `this.combo/comboT` (ventana 2,2 s). `updateOrbs` lo corta (`comboBreak` si ≥3). `collectOrbsNear`: pitch sube con el combo, ding + "xN" cada 5, color/tamaño de números por tramo; valor = `o.value × min(mods.comboCap, 1 + 0,03·combo)` (`comboCap` es multiplicador, 1 = sin bonus). `floatText(x,y,text,color,scale=1)` con pop `back.out` si `scale>1` y `fx`.
- **`setMotion(on)`** (público): `this.fx = !!on; fire.motion = fx`. En `create()` se inicializa con `!settings.reduceMotion`. **UI en su handler `motion(reduce)` debe llamar `this.setMotion(!reduce)`** (OJO: `setMotion` recibe `true` = movimiento ACTIVADO; `fx` = movimiento on).
- **`onIgnite`**: shake leve si grosor ≥ 24 (solo con fx y pasado el primer segundo).
- **`playLevelSequence(done)`**: fx off → `done({lockMs:450})`; si no, `fillLevelBar?.()` + flash dorado + `flare` (tier 1 cada 5 niveles), `levelUp(tier)` a 150 ms, `done({lockMs:400})` a 900 ms. Saqué el `audio.levelUp()` provisorio.
- **`queueCards`** pasa `opts` a `showLevelCards(opts)`, que reenvía `{lockMs}` a `ui.showCards` y suena `audio.rarity` (épica +250 ms, con flash morado).
- **`playDawn`**: falla → sizzle + `done()`; éxito → `audio.dawn()`, flash cálido, flare 1.4, `done` a 2600 ms (600 ms sin fx).
- **`playReset`**: `audio.reset()`, `emberRise(1800)`, `fadeOut` 1800, `done` a 2000 ms (400 ms sin fx). Tras reiniciar, `fadeIn` 700 ms si hay `pendingSummary`.
- **`applyUnlock(id, true)`**: `flare(1.6)` + flash dorado (solo con fx).
- **Frío**: en `update`, `fire.cold = nightInfo().cold` (×0,4 sin fx), velo azul `coldTint` (alpha 0,22·cold) y viñeta +0,08·cold. No usé el evento `night:progress` (leo `nightInfo()` directo).
- No toqué `bindUi`, `shopItems`, `ui.update` ni `setupInput`.

# Ciclo 2 — Fase A (hecho)
Tocados: `Fire.js`, `Log.js`, `FireAudio.js`. `Weather.js` sin cambios. `node --check` OK. **No probado en navegador**: lo único dudoso es la rotación de chispas (`rotate: { onEmit, onUpdate }` con `particle.velocityX/Y`, Phaser 3.80); si salen todas verticales, es ahí.

## APIs nuevas
| API | Qué hace |
|---|---|
| Fire: chispas | `sparks` ahora usa `spark-streak`, rotada según velocidad. Escala 0,9→0,1. |
| `Log.pop(strength=1)` | halo blanco que se expande 220 ms (no escala el cuerpo físico). No hace nada si `fire.motion === false`. |
| `FireAudio.pull(weight)` | "plop" al sacar de la pila. |
| `FireAudio.tump(weight, power)` | golpe grave: 62/88/125 Hz según heavy/medium/light. |
| `Fire.landInPit(log, power)` | tump + anillo de chispas (`ring`, más grande si es pesada) + pulso de luz mínimo. |
| `Fire.onPeak({pit, intensity})` | callback del pico. `fire.peak = {thresh:1.0, hold:5, cooldown:120}`; el pico se da cuando la intensidad del mejor pozo ≥ `thresh` durante `hold` s. Arranca con 60 s de cooldown. `fire.peakProgress` 0..1 para la UI. |
| `Fire.peakMoment(pit)` | llamas L extra, `flare(1.8)`, luz y `audio.peakRoar()`. NO da calor. |
| `FireAudio.peakRoar()` | rugido creciente ~2,2 s con estallido de chispas. |
| `FireAudio.forestEvent(kind)` | kind: `'hallazgo'`(default) / `'animal'` / `'viajero'` / `'peligro'`. |
| `FireAudio.achievement()` | fanfarria de campana, distinta de `levelUp`. |

Todo usa `fxScale` / `motion` (los visuales se atenúan; el sonido no).

## Código para GameScene (fase B)
**setupInput, rama slot** (reemplaza `this.audio.thud(0.15, 'light')`):
```js
const l = this.addLog(slot.key, x, y, 0);
this.startDrag(l, p, true);
l.pop();
this.audio.pull(l.wood.weight);
```

**setupCollisions** (reemplaza `this.audio.thud(power, log.wood.weight)`):
```js
if (log.pit && power > 0.2 && now - (log.lastLand || 0) > 250) {
  log.lastLand = now;
  this.fire.landInPit(log, power);       // tump + anillo de chispas
} else {
  this.audio.thud(power, log.wood.weight);
}
```
(`log.pit` lo actualiza `Fire.update` cada frame.)

**Fogata pico** (en `setupFireEvents`; el bonus lo pone progresión por `gainCalor`, acá solo el esqueleto):
```js
this.fire.onPeak = ({ pit }) => {
  const bonus = Math.round(this.rate * (this.state.mods.peakSecs || 30)); // a coordinar con progresión
  if (bonus > 0) this.state.gainCalor(bonus);
  this.floatText(pit.x, GROUND_Y - 250, `¡Fogata en su punto! +${bonus}`, '#ffb347', 1.5);
  this.ui.toast('🔥 ¡Fogata en su punto máximo!', 'unlock', 3500);
  if (this.fx) {
    this.cameras.main.flash(300, 255, 200, 120, false);
    this.cameras.main.shake(260, 0.003);
  }
};
```
Opcional: `fire.peak.hold/cooldown` pueden venir de mods (`this.fire.peak.cooldown = 120 * mods.peakCd`).

**Eventos de bosque** (donde progresión dispare el encuentro, p. ej. en `giveLoot`/`updateTripAndHelpers`):
```js
this.audio.forestEvent(ev.kind);   // 'hallazgo'|'animal'|'viajero'|'peligro'; si el dato no trae kind, 'hallazgo'
```
**Logros** (donde progresión los otorgue):
```js
this.audio.achievement();
if (this.fx) this.fire.flare(1.2);
```

# Ciclo 2 — Fase B (hecho)
`node --check` OK en GameScene. Sin probar en navegador.
- **Rama slot de `setupInput`**: `l.pop()` + `audio.pull(weight)` (reemplaza el `thud(0.15)`).
- **`setupCollisions`**: si la leña está en un pozo y `power > 0.2` (cooldown 250 ms por leña) → `fire.landInPit(log, power)` (tump + anillo de chispas); si no, el `thud` de siempre.
- **Pico**: progresión ya había conectado `fire.onPeak → peakBonus` (calor + flash/shake con `fx`); `Fire.peakMoment` pone el rugido y las llamas antes. Sin cambios míos.
- **Eventos de bosque / logros**: progresión ya llama `audio.forestEvent` y `audio.achievement` + `flare(1.2)`. Agregué un destello cálido (con `fx`) en hallazgos.
- Chispas alargadas: no requieren nada en la escena.
- Pendiente de verificación en navegador: rotación de `spark-streak` (`rotate.onUpdate`), umbral del pico (`fire.peak.thresh = 1.0`, `hold = 5 s`) y volumen del tump.

# Ciclo 3 (hecho)
`node --check` OK en Fire, FireAudio y GameScene. Verificado en 127.0.0.1:8080 llamando `fire.update` a mano (el rAF del panel no avanzaba): el progreso sube 0→1, el pico dispara una vez, sin errores de consola. El aspecto del anillo NO lo vi (sin captura con el juego corriendo).

- **Indicador previo de pico (en el mundo, sin tocar UI)**: `Fire.updatePeak` ahora lleva el progreso **por pozo** (`pit.peakT`). Cada pozo dibuja (Graphics `peakGfx`, ADD) una elipse de brasas a su alrededor: fondo tenue + tramo lleno desde arriba, que va de naranja a amarillo cálido con el progreso, con latido. Si la intensidad cae bajo el umbral se vacía a 0,6× la velocidad de llenado. En la punta del arco saltan brasitas. Cada 0,55→0,25 s suena `audio.peakTick(prog)` (tono que sube hasta 1,5 octavas) y la luz del pozo pulsa. Con el cooldown activo no se dibuja nada. `fire.peakProgress` = máximo entre pozos (por si UI lo quiere).
- **Combo alto**: con combo ≥10 (cada 2 orbes) `fire.glowNear(x, amount)` hace brillar el pozo más cercano.
- **`fx`**: sin movimiento no hay latido, línea más fina, ni brasitas; los pulsos de luz se atenúan con `fxScale`. El sonido sigue. El resto de efectos de escena ya estaba protegido con `this.fx`.
- Tuning: `fire.peak = {thresh: 1.0, hold: 5, cooldown: 120}`. El anillo empieza a verse apenas la intensidad ≥ umbral.

# C4-A (fase 1 hecha: solo `FireAudio.js`)
`node --check` OK. Sonidos nuevos (todos respetan `on`/volumen, con throttle):
| API | Sonido |
|---|---|
| `rotateTick()` | clic de madera seco, tono ±8 %, throttle 40 ms. |
| `woodTock(weight)` | "tock" hueco sine+triángulo+clic (150/210/290 Hz según heavy/medium/light). |
| `structureFormed('tipi'\|'cabana')` | tipi: 4 notas ascendentes brillantes; cabaña: acorde grave + subgrave + tock pesado. |
| `structureLost()` | suspiro descendente suave. |
| `overflowReject()` | "tuc" apagado + susurro de aire (sin castigo). |
| `logReturn()` | whoosh ascendente + plop. |
| `pitGrow(size)` | 3–8 golpes de piedra escalonados + rugido grave que crece con el tamaño; remate de notas desde size 3; `levelUp(1)` desde size 6. |

## Código para la fase 2 (GameScene + Fire)
Todo cuelga de los eventos de la decisión 6. En `create()` después de `setupFireEvents()`:
```js
this.setupFeelEvents();
```
```js
setupFeelEvents() {
  const ev = this.events;

  // Rotar: un clic por paso (~12°).
  ev.on('log:rotate', () => this.audio.rotateTick());

  // Apoyo estable sobre otra leña.
  ev.on('log:rest', ({ log }) => {
    this.audio.woodTock(log.wood.weight);
    if (this.fx) log.pop(0.3);
  });

  // Pozo lleno: rechazo suave. Brasitas hacia afuera y borde ámbar una vez.
  ev.on('log:overflow', ({ log, pit }) => {
    this.audio.overflowReject();
    if (!this.fx) return;
    const dir = log.x < pit.x ? -1 : 1;
    this.fire.ring.emitParticleAt(log.x + dir * 10, log.y, 5);
    pit.flash = Math.max(pit.flash || 0, 0.2);
    this.floatText(log.x, log.y - 30, 'Pozo lleno', '#ffb36b', 0.9);   // una vez por pozo cada 4 s
  });

  // Vuelve al estante.
  ev.on('log:returned', ({ log }) => {
    this.audio.logReturn();
    this.floatText(RACK.right - 60, 300, '↩', '#cfe8b0');
  });

  // Estructura formada: llamarada ordenada y luz, un solo momento por pozo.
  ev.on('structure:formed', ({ pit, type, quality }) => {
    this.audio.structureFormed(type);
    this.fire.structureBurst?.(pit, type, quality);                   // ver abajo
    if (this.fx) {
      this.cameras.main.flash(160, 255, 215, 130, false);
      const name = type === 'cabana' ? 'cabaña' : 'tipi';
      this.floatText(pit.x, GROUND_Y - 260, `¡Armaste ${type === 'cabana' ? 'una' : 'un'} ${name}!`, '#ffd36b', 1.4);
    }
  });
  ev.on('structure:lost', () => this.audio.structureLost());

  // Crecer de tamaño: shake, piedras que caen, llamarada y brasas.
  ev.on('pit:grow', ({ pit, size }) => this.playGrow(pit, size));
}

playGrow(pit, size) {
  this.audio.pitGrow(size);
  if (!this.fx) return;
  const k = Math.min(1, size / 7);
  this.cameras.main.shake(300 + 300 * k, 0.003 + 0.004 * k);
  this.time.delayedCall(350, () => this.fire.ring.emitParticleAt(pit.x, GROUND_Y - 20, Math.round(20 + 30 * k)));
  this.time.delayedCall(800, () => {
    this.fire.flare(1.2 + 0.6 * k);
    this.fire.emberRise(900 + 900 * k);
    this.cameras.main.flash(220, 255, 190, 110, false);
  });
  this.floatText(pit.x, GROUND_Y - 280, 'Fogata más grande', '#ffd36b', 1.4);
}
```
`Fire.structureBurst(pit, type, quality)` (nuevo, lo agrego en fase 2 cuando Fire sea mío):
```js
structureBurst(pit, type, quality = 1) {
  const k = this.fxScale;
  pit.flash = Math.max(pit.flash || 0, (0.6 + 0.5 * quality) * k);
  const n = Math.round((type === 'cabana' ? 14 : 18) * k);
  // Llamarada ordenada: llamas L en columna estrecha (tipi, alta) o ancha y baja (cabaña).
  for (let i = 0; i < n; i++) {
    this.scene.time.delayedCall(i * 25, () => {
      const spread = type === 'cabana' ? pit.half * 0.9 : pit.half * 0.25;
      this.flames.L.emitParticleAt(pit.x + (Math.random() - 0.5) * spread, GROUND_Y - 50 - Math.random() * 30);
    });
  }
  this.ring.emitParticleAt(pit.x, GROUND_Y - 30, Math.round(14 * k));
}
```
Notas:
- `structure:formed` solo se emite al cruzar 0.6 estable, así que no hace falta cooldown extra del lado del feel. El texto "Pozo lleno" necesita un cooldown (`pit.lastFullMsg`, 4 s) porque `log:overflow` puede repetirse.
- Con `fx` desactivado queda solo el sonido.
- Si física emite `log:rest` muy seguido, el throttle de `woodTock` (80 ms) lo cubre; conviene además un cooldown por leña (300 ms) de su lado.

# C4-A fase 2 (hecho)
`node --check` OK en GameScene, Fire y FireAudio. Probado en 127.0.0.1:8080 emitiendo a mano los 7 eventos y corriendo `fire.update` con una estructura "tipi" estable: sin errores. No vi el aspecto en pantalla ni jugué armando estructuras reales. (Ojo al probar: el navegador cachea los módulos; hizo falta `fetch(url,{cache:'reload'})` + recargar.)

- **GameScene**: `setupFeelEvents()` (se llama tras `setupFireEvents`) engancha `log:rotate` (tick), `log:rest` (tock + `pop(0.3)`), `log:overflow` (rechazo, brasitas hacia afuera, "Pozo lleno" con cooldown 4 s por pozo), `log:returned` (sonido + ↩), `structure:formed` (sonido, `fire.structureBurst`, flash dorado, "¡Armaste un tipi/una cabaña!"), `structure:lost` (suspiro) y `pit:grow` → `playGrow` (shake, anillo de piedras, a los 800 ms `flare`+`emberRise`+flash, texto). `pit:grow` se ignora el primer segundo (al construir la escena). Sin `fx` solo suena.
- **Fire**: `structureBurst(pit,type,quality)` y `draftOf(pit)`. Estructura estable (tipi/cabaña) ⇒ "tira": +30 % de llamas (×calidad), −50 % de humo, luz que parpadea hasta 60 % menos y se estira 18 % hacia arriba, y rugido más limpio.
- **FireAudio**: `setFire(intensity, air, draft)` sube el gain del rugido y su Q con `draft`.
- No toqué rotación, paredes, detección ni layout.

# C4-B (hecho)
`node --check` OK (GameScene, Fire, FireAudio). En 127.0.0.1:8080 emití los eventos a mano y corrí `fire.update` con `stackPenalty` y cabaña formada, y llamé `drawAimGhost` con una leña: sin errores. No vi el aspecto en pantalla ni lo probé con arrastres reales.

- **`log:overflow` por `reason`** (en `setupFeelEvents`): `full` = rechazo + brasitas + "Pozo lleno" (cooldown 4 s); `wall` = `woodTock('light', soft)` (≈55 % de volumen); `out` = nada. Física ya limita a 800 ms por pozo y `overflowReject` tiene throttle 200 ms. Ojo: otro handler (no mío) en `setupFeelEvents` muestra un toast "está lleno" con cooldown de 15 s para cualquier `reason`; conviene filtrarlo a `reason === 'full'` (UI/física).
- **Fantasma de ángulo** (`GameScene.drawAimGhost`, Graphics `aimGfx`, ADD, depth 85): mientras se agarra una leña y pasó <1,4 s del último `log:rotate` (`drag.lastRotT`), dibuja el eje de la leña, un arco desde la horizontal hasta el ángulo actual y marcas a ±45° y ±60° (se encienden dorado a ±4°). Se desvanece solo; no se dibuja con `fx` apagado.
- **Cabaña distinta del tipi** (`Fire.structureBurst`): sin llamarada alta; 10 brasas que suben lento desde el hueco, 8 chispas y un brillo bajo sostenido de ~4 s (`pit.glowHold`); flash ámbar más largo y bajo. El sonido ya era grave y sólido. El texto duplicado (A3) no se tocó.
- **`stackPenalty` visible** (`Fire.emitFor`): con `monton` en pozo grande, los leños ardiendo emiten humo extra de un emisor nuevo `smokeHeavy` (gris oscuro, más grande y lento) proporcional a la penalidad, y suman siseo (`stats.hiss`, hasta ~0,25 por leño a penalidad máxima).

## C4-C · Game feel de las ranuras magnéticas

- **FireAudio**: `snapClack(weight, step)` (clac de madera; el tono sube un paso de escala mayor por pieza, hasta 7), `unsnap(reason)` ('grab' tic suave; 'support' crujido + caída), `slotTick()` (tick sutil de imán), `structureFormed(type, pieces)` suma un brillo final si la estructura tenía ≥3 piezas encajadas.
- **GameScene**: `onSlotSnap` (clac con cadena por pozo `pit.snapChain`, que vence a los 7 s; a los 140 ms —fin de la animación— polvo en los extremos, 1–3 chispas y `log.pop(0.4)` como asentamiento visual, sin mover el cuerpo); `log:unsnap` (sonido + polvo si 'support'; desencajar por 'grab' baja la cadena en 1); `slotMagnetTick()` (tick al cambiar `drag.slot`, con 180 ms de histéresis; está fuera de `updateSlots` para no pisar a Arte). `structure:formed` consume la cadena: acorde + brillo y calidad visual +0,1 si ≥3 piezas.
- Todo respeta `this.fx` (sin movimiento: solo sonido).
- **Verificado**: `node --check` OK; eventos emitidos a mano en 127.0.0.1:8080, 0 errores de consola. **No** probado con arrastres reales ni visto en pantalla (panel sin rAF); el volumen de clac/tick conviene oírlo.
