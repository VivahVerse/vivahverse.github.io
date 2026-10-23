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

// =====================================================================
// Additional original ornaments (v2): kalash, peacock feather, kolam,
// fronds, roses, cross, dome skyline, fanoos, fairy lights, dharma chakra,
// fish, Warli figures, chinar leaf, gopuram, shankha, art-deco fan.
// =====================================================================

export function kalash(ctx, x, y, s, pal) {
  ctx.save(); ctx.translate(x, y);
  const gold = foil(ctx, -s * 0.35, 0, s * 0.35, 0, pal.accent, pal.accent2 || pal.accent);
  // stand
  ctx.fillStyle = gold; ctx.beginPath(); ctx.ellipse(0, -s * 0.03, s * 0.2, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  // mango leaves fanning from the mouth
  const leafC = pal.leaf || '#2f6b3a';
  for (let i = -3; i <= 3; i++) leaf(ctx, i * s * 0.03, -s * 0.66, s * 0.36, Math.PI + i * 0.32, leafC, pal.leafVein || 'rgba(0,0,0,.25)');
  // coconut
  ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.ellipse(0, -s * 0.84, s * 0.12, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4d2c12'; ctx.lineWidth = Math.max(1, s * 0.012);
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.04, -s * 0.98); ctx.lineTo(i * s * 0.07, -s * 1.06); ctx.stroke(); }
  // body
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, -s * 0.66);
  ctx.bezierCurveTo(-s * 0.12, -s * 0.58, -s * 0.36, -s * 0.52, -s * 0.34, -s * 0.32);
  ctx.bezierCurveTo(-s * 0.32, -s * 0.12, -s * 0.16, -s * 0.06, 0, -s * 0.06);
  ctx.bezierCurveTo(s * 0.16, -s * 0.06, s * 0.32, -s * 0.12, s * 0.34, -s * 0.32);
  ctx.bezierCurveTo(s * 0.36, -s * 0.52, s * 0.12, -s * 0.58, s * 0.1, -s * 0.66);
  ctx.closePath(); ctx.fillStyle = gold; ctx.fill();
  ctx.strokeStyle = pal.accent2 || pal.accent; ctx.lineWidth = Math.max(1, s * 0.015); ctx.stroke();
  // rim
  ctx.fillStyle = gold; ctx.beginPath(); ctx.ellipse(0, -s * 0.67, s * 0.15, s * 0.035, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // sacred thread & dots
  ctx.strokeStyle = '#c0262d'; ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.26, s * 0.04, 0, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.fillStyle = '#c0262d';
  [[-0.12, -0.33], [0, -0.3], [0.12, -0.33]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * s, b * s, s * 0.022, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

export function peacockFeather(ctx, x, y, len, rot, pal) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const green = pal.leaf || '#2f8f6a', teal = '#1c7c8c', blue = '#173a8a';
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, len * 0.012);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.03, -len * 0.5, 0, -len * 0.95); ctx.stroke();
  // barbs
  ctx.lineWidth = Math.max(0.6, len * 0.005);
  for (let t = 0.18; t < 0.92; t += 0.018) {
    const yy = -len * t;
    const w = len * 0.2 * Math.sin(Math.PI * Math.min(1, (t - 0.1) / 0.85));
    ctx.strokeStyle = t > 0.6 ? teal : green; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(-w * 0.5, yy - len * 0.02, -w, yy - len * 0.06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(w * 0.5, yy - len * 0.02, w, yy - len * 0.06); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // eye
  const ey = -len * 0.8;
  [[0.14, 0.17, green], [0.105, 0.13, pal.accent], [0.08, 0.1, teal], [0.05, 0.065, blue]].forEach(([rx, ry, c]) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, ey, len * rx, len * ry, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#0b1640'; ctx.beginPath(); ctx.ellipse(0, ey + len * 0.01, len * 0.025, len * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function kolam(ctx, x, y, r, color) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, r * 0.04); ctx.lineCap = 'round';
  const g = r / 2.4;
  // diamond dot grid
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (Math.abs(i) + Math.abs(j) > 2) continue;
    ctx.beginPath(); ctx.arc(i * g, j * g, r * 0.035, 0, Math.PI * 2); ctx.fill();
  }
  // loops weaving around the dots
  for (let k = 0; k < 4; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -g * 0.5);
    ctx.bezierCurveTo(g * 0.9, -g * 0.9, g * 0.6, -g * 2.6, 0, -g * 2.6);
    ctx.bezierCurveTo(-g * 0.6, -g * 2.6, -g * 0.9, -g * 0.9, 0, -g * 0.5);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(g, -g, g * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, g * 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function frond(ctx, x, y, len, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, len * 0.018);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.12, -len * 0.5, len * 0.05, -len); ctx.stroke();
  for (let t = 0.12; t < 0.97; t += 0.045) {
    const px = len * 0.12 * 2 * t * (1 - t) * 2 + len * 0.05 * t * t, py = -len * t;
    const l = len * 0.32 * Math.sin(Math.PI * Math.min(1, t * 1.05));
    ctx.lineWidth = Math.max(1, len * 0.012 * (1.2 - t));
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px - l * 0.6, py + l * 0.05, px - l, py + l * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + l * 0.6, py + l * 0.05, px + l, py + l * 0.35); ctx.stroke();
  }
  ctx.restore();
}

