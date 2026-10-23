// Realistic-art reel invitations. Scenes are built from real paintings (Raja Ravi Varma, public domain /
// CC BY), the couple's own photos, or artwork/video clips the user generates or licenses and uploads.
// Text is always drawn live from the design; artwork is never baked with text.
import * as WC from './watercolor.js';
import * as M from './motifs.js';
import { rng } from './motifs.js';
import { FONT_SETS, line, rev, ease, easeIO, clamp01, dateParts, timePhrase, divider, mainEventOf, firstGrapheme, hasDeva } from './story.js';
import { ART } from '../data/art.js';
import { invocationText } from '../state.js';

const PI2 = Math.PI * 2;
const GOLD = ['#6e4f14', '#f4d47c', '#b7892f', '#fbe7a6', '#8a6420'];
function goldGrad(ctx, x0, y0, x1, y1) { const g = ctx.createLinearGradient(x0, y0, x1, y1); GOLD.forEach((c, i) => g.addColorStop(i / (GOLD.length - 1), c)); return g; }

// ---------------- image & clip loading ----------------
const imgCache = new Map();
export function loadImg(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  imgCache.set(src, p); return p;
}

// ---------------- cached procedural textures ----------------
const tex = new Map();
function cached(key, W, H, fn) {
  const k = key + '|' + W + 'x' + H;
  if (!tex.has(k)) { const c = document.createElement('canvas'); c.width = W; c.height = H; fn(c.getContext('2d'), W, H); tex.set(k, c); if (tex.size > 40) tex.delete(tex.keys().next().value); }
  return tex.get(k);
}
function velvet(ctx, W, H, base = '#7A0E1C') {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const R = rng('velvet' + base);
  for (let i = 0; i < 14; i++) {
    const x = (i / 13) * W + (R() - 0.5) * W * 0.06, w = W * (0.08 + R() * 0.14);
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    const a = 0.05 + R() * 0.08, light = i % 2;
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, light ? `rgba(255,120,130,${a})` : `rgba(0,0,0,${a * 1.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - w, 0, 2 * w, H);
  }
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(255,90,90,.18)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  WC.granulate(ctx, 0, 0, W, H, 0.35);
}
function crumpled(ctx, W, H, base = '#D9C29C', seed = 'k') {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const R = rng('crumple' + seed + base), u = W / 100;
  for (let i = 0; i < 260; i++) {
    const cx = R() * W, cy = R() * H, r = u * (5 + R() * 16), n = 3 + Math.floor(R() * 3), a0 = R() * PI2;
    ctx.beginPath();
    for (let k = 0; k < n; k++) { const a = a0 + (k / n) * PI2 + (R() - 0.5) * 0.8, rr = r * (0.6 + R() * 0.6); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fillStyle = R() < 0.5 ? `rgba(255,255,255,${0.04 + R() * 0.07})` : `rgba(60,30,0,${0.03 + R() * 0.06})`; ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = R() * W, y = R() * H, a = R() * PI2, l = u * (10 + R() * 40);
    const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l, mx = (x + x2) / 2 + (R() - 0.5) * u * 6, my = (y + y2) / 2 + (R() - 0.5) * u * 6;
    ctx.lineWidth = Math.max(1, u * 0.18); ctx.strokeStyle = 'rgba(70,40,10,.12)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x + 1.5, y + 1.5); ctx.quadraticCurveTo(mx + 1.5, my + 1.5, x2 + 1.5, y2 + 1.5); ctx.stroke();
  }
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(60,30,0,.25)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  WC.granulate(ctx, 0, 0, W, H, 0.25);
}
function ivoryFloral(ctx, W, H) {
  ctx.fillStyle = '#F4ECDD'; ctx.fillRect(0, 0, W, H);
  const u = W / 100, R = rng('buti');
  for (let row = 0, y = u * 4; y < H; y += u * 9, row++) for (let x = (row % 2) * u * 5 + u * 3; x < W; x += u * 10) {
    ctx.save(); ctx.translate(x + (R() - 0.5) * u, y); ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#9DB08A'; [-1, 1].forEach(d => { ctx.beginPath(); ctx.ellipse(d * u * 1.1, u * 0.9, u * 0.9, u * 0.35, d * 0.6, 0, PI2); ctx.fill(); });
    ctx.fillStyle = row % 3 ? '#E5A8A8' : '#D9B26A';
    for (let k = 0; k < 5; k++) { ctx.rotate(PI2 / 5); ctx.beginPath(); ctx.ellipse(0, -u * 0.55, u * 0.32, u * 0.5, 0, 0, PI2); ctx.fill(); }
    ctx.fillStyle = '#C8902E'; ctx.beginPath(); ctx.arc(0, 0, u * 0.22, 0, PI2); ctx.fill();
    ctx.restore();
  }
  WC.granulate(ctx, 0, 0, W, H, 0.18);
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(120,90,40,.18)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/** Mughal-style printed border (red band with florals), ivory centre with a cusped arch. */
function mughalFrame(ctx, W, H) {
  const u = W / 100;
  ctx.fillStyle = '#F6ECDC'; ctx.fillRect(0, 0, W, H);
  WC.granulate(ctx, 0, 0, W, H, 0.15);
  const b = u * 9;
  ctx.save();
  const band = new Path2D(); band.rect(0, 0, W, H); band.rect(b, b, W - 2 * b, H - 2 * b);
  ctx.fillStyle = '#8F1D2C'; ctx.fill(band, 'evenodd');
  ctx.clip(band, 'evenodd');
  // repeat florals along the band
  const R = rng('mband');
  for (let y = b / 2; y < H; y += u * 6) for (const x of [b / 2, W - b / 2]) flowerTile(ctx, x, y, u, R);
  for (let x = b / 2; x < W; x += u * 6) for (const y of [b / 2, H - b / 2]) flowerTile(ctx, x, y, u, R);
  ctx.restore();
  ctx.strokeStyle = '#D8B25E'; ctx.lineWidth = u * 0.35; ctx.strokeRect(b - u * 0.6, b - u * 0.6, W - 2 * b + u * 1.2, H - 2 * b + u * 1.2);
  ctx.lineWidth = u * 0.15; ctx.strokeRect(b + u * 0.8, b + u * 0.8, W - 2 * b - u * 1.6, H - 2 * b - u * 1.6);
  // arch inside
  ctx.save(); ctx.strokeStyle = '#B98A3E'; ctx.lineWidth = u * 0.3;
  arch(ctx, b + u * 4, H - b - u * 3, W - 2 * b - u * 8, H * 0.82); ctx.stroke();
  ctx.lineWidth = u * 0.12; arch(ctx, b + u * 5.5, H - b - u * 4.5, W - 2 * b - u * 11, H * 0.8); ctx.stroke();
  ctx.restore();
  WC.lotus(ctx, W / 2, b + u * 1.5, u * 4.5, { color: '#E38AA0', seed: 'mf' });
  [[b + u * 3, b + u * 3, 0], [W - b - u * 3, b + u * 3, Math.PI / 2], [W - b - u * 3, H - b - u * 3, Math.PI], [b + u * 3, H - b - u * 3, -Math.PI / 2]].forEach(([x, y, r]) => M.floralCorner(ctx, x, y, u * 9, r, { accent: '#B98A3E', flower: '#C0485A', leaf: '#5E8A4A' }));
}
function flowerTile(ctx, x, y, u, R) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#E9C9A8'; for (let k = 0; k < 6; k++) { ctx.rotate(PI2 / 6); ctx.beginPath(); ctx.ellipse(0, -u * 1.1, u * 0.45, u * 0.85, 0, 0, PI2); ctx.fill(); }
  ctx.fillStyle = '#D9A441'; ctx.beginPath(); ctx.arc(0, 0, u * 0.5, 0, PI2); ctx.fill();
  ctx.fillStyle = '#4F7A4A'; ctx.beginPath(); ctx.ellipse(u * 2.2, u * 2.2, u * 0.7, u * 0.3, 0.8, 0, PI2); ctx.fill();
  ctx.restore();
}
function mandalaImg(r, color = '#E9C16A') {
  return cached('mandala2' + color, Math.ceil(r * 2), Math.ceil(r * 2), (c, w) => {
    const R = w / 2; c.translate(R, R);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, '#FBE7A6'); g.addColorStop(0.5, '#D9A441'); g.addColorStop(1, '#B07E2A');
    c.fillStyle = g; c.strokeStyle = g;
    const rings = [[0.16, 8, 0.1], [0.3, 12, 0.12], [0.46, 16, 0.14], [0.63, 24, 0.13], [0.8, 32, 0.12], [0.94, 48, 0.07]];
    rings.forEach(([rr, n, ph], i) => {
      c.lineWidth = R * 0.012; c.beginPath(); c.arc(0, 0, R * rr, 0, PI2); c.stroke();
      for (let k = 0; k < n; k++) {
        c.save(); c.rotate((k / n) * PI2 + (i % 2) * Math.PI / n); c.translate(0, -R * rr);
        c.beginPath();
        if (i % 2 === 0) { c.moveTo(0, 0); c.bezierCurveTo(R * ph * 0.45, -R * ph * 0.3, R * ph * 0.25, -R * ph * 0.9, 0, -R * ph); c.bezierCurveTo(-R * ph * 0.25, -R * ph * 0.9, -R * ph * 0.45, -R * ph * 0.3, 0, 0); c.fill(); }
        else { c.arc(0, -R * ph * 0.5, R * ph * 0.28, 0, PI2); c.lineWidth = R * 0.008; c.stroke(); c.beginPath(); c.arc(0, -R * ph * 0.5, R * ph * 0.1, 0, PI2); c.fill(); }
        c.restore();
      }
    });
    c.beginPath(); c.arc(0, 0, R * 0.08, 0, PI2); c.fill();
  });
}
// ---------------- drawing helpers ----------------
/** Mughal pointed arch path; (x, yb) = bottom-left, w × h. */
function arch(ctx, x, yb, w, h) {
  ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb - h * 0.6);
  ctx.bezierCurveTo(x, yb - h * 0.86, x + w * 0.3, yb - h * 0.9, x + w / 2, yb - h);
  ctx.bezierCurveTo(x + w * 0.7, yb - h * 0.9, x + w, yb - h * 0.86, x + w, yb - h * 0.6);
  ctx.lineTo(x + w, yb); ctx.closePath();
}
/** Draw art (image or video) to cover the box with a Ken-Burns camera. */
function cover(ctx, src, x, y, w, h, { crop = [0, 0, 0, 0], focus = [0.5, 0.5], zoom = 1 } = {}) {
  const sw0 = src.videoWidth || src.naturalWidth || src.width, sh0 = src.videoHeight || src.naturalHeight || src.height;
  if (!sw0 || !sh0) return;
  const cx0 = sw0 * crop[0], cy0 = sh0 * crop[1], cw = sw0 * (1 - crop[0] - crop[2]), ch = sh0 * (1 - crop[1] - crop[3]);
  const k = Math.max(w / cw, h / ch) * zoom;
  const vw = w / k, vh = h / k;
  let sx = cx0 + focus[0] * cw - vw / 2, sy = cy0 + focus[1] * ch - vh / 2;
  sx = Math.max(cx0, Math.min(cx0 + cw - vw, sx)); sy = Math.max(cy0, Math.min(cy0 + ch - vh, sy));
  ctx.drawImage(src, sx, sy, vw, vh, x, y, w, h);
}
const lerp = (a, b, t) => a + (b - a) * t;
function kb(p, a, b) { const e = easeIO(p); return { zoom: lerp(a.z, b.z, e), focus: [lerp(a.f[0], b.f[0], e), lerp(a.f[1], b.f[1], e)] }; }
function scrim(ctx, W, H, from = 'top', alpha = 0.55, reach = 0.5, color = '0,0,0') {
  const g = from === 'top' ? ctx.createLinearGradient(0, 0, 0, H * reach) : ctx.createLinearGradient(0, H, 0, H * (1 - reach));
  g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, from === 'top' ? 0 : H * (1 - reach), W, H * reach);
}
function vignette(ctx, W, H, a = 0.45) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function goldFrame(ctx, x, y, w, h, fw) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = fw * 1.5; ctx.shadowOffsetY = fw * 0.4;
  const p = new Path2D(); p.rect(x - fw, y - fw, w + 2 * fw, h + 2 * fw); p.rect(x, y, w, h);
  ctx.fillStyle = goldGrad(ctx, x - fw, y - fw, x + w + fw, y + h + fw); ctx.fill(p, 'evenodd');
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(90,60,10,.8)'; ctx.lineWidth = Math.max(1, fw * 0.08);
  [0.15, 0.5, 0.85].forEach(f => ctx.strokeRect(x - fw * f, y - fw * f, w + 2 * fw * f, h + 2 * fw * f));
  ctx.fillStyle = goldGrad(ctx, x, y, x + fw * 2, y + fw * 2);
  [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, fw * 0.9, 0, PI2); ctx.fill(); ctx.stroke(); });
  ctx.restore();
}
function sparkles(ctx, W, H, t, n, seed = 's', color = '255,214,130') {
  const R = rng('sp' + seed), u = W / 100;
  for (let i = 0; i < n; i++) {
    const x = R() * W, y0 = R() * H, sp = 0.3 + R(), ph = R() * 6, s = u * (0.3 + R() * 0.9);
    const y = (y0 - t * sp * u * 3 + H * 10) % H;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + R()) + ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 3); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    if (i % 4 === 0) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = `rgba(255,240,200,${a})`; ctx.lineWidth = Math.max(1, s * 0.2); ctx.beginPath(); ctx.moveTo(x - s * 2.4, y); ctx.lineTo(x + s * 2.4, y); ctx.moveTo(x, y - s * 2.4); ctx.lineTo(x, y + s * 2.4); ctx.stroke(); ctx.restore(); }
  }
}
function petals(ctx, W, H, t, n, seed = 'pt', colors = ['#F2A7A0', '#E0575A', '#F6C86A']) {
  const R = rng('pe' + seed), u = W / 100;
  for (let i = 0; i < n; i++) {
    const x = R() * W + Math.sin(t * 0.7 + i) * u * 4, y = ((R() * H + t * (0.3 + R() * 0.5) * u * 7) % (H + u * 8)) - u * 4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(i + t * 0.8); ctx.globalAlpha = 0.8; ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.ellipse(0, 0, u * 0.7, u * 1.1, 0, 0, PI2); ctx.fill(); ctx.restore();
  }
}
function clouds(ctx, W, H, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const R = rng('cl');
  for (let i = 0; i < 18; i++) { const x = R() * W, y = R() * H, r = W * (0.3 + R() * 0.4); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
  ctx.restore();
}

/** Ornate paper "patrika" card. */
function patrikaCard(ctx, x, y, w, h, { red = '#A8172A', paper = '#FBF2DE', rot = 0 } = {}) {
  const u = w / 80;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = u * 6; ctx.shadowOffsetY = u * 2.5;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = 'transparent';
  const tx = cached('patrika' + red + paper, 512, 512, (c, W2, H2) => { c.fillStyle = paper; c.fillRect(0, 0, W2, H2); WC.granulate(c, 0, 0, W2, H2, 0.25); const g = c.createRadialGradient(W2 / 2, H2 / 2, 0, W2 / 2, H2 / 2, W2 * 0.75); g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(140,100,40,.18)'); c.fillStyle = g; c.fillRect(0, 0, W2, H2); });
  ctx.drawImage(tx, 0, 0, w, h);
  const b = u * 4;
  ctx.strokeStyle = red; ctx.lineWidth = u * 1.6; ctx.strokeRect(b, b, w - 2 * b, h - 2 * b);
  ctx.strokeStyle = '#C9A04A'; ctx.lineWidth = u * 0.4; ctx.strokeRect(b + u * 1.6, b + u * 1.6, w - 2 * b - u * 3.2, h - 2 * b - u * 3.2);
  ctx.strokeRect(b - u * 1.4, b - u * 1.4, w - 2 * b + u * 2.8, h - 2 * b + u * 2.8);
  [[b, b], [w - b, b], [b, h - b], [w - b, h - b]].forEach(([cx, cy]) => { ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = red; for (let k = 0; k < 8; k++) { ctx.rotate(PI2 / 8); ctx.beginPath(); ctx.ellipse(0, -u * 2, u * 0.8, u * 1.6, 0, 0, PI2); ctx.fill(); } ctx.fillStyle = '#D9A441'; ctx.beginPath(); ctx.arc(0, 0, u * 1.2, 0, PI2); ctx.fill(); ctx.restore(); });
  ctx.restore();
}
function swastik(ctx, cx, cy, s, p, color = '#C4161C') {
  const segs = [
    [[0, -1], [0, 1]], [[-1, 0], [1, 0]],
    [[0, -1], [1, -1]], [[1, 0], [1, 1]], [[0, 1], [-1, 1]], [[-1, 0], [-1, -1]],
  ];
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.16; ctx.globalAlpha = 0.92;
  const tot = segs.length, k = p * tot;
  segs.forEach(([[a, b], [c, d]], i) => {
    const f = clamp01(k - i); if (f <= 0) return;
    ctx.beginPath(); ctx.moveTo(cx + a * s, cy + b * s); ctx.lineTo(cx + lerp(a, c, f) * s, cy + lerp(b, d, f) * s); ctx.stroke();
  });
  ctx.fillStyle = color;
  if (p > 0.95) [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, s * 0.1, 0, PI2); ctx.fill(); });
  ctx.restore();
}
function rice(ctx, cx, cy, r, t, n = 26) {
  const R = rng('rice');
  for (let i = 0; i < n; i++) {
    const a = R() * PI2, d = r * Math.sqrt(R()), fall = clamp01(t * 1.5 - R() * 0.8);
    if (fall <= 0) continue;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d - (1 - ease(fall)) * r * 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = i % 5 ? '#F3EAD2' : '#E0B040'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.03, r * 0.012, 0, 0, PI2); ctx.fill(); ctx.restore();
  }
}
/** Golden scroll; open 0..1 controls how much paper is visible. Returns the paper rect. */
function scroll(ctx, cx, cy, w, h, open) {
  const pw = w * Math.max(0.02, easeIO(open)), u = w / 100;
  const x0 = cx - pw / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = u * 4; ctx.shadowOffsetY = u * 1.5;
  ctx.fillStyle = '#F3E2BC'; ctx.fillRect(x0, cy - h / 2, pw, h);
  ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(x0, 0, x0 + pw, 0); g.addColorStop(0, 'rgba(120,80,20,.35)'); g.addColorStop(0.08, 'rgba(0,0,0,0)'); g.addColorStop(0.92, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,80,20,.35)');
  ctx.fillStyle = g; ctx.fillRect(x0, cy - h / 2, pw, h);
  WC.granulate(ctx, x0, cy - h / 2, pw, h, 0.2);
  ctx.strokeStyle = '#B8862E'; ctx.lineWidth = u * 0.5; ctx.strokeRect(x0 + u * 2, cy - h / 2 + u * 3, Math.max(0, pw - u * 4), h - u * 6);
  [x0, x0 + pw].forEach(rx => {
    const rg = ctx.createLinearGradient(rx - u * 3, 0, rx + u * 3, 0); GOLD.forEach((c, i) => rg.addColorStop(i / 4, c));
    ctx.fillStyle = rg; ctx.fillRect(rx - u * 3, cy - h / 2 - u * 4, u * 6, h + u * 8);
    ctx.fillStyle = '#9A2A1E'; [cy - h / 2 - u * 6, cy + h / 2 + u * 6].forEach(ky => { ctx.beginPath(); ctx.arc(rx, ky, u * 3, 0, PI2); ctx.fill(); });
  });
  if (open < 0.05) { ctx.fillStyle = '#B0152A'; ctx.fillRect(cx - u * 4, cy - u * 1.2, u * 8, u * 2.4); }
  ctx.restore();
  return { x: x0 + u * 4, y: cy - h / 2 + u * 5, w: Math.max(0, pw - u * 8), h: h - u * 10 };
}
/** A rolled golden scroll tied with red thread, centred at (x, y). */
function rolled(ctx, x, y, len, r) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = r * 1.5; ctx.shadowOffsetY = r * 0.5;
  const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#FFF0C0'); g.addColorStop(0.35, '#E9C46A'); g.addColorStop(0.7, '#B8862E'); g.addColorStop(1, '#7A5418');
  ctx.fillStyle = g; ctx.fillRect(-len / 2, -r, len, 2 * r);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#F3E2BC'; [-1, 1].forEach(d => { ctx.beginPath(); ctx.ellipse(d * len / 2, 0, r * 0.35, r, 0, 0, PI2); ctx.fill(); ctx.strokeStyle = '#B8862E'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.ellipse(d * len / 2, 0, r * 0.2, r * 0.6, 0, 0, PI2); ctx.stroke(); });
  ctx.fillStyle = '#B0152A'; ctx.fillRect(-r * 0.5, -r * 1.02, r, r * 2.04);
  ctx.strokeStyle = '#B0152A'; ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(r * 0.8, r * 2, r * 0.3, r * 3); ctx.moveTo(0, r); ctx.quadraticCurveTo(-r * 0.6, r * 2.2, -r * 0.2, r * 3.2); ctx.stroke();
  ctx.restore();
}
/** Carved wooden doors; p = 0 closed … 1 fully open. */
function doors(ctx, W, H, p) {
  const door = cached('door', Math.ceil(W / 2), H, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#3B2414'); g.addColorStop(0.5, '#6A4428'); g.addColorStop(1, '#2E1B0E'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const R = rng('wood'); c.strokeStyle = 'rgba(20,10,5,.35)';
    for (let i = 0; i < 90; i++) { const x = R() * w; c.lineWidth = 1 + R() * 2; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + R() * 20 - 10, h * 0.3, x + R() * 20 - 10, h * 0.7, x + R() * 10 - 5, h); c.stroke(); }
    const m = w * 0.12;
    [[m, h * 0.06, w - 2 * m, h * 0.38], [m, h * 0.5, w - 2 * m, h * 0.42]].forEach(([x, y, pw, ph]) => {
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = w * 0.02; c.strokeRect(x, y, pw, ph);
      c.strokeStyle = 'rgba(255,200,140,.18)'; c.lineWidth = w * 0.008; c.strokeRect(x + w * 0.02, y + w * 0.02, pw - w * 0.04, ph - w * 0.04);
      M.mandala(c, x + pw / 2, y + ph / 2, Math.min(pw, ph) * 0.32, 'rgba(255,210,150,.28)', { rings: 4 });
    });
    for (let i = 0; i < 6; i++) for (const y of [h * 0.03, h * 0.97]) { c.fillStyle = '#C9A04A'; c.beginPath(); c.arc(w * (0.12 + i * 0.15), y, w * 0.018, 0, PI2); c.fill(); }
    c.strokeStyle = '#C9A04A'; c.lineWidth = w * 0.022; c.beginPath(); c.arc(w * 0.88, h * 0.47, w * 0.06, 0, PI2); c.stroke();
    c.fillStyle = '#B08A3A'; c.beginPath(); c.arc(w * 0.88, h * 0.42, w * 0.03, 0, PI2); c.fill();
  });
  const e = easeIO(p);
  // light from behind
  if (p > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * (0.2 + e)); g.addColorStop(0, `rgba(255,248,225,${0.95 * e})`); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const dw = W / 2 * (1 - e * 0.92);
  ctx.save(); ctx.globalAlpha = 1 - e * 0.15;
  ctx.drawImage(door, 0, 0, dw, H);
  ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(door, 0, 0, dw, H); ctx.restore();
  ctx.fillStyle = `rgba(0,0,0,${0.5 * e})`; ctx.fillRect(0, 0, dw, H); ctx.fillRect(W - dw, 0, dw, H);
  ctx.restore();
}
/** Photo as a sticker: transparent PNGs get a white cut-out outline, others a white polaroid border. */
const stickerCache = new WeakMap();
function stickerOf(img) {
  if (stickerCache.has(img)) return stickerCache.get(img);
  const w = img.naturalWidth, h = img.naturalHeight, pad = Math.round(Math.max(w, h) * 0.04);
  const c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad * 2; const x = c.getContext('2d');
  // detect transparency
  const probe = document.createElement('canvas'); probe.width = 32; probe.height = 32; const px = probe.getContext('2d'); px.drawImage(img, 0, 0, 32, 32);
  const d = px.getImageData(0, 0, 32, 32).data; let clear = 0; for (let i = 3; i < d.length; i += 4) if (d[i] < 200) clear++;
  const cut = clear > 40;
  if (cut) {
    const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height; const s = sil.getContext('2d');
    s.drawImage(img, pad, pad); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#fff'; s.fillRect(0, 0, sil.width, sil.height);
    const r = pad * 0.8;
    for (let k = 0; k < 24; k++) { const a = (k / 24) * PI2; x.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
    x.drawImage(img, pad, pad);
  } else {
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, pad, pad);
  }
  const out = { c, cut }; stickerCache.set(img, out); return out;
}
function drawSticker(ctx, img, cx, by, maxW, maxH, { rot = 0, s = 1, shadow = true } = {}) {
  if (!img) return;
  const st = stickerOf(img); const k = Math.min(maxW / st.c.width, maxH / st.c.height) * s;
  const w = st.c.width * k, h = st.c.height * k;
  ctx.save(); ctx.translate(cx, by - h / 2); ctx.rotate(rot);
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = w * 0.04; ctx.shadowOffsetY = w * 0.015; }
  ctx.drawImage(st.c, -w / 2, -h / 2, w, h);
  ctx.restore();
  return { w, h };
}
/** Simple doodle stickers. */
function doodle(ctx, kind, x, y, s, rot = 0, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + Math.sin(t * 2 + x) * 0.05);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const out = () => { ctx.lineWidth = s * 0.18; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.lineWidth = s * 0.05; ctx.strokeStyle = '#3A2A2A'; ctx.stroke(); };
  ctx.beginPath();
  if (kind === 'star') { for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.42 : s; const a = -Math.PI / 2 + (i / 10) * PI2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); out(); ctx.fillStyle = '#F6C445'; ctx.fill(); }
  else if (kind === 'heart') { ctx.moveTo(0, s * 0.8); ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.4); ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.3, -s * 0.1, 0, s * 0.8); out(); ctx.fillStyle = '#E2425A'; ctx.fill(); }
  else if (kind === 'crown') { ctx.moveTo(-s, s * 0.5); ctx.lineTo(-s, -s * 0.4); ctx.lineTo(-s * 0.5, s * 0.05); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s * 0.5, s * 0.05); ctx.lineTo(s, -s * 0.4); ctx.lineTo(s, s * 0.5); ctx.closePath(); out(); ctx.fillStyle = '#E9B83A'; ctx.fill(); }
  else if (kind === 'sparkle') { ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0); ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s); ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0); ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s); out(); ctx.fillStyle = '#FFF1B8'; ctx.fill(); }
  else if (kind === 'cup') { ctx.rect(-s * 0.6, -s * 0.5, s * 1.1, s * 1.1); out(); ctx.fillStyle = '#C98A5A'; ctx.fill(); ctx.beginPath(); ctx.arc(s * 0.6, 0, s * 0.3, -1.4, 1.4); ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#3A2A2A'; ctx.stroke(); }
  else if (kind === 'note') { ctx.arc(-s * 0.3, s * 0.5, s * 0.32, 0, PI2); out(); ctx.fillStyle = '#7A5AC8'; ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * 0.02, s * 0.5); ctx.lineTo(-s * 0.02, -s * 0.8); ctx.lineTo(s * 0.6, -s * 0.5); ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#3A2A2A'; ctx.stroke(); }
  else if (kind === 'plane') { ctx.moveTo(-s, 0); ctx.lineTo(s, -s * 0.5); ctx.lineTo(-s * 0.2, s * 0.6); ctx.lineTo(-s * 0.1, s * 0.05); ctx.closePath(); out(); ctx.fillStyle = '#7FB6E8'; ctx.fill(); }
  else if (kind === 'flower') { for (let k = 0; k < 5; k++) { const a = (k / 5) * PI2; ctx.moveTo(0, 0); ctx.ellipse(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.4, s * 0.28, a, 0, PI2); } out(); ctx.fillStyle = '#F49AB8'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, PI2); ctx.fillStyle = '#F6C445'; ctx.fill(); }
  ctx.restore();
}
function tagLabel(ctx, fs, text, x, y, size, { rot = 0, bg = '#FFFFFF', color = '#3A2A2A', role = 'hand' } = {}) {
  if (!text) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = role === 'hand' ? `${size}px "Amita", cursive` : `600 ${size}px "Cinzel", serif`;
  const w = ctx.measureText(text).width + size * 1.1, h = size * 1.5;
  if (bg) { ctx.fillStyle = bg; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = size * 0.4; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -h / 2, w, h, h / 2) : ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.shadowColor = 'transparent'; }
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * 0.08);
  ctx.restore();
}
function tulip(ctx, x, y, s, rot, color = '#D9443F') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = '#5E8A3E'; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.quadraticCurveTo(s * 0.1, s * 1.5, -s * 0.2, s * 3); ctx.stroke();
  const leaf = new Path2D(); leaf.moveTo(-s * 0.1, s * 2.6); leaf.quadraticCurveTo(-s * 1.2, s * 1.6, -s * 0.9, s * 0.8); leaf.quadraticCurveTo(-s * 0.4, s * 1.8, -s * 0.1, s * 2.6);
  WC.paint(ctx, leaf, '#6E9A4A', { edge: 0.4, seed: 'tl' + s, box: [-s * 1.2, s * 0.8, s * 1.2, s * 1.8] });
  const head = new Path2D(); head.moveTo(-s * 0.55, -s * 0.2); head.quadraticCurveTo(-s * 0.7, s * 0.5, 0, s * 0.45); head.quadraticCurveTo(s * 0.7, s * 0.5, s * 0.55, -s * 0.2);
  head.lineTo(s * 0.35, -s * 0.75); head.lineTo(s * 0.12, -s * 0.3); head.lineTo(0, -s * 0.85); head.lineTo(-s * 0.12, -s * 0.3); head.lineTo(-s * 0.35, -s * 0.75); head.closePath();
  WC.paint(ctx, head, color, { edge: 0.5, light: 0.35, seed: 'th' + s, box: [-s * 0.7, -s * 0.85, s * 1.4, s * 1.4] });
  ctx.restore();
}
function cypress(ctx, x, base, h) {
  const p = new Path2D(); p.moveTo(x, base - h); p.bezierCurveTo(x + h * 0.14, base - h * 0.6, x + h * 0.12, base - h * 0.15, x, base); p.bezierCurveTo(x - h * 0.12, base - h * 0.15, x - h * 0.14, base - h * 0.6, x, base - h);
  WC.paint(ctx, p, '#4E6E4A', { edge: 0.4, light: 0.25, seed: 'cy' + Math.round(x), box: [x - h * 0.14, base - h, h * 0.28, h] });
}

// ---------------- templates ----------------
const L = (en, hi) => ({ en, hi: hi ?? en });
export const ART_TEMPLATES = [
  {
    id: 'mangal-patrika', name: 'Mangal Patrika', sub: 'Ganesh & Kailash blessing card', deity: 'Shri Ganesh · Shiv–Parvati', tag: 'Realistic',
    desc: 'Ravi Varma’s Kailash painting opens through clouds, Ganesh blesses the card, a kumkum swastik is drawn and the patrika reveals every function.',
    ref: 'DeiteC6ICNL', lang: 'hi', verse: 'ganesh-gan', track: 'shehnai',
    slots: [
      { id: 'kailash', label: 'Opening (Kailash)', def: 'kailash-family', prompt: 'kailash-dawn' },
      { id: 'ganesha', label: 'Ganesh blessing', def: 'shiva-parvati-ganesha', prompt: 'ganesha-blessing' },
      { id: 'messenger', label: 'Card scene background', def: 'shiva-parvati-ganesha', prompt: 'mushak-messenger' },
      { id: 'closing', label: 'Closing', def: 'kailash-family', prompt: 'parvati-ganesha' },
    ],
    copy: { open: L('|| Shri Ganeshaya Namah ||', '॥ श्री गणेशाय नमः ॥'), blessIntro: L('With the blessings of Shri Ganesh', 'श्री गणेश के आशीर्वाद से'), shubh: L('Shubh Vivah', 'शुभविवाह'), close: L('Your presence is our blessing', 'आपकी उपस्थिति ही हमारा आशीर्वाद है') },
    scenes: ['patrikaOpen', 'patrikaVerse', 'patrikaCard', 'patrikaSwastik', 'patrikaEvents', 'patrikaFamily', 'patrikaClose'],
  },
  {
    id: 'divya-sandesh', name: 'Divya Sandesh', sub: 'A divine messenger to Kailash', deity: 'Shiv & Parvati · Nandi', tag: 'Realistic',
    desc: 'A golden scroll travels to Kailash, Shiv and Parvati appear in a Ravi Varma painting, and the scroll unrolls with your invitation.',
    ref: 'DYOXM9Yq6Dq', lang: 'en', verse: 'shiv-namah', track: 'sitar',
    slots: [
      { id: 'journey', label: 'Scroll journey (your AI clip of hands / eagle)', def: 'shiva-parvati-nandi', prompt: 'eagle-scroll', alt: ['bride-hands', 'nandi-scroll'] },
      { id: 'divine', label: 'Shiv & Parvati', def: 'shiva-parvati-nandi', prompt: 'shiva-parvati-kailash' },
      { id: 'family', label: 'Blessing scene', def: 'kailash-family', prompt: 'parvati-ganesha' },
    ],
    copy: { open: L('A sacred message from the Himalayas', 'हिमालय से एक पावन संदेश'), divine: L('With the blessings of Mahadev & Maa Parvati', 'महादेव एवं माँ पार्वती के आशीर्वाद से'), invite: L('request the honour of your presence at the wedding of', 'के शुभ विवाह में आप सादर आमंत्रित हैं'), close: L('Har Har Mahadev', 'हर हर महादेव') },
    scenes: ['scrollJourney', 'divineReveal', 'scrollInvite', 'scrollEvents', 'divineBless', 'scrollClose'],
  },
  {
    id: 'shahi-lal', name: 'Shahi Lal Patrika', sub: 'Royal red & gold card video', deity: 'Shri Ganesh', tag: 'Trending',
    desc: 'Carved doors open to golden light, Ganesh in a gold frame, rotating mandalas on red velvet, and gold pages for dates and families.',
    ref: 'DTc_slqEeaU', lang: 'hi', verse: 'ganesh', track: 'baraat',
    slots: [
      { id: 'deity', label: 'Deity in gold frame', def: 'shiva-parvati-ganesha', prompt: 'ganesha-blessing' },
      { id: 'couple', label: 'Couple / deity picture on the main page', def: 'sita-swayamvar', prompt: 'couple-photo', photo: 'couple' },
    ],
    copy: { banner: L('Shubh Vivah', 'शुभ विवाह'), date: L('Date', 'दिनांक'), day: L('Day', 'दिन'), time: L('Time', 'समय'), venue: L('Venue', 'स्थल'), close: L('We eagerly await your arrival', 'आपके आगमन की प्रतीक्षा में') },
    scenes: ['doorsOpen', 'deityFrame', 'redMain', 'redEvents', 'redLists', 'redClose'],
  },
  {
    id: 'pichwai-utsav', name: 'Pichwai Save the Date', sub: 'Vrindavan-inspired, multi-day', deity: 'Radha & Krishna', tag: 'Realistic',
    desc: 'Red velvet opens to an ivory floral pichwai page with Ravi Varma’s Radha–Krishna in a Mughal arch, cypress trees, lotuses and a gold floral monogram.',
    ref: 'DRtjcpPCS1O', lang: 'en', verse: 'none', track: 'bansuri',
    slots: [{ id: 'art', label: 'Radha–Krishna artwork', def: 'krishna-radha', prompt: 'krishna-hand-lotus', alt: ['radha-krishna'] }],
    copy: { save: L('Save the Date', 'तिथि सुरक्षित रखें'), for: L('FOR THE WEDDING CELEBRATIONS OF', 'के विवाह उत्सव हेतु'), follow: L('FORMAL INVITATION TO FOLLOW', 'औपचारिक निमंत्रण शीघ्र') },
    scenes: ['velvetOpen', 'pichSave', 'pichNames', 'pichDates', 'velvetMonogram'],
  },
  {
    id: 'meet-couple', name: 'Meet the Couple', sub: 'Photo sticker reel', deity: 'Your photos', tag: 'Trending',
    desc: 'Your photos as cut-out stickers on crumpled paper with doodles, each partner’s intro, then the date and your hashtag. Add PNG cut-outs for the best look.',
    ref: 'DZAzszCMUtb', lang: 'en', verse: 'none', track: 'mehendi', photos: true,
    slots: [
      { id: 'p-couple', label: 'Couple photo', photo: 'couple', prompt: 'couple-photo' },
      { id: 'p-bride', label: 'Bride photo', photo: 'bride', prompt: 'couple-photo' },
      { id: 'p-groom', label: 'Groom photo', photo: 'groom', prompt: 'couple-photo' },
    ],
    copy: { meet: L('MEET THE', 'मिलिए'), couple: L('Couple', 'जोड़ी से') },
    scenes: ['meetTitle', 'meetBride', 'meetGroom', 'meetDate'],
  },
  {
    id: 'ghar-ka-beta', name: 'Ghar Ka Beta', sub: 'Fun Roka / engagement save the date', deity: 'Your photos', tag: 'Viral',
    desc: 'A Mughal frame, “Meet ghar ka chota beta” and “ghar ki laadli” with handwritten personality tags, then the save-the-date with tulips.',
    ref: 'DeJ222uvHKu', lang: 'en', verse: 'none', track: 'dholki', photos: true,
    slots: [
      { id: 'p-groom', label: 'Groom photo', photo: 'groom', prompt: 'couple-photo' },
      { id: 'p-bride', label: 'Bride photo', photo: 'bride', prompt: 'couple-photo' },
    ],
    copy: { meetG1: L('MEET', 'मिलिए'), meetG2: L('GHAR KA CHOTA BETA', 'घर का छोटा बेटा'), meetB2: L('GHAR KI LAADLI BETI', 'घर की लाडली बेटी'), t1: L('YOU JUST KNOW...', 'बस पता चल जाता है...'), t2: L('SOMETHING SPECIAL', 'कुछ ख़ास'), t3: L('HAPPENS WHEN OPPOSITES ATTRACT', 'होता है जब दो अलग दिल मिलते हैं'), save: L('Save the Date', 'तिथि सुरक्षित रखें'), for: L('FOR THE ROKA CEREMONY OF', 'रोका समारोह'), },
    scenes: ['bhaiIntro', 'beti', 'opposites', 'rokaDate', 'tulipsEnd'],
  },
];
export const ART_MAP = Object.fromEntries(ART_TEMPLATES.map(t => [t.id, t]));
export const isArtTemplate = id => !!ART_MAP[id];

export function artDefaults(tpl) {
  return {
    copy: Object.fromEntries(Object.entries(tpl.copy).map(([k, v]) => [k, { ...v }])),
    blessings: L('|| Shri Ganeshaya Namah ||\n|| Shri Kuldevta Prasanna ||', '॥ श्री गणेशाय नमः ॥\n॥ श्री कुलदेवता प्रसन्न ॥\n॥ श्री कुलस्वामिनी प्रसन्न ॥'),
    honor: { bride: L('', 'चि. सौ. कां.'), groom: L('', 'चि.') },
    traits: { groom: 'Shy, Introvert, Comedian, Foodie', bride: 'Desi Diva, Drama Queen, Chai Lover' },
    lists: [
      { title: L('With best compliments', 'दर्शनाभिलाषी'), names: L('The Sharma family\nThe Kapoor family', 'समस्त शर्मा परिवार\nसमस्त कपूर परिवार') },
      { title: L('Eagerly awaiting you', 'स्वागतोत्सुक'), names: L('All our friends & relatives', 'समस्त मित्रगण एवं परिजन') },
    ],
  };
}

// ---------------- timeline ----------------
export class ArtReelTimeline {
  constructor(design, W, H) {
    this.design = design; this.W = W; this.H = H; this.u = W / 100;
    this.st = design.story;
    this.tpl = ART_MAP[this.st.template] || ART_TEMPLATES[0];
    this.fs = FONT_SETS[this.st.fonts] || FONT_SETS.classic;
    this.lg = design.lang === 'hi' ? 'hi' : 'en';
    this.ad = { ...artDefaults(this.tpl), ...(this.st.art || {}) };
    this.ad.copy = { ...artDefaults(this.tpl).copy, ...(this.st.art?.copy || {}) };
    this.imgs = {}; this.clips = {};
    const S = [];
    const add = (kind, dur, data) => S.push({ kind, dur: dur * (this.st.length === 'extended' ? 1.2 : 1), data });
    const ev = design.events || [];
    const groups = []; ev.forEach(e => { const l = groups[groups.length - 1]; if (l && l.length < 3 && l[0].date === e.date && (l[0].venue || '') === (e.venue || '')) l.push(e); else groups.push([e]); });
    const lists = (this.ad.lists || []).filter(x => (x.names?.en || x.names?.hi));
    for (const k of this.tpl.scenes) {
      if (k === 'patrikaEvents' || k === 'redEvents' || k === 'scrollEvents') { const g2 = groups.length > 4 ? pairGroups(groups) : groups; g2.slice(0, 5).forEach(g => add(k, 4.4, mergeSame(g))); }
      else if (k === 'redLists') lists.slice(0, 3).forEach(l => add(k, 4.6, l));
      else if (k === 'patrikaFamily') { if (lists.length || design.family.brideParents.en) add(k, 5, lists); }
      else add(k, DUR[k] || 4.5);
    }
    let t = 0; S.forEach(s => { s.start = t; t += s.dur; });
    this.scenes = S; this.total = t; this.XF = 0.7;
  }
  sceneCanvas() { return null; }
  sceneAt(t) { let i = this.scenes.findIndex(s => t < s.start + s.dur); if (i < 0) i = this.scenes.length - 1; return i; }
  slotSpec(id) {
    const slot = this.tpl.slots.find(s => s.id === id); if (!slot) return null;
    const user = this.design.artSlots?.[this.tpl.id + ':' + id];
    if (user?.kind === 'video') return { kind: 'video', key: user.key, crop: [0, 0, 0, 0], focus: [0.5, 0.5] };
    if (user?.src) return { kind: 'image', src: user.src, crop: [0, 0, 0, 0], focus: [0.5, 0.45], user: true };
    if (slot.photo) { const ph = this.design.photos?.[slot.photo]; if (ph?.src) return { kind: 'image', src: ph.src, crop: [0, 0, 0, 0], focus: [0.5, 0.4], photo: true }; }
    const a = slot.def && ART[slot.def]; if (a) return { kind: 'image', src: a.file, crop: a.crop, focus: a.focus, art: slot.def };
    return null;
  }
  async ready(getBlob) {
    const jobs = [];
    for (const s of this.tpl.slots) {
      const sp = this.slotSpec(s.id); if (!sp) continue;
      if (sp.kind === 'image') jobs.push(loadImg(sp.src).then(im => (this.imgs[s.id] = im && { im, ...sp })));
      else if (sp.kind === 'video' && getBlob) jobs.push(getBlob(sp.key).then(b => b && new Promise(res => {
        const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(b);
        v.onloadeddata = () => { this.clips[s.id] = { v, ...sp }; res(); }; v.onerror = () => res();
      })));
    }
    for (const k of ['couple', 'bride', 'groom']) { const p = this.design.photos?.[k]; if (p?.src) jobs.push(loadImg(p.src).then(im => (this.imgs['photo:' + k] = im && { im }))); }
    await Promise.all(jobs);
  }
  /** Seek uploaded clips for frame-accurate export. */
  async prepare(t) {
    const ids = Object.keys(this.clips); if (!ids.length) return;
    const sc = this.scenes[this.sceneAt(t)], local = t - sc.start;
    await Promise.all(ids.map(id => { const { v } = this.clips[id]; const tt = local % Math.max(0.1, v.duration || 1); if (Math.abs(v.currentTime - tt) < 0.02) return null; return new Promise(r => { v.onseeked = r; v.currentTime = tt; setTimeout(r, 400); }); }));
  }
  /** Real-time playback (preview / MediaRecorder): keep uploaded clips playing in a loop. */
  liveSync() { Object.values(this.clips).forEach(({ v }) => { if (v.paused) { v.loop = true; v.play().catch(() => { }); } }); }
  stopClips() { Object.values(this.clips).forEach(({ v }) => v.pause()); }
  src(id) { return this.clips[id] || this.imgs[id] || null; }
  photo(k) { return this.imgs['photo:' + k]?.im || null; }
  T(o) { return (this.lg === 'hi' ? (o?.hi || o?.en) : (o?.en || o?.hi)) || ''; }
  copy(k) { return this.T(this.ad.copy[k]); }
  names() {
    const c = this.design.couple, pick = o => this.T(o);
    const b = pick(c.useFull ? c.brideFull : c.bride) || pick(c.bride), g = pick(c.useFull ? c.groomFull : c.groom) || pick(c.groom);
    const first = c.order === 'groom' ? g : b, second = c.order === 'groom' ? b : g;
    return { b, g, first, second, bs: pick(c.bride), gs: pick(c.groom) };
  }
  draw(ctx, t) {
    const { W, H } = this;
    t = Math.min(Math.max(0, t), this.total - 0.001);
    const i = this.sceneAt(t), sc = this.scenes[i], local = t - sc.start;
    this.scene(ctx, sc, local, t);
    const prev = this.scenes[i - 1];
    if (prev && local < this.XF) { ctx.save(); ctx.globalAlpha = 1 - easeIO(local / this.XF); this.scene(ctx, prev, prev.dur - 0.001, t); ctx.restore(); }
    if (i === this.scenes.length - 1 && this.st.showCredit !== false) {
      const cr = artCredits(this.design);
      if (cr.length) { const txt = 'Art: ' + [...new Set(cr.map(a => `${a.artist}${/CC BY/.test(a.license) ? ' / Wellcome Collection, CC BY 4.0' : ' (public domain)'}`))].join(' · '); line(ctx, this.fs, txt, W / 2, H * 0.975, { role: 'body', size: this.u * 1.7, color: '#F3E6D2', alpha: 0.8 * clamp01(local / 0.6), maxW: W * 0.94, shadow: 'rgba(0,0,0,.6)' }); }
    }
    const fin = Math.min(1, t / 0.8, (this.total - t) / 1.1);
    if (fin < 1) { ctx.save(); ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, fin)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  scene(ctx, sc, local, t) {
    const fn = SCENES[sc.kind]; if (!fn) return;
    ctx.save(); fn(this, ctx, sc, local, t, clamp01(local / sc.dur)); ctx.restore();
  }
  // text shorthand
  L(ctx, text, x, y, o) { return line(ctx, this.fs, text, x, y, { maxW: this.W * 0.84, ...o }); }
  art(ctx, id, p, a = { z: 1.15, f: null }, b = { z: 1.02, f: null }, box = null) {
    const s = this.src(id); const { W, H } = this;
    if (!s) { ctx.fillStyle = '#2A1A14'; ctx.fillRect(0, 0, W, H); return false; }
    const el = s.v || s.im;
    const f = s.focus || [0.5, 0.5];
    const cam = kb(p, { z: a.z, f: a.f || f }, { z: b.z, f: b.f || f });
    const [x, y, w, h] = box || [0, 0, W, H];
    cover(ctx, el, x, y, w, h, { crop: s.crop, focus: cam.focus, zoom: cam.zoom });
    return true;
  }
  eventLines(e) {
    const lg = this.lg, d = dateParts(e.date || this.design.wedding.date, lg);
    const date = d ? (lg === 'hi' ? `${d.day} ${d.rest}` : `${d.day}${d.sup} ${d.rest}`) : '';
    return { name: this.T(e.name), date, wk: d?.wk || '', time: timePhrase(e.start, lg, true), venue: e.venue || '', addr: e.address || '', tithi: e.tithi || '' };
  }
}
function mergeSame(g) {
  const out = [];
  g.forEach(e => { const l = out.find(x => x.date === e.date && x.start === e.start && (x.venue || '') === (e.venue || '')); if (l) l.name = { en: [l.name.en, e.name.en].filter(Boolean).join(' & '), hi: [l.name.hi, e.name.hi].filter(Boolean).join(' & ') }; else out.push({ ...e, name: { ...e.name } }); });
  return out;
}
function pairGroups(gs) { const o = []; gs.forEach(g => { const l = o[o.length - 1]; if (l && l.length + g.length <= 3) l.push(...g); else o.push([...g]); }); return o; }
// estimated height of one event block (for vertical centring)
function evHeight(L2, v, full) { return v * (11 + 7 + (L2.time ? 7 : 0) + (L2.tithi ? 6.5 : 0) + (L2.venue ? 7 : 0) + (L2.addr && full ? 6 : 0) + 9); }
const DUR = { patrikaOpen: 4.5, patrikaVerse: 5, patrikaCard: 6.5, patrikaSwastik: 4.5, patrikaClose: 5, scrollJourney: 5, divineReveal: 5.5, scrollInvite: 7, divineBless: 5, scrollClose: 4, doorsOpen: 4, deityFrame: 4.5, redMain: 5.5, redClose: 4.5, velvetOpen: 3, pichSave: 6, pichNames: 6, pichDates: 6.5, velvetMonogram: 4.5, meetTitle: 3.6, meetBride: 4, meetGroom: 4, meetDate: 4.6, bhaiIntro: 5, beti: 5, opposites: 4.5, rokaDate: 6, tulipsEnd: 3.5 };

// shared text colours
const RED = '#A8172A', MAROON = '#7A1020', GOLDT = '#E9C46A', DARK = '#4A2A1A';

const SCENES = {
  // ---------- Mangal Patrika ----------
  patrikaOpen(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    tl.art(ctx, 'kailash', p, { z: 1.7, f: [0.5, 0.1] }, { z: 1.08 });
    clouds(ctx, W, H, 1 - ease(local / 2.6));
    scrim(ctx, W, H, 'top', 0.5, 0.4);
    tl.L(ctx, tl.copy('open'), W / 2, H * 0.12, { role: 'deva', size: u * 6, color: GOLDT, alpha: rev(local, 1.2, 1.2), shadow: 'rgba(0,0,0,.7)' });
    petals(ctx, W, H, t, 10, 'po');
  },
  patrikaVerse(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    tl.art(ctx, 'ganesha', p, { z: 1.12 }, { z: 1.32, f: [0.33, 0.45] });
    scrim(ctx, W, H, 'top', 0.65, 0.45); scrim(ctx, W, H, 'bottom', 0.5, 0.3);
    const verse = tl.design.wording.invocation && tl.design.wording.invocation !== 'none' ? invocationText(tl.design, 'hi') : '';
    let y = H * 0.1;
    verse.split('\n').slice(0, 2).forEach((l, j) => { tl.L(ctx, l, W / 2, y, { role: 'deva', size: u * 5, color: GOLDT, alpha: rev(local, 0.4 + j * 0.4, 1), shadow: 'rgba(0,0,0,.8)' }); y += u * 7; });
    tl.L(ctx, tl.copy('blessIntro'), W / 2, H * 0.92, { role: 'italic', size: u * 4.4, color: '#FFF4DC', alpha: rev(local, 1.4), shadow: 'rgba(0,0,0,.8)' });
    sparkles(ctx, W, H, t, 26, 'pv');
  },
  patrikaCard(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.save(); ctx.filter = `blur(${u * 0.8}px)`; tl.art(ctx, 'messenger', p, { z: 1.25 }, { z: 1.3 }); ctx.restore();
    ctx.fillStyle = 'rgba(30,10,5,.45)'; ctx.fillRect(0, 0, W, H);
    const cw = W * 0.82, ch = H * 0.66, rise = (1 - ease(local / 1.1)) * H * 0.7;
    const cx = (W - cw) / 2, cy = H * 0.17 + rise;
    patrikaCard(ctx, cx, cy, cw, ch, { rot: (1 - ease(local / 1.3)) * 0.12 });
    const N = tl.names(), lg = tl.lg;
    let y = cy + ch * 0.12;
    tl.T(tl.ad.blessings).split('\n').filter(Boolean).slice(0, 4).forEach((l, j) => { tl.L(ctx, l, W / 2, y, { role: 'deva', size: u * 4.2, color: RED, alpha: rev(local, 1.1 + j * 0.25), maxW: cw * 0.85 }); y += u * 6.2; });
    y += u * 9;
    const hb = tl.T(tl.ad.honor.bride), hg = tl.T(tl.ad.honor.groom);
    const firstIsBride = tl.design.couple.order !== 'groom';
    const h1 = firstIsBride ? hb : hg, h2 = firstIsBride ? hg : hb;
    tl.L(ctx, `${h1 ? h1 + ' ' : ''}${N.first}`, W / 2, y + u * 4, { role: 'heavy', size: u * 10.5, color: MAROON, alpha: rev(local, 2.2), maxW: cw * 0.86 });
    y += u * 18;
    tl.L(ctx, tl.copy('shubh'), W / 2, y, { role: lg === 'hi' ? 'heavy' : 'script', size: u * (lg === 'hi' ? 12.5 : 13), color: RED, alpha: rev(local, 2.8), maxW: cw * 0.86 });
    y += u * 18;
    tl.L(ctx, `${h2 ? h2 + ' ' : ''}${N.second}`, W / 2, y, { role: 'heavy', size: u * 10.5, color: MAROON, alpha: rev(local, 3.4), maxW: cw * 0.86 });
    const m = mainEventOf(tl.design); const el = m && tl.eventLines(m);
    if (el?.date) tl.L(ctx, `${el.date}${el.venue ? ' · ' + el.venue : ''}`, W / 2, cy + ch * 0.92, { role: 'body', size: u * 3.9, color: DARK, alpha: rev(local, 4), maxW: cw * 0.84 });
  },
  patrikaSwastik(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.fillStyle = '#3A1A10'; ctx.fillRect(0, 0, W, H);
    const z = 1 + 0.18 * easeIO(p);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    patrikaCard(ctx, W * 0.06, H * 0.1, W * 0.88, H * 0.8);
    swastik(ctx, W / 2, H * 0.44, u * 14, clamp01((local - 0.4) / 2.4));
    rice(ctx, W / 2, H * 0.44, u * 26, clamp01((local - 2.4) / 1.6));
    ctx.restore();
    tl.L(ctx, tl.lg === 'hi' ? '॥ शुभ मंगल सावधान ॥' : 'Shubh Mangal Saavdhan', W / 2, H * 0.76, { role: tl.lg === 'hi' ? 'heavy' : 'script', size: u * 7, color: RED, alpha: rev(local, 2.8) });
  },
  patrikaEvents(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.save(); ctx.filter = `blur(${u}px)`; tl.art(ctx, 'messenger', 0.5, { z: 1.3 }, { z: 1.3 }); ctx.restore();
    ctx.fillStyle = 'rgba(30,10,5,.5)'; ctx.fillRect(0, 0, W, H);
    const cw = W * 0.84, ch = H * 0.72, cx = W * 0.08, cy = H * 0.14 + (1 - ease(local / 0.8)) * H * 0.04;
    patrikaCard(ctx, cx, cy, cw, ch);
    const list = sc.data || []; const k = list.length > 2 ? 0.72 : list.length === 2 ? 0.86 : 1;
    const tot = list.reduce((a, e) => a + evHeight(tl.eventLines(e), u * k, k === 1), 0);
    let y = cy + Math.max(ch * 0.1, (ch - tot) / 2) + u * k * 8;
    list.forEach((e, j) => {
      const L2 = tl.eventLines(e), b = 0.3 + j * 0.6, v = u * k;
      tl.L(ctx, L2.name, W / 2, y, { role: 'heavy', size: v * 10.5, color: RED, alpha: rev(local, b), maxW: cw * 0.84 }); y += v * 11;
      tl.L(ctx, L2.date + (L2.wk ? ` · ${L2.wk}` : ''), W / 2, y, { role: 'caps', size: v * 4.6, color: DARK, alpha: rev(local, b + 0.2), maxW: cw * 0.84, ls: 0.04 }); y += v * 7;
      if (L2.time) { tl.L(ctx, L2.time, W / 2, y, { role: 'body', size: v * 4.5, color: DARK, alpha: rev(local, b + 0.3), maxW: cw * 0.84 }); y += v * 7; }
      if (L2.tithi) { tl.L(ctx, L2.tithi, W / 2, y, { role: 'italic', size: v * 4, color: MAROON, alpha: rev(local, b + 0.35), maxW: cw * 0.84 }); y += v * 6.5; }
      if (L2.venue) { tl.L(ctx, L2.venue, W / 2, y, { role: hasDeva(L2.venue) ? 'deva' : 'display', size: v * 5.4, color: MAROON, alpha: rev(local, b + 0.4), maxW: cw * 0.84 }); y += v * 7; }
      if (L2.addr && k === 1) { tl.L(ctx, L2.addr, W / 2, y, { role: 'italic', size: v * 3.9, color: DARK, alpha: rev(local, b + 0.5), maxW: cw * 0.84 }); y += v * 6; }
      y += v * 9;
    });
  },
  patrikaFamily(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.fillStyle = '#3A1A10'; ctx.fillRect(0, 0, W, H);
    patrikaCard(ctx, W * 0.06, H * 0.08, W * 0.88, H * 0.84);
    const f = tl.design.family; let y = H * 0.17;
    const parents = [[tl.lg === 'hi' ? 'वधू पक्ष' : 'Bride’s family', tl.T(f.brideParents)], [tl.lg === 'hi' ? 'वर पक्ष' : 'Groom’s family', tl.T(f.groomParents)]].filter(x => x[1]);
    parents.forEach(([lab, v], j) => { tl.L(ctx, lab, W / 2, y, { role: 'caps', size: u * 4, color: '#B8862E', alpha: rev(local, 0.2 + j * 0.5), ls: 0.12 }); y += u * 7; tl.L(ctx, v, W / 2, y, { role: 'display', size: u * 5.8, color: MAROON, alpha: rev(local, 0.35 + j * 0.5), maxW: W * 0.76 }); y += u * 11; });
    (sc.data || []).slice(0, 2).forEach((l, j) => {
      y += u * 2;
      tl.L(ctx, tl.T(l.title), W / 2, y, { role: 'heavy', size: u * 7, color: RED, alpha: rev(local, 1.2 + j * 0.6), maxW: W * 0.76 }); y += u * 8;
      tl.T(l.names).split('\n').filter(Boolean).slice(0, 5).forEach(n => { tl.L(ctx, n, W / 2, y, { role: 'body', size: u * 4.8, color: DARK, alpha: rev(local, 1.4 + j * 0.6), maxW: W * 0.76 }); y += u * 6.6; });
    });
  },
  patrikaClose(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    tl.art(ctx, 'closing', p, { z: 1.05 }, { z: 1.18 });
    scrim(ctx, W, H, 'top', 0.6, 0.4); vignette(ctx, W, H, 0.5);
    const N = tl.names();
    patrikaCard(ctx, W * 0.3, H * 0.62 + (1 - ease(local / 1.2)) * H * 0.3, W * 0.4, H * 0.3, { rot: -0.04 });
    tl.L(ctx, tl.copy('shubh'), W / 2, H * 0.71 + (1 - ease(local / 1.2)) * H * 0.3, { role: tl.lg === 'hi' ? 'heavy' : 'script', size: u * 5.5, color: RED, maxW: W * 0.34 });
    tl.L(ctx, `${N.bs} & ${N.gs}`, W / 2, H * 0.79 + (1 - ease(local / 1.2)) * H * 0.3, { role: 'display', size: u * 3.6, color: MAROON, maxW: W * 0.34 });
    tl.L(ctx, tl.copy('close'), W / 2, H * 0.12, { role: tl.lg === 'hi' ? 'deva' : 'italic', size: u * 5, color: '#FFF1D0', alpha: rev(local, 0.8), shadow: 'rgba(0,0,0,.8)' });
    const fam = tl.T(tl.design.family.familyNames); if (fam) tl.L(ctx, fam, W / 2, H * 0.19, { role: 'caps', size: u * 3, color: GOLDT, alpha: rev(local, 1.4), shadow: 'rgba(0,0,0,.8)', ls: 0.08 });
    petals(ctx, W, H, t, 16, 'pc');
  },
  // ---------- Divya Sandesh ----------
  scrollJourney(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    const user = tl.clips.journey || (tl.src('journey') && tl.slotSpec('journey')?.user);
    tl.art(ctx, 'journey', p, { z: user ? 1 : 2.4, f: [0.3, 0.08] }, { z: user ? 1.06 : 1.6, f: [0.75, 0.12] });
    if (!user) {
      clouds(ctx, W, H, 0.35 + 0.2 * Math.sin(t));
      // the scroll flies in on a gentle curve
      const q = easeIO(clamp01(local / 4)), x = lerp(-W * 0.2, W * 0.55, q), y = H * (0.62 - Math.sin(q * Math.PI) * 0.12);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25 + q * 0.2); rolled(ctx, 0, 0, W * 0.42, W * 0.045); ctx.restore();
      sparkles(ctx, W, H, t, 18, 'sj');
    }
    scrim(ctx, W, H, 'top', 0.45, 0.35);
    tl.L(ctx, tl.copy('open'), W / 2, H * 0.11, { role: 'italic', size: u * 5, color: '#FFF6E0', alpha: rev(local, 1), shadow: 'rgba(0,0,0,.8)' });
  },
  divineReveal(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    tl.art(ctx, 'divine', p, { z: 1.35, f: [0.5, 0.15] }, { z: 1.04 });
    scrim(ctx, W, H, 'top', 0.55, 0.32); scrim(ctx, W, H, 'bottom', 0.55, 0.28);
    const verse = tl.design.wording.invocation && tl.design.wording.invocation !== 'none' ? invocationText(tl.design, 'hi') : '';
    if (verse) verse.split('\n').slice(0, 2).forEach((l, j) => tl.L(ctx, l, W / 2, H * 0.09 + j * u * 6.5, { role: 'deva', size: u * 4.6, color: GOLDT, alpha: rev(local, 0.6 + j * 0.3), shadow: 'rgba(0,0,0,.8)' }));
    tl.L(ctx, tl.copy('divine'), W / 2, H * 0.92, { role: 'italic', size: u * 4.2, color: '#FFF4DC', alpha: rev(local, 1.5), shadow: 'rgba(0,0,0,.8)' });
    sparkles(ctx, W, H, t, 20, 'dr');
  },
  scrollInvite(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.save(); ctx.filter = `blur(${u * 0.9}px)`; tl.art(ctx, 'divine', 0.5, { z: 1.25 }, { z: 1.25 }); ctx.restore();
    ctx.fillStyle = 'rgba(20,10,30,.45)'; ctx.fillRect(0, 0, W, H);
    const r = scroll(ctx, W / 2, H * 0.5, W * 0.86, H * 0.66, clamp01((local - 0.3) / 1.6));
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    const N = tl.names(), f = tl.design.family;
    let y = r.y + u * 8;
    const parents = tl.T(f.brideParents);
    if (parents) { tl.L(ctx, parents, W / 2, y, { role: 'display', size: u * 4.6, color: DARK, alpha: rev(local, 1.6), maxW: r.w * 0.9 }); y += u * 6; }
    tl.L(ctx, tl.copy('invite'), W / 2, y, { role: 'italic', size: u * 4.3, color: DARK, alpha: rev(local, 1.9), maxW: r.w * 0.9 }); y += u * 14;
    tl.L(ctx, N.first, W / 2, y, { role: 'script', size: u * 14, color: '#8A1E2A', alpha: rev(local, 2.3), maxW: r.w * 0.9 }); y += u * 8;
    divider(ctx, W / 2, y, u * 30, '#B8862E', rev(local, 2.6)); y += u * 13;
    tl.L(ctx, N.second, W / 2, y, { role: 'script', size: u * 14, color: '#8A1E2A', alpha: rev(local, 2.9), maxW: r.w * 0.9 }); y += u * 8;
    const gp = tl.T(f.groomParents); if (gp) tl.L(ctx, gp, W / 2, y, { role: 'display', size: u * 4.4, color: DARK, alpha: rev(local, 3.3), maxW: r.w * 0.9 });
    ctx.restore();
  },
  scrollEvents(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.save(); ctx.filter = `blur(${u}px)`; tl.art(ctx, 'family', 0.5, { z: 1.25 }, { z: 1.25 }); ctx.restore();
    ctx.fillStyle = 'rgba(20,10,30,.45)'; ctx.fillRect(0, 0, W, H);
    const r = scroll(ctx, W / 2, H * 0.5, W * 0.86, H * 0.62, 1);
    const list = sc.data || []; const k = list.length > 2 ? 0.72 : list.length === 2 ? 0.86 : 1;
    const tot = list.reduce((a, e) => a + evHeight(tl.eventLines(e), u * k, false), 0);
    let y = r.y + Math.max(u * 8, (r.h - tot) / 2) + u * k * 6;
    list.forEach((e, j) => { const L2 = tl.eventLines(e), v = u * k, b = 0.2 + j * 0.6;
      tl.L(ctx, L2.name, W / 2, y, { role: 'display', size: v * 9.5, color: '#8A1E2A', alpha: rev(local, b), maxW: r.w * 0.9 }); y += v * 9.5;
      tl.L(ctx, L2.date, W / 2, y, { role: 'caps', size: v * 4.6, color: DARK, alpha: rev(local, b + 0.2), maxW: r.w * 0.9, ls: 0.06 }); y += v * 6.5;
      if (L2.time) { tl.L(ctx, L2.time, W / 2, y, { role: 'body', size: v * 4.3, color: DARK, alpha: rev(local, b + 0.3) }); y += v * 6.5; }
      if (L2.tithi) { tl.L(ctx, L2.tithi, W / 2, y, { role: 'italic', size: v * 3.9, color: '#8A1E2A', alpha: rev(local, b + 0.35), maxW: r.w * 0.9 }); y += v * 6; }
      if (L2.venue) { tl.L(ctx, L2.venue, W / 2, y, { role: 'italic', size: v * 4.8, color: DARK, alpha: rev(local, b + 0.4), maxW: r.w * 0.9 }); y += v * 6.5; }
      y += v * 6; });
  },
  divineBless(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    tl.art(ctx, 'family', p, { z: 1.04 }, { z: 1.22 });
    scrim(ctx, W, H, 'top', 0.6, 0.35); vignette(ctx, W, H, 0.4);
    tl.L(ctx, tl.lg === 'hi' ? 'आशीर्वाद सहित' : 'With love & blessings', W / 2, H * 0.1, { role: 'italic', size: u * 4.8, color: '#FFF4DC', alpha: rev(local, 0.5), shadow: 'rgba(0,0,0,.8)' });
    const fam = tl.T(tl.design.family.familyNames); if (fam) tl.L(ctx, fam, W / 2, H * 0.17, { role: 'caps', size: u * 3.2, color: GOLDT, alpha: rev(local, 1), shadow: 'rgba(0,0,0,.8)', ls: 0.08 });
    petals(ctx, W, H, t, 18, 'db');
  },
  scrollClose(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    tl.art(ctx, 'divine', p, { z: 1.2 }, { z: 1.5, f: [0.5, 0.12] });
    ctx.fillStyle = `rgba(10,6,20,${0.35 + 0.35 * p})`; ctx.fillRect(0, 0, W, H);
    const N = tl.names();
    tl.L(ctx, tl.copy('close'), W / 2, H * 0.42, { role: tl.lg === 'hi' ? 'heavy' : 'caps', size: u * 6.5, color: GOLDT, alpha: rev(local, 0.3), shadow: 'rgba(0,0,0,.8)', ls: 0.08 });
    tl.L(ctx, `${N.bs} & ${N.gs}`, W / 2, H * 0.52, { role: 'script', size: u * 9, color: '#FFF4DC', alpha: rev(local, 0.8), shadow: 'rgba(0,0,0,.8)' });
    sparkles(ctx, W, H, t, 30, 'sc');
  },
  // ---------- Shahi Lal ----------
  doorsOpen(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet', W, H, (c, w, h) => velvet(c, w, h)), 0, 0);
    const e = clamp01((local - 0.8) / 2.6);
    const r = W * 0.36;
    ctx.save(); ctx.globalAlpha = ease(e); ctx.translate(W / 2, H * 0.45); ctx.rotate(t * 0.15); ctx.drawImage(mandalaImg(r), -r, -r); ctx.restore();
    doors(ctx, W, H, e);
    sparkles(ctx, W, H, t, Math.round(30 * e), 'do');
  },
  deityFrame(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet', W, H, (c, w, h) => velvet(c, w, h)), 0, 0);
    spinMandalas(ctx, W, H, t);
    const fw = W * 0.6, fh = fw * 1.33, x = (W - fw) / 2, y = H * 0.2;
    const s = 0.85 + 0.15 * ease(local / 1.2);
    ctx.save(); ctx.translate(W / 2, y + fh / 2); ctx.scale(s, s); ctx.translate(-W / 2, -(y + fh / 2));
    ctx.globalAlpha = ease(local / 0.9);
    goldFrame(ctx, x, y, fw, fh, u * 2.6);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, fw, fh); ctx.clip(); tl.art(ctx, 'deity', p, { z: 1.25, f: [0.33, 0.45] }, { z: 1.45, f: [0.33, 0.42] }, [x, y, fw, fh]); ctx.restore();
    ctx.restore();
    tl.L(ctx, tl.T(INV_GANESH), W / 2, H * 0.13, { role: 'deva', size: u * 5.4, color: GOLDT, alpha: rev(local, 0.8), shadow: 'rgba(0,0,0,.6)' });
    const verse = tl.design.wording.invocation && !['none', 'ganesh'].includes(tl.design.wording.invocation) ? invocationText(tl.design, 'hi').split('\n')[0] : '';
    if (verse) tl.L(ctx, verse, W / 2, H * 0.86, { role: 'deva', size: u * 4, color: GOLDT, alpha: rev(local, 1.4), shadow: 'rgba(0,0,0,.6)' });
    sparkles(ctx, W, H, t, 34, 'df');
  },
  redMain(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet', W, H, (c, w, h) => velvet(c, w, h)), 0, 0);
    spinMandalas(ctx, W, H, t);
    // banner
    const bw = W * 0.7, bh = u * 11, by = H * 0.08;
    ctx.save(); ctx.globalAlpha = ease(local / 0.8); ctx.fillStyle = goldGrad(ctx, 0, by, 0, by + bh); ctx.beginPath(); ctx.moveTo((W - bw) / 2, by); ctx.lineTo((W + bw) / 2, by); ctx.lineTo((W + bw) / 2 - u * 4, by + bh / 2); ctx.lineTo((W + bw) / 2, by + bh); ctx.lineTo((W - bw) / 2, by + bh); ctx.lineTo((W - bw) / 2 + u * 4, by + bh / 2); ctx.closePath(); ctx.fill(); ctx.restore();
    tl.L(ctx, tl.copy('banner'), W / 2, by + bh * 0.7, { role: 'heavy', size: u * 7, color: MAROON, alpha: ease(local / 0.8), maxW: bw * 0.8 });
    const fw = W * 0.5, fh = fw * 1.25, fx = (W - fw) / 2, fy = H * 0.2;
    ctx.save(); ctx.globalAlpha = rev(local, 0.4);
    goldFrame(ctx, fx, fy, fw, fh, u * 2);
    ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip(); tl.art(ctx, 'couple', p, { z: 1.1 }, { z: 1.22 }, [fx, fy, fw, fh]); ctx.restore();
    ctx.restore();
    const N = tl.names();
    const hb = tl.T(tl.ad.honor.bride), hg = tl.T(tl.ad.honor.groom), bf = tl.design.couple.order !== 'groom';
    tl.L(ctx, `${(bf ? hb : hg) ? (bf ? hb : hg) + ' ' : ''}${N.first}`, W / 2, H * 0.73, { role: 'heavy', size: u * 7.5, color: GOLDT, alpha: rev(local, 1.2), shadow: 'rgba(0,0,0,.5)' });
    tl.L(ctx, tl.lg === 'hi' ? 'संग' : 'weds', W / 2, H * 0.79, { role: tl.lg === 'hi' ? 'deva' : 'script', size: u * 5.5, color: '#FFE7B0', alpha: rev(local, 1.6) });
    tl.L(ctx, `${(bf ? hg : hb) ? (bf ? hg : hb) + ' ' : ''}${N.second}`, W / 2, H * 0.86, { role: 'heavy', size: u * 7.5, color: GOLDT, alpha: rev(local, 2), shadow: 'rgba(0,0,0,.5)' });
    sparkles(ctx, W, H, t, 30, 'rm');
  },
  redEvents(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet', W, H, (c, w, h) => velvet(c, w, h)), 0, 0);
    spinMandalas(ctx, W, H, t);
    const list = sc.data || [], k = list.length > 2 ? 0.7 : list.length === 2 ? 0.85 : 1;
    const rowsOf = e => { const L2 = tl.eventLines(e); return 13 + 8.5 * [L2.date, L2.wk, L2.time, L2.tithi, L2.venue].filter(Boolean).length + 6; };
    const tot = list.reduce((a, e) => a + rowsOf(e) * u * k, 0);
    let y = Math.max(H * 0.1, (H - tot) / 2) + u * k * 6;
    list.forEach((e, j) => {
      const L2 = tl.eventLines(e), v = u * k, b = 0.2 + j * 0.7;
      const bw = W * 0.7, bh = v * 11;
      ctx.save(); ctx.globalAlpha = rev(local, b); ctx.fillStyle = goldGrad(ctx, 0, y - bh * 0.72, 0, y + bh * 0.28); ctx.fillRect((W - bw) / 2, y - bh * 0.72, bw, bh); ctx.restore();
      tl.L(ctx, L2.name, W / 2, y, { role: 'heavy', size: v * 7.6, color: MAROON, alpha: rev(local, b), maxW: bw * 0.9 }); y += v * 13;
      const rows = [[tl.copy('date'), L2.date], [tl.copy('day'), L2.wk], [tl.copy('time'), L2.time], [tl.lg === 'hi' ? 'तिथि' : 'Tithi', L2.tithi], [tl.copy('venue'), L2.venue]].filter(r => r[1]);
      rows.forEach(([lab, val], q) => {
        const a = rev(local, b + 0.25 + q * 0.15);
        tl.L(ctx, lab + ' :', W * 0.36, y, { role: 'heavy', size: v * 5.4, color: GOLDT, alpha: a, align: 'right', maxW: W * 0.26 });
        tl.L(ctx, val, W * 0.39, y, { role: 'display', size: v * 5.2, color: '#FFF1D6', alpha: a, align: 'left', maxW: W * 0.52 });
        y += v * 8.5;
      });
      y += v * 6;
    });
    sparkles(ctx, W, H, t, 26, 're');
  },
  redLists(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet', W, H, (c, w, h) => velvet(c, w, h)), 0, 0);
    spinMandalas(ctx, W, H, t);
    const l = sc.data; const bw = W * 0.62, bh = u * 10, by = H * 0.2;
    ctx.save(); ctx.globalAlpha = ease(local / 0.6); ctx.fillStyle = goldGrad(ctx, 0, by, 0, by + bh); ctx.fillRect((W - bw) / 2, by, bw, bh); ctx.restore();
    tl.L(ctx, tl.T(l.title), W / 2, by + bh * 0.7, { role: 'heavy', size: u * 6.4, color: MAROON, alpha: ease(local / 0.6), maxW: bw * 0.9 });
    let y = H * 0.38;
    const names = tl.T(l.names).split('\n').filter(Boolean).slice(0, 8);
    names.forEach((n, q) => { tl.L(ctx, n, W / 2, y, { role: 'display', size: u * 5.6, color: '#FFF1D6', alpha: rev(local, 0.4 + q * 0.18), maxW: W * 0.8 }); y += u * 8.8; });
    sparkles(ctx, W, H, t, 26, 'rl');
  },
  redClose(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet', W, H, (c, w, h) => velvet(c, w, h)), 0, 0);
    spinMandalas(ctx, W, H, t);
    const r = W * 0.42; ctx.save(); ctx.globalAlpha = 0.55; ctx.translate(W / 2, H * 0.45); ctx.rotate(-t * 0.1); ctx.drawImage(mandalaImg(r), -r, -r); ctx.restore();
    const N = tl.names();
    tl.L(ctx, tl.copy('close'), W / 2, H * 0.36, { role: tl.lg === 'hi' ? 'heavy' : 'italic', size: u * 5.6, color: '#FFE7B0', alpha: rev(local, 0.3) });
    tl.L(ctx, `${N.bs} & ${N.gs}`, W / 2, H * 0.48, { role: 'script', size: u * 10, color: GOLDT, alpha: rev(local, 0.8), shadow: 'rgba(0,0,0,.5)' });
    const fam = tl.T(tl.design.family.familyNames); if (fam) tl.L(ctx, fam, W / 2, H * 0.57, { role: 'caps', size: u * 3.4, color: '#FFE7B0', alpha: rev(local, 1.3), ls: 0.08 });
    sparkles(ctx, W, H, t, 40, 'rc');
  },
  // ---------- Pichwai ----------
  velvetOpen(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet2', W, H, (c, w, h) => velvet(c, w, h, '#8A1424')), 0, 0);
    const N = tl.names(); const A = firstGrapheme(N.first).toUpperCase(), B = firstGrapheme(N.second).toUpperCase();
    tl.L(ctx, `${A} & ${B}`, W / 2, H * 0.52, { role: 'display', size: u * 14, color: GOLDT, alpha: 0.25 + 0.5 * rev(local, 0.4, 1.5), shadow: 'rgba(0,0,0,.4)' });
    sparkles(ctx, W, H, t, 26, 'vo');
  },
  pichSave(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('ivory', W, H, ivoryFloral), 0, 0);
    pichBorder(ctx, W, H, u);
    const aw = W * 0.62, ah = H * 0.46, ax = (W - aw) / 2, ay = H * 0.08;
    ctx.save(); ctx.globalAlpha = ease(local / 1);
    arch(ctx, ax, ay + ah, aw, ah); ctx.save(); ctx.clip(); tl.art(ctx, 'art', p, { z: 1.25, f: [0.45, 0.25] }, { z: 1.08 }, [ax, ay, aw, ah]); ctx.restore();
    ctx.strokeStyle = '#B8862E'; ctx.lineWidth = u * 0.8; arch(ctx, ax, ay + ah, aw, ah); ctx.stroke();
    ctx.restore();
    tl.L(ctx, tl.copy('save'), W / 2, H * 0.67, { role: tl.lg === 'hi' ? 'heavy' : 'script', size: u * 13, color: '#B0404E', alpha: rev(local, 0.9, 1.2) });
    tl.L(ctx, tl.copy('for'), W / 2, H * 0.74, { role: 'caps', size: u * 3, color: '#6A5A4A', alpha: rev(local, 1.6), ls: 0.14 });
    WC.lotus(ctx, W * 0.2, H * 0.9, u * 5, { seed: 'pl1' }); WC.lotus(ctx, W * 0.8, H * 0.9, u * 5, { seed: 'pl2' });
    petals(ctx, W, H, t, 8, 'ps', ['#F2B8C0', '#E89AA6', '#F6D7A0']);
  },
  pichNames(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('ivory', W, H, ivoryFloral), 0, 0);
    pichBorder(ctx, W, H, u);
    ctx.save(); ctx.strokeStyle = 'rgba(110,120,110,.8)'; ctx.lineWidth = u * 0.5;
    const ga = ease(local / 1.4);
    ctx.globalAlpha = ga;
    [[0.5, 0.88, 0.34, 0.32], [0.27, 0.92, 0.2, 0.22], [0.73, 0.92, 0.2, 0.22]].forEach(([cx, b, w, h]) => { arch(ctx, W * (cx - w / 2), H * b, W * w, H * h); ctx.stroke(); arch(ctx, W * (cx - w / 2) + u, H * b, W * w - 2 * u, H * h - u * 1.5); ctx.stroke(); });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = ga; cypress(ctx, W * 0.15, H * 0.92, H * 0.26); cypress(ctx, W * 0.85, H * 0.92, H * 0.26); ctx.restore();
    WC.lotus(ctx, W * 0.5, H * 0.9, u * 6, { seed: 'pn' });
    const N = tl.names();
    tl.L(ctx, N.first, W / 2, H * 0.17, { role: 'script', size: u * 13, color: '#8E3A48', alpha: rev(local, 0.6, 1.1) });
    tl.L(ctx, '&', W / 2, H * 0.245, { role: 'script', size: u * 8, color: '#B8862E', alpha: rev(local, 1) });
    tl.L(ctx, N.second, W / 2, H * 0.33, { role: 'script', size: u * 13, color: '#8E3A48', alpha: rev(local, 1.3, 1.1) });
  },
  pichDates(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('ivory', W, H, ivoryFloral), 0, 0);
    pichBorder(ctx, W, H, u);
    const N = tl.names();
    tl.L(ctx, `${N.bs} & ${N.gs}`, W / 2, H * 0.14, { role: 'script', size: u * 9, color: '#8E3A48', alpha: 1 });
    const ev = tl.design.events || [];
    const ds = [...new Set(ev.map(e => e.date).filter(Boolean))].sort();
    const parts = ds.map(d => dateParts(d, tl.lg));
    let y = H * 0.3;
    if (parts.length) {
      const sameMonth = parts.every(x => x.rest === parts[0].rest);
      const days = parts.map(x => tl.lg === 'hi' ? x.day : x.day + x.sup).join('  ·  ');
      if (sameMonth) { tl.L(ctx, days, W / 2, y, { role: 'num', size: u * 8, color: '#5A4A3A', alpha: rev(local, 0.3) }); y += u * 7; tl.L(ctx, parts[0].rest, W / 2, y, { role: 'caps', size: u * 4, color: '#5A4A3A', alpha: rev(local, 0.5), ls: 0.12 }); y += u * 9; }
      else parts.forEach((x, q) => { tl.L(ctx, `${x.day}${tl.lg === 'hi' ? '' : x.sup} ${x.rest}`, W / 2, y, { role: 'caps', size: u * 4.4, color: '#5A4A3A', alpha: rev(local, 0.3 + q * 0.15) }); y += u * 6.5; });
    }
    const venue = (mainEventOf(tl.design)?.venue) || tl.design.wedding.venue;
    if (venue) { tl.L(ctx, venue.toUpperCase(), W / 2, y + u * 2, { role: 'caps', size: u * 4.4, color: '#8E3A48', alpha: rev(local, 0.9), ls: 0.1 }); y += u * 9; }
    tl.L(ctx, tl.copy('follow'), W / 2, y + u * 2, { role: 'caps', size: u * 2.6, color: '#6A5A4A', alpha: rev(local, 1.3), ls: 0.14 });
    ctx.save(); ctx.globalAlpha = ease(local / 1.2);
    [[0.29, 0.9], [0.5, 0.9], [0.71, 0.9]].forEach(([cx, b], q) => { ctx.strokeStyle = 'rgba(110,120,110,.8)'; ctx.lineWidth = u * 0.45; arch(ctx, W * (cx - 0.1), H * b, W * 0.2, H * 0.26); ctx.stroke(); });
    cypress(ctx, W * 0.14, H * 0.92, H * 0.24); cypress(ctx, W * 0.86, H * 0.92, H * 0.24); ctx.restore();
    WC.lotus(ctx, W * 0.5, H * 0.88, u * 6, { seed: 'pd' });
  },
  velvetMonogram(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('velvet2', W, H, (c, w, h) => velvet(c, w, h, '#8A1424')), 0, 0);
    ctx.strokeStyle = '#C9A04A'; ctx.lineWidth = u * 0.4; ctx.strokeRect(u * 4, u * 4, W - u * 8, H - u * 8);
    const N = tl.names(); const A = firstGrapheme(N.first).toUpperCase(), B = firstGrapheme(N.second).toUpperCase();
    const s = u * 26, a = ease(local / 1.4);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `400 ${s}px "Playfair Display", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = goldGrad(ctx, W / 2 - s, H * 0.45 - s / 2, W / 2 + s, H * 0.45 + s / 2);
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = u * 2; ctx.fillText(A + B, W / 2, H * 0.46); ctx.restore();
    const R = rng('mono');
    for (let i = 0; i < 16; i++) { const ang = R() * PI2, d = s * (0.55 + R() * 0.35), x = W / 2 + Math.cos(ang) * d * 1.1, y = H * 0.46 + Math.sin(ang) * d * 0.7; const f = ease((local - 0.6 - i * 0.06) * 2); if (f <= 0) continue; ctx.save(); ctx.translate(x, y); ctx.scale(f, f); ctx.fillStyle = i % 3 ? '#E48A9A' : '#F2C06A'; for (let k = 0; k < 5; k++) { ctx.rotate(PI2 / 5); ctx.beginPath(); ctx.ellipse(0, -u * 1.1, u * 0.7, u * 1.1, 0, 0, PI2); ctx.fill(); } ctx.fillStyle = '#7E9A5A'; ctx.beginPath(); ctx.ellipse(u * 2, u * 1.4, u * 1.5, u * 0.5, 0.6, 0, PI2); ctx.fill(); ctx.restore(); }
    tl.L(ctx, `${N.bs} & ${N.gs}`, W / 2, H * 0.7, { role: 'caps', size: u * 4, color: GOLDT, alpha: rev(local, 1.2), ls: 0.16 });
    sparkles(ctx, W, H, t, 24, 'vm');
  },
  // ---------- Meet the Couple ----------
  meetTitle(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('kraft', W, H, (c, w, h) => crumpled(c, w, h)), 0, 0);
    starsDeco(ctx, W, H, t, local);
    tl.L(ctx, tl.copy('meet'), W / 2, H * 0.12, { role: 'caps', size: u * 9, color: '#7A1E2A', alpha: rev(local, 0.1, 0.5), ls: 0.12 });
    const ph = tl.photo('couple');
    const pop = popScale(local - 0.4);
    if (ph) drawSticker(ctx, ph, W / 2, H * 0.92, W * 0.9, H * 0.72, { s: pop, rot: -0.02 });
    else placeholderCouple(ctx, tl, W / 2, H * 0.92, H * 0.6, pop);
    tl.L(ctx, tl.copy('couple'), W / 2, H * 0.21, { role: 'script', size: u * 12, color: '#B0405A', alpha: rev(local, 0.9) });
  },
  meetBride(tl, ctx, sc, local, t, p) { meetOne(tl, ctx, local, t, 'bride'); },
  meetGroom(tl, ctx, sc, local, t, p) { meetOne(tl, ctx, local, t, 'groom'); },
  meetDate(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('kraft', W, H, (c, w, h) => crumpled(c, w, h)), 0, 0);
    starsDeco(ctx, W, H, t, local);
    const N = tl.names(); const m = mainEventOf(tl.design); const d = dateParts(m?.date || tl.design.wedding.date, tl.lg);
    tl.L(ctx, `${N.bs} & ${N.gs}`, W / 2, H * 0.24, { role: 'display', size: u * 8, color: '#7A1E2A', alpha: rev(local, 0.2) });
    if (d) {
      tl.L(ctx, tl.lg === 'hi' ? d.day : `${d.day}${d.sup}`, W / 2, H * 0.38, { role: 'display', size: u * 10, color: '#7A1E2A', alpha: rev(local, 0.7) });
      const [mo, yr] = d.rest.split(' ');
      tl.L(ctx, mo ? mo.charAt(0) + mo.slice(1).toLowerCase() : '', W / 2, H * 0.47, { role: 'display', size: u * 10, color: '#7A1E2A', alpha: rev(local, 1) });
      tl.L(ctx, yr || '', W / 2, H * 0.56, { role: 'display', size: u * 9, color: '#7A1E2A', alpha: rev(local, 1.3) });
    }
    const tag = tl.design.couple.hashtag; if (tag) tl.L(ctx, tag, W / 2, H * 0.72, { role: 'display', size: u * 7.5, color: '#7A1E2A', alpha: rev(local, 1.8) });
    if (m?.venue) tl.L(ctx, m.venue, W / 2, H * 0.8, { role: 'caps', size: u * 3.2, color: '#5A3A2A', alpha: rev(local, 2.1), ls: 0.1 });
  },
  // ---------- Ghar Ka Beta ----------
  bhaiIntro(tl, ctx, sc, local, t, p) { gharIntro(tl, ctx, local, t, 'groom'); },
  beti(tl, ctx, sc, local, t, p) { gharIntro(tl, ctx, local, t, 'bride'); },
  opposites(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('mughal', W, H, mughalFrame), 0, 0);
    tl.L(ctx, tl.copy('t1'), W / 2, H * 0.17, { role: 'caps', size: u * 3.6, color: '#B8862E', alpha: rev(local, 0.2), ls: 0.1 });
    tl.L(ctx, tl.copy('t2'), W / 2, H * 0.26, { role: 'heavy', size: u * 10, color: '#B0152A', alpha: rev(local, 0.7), maxW: W * 0.72 });
    tl.L(ctx, tl.copy('t3'), W / 2, H * 0.32, { role: 'caps', size: u * 3.4, color: '#4A6A4A', alpha: rev(local, 1.2), maxW: W * 0.7, ls: 0.06 });
    const gb = tl.photo('bride'), gg = tl.photo('groom'), s = popScale(local - 0.9);
    if (gb) drawSticker(ctx, gb, W * 0.32, H * 0.88, W * 0.42, H * 0.5, { s, rot: 0.02 }); else placeholderOne(ctx, tl, 'bride', W * 0.32, H * 0.88, H * 0.42, s);
    if (gg) drawSticker(ctx, gg, W * 0.68, H * 0.88, W * 0.42, H * 0.5, { s, rot: -0.02 }); else placeholderOne(ctx, tl, 'groom', W * 0.68, H * 0.88, H * 0.42, s);
  },
  rokaDate(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('mughal', W, H, mughalFrame), 0, 0);
    const N = tl.names();
    const ev = (tl.design.events || []).find(e => ['roka', 'sagai', 'engagement', 'mangni', 'tilak'].includes(e.preset)) || mainEventOf(tl.design);
    const L2 = ev ? tl.eventLines(ev) : null;
    tl.L(ctx, tl.copy('save'), W / 2, H * 0.27, { role: tl.lg === 'hi' ? 'heavy' : 'script', size: u * 15, color: '#9A6A5A', alpha: rev(local, 0.3, 1.2) });
    tl.L(ctx, tl.copy('for'), W / 2, H * 0.36, { role: 'caps', size: u * 3.6, color: '#B0152A', alpha: rev(local, 1), ls: 0.1, maxW: W * 0.7 });
    tl.L(ctx, N.gs, W / 2, H * 0.47, { role: 'display', size: u * 12, color: '#3E6A4A', alpha: rev(local, 1.4) });
    tl.L(ctx, '&', W / 2, H * 0.54, { role: 'script', size: u * 10, color: '#B8862E', alpha: rev(local, 1.6) });
    tl.L(ctx, N.bs, W / 2, H * 0.63, { role: 'display', size: u * 12, color: '#3E6A4A', alpha: rev(local, 1.8) });
    if (L2) {
      tl.L(ctx, L2.date.toUpperCase(), W / 2, H * 0.71, { role: 'caps', size: u * 3.8, color: '#B0152A', alpha: rev(local, 2.3), ls: 0.06 });
      if (L2.time) tl.L(ctx, L2.time.toUpperCase(), W / 2, H * 0.755, { role: 'caps', size: u * 3.4, color: '#B0152A', alpha: rev(local, 2.5), ls: 0.06 });
      if (L2.venue) tl.L(ctx, L2.venue, W / 2, H * 0.8, { role: 'italic', size: u * 3.6, color: '#5A4A3A', alpha: rev(local, 2.7) });
    }
  },
  tulipsEnd(tl, ctx, sc, local, t, p) {
    const { W, H, u } = tl;
    ctx.drawImage(cached('mughal', W, H, mughalFrame), 0, 0);
    const q = easeIO(clamp01(local / 2));
    tulip(ctx, W * (0.2 + 0.18 * q), H * 0.5, u * 7, 0.9 - q * 0.4);
    tulip(ctx, W * (0.8 - 0.18 * q), H * 0.5, u * 7, -0.9 + q * 0.4, '#E2604E');
    const N = tl.names();
    tl.L(ctx, `${N.gs} & ${N.bs}`, W / 2, H * 0.3, { role: 'script', size: u * 9, color: '#B0152A', alpha: rev(local, 1.4) });
    petals(ctx, W, H, t, 12, 'te', ['#F2A7A0', '#E0575A', '#F7C8C0']);
  },
};
const INV_GANESH = L('|| Shri Ganeshaya Namah ||', '॥ श्री गणेशाय नमः ॥');
function spinMandalas(ctx, W, H, t) {
  const r = W * 0.42, img = mandalaImg(r);
  [[0, H * 0.5, 1], [W, H * 0.5, -1]].forEach(([x, y, d]) => { ctx.save(); ctx.globalAlpha = 0.6; ctx.translate(x, y); ctx.rotate(t * 0.12 * d); ctx.drawImage(img, -r, -r); ctx.restore(); });
}
function pichBorder(ctx, W, H, u) {
  ctx.save(); ctx.strokeStyle = '#C9A04A'; ctx.lineWidth = u * 1.4; ctx.strokeRect(u * 2.5, u * 2.5, W - u * 5, H - u * 5);
  ctx.lineWidth = u * 0.3; ctx.strokeRect(u * 4.2, u * 4.2, W - u * 8.4, H - u * 8.4); ctx.restore();
}
function popScale(x) { if (x <= 0) return 0.001; if (x > 0.6) return 1; const k = x / 0.6; return 1 + Math.sin(k * Math.PI) * 0.12 - (1 - k) * (1 - k) * 0.9; }
function starsDeco(ctx, W, H, t, local) {
  const R = rng('stars-deco'), u = W / 100;
  for (let i = 0; i < 10; i++) {
    const edge = i % 2, x = edge ? W * (0.9 + R() * 0.12) : W * (-0.02 + R() * 0.12), y = H * (0.1 + R() * 0.85);
    const s = u * (2 + R() * 3.5), c = i % 3 ? '#9A1E2A' : '#F4EEE4';
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.3 + i); ctx.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? s * 0.42 : s; const a = -Math.PI / 2 + (k / 10) * PI2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = c; ctx.globalAlpha = 0.9; ctx.fill(); ctx.restore();
  }
}
function photoFrame(ctx, tl, cx, by, w, h, label, s, rot = 0) {
  const { u } = tl;
  ctx.save(); ctx.translate(cx, by - h / 2); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = u * 2; ctx.shadowOffsetY = u * 0.6;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
  const p = u * 2.2, iw = w - 2 * p, ih = h - p * 3.5;
  const g = ctx.createLinearGradient(0, -h / 2 + p, 0, -h / 2 + p + ih); g.addColorStop(0, '#EFE5D6'); g.addColorStop(1, '#D9C8B2');
  ctx.fillStyle = g; ctx.fillRect(-iw / 2, -h / 2 + p, iw, ih);
  ctx.fillStyle = 'rgba(120,95,70,.35)';
  const n = label === 'couple' ? 2 : 1;
  for (let k = 0; k < n; k++) { const ox = n === 2 ? (k ? iw * 0.2 : -iw * 0.2) : 0, hr = ih * (n === 2 ? 0.13 : 0.17); const hy = -h / 2 + p + ih * 0.42; ctx.beginPath(); ctx.arc(ox, hy, hr, 0, PI2); ctx.fill(); ctx.beginPath(); ctx.ellipse(ox, hy + hr * 2.9, hr * 1.9, hr * 1.7, 0, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = '#7A1E2A'; ctx.font = `600 ${u * 2.8}px "Cinzel", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label === 'couple' ? 'ADD COUPLE PHOTO' : label === 'bride' ? 'ADD BRIDE PHOTO' : 'ADD GROOM PHOTO', 0, h / 2 - p * 0.9, w * 0.9);
  ctx.restore();
}
function placeholderCouple(ctx, tl, cx, by, h, s) { photoFrame(ctx, tl, cx, by - h * 0.05, h * 0.72, h * 0.85, 'couple', s, -0.03); }
function placeholderOne(ctx, tl, who, cx, by, h, s) { photoFrame(ctx, tl, cx, by - h * 0.05, h * 0.55, h * 0.78, who, s, who === 'bride' ? 0.03 : -0.03); }
function meetOne(tl, ctx, local, t, who) {
  const { W, H, u } = tl;
  ctx.drawImage(cached(who === 'bride' ? 'pinkpaper' : 'bluepaper', W, H, (c, w, h) => crumpled(c, w, h, who === 'bride' ? '#F1B7C6' : '#B9D2EA', who)), 0, 0);
  const N = tl.names();
  tl.L(ctx, who === 'bride' ? N.bs : N.gs, W * 0.62, H * 0.14, { role: 'script', size: u * 14, color: who === 'bride' ? '#B4234E' : '#2A4E8A', alpha: rev(local, 0.2, 0.7), shadow: 'rgba(255,255,255,.8)' });
  const ph = tl.photo(who), s = popScale(local - 0.3);
  if (ph) drawSticker(ctx, ph, W * 0.48, H * 0.95, W * 0.62, H * 0.76, { s, rot: 0.01 }); else placeholderOne(ctx, tl, who, W * 0.48, H * 0.95, H * 0.7, s);
  const traits = String(tl.ad.traits?.[who] || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 4);
  const spots = [[0.2, 0.3, -0.12], [0.82, 0.38, 0.1], [0.18, 0.62, 0.08], [0.84, 0.7, -0.08]];
  const kinds = ['crown', 'heart', 'sparkle', 'cup', 'note', 'plane', 'flower', 'star'];
  spots.forEach(([x, y, r], i) => { const f = popScale(local - 0.8 - i * 0.25); if (f < 0.05) return; ctx.save(); ctx.translate(W * x, H * y); ctx.scale(f, f); doodle(ctx, kinds[(i + (who === 'groom' ? 3 : 0)) % kinds.length], 0, -u * 6, u * 3.4, r, t); ctx.restore(); if (traits[i]) { ctx.save(); ctx.translate(W * x, H * y); ctx.scale(f, f); tagLabel(ctx, tl.fs, traits[i], 0, 0, u * 3.4, { rot: r }); ctx.restore(); } });
}
function gharIntro(tl, ctx, local, t, who) {
  const { W, H, u } = tl;
  ctx.drawImage(cached('mughal', W, H, mughalFrame), 0, 0);
  tl.L(ctx, tl.copy('meetG1'), W / 2, H * 0.16, { role: 'caps', size: u * 3.6, color: '#4A3A2A', alpha: rev(local, 0.1), ls: 0.12 });
  const t2 = tl.copy(who === 'groom' ? 'meetG2' : 'meetB2');
  const words = t2.split(' '); const half = Math.ceil(words.length / 2);
  tl.L(ctx, words.slice(0, half).join(' '), W / 2, H * 0.245, { role: 'heavy', size: u * 11, color: '#B0152A', alpha: rev(local, 0.4), maxW: W * 0.72 });
  tl.L(ctx, words.slice(half).join(' '), W / 2, H * 0.32, { role: 'heavy', size: u * 9, color: '#B0152A', alpha: rev(local, 0.6), maxW: W * 0.72 });
  const ph = tl.photo(who), s = popScale(local - 0.5);
  if (ph) drawSticker(ctx, ph, W / 2, H * 0.9, W * 0.6, H * 0.55, { s }); else placeholderOne(ctx, tl, who, W / 2, H * 0.9, H * 0.52, s);
  const traits = String(tl.ad.traits?.[who] || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 4);
  const spots = [[0.24, 0.5, -0.1], [0.76, 0.47, 0.08], [0.22, 0.66, 0.06], [0.78, 0.68, -0.06]];
  traits.forEach((tx, i) => { const a = rev(local, 1.1 + i * 0.35, 0.4); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; tagLabel(ctx, tl.fs, tx.toUpperCase(), W * spots[i][0], H * spots[i][1], u * 3.6, { rot: spots[i][2], bg: null, color: '#2A2A2A' }); ctx.restore(); });
}

export function artCredits(design) {
  const tpl = ART_MAP[design.story?.template]; if (!tpl) return [];
  const out = new Set();
  tpl.slots.forEach(s => { if (design.artSlots?.[tpl.id + ':' + s.id]) return; if (s.photo && design.photos?.[s.photo]?.src) return; if (s.def) out.add(s.def); });
  return [...out].map(id => ART[id]).filter(Boolean);
}
export { hasDeva };
