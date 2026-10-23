// Invitation renderer: one function draws any page at any size, so the live preview,
// PNG/JPEG/PDF exports and video frames are pixel-identical in layout.
import * as M from './motifs.js';
import { TEMPLATE_MAP, PALETTES, TEMPLATES } from '../data/templates.js';
import { L, fmtDate, fmtTime, fmtTimeRange, fmtDots, toDeva } from '../i18n.js';
import { invocationText } from '../state.js';

// ---------- assets ----------
const imgCache = new Map();
let onAsset = () => {};
export function setAssetListener(fn) { onAsset = fn; }
export function getImage(src) {
  if (!src) return null;
  let e = imgCache.get(src);
  if (!e) {
    const img = new Image();
    e = { img, ok: false };
    img.onload = () => { e.ok = true; onAsset(); };
    img.onerror = () => { e.failed = true; };
    img.src = src;
    imgCache.set(src, e);
  }
  return e.ok ? e.img : null;
}
export function preloadImages(design) {
  const srcs = [design.photos?.couple?.src, ...(design.events || []).map(e => e.photo?.src)].filter(Boolean);
  return Promise.all(srcs.map(src => new Promise(res => {
    const e = imgCache.get(src);
    if (e?.ok) return res();
    getImage(src);
    const ent = imgCache.get(src);
    const done = () => res();
    ent.img.addEventListener('load', done, { once: true });
    ent.img.addEventListener('error', done, { once: true });
    setTimeout(done, 5000);
  })));
}

const FALLBACK = '"Tiro Devanagari Hindi", "Noto Serif Devanagari", "Noto Sans Gurmukhi", "Amiri", serif';
export function fontsFor(design, tpl) {
  const s = design.style;
  return {
    display: s.fontDisplay || tpl.fonts.display,
    script: s.fontScript || tpl.fonts.script,
    body: s.fontBody || tpl.fonts.body,
    deva: s.fontDeva || tpl.fonts.deva,
  };
}
export async function ensureFonts(design) {
  if (!document.fonts?.load) return;
  const tpl = TEMPLATE_MAP[design.templateId] || TEMPLATES[0];
  const f = fontsFor(design, tpl);
  const fams = new Set([f.display, f.script, f.body]);
  const jobs = [...fams].map(x => document.fonts.load(`40px "${x}"`, 'Aa'));
  jobs.push(document.fonts.load(`40px "${f.deva}"`, 'नमस्ते'));
  jobs.push(document.fonts.load(`400 40px "${f.display}"`, 'Aa'), document.fonts.load(`600 40px "${f.display}"`, 'Aa'));
  if (design.wording.invocation === 'ikonkar') jobs.push(document.fonts.load('40px "Noto Sans Gurmukhi"', 'ੴ'));
  if (design.wording.invocation === 'bismillah') jobs.push(document.fonts.load('40px "Amiri"', 'بسم'));
  await Promise.race([Promise.allSettled(jobs), new Promise(r => setTimeout(r, 4000))]);
}

export function paletteFor(design, tpl) {
  const s = design.style;
  let pal = { ...tpl.palette };
  let dark = tpl.dark;
  if (s.palette && s.palette !== 'template') {
    const p = PALETTES.find(x => x.id === s.palette);
    if (p?.colors) { pal = { ...pal, ...p.colors }; dark = !!p.dark; }
  }
  if (s.custom) pal = { ...pal, ...Object.fromEntries(Object.entries(s.custom).filter(([, v]) => v)) };
  return { pal, dark };
}

// ---------- text helpers ----------
function textOf(design, obj) {
  if (!obj) return [];
  if (typeof obj === 'string') return obj ? [{ t: obj, lang: 'en' }] : [];
  const en = (obj.en || '').trim(), hi = (obj.hi || '').trim();
  if (design.lang === 'en') return en ? [{ t: en, lang: 'en' }] : hi ? [{ t: hi, lang: 'hi' }] : [];
  if (design.lang === 'hi') return hi ? [{ t: hi, lang: 'hi' }] : en ? [{ t: en, lang: 'en' }] : [];
  const out = [];
  if (en) out.push({ t: en, lang: 'en' });
  if (hi && hi !== en) out.push({ t: hi, lang: 'hi', second: true });
  return out;
}
const primaryLang = d => (d.lang === 'hi' ? 'hi' : 'en');
function labels(design, key) {
  if (design.lang === 'bi') return `${L('en', key)} · ${L('hi', key)}`;
  return L(primaryLang(design), key);
}
const isDeva = s => /[ऀ-ॿ]/.test(s);

function fontStr(F, role, px, weight = 400, italic = false, text = '') {
  let fam = F[role] || F.body;
  // Devanagari text: lead with the Devanagari face so its metrics drive the line.
  if (isDeva(text)) fam = F.deva;
  return `${italic ? 'italic ' : ''}${weight} ${Math.max(1, Math.round(px))}px "${fam}", ${FALLBACK}`;
}

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW || !line) {
        if (!line && ctx.measureText(w).width > maxW) {
          // break very long words
          let chunk = '';
          for (const ch of w) {
            if (ctx.measureText(chunk + ch).width > maxW && chunk) { out.push(chunk); chunk = ch; } else chunk += ch;
          }
          line = chunk;
        } else line = test;
      } else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out.filter((l, i, a) => l || a.length === 1);
}

// ---------- block builder ----------
function T(text, role, size, o = {}) { return { k: 'text', text, role, size, ...o }; }

function nameBlocks(design, tpl, who, size) {
  const c = design.couple;
  const obj = c.useFull ? (who === 'bride' ? c.brideFull : c.groomFull) : (who === 'bride' ? c.bride : c.groom);
  const style = tpl.names;
  const role = style === 'script' ? 'script' : 'display';
  const ns = design.style.nameScale || 1;
  return textOf(design, obj).map((x, i) => T(style === 'caps' && x.lang === 'en' ? x.t.toUpperCase() : x.t,
    x.lang === 'hi' ? 'deva' : role, (x.second ? size * 0.55 : (style === 'script' ? size : size * 0.72)) * ns,
    { color: 'ink', ls: style === 'caps' ? 0.12 : 0, gap: x.second ? 1.2 : 0.6, maxLines: 2, fitWidth: true, name: true, prio: 0, lh: style === 'script' ? 1.05 : 1.1 }));
}

function multi(design, obj, role, size, o = {}) {
  return textOf(design, obj).map(x => T(x.t, x.lang === 'hi' && role !== 'body' ? 'deva' : role, x.second ? size * 0.9 : size, { ...o, color: x.second ? (o.color2 || 'ink2') : (o.color || 'ink') }));
}

function dateLine(design, date, opts = {}) {
  const dd = design.style.devaDigits;
  if (design.lang === 'bi') {
    return [T(fmtDate(date, 'en'), 'display', opts.size || 3.3, { color: 'accent', upper: true, ls: 0.1, gap: 0.4 }),
      T(fmtDate(date, 'hi', { devaDigits: dd }), 'deva', (opts.size || 3.3) * 0.82, { color: 'ink2', gap: 0.8 })];
  }
  const lg = primaryLang(design);
  return [T(fmtDate(date, lg, { devaDigits: dd }), lg === 'hi' ? 'deva' : 'display', opts.size || 3.3, { color: 'accent', upper: lg === 'en', ls: lg === 'en' ? 0.1 : 0, gap: 0.8 })];
}