export function rose(ctx, x, y, r, c1, c2, leafC) {
  ctx.save(); ctx.translate(x, y);
  if (leafC) { leaf(ctx, -r * 0.5, r * 0.4, r * 1.1, 2.3, leafC, null); leaf(ctx, r * 0.5, r * 0.4, r * 1.1, -2.3, leafC, null); }
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const rr = r * (0.85 - i * 0.11), a = i * 1.9;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.05 * i, Math.sin(a) * r * 0.05 * i, rr, a, a + Math.PI * 1.1); ctx.stroke();
  }
  ctx.restore();
}

export function cross(ctx, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = color;
  const w = s * 0.11;
  ctx.fillRect(-w / 2, -s * 0.55, w, s * 1.1);
  ctx.fillRect(-s * 0.35, -s * 0.28, s * 0.7, w);
  [[0, -s * 0.58], [0, s * 0.58], [-s * 0.38, -s * 0.225], [s * 0.38, -s * 0.225]].forEach(([a, b]) => {
    ctx.beginPath(); ctx.arc(a, b, w * 0.85, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function onion(ctx, cx, base, w, h) {
  ctx.moveTo(cx - w / 2, base);
  ctx.bezierCurveTo(cx - w * 0.75, base - h * 0.45, cx - w * 0.1, base - h * 0.7, cx, base - h);
  ctx.bezierCurveTo(cx + w * 0.1, base - h * 0.7, cx + w * 0.75, base - h * 0.45, cx + w / 2, base);
}
// Dome-and-minaret skyline (Mughal style) or a single gurdwara-style dome.
export function domes(ctx, x0, x1, y, h, color, style = 'mughal') {
  ctx.save(); ctx.fillStyle = color;
  const w = x1 - x0, cx = (x0 + x1) / 2;
  ctx.beginPath();
  if (style === 'single') {
    ctx.rect(cx - w * 0.22, y - h * 0.35, w * 0.44, h * 0.35);
    onion(ctx, cx, y - h * 0.35, w * 0.3, h * 0.55);
    ctx.rect(cx - w * 0.01, y - h * 0.98, w * 0.02, h * 0.12);
    [-1, 1].forEach(d => { ctx.rect(cx + d * w * 0.3 - w * 0.03, y - h * 0.5, w * 0.06, h * 0.5); onion(ctx, cx + d * w * 0.3, y - h * 0.5, w * 0.09, h * 0.16); });
  } else {
    ctx.rect(x0 + w * 0.2, y - h * 0.3, w * 0.6, h * 0.3);
    onion(ctx, cx, y - h * 0.3, w * 0.28, h * 0.6);
    [-1, 1].forEach(d => {
      onion(ctx, cx + d * w * 0.2, y - h * 0.3, w * 0.12, h * 0.3);
      const mx = cx + d * w * 0.42;
      ctx.rect(mx - w * 0.018, y - h * 0.82, w * 0.036, h * 0.82);
      onion(ctx, mx, y - h * 0.82, w * 0.05, h * 0.12);
      ctx.rect(mx - w * 0.03, y - h * 0.6, w * 0.06, h * 0.02);
    });
  }
  ctx.fill();
  ctx.restore();
}

export function fanoos(ctx, x, y, s, pal) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, s * 0.03);
  const glow = ctx.createRadialGradient(0, s * 0.55, 0, 0, s * 0.55, s * 0.8);
  glow.addColorStop(0, 'rgba(255,214,120,.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, s * 0.55, s * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = foil(ctx, -s * 0.3, 0, s * 0.3, 0, pal.accent, pal.accent2 || pal.accent);
  ctx.beginPath(); ctx.moveTo(0, s * 0.05); ctx.lineTo(s * 0.16, s * 0.25); ctx.lineTo(-s * 0.16, s * 0.25); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, s * 0.25); ctx.lineTo(s * 0.2, s * 0.25); ctx.lineTo(s * 0.28, s * 0.55); ctx.lineTo(s * 0.18, s * 0.85);
  ctx.lineTo(-s * 0.18, s * 0.85); ctx.lineTo(-s * 0.28, s * 0.55); ctx.closePath();
  ctx.fillStyle = 'rgba(255,214,120,.85)'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, s * 0.25); ctx.lineTo(0, s * 0.85); ctx.moveTo(-s * 0.28, s * 0.55); ctx.lineTo(s * 0.28, s * 0.55); ctx.stroke();
  ctx.fillStyle = foil(ctx, -s * 0.3, 0, s * 0.3, 0, pal.accent, pal.accent2 || pal.accent);
  ctx.beginPath(); ctx.moveTo(-s * 0.18, s * 0.85); ctx.lineTo(s * 0.18, s * 0.85); ctx.lineTo(0, s * 1.05); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function fairyLights(ctx, x0, x1, y, sag, n, pal, seed = 'fl') {
  const R = rng(seed);
  ctx.save();
  ctx.strokeStyle = 'rgba(80,60,40,.6)'; ctx.lineWidth = Math.max(1, sag * 0.03);
  const pt = t => [x0 + (x1 - x0) * t, y + Math.sin(t * Math.PI * 2) * sag * 0.25 + Math.sin(t * Math.PI) * sag];
  ctx.beginPath(); for (let i = 0; i <= 60; i++) { const [a, b] = pt(i / 60); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); } ctx.stroke();
  const cols = ['#ffd77a', '#ffe9b0', '#ffc46b', '#fff3d1'];
  for (let i = 1; i < n; i++) {
    const [a, b] = pt(i / n);
    const r = sag * 0.09;
    const g = ctx.createRadialGradient(a, b + r, 0, a, b + r, r * 5);
    g.addColorStop(0, 'rgba(255,220,140,.6)'); g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a, b + r, r * 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cols[Math.floor(R() * cols.length)];
    ctx.beginPath(); ctx.ellipse(a, b + r * 1.2, r * 0.7, r, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function wheel(ctx, x, y, r, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18); ctx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); ctx.stroke();
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12, r * 0.09, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function fish(ctx, x, y, s, rot, color, stroke) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, 0);
  ctx.quadraticCurveTo(0, -s * 0.38, s * 0.42, 0);
  ctx.quadraticCurveTo(0, s * 0.38, -s * 0.5, 0);
  ctx.moveTo(s * 0.36, 0); ctx.lineTo(s * 0.62, -s * 0.2); ctx.lineTo(s * 0.62, s * 0.2); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, s * 0.03);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-s * 0.05 + i * s * 0.1, 0, s * 0.12, -1, 1); ctx.stroke(); }
    ctx.fillStyle = stroke; ctx.beginPath(); ctx.arc(-s * 0.32, -s * 0.04, s * 0.04, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
export function fishPair(ctx, x, y, s, color, stroke) {
  fish(ctx, x - s * 0.62, y, s, Math.PI, color, stroke);
  fish(ctx, x + s * 0.62, y, s, 0, color, stroke);
}

// Warli-style figure (circle head, two triangles, stick limbs)
export function warli(ctx, x, y, s, color, pose = 0) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -s * 0.92, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.78); ctx.lineTo(s * 0.18, -s * 0.78); ctx.lineTo(0, -s * 0.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.17, -s * 0.24); ctx.lineTo(-s * 0.17, -s * 0.24); ctx.closePath(); ctx.fill();
  const arm = pose ? 0.25 : -0.05;
  ctx.beginPath();
  ctx.moveTo(-s * 0.16, -s * 0.76); ctx.lineTo(-s * 0.36, -s * (0.6 + arm));
  ctx.moveTo(s * 0.16, -s * 0.76); ctx.lineTo(s * 0.36, -s * (0.6 - arm));
  ctx.moveTo(-s * 0.1, -s * 0.24); ctx.lineTo(-s * 0.2, 0);
  ctx.moveTo(s * 0.1, -s * 0.24); ctx.lineTo(s * 0.22, -s * 0.02);
  ctx.stroke();
  ctx.restore();
}
export function warliRow(ctx, x0, x1, y, s, color) {
  const n = Math.max(3, Math.floor((x1 - x0) / (s * 0.72)));
  for (let i = 0; i < n; i++) warli(ctx, x0 + (i + 0.5) * (x1 - x0) / n, y, s, color, i % 2);
}
export function warliCircle(ctx, cx, cy, r, s, n, color) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.rotate(a + Math.PI / 2);
    warli(ctx, 0, 0, s, color, i % 2); ctx.restore();
  }
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function chinar(ctx, x, y, s, rot, color, vein) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const th = -Math.PI * 0.92 + (i / N) * Math.PI * 1.84;
    const lobe = Math.abs(Math.cos(th * 2.5));
    const serr = 1 + 0.06 * Math.sin(th * 30);
    const rr = s * (0.42 + 0.58 * Math.pow(lobe, 0.7)) * serr * 0.5;
    const px = Math.sin(th) * rr, py = -Math.cos(th) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = vein || 'rgba(0,0,0,.25)'; ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.beginPath();
  for (const a of [-1.26, -0.63, 0, 0.63, 1.26]) { ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * s * 0.45, -Math.cos(a) * s * 0.45); }
  ctx.moveTo(0, 0); ctx.lineTo(0, s * 0.28);
  ctx.stroke();
  ctx.restore();
}

