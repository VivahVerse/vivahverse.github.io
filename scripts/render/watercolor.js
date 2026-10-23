// Procedural watercolour painting engine for the "viral reel" story invitations.
// Everything here is original artwork generated in code: layered, deformed translucent
// washes (the classic digital-watercolour technique), paper fibres, pigment granulation,
// darker drying edges, and painted figures seen from behind.
import { rng } from './motifs.js';

export const hexA = (hex, a) => {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const mix = (a, b, t) => {
  const p = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const gauss = R => (R() + R() + R() + R() - 2) / 2;

// ---------------- primitives ----------------
let noiseTile = null;
function noise() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), d = x.createImageData(256, 256), R = rng('noise');
  for (let i = 0; i < d.data.length; i += 4) {
    const v = R(), k = R() < 0.5 ? 0 : 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = k; d.data[i + 3] = v < 0.6 ? 0 : (v - 0.6) * 120;
  }
  x.putImageData(d, 0, 0); noiseTile = c; return c;
}
/** Pigment granulation inside the current clip / over a rect. */
export function granulate(ctx, x, y, w, h, alpha = 0.35) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = ctx.createPattern(noise(), 'repeat'); ctx.fillRect(x, y, w, h); ctx.restore();
}

function deform(pts, depth, v, R) {
  let p = pts;
  for (let d = 0; d < depth; d++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push(a);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      out.push([(a[0] + b[0]) / 2 + gauss(R) * len * v, (a[1] + b[1]) / 2 + gauss(R) * len * v]);
    }
    p = out;
  }
  return p;
}
const poly = (ctx, p) => { ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

/** Soft watercolour blob from a rough polygon: many translucent deformed layers + a drying edge. */
let tmp = null;
export function blob(ctx, pts, color, { layers = 18, alpha = 0.06, spread = 0.12, seed = 'b', edge = 0.12, blur = 0 } = {}) {
  const R = rng('blob' + seed + pts.length + Math.round(pts[0][0]));
  const base = deform(pts, 2, spread, R);
  const shapes = [...Array(layers)].map(() => deform(base, 3, spread * 1.1, R));
  // bounding box
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  shapes.forEach(sh => sh.forEach(([x, y]) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }));
  const m = blur * 3 + 2;
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m); x1 = Math.ceil(x1 + m); y1 = Math.ceil(y1 + m);
  const w = Math.max(1, Math.min(x1 - x0, 6000)), h = Math.max(1, Math.min(y1 - y0, 6000));
  // paint the layers on a scratch canvas at a healthy opacity (avoids 8-bit banding), then composite faintly
  if (!tmp) tmp = document.createElement('canvas');
  if (tmp.width < w) tmp.width = w; if (tmp.height < h) tmp.height = h;
  const t = tmp.getContext('2d');
  t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, w, h);
  const a2 = 0.12;
  t.fillStyle = hexA(color, a2); t.translate(-x0, -y0);
  shapes.forEach(sh => { poly(t, sh); t.fill(); });
  t.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha / a2);
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(tmp, 0, 0, w, h, x0, y0, w, h);
  ctx.restore();
  if (edge) { ctx.save(); ctx.strokeStyle = hexA(color, edge); ctx.lineWidth = Math.max(1, ctx.canvas.width / 900); poly(ctx, base); ctx.stroke(); ctx.restore(); }
}
export const ellipsePts = (cx, cy, rx, ry, n = 10, rot = 0) => [...Array(n)].map((_, i) => {
  const a = (i / n) * Math.PI * 2;
  const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
  return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
});
export const rectPts = (x, y, w, h) => [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]];

/**
 * Paint a crisp shape (Path2D) like watercolour: translucent body, inner light/shade blooms,
 * granulation and a darker, slightly broken drying edge.
 */
export function paint(ctx, path, color, { light = 0.22, shade = 0.28, edge = 0.45, grain = 0.25, lw = 1, seed = 'p', box = null, alpha = 0.92 } = {}) {
  const R = rng('paint' + seed);
  const W = ctx.canvas.width;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.fill(path);
  ctx.clip(path);
  const b = box || [0, 0, W, ctx.canvas.height];
  const [bx, by, bw, bh] = b;
  // blooms
  for (let i = 0; i < 6; i++) {
    const x = bx + R() * bw, y = by + R() * bh, r = Math.max(bw, bh) * (0.25 + R() * 0.4);
    const dark = i % 2 === 0;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, dark ? `rgba(30,15,10,${shade * 0.6})` : `rgba(255,250,240,${light * 0.8})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(bx - r, by - r, bw + 2 * r, bh + 2 * r);
  }
  // shade on lower/right side for volume
  const g2 = ctx.createLinearGradient(bx, by, bx + bw * 0.4, by + bh);
  g2.addColorStop(0, `rgba(255,248,235,${light * 0.5})`); g2.addColorStop(1, `rgba(20,10,5,${shade * 0.5})`);
  ctx.fillStyle = g2; ctx.fillRect(bx, by, bw, bh);
  // pigment pooling at the drying edge (blurred inner rim) — the key watercolour cue
  const rim = mix(color.length === 7 ? color : '#777777', '#2a1408', 0.35);
  ctx.filter = `blur(${Math.max(1, W / 260)}px)`;
  ctx.strokeStyle = hexA(rim, 0.38 * (edge ? 1 : 0.4)); ctx.lineWidth = Math.max(2, Math.min(bw, bh) * 0.12, W / 140);
  ctx.stroke(path);
  ctx.filter = 'none';
  // lighter back-runs
  for (let i = 0; i < 3; i++) {
    const x = bx + R() * bw, y = by + R() * bh, r = Math.min(bw, bh) * (0.12 + R() * 0.2);
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, `rgba(255,250,240,${light * 0.5})`); g.addColorStop(0.85, `rgba(255,250,240,${light * 0.2})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  if (grain) granulate(ctx, bx, by, bw, bh, grain * 1.4);
  ctx.restore();
  if (edge) {
    ctx.save();
    ctx.strokeStyle = mix(color.length === 7 ? color : '#555555', '#1a0f08', 0.45);
    ctx.globalAlpha = edge * 0.7; ctx.lineWidth = Math.max(0.7, W / 1300) * lw; ctx.lineJoin = 'round';
    ctx.setLineDash([W / 30, W / 300, W / 70, W / 400]); ctx.stroke(path);
    ctx.restore();
  }
}
const P = (fn) => { const p = new Path2D(); fn(p); return p; };

/** Fine painted strands/strokes (hair, grass, fibres). */
function strands(ctx, list, color, w, alpha) {
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineWidth = w;
  list.forEach(s => { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]); ctx.stroke(); });
  ctx.restore();
}

// ---------------- paper & sky ----------------
export function paper(ctx, W, H, { base = '#F8F0E2', tints = ['#EBD6B6', '#F3DCC4', '#E9CFA8'], seed = 'paper', strength = 1 } = {}) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const R = rng('pp' + seed);
  for (let i = 0; i < 9; i++) {
    const cx = R() * W, cy = R() * H, r = W * (0.25 + R() * 0.45);
    blob(ctx, ellipsePts(cx, cy, r, r * (0.6 + R() * 0.6), 9, R() * 3), tints[i % tints.length], { alpha: 0.03 * strength, layers: 10, spread: 0.18, seed: seed + i, edge: 0, blur: W / 80 });
  }
  // fibres
  ctx.save(); ctx.strokeStyle = 'rgba(120,90,50,.05)'; ctx.lineWidth = Math.max(1, W / 1400);
  for (let i = 0; i < 260; i++) { const x = R() * W, y = R() * H, l = W * (0.01 + R() * 0.03), a = R() * 6.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l * 0.6, y + l * 0.3 * Math.sin(a), x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
  ctx.restore();
  granulate(ctx, 0, 0, W, H, 0.22);
}

/** Wet-in-wet sky: vertical blend of washes plus cloud blooms. */
export function sky(ctx, W, H, y1, { top = '#AFC7D8', mid = '#F3E3CC', glow = '#F6D7A8', seed = 'sky', clouds = 6, cloud = '#FFFFFF', intensity = 1 } = {}) {
  const R = rng('sky' + seed);
  const bl = W / 60;
  const g0 = ctx.createLinearGradient(0, 0, 0, y1);
  g0.addColorStop(0, hexA(top, 0.75 * intensity)); g0.addColorStop(0.55, hexA(mix(top, mid, 0.6), 0.5 * intensity)); g0.addColorStop(1, hexA(mid, 0.25));
  ctx.fillStyle = g0; ctx.fillRect(0, 0, W, y1);
  for (let i = 0; i < 14; i++) {
    const cx = R() * W, cy = R() * y1 * 0.8, r = W * (0.15 + R() * 0.3);
    blob(ctx, ellipsePts(cx, cy, r, r * (0.4 + R() * 0.5), 9, R() * 3), i % 4 ? top : mix(top, '#FFFFFF', 0.4), { alpha: 0.022 * intensity, layers: 10, spread: 0.2, seed: seed + 'b' + i, edge: 0, blur: bl * 0.7 });
  }
  if (glow) { const g = ctx.createRadialGradient(W * 0.6, y1 * 0.85, 0, W * 0.6, y1 * 0.85, W * 0.7); g.addColorStop(0, hexA(glow, 0.55)); g.addColorStop(1, hexA(glow, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, y1 * 1.1); }
  // a few crisper washes with drying edges give the sky its hand-painted character
  for (let i = 0; i < 4; i++) {
    const cx = R() * W, cy = R() * y1 * 0.7, r = W * (0.18 + R() * 0.2);
    blob(ctx, ellipsePts(cx, cy, r, r * 0.45, 9, R()), top, { alpha: 0.05 * intensity, layers: 8, spread: 0.18, seed: seed + 'h' + i, edge: 0.07 });
  }
  for (let i = 0; i < clouds; i++) {
    const cx = R() * W, cy = y1 * (0.12 + R() * 0.6), r = W * (0.12 + R() * 0.16);
    blob(ctx, ellipsePts(cx, cy, r, r * 0.32, 12), cloud, { alpha: 0.05, layers: 16, spread: 0.22, seed: seed + 'c' + i, edge: 0, blur: bl });
    blob(ctx, ellipsePts(cx + r * 0.2, cy - r * 0.08, r * 0.5, r * 0.22, 9), cloud, { alpha: 0.05, layers: 10, spread: 0.25, seed: seed + 'd' + i, edge: 0, blur: bl * 0.6 });
  }
  granulate(ctx, 0, 0, W, y1, 0.1 * intensity);
}

// ---------------- landscape ----------------
export function water(ctx, W, H, y0, y1, { color = '#7FA6C4', light = '#E8EEF0', seed = 'w' } = {}) {
  const R = rng('wt' + seed);
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, hexA(light, 0.9)); g.addColorStop(0.35, hexA(color, 0.55)); g.addColorStop(1, hexA(color, 0.8));
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
  for (let i = 0; i < 5; i++) blob(ctx, rectPts(-W * 0.1, y0 + (y1 - y0) * (i / 5), W * 1.2, (y1 - y0) / 5), color, { alpha: 0.05, layers: 8, spread: 0.06, seed: seed + i, edge: 0 });
  ctx.save(); ctx.strokeStyle = hexA('#FFFFFF', 0.5); ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const y = y0 + (y1 - y0) * Math.pow(R(), 1.4), x = R() * W, l = W * (0.02 + R() * 0.08) * (0.4 + (y - y0) / (y1 - y0));
    ctx.lineWidth = Math.max(1, W / 700) * (0.5 + (y - y0) / (y1 - y0)); ctx.globalAlpha = 0.25 + R() * 0.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y); ctx.stroke();
  }
  ctx.restore();
  granulate(ctx, 0, y0, W, y1 - y0, 0.2);
}