function timeText(design, a, b, single) {
  const dd = design.style.devaDigits;
  const one = lg => (single ? fmtTime(a, lg, { devaDigits: dd }) : fmtTimeRange(a, b, lg, { devaDigits: dd }));
  if (design.lang === 'bi') return [one('en'), one('hi')].filter(Boolean).join('  ·  ');
  return one(primaryLang(design));
}

function buildCover(design, tpl) {
  const s = design.show, B = [];
  const lg = primaryLang(design);
  if (s.invocation) {
    const inv = design.lang === 'bi'
      ? [invocationText(design, 'hi') || invocationText(design, 'en')]
      : [invocationText(design, lg)];
    inv.filter(Boolean).forEach(t => B.push(T(t, /[ऀ-ॿ]/.test(t) ? 'deva' : 'display', t.length < 4 ? 6 : 2.7, { color: 'accent', gap: 1.6, prio: 3, ls: t.length < 40 ? 0.05 : 0 })));
  }
  if (s.photo && design.photos.couple?.src) B.push({ k: 'photo', photo: design.photos.couple, size: 24, gap: 2, prio: 4 });
  if (s.familyNames) B.push(...multi(design, design.family.familyNames, 'body', 2.6, { gap: 0.6, prio: 6, upper: false }));
  if (s.headline) B.push(...multi(design, design.wording.headline, 'body', 2.7, { italic: true, color: 'ink2', gap: 1.6, prio: 5 }));
  const order = design.couple.order === 'groom' ? ['groom', 'bride'] : ['bride', 'groom'];
  order.forEach((who, i) => {
    B.push(...nameBlocks(design, tpl, who, 9.5));
    if (s.parents) {
      const par = who === 'bride' ? design.family.brideParents : design.family.groomParents;
      const lab = who === 'bride' ? 'daughterOf' : 'sonOf';
      // bilingual cards keep parents to one line (primary language) so the names stay large
      textOf(design, par).filter(x => !x.second).forEach(x => B.push(T(`${L(x.lang, lab)} ${x.t}`, 'body', 2.25, { color: 'ink2', gap: 0.35, prio: 7 })));
    }
    if (s.grandparents) {
      const g = who === 'bride' ? design.family.brideGrand : design.family.groomGrand;
      const lab = who === 'bride' ? 'granddaughterOf' : 'grandsonOf';
      textOf(design, g).forEach(x => B.push(T(`${L(x.lang, lab)} ${x.t}`, 'body', 1.9, { color: 'ink2', italic: true, gap: 0.3, prio: 9 })));
    }
    if (i === 0) {
      const amp = design.lang === 'hi' ? L('hi', 'weds') : (tpl.names === 'script' ? '&' : 'weds');
      B.push(T(amp, tpl.names === 'script' && amp !== '&' ? 'script' : 'display', tpl.names === 'script' ? 4.6 : 2.6, { italic: amp === '&', color: 'accent', gap: 0.6, gapTop: 0.6, prio: 2, ls: tpl.names === 'script' ? 0 : 0.3, upper: tpl.names !== 'script' && lg === 'en' }));
    }
  });
  B.push({ k: 'divider', gap: 2, gapTop: 1.6, prio: 8 });
  const w = design.wedding;
  if (s.date && w.date) B.push(...dateLine(design, w.date));
  if (s.time && w.time) B.push(T(timeText(design, w.time, '', true), 'body', 2.5, { color: 'ink', gap: 0.4, prio: 3 }));
  if (s.muhurat && w.muhurat) {
    const t = design.lang === 'bi'
      ? `${L('en', 'muhurat')} · ${L('hi', 'muhurat')}: ${fmtTime(w.muhurat, 'en')}`
      : `${L(lg, 'muhurat')}: ${fmtTime(w.muhurat, lg, { devaDigits: design.style.devaDigits })}`;
    B.push(T(t, 'body', 2.2, { color: 'ink2', italic: true, gap: 0.8, prio: 6 }));
  }
  if (s.venue && w.venue) B.push(T(w.venue, 'display', 3, { color: 'ink', gap: 0.3, gapTop: 0.6, prio: 2 }));
  if (s.address && w.address) B.push(T(w.address, 'body', 2.2, { color: 'ink2', gap: 1.2, prio: 6 }));
  if (s.eventsOnCover && design.events.length) {
    B.push({ k: 'divider', gap: 1, gapTop: 0.6, prio: 9, small: true });
    design.events.forEach(e => {
      const nm = textOf(design, e.name).map(x => x.t).join(' · ');
      const dt = e.date ? fmtDate(e.date, lg, { short: true, devaDigits: design.style.devaDigits }) : '';
      B.push(T(`${nm}${dt ? '  —  ' + dt : ''}${e.start ? ', ' + fmtTime(e.start, lg) : ''}`, 'body', 2.1, { color: 'ink', gap: 0.3, prio: 10 }));
    });
  }
  if (s.message) B.push(...multi(design, design.wording.message, 'body', 2.4, { italic: true, color: 'ink2', gap: 1, gapTop: 0.8, prio: 9 }));
  if (s.hashtag && design.couple.hashtag) B.push(T(design.couple.hashtag, 'body', 2.2, { color: 'accent', gap: 0.5, prio: 10, ls: 0.05 }));
  if (s.rsvp && (design.rsvp.name || design.rsvp.phone)) {
    B.push(T(`${labels(design, 'rsvp')}: ${[design.rsvp.name, design.rsvp.phone].filter(Boolean).join(' · ')}`, 'body', 2.0, { color: 'ink2', gap: 0.2, prio: 11, upper: false }));
  }
  return B;
}

function eventBlocks(design, e, compact) {
  const B = [];
  const lg = primaryLang(design);
  const dd = design.style.devaDigits;
  const names = textOf(design, e.name);
  B.push({ k: 'icon', name: e.icon, size: compact ? 4.2 : 6, gap: compact ? 0.5 : 1, prio: 12 });
  names.forEach(x => B.push(T(x.lang === 'en' && compact ? x.t.toUpperCase() : x.t, x.lang === 'hi' ? 'deva' : (compact ? 'display' : 'script'),
    compact ? (x.second ? 2.6 : 3.4) : (x.second ? 4.5 : 8.5), { color: x.second ? 'ink2' : 'accent', ls: compact && x.lang === 'en' ? 0.12 : 0, gap: 0.4, fitWidth: true, maxLines: 2, prio: 0 })));
  const parts = [];
  if (e.date) parts.push(fmtDate(e.date, lg, { short: compact, devaDigits: dd }));
  const tr = timeText(design, e.start, e.end);
  if (compact) {
    if (parts.length || tr) B.push(T([parts[0], tr].filter(Boolean).join('  ·  '), 'body', 2.3, { color: 'ink', gap: 0.25, prio: 1 }));
  } else {
    if (e.date) B.push(...dateLine(design, e.date, { size: 3.2 }));
    if (tr) B.push(T(tr, 'body', 2.6, { color: 'ink', gap: 1, prio: 1 }));
  }
  if (e.venue) B.push(T(e.venue, compact ? 'body' : 'display', compact ? 2.2 : 3, { color: compact ? 'ink2' : 'ink', gap: compact ? 0.2 : 0.3, prio: 2 }));
  if (e.address && !compact) B.push(T(e.address, 'body', 2.2, { color: 'ink2', gap: 1, prio: 5 }));
  if (design.show.dress && e.dress) B.push(T(`${labels(design, 'dress')}: ${e.dress}`, 'body', compact ? 1.9 : 2.2, { color: 'ink2', italic: true, gap: 0.3, prio: 7 }));
  if (!compact && design.show.eventMsg) B.push(...multi(design, e.msg, 'body', 2.4, { italic: true, color: 'ink2', gap: 0.6, gapTop: 0.6, prio: 8 }));
  return B;
}