export function gopuram(ctx, x, yBase, w, h, pal) {
  ctx.save();
  const tiers = 6;
  const fill = foil(ctx, x - w / 2, 0, x + w / 2, 0, pal.accent, pal.accent2 || pal.accent);
  const th = h * 0.13;
  let y = yBase;
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * 0.13), tw2 = w * (1 - (i + 1) * 0.13);
    ctx.beginPath(); ctx.moveTo(x - tw / 2, y); ctx.lineTo(x + tw / 2, y); ctx.lineTo(x + tw2 / 2, y - th); ctx.lineTo(x - tw2 / 2, y - th); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = pal.bg; ctx.lineWidth = Math.max(1, w * 0.008); ctx.stroke();
    // niches
    const n = Math.max(2, 7 - i);
    ctx.fillStyle = pal.bg; ctx.globalAlpha = 0.55;
    for (let k = 0; k < n; k++) { const nx = x - tw2 / 2 + (k + 0.5) * tw2 / n; ctx.fillRect(nx - w * 0.012, y - th * 0.75, w * 0.024, th * 0.5); }
    ctx.globalAlpha = 1;
    y -= th;
  }
  // barrel vault crown
  const cw = w * 0.22;
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, cw / 2, th * 0.7, 0, Math.PI, 0); ctx.fill();
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(x + k * cw * 0.32, y - th * 0.75, w * 0.012, th * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function shankha(ctx, x, y, s, rot, fillC, strokeC) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, 0);
  ctx.bezierCurveTo(-s * 0.35, -s * 0.35, s * 0.25, -s * 0.38, s * 0.45, -s * 0.08);
  ctx.quadraticCurveTo(s * 0.55, 0, s * 0.45, s * 0.08);
  ctx.bezierCurveTo(s * 0.25, s * 0.3, -s * 0.3, s * 0.25, -s * 0.5, 0);
  ctx.closePath(); ctx.fillStyle = fillC; ctx.fill();
  ctx.strokeStyle = strokeC; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(s * (0.3 - i * 0.12), 0, s * (0.08 + i * 0.03), -1.2, 1.2); ctx.stroke(); }
  ctx.restore();
}

