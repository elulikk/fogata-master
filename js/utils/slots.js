// Ranuras magnéticas: lugares donde la leña encaja sola dentro de un pozo.
// Funciones puras: reciben el pozo, la leña que se arrastra y las leñas ya encajadas (occ).
// Tipos de ranura: base (en el piso), stack (sobre otra leña), bridge (puente apoyado en dos
// leñas con hueco debajo) y tipi (inclinadas ±62° que se cruzan sobre el centro).

import { segSegDist } from './geom.js';

export const SNAP_R = 70;        // radio magnético con mouse (px)
export const SNAP_R_TOUCH = 100;  // con el dedo
export const TIPI_ANGLE = (62 * Math.PI) / 180;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isHor = (angle) => Math.abs(Math.sin(angle)) < 0.3;

// Eje de una leña (igual que Log.endpoints): el segmento central sin los extremos redondeados.
export function slotSeg(x, y, angle, len, th) {
  const h = Math.max(0, len / 2 - th / 2);
  const c = Math.cos(angle) * h;
  const s = Math.sin(angle) * h;
  return [x - c, y - s, x + c, y + s];
}

// Ranuras libres y habilitadas para la leña `log` en `pit`.
// occ = leñas ya encajadas en el pozo (sin contar a `log`).
export function slotsFor(pit, log, groundY, occ) {
  if (log.wood.shape === 'cone') return [];
  const L = log.length;
  const T = log.thickness;
  const ih = pit.half - 12; // semiancho útil (hasta la cara interna de las paredes)
  const cx = pit.x;
  const topLimit = pit.top + 20;
  const out = [];

  const fits = (x, y, angle) => {
    const ext = (L / 2) * Math.abs(Math.cos(angle)) + (T / 2) * Math.abs(Math.sin(angle));
    const hgt = (L / 2) * Math.abs(Math.sin(angle)) + (T / 2) * Math.abs(Math.cos(angle));
    return Math.abs(x - cx) + ext <= ih && y - hgt >= topLimit;
  };
  const blocked = (s) => {
    const sh = isHor(s.angle);
    for (const o of occ) {
      const oa = o.slot.angle;
      if (isHor(oa) === sh && !sh && Math.sign(oa) !== Math.sign(s.angle)) continue; // patas opuestas se cruzan
      if (segSegDist(s.seg, o.endpoints()) < (T + o.thickness) / 2 - 1.5) return true;
    }
    return false;
  };
  const add = (kind, layer, x, y, angle, requires, extra) => {
    if (!fits(x, y, angle)) return;
    const s = { kind, layer, x, y, angle, len: L, th: T, requires, seg: slotSeg(x, y, angle, L, T), ...extra };
    if (!blocked(s)) out.push(s);
  };

  const groundY0 = groundY - T / 2 - 0.5;
  const hor = occ.filter((o) => isHor(o.slot.angle));

  // Base: dos leños separados (dejan un hueco para el puente de la cabaña) o uno solo al centro.
  const room = 2 * ih - 2 * L;
  if (L <= 2 * ih - 4) {
    if (room >= 14) {
      const off = L / 2 + clamp(0.35 * L, 14, room) / 2;
      add('base', 0, cx - off, groundY0, 0, [], { side: -1 });
      add('base', 0, cx + off, groundY0, 0, [], { side: 1 });
    } else {
      add('base', 0, cx, groundY0, 0, [], { side: 0 });
    }
    // Pozos grandes: la fila de base sigue hacia afuera de cada lado.
    for (const side of [-1, 1]) {
      const edge = hor.filter((o) => o.slot.layer === 0 && Math.sign(o.x - cx) === side)
        .sort((a, b) => side * (b.x - a.x))[0];
      if (edge) add('base', 0, edge.x + side * ((edge.length + L) / 2 + 2), groundY0, 0, [edge], { side });
    }
  }

  // Apilar sobre cualquier leño horizontal encajado.
  for (const o of hor) {
    add('stack', o.slot.layer + 1, o.x, o.y - (o.thickness + T) / 2, 0, [o]);
  }

  // Puentes: dos leños horizontales a la misma altura con hueco entre ellos.
  for (let i = 0; i < hor.length; i++) {
    for (let j = 0; j < hor.length; j++) {
      const a = hor[i];
      const b = hor[j];
      if (a.x >= b.x || Math.abs(a.y - b.y) > 3) continue;
      const g0 = a.x + a.length / 2;
      const g1 = b.x - b.length / 2;
      const gap = g1 - g0;
      if (gap < 8 || gap > L - 12) continue;
      const top = Math.min(a.y - a.thickness / 2, b.y - b.thickness / 2);
      add('bridge', Math.max(a.slot.layer, b.slot.layer) + 1, (g0 + g1) / 2, top - T / 2, 0, [a, b]);
    }
  }

  // Tipi: patas que se cruzan sobre el centro. La segunda pata de un lado solo después de la primera.
  const th = TIPI_ANGLE;
  const a = (L / 2) * Math.cos(th);
  const c0 = Math.max(3, a * 0.12);
  const step = (T * 1.3) / Math.sin(th);
  const legY = groundY - (L / 2) * Math.sin(th) - (T / 2) * Math.cos(th) - 0.5;
  const first = occ.filter((o) => o.slot.kind === 'tipi' && o.slot.tk === 0);
  for (const sign of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const base = first.find((o) => o.slot.sign === sign);
      if (k === 1 && !base) continue; // la segunda pata de cada lado va después de la primera
      add('tipi', 0, cx + sign * (c0 + k * step), legY, sign * th, k ? [base] : [], { sign, tk: k });
    }
  }
  return out;
}