function templeShape(p, x, base, w, h) {
  p.moveTo(x - w / 2, base); p.lineTo(x - w / 2, base - h * 0.35);
  p.bezierCurveTo(x - w * 0.42, base - h * 0.72, x - w * 0.14, base - h * 0.9, x, base - h * 0.94);
  p.bezierCurveTo(x + w * 0.14, base - h * 0.9, x + w * 0.42, base - h * 0.72, x + w / 2, base - h * 0.35);
  p.lineTo(x + w / 2, base); p.closePath();
  p.rect(x - w * 0.012, base - h * 1.06, w * 0.024, h * 0.12);
}
function domeShape(p, x, base, w, h) {
  p.rect(x - w / 2, base - h * 0.5, w, h * 0.5);
  p.moveTo(x - w * 0.55, base - h * 0.5); p.lineTo(x + w * 0.55, base - h * 0.5); p.lineTo(x + w * 0.5, base - h * 0.56); p.lineTo(x - w * 0.5, base - h * 0.56); p.closePath();
  p.moveTo(x - w * 0.42, base - h * 0.56); p.bezierCurveTo(x - w * 0.42, base - h * 0.95, x + w * 0.42, base - h * 0.95, x + w * 0.42, base - h * 0.56); p.closePath();
  p.rect(x - w * 0.02, base - h * 1.05, w * 0.04, h * 0.14);
}

/** Distant skyline seen across the water: ghats of Kashi, Ayodhya palaces, Vrindavan temples, Rajput palace. */
export function skyline(ctx, W, H, base, kind, { color = '#C9A98A', far = '#D8C3AA', seed = 's', side = 'right', scale = 1 } = {}) {
  if (kind === 'none') return;
  const R = rng('sk' + kind + seed);
  const x0 = side === 'right' ? W * 0.35 : side === 'left' ? -W * 0.05 : -W * 0.05;
  const x1 = side === 'right' ? W * 1.05 : side === 'left' ? W * 0.65 : W * 1.05;
  const u = W / 100 * scale;
  // far row
  const far1 = P(p => {
    for (let x = x0; x < x1; x += u * (5 + R() * 6)) {
      const w = u * (5 + R() * 7), h = u * (4 + R() * 7);
      if (kind === 'vrindavan' || kind === 'ghats') { if (R() < 0.35) templeShape(p, x, base, w * 0.8, h * 2.2); else p.rect(x - w / 2, base - h, w, h); }
      else if (R() < 0.4) domeShape(p, x, base, w, h * 1.8); else p.rect(x - w / 2, base - h * 1.2, w, h * 1.2);
    }
  });
  paint(ctx, far1, far, { alpha: 0.55, edge: 0.15, grain: 0.2, seed: seed + 'f', box: [x0, base - u * 20, x1 - x0, u * 20] });
  // near row with windows & steps
  const near = P(p => {
    for (let x = x0 + u * 3; x < x1; x += u * (7 + R() * 7)) {
      const w = u * (6 + R() * 6), h = u * (5 + R() * 6);
      if (kind === 'ghats') { p.rect(x - w / 2, base - h, w, h); if (R() < 0.5) domeShape(p, x, base - h, w * 0.55, h * 0.9); if (R() < 0.3) templeShape(p, x + w * 0.3, base - h, w * 0.5, h * 1.3); }
      else if (kind === 'ayodhya') { p.rect(x - w / 2, base - h * 1.3, w, h * 1.3); domeShape(p, x, base - h * 1.3, w * 0.6, h); }
      else if (kind === 'vrindavan') { p.rect(x - w / 2, base - h * 0.8, w, h * 0.8); if (R() < 0.6) templeShape(p, x, base - h * 0.8, w * 0.7, h * 1.6); }
      else { p.rect(x - w / 2, base - h * 1.6, w, h * 1.6); domeShape(p, x - w * 0.3, base - h * 1.6, w * 0.32, h * 0.8); domeShape(p, x + w * 0.3, base - h * 1.6, w * 0.32, h * 0.8); }
    }
  });
  paint(ctx, near, color, { alpha: 0.75, edge: 0.3, grain: 0.3, seed: seed + 'n', box: [x0, base - u * 30, x1 - x0, u * 30] });
  // windows
  ctx.save(); ctx.fillStyle = hexA('#5a4030', 0.28);
  for (let i = 0; i < 60; i++) { const x = x0 + R() * (x1 - x0), y = base - u * (1 + R() * 6); ctx.fillRect(x, y, u * 0.5, u * 0.8); }
  ctx.restore();
  // steps / bank
  if (kind === 'ghats' || kind === 'ayodhya') {
    ctx.save(); ctx.strokeStyle = hexA('#8a6a50', 0.35); ctx.lineWidth = Math.max(1, u * 0.12);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0, base + u * 0.6 * i); ctx.lineTo(x1, base + u * 0.6 * i); ctx.stroke(); }
    ctx.restore();
  }
  // flags
  if (kind !== 'palace') {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const x = x0 + R() * (x1 - x0), y = base - u * (10 + R() * 6);
      ctx.strokeStyle = hexA('#5a4030', 0.6); ctx.lineWidth = Math.max(1, u * 0.12); ctx.beginPath(); ctx.moveTo(x, y + u * 4); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = hexA('#E07A3A', 0.75); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + u * 2.2, y + u * 0.7); ctx.lineTo(x, y + u * 1.4); ctx.fill();
    }
    ctx.restore();
  }
}

export function mountainsWC(ctx, W, H, base, { color = '#6F93B6', snow = '#F4F7FA', seed = 'm', height = 0.25 } = {}) {
  const R = rng('mw' + seed);
  [[0.75, 0.6, mix(color, '#FFFFFF', 0.45)], [1, 1, color]].forEach(([hk, a, c], layer) => {
    const pts = [[-W * 0.1, base]];
    const n = 5 + layer * 2;
    for (let i = 0; i <= n; i++) {
      const x = -W * 0.1 + (i / n) * W * 1.2;
      const peak = i % 2 === 1;
      pts.push([x, base - H * height * hk * (peak ? 0.6 + R() * 0.4 : 0.2 + R() * 0.25)]);
    }
    pts.push([W * 1.1, base]);
    const path = P(p => { pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); });
    paint(ctx, path, c, { alpha: 0.85 * a, light: 0.35, shade: 0.25, edge: 0.25, grain: 0.35, seed: seed + layer, box: [0, base - H * height, W, H * height] });
    // snow caps
    ctx.save(); ctx.clip(path);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i]; if (y > base - H * height * hk * 0.55) continue;
      blob(ctx, [[x, y - H * 0.01], [x + W * 0.09, y + H * 0.05], [x + W * 0.03, y + H * 0.04], [x - W * 0.02, y + H * 0.07], [x - W * 0.08, y + H * 0.05]], snow, { alpha: 0.2, layers: 12, spread: 0.15, seed: seed + 's' + i, edge: 0.08 });
      ctx.strokeStyle = hexA(snow, 0.55); ctx.lineWidth = Math.max(1, W / 500);
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - W * 0.06 + k * W * 0.04, y + H * (0.05 + R() * 0.04)); ctx.stroke(); }
    }
    ctx.restore();
  });
}

/** Stone bank / ghat steps in the foreground. */
export function steps(ctx, W, H, y0, { color = '#D8BE9A', seed = 'st' } = {}) {
  const path = P(p => p.rect(-2, y0, W + 4, H - y0 + 2));
  paint(ctx, path, color, { alpha: 0.85, edge: 0, grain: 0.35, seed, box: [0, y0, W, H - y0] });
  ctx.save(); ctx.strokeStyle = hexA('#7a5a40', 0.3); ctx.lineWidth = Math.max(1, W / 600);
  const n = 5;
  for (let i = 0; i <= n; i++) { const y = y0 + (H - y0) * Math.pow(i / n, 1.3); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + (i % 2 ? 2 : -2)); ctx.stroke(); }
  ctx.restore();
}