export function decoFan(ctx, x, y, r, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, r * 0.018);
  for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(0, 0, r * i / 4, Math.PI, 0); ctx.stroke(); }
  for (let i = 0; i <= 12; i++) { const a = Math.PI + i * Math.PI / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r * 0.12, Math.PI, 0); ctx.fill();
  ctx.restore();
}

export function sunburst(ctx, cx, cy, R, color, alpha, rays = 36) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  for (let i = 0; i < rays; i += 2) {
    const a0 = (i / rays) * Math.PI * 2, a1 = ((i + 1) / rays) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Extra repeating patterns
export function pattern2(ctx, type, W, H, color, alpha, U, seed, pal) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.strokeStyle = color;
  const R = rng(seed || type);
  if (type === 'bandhani') {
    const c = U * 5;
    let row = 0;
    for (let y = c / 2; y < H; y += c, row++) for (let x = (row % 2) * c / 2; x < W + c; x += c) {
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * U * 0.55, y + b * U * 0.55, U * 0.28, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.arc(x, y, U * 0.18, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'leheriya') {
    ctx.lineWidth = U * 1.2;
    for (let k = -H; k < W + H; k += U * 4.2) {
      ctx.beginPath();
      for (let t = 0; t <= H; t += U) { const x = k + t * 0.6 + Math.sin(t / (U * 2.2)) * U * 0.8; t ? ctx.lineTo(x, t) : ctx.moveTo(x, t); }
      ctx.stroke();
    }
  } else if (type === 'ikat') {
    const c = U * 8;
    for (let y = c / 2; y < H; y += c) for (let x = 0; x < W + c; x += c) {
      ctx.beginPath(); ctx.moveTo(x, y - c * 0.35); ctx.lineTo(x + c * 0.28, y); ctx.lineTo(x, y + c * 0.35); ctx.lineTo(x - c * 0.28, y); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = alpha * 0.5; ctx.fillRect(x - c * 0.45, y - U * 0.3, c * 0.9, U * 0.6); ctx.restore();
    }
  } else if (type === 'confetti') {
    const cols = [pal?.accent || color, pal?.accent2 || color, pal?.flower || color, pal?.leaf || color];
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.save(); ctx.translate(R() * W, R() * H); ctx.rotate(R() * 6.28);
      if (i % 3) ctx.fillRect(-U * 0.5, -U * 0.18, U, U * 0.36); else { ctx.beginPath(); ctx.arc(0, 0, U * 0.35, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  } else if (type === 'henna') {
    ctx.lineWidth = Math.max(1, U * 0.12);
    const c = U * 12;
    for (let y = 0; y < H + c; y += c) for (let x = 0; x < W + c; x += c) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + c * 0.3, y - c * 0.3, x + c * 0.6, y + c * 0.3, x + c, y); ctx.stroke();
      for (let k = 1; k < 4; k++) leaf(ctx, x + c * k / 4, y + (k % 2 ? -1 : 1) * U * 0.6, U * 1.6, k % 2 ? Math.PI * 0.85 : Math.PI * 0.15, color, null);
      ctx.beginPath(); ctx.arc(x + c / 2, y + c / 2, U * 0.9, 0, Math.PI * 1.6); ctx.stroke();
    }
  } else if (type === 'kolamDots') {
    const c = U * 3.5;
    for (let y = c / 2; y < H; y += c) for (let x = c / 2; x < W; x += c) { ctx.beginPath(); ctx.arc(x, y, U * 0.2, 0, Math.PI * 2); ctx.fill(); }
  } else if (type === 'scales') {
    ctx.lineWidth = Math.max(1, U * 0.12);
    const c = U * 5; let row = 0;
    for (let y = 0; y < H + c; y += c / 2, row++) for (let x = (row % 2) * c / 2; x < W + c; x += c) { ctx.beginPath(); ctx.arc(x, y, c / 2, 0, Math.PI); ctx.stroke(); }
  } else if (type === 'roses') {
    for (let i = 0; i < 26; i++) rose(ctx, R() * W, R() * H, U * (1.5 + R() * 1.5), color, color, null);
  }
  ctx.restore();
}

// Extra horizontal bands
export function band2(ctx, type, x0, x1, y, h, pal) {
  ctx.save();
  const w = x1 - x0;
  if (type === 'madhubani') {
    ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(1, h * 0.06);
    ctx.strokeRect(x0, y - h / 2, w, h);
    ctx.beginPath(); ctx.moveTo(x0, y - h * 0.3); ctx.lineTo(x1, y - h * 0.3); ctx.moveTo(x0, y + h * 0.3); ctx.lineTo(x1, y + h * 0.3); ctx.stroke();
    const cols = [pal.accent, pal.accent2, pal.leaf || pal.accent, pal.flower || pal.accent2];
    let i = 0;
    for (let x = x0 + h * 0.3; x < x1 - h * 0.3; x += h * 0.6, i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.arc(x, y, h * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(1, h * 0.03); ctx.stroke();
      ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(x, y, h * 0.05, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'gamosa') {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x0, y - h / 2, w, h * 0.1); ctx.fillRect(x0, y + h / 2 - h * 0.1, w, h * 0.1);
    for (let x = x0 + h * 0.5; x < x1 - h * 0.3; x += h) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillRect(-h * 0.04, -h * 0.28, h * 0.08, h * 0.56); ctx.fillRect(-h * 0.28, -h * 0.04, h * 0.56, h * 0.08);
      ctx.rotate(Math.PI / 4); ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, h * 0.06); ctx.strokeRect(-h * 0.16, -h * 0.16, h * 0.32, h * 0.32);
      ctx.restore();
    }
  } else if (type === 'pattachitra') {
    const d = h * 0.5;
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x0, y - h / 2, w, h * 0.08); ctx.fillRect(x0, y + h / 2 - h * 0.08, w, h * 0.08);
    let i = 0;
    for (let x = x0; x < x1 - d / 2; x += d / 2, i++) {
      ctx.fillStyle = i % 2 ? pal.accent2 : pal.accent;
      ctx.beginPath();
      if (i % 2) { ctx.moveTo(x, y - h * 0.38); ctx.lineTo(x + d, y - h * 0.38); ctx.lineTo(x + d / 2, y + h * 0.1); }
      else { ctx.moveTo(x, y + h * 0.38); ctx.lineTo(x + d, y + h * 0.38); ctx.lineTo(x + d / 2, y - h * 0.1); }
      ctx.closePath(); ctx.fill();
    }
  } else if (type === 'paisleyChain') {
    ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, h * 0.04);
    ctx.beginPath(); ctx.moveTo(x0, y - h * 0.45); ctx.lineTo(x1, y - h * 0.45); ctx.moveTo(x0, y + h * 0.45); ctx.lineTo(x1, y + h * 0.45); ctx.stroke();
    let i = 0;
    for (let x = x0 + h * 0.4; x < x1 - h * 0.3; x += h * 0.8, i++) paisley(ctx, x, y, h * 0.3, i % 2 ? 0.6 : -0.6 + Math.PI, null, pal.accent);
  } else if (type === 'deco') {
    ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, h * 0.05);
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x0, y - h * 0.4 + k * h * 0.4); ctx.lineTo(x1, y - h * 0.4 + k * h * 0.4); ctx.stroke(); }
    for (let x = x0; x < x1; x += h * 1.2) { ctx.beginPath(); ctx.moveTo(x, y + h * 0.4); ctx.lineTo(x + h * 0.6, y - h * 0.4); ctx.lineTo(x + h * 1.2, y + h * 0.4); ctx.stroke(); }
  }
  ctx.restore();
}

