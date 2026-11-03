// Dibujos de la escalera de fogatas (data/sizes.js apunta a cada uno por `look`). Todo por código.
// Para sumar un dibujo alcanza con una entrada en LOOKS:
//   big, lip, wall    piedras de los costados, del labio de adelante y pared baja (claves de textura).
//   sideStones        si van las piedras grandes a los costados (las construcciones ya tienen las suyas).
//   h, back(ctx, a)   altura y dibujo de lo que va detrás del fuego. `a` = { w, cx, g, half, side }: ancho, centro,
//                     línea del suelo, medio ancho del lecho y lo que hay de costado hasta el borde de la textura.
//   glows             brillos que laten con el fuego: { x, y, r, tint } (relativos al centro y al suelo).
//   smoke             de dónde sale el humo de la chimenea: { x, y }.

import { SIZES } from '../data/sizes.js';

const rand = (a, b) => a + Math.random() * (b - a);

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.context, w, h);
  tex.refresh();
}

const vGrad = (ctx, y0, y1, stops) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
};
const hGrad = (ctx, x0, x1, stops) => {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
};

// Traza una forma: lista de [x, y]. Con `fill` la pinta; devuelve el contexto para encadenar un clip.
function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// Boca en arco: rectas a los costados y medio punto arriba.
function archPath(ctx, cx, g, iw, ih) {
  const r = Math.min(iw, ih * 0.5);
  ctx.beginPath();
  ctx.moveTo(cx - iw, g);
  ctx.lineTo(cx - iw, g - ih + r);
  ctx.ellipse(cx, g - ih + r, iw, r, 0, Math.PI, 0);
  ctx.lineTo(cx + iw, g);
  ctx.closePath();
}

// Interior de la boca: oscuro abajo, con hollín, y un resplandor que viene del fuego.
function firebox(ctx, cx, g, iw, ih, warm = 'rgba(255,120,40,0.28)') {
  archPath(ctx, cx, g, iw, ih);
  ctx.fillStyle = vGrad(ctx, g - ih, g, ['#0c0806', '#17100b', '#2a1a10']);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const r = ctx.createRadialGradient(cx, g, 10, cx, g, Math.max(iw, ih));
  r.addColorStop(0, warm);
  r.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r;
  ctx.fillRect(cx - iw, g - ih, iw * 2, ih);
  ctx.restore();
}

