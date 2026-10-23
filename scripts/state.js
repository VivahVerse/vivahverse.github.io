// Design model, defaults, and an undo/redo-capable store.
import { EVENT_PRESETS, CULTURES, INVOCATIONS } from './data/culture.js';

export const FORMATS = {
  '5x7':      { label: '5 × 7 in card', w: 1500, h: 2100, mm: [127, 177.8], print: true },
  'a5':       { label: 'A5 (148 × 210 mm)', w: 1748, h: 2480, mm: [148, 210], print: true },
  'a4':       { label: 'A4 (210 × 297 mm)', w: 2480, h: 3508, mm: [210, 297], print: true },
  'story':    { label: 'Story / Status 9:16', w: 1080, h: 1920 },
  'portrait': { label: 'Instagram portrait 4:5', w: 1080, h: 1350 },
  'square':   { label: 'Square 1:1', w: 1080, h: 1080 },
  'wide':     { label: 'Landscape 16:9', w: 1920, h: 1080 },
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function makeEvent(presetId, overrides = {}) {
  const p = EVENT_PRESETS[presetId] || EVENT_PRESETS.custom;
  return {
    id: uid(), preset: presetId,
    name: { ...p.name }, date: '', start: p.time || '', end: '',
    venue: '', address: '', maps: '', dress: p.dress || '',
    msg: { ...p.msg }, icon: p.icon || 'star', photo: null, ownTemplate: '', ...overrides,
  };
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function eventsForCulture(cultureId, weddingDate) {
  const c = CULTURES.find(x => x.id === cultureId) || CULTURES[0];
  const n = c.events.length;
  return c.events.map((id, i) => makeEvent(id, {
    date: weddingDate ? addDays(weddingDate, Math.min(0, i - (n - 2))) : '',
    venue: 'The Lotus Courtyard', address: 'Civil Lines, Jaipur, Rajasthan',
  }));
}

// Clearly fictional sample content.
export function defaultDesign(templateId = 'rajmahal', cultureId = 'hindu-north') {
  const date = '2027-02-12';
  const culture = CULTURES.find(c => c.id === cultureId) || CULTURES[0];
  return {
    v: 1, id: uid(), name: 'Our Wedding Invitation', templateId,
    type: 'complete', culture: culture.id, lang: 'en',
    couple: {
      bride: { en: 'Aanya', hi: 'आन्या' }, groom: { en: 'Vihaan', hi: 'विहान' },
      brideFull: { en: 'Aanya Sharma', hi: 'आन्या शर्मा' }, groomFull: { en: 'Vihaan Kapoor', hi: 'विहान कपूर' },
      useFull: false, order: 'bride', hashtag: '#AanyaWedsVihaan',
      story: 'We met over a shared umbrella during a Bengaluru monsoon, and have been sharing everything since.',
    },
    family: {
      brideParents: { en: 'Mrs. Kavita & Mr. Rajesh Sharma', hi: 'श्रीमती कविता एवं श्री राजेश शर्मा' },
      groomParents: { en: 'Mrs. Meera & Mr. Anil Kapoor', hi: 'श्रीमती मीरा एवं श्री अनिल कपूर' },
      brideGrand: { en: 'Late Smt. Shanti & Shri Gopal Sharma', hi: 'स्व. श्रीमती शांति एवं श्री गोपाल शर्मा' },
      groomGrand: { en: 'Smt. Kamla & Shri Harish Kapoor', hi: 'श्रीमती कमला एवं श्री हरीश कपूर' },
      familyNames: { en: 'The Sharma & Kapoor Families', hi: 'शर्मा एवं कपूर परिवार' },
      hosts: { en: 'Sharma Family, Jaipur', hi: 'शर्मा परिवार, जयपुर' },
    },
    wedding: {
      date, time: '20:00', muhurat: '22:15', venue: 'The Lotus Courtyard',
      address: 'Civil Lines, Jaipur, Rajasthan 302006', maps: 'https://maps.google.com/?q=Civil+Lines+Jaipur',
    },
    wording: {
      invocation: culture.invocation,
      invocationCustom: { en: '', hi: '' },
      headline: { en: 'Together with their families', hi: 'सपरिवार सहर्ष आमंत्रण' },
      message: { en: 'We joyfully invite you and your family to bless the couple with your presence.', hi: 'आप सपरिवार पधारकर वर-वधू को अपना आशीर्वाद प्रदान करें।' },
      closing: { en: 'With love and warm regards', hi: 'सादर एवं सस्नेह' },
    },
    rsvp: { name: 'Rajesh Sharma', phone: '+91 90000 00000', email: '', note: 'Kindly confirm by 25 January' },
    show: {
      invocation: true, headline: true, parents: true, grandparents: false, familyNames: false, hosts: true,
      date: true, time: true, muhurat: true, venue: true, address: true, message: true, photo: true,
      hashtag: true, rsvp: true, qr: true, eventsOnCover: false, dress: true, eventMsg: true,
    },
    events: eventsForCulture(culture.id, date),
    style: {
      palette: 'template', custom: null, fontDisplay: '', fontScript: '', fontBody: '', fontDeva: '',
      scale: 1, nameScale: 1, weight: 'normal', align: 'center', lineHeight: 1, frame: 'template',
      ornaments: 'full', pattern: true, photoShape: 'arch', devaDigits: false, mode: 'easy',
    },
    photos: { couple: null, family: [] },
    pages: { cover: true, events: true, eventCards: true, closing: true },
    video: { format: 'story', length: 'short', track: 'shehnai', volume: 0.8, start: 0, transition: 'fade', particles: 'petals', timeline: true, audioName: '' },
    print: { size: '5x7', bleed: false },
    site: { story: true, gallery: true, music: true, blessings: true, countdown: true, url: '' },
    updatedAt: Date.now(),
  };
}

export function invocationText(design, lang) {
  const w = design.wording;
  if (w.invocation === 'custom') return w.invocationCustom?.[lang] || w.invocationCustom?.en || '';
  const inv = INVOCATIONS.find(i => i.id === w.invocation);
  return inv ? (inv.text[lang] || inv.text.en) : '';
}

// ---------- Store with undo/redo ----------
const listeners = new Set();
let current = null;
let past = [], future = [];
let lastPush = 0;

// Photos are large; history snapshots share their data-URL strings (immutable), so
// JSON cloning cost is acceptable for drafts of typical size.
const clone = o => structuredClone(o);

export const store = {
  get: () => current,
  set(design, { history = true } = {}) {
    current = design;
    if (history) { past = []; future = []; }
    emit();
  },
  update(fn, { coalesce = false } = {}) {
    const now = Date.now();
    if (!coalesce || now - lastPush > 700) {
      past.push(clone(current)); if (past.length > 80) past.shift();
      future = [];
    }
    lastPush = now;
    fn(current);
    current.updatedAt = now;
    emit();
  },
  undo() { if (!past.length) return; future.push(clone(current)); current = past.pop(); emit(); },
  redo() { if (!future.length) return; past.push(clone(current)); current = future.pop(); emit(); },
  canUndo: () => past.length > 0,
  canRedo: () => future.length > 0,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
function emit() { listeners.forEach(fn => fn(current)); }

// Pages a design produces, in order.
export function pageList(design, fmtKey) {
  const f = FORMATS[fmtKey] || FORMATS['5x7'];
  const pages = [];
  const p = design.pages;
  if (design.type === 'savedate') return [{ kind: 'savedate', label: 'Save the Date' }];
  if (design.type === 'events') {
    design.events.forEach((e, i) => pages.push({ kind: 'event', index: i, label: e.name.en || `Function ${i + 1}` }));
    return pages.length ? pages : [{ kind: 'cover', label: 'Cover' }];
  }
  if (p.cover) pages.push({ kind: 'cover', label: 'Cover' });
  if (p.events && design.events.length) {
    const per = eventsPerPage(f.w, f.h);
    for (let i = 0; i < design.events.length; i += per)
      pages.push({ kind: 'events', from: i, to: Math.min(design.events.length, i + per), label: design.events.length > per ? `Functions ${i / per + 1}` : 'Functions' });
  }
  if (p.eventCards) design.events.forEach((e, i) => pages.push({ kind: 'event', index: i, label: e.name.en || `Function ${i + 1}` }));
  if (p.closing) pages.push({ kind: 'closing', label: 'Closing' });
  if (!pages.length) pages.push({ kind: 'cover', label: 'Cover' });
  return pages;
}

export function eventsPerPage(w, h) {
  const r = h / w;
  if (r > 1.6) return 5;
  if (r > 1.15) return 4;
  return 3;
}
