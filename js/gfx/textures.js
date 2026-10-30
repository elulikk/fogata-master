// Texturas generadas por código (no hay imágenes en assets todavía).

import { WOODS } from '../data/woods.js';

export const W = 1280;
export const H = 720;
export const GROUND_Y = 650;

const rand = (a, b) => a + Math.random() * (b - a);

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.context, w, h);
  tex.refresh();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Color hex → [r,g,b] para poder oscurecer/aclarar madera.
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function drawLog(ctx, w, h, wood) {
  const r = h * 0.45;
  const dark = hexRgb(wood.barkDark), light = hexRgb(wood.barkLight), mid = hexRgb(wood.bark);
  ctx.save();
  roundRectPath(ctx, 0.5, 0.5, w - 1, h - 1, r);
  ctx.clip();
  // Cuerpo cilíndrico: luz arriba, sombra abajo, un poco de rebote al final.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, wood.barkLight);
  g.addColorStop(0.3, wood.bark);
  g.addColorStop(0.8, wood.barkDark);
  g.addColorStop(1, rgba(mid, 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Surcos largos de la corteza (ondulados, más marcados en troncos).
  const rough = wood.shape === 'log' ? 1 : 0.7;
  ctx.lineCap = 'round';
  for (let i = 0; i < w / 3; i++) {
    const y = rand(1, h - 1);
    const x = rand(-10, w);
    const len = rand(w * 0.08, w * 0.35);
    ctx.strokeStyle = Math.random() < 0.65 ? rgba(dark, 1) : rgba(light, 1);
    ctx.globalAlpha = rand(0.18, 0.5) * rough;
    ctx.lineWidth = rand(0.6, h > 30 ? 2.2 : 1.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const seg = 4;
    for (let k = 1; k <= seg; k++) ctx.lineTo(x + (len * k) / seg, y + rand(-1.6, 1.6));
    ctx.stroke();
  }
  // Grietas finas transversales.
  ctx.strokeStyle = rgba(dark, 1);
  ctx.lineWidth = 1;
  for (let i = 0; i < w / 12; i++) {
    const x = rand(4, w - 4), y = rand(2, h - 6);
    ctx.globalAlpha = rand(0.2, 0.45);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-2, 2), y + rand(2, h * 0.3));
    ctx.stroke();
  }
  // Nudos con aro claro (volumen) y centro oscuro.
  const knots = Math.max(1, Math.round(w / 55));
  for (let i = 0; i < knots; i++) {
    const x = rand(w * 0.18, w * 0.82), y = rand(h * 0.3, h * 0.7);
    const kr = Math.max(2, h * 0.14), kh = Math.max(1.5, h * 0.09);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = rgba(light, 1);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, kr + 1.5, kh + 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = rgba(dark, 1);
    ctx.beginPath();
    ctx.ellipse(x, y, kr, kh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, kr * 0.45, kh * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Rama: ramitas cortadas y punta clara.
  if (wood.shape === 'stick') {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = wood.inner;
    for (const x of [w * 0.34, w * 0.68]) {
      ctx.beginPath();
      ctx.ellipse(x, h * 0.28, 2, 1.3, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(w - 3, h / 2, 2.4, h / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Corte con anillos en las puntas.
  if (wood.shape === 'log') {
    const ew = Math.min(h * 0.34, 14);
    const rings = h > 34 ? 6 : 4;
    for (const x of [ew / 2 + 1, w - ew / 2 - 1]) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgba(dark, 1);
      ctx.beginPath();
      ctx.ellipse(x, h / 2, ew / 2 + 1, h / 2 - 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      const rg = ctx.createRadialGradient(x, h / 2, 0, x, h / 2, h / 2);
      rg.addColorStop(0, wood.inner);
      rg.addColorStop(1, rgba(mid, 1));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(x, h / 2, ew / 2, h / 2 - 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(dark, 1);
      ctx.lineWidth = 0.8;
      for (let k = 1; k < rings; k++) {
        ctx.globalAlpha = 0.25 + 0.2 * (k % 2);
        const f = k / rings;
        ctx.beginPath();
        ctx.ellipse(x + (Math.random() - 0.5), h / 2, (ew / 2) * f, (h / 2 - 2.5) * f, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, h / 2);
      ctx.lineTo(x + rand(-ew / 3, ew / 3), h / 2 + rand(-h * 0.35, h * 0.35));
      ctx.stroke();
    }
  }
  // Húmeda: musgo, tono verdoso y brillo de humedad.
  if (wood.wet) {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < w / 5; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#3f5a37' : '#2d4a30';
      ctx.beginPath();
      ctx.ellipse(rand(8, w - 8), rand(h * 0.4, h), rand(2, 6), rand(1, 2.6), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#1c3a2a';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.22;
    const s = ctx.createLinearGradient(0, 0, 0, h);
    s.addColorStop(0, '#9fc4e0');
    s.addColorStop(0.5, 'rgba(120,160,200,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#cfe6f5';
    for (let i = 0; i < w / 14; i++) {
      ctx.beginPath();
      ctx.arc(rand(4, w - 4), rand(2, h * 0.5), rand(0.8, 1.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Luz de borde arriba y sombra abajo.
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = rgba(light, 1);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.7, 2.2);
  ctx.lineTo(w - r * 0.7, 2.2);
  ctx.stroke();
  ctx.globalAlpha = 0.3;
  const sh = ctx.createLinearGradient(0, h * 0.7, 0, h);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, '#000');
  ctx.fillStyle = sh;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,12,8,0.8)';
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, 0.5, 0.5, w - 1, h - 1, r);
  ctx.stroke();
}

function drawCone(ctx, w, h, wood) {
  const cx = w / 2, cy = h / 2, r = w / 2 - 1;
  ctx.fillStyle = wood.barkDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Escamas: de afuera hacia adentro, cada una con sombra, luz y borde.
  for (let ring = 4; ring >= 1; ring--) {
    const rr = r * (ring / 4.2);
    const n = 5 + ring * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.7;
      const sz = r * (0.26 - ring * 0.012);
      ctx.save();
      ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(-1, 1.2, sz, sz * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      const sg = ctx.createLinearGradient(-sz, 0, sz, 0);
      sg.addColorStop(0, wood.bark);
      sg.addColorStop(1, ring % 2 ? wood.barkLight : wood.bark);
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(0, 0, sz, sz * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = wood.barkLight;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 0.85, sz * 0.5, 0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.fillStyle = wood.inner;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  // Gotitas de resina.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#f0c878';
  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2), d = rand(r * 0.3, r * 0.8);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rand(0.9, 1.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(20,12,8,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function radial(scene, key, size, stops, sy = 1) {
  canvasTex(scene, key, size, Math.round(size * sy), (ctx, w, h) => {
    ctx.save();
    ctx.scale(1, sy);
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.restore();
  });
}

function drawStone(ctx, w, h, tone, seed = 0) {
  const g = ctx.createRadialGradient(w * 0.36, h * 0.28, 2, w / 2, h / 2, w * 0.58);
  g.addColorStop(0, `hsl(30, 7%, ${tone + 26}%)`);
  g.addColorStop(0.55, `hsl(25, 6%, ${tone + 2}%)`);
  g.addColorStop(1, `hsl(20, 8%, ${tone - 14}%)`);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Granulado y una grieta.
  for (let i = 0; i < w * 1.2; i++) {
    ctx.globalAlpha = rand(0.08, 0.22);
    ctx.fillStyle = Math.random() < 0.5 ? '#000' : '#fff';
    ctx.fillRect(rand(0, w), rand(0, h), rand(1, 2.4), rand(1, 2));
  }
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const sx = rand(w * 0.3, w * 0.6);
  ctx.moveTo(sx, rand(2, h * 0.3));
  ctx.lineTo(sx + rand(-6, 6), h * 0.5);
  ctx.lineTo(sx + rand(-8, 8), rand(h * 0.7, h - 2));
  ctx.stroke();
  // Musgo en la parte baja y de un costado.
  ctx.globalAlpha = 0.55;
  const side = seed % 2 ? 0.6 : -0.6;
  for (let i = 0; i < w * 0.5; i++) {
    const a = rand(0.2, 0.9) * Math.PI;
    ctx.fillStyle = ['#34502f', '#41612f', '#2a4129'][i % 3];
    ctx.beginPath();
    ctx.arc(w / 2 + Math.cos(a + side) * (w / 2 - 2) * rand(0.5, 1), h / 2 + Math.sin(a) * (h / 2 - 2) * rand(0.5, 1), rand(1, 2.4), 0, Math.PI * 2);
    ctx.fill();
  }
  // Sombra de contacto abajo.
  ctx.globalAlpha = 0.4;
  const sg = ctx.createLinearGradient(0, h * 0.6, 0, h);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(1, '#000');
  ctx.fillStyle = sg;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ---- Fondo en capas ----
// Cada capa es una textura de W×H con transparencia ('bg-sky', 'bg-hills', 'bg-trees-far',
// 'bg-trees-mid', 'bg-trees-near', 'bg-ground'); 'bg' las compone para que nada cambie.

function fog(ctx, y0, y1, w, color, aTop, aBot) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(${color},${aTop})`);
  g.addColorStop(1, `rgba(${color},${aBot})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, y1 - y0);
}

function drawSky(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#05070f');
  sky.addColorStop(0.45, '#10122a');
  sky.addColorStop(0.8, '#221a2c');
  sky.addColorStop(1, '#33201f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Vía láctea tenue.
  ctx.save();
  ctx.translate(w * 0.35, 150);
  ctx.rotate(-0.35);
  const mw = ctx.createLinearGradient(0, -60, 0, 60);
  mw.addColorStop(0, 'rgba(140,150,220,0)');
  mw.addColorStop(0.5, 'rgba(150,160,230,0.07)');
  mw.addColorStop(1, 'rgba(140,150,220,0)');
  ctx.fillStyle = mw;
  ctx.fillRect(-700, -60, 1400, 120);
  ctx.restore();

  // Estrellas: muchas chicas, con color, y unas pocas con destello.
  const tints = ['#ffffff', '#dfe8ff', '#ffe9c8', '#cfd8ff'];
  for (let i = 0; i < 320; i++) {
    const y = rand(0, GROUND_Y * 0.65);
    ctx.globalAlpha = rand(0.15, 0.9) * Math.max(0.3, 1 - y / (GROUND_Y * 0.75));
    ctx.fillStyle = tints[(Math.random() * tints.length) | 0];
    const s = Math.random() < 0.07 ? 2 : 1;
    ctx.fillRect(rand(0, w), y, s, s);
  }
  for (let i = 0; i < 9; i++) {
    const x = rand(0, w), y = rand(10, GROUND_Y * 0.45);
    const sg = ctx.createRadialGradient(x, y, 0, x, y, 7);
    sg.addColorStop(0, 'rgba(255,255,255,0.9)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = sg;
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 5, y, 10, 1);
    ctx.fillRect(x, y - 5, 1, 10);
  }
  ctx.globalAlpha = 1;

  // Luna con halo, cráteres y sombra de fase.
  const mx = 1080, my = 110;
  const halo = ctx.createRadialGradient(mx, my, 20, mx, my, 170);
  halo.addColorStop(0, 'rgba(220,226,255,0.28)');
  halo.addColorStop(0.35, 'rgba(180,190,240,0.1)');
  halo.addColorStop(1, 'rgba(160,170,230,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - 180, my - 180, 360, 360);
  ctx.fillStyle = '#ece6d2';
  ctx.beginPath();
  ctx.arc(mx, my, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, 26, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(150,140,120,0.35)';
  for (const [dx, dy, r] of [[-8, -6, 6], [9, 5, 7], [-3, 12, 4], [10, -11, 3.5]]) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const ph = ctx.createLinearGradient(mx - 26, 0, mx + 26, 0);
  ph.addColorStop(0, 'rgba(0,0,0,0)');
  ph.addColorStop(1, 'rgba(20,20,50,0.4)');
  ctx.fillStyle = ph;
  ctx.fillRect(mx - 26, my - 26, 52, 52);
  ctx.restore();

  // Resplandor cálido en el horizonte.
  fog(ctx, GROUND_Y - 260, GROUND_Y, w, '90,50,40', 0, 0.35);
}

function drawHills(ctx, w) {
  const ridge = (base, amp, f1, f2, ph, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, base - Math.sin(x * f1 + ph) * amp - Math.sin(x * f2 + ph * 2) * amp * 0.4);
    ctx.lineTo(w, GROUND_Y);
    ctx.fill();
  };
  ridge(GROUND_Y - 150, 40, 0.005, 0.016, 1.3, '#1d1a2e');
  fog(ctx, GROUND_Y - 220, GROUND_Y - 100, w, '46,38,66', 0, 0.55);
  ridge(GROUND_Y - 105, 32, 0.007, 0.02, 4.1, '#15121f');
}

function pine(ctx, x, base, height, color) {
  ctx.fillStyle = color;
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const y0 = base - (height * i) / layers - height * 0.05;
    const wdt = height * 0.3 * (1 - i / (layers + 0.5));
    ctx.beginPath();
    ctx.moveTo(x - wdt, y0);
    ctx.lineTo(x - wdt * 0.55, y0 - height * 0.07);
    ctx.lineTo(x - wdt * 0.8, y0 - height * 0.07);
    ctx.lineTo(x, y0 - height * 0.4);
    ctx.lineTo(x + wdt * 0.8, y0 - height * 0.07);
    ctx.lineTo(x + wdt * 0.55, y0 - height * 0.07);
    ctx.lineTo(x + wdt, y0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(x - 3, base - 6, 6, 14);
}

function treeLayer(ctx, w, count, baseMin, baseMax, hMin, hMax, color) {
  for (let i = 0; i < count; i++) pine(ctx, rand(0, w), GROUND_Y - rand(baseMin, baseMax), rand(hMin, hMax), color);
}

function drawTreesFar(ctx, w) {
  treeLayer(ctx, w, 60, 50, 85, 90, 150, '#17131f');
  fog(ctx, GROUND_Y - 230, GROUND_Y - 40, w, '50,40,62', 0, 0.5);
}

function drawTreesMid(ctx, w) {
  treeLayer(ctx, w, 42, 12, 42, 120, 200, '#0e0b15');
  fog(ctx, GROUND_Y - 160, GROUND_Y, w, '44,30,36', 0, 0.38);
}

function drawTreesNear(ctx, w) {
  treeLayer(ctx, w, 20, -2, 8, 170, 280, '#07050a');
}

function drawGround(ctx, w, h) {
  const ground = ctx.createLinearGradient(0, GROUND_Y, 0, h);
  ground.addColorStop(0, '#33241a');
  ground.addColorStop(0.25, '#241810');
  ground.addColorStop(1, '#0e0806');
  ctx.fillStyle = ground;
  ctx.fillRect(0, GROUND_Y - 2, w, h - GROUND_Y + 2);
  fog(ctx, GROUND_Y - 30, GROUND_Y + 2, w, '60,42,34', 0, 0.35);
  // Tierra: motas, piedritas y hojas secas.
  for (let i = 0; i < 700; i++) {
    ctx.globalAlpha = rand(0.1, 0.4);
    ctx.fillStyle = Math.random() < 0.5 ? '#4f3a29' : '#0a0604';
    ctx.fillRect(rand(0, w), rand(GROUND_Y, h), rand(1, 4), rand(1, 2));
  }
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = rand(0.25, 0.55);
    ctx.fillStyle = ['#2d2824', '#3a322b', '#1d1916'][i % 3];
    ctx.beginPath();
    ctx.ellipse(rand(0, w), rand(GROUND_Y + 8, h), rand(1.5, 4), rand(1, 2.2), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = rand(0.3, 0.6);
    ctx.fillStyle = ['#5a3416', '#6b4220', '#3f2a14'][i % 3];
    ctx.save();
    ctx.translate(rand(0, w), rand(GROUND_Y + 4, h));
    ctx.rotate(rand(0, Math.PI));
    ctx.beginPath();
    ctx.ellipse(0, 0, rand(2, 4), rand(0.8, 1.5), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Pasto: manojos de hojas finas sobre la línea del suelo y un poco adelante.
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rand(0, w);
    const y = GROUND_Y + rand(-1, 60) * Math.random();
    const near = (y - GROUND_Y) / 60;
    ctx.strokeStyle = ['#1a2417', '#232e1c', '#2e3a20', '#141c12'][i % 4];
    ctx.globalAlpha = rand(0.5, 0.9);
    ctx.lineWidth = rand(0.8, 1.6);
    const blades = 2 + ((Math.random() * 3) | 0);
    for (let b = 0; b < blades; b++) {
      const bh = rand(5, 12) * (0.7 + near * 0.8);
      ctx.beginPath();
      ctx.moveTo(x + b * 2, y);
      ctx.quadraticCurveTo(x + b * 2 + rand(-3, 3), y - bh * 0.6, x + b * 2 + rand(-5, 5), y - bh);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// Compone las capas ya generadas (una sola vez).
function drawBackground(scene, ctx) {
  for (const k of ['bg-sky', 'bg-hills', 'bg-trees-far', 'bg-trees-mid', 'bg-trees-near', 'bg-ground']) {
    ctx.drawImage(scene.textures.get(k).getSourceImage(), 0, 0);
  }
}

// Cielo del amanecer: azul profundo arriba → rosa → naranja/oro en el horizonte (y≈540, a la altura de
// las colinas), con sol naciente detrás de ellas. Transparente hacia abajo para no lavar suelo ni estante.
const DAWN_HORIZON = GROUND_Y - 110;

function drawDawnSky(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, DAWN_HORIZON + 60);
  g.addColorStop(0, '#0b1a4a');
  g.addColorStop(0.3, '#2a2f80');
  g.addColorStop(0.55, '#8a4a9a');
  g.addColorStop(0.75, '#e0607a');
  g.addColorStop(0.9, '#ff9a4a');
  g.addColorStop(1, '#ffd26a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, DAWN_HORIZON + 60);

  // Sol naciente: halo grande y núcleo brillante a ras del horizonte.
  const sx = w * 0.34;
  ctx.save();
  ctx.translate(sx, DAWN_HORIZON);
  ctx.scale(1.8, 1);
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
  halo.addColorStop(0, 'rgba(255,240,190,0.95)');
  halo.addColorStop(0.15, 'rgba(255,200,110,0.7)');
  halo.addColorStop(0.45, 'rgba(255,130,80,0.3)');
  halo.addColorStop(1, 'rgba(255,100,90,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-300, -300, 600, 600);
  ctx.restore();
  ctx.fillStyle = '#fff4cf';
  ctx.beginPath();
  ctx.arc(sx, DAWN_HORIZON + 6, 34, Math.PI, 0);
  ctx.fill();

  // Nubes alargadas, iluminadas por abajo (más doradas cerca del horizonte).
  for (let i = 0; i < 16; i++) {
    const y = rand(90, DAWN_HORIZON - 20), x = rand(0, w), cw = rand(160, 380);
    const t = y / DAWN_HORIZON;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, cw / 2);
    cg.addColorStop(0, `rgba(255,${Math.round(120 + t * 100)},${Math.round(110 - t * 30)},${0.3 + t * 0.2})`);
    cg.addColorStop(1, 'rgba(255,150,120,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.1);
    ctx.translate(-x, -y);
    ctx.fillStyle = cg;
    ctx.fillRect(x - cw / 2, y - cw / 2, cw, cw);
    ctx.restore();
  }

  // Transparencia hacia abajo: nada de velo sobre árboles bajos, suelo ni estante.
  ctx.globalCompositeOperation = 'destination-in';
  const m = ctx.createLinearGradient(0, 0, 0, h);
  m.addColorStop(0, '#fff');
  m.addColorStop(DAWN_HORIZON / h, '#fff');
  m.addColorStop((DAWN_HORIZON + 70) / h, 'rgba(255,255,255,0)');
  m.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

// Rayos de luz que salen del sol naciente (aditivos; centro en x = W*0.34, y = horizonte). Nueva, opcional.
function drawDawnRays(ctx, w, h) {
  const sx = w * 0.34, sy = DAWN_HORIZON + 6;
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI + 0.12 + (i / 13) * (Math.PI - 0.24) + rand(-0.05, 0.05);
    const half = rand(0.02, 0.05), len = rand(500, 900);
    const g = ctx.createRadialGradient(sx, sy, 20, sx, sy, len);
    g.addColorStop(0, 'rgba(255,220,150,0.22)');
    g.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a - half) * len, sy + Math.sin(a - half) * len);
    ctx.lineTo(sx + Math.cos(a + half) * len, sy + Math.sin(a + half) * len);
    ctx.fill();
  }
}

// ---- Pozos por tamaño (ciclo 4) ----

// Bloque de piedra trabajada (rectángulo de esquinas suaves con juntas). Tonos fríos/cálidos por `hue`.
function drawBlock(ctx, w, h, hue, light, seed) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `hsl(${hue}, 8%, ${light + 14}%)`);
  g.addColorStop(0.5, `hsl(${hue}, 8%, ${light}%)`);
  g.addColorStop(1, `hsl(${hue}, 10%, ${light - 12}%)`);
  roundRectPath(ctx, 1, 1, w - 2, h - 2, Math.min(8, h * 0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < w * 1.1; i++) {
    ctx.globalAlpha = rand(0.06, 0.2);
    ctx.fillStyle = Math.random() < 0.5 ? '#000' : '#fff';
    ctx.fillRect(rand(0, w), rand(0, h), rand(1, 2.4), rand(1, 2));
  }
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * (0.35 + 0.1 * seed), 1);
  ctx.lineTo(w * (0.35 + 0.1 * seed) + rand(-3, 3), h - 1);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  const sg = ctx.createLinearGradient(0, h * 0.65, 0, h);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(1, '#000');
  ctx.fillStyle = sg;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  roundRectPath(ctx, 1, 1, w - 2, h - 2, Math.min(8, h * 0.25));
  ctx.stroke();
}

// Adobe: panes de barro cocido, rojizos, con grietas y manchas de hollín.
function drawAdobe(ctx, w, h, seed) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#b0704a');
  g.addColorStop(0.55, '#8a4f33');
  g.addColorStop(1, '#5a301f');
  roundRectPath(ctx, 1, 1, w - 2, h - 2, Math.min(10, h * 0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < w * 1.2; i++) {
    ctx.globalAlpha = rand(0.08, 0.22);
    ctx.fillStyle = ['#d89a6a', '#3a1a10', '#6e3a24'][i % 3];
    ctx.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(1, 2));
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#2a120a';
  ctx.lineWidth = 0.9;
  for (let k = 0; k < 2 + seed; k++) {
    ctx.beginPath();
    let x = rand(w * 0.2, w * 0.8), y = 2;
    ctx.moveTo(x, y);
    while (y < h - 2) { x += rand(-4, 4); y += rand(4, 8); ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  const sh = ctx.createLinearGradient(0, 0, 0, h);
  sh.addColorStop(0, 'rgba(20,10,6,0.55)');
  sh.addColorStop(0.5, 'rgba(20,10,6,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(25,10,5,0.7)';
  roundRectPath(ctx, 1, 1, w - 2, h - 2, Math.min(10, h * 0.3));
  ctx.stroke();
}

// Pared baja tileable (se estira en vertical con tileSprite/setDisplaySize al `wallH`).
function drawWall(ctx, w, h, kind) {
  const rows = 2, bw = w / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c < 3; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = (r * h) / rows;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      ctx.translate(x, y);
      const bh = h / rows;
      if (kind === 'adobe') drawAdobe(ctx, bw, bh, (r + c + 4) % 3);
      else drawBlock(ctx, bw, bh, kind === 'ritual' ? 220 : 28, kind === 'ritual' ? 30 : 36, (r + c + 4) % 3);
      ctx.restore();
    }
  }
}

function drawPost(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#2a1a10');
  g.addColorStop(0.35, '#6a4a30');
  g.addColorStop(1, '#1c1109');
  ctx.fillStyle = g;
  roundRectPath(ctx, 2, 6, w - 4, h - 6, 5);
  ctx.fill();
  ctx.fillStyle = '#4a3220';
  ctx.beginPath();
  ctx.moveTo(2, 8); ctx.lineTo(w / 2, 0); ctx.lineTo(w - 2, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (let y = 24; y < h - 10; y += 16) {
    ctx.beginPath();
    ctx.moveTo(3, y);
    ctx.lineTo(w - 3, y + rand(-2, 2));
    ctx.stroke();
  }
  // Tallado: el brillo de la runa lo pone `rune-glow` encima.
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, 30, 6, 0, Math.PI * 2);
  ctx.moveTo(w / 2, 36); ctx.lineTo(w / 2, 56);
  ctx.moveTo(w / 2 - 6, 46); ctx.lineTo(w / 2 + 6, 46);
  ctx.stroke();
}

function drawRune(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.18); ctx.lineTo(w * 0.5, h * 0.82);
  ctx.moveTo(w * 0.5, h * 0.3); ctx.lineTo(w * 0.78, h * 0.5);
  ctx.moveTo(w * 0.5, h * 0.5); ctx.lineTo(w * 0.22, h * 0.7);
  ctx.stroke();
}

function drawGhost(ctx, w, h) {
  // Volumen del pozo: velo muy suave + contorno punteado. Blanca, para teñir.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.0)');
  g.addColorStop(1, 'rgba(255,255,255,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(2, 2, w - 4, h - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(2, h); ctx.lineTo(2, 2); ctx.lineTo(w - 2, 2); ctx.lineTo(w - 2, h);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBedRing(ctx, w, h) {
  // Elipse del lecho: borde de tierra quemada que se tiñe de naranja a rojo según la carga.
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.82, 'rgba(255,255,255,0)');
  g.addColorStop(0.93, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.scale(1, h / w);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();
}

function drawBed(ctx, w, h) {
  // Lecho oscuro con grava y hollín, para ir bajo la leña.
  ctx.save();
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(18,10,6,0.95)');
  g.addColorStop(0.7, 'rgba(26,16,10,0.8)');
  g.addColorStop(1, 'rgba(26,16,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();
  for (let i = 0; i < 160; i++) {
    const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random());
    ctx.globalAlpha = rand(0.2, 0.55);
    ctx.fillStyle = ['#3a3028', '#1a120c', '#524436'][i % 3];
    ctx.fillRect(w / 2 + Math.cos(a) * d * w * 0.46, h / 2 + Math.sin(a) * d * h * 0.4, rand(1, 3), rand(1, 2));
  }
  ctx.globalAlpha = 1;
}

export function createTextures(scene) {
  for (const [key, wood] of Object.entries(WOODS)) {
    canvasTex(scene, `log-${key}`, wood.length, wood.thickness, (ctx, w, h) =>
      wood.shape === 'cone' ? drawCone(ctx, w, h, wood) : drawLog(ctx, w, h, wood));
  }

  // Llama: gota con núcleo claro (blanca, para poder teñirla), 64×86 como antes.
  canvasTex(scene, 'flame', 64, 86, (ctx, w, h) => {
    const cx = w / 2;
    ctx.save();
    ctx.translate(cx, h * 0.55);
    for (const [sc, a] of [[1, 0.35], [0.78, 0.5], [0.52, 0.8], [0.3, 1]]) {
      const hw = w * 0.42 * sc, top = -h * 0.52 * sc, bot = h * 0.4 * sc;
      const g = ctx.createRadialGradient(0, bot * 0.2, 1, 0, 0, Math.max(hw, bot));
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, `rgba(255,255,255,${a * 0.1})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.bezierCurveTo(hw * 0.3, top * 0.45, hw * 1.2, bot * 0.1, hw * 0.8, bot * 0.6);
      ctx.bezierCurveTo(hw * 0.5, bot, -hw * 0.5, bot, -hw * 0.8, bot * 0.6);
      ctx.bezierCurveTo(-hw * 1.2, bot * 0.1, -hw * 0.3, top * 0.45, 0, top);
      ctx.fill();
    }
    ctx.restore();
    // Máscara radial: suaviza el borde para que no se note la silueta.
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createRadialGradient(cx, h * 0.55, 2, cx, h * 0.55, h * 0.55);
    m.addColorStop(0, '#fff');
    m.addColorStop(0.8, 'rgba(255,255,255,0.9)');
    m.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
  // Chispa: núcleo brillante con cruz de destello (12×12).
  canvasTex(scene, 'spark', 12, 12, (ctx, w, h) => {
    const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(0, 5.5, 12, 1);
    ctx.fillRect(5.5, 0, 1, 12);
  });
  // Chispa alargada (estela vertical, la punta brillante abajo) — nueva, opcional.
  canvasTex(scene, 'spark-streak', 8, 24, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.quadraticCurveTo(w, h * 0.7, w / 2 + 1, h);
    ctx.lineTo(w / 2 - 1, h);
    ctx.quadraticCurveTo(0, h * 0.7, w / 2, 0);
    ctx.fill();
  });
  // Humo: nube irregular hecha de varias volutas (64×64).
  canvasTex(scene, 'smoke', 64, 64, (ctx, w, h) => {
    const puffs = [[32, 32, 26, 0.5], [22, 36, 16, 0.4], [42, 28, 17, 0.4], [30, 20, 14, 0.35], [38, 42, 14, 0.35], [24, 24, 11, 0.3]];
    for (const [x, y, r, a] of puffs) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.6, `rgba(255,255,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
  radial(scene, 'glow', 256, [[0, 'rgba(255,190,110,1)'], [0.25, 'rgba(255,140,60,0.55)'], [0.6, 'rgba(200,70,20,0.15)'], [1, 'rgba(0,0,0,0)']]);
  radial(scene, 'orb', 40, [[0, 'rgba(255,255,230,1)'], [0.25, 'rgba(255,210,90,1)'], [0.55, 'rgba(255,120,30,0.5)'], [1, 'rgba(255,80,0,0)']]);

  canvasTex(scene, 'drop', 2, 16, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(180,200,230,0)');
    g.addColorStop(1, 'rgba(200,220,255,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  canvasTex(scene, 'vignette', W, H, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.62, 180, w / 2, h * 0.62, w * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  for (let i = 0; i < 4; i++) {
    const sw = [56, 44, 38, 30][i];
    const sh = [40, 32, 28, 22][i];
    canvasTex(scene, `stone${i}`, sw, sh, (ctx, w, h) => drawStone(ctx, w, h, 30 + i * 3, i));
  }

  canvasTex(scene, 'bg-sky', W, H, drawSky);
  canvasTex(scene, 'bg-hills', W, H, drawHills);
  canvasTex(scene, 'bg-trees-far', W, H, drawTreesFar);
  canvasTex(scene, 'bg-trees-mid', W, H, drawTreesMid);
  canvasTex(scene, 'bg-trees-near', W, H, drawTreesNear);
  canvasTex(scene, 'bg-ground', W, H, drawGround);
  canvasTex(scene, 'bg', W, H, (ctx) => drawBackground(scene, ctx));
  canvasTex(scene, 'sky-dawn', W, H, drawDawnSky);
  canvasTex(scene, 'dawn-rays', W, H, drawDawnRays);

  // Pozos por tamaño (C4). Tiers: 0-1 anillo (stone0..3), 2-3 piedra trabajada, 4-5 adobe, 6-7 ceremonial.
  canvasTex(scene, 'hewn0', 56, 38, (ctx, w, h) => drawBlock(ctx, w, h, 28, 34, 0));
  canvasTex(scene, 'hewn1', 44, 30, (ctx, w, h) => drawBlock(ctx, w, h, 28, 38, 1));
  canvasTex(scene, 'adobe0', 56, 38, (ctx, w, h) => drawAdobe(ctx, w, h, 1));
  canvasTex(scene, 'adobe1', 44, 30, (ctx, w, h) => drawAdobe(ctx, w, h, 0));
  canvasTex(scene, 'ritual0', 56, 38, (ctx, w, h) => drawBlock(ctx, w, h, 220, 28, 2));
  canvasTex(scene, 'ritual1', 44, 30, (ctx, w, h) => drawBlock(ctx, w, h, 220, 32, 0));
  canvasTex(scene, 'wall-stone', 64, 64, (ctx, w, h) => drawWall(ctx, w, h, 'stone'));
  canvasTex(scene, 'wall-adobe', 64, 64, (ctx, w, h) => drawWall(ctx, w, h, 'adobe'));
  canvasTex(scene, 'wall-ritual', 64, 64, (ctx, w, h) => drawWall(ctx, w, h, 'ritual'));
  canvasTex(scene, 'post', 28, 150, drawPost);
  canvasTex(scene, 'rune-glow', 24, 24, drawRune);
  canvasTex(scene, 'pit-ghost', 128, 128, drawGhost);
  canvasTex(scene, 'bed-ring', 256, 48, drawBedRing);
  canvasTex(scene, 'pit-bed', 256, 40, drawBed);
  canvasTex(scene, 'load-mark', 20, 14, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(w / 2, h); ctx.lineTo(1, 1); ctx.lineTo(w - 1, 1);
    ctx.fill();
  });
  canvasTex(scene, 'shadow-soft', 64, 16, (ctx, w, h) => {
    ctx.save();
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.restore();
  });

  // Ranuras magnéticas (C4-C): blancas para teñir por tipo. Cápsula con tapas de 16 px (9-slice).
  const capsule = (ctx, w, h, inset, lineW) => {
    const r = h / 2 - inset;
    ctx.beginPath();
    ctx.moveTo(h / 2, inset); ctx.lineTo(w - h / 2, inset);
    ctx.arc(w - h / 2, h / 2, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(h / 2, h - inset);
    ctx.arc(h / 2, h / 2, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.lineWidth = lineW;
  };
  canvasTex(scene, 'slot-ghost', 128, 32, (ctx, w, h) => {
    capsule(ctx, w, h, 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
    // contorno oscuro fino por fuera (separa del fondo y de las piedras) + claro punteado
    ctx.strokeStyle = 'rgba(20,10,0,0.55)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.98)';
    ctx.stroke();
    ctx.setLineDash([]);
    // veta tenue para que lea como madera
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (const y of [h * 0.38, h * 0.62]) {
      ctx.beginPath(); ctx.moveTo(h * 0.7, y); ctx.lineTo(w - h * 0.7, y); ctx.stroke();
    }
  });
  canvasTex(scene, 'slot-ghost-hi', 128, 32, (ctx, w, h) => {
    const halo = ctx.createLinearGradient(0, 0, 0, h);
    halo.addColorStop(0, 'rgba(255,230,160,0.45)');
    halo.addColorStop(0.5, 'rgba(255,200,110,0.30)');
    halo.addColorStop(1, 'rgba(255,230,160,0.45)');
    capsule(ctx, w, h, 3, 3);
    ctx.fillStyle = halo;
    ctx.fill();
    ctx.shadowColor = 'rgba(255,190,90,0.95)';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#fff3d0';
    ctx.stroke();
    ctx.shadowBlur = 0;
    capsule(ctx, w, h, 5.5, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.stroke();
  });
  canvasTex(scene, 'slot-pin', 24, 24, (ctx, w, h) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.beginPath(); ctx.arc(c, c, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,0,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
  // Sombra de contacto para leña encajada: plana abajo, borde suave. Origen (0.5, 0.5).
  canvasTex(scene, 'shadow-contact', 128, 16, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createLinearGradient(0, 0, w, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)');
    m.addColorStop(0.1, 'rgba(0,0,0,1)');
    m.addColorStop(0.9, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });

  canvasTex(scene, 'bellows', 120, 56, (ctx) => {
    ctx.fillStyle = '#b08a3a';
    ctx.fillRect(0, 24, 30, 8);
    ctx.fillStyle = '#4a2f1d';
    ctx.beginPath();
    ctx.moveTo(30, 25); ctx.lineTo(110, 12); ctx.lineTo(110, 44); ctx.lineTo(30, 31);
    ctx.fill();
    ctx.strokeStyle = '#2a1a10';
    for (let x = 40; x < 110; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 24 - (x - 30) * 0.16);
      ctx.lineTo(x + 5, 28);
      ctx.lineTo(x, 32 + (x - 30) * 0.16);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a6440';
    ctx.beginPath();
    ctx.moveTo(28, 22); ctx.lineTo(118, 4); ctx.lineTo(118, 14); ctx.lineTo(28, 26);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(28, 34); ctx.lineTo(118, 42); ctx.lineTo(118, 52); ctx.lineTo(28, 30);
    ctx.fill();
  });
}
