// Interfaz en HTML encima del canvas: calor, nivel, pronóstico, noche, avisos,
// botones de acción, tienda/construcción/cenizas, cartas de nivel, resumen y ajustes.
// Los datos nuevos (levelCur, levelNeed, rateInfo, night, need, effect, rarity)
// son opcionales: si faltan, la interfaz degrada sin errores.

import { WEATHER_INFO } from '../objects/Weather.js';
import { SIZES } from '../data/sizes.js';
import { MainMenu } from './MainMenu.js';

const $ = (id) => document.getElementById(id);

export function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('es-AR');
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(2)}M`;
}

const num = (x) => typeof x === 'number' && Number.isFinite(x);

const RARITY = {
  comun: 'Común',
  rara: 'Rara',
  epica: 'Épica',
};

// Pestañas del panel: botón que las abre y título.
const TABS = {
  tienda: { btn: 'btn-shop', title: '🎒 Mercachifle', empty: 'Todavía no hay nada. Seguí juntando calor.' },
  construir: { btn: 'btn-build', title: '🔨 Construir', empty: 'Todavía no hay nada. Seguí juntando calor.' },
  cenizas: { btn: 'btn-ashes', title: '🪦 Cenizas', empty: 'Sobreviví a una noche para ganar cenizas.' },
};

const MIN_SCALE = 0.72;
const WORLD_W = 1280; // tamaño del mundo de juego (para pasar coordenadas del mundo a la UI)
const STRUCT_NAMES = { tipi: 'Tipi', cabana: 'Cabaña', monton: 'Montón' };

// Efectos de un ítem: usa effects[] / effect; para "agrandar" deduce capacidad, aire y calor de sizes.js.
function effectsOf(i) {
  if (Array.isArray(i.effects) && i.effects.length) return i.effects;
  if (String(i.id).startsWith('agrandar_') && !i.maxed && SIZES[i.level + 1]) {
    const a = SIZES[i.level];
    const b = SIZES[i.level + 1];
    return [
      { label: 'Capacidad', before: `×${a.cap}`, after: `×${b.cap}` },
      { label: 'Aire', before: `+${Math.round((a.air - 1) * 100)}%`, after: `+${Math.round((b.air - 1) * 100)}%` },
      { label: 'Calor', before: `×${a.mult}`, after: `×${b.mult}` },
    ];
  }
  return i.effect && i.effect.label ? [i.effect] : [];
}

// Fila de ranuras de tamaño ("Fogón ▮▮▮▯▯▯▯ → Hogar") para los ítems "agrandar".
function sizeBarHtml(i) {
  if (!String(i.id).startsWith('agrandar_')) return '';
  const cur = SIZES[i.level];
  const next = i.maxed ? null : SIZES[i.level + 1];
  if (!cur) return '';
  const slots = SIZES.map((_, k) => `<i class="${k <= i.level ? 'on' : k === i.level + 1 ? 'next' : ''}"></i>`).join('');
  return `<div class="sizebar"><span class="slots">${slots}</span><span class="sz">${cur.name}${next ? ` → <b>${next.name}</b>` : ' · máximo'}</span></div>`;
}
const CONFIRM_MS = 3000;

// Tutorial contextual: cada paso avanza al lograr la acción (no por tiempo). Si un paso no se
// cumple en `ttl` segundos se da por visto para no insistir. `minSize`: el paso espera ese tamaño de pozo.
const TUT_KEY = 'fogata-ui-tut';
const TUT_STEPS = [
  { id: 'drag', text: 'Arrastrá una leña hasta el pozo', on: { grab: 'Llevala al pozo y soltala' }, done: 'drop', ttl: 45 },
  { id: 'snap', text: 'Soltala sobre una silueta: encaja sola', done: 'snap', ttl: 45 },
  { id: 'ignite', text: 'Tocá la leña para prenderla con un fósforo', done: 'ignite', guide: 'matches', ttl: 30 },
  { id: 'tipi', text: 'Inclinala ±60° y soltala al costado: tipi', touch: 'Inclinala con ↺ ↻ y soltala al costado: tipi', on: { rotate: 'Ahora soltala al costado del pozo' }, done: 'structure:tipi', ttl: 60 },
  { id: 'cabana', text: 'Dos bases y un puente encima: cabaña', done: 'structure:cabana', minSize: 3, ttl: 60 },
];
// Avisos urgentes de la escena: ganan sobre el tutorial.
const URGENT = /apag[óo]|fósforos|ahog|brasas|bosque|lleno/i;

// Efecto "antes → después": si no hay valor previo ('—' o vacío), se muestra solo el "después".
const sinAntes = (v) => v == null || ['', '—', '-'].includes(String(v).trim());
const efectoTexto = (e) => (sinAntes(e.before) ? `${e.after}` : `${e.before} → ${e.after}`);

function priceHtml(p) {
  const parts = [];
  if (p.calor) parts.push(`<span class="c c-calor">🔥 ${fmt(p.calor)}</span>`);
  if (p.tronco) parts.push(`<span class="c c-tronco">🪵 ${p.tronco}</span>`);
  if (p.ceniza) parts.push(`<span class="c c-ceniza">🪦 ${fmt(p.ceniza)}</span>`);
  return parts.join(' ') || 'Gratis';
}

export class Ui {
  constructor() {
    this.root = $('ui');
    this.handlers = {};
    this.panelTab = null;
    this.panelSig = '';
    this.metaSig = '';
    this.shown = new Set();
    this.lastCalor = 0;
    this.barHold = false;
    this.cardsLocked = false;
    this.lockTimer = 0;
    this.confirmTimer = 0;
    this.prestigeTimer = 0;
    this.toastQ = [];
    this.noticeQ = [];
    this.nightGoal = 0;
    this.achList = [];
    this.eventCb = null;
    this.touchMode = !!window.matchMedia?.('(pointer: coarse)').matches;
    this.rotHintUntil = 0;
    this.dragging = false;
    this.pitEls = [];
    this.tutOn = false;
    this.tutDone = this.readTut();
    this.tutStep = null;
    this.tutT0 = 0;
    this.tutSize = 0;
    this.tutKind = '';
    this.lastHint = '';
    this.goalSig = '';
    this.goalAt = 0;
    this.guided = null;
    this.curNotice = null; // logro/evento que se ve ahora en #achv
    this.achvTimer = 0;
    this.achvOutTimer = 0;
    this.panelClosedAt = -Infinity; // último cierre de panel (para el Esc)
    this.lv = { level: -1, shown: 0, target: 0, from: 0, t0: 0, dur: 0, raf: 0, need: 0 };
    this.reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('reduce-motion', this.reduceMotion);

    this.mm = new MainMenu(this);
    this.setupFit();
    this.setupButtons();
    this.setupSettings();
    this.setupKeys();
    this.setupRotate();
    // Avisos en cola: salen de a uno cuando no hay ningún modal abierto.
    setInterval(() => { this.pump(); if (!this.modalOpen) this.tutTick(); }, 200);
    // Pantalla de título al abrir el juego (la pausa se aplica cuando la escena hace bind).
    this.mm.open('title');
  }

  // --- Montaje ---

  // La interfaz se dibuja en "píxeles lógicos": escala con un piso (así no queda
  // diminuta) y se agranda el lienzo lógico para que los anclajes sigan en los bordes.
  setupFit() {
    const coarse = window.matchMedia?.('(pointer: coarse)');
    const fit = () => {
      const w = $('wrap').clientWidth;
      const h = $('wrap').clientHeight;
      const k = Math.max(MIN_SCALE, w / 1280);
      const lw = w / k;
      this.root.style.width = `${lw}px`;
      this.root.style.height = `${h / k}px`;
      this.root.style.transform = `scale(${k})`;
      this.root.style.setProperty('--k', k.toFixed(3));
      this.root.classList.toggle('small', k < 0.95 || !!coarse?.matches);
      this.root.classList.toggle('compact', lw < 980);
    };
    // #wrap cambia de tamaño después del evento resize: observarlo asegura refitear al tamaño final.
    if (window.ResizeObserver) new ResizeObserver(fit).observe($('wrap'));
    // Respaldo: dos frames después del evento, cuando el navegador ya aplicó el nuevo tamaño.
    const later = () => requestAnimationFrame(() => requestAnimationFrame(fit));
    window.addEventListener('resize', later);
    window.addEventListener('orientationchange', later);
    fit();
  }

  setupButtons() {
    $('btn-forest').addEventListener('click', () => this.handlers.forest?.());
    for (const tab of Object.keys(TABS)) $(TABS[tab].btn).addEventListener('click', () => this.togglePanel(tab));
    $('panel-close').addEventListener('click', () => this.closePanel());
    $('calor-rate').addEventListener('click', () => $('rate-pop').classList.toggle('open'));
    $('calor-rate').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('rate-pop').classList.toggle('open'); } });
    $('btn-mute').addEventListener('click', () => this.toggleMute());
    $('btn-menu').addEventListener('click', () => this.toggleMenu(true));
    $('btn-resume').addEventListener('click', () => this.mm.back());
    // Mismo flujo que "Partida nueva" del título: confirmación + copia previa.
    $('btn-reset').addEventListener('click', () => this.mm.askNew());
    $('panel-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-buy]');
      if (!btn || btn.disabled) return;
      if (this.panelTab === 'cenizas') this.handlers.buyAsh?.(btn.dataset.buy);
      else this.handlers.buy?.(btn.dataset.buy);
    });
    $('panel-meta').addEventListener('click', (e) => {
      const b = e.target.closest('#btn-prestige');
      if (!b || b.disabled) return;
      if (b.dataset.confirm) {
        clearTimeout(this.prestigeTimer);
        this.handlers.prestige?.();
        this.closePanel();
      } else {
        b.dataset.confirm = '1';
        b.textContent = '¿Seguro? Reinicia la partida';
        clearTimeout(this.prestigeTimer);
        this.prestigeTimer = setTimeout(() => {
          const cur = $('btn-prestige');
          if (cur) {
            delete cur.dataset.confirm;
            cur.textContent = cur.dataset.label || 'Prestigio';
          }
        }, CONFIRM_MS);
      }
    });
    $('cards').addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) this.pickCard(card.dataset.card);
    });
    $('summary-ok').addEventListener('click', () => this.hideSummary());
    $('event-choices').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-choice]');
      if (b) this.chooseEvent(b.dataset.choice);
    });
  }

  setupSettings() {
    $('set-volume').addEventListener('input', (e) => {
      const muted = this.handlers.volume?.(Number(e.target.value) / 100);
      // Mover el slider desmutea: el checkbox y el ícono tienen que seguir ese estado.
      this.syncSettings(typeof muted === 'boolean' ? muted : false);
    });
    $('set-mute').addEventListener('change', () => this.toggleMute());
    $('set-motion').addEventListener('change', (e) => {
      this.setReduceMotion(e.target.checked);
      this.handlers.motion?.(e.target.checked);
    });
    $('btn-export').addEventListener('click', () => this.exportSave());
    $('btn-import').addEventListener('click', () => $('file-import').click());
    $('file-import').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      file.text().then((text) => this.importSave(text)).catch(() => this.toast('No se pudo leer el archivo.', 'bad'));
    });
  }

  // Atajos de teclado. Respetan el bloqueo: con cartas abiertas solo valen 1/2/3.
  setupKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'))) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const cardsOpen = !$('modal').classList.contains('hidden');
      const summaryOpen = !$('summary').classList.contains('hidden');
      const menuOpen = !$('menu').classList.contains('hidden');

      if (!$('event').classList.contains('hidden')) {
        if (e.repeat) return;
        const btns = $('event-choices').children;
        const i = key === 'Enter' ? 0 : Number(key) - 1;
        if (btns[i]) btns[i].click();
        return;
      }
      if (cardsOpen) {
        if (key >= '1' && key <= '3' && !e.repeat) {
          const card = $('cards').children[Number(key) - 1];
          if (card) this.pickCard(card.dataset.card);
        }
        return;
      }
      if (summaryOpen) {
        if (!e.repeat && (key === 'Escape' || key === 'Enter')) this.hideSummary();
        return;
      }
      if (key === 'Escape') {
        if (e.repeat) return;
        if (menuOpen) {
          // Una sola pulsación: cancela la confirmación de reinicio y cierra el menú.
          this.clearResetConfirm();
          this.toggleMenu(false);
        } else if (this.panelTab) this.closePanel();
        // Un panel recién cerrado no abre el menú (ni pausa) con el mismo Esc.
        else if (performance.now() - this.panelClosedAt >= 300) this.toggleMenu(true);
        return;
      }
      if (menuOpen || e.repeat) return;
      const open = (tab) => {
        if (!$(TABS[tab].btn).classList.contains('hidden')) this.togglePanel(tab);
      };
      if (key === 's') open('tienda');
      else if (key === 'c') open('construir');
      else if (key === 'a') open('cenizas');
      else if (key === 'm') $('btn-mute').click();
      else if (key === 'b') {
        const b = $('btn-forest');
        if (!b.classList.contains('hidden') && !b.disabled) b.click();
      }
    });
  }

  // Dock táctil ↺ ↻: mientras se mantiene apretado llama rotate(dir); al soltar, rotate(0).
  setupRotate() {
    // El modo touch se detecta por el último puntero usado.
    window.addEventListener('pointerdown', (e) => {
      this.touchMode = e.pointerType === 'touch';
      if (!this.touchMode) $('rot').classList.add('hidden');
    }, true);
    let held = null;
    const release = () => {
      if (held == null) return;
      held = null;
      this.handlers.rotate?.(0);
    };
    for (const b of $('rot').querySelectorAll('button')) {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { b.setPointerCapture?.(e.pointerId); } catch (err) { /* puntero ya liberado */ }
        held = Number(b.dataset.dir);
        this.handlers.rotate?.(held);
        this.rotated();
      });
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, release);
    }
    // Q/E, rueda y clic derecho los maneja la escena (física); acá solo se cancela la pista.
  }

  // La escena avisa cada vez que el jugador rota: la pista de rotación ya no hace falta.
  rotated() {
    if (this.rotHintUntil) {
      this.rotHintUntil = 0;
      this.setHint('');
    }
  }

  // La escena avisa si hay una leña agarrada (muestra/oculta el dock en touch).
  setDragging(on) {
    this.dragging = !!on;
    $('rot').classList.toggle('hidden', !(this.dragging && this.touchMode));
  }

  // --- Tutorial contextual ---

  readTut() {
    try { return new Set(JSON.parse(localStorage.getItem(TUT_KEY) || '[]')); } catch (err) { return new Set(); }
  }

  saveTut() {
    try { localStorage.setItem(TUT_KEY, JSON.stringify([...this.tutDone])); } catch (err) { /* sin storage */ }
  }

  // Primer paso pendiente cuyo requisito (tamaño de pozo) ya se cumple.
  nextTutStep() {
    return TUT_STEPS.find((s) => !this.tutDone.has(s.id) && (!s.minSize || this.tutSize >= s.minSize)) || null;
  }

  get tutActive() { return this.tutOn && !!this.tutStep; }

  // Eventos de la escena: 'load' {progress, size} (arranca o descarta), 'restart', 'grab', 'drop', 'snap',
  // 'ignite', 'rotate', 'structure:tipi', 'structure:cabana', 'pit:grow' {size}.
  tutorial(event, data = {}) {
    if (event === 'restart') {
      this.tutDone = new Set();
      this.saveTut();
      this.tutOn = true;
    } else if (event === 'load') {
      this.tutSize = data.size | 0;
      if (data.progress) TUT_STEPS.forEach((s) => this.tutDone.add(s.id));
      else this.tutOn = true;
      if (data.progress) this.saveTut();
    } else if (event === 'pit:grow') {
      this.tutSize = Math.max(this.tutSize, data.size | 0);
    } else if (this.tutOn) {
      const cur = this.tutStep;
      if (cur && cur.on && cur.on[event] && event !== cur.done) {
        this.tutKind = event;
      } else {
        // Un evento cumple su paso y todos los anteriores (soltar sobre una silueta ya incluye "soltar").
        const i = TUT_STEPS.findIndex((s) => s.done === event);
        if (i >= 0) {
          TUT_STEPS.slice(0, i + 1).forEach((s) => this.tutDone.add(s.id));
          this.tutKind = '';
          this.saveTut();
        }
      }
    }
    this.tutRefresh();
  }

  // Recalcula el paso actual y su texto/resalte; reaplica la pista vigente.
  tutRefresh() {
    const step = this.tutOn ? this.nextTutStep() : null;
    if (step !== this.tutStep) {
      this.tutStep = step;
      this.tutT0 = performance.now();
      this.tutKind = '';
    }
    this.guide(step && step.guide ? step.guide : null);
    this.setHint(this.lastHint);
  }

  tutText() {
    const s = this.tutStep;
    if (!s) return '';
    if (this.tutKind && s.on && s.on[this.tutKind]) return s.on[this.tutKind];
    return this.touchMode && s.touch ? s.touch : s.text;
  }

  // Vence el tiempo de un paso que el jugador no cumple: se da por visto.
  tutTick() {
    const s = this.tutStep;
    if (s && performance.now() - this.tutT0 > s.ttl * 1000) {
      this.tutDone.add(s.id);
      this.saveTut();
      this.tutRefresh();
    }
  }

  // Pulso sobre un elemento (id) para decir dónde mirar; guide(null) lo quita.
  guide(id) {
    if (this.guided === id) return;
    if (this.guided) $(this.guided)?.classList.remove('guide');
    this.guided = id || null;
    if (id) $(id)?.classList.add('guide');
  }

  // Pista de rotación, una sola vez por jugador. Persistencia: handlers.settingSeen?.('rotateHint')
  // debe devolver true si ya se mostró; si no lo marcó, lo marca y devuelve false.
  // Sin handler cae a localStorage.
  hintRotate(isTouch = this.touchMode) {
    if (this.tutActive) return false; // el tutorial ya enseña a encajar y rotar
    let seen;
    if (this.handlers.settingSeen) seen = this.handlers.settingSeen('snapHint') === true;
    else {
      try {
        seen = localStorage.getItem('fogata-ui-seen-snap') === '1';
        if (!seen) localStorage.setItem('fogata-ui-seen-snap', '1');
      } catch (err) { seen = false; }
    }
    if (seen) return false;
    const text = isTouch ? 'Soltá sobre la silueta y encaja · ↺ ↻ para inclinar' : 'Soltá cerca de una silueta y encaja · Rueda/Q·E gira para el tipi';
    this.rotHintUntil = performance.now() + (isTouch ? 6000 : 9000);
    this.setHint(text, true);
    return true;
  }

  // Etiquetas livianas sobre cada pozo. list = [{ i, screenX, screenY, size, sizeName, load, cap,
  // structure: { type, quality } }] con x/y en coordenadas del MUNDO (1280×720); la UI las escala.
  pitInfo(list = []) {
    const box = $('pit-info');
    const k = this.root.clientWidth ? this.root.clientWidth / WORLD_W : 1;
    const n1 = (v) => (v < 10 ? v.toFixed(1).replace('.0', '') : String(Math.round(v)));
    list.forEach((p, idx) => {
      let el = this.pitEls[idx];
      if (!el) {
        el = document.createElement('div');
        el.className = 'pit-tag';
        el.innerHTML = '<span class="t-name"></span><span class="t-bar"><b></b></span><span class="t-num"></span><span class="t-st"></span><span class="t-bonus"></span><span class="t-slots"></span><span class="t-warn"></span>';
        box.appendChild(el);
        this.pitEls[idx] = el;
      }
      const set = (sel, text) => {
        const c = el.querySelector(sel);
        if (c.textContent !== text) c.textContent = text;
      };
      const s = p.structure;
      const hasLoad = num(p.load) && num(p.cap) && p.cap > 0;
      const ratio = hasLoad ? p.load / p.cap : 0;
      set('.t-name', p.sizeName || (SIZES[p.size] && SIZES[p.size].name) || '');
      set('.t-num', hasLoad ? `${n1(p.load)}/${n1(p.cap)} 🪵` : '');
      const legs = num(p.tipiLegs) ? p.tipiLegs : 0;
      const pieces = num(p.cabinPieces) ? p.cabinPieces : 0;
      let st = s && STRUCT_NAMES[s.type] && s.quality > 0.05 ? `${STRUCT_NAMES[s.type]} ${Math.round(s.quality * 100)}%` : '';
      if (legs > 0 && legs < 4 && pieces === 0) st = `Tipi ${legs}/4`;
      else if (s && s.type === 'cabana' && pieces > 0 && pieces < 5 && s.quality > 0.05) st = `Cabaña ${pieces}/5 ${Math.round(s.quality * 100)}%`;
      set('.t-st', st);
      // bonus = fracción de calor extra de la estructura (0.22 → "+22%"); acepta también un texto.
      set('.t-bonus', typeof p.bonus === 'string' ? p.bonus : num(p.bonus) && p.bonus > 0.004 ? `+${Math.round(p.bonus * 100)}%` : '');
      set('.t-slots', num(p.slotsTotal) && p.slotsTotal > 0 ? `${num(p.slotsUsed) ? p.slotsUsed : 0}/${p.slotsTotal} ranuras` : '');
      set('.t-warn', num(p.stackPenalty) && p.stackPenalty > 0.05 ? 'ahogado: armá tipi/cabaña' : '');
      const bar = el.querySelector('.t-bar');
      bar.classList.toggle('hidden', !hasLoad);
      bar.firstChild.style.width = `${Math.round(Math.min(1, ratio) * 100)}%`;
      el.classList.toggle('mid', ratio >= 0.7 && ratio < 0.95);
      el.classList.toggle('full', ratio >= 0.95);
      el.style.left = `${p.screenX * k}px`;
      el.style.top = `${p.screenY * k}px`;
    });
    while (this.pitEls.length > list.length) this.pitEls.pop().remove();
  }

  // El pozo `i` rechazó leña por estar lleno. Toast una sola vez por jugador; después, solo parpadea la etiqueta.
  pitFull(i, text) {
    const el = this.pitEls[i];
    if (el) {
      el.classList.remove('blink');
      void el.offsetWidth;
      el.classList.add('blink');
    }
    let seen = this.fullToastSeen;
    if (this.handlers.settingSeen) seen = this.handlers.settingSeen('pitFull') === true;
    else this.fullToastSeen = true;
    if (!seen && text) {
      this.toast(text, 'info', 4500);
      return true;
    }
    return false;
  }

  bind(handlers) {
    this.handlers = handlers;
    // Si el título ya estaba abierto antes de que existiera la escena, pausa ahora.
    if (this.mm.isOpen) handlers.pause?.(true);
  }

  // --- Ajustes ---

  // Refleja { volume, muted, reduceMotion } en los controles. No llama a los handlers.
  applySettings(s = {}) {
    if (num(s.volume)) $('set-volume').value = Math.round(s.volume * 100);
    if (typeof s.muted === 'boolean') this.showMuted(s.muted);
    if (typeof s.reduceMotion === 'boolean') {
      this.setReduceMotion(s.reduceMotion);
      $('set-motion').checked = s.reduceMotion;
    } else {
      $('set-motion').checked = this.reduceMotion;
    }
  }

  setReduceMotion(on) {
    this.reduceMotion = !!on;
    document.documentElement.classList.toggle('reduce-motion', this.reduceMotion);
  }

  showMuted(muted) {
    $('btn-mute').textContent = muted ? '🔇' : '🔊';
    $('set-mute').checked = !!muted;
  }

  // Lleva el checkbox y el ícono de mute al estado real del audio (sin llamar a los handlers).
  syncSettings(muted) {
    if (typeof muted === 'boolean') this.showMuted(muted);
  }

  toggleMute() {
    const muted = this.handlers.mute?.();
    if (typeof muted === 'boolean') this.showMuted(muted);
    else this.showMuted(!$('set-mute').checked);
  }

  exportSave() {
    const text = this.handlers.export?.();
    if (typeof text !== 'string' || !text) return this.toast('No se pudo exportar el guardado.', 'bad', 3000);
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fogata-master-guardado.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toast('Guardado exportado.', 'info', 2500);
    } catch (err) {
      this.toast('No se pudo exportar el guardado.', 'bad', 3000);
    }
  }

  importSave(text) {
    const r = this.handlers.import?.(text);
    const ok = r === true || (r && r.ok !== false && r !== false);
    if (!this.handlers.import) this.toast('Importar todavía no está disponible.', 'bad', 3000);
    else if (!ok) this.toast('Ese archivo no es un guardado válido.', 'bad', 3500);
    else {
      this.toast('Guardado importado.', 'unlock', 3000);
      this.toggleMenu(false);
    }
  }

  clearResetConfirm() {
    clearTimeout(this.confirmTimer);
    const b = $('btn-reset');
    delete b.dataset.confirm;
    b.textContent = 'Partida nueva…';
  }

  // --- Mostrar / avisos ---

  // Muestra un elemento la primera vez con animación.
  reveal(id, on = true) {
    const el = $(id);
    if (on && el.classList.contains('hidden')) {
      el.classList.remove('hidden');
      if (!this.shown.has(id)) {
        this.shown.add(id);
        el.classList.add('reveal');
      }
    } else if (!on) {
      el.classList.add('hidden');
    }
  }

  markNew(id) {
    $(id).classList.add('new');
  }

  toast(text, kind = 'info', ms = 5200) {
    // Sin repetidos: si el mismo texto ya espera o se ve, no se vuelve a apilar.
    if (this.toastQ.some((t) => t.text === text)) return;
    if ([...$('toasts').children].some((el) => el.textContent === text && !el.classList.contains('out'))) return;
    this.toastQ.push({ text, kind, ms });
    while (this.toastQ.length > 8) this.toastQ.shift();
    this.pump();
  }

  // Muestra avisos pendientes: nunca más de 2 toasts a la vez ni con un modal abierto.
  pump() {
    const achv = $('achv');
    // Con un modal abierto, la zona de arriba (pronóstico, noche, avisos) se oculta por CSS.
    const open = this.modalOpen;
    this.root.classList.toggle('modal-open', open);
    if (open) {
      // Con un modal abierto, el logro en pantalla se retira y vuelve a la cola: sale al cerrar el modal.
      if (this.curNotice && !achv.classList.contains('hidden')) {
        this.noticeQ.unshift(this.curNotice);
        this.curNotice = null;
        clearTimeout(this.achvTimer);
        clearTimeout(this.achvOutTimer);
        achv.classList.add('hidden');
      }
      return;
    }
    const box = $('toasts');
    if (this.noticeQ.length && achv.classList.contains('hidden')) this.showNotice(this.noticeQ.shift());
    while (this.toastQ.length && [...box.children].filter((el) => !el.classList.contains('out')).length < 2) {
      const { text, kind, ms } = this.toastQ.shift();
      const el = document.createElement('div');
      el.className = `toast ${kind}`;
      el.textContent = text;
      box.appendChild(el);
      // Con cola larga duran menos para no atrasarse.
      const life = this.toastQ.length > 2 ? Math.min(ms, 2500) : ms;
      setTimeout(() => el.classList.add('out'), life);
      setTimeout(() => el.remove(), life + 600);
    }
  }

  // Logro: tarjeta vistosa arriba al centro. Respeta la cola de modales.
  achievement({ icon = '🏆', name = '', desc = '' } = {}) {
    this.noticeQ.push({ type: 'achv', icon, name, desc, head: '¡Logro desbloqueado!' });
    this.pump();
  }

  // Evento de bosque: sin choices es un aviso; con choices, un mini-diálogo (onChoose(id)).
  forestEvent({ icon = '🌲', title = '', text = '', choices } = {}, onChoose) {
    if (choices && choices.length) this.noticeQ.push({ type: 'dialog', icon, title, text, choices, onChoose });
    else this.noticeQ.push({ type: 'event', icon, name: title, desc: text, head: 'En el bosque', onChoose });
    this.pump();
  }

  showNotice(n) {
    if (n.type === 'dialog') {
      this.closePanel();
      $('event-ico').textContent = n.icon;
      $('event-title').textContent = n.title;
      $('event-text').textContent = n.text;
      $('event-choices').innerHTML = n.choices.map((c, i) => `<button class="act" data-choice="${c.id}"><span class="lbl">${c.label}</span><kbd>${i + 1}</kbd></button>`).join('');
      this.eventCb = n.onChoose;
      this.reveal('event', true);
      $('event-choices').firstElementChild?.focus?.({ preventScroll: true });
      return;
    }
    const el = $('achv');
    this.curNotice = n;
    el.className = `${n.type === 'event' ? 'ev' : 'ach'} reveal`;
    el.innerHTML = `<div class="a-ico">${n.icon}</div><div><div class="a-head">${n.head}</div><div class="a-name">${n.name}</div><div class="a-desc">${n.desc}</div></div>`;
    clearTimeout(this.achvTimer);
    clearTimeout(this.achvOutTimer);
    this.achvTimer = setTimeout(() => this.endNotice(), n.type === 'event' ? 6500 : 5000);
  }

  // Retira el logro en pantalla con animación; un evento sin elecciones avisa al terminar.
  endNotice() {
    const n = this.curNotice;
    if (!n) return;
    this.curNotice = null;
    const el = $('achv');
    el.classList.add('out');
    clearTimeout(this.achvOutTimer);
    this.achvOutTimer = setTimeout(() => {
      el.classList.add('hidden');
      if (n.type === 'event') n.onChoose?.(null);
    }, 500);
  }

  chooseEvent(id) {
    $('event').classList.add('hidden');
    const cb = this.eventCb;
    this.eventCb = null;
    cb?.(id);
  }

  // Lista de logros dentro del menú. list = [{icon, name, desc, done}]
  renderAchievements(list = []) {
    this.achList = list;
    const done = list.filter((a) => a.done).length;
    $('achv-sum').textContent = `🏆 Logros ${done}/${list.length}`;
    $('achv-list').innerHTML = list.map((a) => `
      <div class="ach-row ${a.done ? 'done' : ''}">
        <span class="a-ico">${a.done ? a.icon : '🔒'}</span>
        <span><b>${a.name}</b><br><small>${a.desc}</small></span>
      </div>`).join('');
  }

  // Pista de abajo. Los avisos urgentes (se apagó, se ahoga…) ganan; si no, manda el paso del tutorial.
  // `urgent` lo puede decir la escena; por defecto se deduce del texto.
  setHint(text, force = false, urgent = URGENT.test(text || '')) {
    const el = $('hint');
    this.lastHint = force ? this.lastHint : text;
    if (!force && performance.now() < this.rotHintUntil) return;
    if (!force && this.tutStep && !(text && urgent)) text = this.tutText();
    if (el.dataset.text === text) return;
    el.dataset.text = text;
    el.style.opacity = 0;
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = text ? 1 : 0;
    }, 200);
  }

  // --- HUD ---

  update(v) {
    const calorEl = $('calor-val');
    calorEl.textContent = fmt(v.calor);
    if (v.calor > this.lastCalor + 0.5 && v.bump) {
      const c = calorEl.parentElement;
      c.classList.remove('bump');
      void c.offsetWidth;
      c.classList.add('bump');
    }
    this.lastCalor = v.calor;
    const ng = v.night && v.night.phase === 'night' && num(v.night.goal) ? v.night.goal : 0;
    this.nightGoal = ng;
    this.updateRate(v.rate, v.rateInfo);
    this.updateGoal();

    if (v.levelOn) this.updateLevel(v);

    $('matches-val').textContent = v.matches;
    $('matches').classList.toggle('empty', v.matches === 0);

    this.updateForecast(v);
    this.updateNight(v.night);

    const forest = $('btn-forest');
    forest.disabled = !!v.trip;
    forest.querySelector('.fill').style.width = v.trip ? `${Math.round(v.trip.progress * 100)}%` : '0';
    forest.querySelector('.lbl').textContent = v.trip ? '🌲 En el bosque…' : '🌲 Ir al bosque';

    if (v.trip) {
      this.reveal('away', true);
      $('away-fill').style.width = `${Math.round(v.trip.progress * 100)}%`;
    } else {
      this.reveal('away', false);
    }

    this.renderHelpers(v.helpers || []);
    if (this.panelTab) this.renderPanel();
  }

  // rateInfo: texto, o { text, mult, lines: [..] }. Todo opcional.
  updateRate(rate, info) {
    const el = $('calor-rate');
    const mult = info && num(info.mult) && info.mult > 1.01 ? ` ×${info.mult.toFixed(2).replace(/\.?0+$/, '')}` : '';
    this.lastRate = rate || 0;
    const g = this.nightGoal;
    el.classList.toggle('vs-good', g > 0 && rate >= g);
    el.classList.toggle('vs-bad', g > 0 && rate < g);
    el.textContent = g > 0 ? `+${(rate || 0).toFixed(1)} / ${g.toFixed(1)} /s${mult}` : `+${(rate || 0).toFixed(1)} /s${mult}`;
    let tip = '';
    if (typeof info === 'string') tip = info;
    else if (info && Array.isArray(info.parts)) tip = info.parts.map((p) => (p.text ? `${p.label}: ${p.text}` : p.label)).join('\n');
    else if (info) tip = info.text || (Array.isArray(info.lines) ? info.lines.join('\n') : '');
    if (el.title !== tip) el.title = tip;
    // Desglose descubrible: el ⓘ junto al ritmo abre/cierra la lista (también al pasar el mouse).
    const parts = info && Array.isArray(info.parts) ? info.parts : [];
    el.classList.toggle('has-info', parts.length > 0);
    const html = parts.map((p) => `<div><span>${p.label}</span><b>${p.text || ''}</b></div>`).join('');
    const pop = $('rate-pop');
    if (pop.dataset.html !== html) {
      pop.dataset.html = html;
      pop.innerHTML = html;
    }
  }

  // Próximo objetivo (handlers.nextGoal → {icon, text, progress}); si no existe, no se muestra nada.
  updateGoal() {
    const now = performance.now();
    if (now - this.goalAt < 500) return;
    this.goalAt = now;
    let g = null;
    try { g = this.handlers.nextGoal?.() || null; } catch (err) { g = null; }
    const box = $('goal');
    const sig = g ? `${g.icon}|${g.text}|${num(g.progress) ? Math.round(g.progress * 100) : -1}` : '';
    if (sig === this.goalSig) return;
    this.goalSig = sig;
    box.classList.toggle('hidden', !g);
    if (!g) return;
    box.querySelector('.g-txt').textContent = `${g.icon || '🎯'} ${g.text}`;
    const bar = box.querySelector('.g-bar');
    bar.classList.toggle('hidden', !num(g.progress));
    if (num(g.progress)) bar.firstChild.style.width = `${Math.round(Math.max(0, Math.min(1, g.progress)) * 100)}%`;
  }

  updateLevel(v) {
    const lv = this.lv;
    const hasNums = num(v.levelCur) && num(v.levelNeed);
    if (!this.barHold) {
      const p = num(v.levelProgress) ? v.levelProgress : hasNums && v.levelNeed > 0 ? v.levelCur / v.levelNeed : 0;
      $('lvl-fill').style.width = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
    }
    lv.need = hasNums ? v.levelNeed : 0;
    if (!hasNums) {
      lv.level = v.level;
      $('lvl-text').textContent = `Nivel ${v.level}`;
      return;
    }
    const target = v.levelCur;
    // Nivel nuevo o contador que baja: se acomoda de golpe; si no, cuenta hacia arriba.
    if (lv.level !== v.level || target < lv.shown || this.reduceMotion || document.hidden || target - lv.shown < 2) {
      lv.level = v.level;
      lv.shown = lv.target = target;
      this.renderLevelText();
      return;
    }
    if (target === lv.target) return;
    lv.from = lv.shown;
    lv.target = target;
    lv.t0 = performance.now();
    lv.dur = Math.min(500, 120 + (target - lv.shown) * 2);
    if (!lv.raf) lv.raf = requestAnimationFrame((t) => this.tickLevel(t));
  }

  tickLevel(now) {
    const lv = this.lv;
    const k = Math.min(1, (now - lv.t0) / lv.dur);
    lv.shown = lv.from + (lv.target - lv.from) * (1 - (1 - k) ** 3);
    this.renderLevelText();
    lv.raf = k < 1 ? requestAnimationFrame((t) => this.tickLevel(t)) : 0;
  }

  renderLevelText() {
    const lv = this.lv;
    $('lvl-text').textContent = `Nivel ${lv.level} · ${fmt(lv.shown)}/${fmt(lv.need)}`;
  }

  // Barra de nivel al 100% hasta que se elija carta (la usa la secuencia de subida).
  fillLevelBar() {
    this.barHold = true;
    $('lvl-fill').style.width = '100%';
  }

  updateForecast(v) {
    const fc = $('forecast');
    if (v.forecast) {
      const info = WEATHER_INFO[v.forecast.kind];
      const secs = Math.ceil(v.forecast.timer);
      fc.classList.remove('hidden');
      fc.classList.toggle('active', v.forecast.phase === 'activo');
      fc.textContent = v.forecast.phase === 'aviso'
        ? `${info.icon} ${info.name} en ${secs} s`
        : `${info.icon} ${info.name} · ${secs} s`;
    } else if (v.weatherOn) {
      fc.classList.remove('hidden', 'active');
      fc.textContent = v.skyLabel || '🌙 Noche despejada';
    } else {
      fc.classList.add('hidden');
    }
  }

  // night: { phase: 'dia'|'atardecer'|'noche'|'amanecer', n, tLeft, goal, pct, goalMet, cold }.
  updateNight(n) {
    const el = $('night');
    const phase = n && n.phase;
    const on = phase === 'dusk' || phase === 'night';
    if (!on) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const secs = Math.max(0, Math.ceil(n.tLeft || 0));
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    let text;
    let meter = '';
    if (phase === 'dusk') {
      text = `🌅 Atardece · la noche llega en ${secs} s`;
      if (num(n.goal)) meter = `<span class="n-need">Necesitás ${n.goal.toFixed(1)} 🔥/s</span>`;
    } else {
      text = `🌙 Noche ${n.n || ''} · ${clock}`;
      if (num(n.goal)) {
        const rate = this.lastRate || 0;
        const miss = num(n.missing) ? n.missing : Math.max(0, n.goal - rate);
        meter = `<span class="n-rate ${miss > 0.05 ? 'bad' : 'good'}">${rate.toFixed(1)} / ${n.goal.toFixed(1)} 🔥/s</span> `
          + (miss > 0.05 ? `<span class="n-need">te faltan ${miss.toFixed(1)} /s</span>` : '<span class="n-ok">¡vas bien! ✓</span>');
      }
    }
    const sig = `${text}|${meter}`;
    if (el.dataset.sig !== sig) {
      el.dataset.sig = sig;
      el.querySelector('.n-lbl').textContent = text;
      el.querySelector('.n-meter').innerHTML = meter;
    }
    el.title = num(n.goal) ? `Mantené ${n.goal.toFixed(1)} de calor por segundo para que no te gane el frío` : '';
    el.classList.toggle('met', !!n.goalMet);
    el.classList.toggle('cold', num(n.cold) && n.cold > 0.5);
    el.classList.toggle('dusk', phase === 'dusk');
    el.querySelector('.bar > div').style.width = `${Math.round(Math.max(0, Math.min(1, n.pct || 0)) * 100)}%`;
  }

  renderHelpers(helpers) {
    const box = $('helpers');
    const sig = helpers.map((h) => h.id).join(',');
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig;
      box.innerHTML = helpers.map((h) => `<div class="helper" data-id="${h.id}">${h.label}<div class="bar"><div></div></div></div>`).join('');
    }
    helpers.forEach((h, i) => {
      const bar = box.children[i]?.querySelector('.bar > div');
      if (bar) bar.style.width = `${Math.round(h.progress * 100)}%`;
    });
  }

  // --- Panel (tienda / construir / cenizas) ---

  togglePanel(tab) {
    if (this.panelTab === tab) {
      this.closePanel();
      return;
    }
    if (this.panelTab) $(TABS[this.panelTab].btn).setAttribute('aria-pressed', 'false');
    this.panelTab = tab;
    this.panelSig = '';
    this.metaSig = '';
    this.ash = 0;
    const t = TABS[tab];
    $(t.btn).classList.remove('new');
    $(t.btn).setAttribute('aria-pressed', 'true');
    $('panel-title').textContent = t.title;
    this.reveal('panel', true);
    this.renderPanel();
  }

  closePanel() {
    if (this.panelTab) {
      $(TABS[this.panelTab].btn).setAttribute('aria-pressed', 'false');
      this.panelClosedAt = performance.now();
    }
    this.panelTab = null;
    clearTimeout(this.prestigeTimer);
    $('panel').classList.add('hidden');
  }

  // Faltante de un ítem: usa i.need si viene; si no, deduce el calor con el último valor conocido.
  needOf(i) {
    if (i.need) return i.need;
    if (i.price.ceniza) return { ceniza: Math.max(0, Math.ceil(i.price.ceniza - (this.ash || 0))) };
    return i.price.calor ? { calor: Math.max(0, Math.ceil(i.price.calor - this.lastCalor)) } : {};
  }

  renderMeta() {
    const box = $('panel-meta');
    const info = this.panelTab === 'cenizas' ? this.handlers.ashInfo?.() : null;
    const m = info && { ceniza: info.ash, dawns: info.dawns, canPrestige: info.canPrestige, gain: info.gain };
    if (info) this.ash = info.ash;
    if (!m) {
      box.classList.add('hidden');
      this.metaSig = '';
      return;
    }
    // Ganancia esperada de prestigiar ahora (gain de ashInfo): solo si el prestigio está disponible.
    const gain = m.canPrestige && num(m.gain) ? `+${fmt(m.gain)} 🪦` : '';
    const sig = `${m.ceniza}|${m.dawns}|${m.canPrestige}|${gain}`;
    if (sig === this.metaSig) return;
    this.metaSig = sig;
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="meta-line">🪦 Cenizas: <b>${fmt(m.ceniza || 0)}</b> · 🌄 Amaneceres de esta partida: <b>${m.dawns || 0}</b></div>
      <div class="meta-sub">${m.canPrestige ? 'Podés reiniciar la partida y quedarte con las mejoras de cenizas.' : 'Sobreviví al menos un amanecer en esta partida para poder prestigiar.'}</div>
      ${gain ? `<div class="meta-gain">Prestigio ahora: <b>${gain}</b></div>` : ''}
      <button id="btn-prestige" class="act danger" data-label="Prestigio" ${m.canPrestige ? '' : 'disabled'}>Prestigio</button>`;
  }

  renderPanel() {
    this.renderMeta();
    let items;
    if (this.panelTab === 'cenizas') {
      items = (this.handlers.ashItems?.() || []).map((i) => ({ ...i, price: { ceniza: i.cost } }));
    } else {
      items = this.handlers.items?.(this.panelTab) || [];
    }
    const sig = items.map((i) => `${i.id}:${i.level}:${i.affordable}:${i.price.calor}:${i.price.tronco}:${i.price.ceniza}:${i.maxed}:${i.blocked || ''}`).join('|');
    if (sig !== this.panelSig) {
      this.panelSig = sig;
      const scroll = $('panel-list').scrollTop;
      $('panel-list').innerHTML = items.length
        ? items.map((i) => `
        <div class="item ${i.maxed ? 'maxed' : ''}" data-id="${i.id}">
          <div class="ico">${i.icon}</div>
          <div>
            <div class="name">${i.name} ${i.max > 1 && i.max < 99 ? `<span class="lvl">${i.level}/${i.max}</span>` : ''}</div>
            <div class="desc">${i.desc}</div>
            ${sizeBarHtml(i)}
            <div class="eff hidden"></div>
            <div class="effs hidden"></div>
            <div class="blocked ${i.blocked && !i.maxed ? '' : 'hidden'}">🚧 ${i.blocked || ''}</div>
            <div class="need hidden"></div>
          </div>
          <button data-buy="${i.id}" class="${i.affordable && !i.maxed && !i.blocked ? 'affordable' : ''}" ${i.affordable && !i.maxed && !i.blocked ? '' : 'disabled'}>${i.maxed ? 'Listo' : priceHtml(i.price)}</button>
        </div>`).join('')
        : `<div class="item empty"><div></div><div class="desc">${TABS[this.panelTab].empty}</div><div></div></div>`;
      $('panel-list').scrollTop = scroll;
    }
    this.refreshItems(items);
  }

  // Parte del panel que cambia seguido (faltantes, efecto): se actualiza en el lugar.
  refreshItems(items) {
    for (const i of items) {
      const row = $('panel-list').querySelector(`.item[data-id="${i.id}"]`);
      if (!row) continue;
      const effs = i.maxed ? [] : effectsOf(i);
      const single = row.querySelector('.eff');
      const multi = row.querySelector('.effs');
      single.classList.add('hidden');
      const html = effs.map((e) => `<div><span class="e-l">${e.label}</span> <span class="e-v">${efectoTexto(e)}</span></div>`).join('');
      if (multi.dataset.html !== html) {
        multi.dataset.html = html;
        multi.innerHTML = html;
      }
      multi.classList.toggle('hidden', !effs.length);
      const need = i.maxed ? {} : this.needOf(i);
      const short = [];
      if (need.calor > 0) short.push(`${fmt(need.calor)} 🔥`);
      if (need.tronco > 0) short.push(`${need.tronco} 🪵`);
      if (need.ceniza > 0) short.push(`${fmt(need.ceniza)} 🪦`);
      const nd = row.querySelector('.need');
      const text = short.length ? `faltan ${short.join(' / ')}` : '';
      if (nd.textContent !== text) nd.textContent = text;
      nd.classList.toggle('hidden', !text);
      row.querySelector('.c-calor')?.classList.toggle('short', need.calor > 0);
      row.querySelector('.c-tronco')?.classList.toggle('short', need.tronco > 0);
      row.querySelector('.c-ceniza')?.classList.toggle('short', need.ceniza > 0);
    }
  }

  // --- Cartas ---

  // cards: [{ id, icon, name, desc, max, rarity?, effect?: { label, before, after } }]
  showCards(cards, levels = {}, opts = {}) {
    // Las cartas no se abren encima de la tienda o construir.
    this.closePanel();
    $('cards').innerHTML = cards.map((c, idx) => {
      const rarity = RARITY[c.rarity] ? c.rarity : 'comun';
      const delay = num(c.delay) ? c.delay : idx * 80 + (rarity === 'epica' ? 250 : 0);
      const e = c.effect;
      return `
      <div class="card interactive ${rarity}" data-card="${c.id}" data-delay="${delay}" style="animation-delay:${this.reduceMotion ? 0 : delay}ms" role="button" tabindex="0">
        <div class="c-rar">${RARITY[rarity]}</div>
        <div class="c-ico">${c.icon}</div>
        <div class="c-name">${c.name}</div>
        ${c.max < 99 ? `<div class="c-lvl">Nivel ${(levels[c.id] || 0) + 1}/${c.max}</div>` : ''}
        <div class="c-desc">${c.desc}</div>
        ${e && e.label ? `<div class="c-eff"><span class="e-lbl">${e.label}</span><span class="e-val">${sinAntes(e.before) ? `<b>${e.after}</b>` : `<s>${e.before}</s> → <b>${e.after}</b>`}</span></div>` : ''}
        <div class="c-key">${idx + 1}</div>
      </div>`;
    }).join('');
    this.lockCards(num(opts.lockMs) ? opts.lockMs : 0);
    this.reveal('modal', true);
    this.pump(); // retira ya un logro que estuviera en pantalla
  }

  // Bloquea la elección unos ms para que un clic sin querer no la salte.
  lockCards(ms) {
    clearTimeout(this.lockTimer);
    if (!(ms > 0)) {
      this.cardsLocked = false;
      $('cards').classList.remove('locked');
      return;
    }
    this.cardsLocked = true;
    $('cards').classList.add('locked');
    this.lockTimer = setTimeout(() => {
      this.cardsLocked = false;
      $('cards').classList.remove('locked');
    }, ms);
  }

  pickCard(id) {
    if (this.cardsLocked || !id) return;
    this.handlers.pickCard?.(id);
  }

  hideCards() {
    clearTimeout(this.lockTimer);
    this.cardsLocked = false;
    this.barHold = false;
    $('cards').classList.remove('locked');
    $('modal').classList.add('hidden');
  }

  // --- Resumen (noche / prestigio) ---

  // data: { title, sub?, success?, lines: [{ icon?, label, value }] | [[label, value]], button?, onClose? }
  showSummary(data = {}) {
    const box = $('summary');
    // El resumen tampoco se abre encima del panel de tienda o construir.
    this.closePanel();
    data = this.describeSummary(data);
    this.summaryData = data;
    $('summary-title').textContent = data.title || 'Resumen';
    $('summary-sub').textContent = data.sub || '';
    $('summary-sub').classList.toggle('hidden', !data.sub);
    box.classList.toggle('fail', data.success === false);
    box.classList.toggle('win', data.success === true);
    $('summary-lines').innerHTML = (data.lines || []).map((l, idx) => {
      const [label, value, icon] = Array.isArray(l) ? l : [l.label, l.value, l.icon];
      return `<div class="s-line" style="animation-delay:${this.reduceMotion ? 0 : 120 + idx * 90}ms"><span>${icon ? `${icon} ` : ''}${label}</span><b>${value ?? ''}</b></div>`;
    }).join('');
    $('summary-ok').textContent = data.button || 'Seguir';
    this.summaryAt = performance.now();
    this.reveal('summary', true);
    this.pump();
    $('summary-ok').focus?.({ preventScroll: true });
  }

  // Traduce los datos de la escena ({kind:'dawn'|'prestige', ...}) a título y líneas.
  describeSummary(d) {
    if (d.kind === 'dawn') {
      const lines = [['Calor de la noche', fmt(d.calor || 0), '🔥']];
      if (num(d.goal)) lines.push(['Meta', `${d.goal.toFixed(1)} /s`, '🎯']);
      if (d.success) lines.push(['Cenizas ganadas', `+${d.ash}`, '🪦'], ['Cenizas disponibles', fmt(d.ashAvail ?? d.ashTotal ?? 0), '🪦'], ['Cenizas en total', fmt(d.ashTotal || 0), '🪦']);
      if (d.cardFree) lines.push(['Premio del alba', 'elegís 1 carta gratis', '🃏']);
      return {
        ...d,
        title: d.success ? `¡Amaneció! Noche ${d.n} superada` : `El frío ganó la noche ${d.n}`,
        sub: d.success ? 'Sobreviviste hasta el alba.' : 'No perdés progreso: la noche se repite.',
        lines,
        button: d.success ? 'Seguir' : 'Reintentar',
      };
    }
    if (d.kind === 'prestige') {
      return {
        ...d,
        success: true,
        title: 'Nuevo comienzo',
        sub: 'Las cenizas te acompañan.',
        lines: [
          ['Cenizas ganadas', `+${fmt(d.ash || 0)}`, '🪦'],
          ['Cenizas disponibles', fmt(d.ashAvail ?? d.ashTotal ?? 0), '🪦'],
          ['Cenizas en total', fmt(d.ashTotal || 0), '🪦'],
          ['Calor de la partida', fmt(d.runCalor || 0), '🔥'],
          ['Amaneceres', d.dawns || 0, '🌄'],
          ['Prestigios', d.prestiges || 0, '♻️'],
        ],
        button: 'A encender',
      };
    }
    return d;
  }

  hideSummary() {
    // Ignora un cierre accidental en los primeros instantes.
    if (performance.now() - (this.summaryAt || 0) < 350) return;
    if ($('summary').classList.contains('hidden')) return;
    $('summary').classList.add('hidden');
    const d = this.summaryData;
    this.summaryData = null;
    this.handlers.pause?.(false);
    this.handlers.summaryClose?.(d);
    d?.onClose?.();
  }

  // --- Menú ---

  // Abre el menú de pausa (o lo cierra todo). Lo maneja MainMenu, que también pausa la escena.
  toggleMenu(on) {
    this.clearResetConfirm();
    if (on) this.mm.open('pause');
    else this.mm.close();
    this.pump();
  }

  // Ajustes: el panel #menu se muestra encima del menú principal.
  prepareSettings() {
    this.clearResetConfirm();
    const list = this.handlers.achievements?.();
    if (list) this.renderAchievements(list);
    $('btn-resume').focus?.({ preventScroll: true });
  }

  // Vuelve la interfaz al estado del arranque (partida nueva).
  resetView() {
    for (const id of ['hud-calor', 'level', 'forecast', 'night', 'btn-forest', 'btn-shop', 'btn-build', 'btn-ashes', 'panel', 'modal', 'summary', 'away']) {
      $(id).classList.add('hidden');
    }
    for (const id of ['btn-shop', 'btn-build', 'btn-ashes']) $(id).classList.remove('new');
    this.shown.clear();
    this.panelTab = null;
    this.barHold = false;
    this.lv.level = -1;
    this.lv.shown = this.lv.target = 0;
    $('toasts').innerHTML = '';
    $('event').classList.add('hidden');
    $('achv').classList.add('hidden');
    clearTimeout(this.achvTimer);
    clearTimeout(this.achvOutTimer);
    this.curNotice = null;
    this.toastQ = [];
    this.noticeQ = [];
    this.eventCb = null;
    this.tutOn = false;
    this.tutStep = null;
    this.tutDone = new Set();
    this.saveTut();
    this.guide(null);
    this.goalSig = '';
    $('goal').classList.add('hidden');
  }

  get modalOpen() {
    return ['modal', 'menu', 'mm', 'summary', 'event'].some((id) => !$(id).classList.contains('hidden'));
  }
}