export function lotus(ctx, x, y, s, { color = '#E8A0A8', seed = 'l' } = {}) {
  const petals = [[-0.9, 0.2], [-0.55, 0.05], [-0.2, -0.05], [0.2, -0.05], [0.55, 0.05], [0.9, 0.2], [0, -0.12]];
  ctx.save();
  blob(ctx, ellipsePts(x, y + s * 0.35, s * 1.6, s * 0.35, 10), '#6E9E6A', { alpha: 0.12, layers: 10, seed: seed + 'leaf' });
  petals.forEach(([dx, rot], i) => {
    const px = x + dx * s * 0.55;
    const path = P(p => { p.moveTo(px, y + s * 0.3); p.bezierCurveTo(px - s * 0.35, y - s * 0.2, px - s * 0.05, y - s * 0.75, px + dx * s * 0.2, y - s * (0.95 - Math.abs(dx) * 0.35)); p.bezierCurveTo(px + s * 0.05, y - s * 0.75, px + s * 0.35, y - s * 0.2, px, y + s * 0.3); });
    paint(ctx, path, i === 6 ? mix(color, '#FFFFFF', 0.3) : color, { alpha: 0.85, edge: 0.5, grain: 0.15, seed: seed + i, box: [px - s * 0.4, y - s, s * 0.8, s * 1.3] });
  });
  ctx.restore();
}

// ---------------- sacred objects ----------------
export function trishul(ctx, x, top, h, { metal = '#B9884A', cloth = '#C8372D', seed = 't', damru = true } = {}) {
  const s = h / 100;
  const shaft = P(p => p.rect(x - s * 1.4, top + s * 18, s * 2.8, s * 82));
  paint(ctx, shaft, metal, { edge: 0.5, light: 0.4, seed: seed + 'sh', box: [x - s * 2, top, s * 4, h] });
  const head = P(p => {
    // centre prong
    p.moveTo(x, top); p.bezierCurveTo(x + s * 2.6, top + s * 6, x + s * 2.4, top + s * 14, x + s * 2, top + s * 22); p.lineTo(x - s * 2, top + s * 22); p.bezierCurveTo(x - s * 2.4, top + s * 14, x - s * 2.6, top + s * 6, x, top); p.closePath();
    // side prongs
    [-1, 1].forEach(d => {
      p.moveTo(x + d * s * 2, top + s * 26);
      p.bezierCurveTo(x + d * s * 12, top + s * 25, x + d * s * 14, top + s * 14, x + d * s * 11, top + s * 4);
      p.bezierCurveTo(x + d * s * 10, top + s * 13, x + d * s * 7, top + s * 19, x + d * s * 2, top + s * 21); p.closePath();
    });
    p.rect(x - s * 8, top + s * 24, s * 16, s * 3);
  });
  paint(ctx, head, metal, { edge: 0.6, light: 0.5, seed: seed + 'hd', box: [x - s * 15, top, s * 30, s * 30] });
  if (damru) {
    const dy = top + s * 40;
    const dm = P(p => { p.moveTo(x - s * 8, dy - s * 7); p.lineTo(x + s * 8, dy - s * 7); p.lineTo(x + s * 1.5, dy); p.lineTo(x + s * 8, dy + s * 7); p.lineTo(x - s * 8, dy + s * 7); p.lineTo(x - s * 1.5, dy); p.closePath(); });
    paint(ctx, dm, '#C8A27A', { edge: 0.6, seed: seed + 'dm', box: [x - s * 8, dy - s * 7, s * 16, s * 14] });
    ctx.save(); ctx.strokeStyle = hexA('#7a1e18', 0.8); ctx.lineWidth = s * 0.5;
    [-6.5, 6.5].forEach(o => { ctx.beginPath(); ctx.moveTo(x - s * 8, dy + s * o); ctx.lineTo(x + s * 8, dy + s * o); ctx.stroke(); });
    ctx.restore();
    // cloth ribbon tied above
    const rib = P(p => { p.moveTo(x - s * 1.5, top + s * 28); p.bezierCurveTo(x - s * 6, top + s * 31, x - s * 7, top + s * 40, x - s * 5, top + s * 48); p.lineTo(x - s * 3, top + s * 47); p.bezierCurveTo(x - s * 4, top + s * 40, x - s * 3, top + s * 33, x + s * 1.5, top + s * 31); p.closePath(); p.moveTo(x + s * 1.5, top + s * 28); p.bezierCurveTo(x + s * 7, top + s * 30, x + s * 9, top + s * 38, x + s * 8, top + s * 45); p.lineTo(x + s * 6, top + s * 45); p.bezierCurveTo(x + s * 6, top + s * 38, x + s * 4, top + s * 33, x - s * 1, top + s * 31); p.closePath(); p.rect(x - s * 2.6, top + s * 27, s * 5.2, s * 4); });
    paint(ctx, rib, cloth, { edge: 0.5, seed: seed + 'rb', box: [x - s * 16, top + s * 26, s * 34, s * 28] });
  }
}

export function nandi(ctx, x, base, len, { body = '#4A5160', cloth = '#C8372D', seed = 'n' } = {}) {
  const s = len / 200;
  const X = v => x + v * s, Y = v => base + v * s;
  const bodyP = P(p => {
    p.moveTo(X(95), Y(0)); p.bezierCurveTo(X(110), Y(-40), X(90), Y(-80), X(55), Y(-88));
    p.bezierCurveTo(X(45), Y(-112), X(15), Y(-112), X(5), Y(-92));
    p.bezierCurveTo(X(-20), Y(-92), X(-38), Y(-90), X(-50), Y(-100));
    p.bezierCurveTo(X(-62), Y(-108), X(-80), Y(-102), X(-88), Y(-84));
    p.bezierCurveTo(X(-98), Y(-62), X(-102), Y(-40), X(-96), Y(-30));
    p.bezierCurveTo(X(-90), Y(-22), X(-78), Y(-26), X(-74), Y(-40));
    p.bezierCurveTo(X(-70), Y(-50), X(-62), Y(-50), X(-56), Y(-40));
    p.bezierCurveTo(X(-60), Y(-20), X(-55), Y(-4), X(-40), Y(0)); p.closePath();
  });
  paint(ctx, bodyP, body, { light: 0.35, shade: 0.35, edge: 0.6, grain: 0.35, seed: seed + 'b', box: [X(-100), Y(-112), 210 * s, 112 * s] });
  // horns, ear
  const horn = P(p => { p.moveTo(X(-70), Y(-100)); p.bezierCurveTo(X(-72), Y(-118), X(-62), Y(-126), X(-54), Y(-128)); p.bezierCurveTo(X(-60), Y(-120), X(-62), Y(-110), X(-62), Y(-100)); p.closePath(); p.moveTo(X(-82), Y(-98)); p.bezierCurveTo(X(-88), Y(-114), X(-84), Y(-122), X(-78), Y(-126)); p.bezierCurveTo(X(-80), Y(-116), X(-78), Y(-106), X(-75), Y(-99)); p.closePath(); });
  paint(ctx, horn, '#8C8270', { edge: 0.6, seed: seed + 'h', box: [X(-90), Y(-130), 40 * s, 34 * s] });
  const ear = P(p => p.ellipse(X(-56), Y(-90), 10 * s, 4 * s, 0.4, 0, Math.PI * 2));
  paint(ctx, ear, mix(body, '#C99A8A', 0.4), { edge: 0.4, seed: seed + 'e', box: [X(-66), Y(-96), 20 * s, 12 * s] });
  // eye
  ctx.save(); ctx.fillStyle = hexA('#111111', 0.8); ctx.beginPath(); ctx.ellipse(X(-80), Y(-78), 2.2 * s, 1.4 * s, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // saddle cloth
  const sad = P(p => { p.moveTo(X(-5), Y(-90)); p.bezierCurveTo(X(20), Y(-96), X(45), Y(-92), X(60), Y(-84)); p.bezierCurveTo(X(66), Y(-60), X(60), Y(-40), X(52), Y(-30)); p.bezierCurveTo(X(30), Y(-38), X(5), Y(-40), X(-12), Y(-34)); p.bezierCurveTo(X(-16), Y(-55), X(-12), Y(-75), X(-5), Y(-90)); p.closePath(); });
  paint(ctx, sad, cloth, { edge: 0.5, seed: seed + 'sd', box: [X(-15), Y(-96), 80 * s, 66 * s] });
  ctx.save(); ctx.strokeStyle = hexA('#D9A441', 0.9); ctx.lineWidth = 2.2 * s; ctx.setLineDash([3 * s, 2 * s]);
  ctx.beginPath(); ctx.moveTo(X(52), Y(-30)); ctx.bezierCurveTo(X(30), Y(-38), X(5), Y(-40), X(-12), Y(-34)); ctx.stroke(); ctx.restore();
  // garland & bell
  beads(ctx, [[X(-62), Y(-92)], [X(-66), Y(-70)], [X(-64), Y(-52)], [X(-56), Y(-44)]], 3.2 * s, ['#F0A030', '#E07020', '#F5C040']);
  beads(ctx, [[X(-58), Y(-96)], [X(-58), Y(-75)], [X(-52), Y(-58)]], 2 * s, ['#8A6A3A', '#C9A060']);
  const bell = P(p => { p.moveTo(X(-52), Y(-46)); p.bezierCurveTo(X(-60), Y(-40), X(-60), Y(-30), X(-62), Y(-26)); p.lineTo(X(-42), Y(-26)); p.bezierCurveTo(X(-44), Y(-30), X(-44), Y(-40), X(-52), Y(-46)); });
  paint(ctx, bell, '#C99A3E', { edge: 0.7, light: 0.5, seed: seed + 'bl', box: [X(-62), Y(-46), 20 * s, 20 * s] });
}
/** A string of beads / flowers along a polyline. */
export function beads(ctx, pts, r, colors) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (r * 1.6)));
    for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  ctx.save();
  out.forEach(([x, y], i) => {
    ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,10,.35)'; ctx.lineWidth = Math.max(0.5, r * 0.2); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();
}

