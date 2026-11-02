// Menú principal y de pausa: título, ranuras de guardado, cargar, ajustes y créditos.
// Todo pasa por los handlers que ya existen en la escena (export / import / reset / pause):
// una ranura es un guardado exportado (base64) en su propia clave de localStorage.

const KEY = 'fogata-master-save-v1'; // partida activa y autoguardado (la escribe GameState)
const PREV = 'fogata-master-prev';   // copia de seguridad de lo que se pisó por última vez
const SLOTS = [1, 2, 3];
const slotKey = (n) => `fogata-master-slot-${n}`;
const $ = (id) => document.getElementById(id);

const num = (v) => typeof v === 'number' && isFinite(v);

function fmtCalor(n) {
  if (!num(n)) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.floor(n));
}

function fmtDate(ts) {
  if (!num(ts) || !ts) return '';
  try {
    return new Date(ts).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// Resumen corto de un guardado (objeto de datos de GameState).
function infoOf(d) {
  if (!d || typeof d !== 'object') return null;
  const night = d.night || {};
  return {
    level: d.level | 0 || 1,
    calor: typeof d.calor === 'number' ? d.calor : d.totalCalor || 0, // el mismo número que ve el HUD
    total: d.totalCalor || 0,
    nights: night.dawns | 0,
    savedAt: d.savedAt || 0,
  };
}

function infoText(i) {
  if (!i) return '';
  const night = i.nights ? ` · ${i.nights} ${i.nights === 1 ? 'noche' : 'noches'}` : '';
  return `Nivel ${i.level} · 🔥 ${fmtCalor(i.calor)}${night}`;
}

function decode(text) {
  try {
    const t = String(text).trim();
    try { return JSON.parse(t); } catch { return JSON.parse(decodeURIComponent(escape(atob(t)))); }
  } catch { return null; }
}

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* nada */ } },
};

export class MainMenu {
  constructor(ui) {
    this.ui = ui;
    this.stack = [];
    this.root = $('mm');
    this.box = $('mm-box');
    this.root.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('keydown', (e) => this.onKey(e), true);
  }

  get isOpen() { return !this.root.classList.contains('hidden'); }
  get settingsOpen() { return !$('menu').classList.contains('hidden'); }
  get top() { return this.stack[this.stack.length - 1]; }
  get handlers() { return this.ui.handlers || {}; }

  // --- Guardados ---

  // Lista de entradas { id, label, info, text } (info = null si está vacía).
  entries() {
    const out = [];
    const auto = store.get(KEY);
    out.push({ id: 'auto', label: 'Autoguardado', text: auto, info: auto ? infoOf(decode(auto)) : null });
    for (const n of SLOTS) {
      let rec = null;
      try { rec = JSON.parse(store.get(slotKey(n)) || 'null'); } catch { rec = null; }
      out.push({ id: n, label: `Ranura ${n}`, text: rec && rec.save, info: rec && rec.info ? { ...rec.info, savedAt: rec.savedAt } : null });
    }
    const prev = store.get(PREV);
    if (prev) out.push({ id: 'prev', label: 'Copia previa', text: prev, info: infoOf(decode(prev)) });
    return out;
  }

  // Hay partida real: guardado con progreso (un guardado vacío, tras "Partida nueva", no cuenta).
  hasSave() {
    const raw = store.get(KEY);
    const i = raw && infoOf(decode(raw));
    return !!i && ((i.total || i.calor) > 0 || i.level > 1);
  }

  // Antes de pisar la partida actual se deja una copia (se puede cargar desde "Copia previa").
  backup() {
    const text = this.handlers.export?.();
    const d = text && decode(text);
    if (d && (d.totalCalor || 0) > 0) store.set(PREV, text);
  }

  saveSlot(n) {
    const text = this.handlers.export?.();
    const d = text && decode(text);
    if (!d) return this.ui.toast('No se pudo guardar.', 'bad', 3000);
    d.savedAt = Date.now();
    const ok = store.set(slotKey(n), JSON.stringify({ v: 1, savedAt: d.savedAt, info: infoOf(d), save: text }));
    this.ui.toast(ok ? `Guardado en la ranura ${n}.` : 'No se pudo guardar: sin espacio en el navegador.', ok ? 'unlock' : 'bad', 2800);
    this.render();
  }

  loadEntry(id) {
    const e = this.entries().find((x) => String(x.id) === String(id));
    if (!e || !e.text) return;
    this.backup();
    this.ui.importSave(e.text); // cierra el menú si salió bien
  }

  askNew() {
    if (!this.hasSave()) return this.close();
    this.confirm('¿Partida nueva?', 'Se borra el progreso actual, cenizas incluidas. Antes se guarda una copia previa en Cargar.', 'Borrar y empezar', () => this.newGame());
  }

  newGame() {
    this.backup();
    this.handlers.reset?.();
    this.close();
  }

  // --- Navegación ---

  open(name = 'pause') {
    if (!this.isOpen) {
      this.root.classList.remove('hidden');
      this.handlers.pause?.(true);
    }
    this.stack = [{ name }];
    this.render();
  }

