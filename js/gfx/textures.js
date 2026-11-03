// Texturas generadas por código (no hay imágenes en assets todavía).

import { WOODS } from '../data/woods.js';
import { FLAMES } from '../data/flames.js';

export const W = 1280;
export const H = 720;
export const GROUND_Y = 590;

const rand = (a, b) => a + Math.random() * (b - a);

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.context, w, h);
  tex.refresh();
}

// Textura a media resolución para dibujos suaves (gradientes): se dibuja con las coordenadas de W×H y
// la escena la muestra con setScale(2). Ahorra 3/4 de la memoria de GPU.
function halfTex(scene, key, draw) {
  canvasTex(scene, key, W / 2, H / 2, (ctx, w, h) => { ctx.scale(0.5, 0.5); draw(ctx, W, H); });
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

// Polígono irregular (roca): n vértices sobre una elipse con ruido. Devuelve los puntos.
function rockPoints(w, h, n, jitter) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.12, 0.12);
    const k = 1 - rand(0, jitter);
    // Base más plana: aplasta la mitad inferior para que apoye.
    const sy = Math.sin(a) > 0.5 ? 0.88 : 1;
    pts.push([w / 2 + Math.cos(a) * (w / 2 - 2) * k, h / 2 + Math.sin(a) * (h / 2 - 2) * k * sy]);
  }
  return pts;
}