function buildEvents(design, tpl, page) {
  const B = [];
  B.push(...multi(design, { en: L('en', 'functions'), hi: L('hi', 'functions') }, 'display', 3.6, { color: 'accent', upper: design.lang !== 'hi', ls: 0.12, gap: 0.6, prio: 1 }));
  const c = design.couple;
  const nm = textOf(design, { en: `${c.bride.en} & ${c.groom.en}`, hi: `${c.bride.hi || c.bride.en} & ${c.groom.hi || c.groom.en}` });
  if (nm[0]) B.push(T(nm[0].t, tpl.names === 'script' && nm[0].lang === 'en' ? 'script' : (nm[0].lang === 'hi' ? 'deva' : 'display'), 4.8, { color: 'ink', gap: 0.6, prio: 3 }));
  B.push({ k: 'divider', gap: 1.6, gapTop: 0.4, prio: 9 });
  const list = design.events.slice(page.from ?? 0, page.to ?? design.events.length);
  list.forEach((e, i) => {
    const eb = eventBlocks(design, e, true);
    eb[eb.length - 1].gap = (eb[eb.length - 1].gap || 0) + (i < list.length - 1 ? 2.2 : 0);
    B.push({ k: 'group', blocks: eb, prio: 0 });
  });
  return B;
}

function buildEvent(design, tpl, e) {
  const B = [];
  const c = design.couple;
  if (design.show.invocation) {
    const t = invocationText(design, design.lang === 'en' ? 'en' : 'hi');
    if (t && t.length < 50) B.push(T(t, isDeva(t) ? 'deva' : 'display', t.length < 4 ? 4.5 : 2.3, { color: 'accent', gap: 1.2, prio: 6 }));
  }
  if (e.photo?.src) B.push({ k: 'photo', photo: e.photo, size: 20, gap: 1.6, prio: 5 });
  const nm = textOf(design, { en: `${c.bride.en} & ${c.groom.en}`, hi: `${c.bride.hi || c.bride.en} & ${c.groom.hi || c.groom.en}` })[0];
  if (nm) B.push(T(nm.t, nm.lang === 'hi' ? 'deva' : 'display', 3.6, { color: 'ink', ls: nm.lang === 'en' ? 0.08 : 0, upper: nm.lang === 'en' && tpl.names === 'caps', gap: 0.4, prio: 2 }));
  B.push(...multi(design, { en: L('en', 'inviteTo'), hi: L('hi', 'inviteTo') }, 'body', 2.4, { italic: true, color: 'ink2', gap: 1, prio: 6 }));
  B.push(...eventBlocks(design, e, false));
  if (design.show.qr && e.maps) B.push({ k: 'qr', data: e.maps, size: 11, caption: labels(design, 'scanMap'), gapTop: 1, gap: 0, prio: 9 });
  else if (design.show.rsvp && design.rsvp.phone) B.push(T(`${labels(design, 'rsvp')}: ${design.rsvp.phone}`, 'body', 2, { color: 'ink2', gapTop: 1, prio: 10 }));
  return B;
}

function buildClosing(design, tpl) {
  const B = [];
  B.push(...multi(design, design.wording.closing, 'script', 6, { color: 'accent', gap: 1, prio: 1 }).map(b => b.role === 'deva' ? { ...b, size: 4 } : b));
  if (design.show.hosts) {
    B.push(...multi(design, { en: L('en', 'hostedBy'), hi: L('hi', 'hostedBy') }, 'body', 2.2, { color: 'ink2', upper: design.lang !== 'hi', ls: 0.15, gap: 0.4, prio: 4 }));
    B.push(...multi(design, design.family.hosts, 'display', 3.4, { gap: 1.4, prio: 2 }));
  }
  if (design.show.familyNames) B.push(...multi(design, design.family.familyNames, 'body', 2.6, { color: 'ink2', gap: 1, prio: 6 }));
  B.push({ k: 'divider', gap: 1.6, prio: 8 });
  if (design.show.rsvp) {
    B.push(T(labels(design, 'rsvp'), 'display', 2.8, { color: 'accent', upper: design.lang !== 'hi', ls: 0.2, gap: 0.5, prio: 3 }));
    if (design.rsvp.name) B.push(T(design.rsvp.name, 'body', 2.6, { gap: 0.2, prio: 3 }));
    if (design.rsvp.phone) B.push(T(design.rsvp.phone, 'body', 2.6, { gap: 0.2, prio: 3 }));
    if (design.rsvp.email) B.push(T(design.rsvp.email, 'body', 2.3, { color: 'ink2', gap: 0.2, prio: 6 }));
    if (design.rsvp.note) B.push(T(design.rsvp.note, 'body', 2.2, { color: 'ink2', italic: true, gap: 1.2, prio: 7 }));
  }
  const qrData = design.site?.url || design.wedding.maps;
  if (design.show.qr && qrData) B.push({ k: 'qr', data: qrData, size: 13, caption: labels(design, design.site?.url ? 'scanSite' : 'scanMap'), gapTop: 0.6, gap: 1, prio: 9 });
  if (design.show.hashtag && design.couple.hashtag) B.push(T(design.couple.hashtag, 'display', 3, { color: 'accent', gap: 0, prio: 5 }));
  return B;
}