  close() {
    this.stack = [];
    $('menu').classList.add('hidden');
    if (this.isOpen) {
      this.root.classList.add('hidden');
      this.handlers.pause?.(false);
    }
    this.ui.pump();
  }

  go(name, args = {}) {
    this.stack.push({ name, ...args });
    this.render();
  }

  // Esc / "Volver": sale de la pantalla actual. En el título raíz no hace nada.
  back() {
    const cur = this.top;
    if (!cur) return;
    if (cur.name === 'pause') return this.close();
    if (cur.name === 'title' && this.stack.length === 1) return;
    this.stack.pop();
    if (!this.top) return this.close();
    this.render();
  }

  // --- Pantallas ---

  render() {
    const cur = this.top;
    if (!cur) return;
    $('menu').classList.toggle('hidden', cur.name !== 'settings');
    this.root.classList.toggle('is-title', cur.name === 'title');
    if (cur.name === 'settings') {
      this.ui.prepareSettings();
      return;
    }
    const fn = this['screen_' + cur.name];
    this.box.innerHTML = fn ? fn.call(this, cur) : '';
    this.box.classList.toggle('wide', cur.name === 'save' || cur.name === 'load');
    this.focusFirst();
  }

  focusFirst() {
    const b = this.box.querySelector('[data-primary]') || this.box.querySelector('button:not(:disabled)');
    b?.focus?.({ preventScroll: true });
  }

