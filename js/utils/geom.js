// Ayudas geométricas para el calor entre leños y para agarrarlos con el mouse.

export function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx - px;
  const y = ay + t * dy - py;
  return Math.sqrt(x * x + y * y);
}

function cross(ox, oy, ax, ay, bx, by) {
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

function segmentsCross(a, b) {
  const d1 = cross(b[0], b[1], b[2], b[3], a[0], a[1]);
  const d2 = cross(b[0], b[1], b[2], b[3], a[2], a[3]);
  const d3 = cross(a[0], a[1], a[2], a[3], b[0], b[1]);
  const d4 = cross(a[0], a[1], a[2], a[3], b[2], b[3]);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}

// Distancia entre dos segmentos [ax, ay, bx, by].
export function segSegDist(a, b) {
  if (segmentsCross(a, b)) return 0;
  return Math.min(
    pointSegDist(a[0], a[1], b[0], b[1], b[2], b[3]),
    pointSegDist(a[2], a[3], b[0], b[1], b[2], b[3]),
    pointSegDist(b[0], b[1], a[0], a[1], a[2], a[3]),
    pointSegDist(b[2], b[3], a[0], a[1], a[2], a[3]),
  );
}

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