function buildSaveDate(design, tpl) {
  const B = [];
  B.push(...multi(design, { en: L('en', 'saveTheDate'), hi: L('hi', 'saveTheDate') }, 'script', 9, { color: 'accent', gap: 1.4, prio: 0 }).map(b => b.role === 'deva' ? { ...b, size: 5 } : b));
  if (design.photos.couple?.src && design.show.photo) B.push({ k: 'photo', photo: design.photos.couple, size: 26, gap: 2, prio: 4 });
  const c = design.couple;
  const nm = textOf(design, { en: `${c.bride.en} & ${c.groom.en}`, hi: `${c.bride.hi || c.bride.en} & ${c.groom.hi || c.groom.en}` });
  nm.forEach(x => B.push(T(x.lang === 'en' ? x.t.toUpperCase() : x.t, x.lang === 'hi' ? 'deva' : 'display', x.second ? 3.4 : 4.6, { ls: x.lang === 'en' ? 0.14 : 0, gap: 0.6, fitWidth: true, prio: 0 })));
  B.push({ k: 'divider', gap: 1.6, gapTop: 1, prio: 6 });
  const d = design.wedding.date;
  if (d) B.push(T(design.style.devaDigits && design.lang === 'hi' ? toDeva(fmtDots(d)) : fmtDots(d), 'display', 7, { color: 'ink', gap: 0.8, prio: 0, ls: 0.04 }));
  if (design.wedding.address) {
    const city = design.wedding.address.split(',').slice(-2, -1)[0]?.trim() || design.wedding.address.split(',')[0];
    B.push(T(city.toUpperCase(), 'body', 2.6, { color: 'ink2', ls: 0.3, gap: 1.6, prio: 4 }));
  }
  B.push(...multi(design, { en: L('en', 'toFollow'), hi: L('hi', 'toFollow') }, 'body', 2.3, { italic: true, color: 'ink2', gap: 0.6, prio: 6 }));
  if (design.show.hashtag && design.couple.hashtag) B.push(T(design.couple.hashtag, 'body', 2.3, { color: 'accent', prio: 8 }));
  return B;
}

export function buildBlocks(design, tpl, page) {
  switch (page.kind) {
    case 'events': return buildEvents(design, tpl, page);
    case 'event': return design.events[page.index] ? buildEvent(design, tpl, design.events[page.index]) : buildCover(design, tpl);
    case 'closing': return buildClosing(design, tpl);
    case 'savedate': return buildSaveDate(design, tpl);
    default: return buildCover(design, tpl);
  }
}

// ---------- layout ----------
function flatten(blocks) {
  const out = [];
  blocks.forEach(b => (b.k === 'group' ? b.blocks.forEach(x => out.push({ ...x, prio: Math.max(x.prio ?? 0, b.prio ?? 0) })) : out.push(b)));
  return out;
}

function measureBlocks(ctx, blocks, ctxv) {
  const { U, F, scale, boxW, style } = ctxv;
  let total = 0;
  for (const b of blocks) {
    b._gapTop = (b.gapTop || 0) * U * scale;
    b._gap = (b.gap ?? 0.6) * U * scale;
    if (b.k === 'text') {
      let px = b.size * U * scale * (b.name ? 1 : style.scale || 1);
      const lh = (b.lh || (b.role === 'script' ? 1.15 : 1.3)) * (style.lineHeight || 1);
      const weight = b.role === 'display' && style.weight === 'bold' ? 600 : (b.weight || 400);
      const txt = b.upper ? b.text.toUpperCase() : b.text;
      if (isDeva(txt) || /[\u0600-\u06FF\u0A00-\u0A7F]/.test(txt)) b.ls = 0; // never letter-space joined scripts
      ctx.font = fontStr(F, b.role, px, weight, b.italic, txt);
      setLS(ctx, b.ls ? b.ls * px : 0);
      let lines = wrap(ctx, txt, boxW);
      if (b.fitWidth) {
        // shrink names until they fit in maxLines
        let guard = 0;
        while (lines.length > (b.maxLines || 1) && guard++ < 30) {
          px *= 0.93; ctx.font = fontStr(F, b.role, px, weight, b.italic, txt); setLS(ctx, b.ls ? b.ls * px : 0);
          lines = wrap(ctx, txt, boxW);
        }
      }
      b._px = px; b._font = ctx.font; b._lines = lines; b._lh = px * lh; b._ls = b.ls ? b.ls * px : 0;
      b._h = lines.length * px * lh;
    } else if (b.k === 'divider') {
      b._h = U * 2.2 * scale;
    } else if (b.k === 'photo') {
      b._h = b.size * U * scale;
    } else if (b.k === 'icon') {
      b._h = b.size * U * scale;
    } else if (b.k === 'qr') {
      b._h = b.size * U * scale + (b.caption ? U * 2.6 * scale : 0);
    }
    total += b._gapTop + b._h + b._gap;
  }
  return total;
}

function setLS(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px ? `${px.toFixed(1)}px` : '0px'; }

export function layout(ctx, blocks, box, U, F, style) {
  let list = flatten(blocks);
  let scale = 1, total = 0;
  for (let attempt = 0; attempt < 12; attempt++) {
    scale = 1.4;
    total = measureBlocks(ctx, list, { U, F, scale, boxW: box.w, style });
    while (total > box.h && scale > 0.62) {
      scale *= 0.96;
      total = measureBlocks(ctx, list, { U, F, scale, boxW: box.w, style });
    }
    if (total <= box.h) break;
    // drop the least important block and retry
    const maxP = Math.max(...list.map(b => b.prio ?? 0));
    if (maxP <= 0) { // last resort: keep scaling down
      while (total > box.h && scale > 0.3) { scale *= 0.95; total = measureBlocks(ctx, list, { U, F, scale, boxW: box.w, style }); }
      break;
    }
    const idx = list.map(b => b.prio ?? 0).lastIndexOf(maxP);
    list.splice(idx, 1);
  }
  return { list, total, scale };
}