// Mejor ranura dentro del radio. Sin rotación del jugador gana la horizontal; si rotó,
// la que coincide con su ángulo.
export function pickSlot(slots, x, y, rot, aimed, radius, prev) {
  let best = null;
  let bestScore = Infinity;
  for (const s of slots) {
    const d = Math.hypot(x - s.x, (y - s.y) * 0.5); // se suelta desde arriba: la vertical pesa menos
    if (d > radius) continue;
    const diff = (((rot - s.angle) % Math.PI) + Math.PI) % Math.PI;
    const da = Math.min(diff, Math.PI - diff); // 0 = mismo ángulo (una leña no tiene cabeza)
    if (aimed && da > 0.7) continue;
    if (s.kind === 'tipi' && !aimed) continue; // el tipi solo se ofrece si el jugador rotó la leña
    let score = d;
    if (aimed) score += da * 60;
    else if (s.kind === 'tipi') score += 35;
    if (s.kind === 'bridge') score -= 10;
    if (prev && Math.abs(prev.x - s.x) < 1 && Math.abs(prev.y - s.y) < 1 && Math.abs(prev.angle - s.angle) < 0.01) score -= 18; // histéresis
    if (score < bestScore) { bestScore = score; best = s; }
  }
  return best;
}

// Estructura que forman las leñas encajadas (se reconoce al instante, sin esperar estabilidad).
export function slotStructure(occ, groundY) {
  if (!occ.length) return null;
  let l = 0;
  let r = 0;
  let bases = 0;
  let bridges = 0;
  let stacks = 0;
  let top = groundY;
  for (const o of occ) {
    const k = o.slot.kind;
    if (k === 'tipi') o.slot.sign < 0 ? l++ : r++;
    else if (k === 'base') bases++;
    else if (k === 'bridge') bridges++;
    else stacks++;
    top = Math.min(top, o.y - o.thickness / 2);
  }
  const height = groundY - top;
  const pairs = Math.min(l, r);
  const tq = pairs >= 2 ? 0.9 : pairs === 1 ? 0.65 : 0;
  const cq = bridges >= 1 && bases >= 2
    ? Math.min(1, 0.6 + (bridges > 1 ? 0.2 : 0) + 0.1 * Math.min(stacks, 2))
    : 0;
  if (tq === 0 && cq === 0) return { type: 'ninguna', quality: 0, height };
  return tq >= cq ? { type: 'tipi', quality: tq, height } : { type: 'cabana', quality: cq, height };
}
