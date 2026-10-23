// Original procedural ornaments drawn with Canvas 2D paths.
// All sizes are in canvas pixels; callers pass sizes derived from the card's unit (U = min(W,H)/100).

export function rng(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function foil(ctx, x0, y0, x1, y1, c1, c2) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, c2); g.addColorStop(0.45, c1); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
  return g;
}

function petalPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(w, -h * 0.25, w * 0.6, -h * 0.8, 0, -h);
  ctx.bezierCurveTo(-w * 0.6, -h * 0.8, -w, -h * 0.25, 0, 0);
  ctx.closePath();
}

export function lotus(ctx, x, y, s, fill, stroke, opts = {}) {
  ctx.save(); ctx.translate(x, y);
  const lw = Math.max(1, s * 0.025);
  ctx.lineWidth = lw; ctx.strokeStyle = stroke;
  const layers = [
    { a: [-70, 70], h: 0.55, w: 0.22, alpha: 0.75 },
    { a: [-45, 45], h: 0.8, w: 0.26, alpha: 0.85 },
    { a: [-22, 22], h: 0.95, w: 0.28, alpha: 0.95 },
    { a: [0], h: 1.05, w: 0.3, alpha: 1 },
  ];
  for (const L of layers) {
    for (const deg of L.a) {
      ctx.save(); ctx.rotate(deg * Math.PI / 180);
      petalPath(ctx, s * L.w, s * L.h);
      ctx.globalAlpha = (opts.alpha ?? 1) * L.alpha;
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.globalAlpha = opts.alpha ?? 1;
      if (stroke) ctx.stroke();
      // centre vein
      if (stroke) { ctx.beginPath(); ctx.moveTo(0, -s * 0.05); ctx.lineTo(0, -s * L.h * 0.7); ctx.globalAlpha *= 0.5; ctx.stroke(); }
      ctx.restore();
    }
  }
  // water line / base
  if (opts.base !== false) {
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.02, s * 0.5, s * 0.08, 0, 0, Math.PI);
    ctx.strokeStyle = stroke; ctx.stroke();
  }
  ctx.restore();
}