// ---------- background, frame, ornaments ----------
function drawBackground(ctx, W, H, tpl, pal, design, U) {
  const bg = tpl.bg;
  if (bg.type === 'radial') {
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, pal.bg); g.addColorStop(1, pal.bg2);
    ctx.fillStyle = g;
  } else if (bg.type === 'linear') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.bg); g.addColorStop(1, pal.bg2);
    ctx.fillStyle = g;
  } else ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  if (bg.type === 'watercolor') {
    const R = M.rng(tpl.id);
    const blobs = [[0.1, 0.08, pal.flower], [0.9, 0.12, pal.accent2], [0.12, 0.92, pal.accent2], [0.88, 0.9, pal.flower], [0.5, 0.5, pal.bg2]];
    blobs.forEach(([x, y, c]) => {
      for (let i = 0; i < 5; i++) {
        const r = Math.max(W, H) * (0.18 + R() * 0.12);
        const g = ctx.createRadialGradient(x * W + (R() - 0.5) * U * 10, y * H + (R() - 0.5) * U * 10, 0, x * W, y * H, r);
        g.addColorStop(0, hexA(c, 0.22)); g.addColorStop(1, hexA(c, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    });
  }
  if (bg.type === 'archBlock') {
    // modern colour block arch in the upper half
    const aw = Math.min(W * 0.8, H * 0.5), ah = Math.min(H * 0.48, aw * 1.25);
    ctx.save();
    M.archPath(ctx, (W - aw) / 2, H * 0.06 + ah, aw, ah, 'round');
    ctx.fillStyle = hexA(pal.bg2, 0.16); ctx.fill();
    ctx.restore();
  }
  if (design.style.pattern !== false && design.style.ornaments !== 'none' && bg.pattern) {
    if (bg.pattern === 'mandala') M.mandala(ctx, W / 2, H / 2, Math.min(W, H) * 0.48, pal.accent, { alpha: bg.patternAlpha, rings: 6 });
    else M.pattern(ctx, bg.pattern, W, H, pal.accent, bg.patternAlpha, U, tpl.id);
  }
  // subtle paper grain
  const R = M.rng('grain' + tpl.id);
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = pal.ink;
  const n = Math.round((W * H) / (U * U * 6));
  for (let i = 0; i < Math.min(n, 4000); i++) ctx.fillRect(R() * W, R() * H, U * 0.12, U * 0.12);
  ctx.restore();
}

function hexA(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  const h = hex.length === 4 ? hex.replace(/./g, (c, i) => (i ? c + c : '')) : hex;
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawFrame(ctx, W, H, tpl, pal, design, U) {
  let type = design.style.frame && design.style.frame !== 'template' ? design.style.frame : tpl.frame.type;
  const inset = tpl.frame.inset * U;
  const gold = M.foil(ctx, 0, 0, W, H, pal.accent, pal.accent2 || pal.accent);
  ctx.save();
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, U * 0.25);
  const r = { x: inset, y: inset, w: W - inset * 2, h: H - inset * 2 };
  let content = { x: r.x + U * 5, y: r.y + U * 5, w: r.w - U * 10, h: r.h - U * 10 };
  switch (type) {
    case 'none': content = { x: U * 9, y: U * 8, w: W - U * 18, h: H - U * 16 }; break;
    case 'thin':
      ctx.lineWidth = Math.max(1, U * 0.18); ctx.strokeRect(r.x, r.y, r.w, r.h);
      cornerDots(ctx, r, U, pal.accent);
      break;
    case 'double':
      ctx.lineWidth = Math.max(1, U * 0.35); ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.lineWidth = Math.max(1, U * 0.12); ctx.strokeRect(r.x + U * 1.3, r.y + U * 1.3, r.w - U * 2.6, r.h - U * 2.6);
      cornerSquares(ctx, r, U, pal);
      content = { x: r.x + U * 6, y: r.y + U * 6, w: r.w - U * 12, h: r.h - U * 12 };
      break;
    case 'arch': {
      ctx.lineWidth = Math.max(1, U * 0.3); ctx.strokeRect(r.x, r.y, r.w, r.h);
      const aw = r.w - U * 4, ah = r.h - U * 4;
      const style = tpl.frame.style || 'pointed';
      ctx.lineWidth = Math.max(1, U * 0.22);
      M.archPath(ctx, r.x + U * 2, r.y + r.h - U * 2, aw, Math.min(ah, ah), style === 'cusped' ? 'pointed' : style);
      ctx.stroke();
      ctx.lineWidth = Math.max(1, U * 0.1);
      M.archPath(ctx, r.x + U * 3.2, r.y + r.h - U * 3.2, aw - U * 2.4, ah - U * 2.4, style === 'cusped' ? 'pointed' : style);
      ctx.stroke();
      const archTop = Math.min(aw * 0.62, ah * 0.62) * 0.55;
      const landscape = W > H * 1.1;
      content = { x: r.x + U * 7, y: r.y + U * (landscape ? 9 : 4) + archTop * (landscape ? 0.2 : 1.0), w: r.w - U * 14, h: r.h - U * (landscape ? 15 : 10) - archTop * (landscape ? 0.2 : 1.0) };
      break;
    }
    case 'kasavu': {
      const bh = U * 4;
      M.band(ctx, 'kasavu', r.x, r.x + r.w, r.y + bh / 2, bh, pal);
      M.band(ctx, 'kasavu', r.x, r.x + r.w, r.y + r.h - bh / 2, bh, pal);
      ctx.fillStyle = gold;
      ctx.fillRect(r.x, r.y, U * 0.5, r.h); ctx.fillRect(r.x + r.w - U * 0.5, r.y, U * 0.5, r.h);
      content = { x: r.x + U * 6, y: r.y + bh + U * 3, w: r.w - U * 12, h: r.h - bh * 2 - U * 6 };
      break;
    }
    case 'phulkari': {
      const d = U * 3.2;
      ctx.save(); M.band(ctx, 'phulkari', r.x, r.x + r.w, r.y + d / 2, d, pal); M.band(ctx, 'phulkari', r.x, r.x + r.w, r.y + r.h - d / 2, d, pal);
      ctx.translate(r.x + d / 2, r.y + r.h / 2); ctx.rotate(Math.PI / 2); M.band(ctx, 'phulkari', -r.h / 2 + d, r.h / 2 - d, 0, d, pal); ctx.restore();
      ctx.save(); ctx.translate(r.x + r.w - d / 2, r.y + r.h / 2); ctx.rotate(Math.PI / 2); M.band(ctx, 'phulkari', -r.h / 2 + d, r.h / 2 - d, 0, d, pal); ctx.restore();
      ctx.lineWidth = Math.max(1, U * 0.12); ctx.strokeRect(r.x + d * 1.4, r.y + d * 1.4, r.w - d * 2.8, r.h - d * 2.8);
      content = { x: r.x + d * 2.6, y: r.y + d * 2.6, w: r.w - d * 5.2, h: r.h - d * 5.2 };
      break;
    }
    case 'alpana': {
      ctx.lineWidth = Math.max(1, U * 0.2); ctx.strokeStyle = pal.accent;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.save(); ctx.setLineDash([U * 0.3, U * 0.9]); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, U * 0.35);
      ctx.strokeRect(r.x + U * 1.4, r.y + U * 1.4, r.w - U * 2.8, r.h - U * 2.8); ctx.restore();
      [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => {
        ctx.save(); ctx.translate(x, y);
        for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.ellipse(0, -U * 1.8, U * 0.55, U * 1.3, 0, 0, Math.PI * 2); ctx.fillStyle = pal.accent; ctx.fill(); }
        ctx.fillStyle = pal.bg; ctx.beginPath(); ctx.arc(0, 0, U * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      break;
    }
    case 'brocade': {
      const bw = U * 3;
      ctx.fillStyle = hexA(pal.accent, 0.18);
      ctx.fillRect(r.x, r.y, r.w, bw); ctx.fillRect(r.x, r.y + r.h - bw, r.w, bw);
      ctx.fillRect(r.x, r.y, bw, r.h); ctx.fillRect(r.x + r.w - bw, r.y, bw, r.h);
      ctx.lineWidth = Math.max(1, U * 0.2); ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.strokeRect(r.x + bw, r.y + bw, r.w - bw * 2, r.h - bw * 2);
      ctx.fillStyle = pal.accent;
      for (let x = r.x + bw; x < r.x + r.w - bw; x += U * 2.5) { M.star8(ctx, x, r.y + bw / 2, U * 0.7, pal.accent); M.star8(ctx, x, r.y + r.h - bw / 2, U * 0.7, pal.accent); }
      for (let y = r.y + bw * 1.5; y < r.y + r.h - bw; y += U * 2.5) { M.star8(ctx, r.x + bw / 2, y, U * 0.7, pal.accent); M.star8(ctx, r.x + r.w - bw / 2, y, U * 0.7, pal.accent); }
      content = { x: r.x + bw + U * 4, y: r.y + bw + U * 4, w: r.w - bw * 2 - U * 8, h: r.h - bw * 2 - U * 8 };
      break;
    }
    case 'paithani': {
      const bw = U * 4.2;
      ctx.fillStyle = pal.accent; // magenta border
      ctx.fillRect(r.x, r.y, r.w, bw); ctx.fillRect(r.x, r.y + r.h - bw, r.w, bw);
      ctx.fillRect(r.x, r.y, bw, r.h); ctx.fillRect(r.x + r.w - bw, r.y, bw, r.h);
      ctx.fillStyle = pal.accent2; // green inner line
      ctx.fillRect(r.x + bw, r.y + bw, r.w - bw * 2, U * 0.6); ctx.fillRect(r.x + bw, r.y + r.h - bw - U * 0.6, r.w - bw * 2, U * 0.6);
      ctx.fillRect(r.x + bw, r.y + bw, U * 0.6, r.h - bw * 2); ctx.fillRect(r.x + r.w - bw - U * 0.6, r.y + bw, U * 0.6, r.h - bw * 2);
      // gold zari motifs (stylised parrots → small lotus buds) on border
      const gold2 = '#e8b84a';
      for (let x = r.x + bw * 1.5; x < r.x + r.w - bw; x += bw * 1.4) {
        M.lotus(ctx, x, r.y + bw * 0.78, bw * 0.55, gold2, gold2, { base: false });
        ctx.save(); ctx.translate(x, r.y + r.h - bw * 0.22); ctx.rotate(Math.PI); M.lotus(ctx, 0, 0, bw * 0.55, gold2, gold2, { base: false }); ctx.restore();
      }
      content = { x: r.x + bw + U * 5, y: r.y + bw + U * 4, w: r.w - bw * 2 - U * 10, h: r.h - bw * 2 - U * 8 };
      break;
    }
    default:
      ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();
  return content;
}

function cornerDots(ctx, r, U, c) {
  ctx.save(); ctx.fillStyle = c;
  [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, U * 0.7, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}
function cornerSquares(ctx, r, U, pal) {
  ctx.save(); ctx.fillStyle = pal.bg; ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, U * 0.2);
  [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-U * 1.4, -U * 1.4, U * 2.8, U * 2.8); ctx.strokeRect(-U * 1.4, -U * 1.4, U * 2.8, U * 2.8);
    ctx.fillStyle = pal.accent; ctx.fillRect(-U * 0.5, -U * 0.5, U * 1, U * 1); ctx.fillStyle = pal.bg;
    ctx.restore();
  });
  ctx.restore();
}

// Returns {top, bottom} space consumed (px) inside content box.
function drawOrnaments(ctx, W, H, tpl, pal, design, U, box, page, alpha) {
  const level = design.style.ornaments;
  if (level === 'none') return { top: 0, bottom: 0 };
  const minimal = level === 'minimal';
  const k = page.kind === 'cover' || page.kind === 'savedate' ? 1 : 0.7;
  const s = U * k;
  ctx.save(); ctx.globalAlpha = alpha;
  let top = 0, bottom = 0;
  const cx = W / 2;
  const landscape = W > H * 1.15;
  const R = M.rng(tpl.id + page.kind);

  // corners
  if (!minimal && tpl.corners) {
    const cs = U * 16;
    const cr = [[box.x - U * 3, box.y - U * 3, 0], [box.x + box.w + U * 3, box.y - U * 3, Math.PI / 2], [box.x + box.w + U * 3, box.y + box.h + U * 3, Math.PI], [box.x - U * 3, box.y + box.h + U * 3, -Math.PI / 2]];
    cr.forEach(([x, y, rot]) => {
      if (tpl.corners === 'floral') M.floralCorner(ctx, x, y, cs, rot, pal);
      else if (tpl.corners === 'paisley') M.paisley(ctx, x + Math.cos(rot + Math.PI / 4) * U * 4, y + Math.sin(rot + Math.PI / 4) * U * 4, U * 3.2, rot + Math.PI * 0.75, null, pal.accent);
      else if (tpl.corners === 'star') M.star8(ctx, x + Math.cos(rot + Math.PI / 4) * U * 2.5, y + Math.sin(rot + Math.PI / 4) * U * 2.5, U * 1.8, null, pal.accent);
    });
  }

  const T0 = tpl.top, B0 = tpl.bottom;
  if (!minimal || T0 === 'monogram') {
    switch (T0) {
      case 'bells': {
        const n = landscape ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const x = box.x + (i + 0.5) * (box.w / n);
          const len = (i % 2 ? 4 : 6.5) * s;
          M.bell(ctx, x, box.y - U * 4, len, pal);
        }
        top = 5 * s; break;
      }
      case 'toran': M.toran(ctx, box.x - U * 4, box.x + box.w + U * 4, box.y - U * 3, 5.5 * s, pal, tpl.id); top = 7 * s; break;
      case 'garland': M.garland(ctx, box.x - U * 2, box.x + box.w + U * 2, box.y - U * 2, 5 * s, 1.5 * s, pal.marigold || pal.accent, pal.marigold2 || pal.accent2, tpl.id, landscape ? 4 : 3); top = 6 * s; break;
      case 'mandalaHalf': {
        ctx.save(); ctx.beginPath(); ctx.rect(0, box.y - U * 10, W, U * 10 + 12 * s); ctx.clip();
        M.mandala(ctx, cx, box.y - U * 4, 14 * s, pal.accent, { alpha: alpha * 0.85, rings: 4 });
        ctx.restore(); top = 9 * s; break;
      }
      case 'lotusRow': {
        const n = 3;
        for (let i = -1; i <= 1; i++) M.lotus(ctx, cx + i * 9 * s, box.y + (i ? 5 : 7) * s, (i ? 4 : 6) * s, pal.flower, pal.accent, { base: false, alpha: alpha * 0.9 });
        top = 8 * s; break;
      }
      case 'monogram': {
        const c = design.couple;
        const a = (c.bride.en || 'A')[0] || 'A', b = (c.groom.en || 'B')[0] || 'B';
        const r = 6 * s;
        ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, U * 0.15);
        ctx.beginPath(); ctx.arc(cx, box.y + r, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, box.y + r, r * 0.86, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = pal.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const F = fontsFor(design, tpl);
        ctx.font = `400 ${Math.round(r * 0.8)}px "${F.display}", serif`;
        setLS(ctx, 0);
        const ord = c.order === 'groom' ? [b, a] : [a, b];
        ctx.fillText(`${ord[0]}  ${ord[1]}`, cx, box.y + r * 1.04);
        ctx.font = `italic 400 ${Math.round(r * 0.45)}px "${F.display}", serif`;
        ctx.fillText('&', cx, box.y + r * 1.06);
        top = r * 2 + 3 * s; break;
      }
      case 'wreath': {
        const r = 7.5 * s;
        M.wreath(ctx, cx, box.y + r, r, pal, tpl.id);
        const c = design.couple;
        const F = fontsFor(design, tpl);
        ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `400 ${Math.round(r * 0.55)}px "${F.script}", serif`; setLS(ctx, 0);
        const a = (c.bride.en || 'A')[0], b = (c.groom.en || 'B')[0];
        ctx.fillText(c.order === 'groom' ? `${b}&${a}` : `${a}&${b}`, cx, box.y + r);
        top = r * 2 + 3 * s; break;
      }
      case 'crescent': {
        M.crescent(ctx, cx, box.y + 3.5 * s, 3.2 * s, pal.accent);
        [[-7, 2.5, 0.9], [7, 2.5, 0.9], [-12, 5, 0.6], [12, 5, 0.6]].forEach(([dx, dy, z]) => M.star8(ctx, cx + dx * s, box.y + dy * s, z * s, pal.accent));
        // hanging lanterns
        [-0.36, 0.36].forEach(f => {
          const x = cx + f * box.w;
          ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, U * 0.12);
          ctx.beginPath(); ctx.moveTo(x, box.y - U * 4); ctx.lineTo(x, box.y + 1 * s); ctx.stroke();
          M.archPath(ctx, x - 1.4 * s, box.y + 5.5 * s, 2.8 * s, 4.5 * s, 'pointed'); ctx.fillStyle = hexA(pal.accent, 0.35); ctx.fill(); ctx.stroke();
        });
        top = 8 * s; break;
      }
      case 'jharokhas': {
        const n = landscape ? 7 : 5;
        const w = (box.w / n) * 0.5;
        for (let i = 0; i < n; i++) {
          const x = box.x + (i + 0.5) * (box.w / n) - w / 2;
          const h = w * (i === Math.floor(n / 2) ? 1.5 : 1.2);
          ctx.lineWidth = Math.max(1, U * 0.14); ctx.strokeStyle = pal.accent;
          M.archPath(ctx, x, box.y + h * 0.9 - U, w, h * 0.9, 'pointed');
          ctx.fillStyle = hexA(pal.accent2, 0.18); ctx.fill(); ctx.stroke();
          ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(x + w / 2, box.y + h * 0.45, U * 0.45, 0, Math.PI * 2); ctx.fill();
        }
        top = w * 1.35 + 1 * s; break;
      }
      case 'alpanaMotif': {
        drawAlpanaMotif(ctx, cx, box.y + 4 * s, 4 * s, pal); top = 9 * s; break;
      }
    }
  }
  if (!minimal) {
    const by = box.y + box.h;
    switch (B0) {
      case 'lotus': M.lotus(ctx, cx, by - 0.5 * s, 6 * s, hexA(pal.accent, 0.25), pal.accent, { alpha }); bottom = 7.5 * s; break;
      case 'lotusPond': {
        for (let i = -2; i <= 2; i++) {
          const z = i === 0 ? 7 : Math.abs(i) === 1 ? 5 : 3.5;
          M.lotus(ctx, cx + i * 10 * s, by - 1.5 * s, z * s, pal.flower, pal.accent, { base: false, alpha });
        }
        ctx.strokeStyle = pal.leaf || pal.accent; ctx.lineWidth = Math.max(1, U * 0.15);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, by - s * 0.5 + i * U, box.w * (0.35 - i * 0.08), U * 0.6, 0, 0, Math.PI * 2); ctx.globalAlpha = alpha * (0.5 - i * 0.12); ctx.stroke(); }
        ctx.globalAlpha = alpha;
        bottom = 8.5 * s; break;
      }
      case 'diyas': {
        const n = landscape ? 7 : 5;
        for (let i = 0; i < n; i++) M.diya(ctx, box.x + (i + 0.5) * (box.w / n), by - 1.5 * s, (i === Math.floor(n / 2) ? 3.6 : 2.8) * s, pal);
        bottom = 6 * s; break;
      }
      case 'paisleys': {
        [-1, 1].forEach(d => M.paisley(ctx, cx + d * 5 * s, by - 3.5 * s, 3 * s, d > 0 ? 2.4 : -2.4 + Math.PI * 0.2, hexA(pal.accent, 0.15), pal.accent));
        M.lotus(ctx, cx, by - 1 * s, 3 * s, null, pal.accent, { base: false });
        bottom = 7 * s; break;
      }
      case 'sun': {
        ctx.save(); ctx.beginPath(); ctx.rect(box.x - U * 9, by - 10 * s, box.w + U * 18, 10 * s + U * 9); ctx.clip();
        ctx.fillStyle = pal.accent;
        ctx.beginPath(); ctx.arc(cx, by + U * 6, 12 * s, 0, Math.PI * 2); ctx.globalAlpha = alpha * 0.9; ctx.fill();
        ctx.strokeStyle = pal.accent2; ctx.lineWidth = Math.max(1, U * 0.3);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, by + U * 6, (14.5 + i * 2.2) * s, Math.PI, 0); ctx.stroke(); }
        ctx.restore();
        bottom = 9 * s; break;
      }
      case 'alpanaMotif': drawAlpanaMotif(ctx, cx, by - 4 * s, 4 * s, pal); bottom = 9 * s; break;
    }
  }
  ctx.restore();
  return { top, bottom };
}