// Roca facetada: polígono con planos de luz distinta (arriba claro, flancos oscuros), hollín abajo y
// musgo apenas en el filo superior. Gris frío, sin pecas (antes parecía una bolita de algodón).
function drawStone(ctx, w, h, tone, seed = 0) {
  const pts = rockPoints(w, h, 9, 0.16);
  const path = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  ctx.save();
  path();
  ctx.clip();
  const cool = seed % 2 ? 222 : 28;
  const base = ctx.createLinearGradient(0, 0, w * 0.4, h);
  base.addColorStop(0, `hsl(${cool}, 6%, ${tone + 20}%)`);
  base.addColorStop(1, `hsl(${cool}, 8%, ${tone - 6}%)`);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // Planos: cuñas desde un punto de fuga interior hacia los vértices, alternando claro/oscuro.
  const cx = w * rand(0.4, 0.6), cy = h * rand(0.4, 0.55);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const mid = Math.atan2((p[1] + q[1]) / 2 - cy, (p[0] + q[0]) / 2 - cx);
    const lit = Math.cos(mid + 2.2); // luz desde arriba-izquierda
    ctx.fillStyle = lit > 0 ? `rgba(255,255,255,${0.1 * lit + 0.02})` : `rgba(0,0,0,${-0.28 * lit + 0.04})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    ctx.closePath();
    ctx.fill();
  }
  // Aristas entre planos y una fisura.
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const i of [1, 4, 6]) { ctx.moveTo(cx, cy); ctx.lineTo(pts[i][0], pts[i][1]); }
  ctx.stroke();
  // Grano fino.
  for (let i = 0; i < w * 0.9; i++) {
    ctx.globalAlpha = rand(0.04, 0.1);
    ctx.fillStyle = Math.random() < 0.5 ? '#000' : '#fff';
    ctx.fillRect(rand(0, w), rand(0, h), 1, 1);
  }
  ctx.globalAlpha = 1;
  // Hollín desde abajo (la piedra del fuego se ennegrece).
  const sg = ctx.createLinearGradient(0, h * 0.45, 0, h);
  sg.addColorStop(0, 'rgba(10,6,4,0)');
  sg.addColorStop(1, 'rgba(10,6,4,0.6)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);
  // Musgo: una mancha en el filo superior de algunas piedras.
  if (seed % 3 !== 1) {
    const mx = w * (seed % 2 ? 0.62 : 0.32);
    for (let i = 0; i < w * 0.4; i++) {
      ctx.globalAlpha = rand(0.35, 0.7);
      ctx.fillStyle = ['#34502f', '#41612f', '#2a4129'][i % 3];
      ctx.beginPath();
      ctx.arc(mx + rand(-w * 0.2, w * 0.2), h * 0.2 + rand(-3, 4) + Math.abs(rand(-w * 0.2, w * 0.2)) * 0.25, rand(0.8, 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Filo superior claro, contorno oscuro.
  path();
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pts[5][0], pts[5][1] + 1);
  for (const i of [6, 7, 8]) ctx.lineTo(pts[i][0], pts[i][1] + 1);
  ctx.stroke();
}

// ---- Fondo en capas ----
// 'bg-sky' (noche) es una textura de W×H; las capas de colinas, árboles y suelo son las "-lit" (más abajo)
// y se tiñen por hora. Los cielos de gradiente suave se generan a media resolución (ver halfTex).

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

// Cielo del amanecer: azul profundo arriba → rosa → naranja/oro en el horizonte (DAWN_HORIZON, a la altura de
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

// Bloque de piedra trabajada: sillar con bisel claro arriba, junta oscura y sombra abajo; esquinas
// despostilladas en vez de redondeadas. Tonos fríos/cálidos por `hue`.
function chamferPath(ctx, x, y, w, h, c) {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c * 0.6, y);
  ctx.lineTo(x + w, y + c * 0.8);
  ctx.lineTo(x + w - c * 0.3, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c * 0.7, y + h);
  ctx.lineTo(x, y + h - c * 0.6);
  ctx.lineTo(x + c * 0.3, y + c);
  ctx.closePath();
}

function drawBlock(ctx, w, h, hue, light, seed) {
  const c = Math.min(6, h * 0.2);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `hsl(${hue}, 7%, ${light + 12}%)`);
  g.addColorStop(0.5, `hsl(${hue}, 7%, ${light}%)`);
  g.addColorStop(1, `hsl(${hue}, 9%, ${light - 10}%)`);
  chamferPath(ctx, 1, 1, w - 2, h - 2, c);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Manchas anchas de tono (la piedra no es pareja) y grano fino.
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = rand(0.05, 0.12);
    ctx.fillStyle = i % 2 ? '#000' : '#fff';
    ctx.beginPath();
    ctx.ellipse(rand(0, w), rand(0, h), rand(w * 0.15, w * 0.35), rand(h * 0.12, h * 0.3), rand(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < w * 0.9; i++) {
    ctx.globalAlpha = rand(0.04, 0.12);
    ctx.fillStyle = Math.random() < 0.5 ? '#000' : '#fff';
    ctx.fillRect(rand(0, w), rand(0, h), 1, 1);
  }
  // Fisura.
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  const fx = w * (0.3 + 0.12 * seed);
  ctx.moveTo(fx, 1); ctx.lineTo(fx + rand(-3, 3), h * 0.45); ctx.lineTo(fx + rand(-4, 4), h * 0.6);
  ctx.stroke();
  // Hollín y sombra de la junta inferior.
  ctx.globalAlpha = 1;
  const sg = ctx.createLinearGradient(0, h * 0.6, 0, h);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
  // Bisel superior.
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(0, 1, w, 2);
  ctx.restore();
  chamferPath(ctx, 1, 1, w - 2, h - 2, c);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// Adobe: pan de barro apagado (ocre-tostado, no naranja), con manchas de enlucido, briznas de paja,
// grietas y hollín que sube desde abajo.
function drawAdobe(ctx, w, h, seed) {
  const c = Math.min(7, h * 0.22);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#a58468');
  g.addColorStop(0.55, '#85634d');
  g.addColorStop(1, '#5a4033');
  chamferPath(ctx, 1, 1, w - 2, h - 2, c);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = rand(0.08, 0.16);
    ctx.fillStyle = ['#d8bc9a', '#3a2418', '#c09a76'][i % 3];
    ctx.beginPath();
    ctx.ellipse(rand(0, w), rand(0, h), rand(w * 0.12, w * 0.3), rand(h * 0.1, h * 0.28), rand(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // Paja.
  ctx.lineWidth = 0.8;
  for (let i = 0; i < w * 0.5; i++) {
    ctx.globalAlpha = rand(0.2, 0.5);
    ctx.strokeStyle = ['#d8c08a', '#8a6a3a'][i % 2];
    const x = rand(0, w), y = rand(0, h), a = rand(-0.6, 0.6);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * rand(3, 7), y + Math.sin(a) * rand(3, 7)); ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 0.9;
  for (let k = 0; k < 2 + seed; k++) {
    ctx.beginPath();
    let x = rand(w * 0.2, w * 0.8), y = 2;
    ctx.moveTo(x, y);
    while (y < h - 2) { x += rand(-4, 4); y += rand(4, 8); ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // Hollín desde abajo y luz en el borde superior.
  ctx.globalAlpha = 1;
  const sh = ctx.createLinearGradient(0, h * 0.4, 0, h);
  sh.addColorStop(0, 'rgba(20,12,8,0)');
  sh.addColorStop(1, 'rgba(20,12,8,0.55)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, h * 0.4, w, h * 0.6);
  ctx.fillStyle = 'rgba(255,235,200,0.22)';
  ctx.fillRect(0, 1, w, 2);
  ctx.restore();
  chamferPath(ctx, 1, 1, w - 2, h - 2, c);
  ctx.strokeStyle = 'rgba(25,14,8,0.7)';
  ctx.lineWidth = 1.2;
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
      else drawBlock(ctx, bw, bh, 28, 36, (r + c + 4) % 3);
      ctx.restore();
    }
  }
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

// ---- Ciclo 5: llama, luz, leña prendida, techo, fondo iluminable ----

// Lengua de llama: gota con punta curva. (cx, baseY) es el centro de la base; hw el semiancho, ht el alto.
// `lean` desplaza la punta (y curva el flanco), `curl` la dobla hacia el otro lado en el último tramo.
function tonguePath(ctx, cx, baseY, hw, ht, lean = 0, curl = 0) {
  const tx = cx + lean, ty = baseY - ht;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.bezierCurveTo(cx + hw * 0.25 + lean * 0.55 + curl, baseY - ht * 0.62, cx + hw * 1.2, baseY - ht * 0.28, cx + hw * 0.72, baseY - hw * 0.2);
  ctx.bezierCurveTo(cx + hw * 0.4, baseY + hw * 0.22, cx - hw * 0.4, baseY + hw * 0.22, cx - hw * 0.72, baseY - hw * 0.2);
  ctx.bezierCurveTo(cx - hw * 1.2, baseY - ht * 0.28, cx - hw * 0.3 + lean * 0.35 + curl * 0.4, baseY - ht * 0.66, tx, ty);
  ctx.closePath();
}

// Llama blanca (se tiñe con el emisor): cuerpo con degradé, núcleo claro más angosto y borde suave.
function drawFlameTongue(ctx, w, h, lean, curl) {
  const cx = w / 2, baseY = h - w * 0.28, hw = w * 0.3, ht = h * 0.9;
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = Math.max(3, w * 0.07);
  const body = ctx.createLinearGradient(0, baseY - ht, 0, baseY + hw * 0.2);
  body.addColorStop(0, 'rgba(255,255,255,0.05)');
  body.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  body.addColorStop(1, 'rgba(255,255,255,0.85)');
  ctx.fillStyle = body;
  tonguePath(ctx, cx, baseY, hw, ht, lean, curl);
  ctx.fill();
  ctx.shadowBlur = 0;
  const core = ctx.createLinearGradient(0, baseY - ht * 0.6, 0, baseY + hw * 0.2);
  core.addColorStop(0, 'rgba(255,255,255,0)');
  core.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  core.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = core;
  tonguePath(ctx, cx, baseY, hw * 0.5, ht * 0.62, lean * 0.4, curl * 0.4);
  ctx.fill();
}

// Llama base persistente (colores horneados, para mezcla ADD): varias lenguas superpuestas.
function drawFlameBase(ctx, w, h, flame) {
  const cx = w / 2, baseY = h - 14;
  const shapes = [
    // hw, ht, lean, curl
    [w * 0.34, h * 0.9, w * 0.07, w * 0.08],
    [w * 0.27, h * 0.74, -w * 0.1, -w * 0.06],
    [w * 0.19, h * 0.52, w * 0.04, w * 0.03],
    [w * 0.1, h * 0.3, 0, 0],
  ];
  ctx.shadowColor = flame.shadow;
  ctx.shadowBlur = 8;
  for (let i = 0; i < shapes.length; i++) {
    const [hw, ht, lean, curl] = shapes[i];
    const cols = flame.tongues[i]; // [pie, medio, punta]
    const g = ctx.createLinearGradient(0, baseY - ht, 0, baseY + hw * 0.2);
    g.addColorStop(0, cols[2]);
    g.addColorStop(0.45, cols[1]);
    g.addColorStop(1, cols[0]);
    ctx.fillStyle = g;
    tonguePath(ctx, cx, baseY, hw, ht, lean, curl);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

// Elipse de luz blanca (suelo y piedras). Falloff cuadrático: centro fuerte, borde que muere.
function drawGlowGround(ctx, w, h) {
  ctx.save();
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.62)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.04)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w);
  ctx.restore();
}

// Máscara cápsula de una leña (para recortar overlays de leña prendida).
function logCapsule(ctx, w, h) {
  const r = h * 0.45;
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r);
}

// Brillo de leña prendida: solo cara inferior y extremos (blanco, aditivo/teñible). 128×32.
function drawLogGlowUnder(ctx, w, h) {
  ctx.save();
  logCapsule(ctx, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (const x of [0, w]) {
    const e = ctx.createRadialGradient(x, h / 2, 1, x, h / 2, h * 0.75);
    e.addColorStop(0, 'rgba(255,255,255,0.75)');
    e.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = e;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// Grietas incandescentes (blancas, se tiñen de naranja y pulsan). 128×32.
function drawLogCracks(ctx, w, h) {
  ctx.save();
  logCapsule(ctx, w, h);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 4;
  for (let i = 0; i < 9; i++) {
    let x = rand(8, w - 8), y = rand(h * 0.25, h * 0.8);
    ctx.strokeStyle = `rgba(255,255,255,${rand(0.55, 1)})`;
    ctx.lineWidth = rand(0.9, 1.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += rand(5, 14) * (Math.random() < 0.8 ? 1 : -1);
      y += rand(-4, 4);
      ctx.lineTo(x, Math.max(3, Math.min(h - 3, y)));
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Leña carbonizada: placas oscuras con grietas por las que se ve el rescoldo. `heavy` 0..1. 128×32.
function drawLogChar(ctx, w, h, heavy) {
  ctx.save();
  logCapsule(ctx, w, h);
  ctx.clip();
  ctx.fillStyle = `rgba(10,6,4,${heavy * 0.55})`;
  ctx.fillRect(0, 0, w, h);
  const n = Math.round(w * (0.5 + heavy * 0.7));
  for (let i = 0; i < n; i++) {
    const x = rand(-4, w), y = rand(-2, h);
    ctx.globalAlpha = rand(0.35, 0.85) * (0.5 + heavy * 0.5);
    ctx.fillStyle = ['#0c0807', '#15100d', '#07050a', '#1d1511'][i % 4];
    roundRectPath(ctx, x, y, rand(5, 14), rand(3.5, 7), 1.5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Borde ennegrecido y sombra superior (el fuego cuece de abajo hacia arriba).
  const s = ctx.createLinearGradient(0, 0, 0, h);
  s.addColorStop(0, `rgba(5,3,2,${0.25 + heavy * 0.35})`);
  s.addColorStop(0.55, 'rgba(5,3,2,0)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.strokeStyle = `rgba(8,5,3,${0.4 + heavy * 0.4})`;
  ctx.lineWidth = 1.5;
  logCapsule(ctx, w, h);
  ctx.stroke();
}

// Marcador de carga: placa con punta hacia abajo (blanca, se tiñe naranja→rojo). 14×18.
function drawLoadNotch(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(1.5, 1.5);
  ctx.lineTo(w - 1.5, 1.5);
  ctx.lineTo(w - 1.5, h * 0.62);
  ctx.lineTo(w / 2, h - 1.5);
  ctx.lineTo(1.5, h * 0.62);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fff');
  g.addColorStop(1, '#c8c8c8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,5,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20,10,5,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, 4); ctx.lineTo(w / 2, h * 0.55);
  ctx.stroke();
}

// Techo de tablas (tileable en horizontal). 128×18.
function drawRoofPlank(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#6e4c30');
  g.addColorStop(0.5, '#573a24');
  g.addColorStop(1, '#2e1d11');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,220,170,0.2)';
  ctx.fillRect(0, 0, w, 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (let y = 5; y < h - 3; y += 5) {
    ctx.beginPath();
    ctx.moveTo(0, y + rand(-1, 1));
    for (let x = 16; x <= w; x += 16) ctx.lineTo(x, y + rand(-1.2, 1.2));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(15,8,4,0.75)';
  for (const x of [10, 64, 118]) {
    ctx.beginPath(); ctx.arc(x, h * 0.5, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, h - 2, w, 2);
}

// Techo de paja (tileable en horizontal), con flecos abajo. 128×36.
function drawRoofThatch(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#8a6a36');
  g.addColorStop(1, '#5c4424');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h - 8);
  for (let i = 0; i < 240; i++) {
    const x = rand(0, w), y = rand(0, h - 6);
    ctx.strokeStyle = ['#b59248', '#6e5128', '#3f2e17', '#9c7c3c'][i % 4];
    ctx.globalAlpha = rand(0.35, 0.8);
    ctx.lineWidth = rand(0.8, 1.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-1.5, 1.5), y + rand(5, 10));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Flecos: briznas que cuelgan del borde.
  for (let x = 0; x < w; x += 3) {
    ctx.strokeStyle = ['#7a5c2e', '#5a4220', '#96763a'][((x / 3) | 0) % 3];
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, h - 14);
    ctx.lineTo(x + rand(-1, 1), h - rand(1, 7));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, w, 3);
}

// Puntal fino del techo (tileable en vertical). 10×64.
function drawRoofSupport(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#24160d');
  g.addColorStop(0.4, '#6a4a30');
  g.addColorStop(1, '#1a0f08');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  for (let y = 6; y < h; y += 11) {
    ctx.beginPath(); ctx.moveTo(1, y); ctx.lineTo(w - 1, y + rand(-1.5, 1.5)); ctx.stroke();
  }
}

// ---- Ciclo de luz ----
// Cielos completos W×H. Las capas "-lit" están pintadas en colores de día y se llevan a cada hora con
// setTint (ver layerTint): la leña, las piedras y el fuego no cambian.

function stars(ctx, count, maxY, aMul = 1) {
  const tints = ['#ffffff', '#dfe8ff', '#ffe9c8', '#cfd8ff'];
  for (let i = 0; i < count; i++) {
    const y = rand(0, maxY);
    ctx.globalAlpha = rand(0.15, 0.9) * Math.max(0.3, 1 - y / (maxY * 1.1)) * aMul;
    ctx.fillStyle = tints[(Math.random() * tints.length) | 0];
    const s = Math.random() < 0.08 ? 2 : 1;
    ctx.fillRect(rand(0, W), y, s, s);
  }
  ctx.globalAlpha = 1;
}

function sunGlow(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function cloudBand(ctx, y, count, color, aMin, aMax) {
  for (let i = 0; i < count; i++) {
    const x = rand(-100, W + 100), cy = y + rand(-30, 30), rx = rand(70, 190), ry = rand(10, 24);
    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(${color},${rand(aMin, aMax)})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
}

function drawSkyDay(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#3f82c8');
  sky.addColorStop(0.5, '#86bde6');
  sky.addColorStop(0.85, '#cfe6ee');
  sky.addColorStop(1, '#f4e6c2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  sunGlow(ctx, 300, 150, 340, 'rgba(255,247,215,0.75)', 'rgba(255,240,200,0)');
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath(); ctx.arc(300, 150, 30, 0, Math.PI * 2); ctx.fill();
  cloudBand(ctx, 120, 10, '255,255,255', 0.25, 0.5);
  cloudBand(ctx, 230, 9, '255,255,255', 0.2, 0.42);
  cloudBand(ctx, 360, 6, '255,245,230', 0.15, 0.3);
}

// Atardecer: violeta arriba, magenta, naranja bajo; el sol medio hundido tras las colinas.
function drawSkyDusk(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#1d1b46');
  sky.addColorStop(0.35, '#4a2f6a');
  sky.addColorStop(0.62, '#a04a72');
  sky.addColorStop(0.82, '#e0703c');
  sky.addColorStop(1, '#f7b45a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  stars(ctx, 90, GROUND_Y * 0.4, 0.6);
  sunGlow(ctx, 330, GROUND_Y - 105, 420, 'rgba(255,200,110,0.8)', 'rgba(255,130,60,0)');
  ctx.fillStyle = '#ffe2a0';
  ctx.beginPath(); ctx.arc(330, GROUND_Y - 100, 34, 0, Math.PI * 2); ctx.fill();
  cloudBand(ctx, 300, 9, '255,150,120', 0.2, 0.45);
  cloudBand(ctx, 420, 8, '255,190,120', 0.2, 0.4);
  cloudBand(ctx, 200, 6, '170,110,200', 0.15, 0.3);
}

// Noche profunda: más oscura que `bg-sky`, estrellas más densas y luna más fría.
function drawSkyDeep(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#010204');
  sky.addColorStop(0.5, '#04060c');
  sky.addColorStop(0.85, '#0a0912');
  sky.addColorStop(1, '#120d12');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  stars(ctx, 520, GROUND_Y * 0.7);
  for (let i = 0; i < 12; i++) {
    const x = rand(0, w), y = rand(10, GROUND_Y * 0.5);
    sunGlow(ctx, x, y, 8, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  }
  const mx = 1080, my = 110;
  sunGlow(ctx, mx, my, 150, 'rgba(190,205,255,0.22)', 'rgba(160,175,230,0)');
  ctx.fillStyle = '#d8dcea';
  ctx.beginPath(); ctx.arc(mx, my, 24, 0, Math.PI * 2); ctx.fill();
}

const LIT = {
  hills: { ridge: ['#b6d2c2', '#9cbfab'] },
  far: '#78a898',
  mid: '#427f60',
  near: '#1f4a30',
  ground: ['#7a6a48', '#5a4c34', '#3a3020'],
};

function ridgeFill(ctx, w, base, amp, f1, f2, ph, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, base - Math.sin(x * f1 + ph) * amp - Math.sin(x * f2 + ph * 2) * amp * 0.4);
  ctx.lineTo(w, GROUND_Y);
  ctx.fill();
}

// Capas opacas: la perspectiva atmosférica va en el color (más claro y azulado a lo lejos), no en velos
// translúcidos, para que ninguna capa se vea a través de otra.
function drawHillsLit(ctx, w) {
  ridgeFill(ctx, w, GROUND_Y - 150, 40, 0.005, 0.016, 1.3, LIT.hills.ridge[0]);
  ridgeFill(ctx, w, GROUND_Y - 105, 32, 0.007, 0.02, 4.1, LIT.hills.ridge[1]);
}

// Pino con volumen, dibujado en un lienzo propio (la luz y la bruma de la base no tocan a los vecinos):
// lado izquierdo algo más claro, derecho más oscuro y base aclarada por la bruma. Siempre opaco.
function pineLit(ctx, x, base, height, color, haze) {
  const tw = Math.ceil(height * 0.7) + 8, th = Math.ceil(height * 1.3) + 22, by = th - 14;
  const c = document.createElement('canvas');
  c.width = tw; c.height = th;
  const t = c.getContext('2d');
  pine(t, tw / 2, by, height, color);
  t.globalCompositeOperation = 'source-atop';
  const g = t.createLinearGradient(tw / 2 - height * 0.15, 0, tw / 2 + height * 0.15, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.14)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.24)');
  t.fillStyle = g;
  t.fillRect(0, 0, tw, th);
  const hz = t.createLinearGradient(0, by - height * 0.5, 0, by + 8);
  hz.addColorStop(0, `rgba(${haze},0)`);
  hz.addColorStop(1, `rgba(${haze},0.32)`);
  t.fillStyle = hz;
  t.fillRect(0, 0, tw, th);
  ctx.drawImage(c, x - tw / 2, base - by);
}

function treeLayerLit(ctx, w, count, baseMin, baseMax, hMin, hMax, color, haze) {
  for (let i = 0; i < count; i++) pineLit(ctx, rand(0, w), GROUND_Y - rand(baseMin, baseMax), rand(hMin, hMax), color, haze);
}

// Una loma del color de la capa tapa los troncos de la base: no quedan troncos sueltos sobre el suelo.
function drawTreesFarLit(ctx, w) {
  treeLayerLit(ctx, w, 60, 50, 85, 90, 150, LIT.far, '200,225,215');
  ridgeFill(ctx, w, GROUND_Y - 92, 8, 0.011, 0.03, 2.2, LIT.far);
}
function drawTreesMidLit(ctx, w) {
  treeLayerLit(ctx, w, 42, 12, 42, 120, 200, LIT.mid, '170,205,185');
  ridgeFill(ctx, w, GROUND_Y - 48, 6, 0.013, 0.035, 0.7, LIT.mid);
}
function drawTreesNearLit(ctx, w) {
  treeLayerLit(ctx, w, 20, -2, 8, 170, 280, LIT.near, '120,170,140');
}

function drawGroundLit(ctx, w, h) {
  const ground = ctx.createLinearGradient(0, GROUND_Y, 0, h);
  ground.addColorStop(0, LIT.ground[0]);
  ground.addColorStop(0.25, LIT.ground[1]);
  ground.addColorStop(1, LIT.ground[2]);
  ctx.fillStyle = ground;
  ctx.fillRect(0, GROUND_Y - 2, w, h - GROUND_Y + 2);
  fog(ctx, GROUND_Y - 30, GROUND_Y + 2, w, '150,170,130', 0, 0.35);
  for (let i = 0; i < 700; i++) {
    ctx.globalAlpha = rand(0.1, 0.35);
    ctx.fillStyle = Math.random() < 0.5 ? '#a8946a' : '#2a2014';
    ctx.fillRect(rand(0, w), rand(GROUND_Y, h), rand(1, 4), rand(1, 2));
  }
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = rand(0.3, 0.6);
    ctx.fillStyle = ['#8a5a26', '#a8702f', '#6a4620'][i % 3];
    ctx.save();
    ctx.translate(rand(0, w), rand(GROUND_Y + 4, h));
    ctx.rotate(rand(0, Math.PI));
    ctx.beginPath();
    ctx.ellipse(0, 0, rand(2, 4), rand(0.8, 1.5), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 320; i++) {
    const x = rand(0, w);
    const y = GROUND_Y + rand(-1, h - GROUND_Y) * Math.random();
    const near = (y - GROUND_Y) / (h - GROUND_Y);
    ctx.strokeStyle = ['#4a6a2a', '#5e7e34', '#7c9640', '#3a5422'][i % 4];
    ctx.globalAlpha = rand(0.55, 0.95);
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

// Color con el que se ve cada capa "-lit" en cada hora (el mismo que tenían las capas de noche originales).
// layerTint(capa, fase) devuelve el entero para setTint; capa: hills|far|mid|near|ground;
// fase: day|dusk|dawn|night|deep. Cada canal del destino es ≤ al de la base, por eso se puede con tint.
const LIT_BASE = { hills: LIT.hills.ridge[1], far: LIT.far, mid: LIT.mid, near: LIT.near, ground: LIT.ground[1] };
const LIT_TARGET = {
  day: { hills: LIT.hills.ridge[1], far: LIT.far, mid: LIT.mid, near: LIT.near, ground: LIT.ground[1] },
  dusk: { hills: '#5a3c58', far: '#3e2c4a', mid: '#2a1c34', near: '#140c1a', ground: '#4a2e22' },
  dawn: { hills: '#6a5062', far: '#4a3a52', mid: '#32283e', near: '#1a1424', ground: '#4e3a2c' },
  night: { hills: '#1d1a2e', far: '#17131f', mid: '#0e0b15', near: '#07050a', ground: '#241810' },
  deep: { hills: '#100e1a', far: '#0c0a12', mid: '#07060b', near: '#030203', ground: '#120b08' },
};
export function layerTint(layer, phase) {
  const b = hexRgb(LIT_BASE[layer]);
  const t = hexRgb((LIT_TARGET[phase] || LIT_TARGET.night)[layer]);
  const c = b.map((v, i) => Math.max(0, Math.min(255, Math.round((t[i] / v) * 255))));
  return (c[0] << 16) | (c[1] << 8) | c[2];
}
export const SKY_KEYS = { day: 'sky-day', dusk: 'sky-dusk', dawn: 'sky-dawn', night: 'bg-sky', deep: 'sky-deep' };

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
  // Chispa coleccionable: destello de 4 puntas con núcleo caliente y un halo mínimo (antes era una bola con halo).
  canvasTex(scene, 'orb', 40, 40, (ctx, w, h) => {
    const c = w / 2;
    const halo = ctx.createRadialGradient(c, c, 0, c, c, c * 0.55);
    halo.addColorStop(0, 'rgba(255,170,60,0.55)');
    halo.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,215,110,0.95)';
    ctx.beginPath();
    ctx.moveTo(c, 1); ctx.quadraticCurveTo(c + 2.5, c - 2.5, w - 1, c);
    ctx.quadraticCurveTo(c + 2.5, c + 2.5, c, h - 1);
    ctx.quadraticCurveTo(c - 2.5, c + 2.5, 1, c);
    ctx.quadraticCurveTo(c - 2.5, c - 2.5, c, 1);
    ctx.fill();
    const core = ctx.createRadialGradient(c, c, 0, c, c, 6);
    core.addColorStop(0, 'rgba(255,255,240,1)');
    core.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = core;
    ctx.fillRect(c - 7, c - 7, 14, 14);
  });

  canvasTex(scene, 'drop', 2, 16, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(180,200,230,0)');
    g.addColorStop(1, 'rgba(200,220,255,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  halfTex(scene, 'vignette', (ctx, w, h) => {
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
  halfTex(scene, 'sky-dawn', drawDawnSky);
  halfTex(scene, 'dawn-rays', drawDawnRays);

  // Materiales de los pozos; lo demás de cada escalón está en gfx/hearths.js.
  canvasTex(scene, 'hewn0', 56, 38, (ctx, w, h) => drawBlock(ctx, w, h, 28, 34, 0));
  canvasTex(scene, 'hewn1', 44, 30, (ctx, w, h) => drawBlock(ctx, w, h, 28, 38, 1));
  canvasTex(scene, 'adobe0', 56, 38, (ctx, w, h) => drawAdobe(ctx, w, h, 1));
  canvasTex(scene, 'adobe1', 44, 30, (ctx, w, h) => drawAdobe(ctx, w, h, 0));
  canvasTex(scene, 'wall-stone', 64, 64, (ctx, w, h) => drawWall(ctx, w, h, 'stone'));
  canvasTex(scene, 'wall-adobe', 64, 64, (ctx, w, h) => drawWall(ctx, w, h, 'adobe'));
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

  // ---- Ciclo 5 ----
  // Llama (blancas, para teñir con el emisor): variantes de gota afilada con punta curva.
  canvasTex(scene, 'flame-a', 48, 120, (ctx, w, h) => drawFlameTongue(ctx, w, h, 0, 0));
  canvasTex(scene, 'flame-b', 48, 120, (ctx, w, h) => drawFlameTongue(ctx, w, h, 7, 6));
  canvasTex(scene, 'flame-c', 48, 120, (ctx, w, h) => drawFlameTongue(ctx, w, h, -7, -6));
  canvasTex(scene, 'flame-lick', 24, 60, (ctx, w, h) => drawFlameTongue(ctx, w, h, 3, 3));
  canvasTex(scene, 'flame-core', 32, 56, (ctx, w, h) => drawFlameTongue(ctx, w, h, 0, 0));
  for (const flame of Object.values(FLAMES)) canvasTex(scene, flame.baseKey, 160, 220, (ctx, w, h) => drawFlameBase(ctx, w, h, flame));
  // Luz
  canvasTex(scene, 'glow-ground', 512, 128, drawGlowGround);
  // Leña prendida / carbonizada (128×32, escalar a largo×grosor de la leña)
  canvasTex(scene, 'log-glow-under', 128, 32, drawLogGlowUnder);
  canvasTex(scene, 'log-cracks', 128, 32, drawLogCracks);
  canvasTex(scene, 'log-char0', 128, 32, (ctx, w, h) => drawLogChar(ctx, w, h, 0.35));
  canvasTex(scene, 'log-char1', 128, 32, (ctx, w, h) => drawLogChar(ctx, w, h, 1));
  // Pozo
  canvasTex(scene, 'load-notch', 14, 18, drawLoadNotch);
  canvasTex(scene, 'roof-plank', 128, 18, drawRoofPlank);
  canvasTex(scene, 'roof-thatch', 128, 36, drawRoofThatch);
  canvasTex(scene, 'roof-support', 10, 64, drawRoofSupport);
  // Ciclo de luz
  halfTex(scene, 'sky-day', drawSkyDay);
  halfTex(scene, 'sky-dusk', drawSkyDusk);
  canvasTex(scene, 'sky-deep', W, H, drawSkyDeep);
  canvasTex(scene, 'bg-hills-lit', W, H, drawHillsLit);
  canvasTex(scene, 'bg-trees-far-lit', W, H, drawTreesFarLit);
  canvasTex(scene, 'bg-trees-mid-lit', W, H, drawTreesMidLit);
  canvasTex(scene, 'bg-trees-near-lit', W, H, drawTreesNearLit);
  canvasTex(scene, 'bg-ground-lit', W, H, drawGroundLit);

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