// Hilada de bloques dentro del rectángulo (recortá antes para darle forma). `pal` da el color de cada uno.
function courses(ctx, x, y, w, h, bw, bh, mortar, pal) {
  ctx.fillStyle = mortar;
  ctx.fillRect(x, y, w, h);
  let row = 0;
  for (let yy = y + h - bh; yy > y - bh; yy -= bh, row++) {
    for (let xx = x - (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
      const bx = xx + 1, by = yy + 1, ww = bw - 2, hh = bh - 2;
      ctx.fillStyle = pal();
      ctx.fillRect(bx, by, ww, hh);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(bx, by, ww, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(bx, by + hh - 2, ww, 2);
    }
  }
}

const brickPal = (r = 142, g = 66, b = 46) => () => {
  const k = rand(-16, 16);
  return `rgb(${r + k},${g + k * 0.6},${b + k * 0.5})`;
};
const stonePal = (l = 92, tone = 6) => () => {
  const k = rand(-12, 12);
  return `rgb(${l + k + tone},${l + k},${l + k - tone})`;
};

// Sombra vertical para dar volumen a un muro y hollín sobre la boca.
function shade(ctx, x, y, w, h) {
  ctx.fillStyle = hGrad(ctx, x, x + w, ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)', 'rgba(255,240,220,0.05)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']);
  ctx.fillRect(x, y, w, h);
}
function soot(ctx, cx, y, rx, ry) {
  const r = ctx.createRadialGradient(cx, y, 4, cx, y, rx);
  r.addColorStop(0, 'rgba(8,5,4,0.75)');
  r.addColorStop(1, 'rgba(8,5,4,0)');
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(1, ry / rx);
  ctx.translate(0, -y);
  ctx.fillStyle = r;
  ctx.fillRect(cx - rx, y - rx, rx * 2, rx * 2);
  ctx.restore();
}

// Dovelas alrededor de la boca: lo que hace que un arco se lea como trabajado.
function voussoirs(ctx, cx, g, iw, ih, thick, n, pal, edge = 'rgba(0,0,0,0.6)') {
  const r = Math.min(iw, ih * 0.5);
  const cy = g - ih + r;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const pt = (a, o) => [cx + Math.cos(a) * (iw + o), cy + Math.sin(a) * (r + o)];
    poly(ctx, [pt(a0, 0), pt(a0, thick), pt(a1, thick), pt(a1, 0)]);
    ctx.fillStyle = pal();
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Jambas rectas hasta el suelo.
  for (const side of [-1, 1]) {
    const x = side < 0 ? cx - iw - thick : cx + iw;
    for (let y = cy; y < g; y += 18) {
      ctx.fillStyle = pal();
      ctx.fillRect(x, y, thick, Math.min(17, g - y));
      ctx.strokeStyle = edge;
      ctx.strokeRect(x, y, thick, Math.min(17, g - y));
    }
  }
}

// Olla colgando de una cadena.
function pot(ctx, x, y, r, chainTop) {
  ctx.strokeStyle = '#25211e';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(x, chainTop); ctx.lineTo(x, y - r); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = hGrad(ctx, x - r, x + r, ['#141210', '#3b3631', '#191614']);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2622';
  ctx.fillRect(x - r * 0.75, y - r * 0.95, r * 1.5, 4);
}

// Fajas de hierro con remaches.
function ironBand(ctx, x, y, w, h = 8, rivets = 6) {
  ctx.fillStyle = vGrad(ctx, y, y + h, ['#55585e', '#2c2e33', '#17181b']);
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < rivets; i++) {
    const rx = x + ((i + 0.5) / rivets) * w;
    ctx.fillStyle = '#7d8088';
    ctx.beginPath(); ctx.arc(rx, y + h / 2, 1.6, 0, Math.PI * 2); ctx.fill();
  }
}

// Caño de chimenea de hierro, con su sombrero.
function stack(ctx, cx, top, bottom, w, band = 46) {
  ctx.fillStyle = hGrad(ctx, cx - w / 2, cx + w / 2, ['#17181b', '#54575d', '#2b2d31', '#101113']);
  ctx.fillRect(cx - w / 2, top, w, bottom - top);
  for (let y = top + 14; y < bottom - 6; y += band) ironBand(ctx, cx - w / 2 - 2, y, w + 4, 6, 3);
  ctx.fillStyle = '#26272b';
  poly(ctx, [[cx - w / 2 - 8, top + 2], [cx + w / 2 + 8, top + 2], [cx + w / 2 + 2, top - 8], [cx - w / 2 - 2, top - 8]]);
  ctx.fill();
}

function anvil(ctx, x, g) {
  // Tronco de apoyo.
  ctx.fillStyle = hGrad(ctx, x - 17, x + 17, ['#2a1a10', '#6b4a2e', '#2d1c11']);
  ctx.fillRect(x - 17, g - 42, 34, 42);
  ctx.fillStyle = '#7b5a3a';
  ctx.beginPath(); ctx.ellipse(x, g - 42, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Yunque.
  ctx.fillStyle = vGrad(ctx, g - 76, g - 44, ['#6a6d74', '#3a3c42', '#1b1c20']);
  poly(ctx, [[x - 12, g - 44], [x + 12, g - 44], [x + 8, g - 58], [x + 15, g - 66], [x + 24, g - 66], [x + 20, g - 76], [x - 28, g - 76], [x - 38, g - 70], [x - 12, g - 64], [x - 8, g - 58]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(x - 26, g - 76, 44, 1.5);
}

function bellowsProp(ctx, x, g) {
  ctx.fillStyle = hGrad(ctx, x - 26, x + 26, ['#3a2214', '#6a4426', '#32200f']);
  poly(ctx, [[x - 30, g - 28], [x + 18, g - 54], [x + 26, g - 42], [x + 26, g - 20], [x + 18, g - 8], [x - 30, g - 22]]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  for (const k of [-6, 4, 14]) { ctx.beginPath(); ctx.moveTo(x + k, g - 46 + k * 0.3); ctx.lineTo(x + k, g - 14 - k * 0.3); ctx.stroke(); }
  ctx.fillStyle = '#2c2e33';
  poly(ctx, [[x - 30, g - 28], [x - 30, g - 22], [x - 46, g - 24], [x - 46, g - 26]]);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(x + 12, g - 8, 6, 8);
  ctx.fillRect(x - 24, g - 18, 6, 18);
}

function tools(ctx, x, y) {
  ctx.strokeStyle = '#1e1f23';
  ctx.lineWidth = 3;
  for (const [k, len] of [[0, 50], [13, 62], [26, 44]]) {
    ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k, y + len); ctx.stroke();
  }
  ctx.fillStyle = '#34363b';
  ctx.fillRect(x - 5, y + 48, 11, 7);       // martillo
  ctx.fillRect(x + 8, y + 62, 10, 3);       // pala
  poly(ctx, [[x + 26, y + 44], [x + 21, y + 54], [x + 31, y + 54]]); // tenaza
  ctx.fill();
  ctx.fillStyle = '#4a4c52';
  ctx.fillRect(x - 8, y - 3, 44, 4);
}

export const LOOKS = {
  // Anillo de piedras sueltas.
  ronda: { big: 'stone0', small: 'stone2', lip: ['stone2', 'stone3'], wall: 'wall-stone', sideStones: true },

  // Pirca baja detrás: las piedras ya están acomodadas.
  pirca: {
    big: 'stone0', small: 'stone2', lip: ['stone2', 'stone3'], wall: 'wall-stone', sideStones: true, h: 96,
    back(ctx, { w, cx, g, half }) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - half - 30, g);
      ctx.quadraticCurveTo(cx - half - 22, g - 74, cx, g - 86);
      ctx.quadraticCurveTo(cx + half + 22, g - 74, cx + half + 30, g);
      ctx.closePath();
      ctx.clip();
      courses(ctx, 0, g - 90, w, 90, 42, 22, '#14100d', stonePal(84));
      soot(ctx, cx, g - 22, half * 0.9, 58);
      ctx.restore();
    },
  },

  // Fogón: muro bajo de piedra labrada y parrilla de hierro con su olla.
  parrilla: {
    big: 'hewn0', small: 'hewn1', lip: ['hewn1'], wall: 'wall-stone', sideStones: true, h: 178,
    back(ctx, { w, cx, g, half }) {
      ctx.save();
      poly(ctx, [[cx - half - 32, g], [cx - half - 32, g - 92], [cx - half + 6, g - 112], [cx + half - 6, g - 112], [cx + half + 32, g - 92], [cx + half + 32, g]]);
      ctx.clip();
      courses(ctx, 0, g - 116, w, 116, 46, 20, '#17120e', stonePal(96, 8));
      soot(ctx, cx, g - 34, half, 76);
      ctx.restore();
      ctx.fillStyle = vGrad(ctx, g - 114, g - 104, ['#9c9488', '#6a6359']);
      ctx.fillRect(cx - half + 4, g - 114, half * 2 - 8, 6);
      // Postes y travesaño de hierro.
      ctx.fillStyle = '#23242a';
      for (const side of [-1, 1]) ctx.fillRect(cx + side * (half + 8) - 3, g - 164, 6, 164);
      ctx.fillRect(cx - half - 14, g - 168, half * 2 + 28, 7);
      ctx.fillStyle = '#3f4149';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * (half + 8), g - 165, 5, 0, Math.PI * 2); ctx.fill(); }
      pot(ctx, cx, g - 124, 21, g - 162);
    },
  },

  // Hogar: chimenea de ladrillo con repisa de madera.
  chimenea: {
    big: 'hewn0', small: 'hewn1', lip: ['brick1'], wall: 'wall-brick', sideStones: false, h: 352,
    smoke: { x: 0, y: -340 },
    back(ctx, { w, cx, g, half }) {
      const bw = half + 34;
      const neck = 52;
      ctx.save();
      poly(ctx, [[cx - bw, g], [cx - bw, g - 176], [cx - neck, g - 262], [cx - neck, g - 338], [cx + neck, g - 338], [cx + neck, g - 262], [cx + bw, g - 176], [cx + bw, g]]);
      ctx.clip();
      courses(ctx, 0, 0, w, g, 30, 13, '#2a1c15', brickPal());
      shade(ctx, cx - bw, 0, bw * 2, g);
      ctx.restore();
      soot(ctx, cx, g - 170, half * 0.8, 62);
      voussoirs(ctx, cx, g, half + 4, 158, 17, 13, stonePal(120, 12));
      firebox(ctx, cx, g, half + 4, 158);
      pot(ctx, cx + half * 0.52, g - 92, 17, g - 150);
      // Repisa de madera y remate de la chimenea.
      ctx.fillStyle = vGrad(ctx, g - 190, g - 174, ['#8a6238', '#573a20', '#2c1b0e']);
      ctx.fillRect(cx - bw - 10, g - 190, (bw + 10) * 2, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(cx - bw - 4, g - 174, (bw + 4) * 2, 4);
      ctx.fillStyle = vGrad(ctx, g - 352, g - 336, ['#9a9185', '#5e564c']);
      ctx.fillRect(cx - neck - 7, g - 348, (neck + 7) * 2, 12);
      ctx.fillStyle = '#6a6156';
      ctx.fillRect(cx - 18, g - 352, 36, 6);
    },
  },

  // Horno de barro: cúpula enlucida con arco de ladrillo.
  horno: {
    big: 'adobe0', small: 'adobe1', lip: ['adobe1'], wall: 'wall-adobe', sideStones: false, h: 296,
    smoke: { x: 58, y: -284 },
    back(ctx, { w, cx, g, half }) {
      const rx = half + 42;
      const ry = 248;
      // Chimenita, detrás de la cúpula.
      ctx.fillStyle = hGrad(ctx, cx + 42, cx + 76, ['#57402e', '#92714f', '#4a3424']);
      ctx.fillRect(cx + 42, g - 276, 34, 80);
      ctx.fillStyle = '#6b5240';
      ctx.fillRect(cx + 37, g - 282, 44, 8);
      // Cúpula.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, g, rx, ry, 0, Math.PI, 0);
      ctx.closePath();
      ctx.clip();
      const dome = ctx.createRadialGradient(cx - rx * 0.28, g - ry * 0.72, 12, cx, g - ry * 0.3, rx * 1.2);
      dome.addColorStop(0, '#c8a47d');
      dome.addColorStop(0.5, '#96704f');
      dome.addColorStop(1, '#4f3625');
      ctx.fillStyle = dome;
      ctx.fillRect(0, 0, w, g);
      // Manchas del enlucido, paja y grietas.
      for (let i = 0; i < 46; i++) {
        ctx.globalAlpha = rand(0.04, 0.12);
        ctx.fillStyle = i % 2 ? '#e4cba8' : '#2f1d12';
        ctx.beginPath();
        ctx.ellipse(rand(cx - rx, cx + rx), rand(g - ry, g), rand(10, 40), rand(5, 18), rand(0, 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = rand(0.15, 0.4);
        ctx.strokeStyle = i % 2 ? '#e0c690' : '#6a4d2a';
        const x = rand(cx - rx, cx + rx), y = rand(g - ry, g), a = rand(0, 3);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); ctx.stroke();
      }
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#2a1a10';
      for (let k = 0; k < 5; k++) {
        let x = cx + rand(-rx * 0.8, rx * 0.8), y = g - ry * rand(0.45, 0.8);
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let i = 0; i < 7; i++) { x += rand(-8, 8); y += rand(6, 14); ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      soot(ctx, cx, g - 170, half * 0.85, 58);
      voussoirs(ctx, cx, g, half + 2, 150, 19, 15, brickPal(150, 76, 52));
      firebox(ctx, cx, g, half + 2, 150);
      // Zócalo de piedra.
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - rx - 2, g - 18, rx * 2 + 4, 18);
      ctx.clip();
      courses(ctx, cx - rx - 2, g - 18, rx * 2 + 4, 18, 36, 18, '#1a120c', stonePal(88, 8));
      ctx.restore();
      firebox(ctx, cx, g, half + 2, 150);
    },
  },

  // Fragua: fogón de ladrillo refractario, campana de hierro remachada, yunque y fuelle.
  fragua: {
    big: 'iron0', small: 'iron1', lip: ['iron1'], wall: 'wall-iron', sideStones: false, h: 408,
    smoke: { x: 0, y: -400 },
    glows: [{ x: 0, y: -196, r: 0.5, tint: 0xffa040 }],
    back(ctx, { w, cx, g, half, side }) {
      const bw = half + 26;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - bw, g - 164, bw * 2, 164);
      ctx.clip();
      courses(ctx, 0, g - 170, w, 170, 30, 13, '#110c0a', brickPal(84, 48, 40));
      shade(ctx, cx - bw, g - 164, bw * 2, 164);
      ctx.restore();
      firebox(ctx, cx, g, half + 2, 146, 'rgba(255,170,60,0.34)');
      // Campana de hierro.
      stack(ctx, cx, g - 392, g - 262, 62);
      poly(ctx, [[cx - bw - 18, g - 160], [cx - 42, g - 268], [cx + 42, g - 268], [cx + bw + 18, g - 160]]);
      ctx.fillStyle = hGrad(ctx, cx - bw - 18, cx + bw + 18, ['#141518', '#4d5057', '#2c2e33', '#3f4148', '#111215']);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      for (const t of [0.25, 0.5, 0.75]) {
        const y = g - 160 - 108 * t;
        const hw = (bw + 18) + (42 - bw - 18) * t;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(cx - hw, y, hw * 2, 2);
        ctx.fillStyle = '#868992';
        for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.arc(cx - hw + (i / 8) * hw * 2, y + 5, 1.5, 0, Math.PI * 2); ctx.fill(); }
      }
      ironBand(ctx, cx - bw - 20, g - 170, (bw + 20) * 2, 12, 14);
      // Taller al costado: el yunque a un lado y el fuelle al otro.
      tools(ctx, cx - half * 0.4, g - 148);
      anvil(ctx, cx + half + side - 34, g);
      bellowsProp(ctx, cx - half - side + 50, g);
    },
  },

  // Alto horno: torre de piedra zunchada, con coladas brillantes y boca de carga arriba.
  altohorno: {
    big: 'iron0', small: 'iron1', lip: ['iron1'], wall: 'wall-iron', sideStones: false, h: 452,
    smoke: { x: 0, y: -446 },
    glows: [
      { x: 0, y: -430, r: 0.9, tint: 0xffb050 },
      { x: -96, y: -268, r: 0.34, tint: 0xff8a30 },
      { x: 96, y: -268, r: 0.34, tint: 0xff8a30 },
      { x: 0, y: -330, r: 0.34, tint: 0xff8a30 },
    ],
    back(ctx, { w, cx, g, half }) {
      const bw = half + 34;
      const top = half * 0.5;
      ctx.save();
      poly(ctx, [[cx - bw, g], [cx - bw + 8, g - 170], [cx - top, g - 428], [cx + top, g - 428], [cx + bw - 8, g - 170], [cx + bw, g]]);
      ctx.clip();
      courses(ctx, 0, 0, w, g, 52, 24, '#120e0c', stonePal(78, 5));
      shade(ctx, cx - bw, 0, bw * 2, g);
      // Zunchos de hierro.
      for (const y of [g - 184, g - 246, g - 306, g - 364, g - 416]) ironBand(ctx, cx - bw, y, bw * 2, 10, 18);
      ctx.restore();
      // Coladas: ranuras que brillan.
      for (const [x, y] of [[-96, -268], [96, -268], [0, -330]]) {
        ctx.fillStyle = '#ff9a3a';
        ctx.fillRect(cx + x - 5, g + y - 13, 10, 26);
        ctx.fillStyle = '#ffe0a0';
        ctx.fillRect(cx + x - 2, g + y - 11, 4, 22);
      }
      voussoirs(ctx, cx, g, half + 4, 158, 20, 15, stonePal(108, 6));
      firebox(ctx, cx, g, half + 4, 158, 'rgba(255,170,60,0.36)');
      // Toberas a los costados.
      for (const s of [-1, 1]) {
        ctx.strokeStyle = '#2b2d31';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(cx + s * (bw + 28), g);
        ctx.lineTo(cx + s * (bw + 28), g - 210);
        ctx.lineTo(cx + s * (bw - 6), g - 232);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(160,165,175,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Boca de carga.
      ctx.fillStyle = vGrad(ctx, g - 448, g - 426, ['#3b3d43', '#1a1b1f']);
      ctx.fillRect(cx - top - 14, g - 438, (top + 14) * 2, 12);
      ctx.fillStyle = '#ffb860';
      ctx.fillRect(cx - top + 6, g - 442, (top - 6) * 2, 4);
    },
  },

  // Gran Forja: granito pulido, bronce y globos de fuego azul. La obra más limpia de la escalera.
  granforja: {
    big: 'granite0', small: 'granite1', lip: ['granite1'], wall: 'wall-granite', sideStones: false, h: 482,
    smoke: { x: 0, y: -476 },
    glows: [
      { x: 0, y: -224, r: 0.42, tint: 0x8ac8ff },
      { x: -246, y: -326, r: 0.62, tint: 0x70b8ff },
      { x: 246, y: -326, r: 0.62, tint: 0x70b8ff },
      { x: 0, y: -462, r: 0.5, tint: 0x8ac8ff },
    ],
    back(ctx, { w, cx, g, half }) {
      const bw = half + 24;
      const brass = (y0, y1) => vGrad(ctx, y0, y1, ['#f0d48a', '#b98f42', '#6d4f1e']);
      // Cuerpo escalonado.
      ctx.save();
      poly(ctx, [[cx - bw, g], [cx - bw, g - 246], [cx - bw + 36, g - 246], [cx - bw + 36, g - 322], [cx - 72, g - 322], [cx - 72, g - 456], [cx + 72, g - 456], [cx + 72, g - 322], [cx + bw - 36, g - 322], [cx + bw - 36, g - 246], [cx + bw, g - 246], [cx + bw, g]]);
      ctx.clip();
      ctx.fillStyle = vGrad(ctx, g - 456, g, ['#3a3f4c', '#272a33', '#1b1d24']);
      ctx.fillRect(0, 0, w, g);
      courses(ctx, 0, 0, w, g, 72, 34, 'rgba(10,11,16,0.9)', () => {
        const k = rand(-6, 6);
        return `rgb(${44 + k},${48 + k},${60 + k})`;
      });
      shade(ctx, cx - bw, 0, bw * 2, g);
      // Reflejo pulido.
      ctx.fillStyle = hGrad(ctx, cx - bw, cx + bw, ['rgba(255,255,255,0)', 'rgba(200,220,255,0.09)', 'rgba(255,255,255,0)']);
      ctx.fillRect(cx - bw, 0, bw * 2, g);
      ctx.restore();
      // Cornisas de bronce.
      for (const [hw, y] of [[bw + 8, g - 252], [bw - 28, g - 328], [80, g - 462]]) {
        ctx.fillStyle = brass(y, y + 10);
        ctx.fillRect(cx - hw, y, hw * 2, 10);
      }
      // Arco con moldura de bronce, y dovela central con el símbolo.
      voussoirs(ctx, cx, g, half + 2, 170, 15, 17, () => `rgb(${60 + rand(-4, 4)},${64 + rand(-4, 4)},${80 + rand(-4, 4)})`, 'rgba(220,180,90,0.75)');
      firebox(ctx, cx, g, half + 2, 170, 'rgba(110,170,255,0.36)');
      ctx.fillStyle = brass(g - 200, g - 170);
      poly(ctx, [[cx - 16, g - 170], [cx + 16, g - 170], [cx + 22, g - 208], [cx - 22, g - 208]]);
      ctx.fill();
      ctx.strokeStyle = '#2a4a80';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, g - 204); ctx.lineTo(cx, g - 176);
      ctx.moveTo(cx - 8, g - 196); ctx.lineTo(cx, g - 188); ctx.lineTo(cx + 8, g - 196);
      ctx.stroke();
      // Caños de cobre sobre el frente.
      for (const s of [-1, 1]) {
        ctx.strokeStyle = '#a7653c';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(cx + s * 48, g - 456);
        ctx.lineTo(cx + s * 48, g - 300);
        ctx.quadraticCurveTo(cx + s * 48, g - 276, cx + s * (half - 10), g - 268);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,215,170,0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // Columnas con globo de fuego azul.
      for (const s of [-1, 1]) {
        const x = cx + s * 246;
        ctx.fillStyle = hGrad(ctx, x - 14, x + 14, ['#1b1d24', '#585e6e', '#2b2e38', '#14151a']);
        ctx.fillRect(x - 13, g - 292, 26, 292);
        ctx.fillStyle = brass(g - 300, g - 288);
        ctx.fillRect(x - 18, g - 300, 36, 10);
        ctx.fillStyle = brass(g - 14, g);
        ctx.fillRect(x - 18, g - 14, 36, 14);
        ctx.fillStyle = brass(g - 170, g - 160);
        ctx.fillRect(x - 15, g - 170, 30, 7);
        const glass = ctx.createRadialGradient(x, g - 326, 2, x, g - 326, 25);
        glass.addColorStop(0, '#ffffff');
        glass.addColorStop(0.4, '#9fdcff');
        glass.addColorStop(1, '#2a4aa0');
        ctx.fillStyle = glass;
        ctx.beginPath(); ctx.arc(x, g - 326, 25, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c9a050';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
  },
};

// Bloque de hierro y de granito para el labio de adelante.
function plate(ctx, w, h, top, mid, bot, rivet) {
  ctx.fillStyle = vGrad(ctx, 0, h, [top, mid, bot]);
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(3, 2, w - 6, 1.5);
  if (!rivet) return;
  ctx.fillStyle = rivet;
  for (const [x, y] of [[5, 5], [w - 5, 5], [5, h - 5], [w - 5, h - 5]]) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
}

// Pared baja tileable hecha de hiladas.
function wallTex(scene, key, pal, mortar = '#17110d') {
  canvasTex(scene, key, 64, 64, (ctx, w, h) => courses(ctx, 0, 0, w, h, 32, 16, mortar, pal));
}

// Textura de atrás de cada escalón, y los materiales nuevos que usan las construcciones.
export function createHearthTextures(scene) {
  canvasTex(scene, 'brick1', 44, 30, (ctx, w, h) => {
    courses(ctx, 0, 0, w, h, 22, 10, '#2a1c15', brickPal());
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  });
  canvasTex(scene, 'iron0', 56, 38, (ctx, w, h) => plate(ctx, w, h, '#5c5f66', '#33353a', '#17181b', '#8b8e96'));
  canvasTex(scene, 'iron1', 44, 30, (ctx, w, h) => plate(ctx, w, h, '#54575e', '#303237', '#16171a', '#8b8e96'));
  canvasTex(scene, 'granite0', 56, 38, (ctx, w, h) => plate(ctx, w, h, '#5a6072', '#32363f', '#1b1d24', '#d8b468'));
  canvasTex(scene, 'granite1', 44, 30, (ctx, w, h) => plate(ctx, w, h, '#555b6c', '#30343e', '#1a1c23', '#d8b468'));
  wallTex(scene, 'wall-brick', brickPal());
  wallTex(scene, 'wall-iron', brickPal(84, 48, 40), '#110c0a');
  wallTex(scene, 'wall-granite', () => {
    const k = rand(-6, 6);
    return `rgb(${44 + k},${48 + k},${60 + k})`;
  }, '#0c0d12');

  for (const size of SIZES) {
    const look = LOOKS[size.look];
    if (!look?.back) continue;
    const side = size.margin + 8;
    const w = 2 * (size.half + side);
    canvasTex(scene, `hearth-${size.id}`, w, look.h + 8, (ctx) => {
      look.back(ctx, { w, cx: w / 2, g: look.h, half: size.half, side });
    });
  }
}