function drawAlpanaMotif(ctx, x, y, r, pal) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = pal.accent; ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, r * 0.06);
  for (let k = 0; k < 12; k++) {
    ctx.save(); ctx.rotate(k * Math.PI / 6);
    ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.13, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -r * 1.08, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.stroke();
  [-1.9, 1.9].forEach(dx => { ctx.beginPath(); ctx.arc(dx * r, 0, r * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(dx * r * 1.3, 0, r * 0.07, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

// ---------- photo + QR ----------
export function drawPhoto(ctx, img, photo, x, y, w, h, shape, pal, U) {
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') ctx.ellipse(x + w / 2, y + h / 2, Math.min(w, h) / 2, Math.min(w, h) / 2, 0, 0, Math.PI * 2);
  else if (shape === 'arch') M.archPath(ctx, x, y + h, w, h, 'round');
  else if (shape === 'square') ctx.rect(x, y, w, h);
  else roundRect(ctx, x, y, w, h, U * 2);
  ctx.save();
  ctx.clip();
  if (img) {
    const z = photo.zoom || 1;
    const sc = Math.max(w / img.width, h / img.height) * z;
    const iw = img.width * sc, ih = img.height * sc;
    const ox = (photo.x || 0) * (iw - w) / 2, oy = (photo.y || 0) * (ih - h) / 2;
    ctx.drawImage(img, x + (w - iw) / 2 - ox, y + (h - ih) / 2 - oy, iw, ih);
  } else {
    ctx.fillStyle = hexA(pal.accent, 0.15); ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(1, U * 0.35); ctx.stroke();
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const qrCache = new Map();
export function qrMatrix(text) {
  if (!text || typeof window === 'undefined' || !window.qrcode) return null;
  if (qrCache.has(text)) return qrCache.get(text);
  try {
    window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount();
    const m = []; for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); }
    qrCache.set(text, m); return m;
  } catch { return null; }
}
export function drawQR(ctx, text, x, y, size, dark = '#000', light = '#fff') {
  const m = qrMatrix(text); if (!m) return false;
  const n = m.length, quiet = 2, cell = size / (n + quiet * 2);
  ctx.fillStyle = light; ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ctx.fillRect(Math.floor(x + (c + quiet) * cell), Math.floor(y + (r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
  return true;
}

// ---------- main entry ----------
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * renderPage(ctx, W, H, design, page, opts)
 * opts.bleed: px of bleed around the trim area (background extends, content stays safe)
 * opts.anim: { p } entrance progress 0..1 for video frames
 * opts.templateId: override (event cards with their own template)
 */
export function renderPage(ctx, W, H, design, page = { kind: 'cover' }, opts = {}) {
  const ev = page.kind === 'event' ? design.events[page.index] : null;
  const tpl = TEMPLATE_MAP[opts.templateId || ev?.ownTemplate || design.templateId] || TEMPLATES[0];
  const { pal, dark } = paletteFor(design, tpl);
  const b = opts.bleed || 0;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // background over the whole sheet including bleed
  drawBackground(ctx, W, H, tpl, pal, design, Math.min(W - 2 * b, H - 2 * b) / 100);
  ctx.translate(b, b);
  const w = W - 2 * b, h = H - 2 * b;
  const U = Math.min(w, h) / 100;
  const p = opts.anim ? opts.anim.p : 1;
  const ornA = opts.anim ? ease(p / 0.45) : 1;

  ctx.save(); ctx.globalAlpha = ornA;
  const box = drawFrame(ctx, w, h, tpl, pal, design, U);
  ctx.restore();
  const used = drawOrnaments(ctx, w, h, tpl, pal, design, U, box, page, ornA);
  const content = { x: box.x, y: box.y + used.top, w: box.w, h: box.h - used.top - used.bottom };
  if (opts.debugBox) { ctx.strokeStyle = 'red'; ctx.strokeRect(content.x, content.y, content.w, content.h); }

  const F = fontsFor(design, tpl);
  let blocks = buildBlocks(design, tpl, page);
  const landscape = w > h * 1.15;
  let textBox = content;
  let sidePhoto = null;
  if (landscape) {
    const pi = blocks.findIndex(x => x.k === 'photo');
    if (pi >= 0) {
      sidePhoto = blocks[pi]; blocks = blocks.filter((_, i) => i !== pi);
      const pw = Math.min(content.w * 0.38, content.h * 0.8);
      sidePhoto._rect = { x: content.x, y: content.y + (content.h - pw * 1.2) / 2, w: pw, h: Math.min(content.h, pw * 1.2) };
      textBox = { x: content.x + pw + U * 5, y: content.y, w: content.w - pw - U * 5, h: content.h };
    } else {
      textBox = { x: content.x + content.w * 0.1, y: content.y, w: content.w * 0.8, h: content.h };
    }
  }
  const { list, total } = layout(ctx, blocks, textBox, U, F, design.style);
  const colors = { ink: pal.ink, ink2: pal.ink2 || pal.ink, accent: pal.accent };
  const align = design.style.align || 'center';
  let y = textBox.y + Math.max(0, (textBox.h - total) / 2);
  const n = list.length;

  if (sidePhoto) {
    const r = sidePhoto._rect;
    ctx.save(); ctx.globalAlpha = opts.anim ? ease((p - 0.1) / 0.5) : 1;
    drawPhoto(ctx, getImage(sidePhoto.photo.src), sidePhoto.photo, r.x, r.y, r.w, r.h, design.style.photoShape, pal, U);
    ctx.restore();
  }

  list.forEach((bk, i) => {
    y += bk._gapTop;
    let a = 1, dy = 0;
    if (opts.anim) {
      const st = 0.12 + (i / Math.max(1, n)) * 0.5;
      a = ease((p - st) / 0.35); dy = (1 - a) * U * 3;
    }
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, dy);
    const ax = align === 'left' ? textBox.x : align === 'right' ? textBox.x + textBox.w : textBox.x + textBox.w / 2;
    const cx = textBox.x + textBox.w / 2;
    if (bk.k === 'text') {
      ctx.font = bk._font; setLS(ctx, bk._ls); ctx.textAlign = align;
      ctx.fillStyle = bk.role === 'script' && bk.color === 'accent' || bk.name && dark
        ? M.foil(ctx, textBox.x, y, textBox.x + textBox.w, y + bk._h, bk.name && dark ? pal.ink : colors[bk.color || 'ink'], pal.accent)
        : colors[bk.color || 'ink'] || pal.ink;
      if (bk.name && !dark) ctx.fillStyle = colors.ink;
      bk._lines.forEach((line, li) => {
        const baseY = y + bk._lh * li + bk._px * (bk.role === 'script' ? 0.95 : 0.98) + (bk._lh - bk._px) / 2;
        // letterSpacing adds trailing space; compensate for centred text
        const off = align === 'center' && bk._ls ? bk._ls / 2 : 0;
        ctx.fillText(line, ax + off, baseY);
      });
    } else if (bk.k === 'divider') {
      M.divider(ctx, tpl.divider, cx, y + bk._h / 2, Math.min(textBox.w * (bk.small ? 0.3 : 0.55), U * 40), pal.accent, hexA(pal.accent, 0.3));
    } else if (bk.k === 'photo') {
      const ph = bk._h; const pw = design.style.photoShape === 'circle' || design.style.photoShape === 'square' ? ph : ph * 0.8;
      const px = align === 'left' ? textBox.x : align === 'right' ? textBox.x + textBox.w - pw : cx - pw / 2;
      drawPhoto(ctx, getImage(bk.photo.src), bk.photo, px, y, pw, ph, design.style.photoShape, pal, U);
    } else if (bk.k === 'icon') {
      M.icon(ctx, bk.name, align === 'center' ? cx : ax + (align === 'right' ? -bk._h / 2 : bk._h / 2), y + bk._h / 2, bk._h, pal.accent, pal);
    } else if (bk.k === 'qr') {
      const qs = bk.size * U * (bk._h / (bk.size * U + (bk.caption ? U * 2.6 : 0)) || 1);
      const qx = align === 'left' ? textBox.x : align === 'right' ? textBox.x + textBox.w - qs : cx - qs / 2;
      ctx.save();
      ctx.fillStyle = '#fff'; ctx.fillRect(qx - U * 0.6, y - U * 0.6, qs + U * 1.2, qs + U * 1.2);
      drawQR(ctx, bk.data, qx, y, qs, '#1a1a1a', '#ffffff');
      ctx.restore();
      if (bk.caption) {
        ctx.font = fontStr(F, 'body', U * 1.8, 400, false, bk.caption); setLS(ctx, 0);
        ctx.fillStyle = colors.ink2; ctx.textAlign = align;
        ctx.fillText(bk.caption, align === 'center' ? cx : ax, y + qs + U * 2.4);
      }
    }
    ctx.restore();
    y += bk._h + bk._gap;
  });
  ctx.restore();
  return { overflow: total > textBox.h + 1, dropped: flatten(blocks).length - list.length };
}

export function templateById(id) { return TEMPLATE_MAP[id] || TEMPLATES[0]; }