export function mandala(ctx, x, y, r, color, opts = {}) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.lineWidth = Math.max(1, r * 0.006);
  const rings = opts.rings ?? 5;
  for (let i = 0; i < rings; i++) {
    const rr = r * (0.18 + i * (0.82 / rings));
    const n = 8 + i * 8;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < n; k++) {
      ctx.save(); ctx.rotate((k / n) * Math.PI * 2 + (i % 2) * Math.PI / n);
      ctx.translate(0, -rr);
      const ph = r * (0.82 / rings) * 0.9;
      if (i % 2 === 0) { petalPath(ctx, ph * 0.28, ph); ctx.stroke(); }
      else {
        ctx.beginPath(); ctx.arc(0, -ph * 0.45, ph * 0.18, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -ph * 0.45, ph * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
  if ((opts.alpha ?? 1) > 0.2) { ctx.beginPath(); ctx.arc(0, 0, r * 0.06, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function paisley(ctx, x, y, s, rot, fill, stroke) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const shape = (k) => {
    ctx.beginPath();
    ctx.moveTo(0, -s * k);
    ctx.bezierCurveTo(s * 0.55 * k, -s * 0.9 * k, s * 0.75 * k, s * 0.25 * k, 0, s * 0.45 * k);
    ctx.bezierCurveTo(-s * 0.55 * k, s * 0.55 * k, -s * 0.6 * k, -s * 0.05 * k, -s * 0.15 * k, -s * 0.15 * k);
    ctx.bezierCurveTo(s * 0.12 * k, -s * 0.25 * k, s * 0.1 * k, -s * 0.6 * k, 0, -s * k);
    ctx.closePath();
  };
  ctx.lineWidth = Math.max(1, s * 0.04); ctx.strokeStyle = stroke;
  shape(1); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.stroke();
  ctx.save(); ctx.translate(s * 0.08, s * 0.12); shape(0.55); ctx.stroke(); ctx.restore();
  ctx.fillStyle = stroke;
  for (let i = 0; i < 5; i++) {
    const a = -0.6 + i * 0.5;
    ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.55 + s * 0.05, s * 0.035, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function marigold(ctx, x, y, r, c1, c2, rand) {
  ctx.save(); ctx.translate(x, y);
  const R = rand || Math.random;
  for (let ring = 3; ring >= 0; ring--) {
    const rr = r * (0.35 + ring * 0.2);
    const n = 8 + ring * 4;
    ctx.fillStyle = ring % 2 ? c1 : c2;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ring * 0.4 + R() * 0.2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = c2; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function leaf(ctx, x, y, len, rot, fill, stroke) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.32, len * 0.4, 0, len);
  ctx.quadraticCurveTo(-len * 0.32, len * 0.4, 0, 0);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, len * 0.03);
    ctx.beginPath(); ctx.moveTo(0, len * 0.05); ctx.lineTo(0, len * 0.92); ctx.stroke();
  }
  ctx.restore();
}

// Mango-leaf toran with marigolds — hung across the top of a card.
export function toran(ctx, x0, x1, y, s, pal, seed = 't') {
  const R = rng(seed);
  ctx.save();
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const n = Math.max(5, Math.round((x1 - x0) / (s * 0.9)));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * (x1 - x0);
    if (i % 2 === 0) {
      leaf(ctx, x, y, s * 1.5, (R() - 0.5) * 0.15, pal.leaf || '#2f6b3a', pal.leafVein || '#1d4a27');
    } else {
      ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + s * 0.7); ctx.stroke();
      marigold(ctx, x, y + s * 0.8, s * 0.32, pal.marigold || '#f29a1f', pal.marigold2 || '#d9640f', R);
      marigold(ctx, x, y + s * 1.35, s * 0.24, pal.marigold2 || '#d9640f', pal.marigold || '#f29a1f', R);
    }
  }
  ctx.restore();
}

// Swagged marigold garland across the top.
export function garland(ctx, x0, x1, y, sag, r, c1, c2, seed = 'g', swags = 3) {
  const R = rng(seed);
  const w = (x1 - x0) / swags;
  for (let s = 0; s < swags; s++) {
    const a = x0 + s * w, b = a + w;
    const n = Math.max(6, Math.round(w / (r * 1.4)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = a + t * w;
      const yy = y + Math.sin(t * Math.PI) * sag;
      marigold(ctx, x, yy, r, i % 3 === 0 ? c2 : c1, i % 3 === 0 ? c1 : c2, R);
    }
    // tassel
    ctx.save(); ctx.strokeStyle = c2; ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath(); ctx.moveTo(b, y); ctx.lineTo(b, y + sag * 0.9); ctx.stroke();
    marigold(ctx, b, y + sag * 0.95, r * 0.9, c1, c2, R);
    ctx.restore();
  }
}

// Cusped/pointed Mughal-style arch path; (x,y) is the bottom-left, w x h the box.
export function archPath(ctx, x, y, w, h, style = 'pointed') {
  const cx = x + w / 2;
  const sh = h * (style === 'round' ? 0.5 : 0.62);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + sh);
  if (style === 'round') {
    ctx.arc(cx, y - h + sh, w / 2, Math.PI, 0);
  } else if (style === 'cusped') {
    const cusps = 5;
    const top = y - h;
    const pts = [];
    for (let i = 0; i <= cusps; i++) {
      const t = i / cusps;
      const ang = Math.PI - t * Math.PI;
      pts.push([cx + Math.cos(ang) * w / 2, y - h + sh - Math.sin(ang) * (sh * 0.85)]);
    }
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1], [qx, qy] = pts[i];
      const mx = (px + qx) / 2, my = (py + qy) / 2;
      const nx = cx + (mx - cx) * 0.9, ny = (y - h + sh) + (my - (y - h + sh)) * 0.9;
      ctx.quadraticCurveTo(nx, ny, qx, qy);
    }
    ctx.lineTo(cx, top); // finial
    ctx.moveTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  } else {
    ctx.bezierCurveTo(x, y - h + sh * 0.3, cx - w * 0.15, y - h + sh * 0.25, cx, y - h);
    ctx.bezierCurveTo(cx + w * 0.15, y - h + sh * 0.25, x + w, y - h + sh * 0.3, x + w, y - h + sh);
  }
  ctx.lineTo(x + w, y);
  if (style !== 'cusped') ctx.closePath();
}