export function feather(ctx, x, y, len, rot, seed = 'f') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const s = len / 100;
  ctx.strokeStyle = hexA('#6B7A3A', 0.8); ctx.lineWidth = s * 0.8;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 3, -len * 0.5, 0, -len); ctx.stroke();
  const R = rng('fe' + seed);
  ctx.lineWidth = s * 0.5;
  for (let i = 0; i < 46; i++) { const t = 0.25 + (i / 46) * 0.7, yy = -len * t, side = i % 2 ? 1 : -1; ctx.strokeStyle = hexA(i % 3 ? '#4E8A5A' : '#7DA34A', 0.55); ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(side * s * 10, yy - s * 2, side * s * (12 + R() * 5) * (1 - Math.abs(t - 0.75)), yy - s * 10); ctx.stroke(); }
  [['#2E7D6B', 11, 15], ['#C8A23A', 7.5, 10], ['#1F4E8C', 5, 7], ['#16223A', 2.6, 3.6]].forEach(([c, rx, ry]) => { ctx.fillStyle = hexA(c, 0.85); ctx.beginPath(); ctx.ellipse(0, -len * 0.84, s * rx, s * ry, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

export function bowQuiver(ctx, x, base, h, { wood = '#A8763E', seed = 'bow' } = {}) {
  const s = h / 100;
  const bow = P(p => { p.moveTo(x, base - h); p.bezierCurveTo(x - s * 30, base - h * 0.7, x - s * 30, base - h * 0.3, x, base); p.lineTo(x - s * 3, base - s * 1); p.bezierCurveTo(x - s * 24, base - h * 0.3, x - s * 24, base - h * 0.7, x - s * 3, base - h + s * 1); p.closePath(); });
  paint(ctx, bow, wood, { edge: 0.6, light: 0.4, seed: seed + 'b', box: [x - s * 30, base - h, s * 32, h] });
  ctx.save(); ctx.strokeStyle = hexA('#3a2a1a', 0.7); ctx.lineWidth = s * 0.5; ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x, base); ctx.stroke(); ctx.restore();
  const q = P(p => { p.moveTo(x + s * 8, base - s * 8); p.lineTo(x + s * 22, base - s * 70); p.lineTo(x + s * 31, base - s * 68); p.lineTo(x + s * 18, base - s * 6); p.closePath(); });
  paint(ctx, q, '#8C4A2E', { edge: 0.6, seed: seed + 'q', box: [x + s * 8, base - s * 70, s * 24, s * 64] });
  ctx.save(); ctx.strokeStyle = hexA('#6a5030', 0.9); ctx.lineWidth = s * 0.7;
  for (let i = 0; i < 5; i++) { const ax = x + s * (22 + i * 2), ay = base - s * 68; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + s * 4, ay - s * 18); ctx.stroke(); ctx.fillStyle = hexA('#C8372D', 0.8); ctx.beginPath(); ctx.moveTo(ax + s * 4, ay - s * 18); ctx.lineTo(ax + s * 2, ay - s * 12); ctx.lineTo(ax + s * 6, ay - s * 13); ctx.fill(); }
  ctx.restore();
}

export function kalash(ctx, x, base, h, { metal = '#C0803E', seed = 'k' } = {}) {
  const s = h / 100;
  const pot = P(p => { p.moveTo(x - s * 14, base - s * 52); p.bezierCurveTo(x - s * 40, base - s * 44, x - s * 40, base - s * 4, x - s * 18, base); p.lineTo(x + s * 18, base); p.bezierCurveTo(x + s * 40, base - s * 4, x + s * 40, base - s * 44, x + s * 14, base - s * 52); p.lineTo(x + s * 18, base - s * 58); p.lineTo(x - s * 18, base - s * 58); p.closePath(); });
  paint(ctx, pot, metal, { edge: 0.6, light: 0.5, seed: seed + 'p', box: [x - s * 40, base - s * 58, s * 80, s * 58] });
  ctx.save(); ctx.strokeStyle = hexA('#C8372D', 0.8); ctx.lineWidth = s * 1.5; ctx.beginPath(); ctx.ellipse(x, base - s * 30, s * 32, s * 4, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
  for (let i = -2; i <= 2; i++) { const lf = P(p => { const bx = x + i * s * 7, by = base - s * 58; p.moveTo(bx, by); p.bezierCurveTo(bx + i * s * 6 - s * 5, by - s * 10, bx + i * s * 9, by - s * 20, bx + i * s * 10, by - s * 24); p.bezierCurveTo(bx + i * s * 4 + s * 5, by - s * 12, bx + s * 3, by - s * 6, bx, by); }); paint(ctx, lf, '#5E8A3E', { edge: 0.5, seed: seed + 'l' + i, box: [x - s * 30, base - s * 84, s * 60, s * 26] }); }
  const coco = P(p => p.ellipse(x, base - s * 72, s * 12, s * 15, 0, 0, Math.PI * 2));
  paint(ctx, coco, '#8A5A30', { edge: 0.6, seed: seed + 'c', box: [x - s * 12, base - s * 88, s * 24, s * 30] });
  ctx.save(); ctx.fillStyle = hexA('#C8372D', 0.7); ctx.beginPath(); ctx.ellipse(x, base - s * 76, s * 12.5, s * 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function bansuriWC(ctx, x, y, len, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const s = len / 100;
  const f = P(p => { p.roundRect ? p.roundRect(0, -s * 2.2, len, s * 4.4, s * 2) : p.rect(0, -s * 2.2, len, s * 4.4); });
  paint(ctx, f, '#B98A4A', { edge: 0.6, light: 0.5, seed: 'flute', box: [0, -s * 3, len, s * 6] });
  ctx.fillStyle = hexA('#3a2a1a', 0.8);
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(len * (0.35 + i * 0.07), 0, s * 0.9, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = hexA('#C8372D', 0.85); ctx.fillRect(len * 0.12, -s * 2.4, s * 3, s * 4.8); ctx.fillRect(len * 0.88, -s * 2.4, s * 3, s * 4.8);
  ctx.restore();
}

// ---------------- trees & foliage ----------------
export function branches(ctx, W, H, { side = 'left', leaf = '#6E9450', bark = '#6B5440', seed = 'br', roots = true, flowers = null } = {}) {
  const R = rng('br' + seed);
  ctx.save();
  if (side === 'right') { ctx.translate(W, 0); ctx.scale(-1, 1); }
  const u = W / 100;
  const limb = P(p => { p.moveTo(-u * 2, H * 0.0); p.bezierCurveTo(u * 14, H * 0.03, u * 30, H * 0.05, u * 48, H * 0.035); p.bezierCurveTo(u * 32, H * 0.065, u * 16, H * 0.07, -u * 2, H * 0.075); p.closePath(); });
  paint(ctx, limb, bark, { edge: 0.5, seed: seed + 'l', box: [0, 0, u * 50, H * 0.08] });
  for (let i = 0; i < 26; i++) {
    const cx = R() * u * 55, cy = H * (0.005 + R() * 0.07), r = u * (2.5 + R() * 5);
    blob(ctx, ellipsePts(cx, cy, r, r * 0.6, 8, R() * 3), i % 3 ? leaf : mix(leaf, '#C9D98A', 0.4), { alpha: 0.12, layers: 9, spread: 0.2, seed: seed + 'f' + i, edge: 0.15 });
  }
  if (roots) {
    ctx.strokeStyle = hexA(bark, 0.45); ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x = u * (6 + R() * 36), l = H * (0.05 + R() * 0.12); ctx.lineWidth = u * (0.15 + R() * 0.2); ctx.beginPath(); ctx.moveTo(x, H * 0.06); ctx.bezierCurveTo(x + u, H * 0.06 + l * 0.4, x - u, H * 0.06 + l * 0.7, x + u * 0.5, H * 0.06 + l); ctx.stroke(); }
  }
  if (flowers) for (let i = 0; i < 14; i++) { const x = R() * u * 50, y = H * (0.01 + R() * 0.08); blob(ctx, ellipsePts(x, y, u * 1, u * 1, 6), flowers, { alpha: 0.3, layers: 6, seed: seed + 'fl' + i, edge: 0.3 }); }
  ctx.restore();
}

// ---------------- gateway / courtyard ----------------
export function courtyard(ctx, W, H, { wall = '#CDB79A', gate = '#D9A86A', trim = '#B8542E', y0 = 0.66, seed = 'cy', view = '#9FBCD2' } = {}) {
  const u = W / 100, top = H * y0;
  // view of the river through the gate is already painted behind; wall with stones
  const gx = W * 0.5, gw = W * 0.34, gh = H * 0.26, gTop = H * (y0 - 0.06);
  const wallP = P(p => { p.rect(-2, top, gx - gw * 0.4 + 2, H - top + 2); p.rect(gx + gw * 0.4, top, W - gx - gw * 0.4 + 2, H - top + 2); });
  ctx.save();
  paint(ctx, wallP, wall, { edge: 0.3, grain: 0.4, seed: seed + 'w', box: [0, top, W, H - top] });
  // stones
  const R = rng('stone' + seed);
  ctx.strokeStyle = hexA('#6a5038', 0.35); ctx.lineWidth = Math.max(1, u * 0.18);
  for (let r = 0; r < 7; r++) {
    const y = top + r * u * 5.5;
    for (let x = (r % 2) * u * 4 - u * 4; x < W; x += u * (6 + R() * 4)) {
      if (Math.abs(x - gx) < gw * 0.4 && y > gTop) continue;
      ctx.beginPath(); ctx.ellipse(x + u * 3, y + u * 2.6, u * 3.4, u * 2.4, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
  // gate frame
  const frame = P(p => {
    p.rect(gx - gw / 2, gTop, gw * 0.14, H - gTop); p.rect(gx + gw / 2 - gw * 0.14, gTop, gw * 0.14, H - gTop);
    p.moveTo(gx - gw / 2, gTop); p.lineTo(gx + gw / 2, gTop); p.lineTo(gx + gw / 2, gTop + gh * 0.2); p.lineTo(gx + gw * 0.36, gTop + gh * 0.2);
    p.bezierCurveTo(gx + gw * 0.36, gTop + gh * 0.02 + gh * 0.2, gx - gw * 0.36, gTop + gh * 0.02 + gh * 0.2, gx - gw * 0.36, gTop + gh * 0.2);
    p.lineTo(gx - gw / 2, gTop + gh * 0.2); p.closePath();
    p.rect(gx - gw * 0.56, gTop - u * 2.5, gw * 1.12, u * 2.5);
  });
  paint(ctx, frame, gate, { edge: 0.55, light: 0.3, grain: 0.3, seed: seed + 'g', box: [gx - gw * 0.56, gTop - u * 3, gw * 1.12, H - gTop] });
  ctx.save(); ctx.strokeStyle = hexA(trim, 0.7); ctx.lineWidth = u * 0.5;
  ctx.beginPath(); ctx.moveTo(gx - gw * 0.43, H); ctx.lineTo(gx - gw * 0.43, gTop + gh * 0.24); ctx.moveTo(gx + gw * 0.43, H); ctx.lineTo(gx + gw * 0.43, gTop + gh * 0.24); ctx.stroke(); ctx.restore();
  return { gx, gw, gTop, gh };
}

/** Swaying marigold garland strings (drawn every frame). */
export function garlands(ctx, x0, x1, y, drop, t, u, count = 5) {
  const colors = ['#F2A01E', '#E8771A', '#F6C445', '#E05A1A'];
  for (let k = 0; k < count; k++) {
    const sway = Math.sin(t * 1.2 + k) * u * 0.6;
    const ax = x0 + (x1 - x0) * (k / count), bx = x0 + (x1 - x0) * ((k + 1) / count);
    const pts = [];
    for (let i = 0; i <= 14; i++) { const f = i / 14; pts.push([ax + (bx - ax) * f + sway * Math.sin(f * Math.PI), y + Math.sin(f * Math.PI) * drop]); }
    beads(ctx, pts, u * 0.95, colors);
  }
  // hanging strands
  for (let k = 0; k <= count; k++) {
    const x = x0 + (x1 - x0) * (k / count), sw = Math.sin(t * 1.5 + k * 2) * u * 0.8;
    beads(ctx, [[x, y], [x + sw * 0.5, y + drop * 0.8], [x + sw, y + drop * 1.6]], u * 0.85, colors);
    ctx.save(); ctx.fillStyle = '#6E9450'; ctx.beginPath(); ctx.ellipse(x + sw, y + drop * 1.6 + u * 1.4, u * 0.6, u * 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

export function boat(ctx, x, y, w) {
  const b = P(p => { p.moveTo(x - w / 2, y); p.quadraticCurveTo(x, y + w * 0.22, x + w / 2, y - w * 0.04); p.lineTo(x + w * 0.4, y + w * 0.02); p.lineTo(x - w * 0.42, y + w * 0.02); p.closePath(); });
  paint(ctx, b, '#7A5A3A', { edge: 0.5, seed: 'boat' + Math.round(x), box: [x - w / 2, y - w * 0.05, w, w * 0.25] });
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(1, w / 60); ctx.beginPath(); ctx.moveTo(x - w * 0.4, y + w * 0.12); ctx.lineTo(x + w * 0.4, y + w * 0.12); ctx.stroke(); ctx.restore();
}

/** Floating diyas & aarti flames (drawn every frame for flicker). */
export function flame(ctx, x, y, s, t, k = 0) {
  const f = 0.85 + 0.15 * Math.sin(t * 9 + k * 3) + 0.05 * Math.sin(t * 23 + k);
  const g = ctx.createRadialGradient(x, y - s, 0, x, y - s, s * 4 * f);
  g.addColorStop(0, 'rgba(255,220,140,.55)'); g.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = g; ctx.fillRect(x - s * 4, y - s * 5, s * 8, s * 8);
  ctx.fillStyle = '#FFC44D'; ctx.beginPath(); ctx.moveTo(x, y - s * 2.2 * f); ctx.quadraticCurveTo(x + s * 0.8, y - s * 0.6, x, y); ctx.quadraticCurveTo(x - s * 0.8, y - s * 0.6, x, y - s * 2.2 * f); ctx.fill();
  ctx.fillStyle = '#FFF3C0'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.5, s * 0.25, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
}

/** Small robed figure performing aarti (silhouette-like, from behind/side). */
export function priest(ctx, x, base, h, { robe = '#C8582E', seed = 'pr', facing = 1 } = {}) {
  const s = h / 100;
  ctx.save(); ctx.translate(x, base); ctx.scale(facing, 1);
  const body = P(p => {
    p.moveTo(-s * 14, 0); p.bezierCurveTo(-s * 16, -s * 40, -s * 14, -s * 62, -s * 10, -s * 72);
    p.bezierCurveTo(-s * 6, -s * 78, s * 6, -s * 78, s * 10, -s * 72);
    p.bezierCurveTo(s * 14, -s * 62, s * 16, -s * 40, s * 14, 0); p.closePath();
    p.moveTo(s * 8, -s * 70); p.bezierCurveTo(s * 18, -s * 74, s * 22, -s * 86, s * 20, -s * 96); p.lineTo(s * 16, -s * 96); p.bezierCurveTo(s * 16, -s * 86, s * 12, -s * 78, s * 4, -s * 72); p.closePath();
  });
  paint(ctx, body, robe, { edge: 0.5, seed, box: [-s * 16, -s * 96, s * 40, s * 96] });
  const head = P(p => p.ellipse(0, -s * 84, s * 7, s * 8, 0, 0, Math.PI * 2));
  paint(ctx, head, '#6A4A38', { edge: 0.4, seed: seed + 'h', box: [-s * 7, -s * 92, s * 14, s * 16] });
  ctx.restore();
  return [x + facing * s * 18, base - s * 98];
}

// ---------------- figures (seen from behind) ----------------
export const COSTUMES = {
  shiva:   { gSkin: '#7C9CC6', gLower: '#8A6A48', gLowerPattern: 'tiger', gHead: 'jata', gTop: null, gBeads: '#7A4A2A', bSkin: '#D9A27E', bSari: '#D2512E', bBorder: '#D9A441', bBlouse: '#B8322A', bVeil: null, bHair: 'braid' },
  krishna: { gSkin: '#6F8FC0', gLower: '#E3B23C', gLowerPattern: null, gHead: 'peacock', gTop: null, gDupatta: '#E8B93A', gBeads: '#F2F0E8', bSkin: '#E0AE8A', bSari: '#D9577A', bBorder: '#E2B34A', bBlouse: '#B03A5A', bVeil: '#F09AB0', bHair: 'braid' },
  ram:     { gSkin: '#7A96BE', gLower: '#E2A93A', gLowerPattern: null, gHead: 'mukut', gTop: null, gDupatta: '#D9802E', gBeads: '#E2C06A', bSkin: '#E2B08C', bSari: '#C8302A', bBorder: '#E0B040', bBlouse: '#A8262A', bVeil: '#D84A3A', bHair: 'braid', bow: true },
  royal:   { gSkin: '#C99474', gLower: '#EFE2C8', gLowerPattern: null, gHead: 'safa', gTop: '#F2E6CF', gSafa: '#C8372D', gBeads: '#F4EEDC', bSkin: '#DDA683', bSari: '#B8243A', bBorder: '#E0B040', bBlouse: '#9A1E30', bVeil: '#D0405A', bHair: 'bun' },
  modern:  { gSkin: '#C99474', gLower: '#7F93A8', gLowerPattern: null, gHead: 'short', gTop: '#8EA3B8', gBeads: null, bSkin: '#DDA683', bSari: '#E8A9A0', bBorder: '#E9CFA0', bBlouse: '#D78E86', bVeil: null, bHair: 'bun' },
};

function hairMass(p, cx, top, w, len, wav) {
  const hr = w * 0.34, hw = w / 2;
  p.moveTo(cx - hr, top + hr * 0.9);
  p.bezierCurveTo(cx - hr * 1.05, top - hr * 0.35, cx + hr * 1.05, top - hr * 0.35, cx + hr, top + hr * 0.9);
  p.bezierCurveTo(cx + hw * 1.05, top + len * 0.25, cx + hw * 1.15 + wav, top + len * 0.55, cx + hw * 0.95, top + len * 0.8);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const xa = cx + hw * 0.95 - (i + 0.5) * (hw * 1.9 / n), xb = cx + hw * 0.95 - (i + 1) * (hw * 1.9 / n);
    const tip = top + len * (0.94 + ((i * 37) % 10) / 100);
    p.quadraticCurveTo(xa + wav, tip, xa, tip); p.quadraticCurveTo(xa - wav * 0.3, top + len * 0.84, xb, top + len * (0.8 + ((i * 13) % 7) / 100));
  }
  p.bezierCurveTo(cx - hw * 1.15 - wav, top + len * 0.55, cx - hw * 1.05, top + len * 0.25, cx - hr, top + hr * 0.9);
  p.closePath();
}

/**
 * Seated couple from behind (bride on the left leaning towards the groom).
 * (cx, by) is the seat centre, size = overall couple width.
 */
export function seatedCouple(ctx, cx, by, size, cos, seed = 'sc') {
  const s = size / 200; const X = v => cx + v * s, Y = v => by + v * s;
  const box = (a, b, c, d) => [X(a), Y(b), (c - a) * s, (d - b) * s];
  ctx.save();
  // soft shadow
  blob(ctx, ellipsePts(X(0), Y(4), 110 * s, 12 * s, 10), '#5a4030', { alpha: 0.05, layers: 10, edge: 0, seed: seed + 'sh' });
  // --- groom ---
  const gLower = P(p => { p.moveTo(X(-8), Y(4)); p.bezierCurveTo(X(-12), Y(-24), X(2), Y(-44), X(6), Y(-50)); p.lineTo(X(72), Y(-50)); p.bezierCurveTo(X(84), Y(-40), X(104), Y(-20), X(100), Y(4)); p.closePath(); });
  paint(ctx, gLower, cos.gLower, { edge: 0.5, seed: seed + 'gl', box: box(-12, -50, 104, 4) });
  if (cos.gLowerPattern === 'tiger') {
    ctx.save(); ctx.clip(gLower); ctx.strokeStyle = hexA('#3a2414', 0.55); ctx.lineCap = 'round';
    const R = rng(seed + 'tg');
    for (let i = 0; i < 16; i++) { const x = X(-6 + i * 7 + R() * 3), y = Y(-40 + R() * 30); ctx.lineWidth = s * (1.5 + R() * 2); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 3, y + s * 6, x - s * 1, y + s * 12); ctx.stroke(); }
    ctx.restore();
  }
  const skinOrTop = cos.gTop || cos.gSkin;
  const torso = P(p => { p.moveTo(X(8), Y(-48)); p.bezierCurveTo(X(4), Y(-80), X(-8), Y(-100), X(-2), Y(-116)); p.bezierCurveTo(X(4), Y(-127), X(18), Y(-132), X(30), Y(-140)); p.lineTo(X(46), Y(-140)); p.bezierCurveTo(X(58), Y(-132), X(72), Y(-127), X(79), Y(-116)); p.bezierCurveTo(X(84), Y(-100), X(73), Y(-80), X(69), Y(-48)); p.closePath(); });
  const arm = P(p => { p.moveTo(X(70), Y(-124)); p.bezierCurveTo(X(86), Y(-122), X(93), Y(-104), X(91), Y(-88)); p.bezierCurveTo(X(90), Y(-72), X(94), Y(-58), X(90), Y(-44)); p.lineTo(X(79), Y(-44)); p.bezierCurveTo(X(81), Y(-60), X(78), Y(-75), X(77), Y(-92)); p.closePath(); });
  paint(ctx, arm, skinOrTop, { edge: 0.5, light: 0.3, seed: seed + 'ga', box: box(70, -124, 94, -44) });
  paint(ctx, torso, skinOrTop, { edge: 0.5, light: 0.35, shade: 0.3, seed: seed + 'gt', box: box(-6, -135, 83, -48) });
  if (!cos.gTop) {
    // spine & shoulder blade shading
    ctx.save(); ctx.clip(torso); ctx.strokeStyle = hexA('#2a3550', 0.25); ctx.lineWidth = s * 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X(38), Y(-128)); ctx.quadraticCurveTo(X(40), Y(-90), X(38), Y(-52)); ctx.stroke();
    ctx.lineWidth = s * 2; ctx.beginPath(); ctx.arc(X(22), Y(-104), s * 12, 0.3, 2.2); ctx.stroke(); ctx.beginPath(); ctx.arc(X(56), Y(-104), s * 12, 0.9, 2.8); ctx.stroke();
    ctx.restore();
  } else {
    ctx.save(); ctx.clip(torso); ctx.strokeStyle = hexA('#C9A050', 0.6); ctx.lineWidth = s * 1.2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(X(4), Y(-60 - i * 14)); ctx.bezierCurveTo(X(20), Y(-66 - i * 14), X(56), Y(-66 - i * 14), X(76), Y(-60 - i * 14)); ctx.stroke(); }
    ctx.restore();
  }
  if (cos.gDupatta) {
    const dup = P(p => { p.moveTo(X(0), Y(-118)); p.bezierCurveTo(X(20), Y(-110), X(56), Y(-110), X(78), Y(-120)); p.bezierCurveTo(X(84), Y(-100), X(80), Y(-90), X(84), Y(-70)); p.bezierCurveTo(X(60), Y(-82), X(18), Y(-82), X(-4), Y(-70)); p.bezierCurveTo(X(0), Y(-90), X(-4), Y(-104), X(0), Y(-118)); p.closePath(); });
    paint(ctx, dup, cos.gDupatta, { edge: 0.5, alpha: 0.85, seed: seed + 'gd', box: box(-4, -120, 84, -70) });
  }
  if (cos.gBeads) beads(ctx, [[X(80), Y(-108)], [X(90), Y(-106)]], 2.2 * s, [cos.gBeads, mix(cos.gBeads, '#000000', 0.25)]);
  // neck & head
  const neck = P(p => p.rect(X(30), Y(-152), 16 * s, 22 * s));
  paint(ctx, neck, cos.gSkin, { edge: 0.4, seed: seed + 'gn', box: box(30, -152, 46, -130) });
  const head = P(p => p.ellipse(X(38), Y(-162), 15 * s, 18 * s, 0, 0, Math.PI * 2));
  paint(ctx, head, cos.gSkin, { edge: 0.4, seed: seed + 'gh', box: box(23, -180, 53, -144) });
  const dark = '#2A221E';
  if (cos.gHead === 'jata' || cos.gHead === 'peacock' || cos.gHead === 'mukut') {
    const len = cos.gHead === 'jata' ? 90 : 50;
    const hair = P(p => hairMass(p, X(38), Y(-176), 44 * s, len * s, 4 * s));
    paint(ctx, hair, dark, { edge: 0.4, light: 0.15, seed: seed + 'hr', box: box(10, -176, 66, -176 + len) });
    const R = rng(seed + 'str');
    strands(ctx, [...Array(34)].map(() => { const x = X(18 + R() * 40), y = Y(-170 + R() * 10), w8 = (R() - 0.5) * s * 8; return [x, y, x - s * 7 + w8, y + len * s * 0.3, x + s * 7 + w8, y + len * s * 0.62, x + (x - X(38)) * 0.25 + (R() - 0.5) * s * 8, y + len * s * (0.75 + R() * 0.2)]; }), '#7a6050', s * 0.7, 0.45);
  }
  if (cos.gHead === 'jata') {
    const bun = P(p => p.ellipse(X(38), Y(-186), 13 * s, 10 * s, 0, 0, Math.PI * 2));
    paint(ctx, bun, dark, { edge: 0.5, seed: seed + 'bn', box: box(25, -196, 51, -176) });
    ctx.save(); ctx.strokeStyle = hexA('#6a5040', 0.7); ctx.lineWidth = s; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(X(38), Y(-186), (12 - i * 3) * s, (9 - i * 2) * s, 0.3, 0, Math.PI * 1.6); ctx.stroke(); } ctx.restore();
    beads(ctx, [[X(23), Y(-168)], [X(38), Y(-172)], [X(53), Y(-168)]], 1.6 * s, ['#7A4A2A', '#9A6A3A']);
    // crescent moon
    ctx.save(); ctx.fillStyle = '#F4F0E0'; ctx.beginPath(); ctx.arc(X(24), Y(-192), 6 * s, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(X(27), Y(-194), 5.2 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  } else if (cos.gHead === 'peacock') {
    const crown = P(p => { p.moveTo(X(24), Y(-176)); p.lineTo(X(52), Y(-176)); p.lineTo(X(48), Y(-188)); p.lineTo(X(28), Y(-188)); p.closePath(); });
    paint(ctx, crown, '#D9A441', { edge: 0.6, light: 0.5, seed: seed + 'cr', box: box(24, -190, 52, -176) });
    feather(ctx, X(44), Y(-184), 40 * s, 0.3, seed);
  } else if (cos.gHead === 'mukut') {
    const crown = P(p => { p.moveTo(X(22), Y(-170)); p.lineTo(X(54), Y(-170)); p.lineTo(X(50), Y(-196)); p.lineTo(X(44), Y(-190)); p.lineTo(X(38), Y(-204)); p.lineTo(X(32), Y(-190)); p.lineTo(X(26), Y(-196)); p.closePath(); });
    paint(ctx, crown, '#D9A441', { edge: 0.7, light: 0.55, seed: seed + 'mk', box: box(22, -204, 54, -170) });
  } else if (cos.gHead === 'safa') {
    const safa = P(p => { p.ellipse(X(38), Y(-168), 19 * s, 15 * s, 0, Math.PI, 0); p.lineTo(X(57), Y(-160)); p.bezierCurveTo(X(48), Y(-154), X(28), Y(-154), X(19), Y(-160)); p.closePath(); });
    paint(ctx, safa, cos.gSafa, { edge: 0.6, seed: seed + 'sf', box: box(19, -183, 57, -154) });
    const tail = P(p => { p.moveTo(X(32), Y(-158)); p.bezierCurveTo(X(30), Y(-130), X(34), Y(-110), X(30), Y(-92)); p.lineTo(X(42), Y(-92)); p.bezierCurveTo(X(44), Y(-112), X(42), Y(-134), X(44), Y(-158)); p.closePath(); });
    paint(ctx, tail, cos.gSafa, { edge: 0.5, seed: seed + 'st', box: box(30, -158, 44, -92) });
    ctx.save(); ctx.strokeStyle = hexA('#E0B040', 0.8); ctx.lineWidth = s * 1.2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X(38), Y(-166 + i * 3), 18 * s, 10 * s, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); } ctx.restore();
  } else if (cos.gHead === 'short') {
    const hair = P(p => p.ellipse(X(38), Y(-168), 15.5 * s, 13 * s, 0, Math.PI * 0.95, Math.PI * 2.05));
    paint(ctx, hair, dark, { edge: 0.4, seed: seed + 'sh', box: box(22, -182, 54, -160) });
  }
  if (cos.bow) bowQuiver(ctx, X(70), Y(-60), 100 * s, { seed: seed + 'bw' });

  // --- bride (painted over groom's left side: she leans on him) ---
  const bLower = P(p => { p.moveTo(X(-104), Y(4)); p.bezierCurveTo(X(-110), Y(-22), X(-92), Y(-44), X(-82), Y(-50)); p.lineTo(X(4), Y(-50)); p.bezierCurveTo(X(10), Y(-30), X(14), Y(-12), X(10), Y(4)); p.closePath(); });
  paint(ctx, bLower, cos.bSari, { edge: 0.5, seed: seed + 'bl', box: box(-110, -50, 14, 4) });
  ctx.save(); ctx.strokeStyle = hexA(cos.bBorder, 0.85); ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(X(-104), Y(1)); ctx.lineTo(X(10), Y(1)); ctx.stroke(); ctx.restore();
  const bArm = P(p => { p.moveTo(X(-74), Y(-114)); p.bezierCurveTo(X(-88), Y(-102), X(-93), Y(-80), X(-98), Y(-56)); p.lineTo(X(-87), Y(-52)); p.bezierCurveTo(X(-82), Y(-72), X(-78), Y(-92), X(-68), Y(-106)); p.closePath(); });
  paint(ctx, bArm, cos.bSkin, { edge: 0.45, seed: seed + 'ba', box: box(-98, -114, -68, -52) });
  ctx.save(); ctx.strokeStyle = hexA('#C8372D', 0.9); ctx.lineWidth = 1.6 * s; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X(-97 + i * 0.6), Y(-62 + i * 2.2)); ctx.lineTo(X(-86 + i * 0.6), Y(-59 + i * 2.2)); ctx.stroke(); } ctx.strokeStyle = hexA('#E0B040', 0.9); ctx.beginPath(); ctx.moveTo(X(-96), Y(-66)); ctx.lineTo(X(-85), Y(-63)); ctx.stroke(); ctx.restore();
  const bTorso = P(p => { p.moveTo(X(-79), Y(-48)); p.bezierCurveTo(X(-82), Y(-80), X(-74), Y(-104), X(-66), Y(-115)); p.bezierCurveTo(X(-56), Y(-122), X(-42), Y(-126), X(-34), Y(-132)); p.lineTo(X(-21), Y(-132)); p.bezierCurveTo(X(-14), Y(-126), X(-6), Y(-120), X(-4), Y(-112)); p.bezierCurveTo(X(2), Y(-96), X(4), Y(-80), X(3), Y(-48)); p.closePath(); });
  paint(ctx, bTorso, cos.bSkin, { edge: 0.4, light: 0.35, seed: seed + 'bt', box: box(-82, -128, 4, -48) });
  ctx.save(); ctx.clip(bTorso);
  const blouse = P(p => { p.moveTo(X(-90), Y(-100)); p.bezierCurveTo(X(-60), Y(-106), X(-20), Y(-106), X(8), Y(-102)); p.lineTo(X(8), Y(-74)); p.bezierCurveTo(X(-20), Y(-78), X(-60), Y(-78), X(-90), Y(-74)); p.closePath(); });
  paint(ctx, blouse, cos.bBlouse, { edge: 0.4, seed: seed + 'bb', box: box(-90, -106, 8, -74) });
  ctx.restore();
  // pallu across the back
  const pallu = P(p => { p.moveTo(X(-76), Y(-117)); p.bezierCurveTo(X(-62), Y(-126), X(-50), Y(-122), X(-44), Y(-114)); p.bezierCurveTo(X(-30), Y(-92), X(-8), Y(-68), X(8), Y(-46)); p.lineTo(X(-34), Y(-46)); p.bezierCurveTo(X(-52), Y(-70), X(-70), Y(-96), X(-82), Y(-106)); p.closePath(); });
  paint(ctx, pallu, cos.bSari, { edge: 0.5, light: 0.3, seed: seed + 'pl', box: box(-82, -126, 8, -46) });
  ctx.save(); ctx.strokeStyle = hexA(cos.bBorder, 0.9); ctx.lineWidth = 2.6 * s;
  ctx.beginPath(); ctx.moveTo(X(-44), Y(-114)); ctx.bezierCurveTo(X(-30), Y(-92), X(-8), Y(-68), X(8), Y(-46)); ctx.stroke();
  ctx.lineWidth = 1.2 * s; ctx.setLineDash([2 * s, 2.5 * s]); ctx.beginPath(); ctx.moveTo(X(-50), Y(-112)); ctx.bezierCurveTo(X(-36), Y(-90), X(-15), Y(-66), X(0), Y(-46)); ctx.stroke();
  ctx.restore();
  // head tilted towards groom
  const neckB = P(p => p.rect(X(-34), Y(-142), 13 * s, 22 * s));
  paint(ctx, neckB, cos.bSkin, { edge: 0.35, seed: seed + 'bn', box: box(-34, -142, -21, -120) });
  ctx.save(); ctx.translate(X(-24), Y(-152)); ctx.rotate(0.28);
  const bHead = P(p => p.ellipse(0, 0, 13.5 * s, 16 * s, 0, 0, Math.PI * 2));
  paint(ctx, bHead, '#2A221E', { edge: 0.4, light: 0.15, seed: seed + 'bh', box: [-14 * s, -16 * s, 28 * s, 32 * s] });
  ctx.strokeStyle = hexA('#6a5040', 0.5); ctx.lineWidth = 0.8 * s;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 2 * s, -15 * s); ctx.quadraticCurveTo(i * 5 * s, 0, i * 3 * s, 12 * s); ctx.stroke(); }
  ctx.restore();
  // braid / bun with gajra
  if (cos.bHair === 'braid') {
    const pts = []; for (let i = 0; i <= 10; i++) { const f = i / 10; pts.push([X(-30 + Math.sin(f * 3) * 3 - f * 6), Y(-140 + f * 92)]); }
    ctx.save(); ctx.strokeStyle = '#2A221E'; ctx.lineCap = 'round'; ctx.lineWidth = 9 * s; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.strokeStyle = hexA('#6a5040', 0.6); ctx.lineWidth = s; for (let i = 0; i < pts.length - 1; i++) { ctx.beginPath(); ctx.moveTo(pts[i][0] - 4 * s, pts[i][1]); ctx.quadraticCurveTo(pts[i][0], pts[i][1] + 5 * s, pts[i][0] + 4 * s, pts[i][1] + 9 * s); ctx.stroke(); }
    ctx.restore();
    beads(ctx, pts.slice(0, 9).map(([x, y]) => [x + 6 * s, y]), 2.3 * s, ['#FBF8EE', '#F1EEDF']);
    ctx.save(); ctx.fillStyle = '#C8372D'; ctx.beginPath(); ctx.arc(X(-22), Y(-148), 3.5 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#E05A6A'; ctx.beginPath(); ctx.arc(X(-28), Y(-145), 2.5 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // tassel
    ctx.save(); ctx.fillStyle = '#D9A441'; ctx.beginPath(); ctx.ellipse(pts[10][0], pts[10][1] + 4 * s, 2.5 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  } else {
    const bun = P(p => p.ellipse(X(-26), Y(-142), 10 * s, 8 * s, 0.2, 0, Math.PI * 2));
    paint(ctx, bun, '#2A221E', { edge: 0.4, seed: seed + 'bu', box: box(-36, -150, -16, -134) });
    beads(ctx, [[X(-36), Y(-142)], [X(-26), Y(-133)], [X(-16), Y(-142)]], 2.1 * s, ['#FBF8EE', '#F1EEDF']);
  }
  if (cos.bVeil) {
    const veil = P(p => { p.moveTo(X(-40), Y(-164)); p.bezierCurveTo(X(-24), Y(-176), X(-8), Y(-170), X(-6), Y(-150)); p.bezierCurveTo(X(0), Y(-120), X(8), Y(-90), X(10), Y(-50)); p.lineTo(X(-84), Y(-50)); p.bezierCurveTo(X(-84), Y(-90), X(-62), Y(-120), X(-48), Y(-140)); p.closePath(); });
    paint(ctx, veil, cos.bVeil, { alpha: 0.45, edge: 0.4, light: 0.3, grain: 0.15, seed: seed + 'vl', box: box(-84, -176, 10, -50) });
    ctx.save(); ctx.strokeStyle = hexA(cos.bBorder, 0.55); ctx.lineWidth = 1.4 * s; ctx.stroke(veil); ctx.restore();
  }
  ctx.restore();
}

/**
 * Standing couple from behind, holding hands, looking out over the landscape.
 * (cx, by) = feet line centre, size = couple height.
 */
export function standingCouple(ctx, cx, by, size, cos, seed = 'stc', { embrace = false } = {}) {
  const s = size / 200; const X = v => cx + v * s, Y = v => by + v * s;
  const box = (a, b, c, d) => [X(a), Y(b), (c - a) * s, (d - b) * s];
  blob(ctx, ellipsePts(X(0), Y(2), 70 * s, 6 * s, 10), '#3a2a20', { alpha: 0.05, layers: 8, edge: 0, seed: seed + 'sh' });
  // groom (right)
  const gx = 22;
  const legs = P(p => { p.moveTo(X(gx - 16), Y(-92)); p.lineTo(X(gx + 16), Y(-92)); p.bezierCurveTo(X(gx + 20), Y(-50), X(gx + 18), Y(-20), X(gx + 16), Y(0)); p.lineTo(X(gx - 16), Y(0)); p.bezierCurveTo(X(gx - 18), Y(-20), X(gx - 20), Y(-50), X(gx - 16), Y(-92)); p.closePath(); });
  paint(ctx, legs, cos.gTop ? cos.gLower : cos.gLower, { edge: 0.5, seed: seed + 'gl', box: box(gx - 20, -92, gx + 20, 0) });
  if (cos.gLowerPattern === 'tiger') { ctx.save(); ctx.clip(legs); ctx.strokeStyle = hexA('#3a2414', 0.5); ctx.lineWidth = 1.6 * s; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(X(gx - 14 + i * 4), Y(-88 + (i % 3) * 8)); ctx.quadraticCurveTo(X(gx - 12 + i * 4), Y(-80 + (i % 3) * 8), X(gx - 15 + i * 4), Y(-72 + (i % 3) * 8)); ctx.stroke(); } ctx.restore(); }
  const body = cos.gTop || cos.gSkin;
  const torso = P(p => { p.moveTo(X(gx - 15), Y(-90)); p.bezierCurveTo(X(gx - 18), Y(-110), X(gx - 24), Y(-130), X(gx - 22), Y(-142)); p.bezierCurveTo(X(gx - 14), Y(-148), X(gx + 14), Y(-148), X(gx + 22), Y(-142)); p.bezierCurveTo(X(gx + 24), Y(-130), X(gx + 18), Y(-110), X(gx + 15), Y(-90)); p.closePath(); });
  const armR = P(p => { p.moveTo(X(gx + 20), Y(-142)); p.bezierCurveTo(X(gx + 28), Y(-130), X(gx + 28), Y(-110), X(gx + 27), Y(-92)); p.lineTo(X(gx + 21), Y(-92)); p.bezierCurveTo(X(gx + 22), Y(-108), X(gx + 20), Y(-122), X(gx + 17), Y(-134)); p.closePath(); });
  paint(ctx, armR, body, { edge: 0.45, seed: seed + 'ar', box: box(gx + 17, -142, gx + 28, -92) });
  paint(ctx, torso, body, { edge: 0.5, light: 0.35, seed: seed + 'gt', box: box(gx - 24, -148, gx + 24, -90) });
  if (cos.gDupatta) { const d = P(p => { p.moveTo(X(gx - 22), Y(-140)); p.bezierCurveTo(X(gx - 4), Y(-134), X(gx + 8), Y(-134), X(gx + 22), Y(-140)); p.lineTo(X(gx + 20), Y(-122)); p.bezierCurveTo(X(gx + 4), Y(-118), X(gx - 8), Y(-118), X(gx - 20), Y(-122)); p.closePath(); }); paint(ctx, d, cos.gDupatta, { edge: 0.5, seed: seed + 'gd', box: box(gx - 22, -140, gx + 22, -118) }); }
  const head = P(p => p.ellipse(X(gx), Y(-158), 9 * s, 11 * s, 0, 0, Math.PI * 2));
  paint(ctx, head, cos.gSkin, { edge: 0.4, seed: seed + 'gh', box: box(gx - 9, -169, gx + 9, -147) });
  if (cos.gHead === 'jata' || cos.gHead === 'peacock' || cos.gHead === 'mukut') {
    const len = cos.gHead === 'jata' ? 50 : 26;
    const hair = P(p => hairMass(p, X(gx), Y(-166), 24 * s, len * s, 2 * s));
    paint(ctx, hair, '#2A221E', { edge: 0.4, light: 0.12, seed: seed + 'hr', box: box(gx - 14, -166, gx + 14, -166 + len) });
  }
  if (cos.gHead === 'jata') {
    const bun = P(p => p.ellipse(X(gx), Y(-172), 8 * s, 6 * s, 0, 0, Math.PI * 2)); paint(ctx, bun, '#2A221E', { edge: 0.5, seed: seed + 'bn', box: box(gx - 8, -178, gx + 8, -166) });
    ctx.save(); ctx.fillStyle = '#F4F0E0'; ctx.beginPath(); ctx.arc(X(gx - 8), Y(-177), 3.6 * s, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(X(gx - 6.2), Y(-178), 3.1 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    trishul(ctx, X(gx + 46), Y(-176), 176 * s, { damru: !embrace, seed: seed + 'tri' });
  } else if (cos.gHead === 'peacock') { feather(ctx, X(gx + 3), Y(-168), 22 * s, 0.25, seed); }
  else if (cos.gHead === 'mukut') { const c = P(p => { p.moveTo(X(gx - 10), Y(-164)); p.lineTo(X(gx + 10), Y(-164)); p.lineTo(X(gx + 8), Y(-180)); p.lineTo(X(gx), Y(-188)); p.lineTo(X(gx - 8), Y(-180)); p.closePath(); }); paint(ctx, c, '#D9A441', { edge: 0.6, light: 0.5, seed: seed + 'mk', box: box(gx - 10, -188, gx + 10, -164) }); bowQuiver(ctx, X(gx + 18), Y(-96), 60 * s, { seed: seed + 'bw' }); }
  else if (cos.gHead === 'safa') { const sf = P(p => { p.ellipse(X(gx), Y(-162), 11 * s, 10 * s, 0, Math.PI, 0); p.closePath(); }); paint(ctx, sf, cos.gSafa, { edge: 0.6, seed: seed + 'sf', box: box(gx - 11, -172, gx + 11, -160) }); }
  else if (cos.gHead === 'short') { const hr = P(p => p.ellipse(X(gx), Y(-162), 9.5 * s, 8 * s, 0, Math.PI * 0.95, Math.PI * 2.05)); paint(ctx, hr, '#2A221E', { edge: 0.4, seed: seed + 'hs', box: box(gx - 10, -170, gx + 10, -158) }); }
  // bride (left)
  const bx = -20;
  const skirt = P(p => { p.moveTo(X(bx - 13), Y(-96)); p.lineTo(X(bx + 13), Y(-96)); p.bezierCurveTo(X(bx + 22), Y(-60), X(bx + 28), Y(-20), X(bx + 30), Y(0)); p.lineTo(X(bx - 30), Y(0)); p.bezierCurveTo(X(bx - 28), Y(-20), X(bx - 22), Y(-60), X(bx - 13), Y(-96)); p.closePath(); });
  paint(ctx, skirt, cos.bSari, { edge: 0.5, seed: seed + 'bs', box: box(bx - 30, -96, bx + 30, 0) });
  ctx.save(); ctx.strokeStyle = hexA(cos.bBorder, 0.9); ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(X(bx - 30), Y(-2)); ctx.lineTo(X(bx + 30), Y(-2)); ctx.stroke(); ctx.restore();
  const bt = P(p => { p.moveTo(X(bx - 13), Y(-94)); p.bezierCurveTo(X(bx - 16), Y(-112), X(bx - 18), Y(-128), X(bx - 16), Y(-136)); p.bezierCurveTo(X(bx - 10), Y(-141), X(bx + 10), Y(-141), X(bx + 16), Y(-136)); p.bezierCurveTo(X(bx + 18), Y(-128), X(bx + 16), Y(-112), X(bx + 13), Y(-94)); p.closePath(); });
  paint(ctx, bt, cos.bSkin, { edge: 0.4, seed: seed + 'bt', box: box(bx - 18, -141, bx + 18, -94) });
  ctx.save(); ctx.clip(bt); const bl = P(p => p.rect(X(bx - 20), Y(-128), 40 * s, 16 * s)); paint(ctx, bl, cos.bBlouse, { edge: 0.3, seed: seed + 'bb', box: box(bx - 20, -128, bx + 20, -112) }); ctx.restore();
  const pal = P(p => { p.moveTo(X(bx - 16), Y(-136)); p.bezierCurveTo(X(bx - 6), Y(-140), X(bx), Y(-136), X(bx + 2), Y(-130)); p.bezierCurveTo(X(bx + 8), Y(-110), X(bx + 16), Y(-96), X(bx + 22), Y(-60)); p.lineTo(X(bx + 8), Y(-60)); p.bezierCurveTo(X(bx + 2), Y(-90), X(bx - 8), Y(-112), X(bx - 18), Y(-126)); p.closePath(); });
  paint(ctx, pal, cos.bSari, { edge: 0.5, seed: seed + 'pl', box: box(bx - 18, -140, bx + 22, -60) });
  // hands meeting
  const hands = P(p => { p.moveTo(X(bx + 14), Y(-134)); p.bezierCurveTo(X(bx + 22), Y(-120), X(bx + 24), Y(-104), X(0), Y(-96)); p.lineTo(X(gx - 14), Y(-100)); p.bezierCurveTo(X(gx - 16), Y(-110), X(gx - 18), Y(-126), X(gx - 20), Y(-138)); p.lineTo(X(gx - 24), Y(-134)); p.bezierCurveTo(X(gx - 22), Y(-118), X(gx - 22), Y(-104), X(2), Y(-90)); p.bezierCurveTo(X(bx + 26), Y(-98), X(bx + 18), Y(-118), X(bx + 10), Y(-130)); p.closePath(); });
  if (embrace) {
    const ar = P(p => { p.moveTo(X(gx - 18), Y(-140)); p.bezierCurveTo(X(gx - 30), Y(-142), X(bx + 4), Y(-142), X(bx - 12), Y(-132)); p.lineTo(X(bx - 10), Y(-126)); p.bezierCurveTo(X(bx + 6), Y(-134), X(gx - 28), Y(-134), X(gx - 16), Y(-130)); p.closePath(); });
    paint(ctx, ar, cos.gTop || cos.gSkin, { edge: 0.5, seed: seed + 'em', box: box(bx - 12, -142, gx - 16, -126) });
  } else paint(ctx, hands, cos.bSkin, { edge: 0.4, seed: seed + 'hd', alpha: 0.9, box: box(bx + 10, -138, gx - 14, -90) });
  ctx.save(); ctx.translate(X(bx + 2), Y(-150)); ctx.rotate(embrace ? 0.25 : 0.12);
  const bh = P(p => p.ellipse(0, 0, 8.5 * s, 10.5 * s, 0, 0, Math.PI * 2)); paint(ctx, bh, '#2A221E', { edge: 0.4, light: 0.15, seed: seed + 'bh', box: [-9 * s, -11 * s, 18 * s, 22 * s] });
  ctx.restore();
  if (cos.bHair === 'braid') { const pts = []; for (let i = 0; i <= 8; i++) { const f = i / 8; pts.push([X(bx + 1 + Math.sin(f * 3) * 2), Y(-142 + f * 56)]); } ctx.save(); ctx.strokeStyle = '#2A221E'; ctx.lineWidth = 5.5 * s; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore(); beads(ctx, pts.slice(0, 7).map(([x, y]) => [x + 3.6 * s, y]), 1.5 * s, ['#FBF8EE', '#F1EEDF']); }
  else beads(ctx, [[X(bx - 5), Y(-146)], [X(bx + 2), Y(-141)], [X(bx + 9), Y(-146)]], 1.4 * s, ['#FBF8EE', '#F1EEDF']);
  if (cos.bVeil) { const v = P(p => { p.moveTo(X(bx - 6), Y(-160)); p.bezierCurveTo(X(bx + 8), Y(-166), X(bx + 14), Y(-150), X(bx + 16), Y(-136)); p.bezierCurveTo(X(bx + 22), Y(-100), X(bx + 28), Y(-60), X(bx + 30), Y(-20)); p.lineTo(X(bx - 26), Y(-20)); p.bezierCurveTo(X(bx - 24), Y(-70), X(bx - 20), Y(-120), X(bx - 10), Y(-150)); p.closePath(); }); paint(ctx, v, cos.bVeil, { alpha: 0.4, edge: 0.35, light: 0.3, grain: 0.12, seed: seed + 'vl', box: box(bx - 26, -166, bx + 30, -20) }); }
}
