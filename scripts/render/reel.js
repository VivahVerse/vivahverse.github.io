// Cinematic "reel" video invitations: original painted sacred scenes (procedural watercolour),
// deity symbols (no figures), animated diyas, flags, birds and light, with timed text scenes.
// Everything is drawn in code — no third-party artwork.
import * as M from './motifs.js';
import { layout, fontsFor, templateById, getImage, drawPhoto } from './card.js';
import { invocationText } from '../state.js';
import { L, fmtDate, fmtTime, fmtTimeRange } from '../i18n.js';

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeIO = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = t => Math.min(1, Math.max(0, t));
function hexA(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------- themes ----------------
export const REEL_THEMES = [
  { id: 'kashi', name: 'Kashi Ghat', deity: 'Shiv–Parvati', desc: 'Dawn on the Ganga ghats, floating diyas, trishul & damru', scene: 'ghat', symbol: 'trishul', verse: 'shiv-vagartha', track: 'sitar',
    pal: { sky1: '#fde8d3', sky2: '#cfe3ef', water: '#9cc3d6', far: '#e3b9a2', near: '#c98e74', ink: '#7a1f1f', ink2: '#8a4a3a', accent: '#b8862c', accent2: '#d0563c', flower: '#e8a0ad', leaf: '#5f8a5a', bg: '#fdf3e7' } },
  { id: 'kailash', name: 'Kailash Night', deity: 'Shiv–Parvati', desc: 'Moonlit Himalayas, stars and a glowing trishul', scene: 'kailash', symbol: 'trishul', verse: 'shiv-namah', track: 'shehnai',
    pal: { sky1: '#0d1838', sky2: '#2e3f7a', water: '#1a2a5a', far: '#5a6aa0', near: '#e8eef8', ink: '#f6efe0', ink2: '#c9d2ec', accent: '#e9c46a', accent2: '#9db4e8', flower: '#f2d8a0', leaf: '#7aa0c0', bg: '#0d1838' }, dark: true },
  { id: 'vrindavan', name: 'Vrindavan', deity: 'Radha–Krishna', desc: 'Pink sunset over the Yamuna, kadamba trees, flute & peacock feather', scene: 'vrindavan', symbol: 'flute', verse: 'krishna-vasudev', track: 'bansuri',
    pal: { sky1: '#ffd9e2', sky2: '#c9e9e2', water: '#8fc9c3', far: '#7fb39a', near: '#3f7a5e', ink: '#4a1a3a', ink2: '#6a3a5a', accent: '#c2186b', accent2: '#1f8a7a', flower: '#f48fb1', leaf: '#2f9a6a', bg: '#fff0f3' } },
  { id: 'ayodhya', name: 'Ayodhya', deity: 'Ram–Sita', desc: 'Saffron sky, palace domes, bhagwa flags and the divine bow', scene: 'ayodhya', symbol: 'bow', verse: 'rcm-mangal', track: 'shehnai',
    pal: { sky1: '#ffe2b0', sky2: '#ffb46a', water: '#f2c38a', far: '#e8a060', near: '#b8642c', ink: '#5a1a08', ink2: '#7a3412', accent: '#c4701a', accent2: '#e8452c', flower: '#ff8a1f', leaf: '#3c7a34', bg: '#fff3e0' } },
  { id: 'ganesh', name: 'Vighnaharta', deity: 'Shri Ganesh', desc: 'Temple shikhara, marigold toran and a radiant Om', scene: 'temple', symbol: 'om', verse: 'ganesh-gan', track: 'dholki',
    pal: { sky1: '#fff1d0', sky2: '#ffc98a', water: '#f7d79a', far: '#e9a35a', near: '#b3261e', ink: '#6e100b', ink2: '#8a2a14', accent: '#d9861a', accent2: '#b3261e', flower: '#ffb000', leaf: '#3c8a3a', marigold: '#ffb000', marigold2: '#e8590c', bg: '#fff6e5' } },
  { id: 'lakshmi', name: 'Kamal Sarovar', deity: 'Lakshmi–Narayan', desc: 'Lotus pond in soft pink with a golden kalash', scene: 'lotuspond', symbol: 'kalash', verse: 'vishnu-shantakaram', track: 'piano',
    pal: { sky1: '#ffeef0', sky2: '#fde2d0', water: '#f4c9cf', far: '#e8b0b8', near: '#d98a98', ink: '#5a1a2a', ink2: '#8a4a5a', accent: '#c48a2c', accent2: '#d9567a', flower: '#f48fb1', leaf: '#6aa07a', bg: '#fff5f6' } },
  { id: 'vedic', name: 'Vedic Agni', deity: 'Vedic', desc: 'Sunrise over the yajna fire with a Rigveda blessing', scene: 'sunrise', symbol: 'agni', verse: 'ved-samani', track: 'sitar',
    pal: { sky1: '#ffcf8a', sky2: '#ff7a3c', water: '#ffb070', far: '#d9643a', near: '#7a1f10', ink: '#3d0f05', ink2: '#5e1d0a', accent: '#8a1a08', accent2: '#ffd166', flower: '#ffe066', leaf: '#3c7a34', bg: '#ffcf8a' } },
  { id: 'royal', name: 'Shahi Mahal', deity: 'Royal', desc: 'Palace at night with chandelier lights and gold', scene: 'palace', symbol: 'mandala', verse: 'ganesh', track: 'baraat',
    pal: { sky1: '#1a0a14', sky2: '#4a1030', water: '#2a0a1c', far: '#5a1a3a', near: '#2a0812', ink: '#fbe8c8', ink2: '#f1c98c', accent: '#e8be62', accent2: '#c2546b', flower: '#f2c46a', leaf: '#6f8f4a', bg: '#1a0a14' }, dark: true },
  { id: 'mandap', name: 'Phoolon Ka Mandap', deity: 'Traditional', desc: 'Golden mandap with marigold strands and fairy lights', scene: 'mandap', symbol: 'none', verse: 'ved-mangalam', track: 'shehnai',
    pal: { sky1: '#fff6e8', sky2: '#f9dfb8', water: '#f7e2c0', far: '#e8c89a', near: '#c99a3a', ink: '#4a1a10', ink2: '#7a3a20', accent: '#c99a3a', accent2: '#c2463a', flower: '#e86a0c', leaf: '#3c7a34', marigold: '#ffb000', marigold2: '#e86a0c', bg: '#fff6e8' } },
  { id: 'modern', name: 'Pastel Modern', deity: 'Modern', desc: 'Soft gradient, floating light and clean typography', scene: 'pastel', symbol: 'none', verse: 'none', track: 'piano',
    pal: { sky1: '#fbe7ea', sky2: '#e5e3f7', water: '#e8d8f0', far: '#d9c7e8', near: '#c2a8d6', ink: '#3a2a4a', ink2: '#6a5a7a', accent: '#b0736a', accent2: '#9a7cc4', flower: '#f2c6bd', leaf: '#9fbf9a', bg: '#fbe7ea' } },
];
export const REEL_MAP = Object.fromEntries(REEL_THEMES.map(t => [t.id, t]));

// ---------------- painted scene elements ----------------
function wash(ctx, W, H, colors, seed, n = 26, alpha = 0.16) {
  const R = M.rng('wash' + seed);
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H, r = Math.max(W, H) * (0.12 + R() * 0.25);
    const c = colors[i % colors.length];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(c, alpha)); g.addColorStop(0.7, hexA(c, alpha * 0.4)); g.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
function grain(ctx, W, H, color, seed) {
  const R = M.rng('g' + seed); const U = Math.min(W, H) / 100;
  ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = color;
  for (let i = 0; i < 5000; i++) ctx.fillRect(R() * W, R() * H, U * 0.15, U * 0.15);
  ctx.restore();
}
function shikhara(ctx, x, base, w, h, color, flag) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base);
  ctx.lineTo(x - w / 2, base - h * 0.32);
  ctx.bezierCurveTo(x - w * 0.42, base - h * 0.7, x - w * 0.16, base - h * 0.88, x, base - h * 0.92);
  ctx.bezierCurveTo(x + w * 0.16, base - h * 0.88, x + w * 0.42, base - h * 0.7, x + w / 2, base - h * 0.32);
  ctx.lineTo(x + w / 2, base); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, base - h * 0.93, w * 0.12, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, base - h * 0.97, w * 0.04, 0, Math.PI * 2); ctx.fill();
  if (flag) {
    ctx.fillRect(x - w * 0.006, base - h * 1.12, Math.max(1, w * 0.012), h * 0.16);
    ctx.fillStyle = flag; ctx.beginPath(); ctx.moveTo(x, base - h * 1.12); ctx.lineTo(x + w * 0.22, base - h * 1.07); ctx.lineTo(x, base - h * 1.03); ctx.fill();
  }
}
function ghatSteps(ctx, W, y, h, c1, c2) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.fillRect(0, y + (i / n) * h, W, h / n + 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,.06)';
  for (let x = 0; x < W; x += W / 9) ctx.fillRect(x, y, 2, h);
}
function chhatri(ctx, x, base, w, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, base - w * 0.9, w * 0.08, w * 0.9);
  ctx.fillRect(x + w / 2 - w * 0.08, base - w * 0.9, w * 0.08, w * 0.9);
  ctx.fillRect(x - w * 0.6, base - w * 1.0, w * 1.2, w * 0.12);
  ctx.beginPath(); ctx.ellipse(x, base - w * 1.0, w * 0.5, w * 0.45, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(x - w * 0.02, base - w * 1.6, w * 0.04, w * 0.2);
}
function mountains(ctx, W, base, h, color, snow, seed, peaks = 5) {
  const R = M.rng('mt' + seed);
  const pts = [[0, base]];
  for (let i = 0; i <= peaks * 2; i++) {
    const x = (i / (peaks * 2)) * W;
    const y = i % 2 ? base - h * (0.55 + R() * 0.45) : base - h * (0.2 + R() * 0.25);
    pts.push([x, y]);
  }
  pts.push([W, base]);
  ctx.save();
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  if (snow) { ctx.clip(); ctx.fillStyle = snow; ctx.fillRect(0, base - h, W, h * 0.35); }
  ctx.restore();
}
function kailashPeak(ctx, cx, base, w, h, color, snow) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - w / 2, base); ctx.lineTo(cx - w * 0.18, base - h * 0.82); ctx.quadraticCurveTo(cx, base - h * 1.02, cx + w * 0.18, base - h * 0.82); ctx.lineTo(cx + w / 2, base); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.clip();
  const g = ctx.createLinearGradient(0, base - h, 0, base - h * 0.4); g.addColorStop(0, snow); g.addColorStop(1, hexA(snow, 0));
  ctx.fillStyle = g; ctx.fillRect(cx - w / 2, base - h, w, h * 0.6);
  ctx.strokeStyle = hexA(snow, 0.5); ctx.lineWidth = Math.max(1, w * 0.004);
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - w * 0.15 + i * w * 0.05, base - h * 0.85); ctx.lineTo(cx - w * 0.3 + i * w * 0.1, base - h * 0.35); ctx.stroke(); }
  ctx.restore();
}
function tree(ctx, x, base, s, color, seed) {
  const R = M.rng('tr' + seed);
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.04, base - s * 0.6, s * 0.08, s * 0.6);
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x + (R() - 0.5) * s * 0.7, base - s * (0.65 + R() * 0.45), s * (0.18 + R() * 0.14), 0, Math.PI * 2); ctx.fill(); }
}
function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  [[0, 0, 0.5], [0.45, -0.12, 0.38], [-0.45, -0.05, 0.36], [0.85, 0.05, 0.28], [-0.82, 0.08, 0.26]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.ellipse(x + a * s, y + b * s, r * s * 1.3, r * s * 0.8, 0, 0, Math.PI * 2); ctx.fill(); });
}
function flag(ctx, x, y, s, t, color) {
  ctx.save(); ctx.strokeStyle = 'rgba(60,30,10,.7)'; ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 1.6); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - s * 1.6);
  for (let i = 0; i <= 10; i++) { const u = i / 10; ctx.lineTo(x + u * s * 0.9, y - s * 1.6 + u * s * 0.25 + Math.sin(t * 4 + u * 5) * s * 0.06); }
  for (let i = 10; i >= 0; i--) { const u = i / 10; ctx.lineTo(x + u * s * 0.9, y - s * 1.6 + s * 0.5 - u * s * 0.25 + Math.sin(t * 4 + u * 5) * s * 0.06); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function birds(ctx, W, H, t, color, seed) {
  const R = M.rng('b' + seed); const U = Math.min(W, H) / 100;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, U * 0.22); ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x = ((R() * W + t * U * (3 + R() * 2)) % (W + U * 20)) - U * 10, y = H * (0.08 + R() * 0.2) + Math.sin(t + i) * U;
    const f = Math.sin(t * 6 + i) * 0.6;
    ctx.beginPath(); ctx.moveTo(x - U * 1.4, y - U * f); ctx.quadraticCurveTo(x - U * 0.5, y - U * 0.6, x, y); ctx.quadraticCurveTo(x + U * 0.5, y - U * 0.6, x + U * 1.4, y - U * f); ctx.stroke();
  }
  ctx.restore();
}
function floatingDiyas(ctx, W, y0, y1, t, pal, seed) {
  const R = M.rng('fd' + seed); const U = Math.min(W, H_(W)) / 100;
  for (let i = 0; i < 9; i++) {
    const depth = R();
    const y = y0 + (y1 - y0) * (0.15 + depth * 0.8);
    const s = U * (1.4 + depth * 2.2);
    const x = ((R() * W + t * U * (1 + depth * 1.5)) % (W + s * 4)) - s * 2;
    const bob = Math.sin(t * 2 + i) * s * 0.08;
    ctx.save(); ctx.globalAlpha = 0.35 + depth * 0.4;
    const g = ctx.createRadialGradient(x, y + s * 0.4, 0, x, y + s * 0.4, s * 3);
    g.addColorStop(0, 'rgba(255,200,90,.45)'); g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g; ctx.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    ctx.restore();
    M.diya(ctx, x, y + bob, s, { ...pal, diya: '#c0703a' }, false);
  }
}
const H_ = W => W * 1.8;
function sunGlow(ctx, x, y, r, color, t = 0) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, hexA(color, 0.85)); g.addColorStop(0.2, hexA(color, 0.4)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hexA('#fffaf0', 0.9); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function moon(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
  g.addColorStop(0, hexA(color, 0.35)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
  M.crescent(ctx, x, y, r, color);
}
function stars(ctx, W, H, t, seed) {
  const R = M.rng('st' + seed); const U = Math.min(W, H) / 100;
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = R() * H * 0.55, a = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + R()) + i));
    ctx.fillStyle = `rgba(255,248,230,${a * 0.9})`; ctx.beginPath(); ctx.arc(x, y, U * (0.12 + R() * 0.25), 0, Math.PI * 2); ctx.fill();
  }
}
function water(ctx, W, y, h, c, t, seed) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, hexA(c, 0.95)); g.addColorStop(1, hexA(c, 0.75));
  ctx.fillStyle = g; ctx.fillRect(0, y, W, h);
  const R = M.rng('w' + seed); const U = Math.min(W, H_(W)) / 100;
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, U * 0.12);
  for (let i = 0; i < 40; i++) {
    const yy = y + R() * h, len = U * (2 + R() * 6), x = (R() * W + Math.sin(t + i) * U * 2);
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + len, yy); ctx.stroke();
  }
}