export function diya(ctx, x, y, s, pal, glow = true) {
  ctx.save(); ctx.translate(x, y);
  if (glow) {
    const g = ctx.createRadialGradient(0, -s * 0.7, 0, 0, -s * 0.7, s * 1.3);
    g.addColorStop(0, 'rgba(255,200,90,0.55)'); g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -s * 0.7, s * 1.3, 0, Math.PI * 2); ctx.fill();
  }
  // bowl
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, -s * 0.15);
  ctx.quadraticCurveTo(0, s * 0.55, s * 0.7, -s * 0.15);
  ctx.quadraticCurveTo(s * 0.85, -s * 0.25, s * 0.95, -s * 0.32);
  ctx.lineTo(-s * 0.7, -s * 0.15);
  ctx.closePath();
  ctx.fillStyle = pal.diya || '#b5562a'; ctx.fill();
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke();
  // dots on bowl
  ctx.fillStyle = pal.accent;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * s * 0.22, s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
  // flame
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.2);
  ctx.bezierCurveTo(s * 0.32, -s * 0.45, s * 0.1, -s * 0.8, 0, -s * 1.05);
  ctx.bezierCurveTo(-s * 0.1, -s * 0.8, -s * 0.32, -s * 0.45, 0, -s * 0.2);
  const fg = ctx.createLinearGradient(0, -s * 1.05, 0, -s * 0.2);
  fg.addColorStop(0, '#ffe9a8'); fg.addColorStop(0.6, '#ffb52e'); fg.addColorStop(1, '#e8611a');
  ctx.fillStyle = fg; ctx.fill();
  ctx.restore();
}

export function floralCorner(ctx, x, y, s, rot, pal) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, s * 0.02);
  // vine along both edges
  ctx.beginPath();
  ctx.moveTo(0, s); ctx.bezierCurveTo(0, s * 0.4, s * 0.1, s * 0.1, s * 0.35, s * 0.05);
  ctx.moveTo(s, 0); ctx.bezierCurveTo(s * 0.4, 0, s * 0.1, s * 0.1, s * 0.05, s * 0.35);
  ctx.stroke();
  const leafC = pal.leaf || pal.accent;
  [[0.04, 0.75, 0.3], [0.1, 0.5, -0.5], [0.75, 0.04, -1.2], [0.5, 0.1, -2.1]].forEach(([a, b, r]) =>
    leaf(ctx, s * a, s * b, s * 0.2, r, leafC, null));
  // flower at the corner
  ctx.fillStyle = pal.flower || pal.accent2 || pal.accent;
  for (let k = 0; k < 6; k++) {
    ctx.save(); ctx.translate(s * 0.15, s * 0.15); ctx.rotate(k * Math.PI / 3);
    petalPath(ctx, s * 0.07, s * 0.15); ctx.globalAlpha = 0.9; ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = pal.accent;
  ctx.beginPath(); ctx.arc(s * 0.15, s * 0.15, s * 0.04, 0, Math.PI * 2); ctx.fill();
  // bud
  ctx.fillStyle = pal.flower || pal.accent;
  ctx.beginPath(); ctx.arc(s * 0.38, s * 0.04, s * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.04, s * 0.38, s * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------- Repeating background patterns ----------
export function pattern(ctx, type, W, H, color, alpha, U, seed) {
  if (!type) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, U * 0.12);
  const R = rng(seed || type);
  if (type === 'jaali') {
    const c = U * 7;
    for (let y = 0; y < H + c; y += c) for (let x = 0; x < W + c; x += c) {
      ctx.beginPath(); ctx.arc(x, y, c / 2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + c / 2, y + c / 2, c * 0.12, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (type === 'star8') {
    const c = U * 9;
    for (let y = 0; y < H + c; y += c) for (let x = 0; x < W + c; x += c) {
      ctx.save(); ctx.translate(x, y);
      for (let r = 0; r < 2; r++) { ctx.rotate(Math.PI / 4); ctx.strokeRect(-c * 0.28, -c * 0.28, c * 0.56, c * 0.56); }
      ctx.restore();
    }
  } else if (type === 'buti') {
    const c = U * 8;
    let row = 0;
    for (let y = c / 2; y < H + c; y += c * 0.85, row++) for (let x = (row % 2) * c / 2; x < W + c; x += c) {
      paisley(ctx, x, y, U * 1.6, 0.6, null, color);
    }
  } else if (type === 'dots') {
    const c = U * 4;
    for (let y = c / 2; y < H; y += c) for (let x = c / 2; x < W; x += c) {
      ctx.beginPath(); ctx.arc(x, y, U * 0.25, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'petals') {
    for (let i = 0; i < 60; i++) {
      const x = R() * W, y = R() * H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 6.28);
      petalPath(ctx, U * 0.8, U * 2.2); ctx.fill(); ctx.restore();
    }
  } else if (type === 'stripes') {
    for (let x = -H; x < W; x += U * 3) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
  } else if (type === 'chevron') {
    const c = U * 6;
    for (let y = 0; y < H + c; y += c) { ctx.beginPath(); for (let x = 0; x <= W + c; x += c) { ctx.lineTo(x, y); ctx.lineTo(x + c / 2, y + c / 2); } ctx.stroke(); }
  }
  ctx.restore();
}

// Temple bell
export function bell(ctx, x, y, s, pal) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s * 0.6); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, s * 0.6);
  ctx.bezierCurveTo(-s * 0.2, s * 0.8, -s * 0.18, s * 1.05, -s * 0.38, s * 1.2);
  ctx.lineTo(s * 0.38, s * 1.2);
  ctx.bezierCurveTo(s * 0.18, s * 1.05, s * 0.2, s * 0.8, s * 0.12, s * 0.6);
  ctx.closePath();
  ctx.fillStyle = foil(ctx, -s * 0.4, 0, s * 0.4, 0, pal.accent, pal.accent2 || pal.accent); ctx.fill();
  ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, s * 1.27, s * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function star8(ctx, x, y, r, fill, stroke) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.62 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke(); }
  ctx.restore();
}

export function crescent(ctx, x, y, r, color) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.38, y - r * 0.15, r * 0.85, 0, Math.PI * 2, true);
  ctx.fillStyle = color; ctx.fill('evenodd');
  ctx.restore();
}