  btn(act, label, { sub = '', primary = false, cls = '', arg = '', disabled = false } = {}) {
    return `<button class="act mm-btn ${cls}" data-act="${act}" ${arg !== '' ? `data-arg="${arg}"` : ''} ${primary ? 'data-primary' : ''} ${disabled ? 'disabled' : ''}>
      <span class="lbl">${label}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  }

  screen_title() {
    const auto = this.entries()[0];
    const has = this.hasSave() && auto.info;
    const when = has && auto.info.savedAt ? fmtDate(auto.info.savedAt) : '';
    const sub = has ? `${infoText(auto.info)}${when ? ` · ${when}` : ''}` : '';
    return `<div class="mm-logo"><div class="mm-flame" aria-hidden="true">🔥</div>
        <h1 id="mm-title">Fogata Master</h1><p>Prendé, cuidá y hacé crecer tu fogata</p></div>
      <div class="mm-btns">
        ${has ? this.btn('resume', 'Continuar', { sub, primary: true }) : ''}
        ${this.btn('new', has ? 'Partida nueva' : 'Jugar', { primary: !has })}
        ${this.btn('load', 'Cargar')}
        ${this.btn('settings', 'Ajustes')}
        ${this.btn('credits', 'Créditos')}
      </div>`;
  }

  screen_pause() {
    return `<h2 id="mm-title">⏸ En pausa</h2>
      <div class="mm-btns">
        ${this.btn('resume', 'Continuar', { primary: true })}
        ${this.btn('save', 'Guardar')}
        ${this.btn('load', 'Cargar')}
        ${this.btn('howto', 'Cómo jugar')}
        ${this.btn('settings', 'Ajustes')}
        ${this.btn('title', 'Volver al título')}
      </div>`;
  }

  row(e, kind) {
    const i = e.info;
    const when = i && i.savedAt ? fmtDate(i.savedAt) : '';
    const info = i ? `${infoText(i)}${when ? `<span class="when">${when}</span>` : ''}` : '<span class="empty">Vacía</span>';
    const isSlot = typeof e.id === 'number';
    let buttons;
    if (kind === 'save') {
      buttons = `<button class="act small-btn" data-act="saveslot" data-arg="${e.id}" ${e.id === 'auto' ? 'disabled' : ''}>Guardar</button>`;
    } else {
      buttons = `<button class="act small-btn" data-act="loadslot" data-arg="${e.id}" ${i ? '' : 'disabled'}>Cargar</button>`;
    }
    if (isSlot && i) buttons += `<button class="act small-btn danger" data-act="delslot" data-arg="${e.id}" aria-label="Borrar ${e.label}" title="Borrar">🗑</button>`;
    return `<div class="mm-slot"><div class="mm-slot-info"><b>${e.label}</b><span>${info}</span></div><div class="mm-slot-btns">${buttons}</div></div>`;
  }

  screen_save() {
    const rows = this.entries().filter((e) => typeof e.id === 'number').map((e) => this.row(e, 'save')).join('');
    return `<h2 id="mm-title">Guardar partida</h2>
      <p class="mm-note">El juego también se autoguarda solo.</p>
      <div class="mm-slots">${rows}</div>
      <div class="menu-row">${this.btn('back', 'Volver')}</div>`;
  }

  screen_load() {
    const rows = this.entries().map((e) => this.row(e, 'load')).join('');
    return `<h2 id="mm-title">Cargar partida</h2>
      <p class="mm-note">Cargar reemplaza la partida actual (queda una copia previa).</p>
      <div class="mm-slots">${rows}</div>
      <div class="menu-row">
        ${this.btn('import', 'Importar archivo…', { cls: 'ghost' })}
        ${this.btn('back', 'Volver')}
      </div>`;
  }

  screen_howto() {
    return `<h2 id="mm-title">Cómo jugar</h2>
      <ul class="mm-howto">
        <li><b>Arrastrar:</b> llevá la leña de la pila al fuego y soltala sobre un lugar marcado: ramas al centro (azul), leña al medio (amarillo), troncos afuera (rojo).</li>
        <li><b>Prender:</b> tocá la leña para usar un fósforo.</li>
        <li><b>Consumo:</b> a la mitad, un tronco se vuelve leña y la leña se vuelve rama, y bajan de lugar. Las ramas terminan en ceniza.</li>
        <li><b>Maderas:</b> pasá el mouse por la pila para ver cómo rinde cada especie.</li>
        <li><b>Noche:</b> mantené el calor/s por encima de la meta hasta el amanecer.</li>
        <li><b>Atajos:</b> S tienda · C construir · B bosque · M sonido · Esc pausa.</li>
      </ul>
      <div class="menu-row">
        ${this.btn('retut', 'Ver la guía paso a paso', { cls: 'ghost' })}
        ${this.btn('back', 'Volver', { primary: true })}
      </div>`;
  }

  screen_credits() {
    return `<h2 id="mm-title">Créditos</h2>
      <p class="mm-credits">Fogata Master es un juego de fogatas hecho con Phaser 3.<br>
      Las texturas, el fuego y el sonido se generan por código.<br>Gracias por quedarte un rato al calor. 🔥</p>
      <div class="menu-row">${this.btn('back', 'Volver', { primary: true })}</div>`;
  }

  screen_confirm(c) {
    return `<h2 id="mm-title">${c.title}</h2>
      <p class="mm-note">${c.text}</p>
      <div class="menu-row">
        ${this.btn('back', 'Cancelar', { primary: true })}
        ${this.btn('yes', c.yes, { cls: c.danger ? 'danger' : '' })}
      </div>`;
  }

  confirm(title, text, yes, onYes, danger = true) {
    this.go('confirm', { title, text, yes, danger, onYes });
  }

  // --- Eventos ---

  onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const arg = b.dataset.arg;
    switch (b.dataset.act) {
      case 'resume': return this.close();
      case 'back': return this.back();
      case 'load': return this.go('load');
      case 'save': return this.go('save');
      case 'settings': return this.go('settings');
      case 'credits': return this.go('credits');
      case 'howto': return this.go('howto');
      case 'retut': this.ui.tutorial('restart'); return this.close();
      case 'title': return this.open('title');
      case 'import': return $('btn-import').click();
      case 'new': return this.askNew();
      case 'saveslot': {
        const e2 = this.entries().find((x) => String(x.id) === arg);
        if (e2 && e2.info) return this.confirm(`¿Pisar la ranura ${arg}?`, `Tiene: ${infoText(e2.info)}.`, 'Guardar encima', () => { this.stack.pop(); this.saveSlot(Number(arg)); });
        return this.saveSlot(Number(arg));
      }
      case 'loadslot': {
        const e2 = this.entries().find((x) => String(x.id) === arg);
        if (!e2 || !e2.info) return;
        return this.confirm('¿Cargar esta partida?', `${e2.label}: ${infoText(e2.info)}. La partida actual se reemplaza (queda en "Copia previa").`, 'Cargar', () => this.loadEntry(arg), false);
      }
      case 'delslot':
        return this.confirm(`¿Borrar la ranura ${arg}?`, 'No se puede deshacer.', 'Borrar', () => { store.del(slotKey(arg)); this.stack.pop(); this.render(); });
      case 'yes': {
        const cb = this.top && this.top.onYes;
        if (cb) cb();
        return;
      }
      default:
    }
  }

  onKey(e) {
    if (!this.isOpen && !this.settingsOpen) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key;
    if (key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) {
        this.ui.clearResetConfirm();
        this.back();
      }
      return;
    }
    const t = e.target;
    const inField = t && t.tagName === 'INPUT';
    const scope = this.settingsOpen ? $('menu') : this.root;
    if (key === 'Tab') {
      const items = [...scope.querySelectorAll('button:not(:disabled), input:not([hidden]), summary')].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next].focus();
      return;
    }
    if ((key === 'ArrowDown' || key === 'ArrowUp') && !inField) {
      const items = [...scope.querySelectorAll('button:not(:disabled)')].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      const step = key === 'ArrowDown' ? 1 : -1;
      e.preventDefault();
      items[(i + step + items.length) % items.length].focus();
      return;
    }
    if (key === 'Enter' && !e.repeat && (!t || t === document.body || !t.closest?.('button, input, summary'))) {
      const p = scope.querySelector('[data-primary]');
      if (p) {
        e.preventDefault();
        p.click();
      }
      return;
    }
    // Los atajos del juego (S, C, B, Q, E, espacio…) no valen con el menú abierto.
    if (key.length === 1 && key !== ' ' && !inField) e.stopImmediatePropagation();
    else if (key === ' ' && !(t && t.closest?.('button, input, summary'))) e.stopImmediatePropagation();
  }
}