// ---------------- symbols (no deity figures) ----------------
export function trishulDamru(ctx, x, yBase, h, pal) {
  ctx.save(); ctx.translate(x, yBase);
  const gold = M.foil(ctx, -h * 0.1, 0, h * 0.1, 0, pal.accent, pal.accent2 || pal.accent);
  ctx.fillStyle = gold; ctx.strokeStyle = gold; ctx.lineCap = 'round';
  ctx.fillRect(-h * 0.012, -h * 0.82, h * 0.024, h * 0.82);
  // prongs
  ctx.lineWidth = Math.max(2, h * 0.022);
  ctx.beginPath(); ctx.moveTo(0, -h * 0.8); ctx.lineTo(0, -h);
  ctx.moveTo(-h * 0.13, -h * 0.82); ctx.quadraticCurveTo(-h * 0.14, -h * 0.72, 0, -h * 0.72); ctx.quadraticCurveTo(h * 0.14, -h * 0.72, h * 0.13, -h * 0.82);
  ctx.moveTo(-h * 0.13, -h * 0.82); ctx.lineTo(-h * 0.11, -h * 0.94);
  ctx.moveTo(h * 0.13, -h * 0.82); ctx.lineTo(h * 0.11, -h * 0.94);
  ctx.stroke();
  [[0, -h * 1.02], [-h * 0.11, -h * 0.96], [h * 0.11, -h * 0.96]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a, b - h * 0.04); ctx.lineTo(a - h * 0.022, b + h * 0.01); ctx.lineTo(a + h * 0.022, b + h * 0.01); ctx.closePath(); ctx.fill(); });
  // damru
  const dy = -h * 0.6, dw = h * 0.1, dh = h * 0.13;
  ctx.fillStyle = '#c99a5a';
  ctx.beginPath(); ctx.moveTo(-dw, dy - dh); ctx.lineTo(dw, dy - dh); ctx.lineTo(dw * 0.12, dy); ctx.lineTo(dw, dy + dh); ctx.lineTo(-dw, dy + dh); ctx.lineTo(-dw * 0.12, dy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.ellipse(0, dy - dh, dw, dh * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, dy + dh, dw, dh * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a1a1a'; ctx.lineWidth = Math.max(1, h * 0.01);
  ctx.beginPath(); ctx.moveTo(-dw * 0.8, dy - dh * 0.6); ctx.lineTo(dw * 0.8, dy + dh * 0.6); ctx.moveTo(dw * 0.8, dy - dh * 0.6); ctx.lineTo(-dw * 0.8, dy + dh * 0.6); ctx.stroke();
  // red cloth
  ctx.fillStyle = '#c4121a';
  ctx.beginPath(); ctx.ellipse(-h * 0.05, -h * 0.72, h * 0.05, h * 0.025, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-h * 0.02, -h * 0.72); ctx.quadraticCurveTo(-h * 0.09, -h * 0.6, -h * 0.05, -h * 0.5); ctx.lineTo(-h * 0.03, -h * 0.52); ctx.quadraticCurveTo(-h * 0.06, -h * 0.62, 0, -h * 0.71); ctx.fill();
  // rudraksha beads
  ctx.fillStyle = '#6a3a1a';
  for (let i = 0; i < 9; i++) { const a = -0.4 + i * 0.12; ctx.beginPath(); ctx.arc(Math.sin(a) * h * 0.06 + h * 0.03, -h * 0.68 + i * h * 0.02, h * 0.009, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
export function bansuri(ctx, x, y, len, rot, pal) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createLinearGradient(0, -len * 0.03, 0, len * 0.03); g.addColorStop(0, '#e8c37a'); g.addColorStop(0.5, '#c9953f'); g.addColorStop(1, '#8a5a1a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-len / 2, -len * 0.022, len, len * 0.044, len * 0.02) : ctx.rect(-len / 2, -len * 0.022, len, len * 0.044); ctx.fill();
  ctx.fillStyle = '#4a2a0a'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-len * 0.1 + i * len * 0.06, 0, len * 0.008, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#c4121a'; [-0.42, 0.42].forEach(f => ctx.fillRect(len * f - len * 0.01, -len * 0.024, len * 0.02, len * 0.048));
  // tassel
  ctx.strokeStyle = '#c4121a'; ctx.lineWidth = Math.max(1, len * 0.004);
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(len * 0.42, len * 0.02); ctx.quadraticCurveTo(len * 0.43 + k * len * 0.004, len * 0.09, len * 0.41 + k * len * 0.01, len * 0.15); ctx.stroke(); }
  ctx.fillStyle = '#e8b84a'; ctx.beginPath(); ctx.arc(len * 0.42, len * 0.03, len * 0.012, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function omMandala(ctx, x, y, r, pal, t, F) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.15);
  M.mandala(ctx, 0, 0, r, pal.accent, { alpha: 0.55, rings: 4 });
  ctx.restore();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.7); g.addColorStop(0, hexA('#fff3c0', 0.8)); g.addColorStop(1, hexA('#fff3c0', 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `400 ${Math.round(r * 0.85)}px "${F.deva}", "Tiro Devanagari Hindi", serif`;
  ctx.fillStyle = M.foil(ctx, x - r * 0.4, y, x + r * 0.4, y, pal.accent2 || pal.accent, pal.accent);
  ctx.fillText('ॐ', x, y + r * 0.05); ctx.restore();
}

// Static background layer (cached) + animated overlay.
export function drawSceneStatic(ctx, W, H, scene, pal, seed = 's') {
  const U = Math.min(W, H) / 100;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, pal.sky1); sky.addColorStop(1, pal.sky2);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  wash(ctx, W, H, [pal.sky1, pal.sky2, pal.far, pal.flower || pal.accent], seed + scene, 22, scene === 'kailash' || scene === 'palace' ? 0.1 : 0.18);
  const horizon = H * 0.62;
  switch (scene) {
    case 'ghat': {
      cloud(ctx, W * 0.2, H * 0.14, U * 9, 'rgba(255,255,255,.35)'); cloud(ctx, W * 0.78, H * 0.1, U * 7, 'rgba(255,255,255,.3)');
      ctx.save(); ctx.globalAlpha = 0.55;
      [0.08, 0.22, 0.36, 0.62, 0.78, 0.92].forEach((f, i) => shikhara(ctx, W * f, horizon, U * (8 + (i % 3) * 3), U * (18 + (i % 3) * 7), pal.far, i % 2 ? pal.accent2 : null));
      for (let i = 0; i < 12; i++) ctx.fillRect(W * (i / 12), horizon - U * (3 + (i * 7) % 6), W / 12 - U, U * (3 + (i * 7) % 6));
      chhatri(ctx, W * 0.5, horizon - U * 2, U * 6, pal.far);
      ctx.restore();
      ghatSteps(ctx, W, horizon, H * 0.06, hexA(pal.near, 0.7), hexA(pal.near, 0.5));
      water(ctx, W, horizon + H * 0.06, H * 0.32, pal.water, 0, seed);
      break;
    }
    case 'kailash': {
      mountains(ctx, W, horizon + H * 0.05, H * 0.28, hexA(pal.far, 0.6), null, seed + 'a', 6);
      kailashPeak(ctx, W * 0.5, horizon + H * 0.05, W * 0.9, H * 0.4, pal.far, pal.near);
      mountains(ctx, W, horizon + H * 0.12, H * 0.16, hexA(pal.water, 0.95), null, seed + 'b', 4);
      water(ctx, W, horizon + H * 0.12, H * 0.26, pal.water, 0, seed);
      break;
    }
    case 'vrindavan': {
      sunGlow(ctx, W * 0.72, H * 0.3, U * 6, '#ffd2a8');
      ctx.save(); ctx.globalAlpha = 0.6; for (let i = 0; i < 6; i++) tree(ctx, W * (0.05 + i * 0.18), horizon, U * (14 + (i % 2) * 6), pal.far, seed + i); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.9; tree(ctx, W * 0.1, horizon + H * 0.03, U * 26, pal.near, seed + 'x'); tree(ctx, W * 0.92, horizon + H * 0.03, U * 22, pal.near, seed + 'y'); ctx.restore();
      water(ctx, W, horizon + H * 0.02, H * 0.36, pal.water, 0, seed);
      break;
    }
    case 'ayodhya': {
      sunGlow(ctx, W * 0.5, H * 0.36, U * 8, '#fff1c8');
      ctx.save(); ctx.globalAlpha = 0.7;
      M.domes(ctx, W * 0.1, W * 0.9, horizon, H * 0.22, pal.far);
      [0.12, 0.88].forEach(f => shikhara(ctx, W * f, horizon, U * 10, U * 26, pal.near, null));
      ctx.fillStyle = pal.near; ctx.fillRect(0, horizon - U * 4, W, U * 4);
      ctx.restore();
      water(ctx, W, horizon, H * 0.38, pal.water, 0, seed);
      break;
    }
    case 'temple': {
      sunGlow(ctx, W * 0.5, H * 0.3, U * 6, '#fff6d8');
      ctx.save(); ctx.globalAlpha = 0.75;
      shikhara(ctx, W * 0.5, horizon, U * 26, U * 52, pal.far, pal.accent2);
      shikhara(ctx, W * 0.24, horizon, U * 14, U * 28, pal.far, null); shikhara(ctx, W * 0.76, horizon, U * 14, U * 28, pal.far, null);
      ctx.fillStyle = pal.far; ctx.fillRect(W * 0.1, horizon - U * 5, W * 0.8, U * 5);
      ctx.restore();
      ghatSteps(ctx, W, horizon, H * 0.38, hexA(pal.water, 0.9), hexA(pal.water, 0.7));
      break;
    }
    case 'lotuspond': {
      sunGlow(ctx, W * 0.5, H * 0.32, U * 7, '#fff0e8');
      ctx.save(); ctx.globalAlpha = 0.45; mountains(ctx, W, horizon, H * 0.12, pal.far, null, seed, 4); ctx.restore();
      water(ctx, W, horizon, H * 0.38, pal.water, 0, seed);
      const R = M.rng('lp' + seed);
      for (let i = 0; i < 14; i++) { const y = horizon + H * (0.06 + R() * 0.3), x = R() * W; ctx.fillStyle = hexA(pal.leaf, 0.75); ctx.beginPath(); ctx.ellipse(x, y, U * (3 + R() * 3), U * (1 + R()), 0, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'sunrise': {
      M.sunburst(ctx, W / 2, horizon, Math.max(W, H), '#fff3d0', 0.18, 40);
      sunGlow(ctx, W * 0.5, horizon, U * 12, '#fff1c0');
      mountains(ctx, W, horizon + H * 0.04, H * 0.12, hexA(pal.far, 0.8), null, seed, 5);
      ctx.fillStyle = pal.near; ctx.fillRect(0, horizon + H * 0.04, W, H);
      break;
    }
    case 'palace': {
      ctx.save(); ctx.globalAlpha = 0.85;
      M.domes(ctx, W * 0.05, W * 0.95, horizon, H * 0.3, pal.far);
      ctx.fillStyle = pal.far; ctx.fillRect(0, horizon - U * 2, W, U * 2);
      ctx.fillStyle = 'rgba(255,214,120,.55)';
      for (let i = 0; i < 9; i++) { M.archPath(ctx, W * (0.08 + i * 0.1), horizon - U * 2, U * 4, U * 8, 'pointed'); ctx.fill(); }
      ctx.restore();
      water(ctx, W, horizon, H * 0.38, pal.water, 0, seed);
      break;
    }
    case 'mandap': {
      M.mandapStructure(ctx, W / 2, H * 0.04, W * 0.92, H * 0.4, pal, seed);
      ctx.fillStyle = hexA(pal.near, 0.25); ctx.fillRect(0, H * 0.66, W, H * 0.34);
      break;
    }
    case 'pastel': default: {
      wash(ctx, W, H, [pal.flower, pal.accent2, pal.sky2], seed + 'p', 12, 0.25);
      break;
    }
  }
  grain(ctx, W, H, pal.ink, seed + scene);
}

export function drawSceneAnimated(ctx, W, H, scene, pal, t, seed = 's') {
  const U = Math.min(W, H) / 100;
  const horizon = H * 0.62;
  if (scene === 'ghat') { floatingDiyas(ctx, W, horizon + H * 0.08, H * 0.98, t, pal, seed); birds(ctx, W, H, t, 'rgba(90,50,40,.55)', seed); }
  if (scene === 'kailash') { stars(ctx, W, H, t, seed); moon(ctx, W * 0.78, H * 0.12, U * 4, '#fff6dc'); floatingDiyas(ctx, W, horizon + H * 0.14, H * 0.98, t, pal, seed); }
  if (scene === 'vrindavan') { birds(ctx, W, H, t, 'rgba(60,40,60,.5)', seed); }
  if (scene === 'ayodhya') { [0.2, 0.36, 0.64, 0.8].forEach((f, i) => flag(ctx, W * f, horizon - H * (0.12 + (i % 2) * 0.04), U * 4, t + i, '#ff7a1a')); floatingDiyas(ctx, W, horizon + H * 0.05, H * 0.98, t, pal, seed); }
  if (scene === 'temple') { M.toran(ctx, -U * 2, W + U * 2, U * 1, U * 5, pal, seed); }
  if (scene === 'lotuspond') {
    const R = M.rng('lpa' + seed);
    for (let i = 0; i < 7; i++) { const x = R() * W, y = horizon + H * (0.08 + R() * 0.28), s = U * (2.6 + R() * 2.4); M.lotus(ctx, x, y + Math.sin(t + i) * U * 0.3, s * (0.85 + 0.15 * Math.sin(t * 0.8 + i)), pal.flower, pal.accent2, { base: false }); }
  }
  if (scene === 'sunrise') { birds(ctx, W, H, t, 'rgba(80,20,10,.5)', seed); }
  if (scene === 'palace') { M.fairyLights(ctx, -U * 2, W + U * 2, U * 2, U * 6, 22, pal, seed); stars(ctx, W, H * 0.6, t, seed); }
  if (scene === 'mandap') { M.fairyLights(ctx, -U * 2, W + U * 2, U * 3, U * 5, 20, pal, seed); }
  if (scene === 'pastel') {
    const R = M.rng('pa' + seed);
    for (let i = 0; i < 18; i++) { const x = (R() * W + Math.sin(t * 0.3 + i) * U * 4), y = ((R() * H - t * U * (1 + R())) % H + H) % H; const g = ctx.createRadialGradient(x, y, 0, x, y, U * 3); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - U * 3, y - U * 3, U * 6, U * 6); }
  }
}

export function drawSymbol(ctx, W, H, theme, t, F, alpha = 1) {
  const U = Math.min(W, H) / 100, pal = theme.pal;
  ctx.save(); ctx.globalAlpha *= alpha;
  const sway = Math.sin(t * 0.8) * 0.02;
  switch (theme.symbol) {
    case 'trishul': ctx.save(); ctx.translate(W * 0.14, H * 0.98); ctx.rotate(sway); trishulDamru(ctx, 0, 0, H * 0.5, pal); ctx.restore(); break;
    case 'flute': bansuri(ctx, W * 0.3, H * 0.88, W * 0.55, -0.35 + sway, pal); M.peacockFeather(ctx, W * 0.86, H * 0.98, H * 0.32, -0.25 + sway, pal); break;
    case 'bow': ctx.save(); ctx.translate(W * 0.5, H * 0.86); ctx.rotate(sway); M.dhanush(ctx, 0, 0, W * 0.26, pal); ctx.restore(); break;
    case 'om': omMandala(ctx, W * 0.5, H * 0.84, Math.min(W, H) * 0.17, pal, t, F); break;
    case 'kalash': M.kalash(ctx, W * 0.5, H * 0.96, H * 0.2, pal); break;
    case 'agni': M.agniKund(ctx, W * 0.5, H * 0.95, H * 0.13 * (1 + Math.sin(t * 6) * 0.02), pal); break;
    case 'mandala': ctx.save(); ctx.translate(W * 0.5, H * 0.92); ctx.rotate(t * 0.1); M.mandala(ctx, 0, 0, Math.min(W, H) * 0.35, pal.accent, { alpha: 0.45, rings: 5 }); ctx.restore(); break;
  }
  ctx.restore();
}

// ---------------- text scenes ----------------
const nm = (d, k, lang) => (lang === 'hi' ? (d.couple[k].hi || d.couple[k].en) : (d.couple[k].en || d.couple[k].hi));
function T(text, role, size, o = {}) { return { k: 'text', text, role, size, ...o }; }
const isDeva = s => /[ऀ-ॿ]/.test(s);

function sceneBlocks(design, kind, data, lg) {
  const d = design, B = [], dd = d.style.devaDigits;
  const first = d.couple.order === 'groom' ? ['groom', 'bride'] : ['bride', 'groom'];
  if (kind === 'intro') {
    const t = invocationText(d, 'hi') || '॥ शुभ विवाह ॥';
    B.push(T(t, isDeva(t) ? 'deva' : 'display', t.length < 8 ? 9 : 4.4, { color: 'accent', lh: 1.65, gap: 2.4, prio: 0 }));
    B.push({ k: 'divider', gap: 1.6, prio: 2 });
    B.push(T(lg === 'hi' ? '॥ शुभ विवाह ॥' : 'SHUBH VIVAH', lg === 'hi' ? 'deva' : 'display', 3, { color: 'ink2', ls: lg === 'hi' ? 0 : 0.3, prio: 1 }));
  } else if (kind === 'couple') {
    const hl = lg === 'hi' ? (d.wording.headline.hi || d.wording.headline.en) : d.wording.headline.en;
    if (hl) B.push(T(hl, 'body', 3, { italic: true, color: 'ink2', gap: 2, prio: 3 }));
    B.push(T(nm(d, first[0], lg), lg === 'hi' ? 'deva' : 'script', 13, { color: 'ink', name: true, fitWidth: true, maxLines: 1, gap: 0.4, lh: 1.05, prio: 0 }));
    B.push(T('&', 'display', 6, { italic: true, color: 'accent', gap: 0.4, prio: 0 }));
    B.push(T(nm(d, first[1], lg), lg === 'hi' ? 'deva' : 'script', 13, { color: 'ink', name: true, fitWidth: true, maxLines: 1, gap: 2, lh: 1.05, prio: 0 }));
    B.push(T(lg === 'hi' ? 'परिणय सूत्र में बंधने जा रहे हैं' : 'are getting married', 'body', 3, { color: 'ink2', italic: true, prio: 2 }));
  } else if (kind === 'date') {
    const dt = d.wedding.date ? new Date(d.wedding.date + 'T00:00') : null;
    B.push(T(lg === 'hi' ? 'तिथि सुरक्षित रखें' : 'Save the Date', lg === 'hi' ? 'deva' : 'script', 8, { color: 'accent', gap: 1.6, prio: 0 }));
    if (dt) {
      B.push(T(new Intl.DateTimeFormat(lg === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long' }).format(dt).toUpperCase(), lg === 'hi' ? 'deva' : 'display', 3, { color: 'ink2', ls: lg === 'hi' ? 0 : 0.3, gap: 0.6, prio: 1 }));
      B.push(T(String(dt.getDate()), 'display', 22, { color: 'ink', gap: 0.2, lh: 1, prio: 0 }));
      B.push(T(new Intl.DateTimeFormat(lg === 'hi' ? 'hi-IN' : 'en-IN', { month: 'long', year: 'numeric' }).format(dt).toUpperCase(), lg === 'hi' ? 'deva' : 'display', 4, { color: 'ink', ls: lg === 'hi' ? 0 : 0.2, gap: 1.6, prio: 0 }));
    }
    if (d.wedding.muhurat) B.push(T(`${L(lg, 'muhurat')}: ${fmtTime(d.wedding.muhurat, lg, { devaDigits: dd })}`, 'body', 3, { color: 'ink2', italic: true, prio: 2 }));
    else if (d.wedding.time) B.push(T(fmtTime(d.wedding.time, lg, { devaDigits: dd }), 'body', 3, { color: 'ink2', prio: 2 }));
  } else if (kind === 'event') {
    data.forEach((e, i) => {
      const n = lg === 'hi' ? (e.name.hi || e.name.en) : (e.name.en || e.name.hi);
      B.push(T(n, isDeva(n) ? 'deva' : 'script', data.length > 1 ? 7.5 : 10, { color: 'accent', fitWidth: true, maxLines: 1, gap: 0.6, prio: 0 }));
      const when = [e.date && fmtDate(e.date, lg, { short: false, devaDigits: dd }), fmtTimeRange(e.start, e.end, lg, { devaDigits: dd })].filter(Boolean);
      when.forEach((w, k) => B.push(T(w, 'display', 3, { color: 'ink', upper: lg === 'en' && k === 0, ls: lg === 'en' && k === 0 ? 0.12 : 0, gap: 0.3, prio: 1 })));
      if (e.venue) B.push(T(e.venue, 'body', 3, { color: 'ink2', gap: 0.3, prio: 2 }));
      if (e.dress && d.show.dress) B.push(T(`${L(lg, 'dress')}: ${e.dress}`, 'body', 2.4, { color: 'ink2', italic: true, gap: 0.3, prio: 4 }));
      if (i < data.length - 1) B.push({ k: 'divider', gap: 1.6, gapTop: 1, prio: 5 });
    });
  } else if (kind === 'venue') {
    B.push(T(lg === 'hi' ? 'विवाह स्थल' : 'VENUE', lg === 'hi' ? 'deva' : 'display', 3, { color: 'ink2', ls: lg === 'hi' ? 0 : 0.35, gap: 1.2, prio: 1 }));
    B.push(T(d.wedding.venue || '', 'script', 9, { color: 'accent', fitWidth: true, maxLines: 2, gap: 1, prio: 0 }));
    if (d.wedding.address) B.push(T(d.wedding.address, 'body', 3, { color: 'ink', gap: 1.2, prio: 1 }));
  } else if (kind === 'closing') {
    const cl = lg === 'hi' ? (d.wording.closing.hi || d.wording.closing.en) : d.wording.closing.en;
    if (cl) B.push(T(cl, isDeva(cl) ? 'deva' : 'script', 7, { color: 'accent', gap: 1.4, prio: 0 }));
    const msg = lg === 'hi' ? (d.wording.message.hi || d.wording.message.en) : d.wording.message.en;
    if (msg) B.push(T(msg, 'body', 3, { color: 'ink', italic: true, gap: 1.4, prio: 2 }));
    const hosts = lg === 'hi' ? (d.family.hosts.hi || d.family.hosts.en) : d.family.hosts.en;
    if (hosts) B.push(T(hosts, 'display', 3.6, { color: 'ink', gap: 1, prio: 1 }));
    if (d.rsvp.phone) B.push(T(`${L(lg, 'rsvp')}: ${[d.rsvp.name, d.rsvp.phone].filter(Boolean).join(' · ')}`, 'body', 2.6, { color: 'ink2', gap: 0.6, prio: 3 }));
    if (d.couple.hashtag) B.push(T(d.couple.hashtag, 'display', 3.2, { color: 'accent', prio: 4 }));
  }
  return B;
}

function drawBlocks(ctx, list, box, total, U, pal, align, p, dark) {
  let y = box.y + Math.max(0, (box.h - total) / 2);
  const n = list.length;
  list.forEach((bk, i) => {
    y += bk._gapTop;
    const st = 0.05 + (i / Math.max(1, n)) * 0.45;
    const a = ease((p - st) / 0.3), dy = (1 - a) * U * 2.5;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, dy);
    const cx = box.x + box.w / 2;
    if (bk.k === 'text') {
      ctx.font = bk._font; if ('letterSpacing' in ctx) ctx.letterSpacing = bk._ls ? `${bk._ls.toFixed(1)}px` : '0px';
      ctx.textAlign = 'center';
      const col = { ink: pal.ink, ink2: pal.ink2, accent: pal.accent }[bk.color || 'ink'];
      ctx.fillStyle = bk.name ? M.foil(ctx, box.x, y, box.x + box.w, y + bk._h, col, pal.accent) : col;
      ctx.shadowColor = dark ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.55)'; ctx.shadowBlur = U * 1.2;
      bk._lines.forEach((line, li) => ctx.fillText(line, cx + (bk._ls ? bk._ls / 2 : 0), y + bk._lh * li + bk._px * 0.98 + (bk._lh - bk._px) / 2));
    } else if (bk.k === 'divider') {
      M.divider(ctx, 'lotus', cx, y + bk._h / 2, Math.min(box.w * 0.5, U * 36), pal.accent, hexA(pal.accent, 0.3));
    }
    ctx.restore();
    y += bk._h + bk._gap;
  });
}

// ---------------- timeline ----------------
export class ReelTimeline {
  constructor(design, W, H) {
    this.design = design; this.W = W; this.H = H;
    this.theme = REEL_MAP[design.video.reel] || REEL_THEMES[0];
    this.lg = design.lang === 'hi' ? 'hi' : 'en';
    const long = design.video.length === 'long';
    const S = [];
    const inv = design.wording.invocation;
    if (design.video.verseIntro !== false && inv && inv !== 'none') S.push({ kind: 'intro', dur: 5 });
    S.push({ kind: 'couple', dur: 5 });
    if (design.wedding.date) S.push({ kind: 'date', dur: 4.2 });
    if (design.video.timeline !== false && design.events.length) {
      const per = long ? 1 : 2;
      for (let i = 0; i < design.events.length; i += per) S.push({ kind: 'event', data: design.events.slice(i, i + per), dur: per === 1 ? 3.6 : 4.4 });
    }
    if (design.wedding.venue) S.push({ kind: 'venue', dur: 3.8 });
    S.push({ kind: 'closing', dur: 4.6 });
    let t = 0; S.forEach(s => { s.start = t; t += s.dur; });
    this.scenes = S; this.total = t;
    this.bg = null; this.F = fontsFor(design, templateById(design.templateId));
    this.R = M.rng('petal' + this.theme.id);
    this.petals = [...Array(design.video.particles === 'none' ? 0 : 30)].map(() => ({ x: this.R(), y: this.R(), s: 0.6 + this.R(), sp: 0.4 + this.R() * 0.8, r: this.R() * 6, h: this.R() }));
  }
  sceneCanvas() { return null; } // compatibility with card timeline API
  background() {
    if (!this.bg) {
      const c = document.createElement('canvas'); c.width = this.W; c.height = this.H;
      drawSceneStatic(c.getContext('2d'), this.W, this.H, this.theme.scene, this.theme.pal, this.theme.id);
      this.bg = c;
    }
    return this.bg;
  }
  draw(ctx, t) {
    const { W, H, theme } = this;
    const pal = theme.pal, U = Math.min(W, H) / 100;
    // background with slow push-in
    const z = 1 + 0.06 * (t / this.total);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(this.background(), -W / 2, -H / 2); ctx.restore();
    drawSceneAnimated(ctx, W, H, theme.scene, pal, t, theme.id);
    // which scene
    let i = this.scenes.findIndex(s => t < s.start + s.dur); if (i < 0) i = this.scenes.length - 1;
    const sc = this.scenes[i], local = t - sc.start;
    // symbol: strong on intro, gentle elsewhere
    const symA = sc.kind === 'intro' ? ease(local / 1.2) : 0.55;
    drawSymbol(ctx, W, H, theme, t, this.F, symA);
    // soft panel behind text for legibility
    const box = { x: W * 0.1, y: H * 0.12, w: W * 0.8, h: H * (theme.symbol === 'none' ? 0.72 : 0.5) };
    if (theme.scene === 'mandap') { box.y = H * 0.44; box.h = H * 0.5; }
    if (W > H) { box.y = H * 0.1; box.h = H * 0.75; box.x = W * 0.25; box.w = W * 0.5; }
    const veil = ctx.createRadialGradient(W / 2, box.y + box.h / 2, 0, W / 2, box.y + box.h / 2, Math.max(box.w, box.h) * 0.75);
    veil.addColorStop(0, theme.dark ? 'rgba(10,10,30,.35)' : 'rgba(255,250,244,.55)'); veil.addColorStop(1, theme.dark ? 'rgba(10,10,30,0)' : 'rgba(255,250,244,0)');
    ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);
    // text
    const blocks = sceneBlocks(this.design, sc.kind, sc.data, this.lg);
    const style = { ...this.design.style, scale: 1, lineHeight: 1 };
    const { list, total } = layout(ctx, blocks, box, U, this.F, style);
    const fadeOut = clamp01((sc.dur - local) / 0.6);
    ctx.save(); ctx.globalAlpha = fadeOut;
    if (sc.kind === 'couple' && this.design.photos.couple?.src && this.design.show.photo) {
      const img = getImage(this.design.photos.couple.src);
      const pw = Math.min(W * 0.4, H * 0.18), ph = pw * 1.25;
      ctx.save(); ctx.globalAlpha *= ease(local / 1); drawPhoto(ctx, img, this.design.photos.couple, W / 2 - pw / 2, Math.min(H * 0.64, H - ph - U * 4), pw, ph, 'arch', pal, U); ctx.restore();
    }
    drawBlocks(ctx, list, box, total, U, pal, 'center', clamp01(local / 1.6), theme.dark);
    ctx.restore();
    // petals / sparkles
    const kind = this.design.video.particles || 'petals';
    if (kind !== 'none') this.petals.forEach(p => {
      const x = (p.x * W + Math.sin(t * 0.7 + p.r) * U * 4), y = ((p.y * H + t * p.sp * U * 8) % (H + U * 6)) - U * 3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.r + t * p.sp);
      if (kind === 'sparkles') { ctx.globalAlpha = 0.6 * Math.abs(Math.sin(t * 2 + p.r)); M.star8(ctx, 0, 0, U * 0.8 * p.s, pal.accent); }
      else { ctx.globalAlpha = 0.75; ctx.fillStyle = p.h > 0.6 ? '#f2a9a0' : p.h > 0.3 ? '#e2584f' : '#f5a623'; ctx.beginPath(); ctx.ellipse(0, 0, U * 0.6 * p.s, U * 1.1 * p.s, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    // fade in/out at ends
    const edge = Math.min(1, t / 0.6, (this.total - t) / 0.9);
    if (edge < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, edge)})`; ctx.fillRect(0, 0, W, H); }
  }
}

// Static scene background for card templates (bg.type === 'scene').
export function drawSceneCard(ctx, W, H, sceneId, pal, seed, F) {
  const theme = REEL_THEMES.find(t => t.scene === sceneId) || REEL_THEMES[0];
  const p = { ...theme.pal, ...(pal || {}) };
  drawSceneStatic(ctx, W, H, sceneId, { ...theme.pal, ink: p.ink }, seed);
  drawSceneAnimated(ctx, W, H, sceneId, theme.pal, 2, seed);
  if (F && theme.symbol !== 'none') { ctx.save(); ctx.translate(W * 0.125, H); ctx.scale(0.75, 0.75); ctx.translate(0, -H); drawSymbol(ctx, W, H, theme, 0, F, 0.95); ctx.restore(); }
}
