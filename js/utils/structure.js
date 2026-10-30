// Detección de estructuras de leña (tipi, cabaña, montón). Función pura: no toca el motor.
// Entrada: leños de un pozo como { x, y, angle, len, th }. Salida cruda; la estabilidad
// en el tiempo y la suavizada de la calidad las maneja Fire.

import { segSegDist, pointSegDist } from './geom.js';

const LEAN_MIN = 0.6;   // ~34°: desde acá cuenta como leño apoyado en pie
const LEAN_MAX = 1.5;   // ~86°
const FLAT_MAX = 0.4;   // ~23°: casi horizontal

function prep(l) {
  const h = Math.max(0, l.len / 2 - l.th / 2);
  const c = Math.cos(l.angle) * h;
  const s = Math.sin(l.angle) * h;
  let seg = [l.x - c, l.y - s, l.x + c, l.y + s];
  if (seg[1] > seg[3]) seg = [seg[2], seg[3], seg[0], seg[1]]; // la punta alta primero
  const incl = Math.atan2(seg[3] - seg[1], Math.abs(seg[2] - seg[0]));
  return { l, seg, incl, side: Math.sign(seg[2] - seg[0]), y: l.y, th: l.th };
}

const touching = (a, b, slack = 6) => segSegDist(a.seg, b.seg) < (a.th + b.th) * 0.5 + slack;

function tipi(items) {
  const lean = items.filter((it) => it.incl >= LEAN_MIN && it.incl <= LEAN_MAX);
  const n = lean.length;
  if (n < 3) return 0;
  const left = lean.filter((it) => it.side < 0).length;
  const right = lean.filter((it) => it.side > 0).length;
  if (!left || !right) return 0;
  // Convergencia: las puntas altas tienen que juntarse y las bases abrirse.
  const mx = lean.reduce((a, it) => a + it.seg[0], 0) / n;
  const std = Math.sqrt(lean.reduce((a, it) => a + (it.seg[0] - mx) ** 2, 0) / n);
  const topSpread = lean.reduce((a, it) => a + Math.abs(it.seg[0] - mx), 0) / n;
  const baseSpread = lean.reduce((a, it) => a + Math.abs(it.seg[2] - mx), 0) / n;
  if (baseSpread < topSpread * 1.15) return 0;
  // Las puntas altas tienen que estar mucho más juntas que las bases.
  const conv = Math.min(1, Math.max(0, (1 - topSpread / baseSpread) * 1.25));
  // Contacto: los leños en pie tienen que formar un grupo que se toca (se sostienen entre sí)
  // y ese grupo tiene que incluir los dos lados.
  const comp = lean.map((_, i) => i);
  const find = (i) => (comp[i] === i ? i : (comp[i] = find(comp[i])));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (touching(lean[i], lean[j])) comp[find(i)] = find(j);
  const groups = new Map();
  lean.forEach((it, i) => {
    const g = groups.get(find(i)) || { n: 0, l: 0, r: 0 };
    g.n++;
    if (it.side < 0) g.l++; else g.r++;
    groups.set(find(i), g);
  });
  let contact = 0;
  for (const g of groups.values()) if (g.l && g.r) contact = Math.max(contact, g.n / n);
  const sym = 1 - Math.abs(left - right) / n;
  tipi.dbg = { n, conv, contact, sym, std, topSpread, baseSpread };
  return conv * contact * Math.min(1, n / 4) * (0.6 + 0.4 * sym);
}

// Cabaña en 2D de perfil: capas de leños horizontales apoyados en sus DOS extremos sobre
// otros leños (o sobre la pared) con hueco debajo del medio ("puente"). Una torre maciza
// de leños planos no es cabaña: es una pila (monton). Mínimo 2 capas y 1 puente.
// walls: [{x, h}] paredes del pozo como apoyo (profundidad -1).
function cabin(items, groundY, walls) {
  const flat = items.filter((it) => it.incl <= FLAT_MAX);
  if (flat.length < 2) return { q: 0, layers: 0, bridges: 0 };
  const supports = flat.slice();
  for (const w of walls) supports.push({ l: null, seg: [w.x, groundY - w.h, w.x, groundY], th: 4, y: groundY - w.h / 2, wall: true });
  const near = (pt, o, th) => pointSegDist(pt[0], pt[1], ...o.seg) <= (o.th + th) * 0.5 + 5;
  const order = flat.slice().sort((a, b) => b.y - a.y); // de abajo hacia arriba
  const depth = new Map();
  for (const w of supports) if (w.wall) depth.set(w, -1);
  let bridges = 0;
  let layers = 0;
  for (const it of order) {
    const grounded = Math.max(it.seg[1], it.seg[3]) + it.th / 2 >= groundY - 5;
    const e1 = [it.seg[0], it.seg[1]];
    const e2 = [it.seg[2], it.seg[3]];
    const m = [(it.seg[0] + it.seg[2]) / 2, (it.seg[1] + it.seg[3]) / 2];
    const below = supports.filter((o) => o !== it && (o.wall || (depth.has(o) && o.y > it.y + it.th * 0.3)));
    const s1 = below.filter((o) => near(e1, o, it.th));
    const s2 = below.filter((o) => near(e2, o, it.th));
    const touching = below.filter((o) => segSegDist(it.seg, o.seg) <= (o.th + it.th) * 0.5 + 5);
    let d = grounded ? 0 : touching.length ? 1 + Math.min(...touching.map((o) => depth.get(o))) : null;
    if (d === null) continue; // en el aire: no cuenta
    const pair = s1.some((a) => s2.some((b) => a !== b));
    const midSupport = below.some((o) => near(m, o, it.th) && m[0] >= Math.min(o.seg[0], o.seg[2]) - o.th / 2 && m[0] <= Math.max(o.seg[0], o.seg[2]) + o.th / 2);
    if (pair && !midSupport && !grounded) bridges++;
    depth.set(it, d);
    layers = Math.max(layers, d + 1);
  }
  if (bridges < 1 || layers < 2) return { q: 0, layers, bridges };
  const level = Math.max(0, 1 - (flat.reduce((a, o) => a + o.incl, 0) / flat.length) / 0.3);
  const q = (Math.min(bridges, 3) / 3 * 0.6 + Math.min(1, (layers - 1) / 2) * 0.4) * level * (flat.length / items.length);
  return { q, layers, bridges };
}

export function detectStructure(logs, _half, groundY, walls = []) {
  const out = { type: 'ninguna', quality: 0, height: 0, count: logs.length, layers: 0 };
  if (!logs.length) return out;
  const items = logs.map(prep);
  let top = Infinity;
  for (const it of items) top = Math.min(top, it.seg[1] - it.th / 2);
  out.height = Math.max(0, groundY - top);

  const qt = tipi(items);
  const cb = cabin(items, groundY, walls);
  out.layers = cb.layers;
  out.dbg = { tipi: tipi.dbg, bridges: cb.bridges };
  if (qt >= cb.q && qt > 0.15) {
    out.type = 'tipi';
    out.quality = Math.min(1, qt);
  } else if (cb.q > 0.15) {
    out.type = 'cabana';
    out.quality = Math.min(1, cb.q);
  } else if (logs.length >= 3) {
    out.type = 'monton';
  }
  return out;
}