export function wreath(ctx, x, y, r, pal, seed = 'w') {
  const R = rng(seed);
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (a > Math.PI * 0.38 && a < Math.PI * 0.62) continue; // gap at bottom
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    leaf(ctx, px, py, r * 0.16, a + (i % 2 ? 0.9 : 2.2) + R() * 0.2, pal.leaf || pal.accent, null);
  }
  ctx.save(); ctx.fillStyle = pal.flower || pal.accent2;
  [-0.9, -2.2, 0.2, 3.3].forEach(a => {
    for (let k = 0; k < 5; k++) {
      ctx.save(); ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.rotate(k * Math.PI * 0.4);
      petalPath(ctx, r * 0.05, r * 0.1); ctx.fill(); ctx.restore();
    }
  });
  ctx.restore();
}

// Horizontal decorative band (kasavu / phulkari / alpana). Draws within [x0,x1] centred on y.
export function band(ctx, type, x0, x1, y, h, pal) {
  ctx.save();
  if (type === 'kasavu') {
    ctx.fillStyle = foil(ctx, x0, y, x1, y, pal.accent, pal.accent2);
    ctx.fillRect(x0, y - h / 2, x1 - x0, h * 0.18);
    ctx.fillRect(x0, y + h / 2 - h * 0.18, x1 - x0, h * 0.18);
    ctx.fillStyle = pal.ink2 || pal.accent;
    ctx.fillRect(x0, y - h * 0.22, x1 - x0, h * 0.06);
    // temple triangles
    const tw = h * 0.5;
    ctx.fillStyle = pal.accent;
    for (let x = x0; x < x1 - tw / 2; x += tw) {
      ctx.beginPath(); ctx.moveTo(x, y + h * 0.2); ctx.lineTo(x + tw / 2, y - h * 0.12); ctx.lineTo(x + tw, y + h * 0.2); ctx.closePath(); ctx.fill();
    }
  } else if (type === 'phulkari') {
    const d = h;
    const cols = [pal.accent, pal.accent2, pal.flower || '#e94f8a', pal.leaf || '#f6b83c'];
    let i = 0;
    for (let x = x0 + d / 2; x <= x1 - d / 2 + 0.1; x += d, i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(x, y - d / 2); ctx.lineTo(x + d / 2, y); ctx.lineTo(x, y + d / 2); ctx.lineTo(x - d / 2, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.bg;
      ctx.beginPath(); ctx.moveTo(x, y - d / 5); ctx.lineTo(x + d / 5, y); ctx.lineTo(x, y + d / 5); ctx.lineTo(x - d / 5, y); ctx.closePath(); ctx.fill();
    }
  } else if (type === 'alpana') {
    ctx.strokeStyle = pal.accent; ctx.fillStyle = pal.accent; ctx.lineWidth = Math.max(1, h * 0.06);
    const p = h * 1.2;
    for (let x = x0; x < x1; x += p) {
      ctx.beginPath();
      ctx.arc(x + p / 2, y, h * 0.35, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + p / 2, y - h * 0.05, h * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y + h * 0.25, h * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(x0, y + h * 0.4); ctx.lineTo(x1, y + h * 0.4); ctx.stroke();
  }
  ctx.restore();
}

// Small line icons used beside events.
export function icon(ctx, name, x, y, s, color, pal) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (name) {
    case 'ring':
      ctx.beginPath(); ctx.arc(0, s * 0.12, s * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * 0.28); ctx.lineTo(0, -s * 0.45); ctx.lineTo(s * 0.15, -s * 0.28); ctx.lineTo(0, -s * 0.18); ctx.closePath(); ctx.fill();
      break;
    case 'diya': diya(ctx, 0, s * 0.25, s * 0.5, { ...pal, accent: color }, false); break;
    case 'marigold': marigold(ctx, 0, 0, s * 0.35, pal.marigold || '#f29a1f', pal.marigold2 || '#d9640f', rng('i')); break;
    case 'leaf': leaf(ctx, 0, -s * 0.45, s * 0.9, 0.5, color, null); break;
    case 'music':
      ctx.beginPath(); ctx.moveTo(-s * 0.12, s * 0.3); ctx.lineTo(-s * 0.12, -s * 0.35); ctx.lineTo(s * 0.3, -s * 0.45); ctx.lineTo(s * 0.3, s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-s * 0.22, s * 0.3, s * 0.12, s * 0.09, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.2, s * 0.2, s * 0.12, s * 0.09, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    case 'arch': archPath(ctx, -s * 0.32, s * 0.42, s * 0.64, s * 0.85, 'pointed'); ctx.stroke(); break;
    case 'moon': crescent(ctx, 0, 0, s * 0.38, color); star8(ctx, s * 0.32, -s * 0.28, s * 0.1, color); break;
    case 'bell': bell(ctx, 0, -s * 0.45, s * 0.7, { ...pal, accent: color, accent2: color }); break;
    case 'flower':
      for (let k = 0; k < 6; k++) { ctx.save(); ctx.rotate(k * Math.PI / 3); petalPath(ctx, s * 0.12, s * 0.42); ctx.stroke(); ctx.restore(); }
      break;
    default: star8(ctx, 0, 0, s * 0.38, null, color);
  }
  ctx.restore();
}

export function divider(ctx, style, cx, y, w, color, color2) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, w * 0.006);
  const half = w / 2;
  const gap = w * 0.08;
  if (style === 'line') {
    ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx + half, y); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx - gap, y); ctx.moveTo(cx + gap, y); ctx.lineTo(cx + half, y); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - half, y, w * 0.008, 0, Math.PI * 2); ctx.arc(cx + half, y, w * 0.008, 0, Math.PI * 2); ctx.fill();
    const s = w * 0.05;
    if (style === 'lotus') lotus(ctx, cx, y + s * 0.3, s * 1.1, color2 || null, color, { base: false });
    else if (style === 'paisley') { paisley(ctx, cx - s * 0.4, y, s * 0.6, -0.8, null, color); paisley(ctx, cx + s * 0.4, y, s * 0.6, 0.8 + Math.PI, null, color); }
    else if (style === 'star') star8(ctx, cx, y, s * 0.5, color2, color);
    else if (style === 'dots') { [-1, 0, 1].forEach(i => { ctx.beginPath(); ctx.arc(cx + i * s * 0.5, y, s * (i ? 0.1 : 0.16), 0, Math.PI * 2); ctx.fill(); }); }
    else { ctx.save(); ctx.translate(cx, y); ctx.rotate(Math.PI / 4); ctx.strokeRect(-s * 0.25, -s * 0.25, s * 0.5, s * 0.5); ctx.fillRect(-s * 0.1, -s * 0.1, s * 0.2, s * 0.2); ctx.restore(); }
  }
  ctx.restore();
}
