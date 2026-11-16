// Interfaz en HTML encima del canvas: calor, nivel, pronóstico, noche, avisos, herramientas,
// botones de acción y sus ventanas (Pyroshop, construir, habilidades, cenizas), resumen y ajustes.
// Cualquier ventana abierta pausa el juego (ver syncPause).
// Los datos nuevos (levelCur, levelNeed, rateInfo, night, need, effect, rarity)
// son opcionales: si faltan, la interfaz degrada sin errores.

import { WEATHER_INFO } from '../objects/Weather.js';
import { SIZES } from '../data/sizes.js';
import { TOOLS } from '../data/tools.js';
import { DEV_ON } from '../data/dev.js';
import { HEAT } from '../utils/heat.js';
import { MainMenu } from './MainMenu.js';

const $ = (id) => document.getElementById(id);

export function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('es-AR');
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}k`;
  return `${(n / 1e6).toFixed(2)}M`;
}

const num = (x) => typeof x === 'number' && Number.isFinite(x);

// Ventanas del panel: botón que las abre, tecla y título.
// Para sumar una ventana: una entrada acá, su botón en index.html y, si no es una lista de ítems, su `render`.
const TABS = {
  tienda: { btn: 'btn-shop', key: 's', title: '🛒 Pyroshop', empty: 'Todavía no hay nada. Seguí juntando calor.' },
  construir: { btn: 'btn-build', key: 'c', title: '🔨 Construir', empty: 'Todavía no hay nada. Seguí juntando calor.' },
  arbol: { btn: 'btn-tree', key: 'h', title: '🌳 Habilidades', render: 'renderTree', wide: true },
  cenizas: { btn: 'btn-ashes', key: 'a', title: '🪦 Cenizas', empty: 'Sobreviví a una noche para ganar cenizas.' },
  dev: { btn: 'btn-dev', key: 'F12', title: '🛠 Dev', render: 'renderDev' },
};

const MIN_SCALE = 0.72;
const WORLD_W = 1280; // tamaño del mundo de juego (para pasar coordenadas del mundo a la UI)
const STRUCT_NAMES = { tipi: 'Armada' };

// Efectos de un ítem: la lista `effects` si viene, o su `effect` suelto.
function effectsOf(i) {
  if (Array.isArray(i.effects) && i.effects.length) return i.effects;
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
const TOAST_PRIO = { bad: 2, unlock: 1 };

// Efecto "antes → después": si no hay valor previo ('—' o vacío), se muestra solo el "después".
const sinAntes = (v) => v == null || ['', '—', '-'].includes(String(v).trim());
const efectoTexto = (e) => (sinAntes(e.before) ? `${e.after}` : `${e.before} → ${e.after}`);

function priceHtml(p) {
  const parts = [];
  if (p.calor) parts.push(`<span class="c c-calor">${HEAT} ${fmt(p.calor)}</span>`);
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
    this.pausedByUi = null;
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
    this.setupTouchMode();
    // Avisos en cola: salen de a uno cuando no hay ningún modal abierto.
    setInterval(() => this.pump(), 200);
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
    $('tools').innerHTML = TOOLS.map((t) => `<button id="tool-${t.id}" class="tool" data-tool="${t.id}" title="${t.name}: ${t.desc}" aria-label="${t.name}">
        <span class="t-ico">${t.icon}</span><span class="t-txt">${t.name}</span>${t.res ? '<b class="t-count"></b>' : ''}<kbd>${t.key}</kbd>
      </button>`).join('');
    $('tools').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tool]');
      if (b) this.handlers.selectTool?.(b.dataset.tool);
    });
    for (const tab of Object.keys(TABS)) $(TABS[tab].btn).addEventListener('click', () => this.togglePanel(tab));
    $('btn-dev').classList.toggle('hidden', !DEV_ON);
    $('panel-close').addEventListener('click', () => this.closePanel());
    $('veil').addEventListener('click', () => this.closePanel());
    $('calor-rate').addEventListener('click', () => $('rate-pop').classList.toggle('open'));
    $('calor-rate').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('rate-pop').classList.toggle('open'); } });
    $('btn-mute').addEventListener('click', () => this.toggleMute());
    $('btn-menu').addEventListener('click', () => this.toggleMenu(true));
    $('btn-resume').addEventListener('click', () => this.mm.back());
    // Mismo flujo que "Partida nueva" del título: confirmación + copia previa.
    $('btn-reset').addEventListener('click', () => this.mm.askNew());
    $('panel-list').addEventListener('click', (e) => {
      const node = e.target.closest('[data-learn]');
      if (node) {
        this.showSkill(node.dataset.learn);
        if (this.handlers.learn?.(node.dataset.learn)) this.renderPanel();
        return;
      }
      const dev = e.target.closest('button[data-dev]');
      if (dev) {
        this.handlers.dev?.(dev.dataset.dev);
        dev.classList.remove('done');
        void dev.offsetWidth;
        dev.classList.add('done');
        return;
      }
      const btn = e.target.closest('button[data-buy]');
      if (!btn || btn.disabled) return;
      if (this.panelTab === 'cenizas') this.handlers.buyAsh?.(btn.dataset.buy);
      else this.handlers.buy?.(btn.dataset.buy);
    });
    $('panel-list').addEventListener('pointerover', (e) => {
      const node = e.target.closest('[data-learn]');
      if (node) this.showSkill(node.dataset.learn);
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
            cur.textContent = cur.dataset.label || 'Renacer';
          }
        }, CONFIRM_MS);
      }
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

  // Atajos de teclado. Con un diálogo o un resumen abierto, solo valen sus teclas.
  setupKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'))) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const summaryOpen = !$('summary').classList.contains('hidden');
      const menuOpen = !$('menu').classList.contains('hidden');

      if (!$('event').classList.contains('hidden')) {
        if (e.repeat) return;
        const btns = $('event-choices').children;
        const i = key === 'Enter' ? 0 : Number(key) - 1;
        if (btns[i]) btns[i].click();
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
      const tab = Object.keys(TABS).find((k) => TABS[k].key === key);
      if (tab) {
        if (key.length > 1) e.preventDefault();
        if (!$(TABS[tab].btn).classList.contains('hidden')) this.togglePanel(tab);
      } else if (key === 'm') $('btn-mute').click();
      else if (!this.panelTab && TOOLS.some((t) => t.key === key)) this.handlers.selectTool?.(TOOLS.find((t) => t.key === key).id);
    });
  }

  // El modo touch se detecta por el último puntero usado.
  setupTouchMode() {
    window.addEventListener('pointerdown', (e) => {
      this.touchMode = e.pointerType === 'touch';
    }, true);
  }

  // La escena avisa si hay una leña agarrada.
  setDragging(on) {
    this.dragging = !!on;
  }

  // Pulso sobre un elemento (id) para decir dónde mirar; guide(null) lo quita.
  guide(id) {
    if (this.guided === id) return;
    if (this.guided) $(this.guided)?.classList.remove('guide');
    this.guided = id || null;
    if (id) $(id)?.classList.add('guide');
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
        el.innerHTML = '<span class="t-name"></span><span class="t-bar"><b></b></span><span class="t-num"></span><span class="t-st"></span><span class="t-bonus"></span>';
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
      const st = s && STRUCT_NAMES[s.type] && s.quality > 0.05 ? `${STRUCT_NAMES[s.type]} ${Math.round(s.quality * 100)}%` : '';
      set('.t-st', p.choked ? '🌫️ ahogada en ceniza' : st);
      el.classList.toggle('choked', !!p.choked);
      // bonus = fracción de calor extra de la estructura (0.22 → "+22%"); acepta también un texto.
      set('.t-bonus', typeof p.bonus === 'string' ? p.bonus : num(p.bonus) && p.bonus > 0.004 ? `+${Math.round(p.bonus * 100)}%` : '');
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
    this.pausedByUi = null;
    this.syncPause();
  }

  // Cualquier ventana abierta pausa el juego: el fuego no se consume mientras comprás, elegís habilidades o estás en el menú.
  syncPause() {
    const on = !!this.panelTab || this.modalOpen;
    if (on === this.pausedByUi) return;
    this.pausedByUi = on;
    this.handlers.pause?.(on);
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
    // Prioridad: errores/urgencias (bad) > desbloqueos > info. Estable: a igual prioridad, por orden de llegada.
    this.toastQ.push({ text, kind, ms, prio: TOAST_PRIO[kind] || 0 });
    this.toastQ.sort((a, b) => b.prio - a.prio);
    // Cola corta: si se llena, se descarta el más viejo de la prioridad más baja.
    while (this.toastQ.length > 5) {
      const low = this.toastQ[this.toastQ.length - 1].prio;
      this.toastQ.splice(this.toastQ.findIndex((t) => t.prio === low), 1);
    }
    this.pump();
  }

  // Muestra avisos pendientes: nunca más de 2 toasts a la vez ni con un modal abierto.
  pump() {
    this.syncPause();
    const achv = $('achv');
    // Con un modal abierto, la zona de arriba (pronóstico, noche, avisos) se oculta por CSS.
    const open = this.modalOpen || !!this.panelTab;
    this.root.classList.toggle('modal-open', open);
    if (open) {
      // Con un modal abierto, los toasts en pantalla se retiran y vuelven a la cola (salen al cerrarlo).
      const back = [];
      for (const el of [...$('toasts').children]) {
        if (!el.classList.contains('out')) {
          const kind = el.dataset.kind || 'info';
          back.push({ text: el.textContent, kind, ms: 3000, prio: TOAST_PRIO[kind] || 0 });
        }
        el.remove();
      }
      this.toastQ.unshift(...back);
      this.toastQ.sort((a, b) => b.prio - a.prio);
      // El logro en pantalla se retira y vuelve a la cola: sale al cerrar el modal.
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
    // Un solo canal: con una tarjeta de logro a la vista cabe 1 toast; si no, 2 (las urgencias entran igual).
    const cap = achv.classList.contains('hidden') ? 2 : 1;
    const live = () => [...box.children].filter((el) => !el.classList.contains('out'));
    while (this.toastQ.length) {
      if (live().length >= cap) {
        // Una urgencia desplaza al toast más viejo en vez de esperar.
        if (this.toastQ[0].prio < 2) break;
        const old = live()[0];
        old.classList.add('out');
        setTimeout(() => old.remove(), 600);
      }
      const { text, kind, ms } = this.toastQ.shift();
      const el = document.createElement('div');
      el.dataset.kind = kind;
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
    if (this.noticeQ.some((n) => n.name === name) || this.curNotice?.name === name) return;
    this.noticeQ.push({ type: 'achv', icon, name, desc, head: '¡Logro desbloqueado!' });
    this.pump();
  }

  // Evento: sin choices es un aviso; con choices, un mini-diálogo (onChoose(id)).
  eventCard({ icon = '🔥', title = '', text = '', head = 'Aviso', choices } = {}, onChoose) {
    if (choices && choices.length) this.noticeQ.push({ type: 'dialog', icon, title, text, choices, onChoose });
    else this.noticeQ.push({ type: 'event', icon, name: title, desc: text, head, onChoose });
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

  // Pista de abajo: lo que conviene hacer ahora (la arma la escena, tutorial incluido).
  setHint(text, force = false) {
    const el = $('hint');
    this.lastHint = force ? this.lastHint : text;
    if (!force && performance.now() < this.rotHintUntil) return;
    // Pulso sobre la herramienta elegida cuando la pista habla de prender.
    this.guide(/fósforo|pedernal|prend/i.test(text || '') ? `tool-${this.activeTool || TOOLS[0].id}` : /rastrillo/i.test(text || '') ? 'tool-rastrillo' : null);
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
    // Luz del cielo (la escena pasa skyLabel): de día el HUD gana un fondo suave para no perderse sobre el cielo claro.
    const sky = !v.skyLabel ? 'night' : v.skyLabel.includes('☀') ? 'day' : v.skyLabel.includes('🌇') ? 'dusk' : 'night';
    if (sky !== this.sky) {
      this.sky = sky;
      for (const k of ['day', 'dusk', 'night']) this.root.classList.toggle(`sky-${k}`, k === sky);
    }

    if (v.levelOn) this.updateLevel(v);
    // Puntos de habilidad sin gastar: se ven en el nivel y en el botón del árbol.
    const pts = v.points | 0;
    if (pts !== this.points) {
      this.points = pts;
      const text = pts > 0 ? `● ${pts}` : '';
      $('lvl-points').textContent = pts > 0 ? `● ${pts} ${pts === 1 ? 'punto' : 'puntos'}` : '';
      $('tree-badge').textContent = text;
    }

    this.updateTools(v);
    this.updateForecast(v);
    this.updateNight(v.night);

    this.renderHelpers(v.helpers || []);
    if (this.panelTab) this.renderPanel();
  }

  // Barra de herramientas: la elegida resaltada y cuánto queda de las que se gastan.
  updateTools(v) {
    this.activeTool = v.tool;
    const have = v.tools || TOOLS.map((t) => t.id);
    for (const t of TOOLS) {
      const el = $(`tool-${t.id}`);
      el.classList.toggle('hidden', !have.includes(t.id));
      el.classList.toggle('on', t.id === v.tool);
      el.setAttribute('aria-pressed', t.id === v.tool);
      if (!t.res) continue;
      const n = v.res[t.res] || 0;
      el.querySelector('.t-count').textContent = n;
      el.classList.toggle('empty', n === 0);
    }
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
    box.querySelector('.g-txt').innerHTML = `${g.icon || '🎯'} ${g.text}`;
    const bar = box.querySelector('.g-bar');
    bar.classList.toggle('hidden', !num(g.progress));
    if (num(g.progress)) bar.firstChild.style.width = `${Math.round(Math.max(0, Math.min(1, g.progress)) * 100)}%`;
  }

  updateLevel(v) {
    const lv = this.lv;
    const hasNums = num(v.levelCur) && num(v.levelNeed);
    const p = num(v.levelProgress) ? v.levelProgress : hasNums && v.levelNeed > 0 ? v.levelCur / v.levelNeed : 0;
    $('lvl-fill').style.width = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
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
      if (num(n.goal)) meter = `<span class="n-need">Necesitás ${n.goal.toFixed(1)} ${HEAT}/s</span>`;
    } else {
      text = `🌙 Noche ${n.n || ''} · ${clock}`;
      if (num(n.goal)) {
        const rate = this.lastRate || 0;
        const miss = num(n.missing) ? n.missing : Math.max(0, n.goal - rate);
        meter = `<span class="n-rate ${miss > 0.05 ? 'bad' : 'good'}">${rate.toFixed(1)} / ${n.goal.toFixed(1)} ${HEAT}/s</span> `
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

  // --- Ventanas (Pyroshop / construir / habilidades / cenizas) ---

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
    $('panel').classList.toggle('wide', !!t.wide);
    $('panel-list').className = `tab-${tab}`;
    $('panel-list').innerHTML = '';
    $('veil').classList.remove('hidden');
    this.reveal('panel', true);
    this.renderPanel();
    this.pump();
  }

  closePanel() {
    if (this.panelTab) {
      $(TABS[this.panelTab].btn).setAttribute('aria-pressed', 'false');
      this.panelClosedAt = performance.now();
    }
    this.panelTab = null;
    clearTimeout(this.prestigeTimer);
    $('panel').classList.add('hidden');
    $('veil').classList.add('hidden');
    this.pump();
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
      <div class="meta-sub">${m.canPrestige ? 'Renacer reinicia la partida y conserva la ceniza y sus mejoras.' : 'Sobreviví al menos un amanecer en esta partida para poder renacer.'}</div>
      ${gain ? `<div class="meta-gain">Renacer ahora: <b>${gain}</b></div>` : ''}
      <button id="btn-prestige" class="act danger" data-label="Renacer" ${m.canPrestige ? '' : 'disabled'}>Renacer</button>`;
  }

  renderPanel() {
    this.renderMeta();
    const custom = TABS[this.panelTab].render;
    if (custom) return this[custom]();
    let items;
    if (this.panelTab === 'cenizas') {
      items = (this.handlers.ashItems?.() || []).map((i) => ({ ...i, price: { ceniza: i.cost } }));
    } else {
      items = this.handlers.items?.(this.panelTab) || [];
    }
    const sig = items.map((i) => `${i.id}:${i.level}:${i.affordable}:${i.price.calor}:${i.price.ceniza}:${i.maxed}:${i.blocked || ''}:${i.stock ?? ''}`).join('|');
    if (sig !== this.panelSig) {
      this.panelSig = sig;
      const scroll = $('panel-list').scrollTop;
      $('panel-list').innerHTML = items.length
        ? items.map((i) => `
        <div class="item ${i.maxed ? 'maxed' : ''}" data-id="${i.id}">
          <div class="ico">${i.icon}</div>
          <div>
            <div class="name">${i.name} ${i.max > 1 && i.max < 99 ? `<span class="lvl">${i.level}/${i.max}</span>` : ''}${num(i.stock) ? `<span class="lvl">tenés ${i.stock}</span>` : ''}</div>
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
      if (need.calor > 0) short.push(`${fmt(need.calor)} ${HEAT}`);
      if (need.ceniza > 0) short.push(`${fmt(need.ceniza)} 🪦`);
      const nd = row.querySelector('.need');
      const text = short.length ? `faltan ${short.join(' / ')}` : '';
      if (nd.dataset.text !== text) {
        nd.dataset.text = text;
        nd.innerHTML = text;
      }
      nd.classList.toggle('hidden', !text);
      row.querySelector('.c-calor')?.classList.toggle('short', need.calor > 0);
      row.querySelector('.c-ceniza')?.classList.toggle('short', need.ceniza > 0);
    }
  }

  // --- Árbol de habilidades ---

  // Una columna por rama; cada nodo muestra su nivel y se aprende con un clic si hay puntos y está abierto.
  renderTree() {
    const t = this.handlers.tree?.();
    if (!t) return;
    const sig = JSON.stringify(t);
    if (sig === this.panelSig) return;
    this.panelSig = sig;
    this.treeNodes = {};
    const node = (n) => {
      this.treeNodes[n.id] = n;
      const state = n.level >= n.max ? 'maxed' : n.can ? 'can' : !n.open ? 'locked' : '';
      return `<button class="skill ${state} ${n.level > 0 ? 'owned' : ''}" data-learn="${n.id}" style="grid-row:${n.row + 1};grid-column:${n.col + 1}" aria-label="${n.name}, nivel ${n.level} de ${n.max}">
          <span class="s-ico">${n.icon}</span>
          <span class="s-name">${n.name}</span>
          <span class="s-lvl">${n.level}/${n.max}</span>
          ${n.level < n.max ? `<span class="s-cost">● ${n.cost}</span>` : '<span class="s-cost">✔</span>'}
        </button>`;
    };
    const cols = (b) => 1 + Math.max(...b.nodes.map((n) => n.col));
    $('panel-list').innerHTML = `
      <div class="tree-points ${t.points > 0 ? 'has' : ''}">${t.points > 0 ? `● ${t.points} ${t.points === 1 ? 'punto' : 'puntos'} para gastar` : 'Sin puntos: cada nivel te da uno, y una buena noche también.'}</div>
      <div class="tree">${t.branches.map((b) => `
        <section class="branch" style="flex:${cols(b)}">
          <h3>${b.icon} ${b.name}</h3>
          <div class="nodes" style="grid-template-columns:repeat(${cols(b)}, 1fr)">${b.nodes.map(node).join('')}</div>
        </section>`).join('')}
      </div>
      <div id="tree-detail"></div>`;
    this.showSkill(this.skillShown);
  }

  // Ficha de la habilidad bajo el cursor (o la última tocada), al pie del árbol.
  showSkill(id) {
    const n = this.treeNodes?.[id];
    const box = $('tree-detail');
    if (!box) return;
    this.skillShown = id;
    if (!n) {
      box.innerHTML = '<span class="d-hint">Pasá el cursor por una habilidad para ver qué hace. Clic para aprenderla.</span>';
      return;
    }
    const status = n.level >= n.max ? 'Al máximo.' : !n.open ? `🔒 Pide ${n.needs.join(' y ')}.` : n.can ? `Clic para aprender: cuesta ● ${n.cost}.` : `Cuesta ● ${n.cost}: te faltan puntos.`;
    box.innerHTML = `<b>${n.icon} ${n.name}</b> <span class="d-lvl">${n.level}/${n.max}</span><br>${n.desc} <span class="d-st">${status}</span>`;
  }

  // --- Menú de desarrollo (data/dev.js) ---

  renderDev() {
    const list = this.handlers.devActions?.() || [];
    if (this.panelSig === 'dev') return;
    this.panelSig = 'dev';
    let html = '<div class="dev-note">Solo para desarrollo: no va a estar en el juego final.</div>';
    let open = false;
    for (const a of list) {
      if (a.section) {
        html += `${open ? '</div>' : ''}<h3>${a.section}</h3><div class="dev-grid">`;
        open = true;
      } else {
        html += `<button class="act small-btn" data-dev="${a.id}">${a.icon} ${a.name}</button>`;
      }
    }
    $('panel-list').innerHTML = `${html}${open ? '</div>' : ''}`;
  }

  // --- Resumen (noche / renacer) ---

  // data: { title, sub?, success?, lines: [{ icon?, label, value }] | [[label, value]], button?, onClose? }
  showSummary(data = {}) {
    const box = $('summary');
    // El resumen no se abre encima de otra ventana.
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
      const lines = [['Calor de la noche', fmt(d.calor || 0), HEAT]];
      if (num(d.goal)) lines.push(['Meta', `${d.goal.toFixed(1)} /s`, '🎯']);
      if (d.success && num(d.margin) && d.margin > 0.05) lines.push(['Margen sobre la meta', `+${Math.round(d.margin * 100)} %`, '📈']);
      if (d.success) lines.push(['Cenizas ganadas', `+${d.ash}`, '🪦'], ['Cenizas disponibles', fmt(d.ashAvail ?? d.ashTotal ?? 0), '🪦'], ['Cenizas en total', fmt(d.ashTotal || 0), '🪦']);
      if (d.point) lines.push(['Premio por una buena noche', '+1 punto de habilidad', '●']);
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
          ['Calor de la partida', fmt(d.runCalor || 0), HEAT],
          ['Amaneceres', d.dawns || 0, '🌄'],
          ['Veces que renaciste', d.prestiges || 0, '♻️'],
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
    this.pump();
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
    for (const id of ['hud-calor', 'level', 'forecast', 'night', 'btn-shop', 'btn-build', 'btn-tree', 'btn-ashes', 'panel', 'veil', 'summary']) {
      $(id).classList.add('hidden');
    }
    for (const id of ['btn-shop', 'btn-build', 'btn-tree', 'btn-ashes']) $(id).classList.remove('new');
    this.shown.clear();
    this.panelTab = null;
    this.points = -1;
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
    this.guide(null);
    this.goalSig = '';
    $('goal').classList.add('hidden');
  }

  get modalOpen() {
    return ['menu', 'mm', 'summary', 'event'].some((id) => !$(id).classList.contains('hidden'));
  }
}
