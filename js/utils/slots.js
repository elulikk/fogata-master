// Lugares de la fogata: patas apoyadas en anillos, de adentro hacia afuera ramas, leña y troncos.
// Cuántas entran de cada corte lo dice el escalón de la fogata (data/sizes.js) más las habilidades de "Lugar para…".
// Son posiciones fijas, sin física: la leña se encaja en un lugar de su tamaño y ahí se queda.
// El lugar es solo cuánta leña de cada tamaño entra: el calor se comparte en todo el pozo (ver Fire.update).
// Las piezas se pueden pisar entre sí sin que pase nada; se dibujan de afuera hacia adentro.

import { CUTS, CUT_ORDER } from '../data/woods.js';

// Por anillo: a qué distancia del centro apoya la pata, cuánto se pasa del centro la punta y hacia dónde
// se corren las patas de más (los troncos hacia adentro, para no salirse de las piedras).
const RINGS = [{ foot: 22, cross: 3, step: 8 }, { foot: 52, cross: 5, step: 8 }, { foot: 82, cross: 16, step: -9 }];
const TIPI_HALF = 90; // medio ancho que ocupa un tipi

export const TIER_TINT = [0x4fb4ec, 0xffdc4a, 0xf04a3a]; // azul ramas, amarillo leña, rojo troncos

// Los lugares de un pozo: `tipis` tipis repartidos a lo ancho (en pozos angostos se pisan, no molesta).
// `counts[tier]`: cuántas piezas de ese corte entran en todo el pozo. Se reparten de a una por tipi y,
// dentro de cada tipi, una a cada lado por turno.
export function buildSlots(cx, half, tipis, groundY, counts = []) {
  const room = Math.max(0, half - TIPI_HALF);
  const out = [];
  for (let t = 0; t < tipis; t++) {
    const tx = tipis === 1 ? cx : cx - room + (2 * room * t) / (tipis - 1);
    CUT_ORDER.forEach((cut, tier) => {
      const { length: len, thickness: th } = CUTS[cut];
      const ring = RINGS[tier];
      const total = counts[tier] || 0;
      for (let i = 0, n = Math.floor(total / tipis) + (t < total % tipis ? 1 : 0); i < n; i++) {
        const side = (i + t) % 2 ? 1 : -1;
        const foot = Math.max(10, ring.foot + ring.step * (i >> 1));
        const a = Math.acos(Math.min(0.95, (foot + ring.cross) / len));
        const dx = -side * Math.cos(a);
        const dy = -Math.sin(a);
        out.push({
          tier, tipi: t, side, len, th, kind: 'tipi', log: null,
          fx: tx + side * foot, fy: groundY + 2, // pie de la pata
          dx, dy,                                // dirección del pie a la punta
          angle: side < 0 ? -a : a,
          x: tx + side * foot + (dx * len) / 2,
          y: groundY + 2 + (dy * len) / 2,
        });
      }
    });
  }
  return out;
}

// Lugar libre de ese anillo más cercano al punto.
export function nearestFree(slots, tier, x, y) {
  let best = null;
  let bd = Infinity;
  for (const s of slots) {
    if (s.tier !== tier || s.log) continue;
    const d = Math.hypot(x - s.x, y - s.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// Lugar libre del anillo de abajo para una pieza que se achica: primero su mismo tipi y su mismo lado.
export function lowerFree(slots, from) {
  const free = slots.filter((s) => s.tier === from.tier - 1 && !s.log);
  const score = (s) => (s.tipi === from.tipi ? 0 : 2) + (s.side === from.side ? 0 : 1);
  return free.sort((a, b) => score(a) - score(b))[0] || null;
}

// Fogata armada: hay leña de los tres tamaños. La calidad crece con los lugares ocupados.
export function slotStructure(slots) {
  const used = slots.filter((s) => s.log);
  if (!used.length) return { type: 'ninguna', quality: 0 };
  const rings = new Set(used.map((s) => s.tier)).size;
  if (rings < CUT_ORDER.length) return { type: 'ninguna', quality: 0 };
  return { type: 'tipi', quality: 0.65 + (0.35 * used.length) / slots.length };
}