// ---- v3 Hindu motifs: agni kund, dhanush (bow), mandap, bindi ----
export function agniKund(ctx, x, y, s, pal) {
  ctx.save(); ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, -s * 0.55, 0, 0, -s * 0.55, s * 1.1);
  glow.addColorStop(0, 'rgba(255,170,60,.5)'); glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -s * 0.55, s * 1.1, 0, Math.PI * 2); ctx.fill();
  // flames
  [[-0.22, 0.55, 0.16], [0.22, 0.6, 0.16], [0, 0.85, 0.22], [-0.1, 0.65, 0.12], [0.12, 0.7, 0.12]].forEach(([dx, h, w]) => {
    ctx.beginPath(); ctx.moveTo(dx * s - w * s, -s * 0.28);
    ctx.bezierCurveTo(dx * s - w * s, -s * (0.28 + h * 0.5), dx * s, -s * (0.28 + h * 0.6), dx * s, -s * (0.28 + h));
    ctx.bezierCurveTo(dx * s, -s * (0.28 + h * 0.6), dx * s + w * s, -s * (0.28 + h * 0.5), dx * s + w * s, -s * 0.28);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -s * (0.28 + h), 0, -s * 0.28);
    g.addColorStop(0, '#ffe38a'); g.addColorStop(0.5, '#ff9a1f'); g.addColorStop(1, '#d9480f');
    ctx.fillStyle = g; ctx.fill();
  });
  // stepped kund
  const gold = foil(ctx, -s * 0.6, 0, s * 0.6, 0, pal.accent, pal.accent2 || pal.accent);
  [[0.62, 0.1], [0.5, 0.1], [0.38, 0.1]].forEach(([w, h], i) => {
    const yy = -i * s * 0.1;
    ctx.fillStyle = gold; ctx.fillRect(-w * s, yy - h * s, w * 2 * s, h * s);
    ctx.strokeStyle = pal.bg; ctx.lineWidth = Math.max(1, s * 0.015); ctx.strokeRect(-w * s, yy - h * s, w * 2 * s, h * s);
  });
  ctx.restore();
}
export function dhanush(ctx, x, y, s, pal) {
  ctx.save(); ctx.translate(x, y);
  const gold = foil(ctx, -s, 0, s, 0, pal.accent, pal.accent2 || pal.accent);
  ctx.strokeStyle = gold; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.beginPath(); ctx.moveTo(-s, s * 0.2); ctx.quadraticCurveTo(0, -s * 0.75, s, s * 0.2); ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.012); ctx.strokeStyle = pal.ink2 || pal.accent;
  ctx.beginPath(); ctx.moveTo(-s, s * 0.2); ctx.lineTo(s, s * 0.2); ctx.stroke();
  // arrow
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath(); ctx.moveTo(0, s * 0.55); ctx.lineTo(0, -s * 0.62); ctx.stroke();
  ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.moveTo(0, -s * 0.78); ctx.lineTo(-s * 0.07, -s * 0.6); ctx.lineTo(s * 0.07, -s * 0.6); ctx.closePath(); ctx.fill();
  [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(0, s * 0.45); ctx.lineTo(d * s * 0.08, s * 0.6); ctx.lineTo(0, s * 0.55); ctx.closePath(); ctx.fill(); });
  // grip flower
  ctx.fillStyle = pal.flower || pal.accent2 || pal.accent;
  for (let k = 0; k < 6; k++) { ctx.save(); ctx.translate(0, -s * 0.28); ctx.rotate(k * Math.PI / 3); ctx.beginPath(); ctx.ellipse(0, -s * 0.06, s * 0.03, s * 0.06, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
export function mandapStructure(ctx, cx, yTop, w, h, pal, seed = 'm') {
  const R = rng(seed);
  ctx.save();
  const gold = foil(ctx, cx - w / 2, 0, cx + w / 2, 0, pal.accent, pal.accent2 || pal.accent);
  const pw = w * 0.05, base = yTop + h;
  // canopy
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, yTop + h * 0.32);
  ctx.quadraticCurveTo(cx - w * 0.3, yTop + h * 0.05, cx, yTop);
  ctx.quadraticCurveTo(cx + w * 0.3, yTop + h * 0.05, cx + w / 2, yTop + h * 0.32);
  const n = 9;
  for (let i = n; i >= 0; i--) { const x = cx - w / 2 + (i / n) * w; ctx.quadraticCurveTo(x + w / n / 2, yTop + h * 0.42, x, yTop + h * 0.32); }
  ctx.closePath(); ctx.fill();
  // finial kalash
  ctx.beginPath(); ctx.arc(cx, yTop - h * 0.03, w * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx - w * 0.006, yTop - h * 0.1, w * 0.012, h * 0.07);
  // pillars
  [-0.46, 0.46].forEach(f => {
    const x = cx + f * w;
    ctx.fillStyle = gold; ctx.fillRect(x - pw / 2, yTop + h * 0.34, pw, h * 0.66);
    ctx.fillRect(x - pw, base - h * 0.04, pw * 2, h * 0.04);
    ctx.fillRect(x - pw * 0.8, yTop + h * 0.34, pw * 1.6, h * 0.03);
  });
  // garland strands
  for (let k = -3; k <= 3; k++) {
    const x = cx + k * w * 0.12;
    const len = h * (0.22 + (3 - Math.abs(k)) * 0.03);
    ctx.strokeStyle = pal.accent2 || pal.accent; ctx.lineWidth = Math.max(1, w * 0.004);
    ctx.beginPath(); ctx.moveTo(x, yTop + h * 0.38); ctx.lineTo(x, yTop + h * 0.38 + len); ctx.stroke();
    for (let j = 0; j < 4; j++) marigold(ctx, x, yTop + h * 0.4 + j * len / 4, w * 0.014, pal.marigold || '#f5a623', pal.marigold2 || '#e26d0e', R);
  }
  ctx.restore();
}
export function bindi(ctx, x, y, r, pal) {
  ctx.save();
  ctx.fillStyle = pal.accent; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35, r * 0.07, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = foil(ctx, x - r, y, x + r, y, pal.accent, pal.accent2 || pal.accent); ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = pal.flower || '#c4121a'; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
