// "Viral reel" story invitations: an 8-scene watercolour wedding story (9:16, ~34 s),
// e.g. "Divine Union". Artwork is painted procedurally (watercolor.js) into cached layers;
// all text is drawn live from the design, so names, dates and venues are always editable.
import * as WC from './watercolor.js';
import { rng } from './motifs.js';
import { invocationText } from '../state.js';
import { fmtTime, parseDate, toDeva } from '../i18n.js';

const clamp01 = t => Math.min(1, Math.max(0, t));
const ease = t => { t = clamp01(t); return 1 - Math.pow(1 - t, 3); };
const easeIO = t => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const hasDeva = s => /[ऀ-ॿ]/.test(s || '');

// ---------------- templates ----------------
const TXT = { gold: '#A97E34', main: '#8E4A3C', dark: '#59483D', script: '#8A2F4E', light: '#FFF8EC' };
export const STORY_TEMPLATES = [
  {
    id: 'divine-union', name: 'Divine Union', sub: 'A Sacred Wedding Story', deity: 'Shiv & Parvati', tag: 'Most loved',
    desc: 'Kashi ghats at dawn, the trishul and Nandi, a marigold courtyard and Kailash in deep blue watercolour.',
    costume: 'shiva', skyline: 'ghats', props: 'shiva', divine: 'kailash', tree: 'banyan', treeFlowers: null,
    warm: { top: '#EEC7A2', mid: '#F8ECDA', glow: '#F5CF94' }, blue: { top: '#AFC7D8', mid: '#F3E7D6', glow: '#F7E2BF' },
    deep: { top: '#4E86B8', mid: '#A9C6DC', glow: null }, water: '#7FA6C4', stone: '#D7BD98', gate: '#D9A86A', wall: '#CDB79A', robe: '#C8582E',
    petals: ['#F2B8B5', '#E89A9A', '#F7D2C4', '#F4C06A'], text: { ...TXT }, track: 'shehnai', verse: 'ganesh', groomWord: 'Mahadev',
  },
  {
    id: 'vrindavan-prem', name: 'Vrindavan Prem', sub: 'A Love Story by the Yamuna', deity: 'Radha & Krishna', tag: 'New',
    desc: 'Rose-pink dawn over Vrindavan temples, flute and peacock feathers, kadamba blossoms and a moonlit Yamuna.',
    costume: 'krishna', skyline: 'vrindavan', props: 'krishna', divine: 'moon', tree: 'kadamba', treeFlowers: '#F2C230',
    warm: { top: '#F0C2B6', mid: '#FAEDE2', glow: '#F7CFA0' }, blue: { top: '#B9CFDC', mid: '#F7EAE0', glow: '#F7D8C0' },
    deep: { top: '#2E4C7E', mid: '#7F9CC4', glow: null }, water: '#79A3BA', stone: '#D9BFA2', gate: '#E0A2A8', wall: '#D8C2AA', robe: '#E08A3A',
    petals: ['#F5B6C8', '#F2A0B6', '#FBD7E0', '#F2C230'], text: { ...TXT, script: '#9A2F6A', main: '#8E3F5A' }, track: 'bansuri', verse: 'radha-krishna',
  },
  {
    id: 'siya-ram-vivah', name: 'Siya Ram Vivah', sub: 'An Ayodhya Wedding Story', deity: 'Sita & Ram', tag: 'New',
    desc: 'The Sarayu at sunrise, Ayodhya palaces with saffron flags, the bow of Shri Ram and a golden dusk.',
    costume: 'ram', skyline: 'ayodhya', props: 'ram', divine: 'dusk', tree: 'banyan', treeFlowers: null,
    warm: { top: '#F1C08E', mid: '#FAEAD2', glow: '#F7C77A' }, blue: { top: '#B4CADA', mid: '#F6E8D4', glow: '#F7DDB0' },
    deep: { top: '#6A7FB4', mid: '#F0B888', glow: '#F6C27A' }, water: '#86A8C2', stone: '#DCC09A', gate: '#E2A85A', wall: '#D2BA98', robe: '#D8742E',
    petals: ['#F6B04A', '#F28C3A', '#F7D27A', '#F2B8B5'], text: { ...TXT, script: '#9A3A22', main: '#8E4A2C' }, track: 'shehnai', verse: 'rcm-siyaram',
  },
  {
    id: 'rajwada-royal', name: 'Rajwada Royal', sub: 'A Palace Wedding Story', deity: 'Royal couple', tag: 'Trending',
    desc: 'A lake palace in watercolour, a bride in red and a groom in a safa, a kalash courtyard and a starlit palace night.',
    costume: 'royal', skyline: 'palace', props: 'royal', divine: 'palace', tree: 'bougainvillea', treeFlowers: '#D9437A',
    warm: { top: '#F0C4A8', mid: '#FAEBDC', glow: '#F6CC94' }, blue: { top: '#B7CBD8', mid: '#F7E9DA', glow: '#F7DCC0' },
    deep: { top: '#26385E', mid: '#5E78A6', glow: null }, water: '#7A9FB8', stone: '#E0C6A6', gate: '#E0A070', wall: '#E2CFB4', robe: '#B8243A',
    petals: ['#E05A7A', '#F2A0B0', '#F7C6CF', '#E0B040'], text: { ...TXT, script: '#8E1F3A' }, track: 'shehnai', verse: 'ganesh',
  },
  {
    id: 'pastel-promise', name: 'Pastel Promise', sub: 'A Modern Watercolour Story', deity: 'Modern couple', tag: 'Modern',
    desc: 'Soft blush hills, cherry-blossom branches and a modern couple — minimal, elegant and non-religious by default.',
    costume: 'modern', skyline: 'none', props: 'floral', divine: 'hills', tree: 'blossom', treeFlowers: '#F4B6C2',
    warm: { top: '#F3CFC9', mid: '#FBF1EC', glow: '#F8DCC8' }, blue: { top: '#C9D8E2', mid: '#F8EFEA', glow: '#F8E2D6' },
    deep: { top: '#9AA9CC', mid: '#E8C9CF', glow: '#F6D7C8' }, water: '#9DB6C8', stone: '#E6D3C2', gate: '#E8C4BE', wall: '#EADBCF', robe: '#D78E86',
    petals: ['#F6C1CC', '#F9D9DF', '#EFAFC0', '#FFFFFF'], text: { ...TXT, gold: '#B58A5A', main: '#8A5A62', script: '#9A4A62' }, track: 'piano', verse: 'none',
  },
];
export const STORY_MAP = Object.fromEntries(STORY_TEMPLATES.map(t => [t.id, t]));

export const ACCENTS = { gold: '#A97E34', terracotta: '#A85A4A', rose: '#A3546A', neutral: '#6B5A4E' };
export const FONT_SETS = {
  classic: { label: 'Classic serif', display: 'Cormorant Garamond', dw: 600, caps: 'Cinzel', script: 'Great Vibes', italic: 'Cormorant Garamond', deva: 'Tiro Devanagari Hindi', devaD: 'Amita' },
  royal: { label: 'Royal', display: 'Playfair Display', dw: 400, caps: 'Cinzel', script: 'Pinyon Script', italic: 'Playfair Display', deva: 'Noto Serif Devanagari', devaD: 'Rozha One' },
  modern: { label: 'Modern', display: 'Marcellus', dw: 400, caps: 'Josefin Sans', script: 'Great Vibes', italic: 'Cormorant Garamond', deva: 'Tiro Devanagari Hindi', devaD: 'Yatra One' },
};

export function defaultStory(tplId = 'divine-union') {
  return {
    template: tplId, monogram: 'serif', initials: '', accent: 'auto', bg: 'auto', intensity: 1, petals: 'gentle', placement: 'left',
    fonts: 'classic', align: 'center', length: 'standard', mergeEvents: true, showHandle: false, handle: '', endScreen: 'black',
    intro: { en: 'We request your gracious presence\nto bless the couple on\nthe auspicious occasion of the', hi: 'आपकी गरिमामयी उपस्थिति\nएवं आशीर्वाद हेतु\nसादर आमंत्रित करते हैं' },
    heading: { en: 'Wedding Ceremony', hi: 'शुभ विवाह' }, of: { en: 'of', hi: '' },
    closing1: { en: 'Cordially inviting you and awaiting\nyour gracious presence', hi: 'आपकी प्रतीक्षा में\nसादर आमंत्रण' },
    closing2: { en: 'Your presence will make our celebration\neven more special.', hi: 'आपकी उपस्थिति से हमारा उत्सव\nऔर भी विशेष होगा।' }, showClosing2: false,
    showFamilies: true, showVenue: true, mainEvent: '', fade: true, mainWord: { en: 'Wedding', hi: 'शुभ विवाह' },
  };
}

const MAIN_IDS = ['wedding', 'pheras', 'vivah', 'shaadi', 'lagna', 'kalyanam', 'nikah', 'anandkaraj', 'phere', 'saptapadi'];
export function mainEventOf(design) {
  const ev = design.events || [];
  return ev.find(e => e.id === design.story?.mainEvent) || ev.find(e => MAIN_IDS.includes(e.preset)) || ev[ev.length - 1] || null;
}

// ---------------- painted layers (cached) ----------------
const cache = new Map();
function layerKey(tpl, W, H, kind, st) { return [tpl.id, W, H, kind, st.bg, st.intensity, st.placement].join('|'); }
function newCanvas(W, H) { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
function skyFor(tpl, st, which) {
  if (st.bg === 'parchment' && which === 'blue') return tpl.warm;
  if (st.bg === 'blue' && which === 'warm') return tpl.blue;
  return tpl[which];
}
function paperFor(tpl, st, W, H, ctx, seed, deep = false) {
  WC.paper(ctx, W, H, { base: deep ? '#EEF2F2' : '#F8F0E2', tints: deep ? ['#C9D9E4', '#E2ECEF', '#BFD2E0'] : ['#EBD6B6', '#F3DCC4', '#E9CFA8'], seed, strength: st.intensity });
}

function paintOpen(tpl, st, W, H) {
  const bg = newCanvas(W, H), c = bg.getContext('2d');
  paperFor(tpl, st, W, H, c, tpl.id + 'o');
  const s = skyFor(tpl, st, 'warm');
  WC.sky(c, W, H, H * 0.6, { ...s, seed: tpl.id + 'so', clouds: 3, intensity: st.intensity });
  const hz = H * 0.6;
  if (tpl.skyline === 'none') WC.mountainsWC(c, W, H, hz, { color: WC.mix(s.top, '#B8A6B8', 0.5), snow: '#FFFFFF', seed: 'po', height: 0.07 });
  else WC.skyline(c, W, H, hz, tpl.skyline, { color: WC.mix(tpl.stone, '#9A7A60', 0.3), far: WC.mix(tpl.stone, s.mid, 0.4), seed: tpl.id + 'o', side: 'right', scale: 0.9 });
  WC.water(c, W, H, hz, H * 0.8, { color: tpl.water, light: s.mid, seed: tpl.id + 'wo' });
  WC.steps(c, W, H, H * 0.8, { color: tpl.stone, seed: tpl.id + 'st' });
  const fg = newCanvas(W, H), f = fg.getContext('2d');
  WC.seatedCouple(f, W * 0.5, H * 0.985, W * 0.98, WC.COSTUMES[tpl.costume], tpl.id + 'sc');
  return { bg, fg, water: [hz, H * 0.8] };
}

function paintSetting(tpl, st, W, H) {
  const bg = newCanvas(W, H), c = bg.getContext('2d');
  paperFor(tpl, st, W, H, c, tpl.id + 's');
  const s = skyFor(tpl, st, 'blue');
  const hz = H * 0.66;
  WC.sky(c, W, H, hz, { ...s, seed: tpl.id + 'ss', clouds: 5, intensity: st.intensity });
  const right = st.placement === 'right';
  if (tpl.skyline !== 'none') WC.skyline(c, W, H, hz, tpl.skyline, { color: WC.mix(tpl.stone, '#9A7A60', 0.25), far: WC.mix(tpl.stone, s.mid, 0.5), seed: tpl.id + 's', side: right ? 'left' : 'right', scale: 0.8 });
  else WC.mountainsWC(c, W, H, hz, { color: WC.mix(s.top, '#B8A6B8', 0.4), snow: '#FFFFFF', seed: 'ps', height: 0.08 });
  WC.water(c, W, H, hz, H * 0.86, { color: tpl.water, light: s.mid, seed: tpl.id + 'ws' });
  WC.steps(c, W, H, H * 0.86, { color: tpl.stone, seed: tpl.id + 'st2' });
  const fg = newCanvas(W, H), f = fg.getContext('2d');
  f.save();
  if (right) { f.translate(W, 0); f.scale(-1, 1); }
  const u = W / 100;
  if (tpl.props === 'shiva') {
    WC.trishul(f, W * 0.2, H * 0.47, H * 0.5, { seed: 'tr' + tpl.id });
    WC.nandi(f, W * 0.34, H * 0.975, W * 0.6, { seed: 'nd' });
    WC.lotus(f, W * 0.7, H * 0.95, u * 6, { seed: 'l1' }); WC.lotus(f, W * 0.86, H * 0.97, u * 4.5, { seed: 'l2', color: '#F0B8C0' });
  } else if (tpl.props === 'krishna') {
    [[-0.35, 0.16], [-0.12, 0.2], [0.1, 0.18], [0.3, 0.15]].forEach(([r, l], i) => WC.feather(f, W * (0.2 + i * 0.03), H * 0.98, H * l * 1.9, r, 'kf' + i));
    WC.bansuriWC(f, W * 0.08, H * 0.86, W * 0.55, -0.12);
    WC.kalash(f, W * 0.62, H * 0.975, H * 0.17, { seed: 'kk' });
    WC.lotus(f, W * 0.84, H * 0.96, u * 6, { seed: 'l3' }); WC.lotus(f, W * 0.45, H * 0.985, u * 4, { seed: 'l4', color: '#F0B8C0' });
  } else if (tpl.props === 'ram') {
    WC.bowQuiver(f, W * 0.3, H * 0.98, H * 0.42, { seed: 'rb' });
    WC.kalash(f, W * 0.58, H * 0.975, H * 0.17, { seed: 'rk' });
    WC.lotus(f, W * 0.82, H * 0.96, u * 6, { seed: 'l5' }); WC.lotus(f, W * 0.12, H * 0.99, u * 4.5, { seed: 'l6', color: '#F0B8C0' });
  } else if (tpl.props === 'royal') {
    WC.kalash(f, W * 0.25, H * 0.975, H * 0.22, { seed: 'yk', metal: '#C99A3E' });
    WC.lotus(f, W * 0.55, H * 0.97, u * 6, { seed: 'l7', color: '#E58A9A' }); WC.lotus(f, W * 0.8, H * 0.98, u * 5, { seed: 'l8' });
  } else {
    for (let i = 0; i < 7; i++) WC.lotus(f, W * (0.1 + i * 0.13), H * (0.95 + (i % 2) * 0.025), u * (4 + (i % 3) * 1.2), { seed: 'fl' + i, color: ['#F4B6C2', '#F9D3DA', '#EFA6B6'][i % 3] });
  }
  f.restore();
  return { bg, fg, water: [hz, H * 0.86], flip: right };
}

function paintCourt(tpl, st, W, H) {
  const bg = newCanvas(W, H), c = bg.getContext('2d');
  paperFor(tpl, st, W, H, c, tpl.id + 'c');
  const s = skyFor(tpl, st, 'blue');
  WC.sky(c, W, H, H * 0.72, { ...s, seed: tpl.id + 'sc', clouds: 6, intensity: st.intensity });
  if (tpl.skyline !== 'none') WC.skyline(c, W, H, H * 0.7, tpl.skyline, { color: WC.mix(tpl.stone, '#9A7A60', 0.2), far: WC.mix(tpl.stone, s.mid, 0.55), seed: tpl.id + 'c', side: 'left', scale: 0.6 });
  WC.water(c, W, H, H * 0.7, H * 0.8, { color: tpl.water, light: s.mid, seed: tpl.id + 'wc' });
  WC.steps(c, W, H, H * 0.8, { color: tpl.stone, seed: tpl.id + 'cst' });
  WC.boat(c, W * 0.5, H * 0.76, W * 0.12);
  const g = WC.courtyard(c, W, H, { wall: tpl.wall, gate: tpl.gate, y0: 0.72, seed: tpl.id + 'cy' });
  if (tpl.tree !== 'none') WC.branches(c, W, H, { side: 'left', seed: tpl.id + 'br', roots: tpl.tree === 'banyan', flowers: tpl.treeFlowers, leaf: tpl.tree === 'blossom' ? '#9AB08A' : '#6E9450', bark: tpl.tree === 'blossom' ? '#7A5A50' : '#6B5440' });
  // festive props by the wall
  WC.kalash(c, W * 0.14, H * 0.985, H * 0.1, { seed: 'ck1' });
  WC.kalash(c, W * 0.86, H * 0.985, H * 0.1, { seed: 'ck2' });
  return { bg, fg: null, gate: g, water: [H * 0.7, H * 0.8] };
}

function paintDivine(tpl, st, W, H) {
  const bg = newCanvas(W, H), c = bg.getContext('2d');
  const night = tpl.divine === 'moon' || tpl.divine === 'palace';
  paperFor(tpl, st, W, H, c, tpl.id + 'd', true);
  const s = tpl.deep, hz = H * 0.64;
  WC.sky(c, W, H, hz, { top: s.top, mid: s.mid, glow: s.glow, seed: tpl.id + 'sd', clouds: night ? 2 : 7, cloud: night ? '#C8D4EA' : '#FFFFFF', intensity: 1.3 * st.intensity });
  const R = rng('stars' + tpl.id);
  if (night) {
    c.save(); for (let i = 0; i < 90; i++) { c.globalAlpha = 0.3 + R() * 0.6; c.fillStyle = '#FFF8E0'; c.beginPath(); c.arc(R() * W, R() * hz * 0.7, W / 900 * (1 + R() * 2), 0, 7); c.fill(); } c.restore();
    const mx = W * 0.74, my = H * 0.12, mr = W * 0.07;
    const g = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4); g.addColorStop(0, 'rgba(255,245,215,.5)'); g.addColorStop(1, 'rgba(255,245,215,0)'); c.fillStyle = g; c.fillRect(0, 0, W, hz);
    WC.blob(c, WC.ellipsePts(mx, my, mr, mr, 12), '#FFF4D6', { alpha: 0.2, layers: 10, spread: 0.05, edge: 0.2, seed: 'moon' });
  }
  if (tpl.divine === 'kailash' || tpl.divine === 'hills') WC.mountainsWC(c, W, H, hz, { color: tpl.divine === 'hills' ? '#B7A4C0' : '#5F86AE', snow: '#F6F8FB', seed: tpl.id + 'm', height: tpl.divine === 'hills' ? 0.14 : 0.24 });
  else if (tpl.divine === 'moon') { WC.skyline(c, W, H, hz, 'vrindavan', { color: '#3B4F78', far: '#5A6E98', seed: 'vn', side: 'full', scale: 0.8 }); }
  else if (tpl.divine === 'dusk') { WC.skyline(c, W, H, hz, 'ayodhya', { color: '#8A6A72', far: '#B9909A', seed: 'ad', side: 'full', scale: 1.1 }); }
  else if (tpl.divine === 'palace') {
    WC.skyline(c, W, H, hz, 'palace', { color: '#4A5A80', far: '#64749C', seed: 'pn', side: 'full', scale: 1.2 });
    c.save(); for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,214,140,${0.4 + R() * 0.5})`; c.fillRect(R() * W, hz - H * (0.01 + R() * 0.07), W / 220, W / 160); } c.restore();
  }
  WC.water(c, W, H, hz, H * 0.86, { color: night ? '#3E5C88' : WC.mix(tpl.water, s.top, 0.4), light: night ? '#8FA6C8' : '#E6EEF3', seed: tpl.id + 'wd' });
  WC.steps(c, W, H, H * 0.86, { color: night ? '#8C8AA0' : WC.mix(tpl.stone, '#8FA0B8', 0.35), seed: tpl.id + 'rk' });
  const fg = newCanvas(W, H), f = fg.getContext('2d');
  WC.standingCouple(f, W * 0.5, H * 0.97, H * 0.44, WC.COSTUMES[tpl.costume], tpl.id + 'dv', { embrace: true });
  return { bg, fg, water: [hz, H * 0.86], night };
}

function paintFarewell(tpl, st, W, H) {
  const bg = newCanvas(W, H), c = bg.getContext('2d');
  paperFor(tpl, st, W, H, c, tpl.id + 'f');
  const s = skyFor(tpl, st, 'blue'), hz = H * 0.62;
  WC.sky(c, W, H, hz, { ...s, glow: tpl.warm.glow, seed: tpl.id + 'sf', clouds: 6, intensity: st.intensity });
  if (tpl.skyline !== 'none') { WC.skyline(c, W, H, hz, tpl.skyline, { color: WC.mix(tpl.stone, '#9A7A60', 0.25), far: WC.mix(tpl.stone, s.mid, 0.5), seed: tpl.id + 'f1', side: 'left', scale: 0.75 }); WC.skyline(c, W, H, hz, tpl.skyline, { color: WC.mix(tpl.stone, '#9A7A60', 0.25), far: WC.mix(tpl.stone, s.mid, 0.5), seed: tpl.id + 'f2', side: 'right', scale: 0.75 }); }
  else WC.mountainsWC(c, W, H, hz, { color: WC.mix(s.top, '#B8A6B8', 0.4), snow: '#FFFFFF', seed: 'pf', height: 0.1 });
  WC.water(c, W, H, hz, H, { color: tpl.water, light: s.mid, seed: tpl.id + 'wf' });
  const fg = newCanvas(W, H), f = fg.getContext('2d');
  // banks with aarti figures on both sides
  const bank = new Path2D(); bank.moveTo(0, H * 0.8); bank.lineTo(W * 0.22, H * 0.84); bank.lineTo(W * 0.3, H); bank.lineTo(0, H); bank.closePath();
  bank.moveTo(W, H * 0.8); bank.lineTo(W * 0.78, H * 0.84); bank.lineTo(W * 0.7, H); bank.lineTo(W, H); bank.closePath();
  WC.paint(f, bank, tpl.stone, { edge: 0.3, seed: 'bank' + tpl.id, box: [0, H * 0.8, W, H * 0.2] });
  const lamps = [];
  [[0.06, 0.92, 1], [0.17, 0.9, 1], [0.94, 0.92, -1], [0.83, 0.9, -1]].forEach(([x, y, d], i) => lamps.push(WC.priest(f, W * x, H * y, H * 0.12, { robe: i % 2 ? WC.mix(tpl.robe, '#FFFFFF', 0.15) : tpl.robe, seed: 'pr' + i, facing: d })));
  WC.standingCouple(f, W * 0.5, H * 0.97, H * 0.3, WC.COSTUMES[tpl.costume], tpl.id + 'fw');
  return { bg, fg, lamps: lamps.map(([x, y]) => [x / W, y / H]), water: [hz, H] };
}

const PAINTERS = { open: paintOpen, setting: paintSetting, court: paintCourt, divine: paintDivine, farewell: paintFarewell };
export function getLayer(tpl, st, W, H, kind) {
  const k = layerKey(tpl, W, H, kind, st);
  if (!cache.has(k)) {
    cache.set(k, PAINTERS[kind](tpl, st, W, H));
    if (cache.size > 14) cache.delete(cache.keys().next().value);
  }
  return cache.get(k);
}
export function warmLayers(design, W, H) {
  const tpl = STORY_MAP[design.story.template] || STORY_TEMPLATES[0];
  Object.keys(PAINTERS).forEach(k => getLayer(tpl, design.story, W, H, k));
}

// ---------------- text helpers ----------------
function fontStr(fs, role, px, text) {
  const d = hasDeva(text);
  switch (role) {
    case 'display': return d ? `${px}px "${fs.devaD}", "${fs.deva}"` : `${fs.dw} ${px}px "${fs.display}", serif`;
    case 'num': return `400 ${px}px "${fs.num || 'Playfair Display'}", serif`;
    case 'caps': return d ? `${px}px "${fs.deva}"` : `600 ${px}px "${fs.caps}", serif`;
    case 'capsL': return d ? `${px}px "${fs.deva}"` : `400 ${px}px "${fs.caps}", serif`;
    case 'script': return d ? `${px}px "${fs.devaD}", "${fs.deva}"` : `${px}px "${fs.script}", cursive`;
    case 'italic': return d ? `${px}px "${fs.deva}"` : `italic 400 ${px}px "${fs.italic}", serif`;
    case 'deva': return `${px}px "${fs.deva}", serif`;
    default: return d ? `${px}px "${fs.deva}"` : `500 ${px}px "${fs.display}", serif`;
  }
}
/** Draw one line, auto-shrinking to maxW. Returns the used size. */
function line(ctx, fs, text, x, y, { role = 'body', size, color, alpha = 1, maxW, ls = 0, align = 'center', rise = 0, stroke = null, shadow = null }) {
  if (!text || alpha <= 0) return size;
  let px = size;
  ctx.save();
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = hasDeva(text) ? '0px' : `${ls * px}px`;
  ctx.font = fontStr(fs, role, px, text);
  while (maxW && ctx.measureText(text).width > maxW && px > size * 0.45) { px *= 0.95; ctx.font = fontStr(fs, role, px, text); if ('letterSpacing' in ctx && !hasDeva(text)) ctx.letterSpacing = `${ls * px}px`; }
  ctx.globalAlpha *= alpha;
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = px * 0.5; }
  if (stroke) { ctx.lineWidth = px * 0.12; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y + rise); }
  ctx.fillStyle = color; ctx.fillText(text, x, y + rise);
  ctx.restore();
  return px;
}
const rev = (local, at, d = 0.9) => ease((local - at) / d);

function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; }
function dateParts(iso, lang) {
  const d = parseDate(iso); if (!d) return null;
  if (lang === 'hi') {
    const m = new Intl.DateTimeFormat('hi-IN', { month: 'long' }).format(d);
    return { day: String(d.getDate()), sup: '', rest: `${m} ${d.getFullYear()}`, wk: new Intl.DateTimeFormat('hi-IN', { weekday: 'long' }).format(d) };
  }
  const m = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(d).toUpperCase();
  return { day: String(d.getDate()), sup: ordinal(d.getDate()), rest: `${m} ${d.getFullYear()}`, wk: new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(d) };
}
function timePhrase(t, lang, onwards) {
  const s = fmtTime(t, lang); if (!s) return '';
  if (lang === 'hi') return onwards ? `${s} से` : s;
  if (onwards) return `${s} ONWARDS`;
  const h = +t.split(':')[0];
  const part = h < 12 ? 'Morning' : h < 16 ? 'Afternoon' : h < 20 ? 'Evening' : 'Night';
  return `${part} · ${s}`;
}
function firstGrapheme(s) { s = (s || '').trim(); if (!s) return ''; try { const seg = new Intl.Segmenter('hi', { granularity: 'grapheme' }); return [...seg.segment(s)][0].segment; } catch { return s[0]; } }

/** Small ornamental divider: arrow-lotus line. */
function divider(ctx, x, y, w, color, p) {
  if (p <= 0) return;
  const u = w / 40;
  ctx.save(); ctx.globalAlpha *= p; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1, u * 0.25);
  const half = (w / 2) * ease(p);
  ctx.beginPath(); ctx.moveTo(x - half, y); ctx.lineTo(x - u * 3, y); ctx.moveTo(x + u * 3, y); ctx.lineTo(x + half, y); ctx.stroke();
  [-1, 1].forEach(d => { ctx.beginPath(); ctx.moveTo(x + d * half, y); ctx.lineTo(x + d * (half - u * 1.5), y - u); ctx.lineTo(x + d * (half - u * 1.5), y + u); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(x + d * half * 0.55, y, u * 0.6, 0, 7); ctx.fill(); });
  // tiny lotus
  ctx.beginPath(); ctx.moveTo(x, y - u * 2.4); ctx.quadraticCurveTo(x + u * 1.6, y - u * 0.6, x, y + u * 1); ctx.quadraticCurveTo(x - u * 1.6, y - u * 0.6, x, y - u * 2.4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - u * 2.6, y - u * 1.4); ctx.quadraticCurveTo(x - u * 0.6, y - u * 0.6, x, y + u * 1); ctx.quadraticCurveTo(x - u * 2, y + u * 0.6, x - u * 2.6, y - u * 1.4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + u * 2.6, y - u * 1.4); ctx.quadraticCurveTo(x + u * 0.6, y - u * 0.6, x, y + u * 1); ctx.quadraticCurveTo(x + u * 2, y + u * 0.6, x + u * 2.6, y - u * 1.4); ctx.fill();
  ctx.restore();
}

/** Monogram: initials drawn with a gold stroke, then filled, with a vine and blossoms growing around. */
function monogram(ctx, fs, A, B, cx, cy, size, style, gold, local) {
  const pStroke = clamp01(local / 1.6), pFill = ease((local - 1.0) / 1.0), pVine = clamp01((local - 0.4) / 2.0);
  const deva = hasDeva(A + B);
  const fam = style === 'script' && !deva ? `${size * 1.15}px "${fs.script}"` : deva ? `${size * 0.9}px "${fs.devaD}", "${fs.deva}"` : `400 ${size}px "${style === 'royal' ? 'Playfair Display' : fs.caps}", serif`;
  ctx.save();
  ctx.font = fam; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const gap = size * (style === 'script' ? 0.42 : 0.5);
  const parts = [[A, cx - gap, cy], [B, cx + gap, cy + size * 0.12]];
  if (style === 'framed') {
    ctx.strokeStyle = WC.hexA(gold, 0.8); ctx.lineWidth = size * 0.02;
    const r = size * 1.02, L = Math.PI * 2 * r;
    ctx.setLineDash([L, L]); ctx.lineDashOffset = L * (1 - ease(pStroke));
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.setLineDash([]);
  }
  parts.forEach(([ch, x, y], i) => {
    const L = size * 6;
    ctx.save();
    ctx.lineWidth = size * 0.022; ctx.strokeStyle = gold; ctx.lineJoin = 'round';
    ctx.setLineDash([L, L]); ctx.lineDashOffset = L * (1 - ease(clamp01(pStroke * 1.2 - i * 0.2)));
    ctx.strokeText(ch, x, y);
    ctx.restore();
    if (pFill > 0) {
      ctx.save(); ctx.globalAlpha *= pFill;
      const g = ctx.createLinearGradient(x, y - size / 2, x, y + size / 2);
      g.addColorStop(0, WC.mix(gold, '#F6E2A8', 0.45)); g.addColorStop(0.5, gold); g.addColorStop(1, WC.mix(gold, '#6A4A1A', 0.3));
      ctx.fillStyle = g; ctx.fillText(ch, x, y);
      ctx.restore();
    }
  });
  // vine
  const vine = new Path2D();
  vine.moveTo(cx - size * 1.0, cy + size * 0.55);
  vine.bezierCurveTo(cx - size * 1.25, cy - size * 0.1, cx - size * 0.95, cy - size * 0.8, cx - size * 0.35, cy - size * 0.72);
  vine.moveTo(cx + size * 1.0, cy - size * 0.45);
  vine.bezierCurveTo(cx + size * 1.25, cy + size * 0.2, cx + size * 0.9, cy + size * 0.85, cx + size * 0.3, cy + size * 0.8);
  const L = size * 5;
  ctx.setLineDash([L, L]); ctx.lineDashOffset = L * (1 - pVine);
  ctx.strokeStyle = WC.hexA('#6E8A50', 0.75); ctx.lineWidth = size * 0.014; ctx.stroke(vine);
  ctx.setLineDash([]);
  const leaves = [[-1.18, 0.2], [-1.12, -0.25], [-0.85, -0.68], [-0.55, -0.78], [1.18, -0.05], [1.1, 0.4], [0.82, 0.74], [0.5, 0.84]];
  leaves.forEach(([lx, ly], i) => {
    const a = ease((pVine - i / leaves.length) * 3); if (a <= 0) return;
    ctx.save(); ctx.translate(cx + lx * size, cy + ly * size); ctx.rotate(i * 1.1); ctx.scale(a, a);
    ctx.fillStyle = WC.hexA(i % 3 ? '#7E9A5A' : '#9AB070', 0.85); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.06, size * 0.025, 0, 0, 7); ctx.fill();
    ctx.restore();
  });
  [[-0.95, -0.55, '#E58A9A'], [1.02, 0.55, '#E58A9A'], [-1.15, 0.4, '#F2B8C0'], [0.62, 0.86, '#F2C06A']].forEach(([fx, fy, col], i) => {
    const a = ease((pVine - 0.5 - i * 0.1) * 3); if (a <= 0) return;
    ctx.save(); ctx.translate(cx + fx * size, cy + fy * size); ctx.scale(a, a); ctx.fillStyle = col;
    for (let k = 0; k < 5; k++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, -size * 0.035, size * 0.025, size * 0.04, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#E8B040'; ctx.beginPath(); ctx.arc(0, 0, size * 0.015, 0, 7); ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

// ---------------- timeline ----------------
export class StoryTimeline {
  constructor(design, W, H) {
    this.design = design; this.W = W; this.H = H;
    this.st = { ...defaultStory(), ...(design.story || {}) };
    this.tpl = STORY_MAP[this.st.template] || STORY_TEMPLATES[0];
    this.fs = FONT_SETS[this.st.fonts] || FONT_SETS.classic;
    const lang = design.lang === 'hi' ? 'hi' : 'en';
    this.lg = lang; this.bi = design.lang === 'bi';
    const ext = this.st.length === 'extended';
    const k = ext ? 1.2 : 1;
    const S = [];
    const add = (kind, layer, dur, data, group) => S.push({ kind, layer, dur: dur * k, data, group: group || kind });
    add('open', 'open', 2, null, 'open');
    add('monogram', 'open', 4, null, 'open');
    add('reveal', 'setting', 2, null, 'setting');
    add('invite', 'setting', 6, null, 'setting');
    if (ext && this.st.showFamilies) add('family', 'setting', 4.5, null, 'setting2');
    const main = mainEventOf(design);
    const ev = design.events || [];
    const mi = main ? ev.indexOf(main) : ev.length;
    const groups = list => {
      const out = [];
      list.forEach(e => {
        const last = out[out.length - 1];
        if (this.st.mergeEvents && last && last.length < 2 && last[0].date === e.date && (last[0].venue || '') === (e.venue || '')) last.push(e); else out.push([e]);
      });
      return out;
    };
    let pre = groups(ev.slice(0, mi)), post = groups(ev.slice(mi + 1));
    // keep the reel close to ~34 s: pair up functions when there are many
    const cap = ext ? 5 : 2;
    const pairUp = arr => { const o = []; arr.forEach(g => { const l = o[o.length - 1]; if (l && l.length + g.length <= 3) l.push(...g); else o.push([...g]); }); return o; };
    for (let guard = 0; guard < 4 && pre.length + post.length > cap; guard++) { const a0 = pre.length + post.length; pre = pairUp(pre); post = pairUp(post); if (pre.length + post.length === a0) break; }
    const evDur = pre.length + post.length > 1 ? 3.8 : 4;
    pre.forEach((g, i) => add('event', 'court', evDur + (g.length - 1) * 0.7, g, 'court' + i));
    add('main', 'divine', 7, main ? [main] : null, 'divine');
    post.forEach((g, i) => add('event', 'court', evDur + (g.length - 1) * 0.7, g, 'post' + i));
    add('bless', 'farewell', 5, null, 'farewell');
    add('closing', 'farewell', 4, null, 'farewell');
    let t = 0; S.forEach(s => { s.start = t; t += s.dur; });
    // group timing for continuous camera moves
    const gs = {}; S.forEach(s => { (gs[s.group] ||= { start: s.start, dur: 0 }).dur += s.dur; });
    S.forEach(s => (s.g = gs[s.group]));
    this.scenes = S; this.total = t; this.XF = 0.9;
    const R = rng('petals' + this.tpl.id);
    const n = { none: 0, gentle: 16, more: 34 }[this.st.petals] ?? 16;
    this.petals = [...Array(n)].map(() => ({ x: R(), y: R(), s: 0.7 + R() * 0.8, sp: 0.25 + R() * 0.5, r: R() * 6, c: this.tpl.petals[Math.floor(R() * this.tpl.petals.length)] }));
  }
  sceneCanvas() { return null; }
  sceneAt(t) { let i = this.scenes.findIndex(s => t < s.start + s.dur); if (i < 0) i = this.scenes.length - 1; return i; }
  layer(kind) { return getLayer(this.tpl, this.st, this.W, this.H, kind); }
  colors() {
    const c = { ...this.tpl.text };
    if (this.st.accent && this.st.accent !== 'auto') c.gold = ACCENTS[this.st.accent] || c.gold;
    return c;
  }
  draw(ctx, t) {
    const { W, H } = this;
    t = Math.min(Math.max(0, t), this.total - 0.001);
    const i = this.sceneAt(t), sc = this.scenes[i];
    const local = t - sc.start;
    this.drawScene(ctx, sc, local, t);
    // cross-dissolve when the painting changes
    const prev = this.scenes[i - 1];
    if (prev && prev.layer !== sc.layer && local < this.XF) {
      ctx.save(); ctx.globalAlpha = 1 - easeIO(local / this.XF);
      this.drawScene(ctx, prev, prev.dur - 0.001, sc.start - 0.001, true);
      ctx.restore();
    } else if (prev && prev.layer === sc.layer && prev.kind !== sc.kind && local < 0.5) {
      // same painting, previous text lingers out
      ctx.save(); ctx.globalAlpha = 1 - ease(local / 0.5); this.drawText(ctx, prev, prev.dur, true); ctx.restore();
    }
    // opening: emerge from ivory paper
    if (t < 1.6) { ctx.save(); ctx.globalAlpha = 1 - easeIO(t / 1.6); ctx.fillStyle = '#F8F0E2'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // closing: darken, then fade
    const last = this.scenes[this.scenes.length - 1];
    if (sc.kind === 'closing') {
      const d = easeIO(local / Math.min(2.2, sc.dur * 0.55)) * 0.62;
      ctx.save(); ctx.fillStyle = `rgba(14,12,18,${d})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      this.drawText(ctx, sc, local, false, true);
      const endF = clamp01((t - (this.total - 1.2)) / 1.2);
      if (this.st.fade !== false && endF > 0) { ctx.save(); ctx.globalAlpha = easeIO(endF); ctx.fillStyle = this.st.endScreen === 'ivory' ? '#F8F0E2' : '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    void last;
  }
  drawScene(ctx, sc, local, t, noText = false) {
    const { W, H } = this;
    const L = this.layer(sc.layer);
    const gp = clamp01((t - sc.g.start) / sc.g.dur);
    // camera: push-in for most, gentle pull-out for the farewell
    const out = sc.layer === 'farewell';
    const z = out ? 1.08 - 0.07 * easeIO(gp) : 1 + 0.07 * easeIO(gp);
    const zf = out ? 1.1 - 0.1 * easeIO(gp) : 1 + 0.11 * easeIO(gp);
    ctx.save(); ctx.translate(W / 2, H * 0.55); ctx.scale(z, z); ctx.drawImage(L.bg, -W / 2, -H * 0.55); ctx.restore();
    this.live(ctx, sc, L, t, 'back');
    if (L.fg) {
      const rise = sc.kind === 'open' ? (1 - easeIO(local / 2)) * H * 0.02 : 0;
      const a = sc.kind === 'reveal' ? ease(local / 1.6) : 1;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(W / 2, H); ctx.scale(zf, zf); ctx.drawImage(L.fg, -W / 2, -H + rise); ctx.restore();
    }
    this.live(ctx, sc, L, t, 'front');
    this.drawPetals(ctx, t);
    if (!noText && sc.kind !== 'closing') this.drawText(ctx, sc, local);
    else if (noText && sc.kind !== 'closing') this.drawText(ctx, sc, local, true);
  }
  live(ctx, sc, L, t, phase) {
    const { W, H } = this, u = W / 100;
    if (phase === 'back') {
      // water shimmer
      const [y0, y1] = L.water || [H * 0.6, H * 0.8];
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineCap = 'round';
      for (let k = 0; k < 14; k++) {
        const yy = y0 + (y1 - y0) * ((k * 0.37) % 1), x = ((k * 0.61 + t * 0.012 * (1 + k % 3)) % 1.2 - 0.1) * W;
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 1.5 + k);
        ctx.lineWidth = Math.max(1, u * 0.18); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + u * (3 + (k % 4) * 2), yy); ctx.stroke();
      }
      ctx.restore();
      if (sc.layer === 'open' || sc.layer === 'farewell') {
        for (let k = 0; k < 6; k++) {
          const x = ((k * 0.17 + 0.08 + t * 0.006 * (k % 2 ? 1 : -1)) % 1 + 1) % 1 * W, y = y0 + (y1 - y0) * (0.25 + (k % 3) * 0.2);
          ctx.save(); ctx.fillStyle = '#9A5A30'; ctx.beginPath(); ctx.ellipse(x, y + u * 0.3, u * 0.9, u * 0.35, 0, 0, 7); ctx.fill(); ctx.restore();
          WC.flame(ctx, x, y, u * 0.45, t, k);
        }
      }
      if (L.night) { ctx.save(); for (let k = 0; k < 20; k++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + k * 1.7); ctx.fillStyle = '#FFF6DA'; ctx.beginPath(); ctx.arc(((k * 0.137) % 1) * W, ((k * 0.291) % 1) * H * 0.35, u * 0.22, 0, 7); ctx.fill(); } ctx.restore(); }
    } else {
      if (sc.layer === 'court' && L.gate) {
        const g = L.gate;
        WC.garlands(ctx, g.gx - g.gw * 0.55, g.gx + g.gw * 0.55, g.gTop - u * 1.2, u * 3.2, t, u, 5);
      }
      if (sc.layer === 'farewell' && L.lamps) L.lamps.forEach(([x, y], k) => WC.flame(ctx, x * W, y * H, u * 0.9, t, k));
    }
  }
  drawPetals(ctx, t) {
    const { W, H } = this, u = W / 100;
    this.petals.forEach(p => {
      const x = p.x * W + Math.sin(t * 0.6 + p.r) * u * 5, y = ((p.y * H + t * p.sp * u * 6) % (H + u * 8)) - u * 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.r + t * p.sp * 0.8); ctx.globalAlpha = 0.7; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.ellipse(0, 0, u * 0.7 * p.s, u * 1.1 * p.s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-u * 0.15 * p.s, -u * 0.2 * p.s, u * 0.25 * p.s, u * 0.5 * p.s, 0, 0, 7); ctx.fill();
      ctx.restore();
    });
  }
  // ---------- text ----------
  names() {
    const d = this.design, lg = this.lg, c = d.couple;
    const pick = o => (lg === 'hi' ? (o?.hi || o?.en) : o?.en) || '';
    const b = pick(c.useFull ? c.brideFull : c.bride), g = pick(c.useFull ? c.groomFull : c.groom);
    const order = c.order === 'groom' ? [g, b] : [b, g];
    return { b, g, first: order[0], second: order[1], bShort: pick(c.bride), gShort: pick(c.groom), order };
  }
  T(o) { const lg = this.lg; return (lg === 'hi' ? (o?.hi || o?.en) : o?.en) || ''; }
  drawText(ctx, sc, local, fading = false, closingPass = false) {
    const { W, H, fs } = this, u = W / 100, C = this.colors(), st = this.st, lg = this.lg;
    const cx = st.align === 'left' ? W * 0.12 : W / 2, al = st.align === 'left' ? 'left' : 'center';
    const maxW = W * 0.8;
    const out = clamp01((sc.dur - local) / 0.5); // fade out at end of scene
    ctx.save(); if (!fading && sc.kind !== 'closing') ctx.globalAlpha *= out;
    const N = this.names();
    const k = sc.kind;
    if (k === 'monogram') {
      const A = (st.initials || '').split(/[&\s]+/).filter(Boolean);
      const ia = A[0] || firstGrapheme(st.monogram === 'deva' ? (this.design.couple.bride?.hi || N.bShort) : N.order[0] === N.b ? N.bShort : N.gShort).toUpperCase();
      const ib = A[1] || firstGrapheme(st.monogram === 'deva' ? (this.design.couple.groom?.hi || N.gShort) : N.order[0] === N.b ? N.gShort : N.bShort).toUpperCase();
      const order = this.design.couple.order === 'groom' && !A.length ? [ib, ia] : [ia, ib];
      monogram(ctx, fs, order[0], order[1], W / 2, H * 0.16, u * 21, st.monogram, C.gold, local);
      const nm = `${N.order[0] === N.b ? N.bShort : N.gShort}  &  ${N.order[0] === N.b ? N.gShort : N.bShort}`;
      line(ctx, fs, lg === 'hi' ? nm : nm.toUpperCase(), W / 2, H * 0.325, { role: 'capsL', size: u * 3.6, color: C.dark, alpha: rev(local, 1.5, 1), maxW, ls: 0.28, rise: (1 - rev(local, 1.5)) * u * 1.5 });
    } else if (k === 'invite') {
      let y = H * 0.075;
      const verse = this.design.wording.invocation && this.design.wording.invocation !== 'none' ? invocationText(this.design, hasDevaVerse(this.design) ? 'hi' : lg) : '';
      if (verse) {
        verse.split('\n').slice(0, 2).forEach((ln, j) => { line(ctx, fs, ln, cx, y, { role: 'deva', size: u * (verse.includes('\n') ? 3.1 : 3.6), color: C.gold, alpha: rev(local, 0.1 + j * 0.2), maxW, align: al }); y += u * 4.4; });
        y += u * 1.5;
      }
      const intro = this.T(st.intro).split('\n').filter(Boolean);
      intro.forEach((ln, j) => { line(ctx, fs, ln, cx, y + u * 2, { role: 'italic', size: u * 3.5, color: C.dark, alpha: rev(local, 0.5 + j * 0.15), maxW, align: al }); y += u * 4.3; });
      y += u * 4.5;
      line(ctx, fs, this.T(st.heading), cx, y + u * 2, { role: lg === 'hi' ? 'display' : 'display', size: u * 6, color: C.gold, alpha: rev(local, 1.2), maxW, align: al, rise: (1 - rev(local, 1.2)) * u * 2 });
      y += u * 5.5;
      const of = this.T(st.of); if (of) { line(ctx, fs, of, cx, y + u * 1.5, { role: 'italic', size: u * 3, color: C.dark, alpha: rev(local, 1.5), align: al }); y += u * 4; }
      y += u * 9;
      line(ctx, fs, N.first, cx, y, { role: 'display', size: u * 12, color: C.main, alpha: rev(local, 1.9, 1.1), maxW, align: al, rise: (1 - rev(local, 1.9)) * u * 2.5 });
      y += u * 7.5;
      divider(ctx, al === 'left' ? cx + u * 20 : cx, y, u * 34, C.gold, rev(local, 2.5, 1.2));
      y += u * 13.5;
      line(ctx, fs, N.second, cx, y, { role: 'display', size: u * 12, color: C.main, alpha: rev(local, 2.9, 1.1), maxW, align: al, rise: (1 - rev(local, 2.9)) * u * 2.5 });
      if (this.bi) { y += u * 6; line(ctx, fs, `${this.design.couple.bride?.hi || ''} संग ${this.design.couple.groom?.hi || ''}`, cx, y, { role: 'deva', size: u * 3.6, color: C.gold, alpha: rev(local, 3.3), maxW, align: al }); }
    } else if (k === 'family') {
      const f = this.design.family, pick = o => this.T(o);
      let y = H * 0.12;
      line(ctx, fs, lg === 'hi' ? 'आशीर्वाद सहित' : 'With the blessings of', cx, y, { role: 'italic', size: u * 4, color: C.dark, alpha: rev(local, 0.2), maxW, align: al }); y += u * 10;
      [[lg === 'hi' ? 'वधू पक्ष' : 'THE BRIDE’S FAMILY', pick(f.brideParents)], [lg === 'hi' ? 'वर पक्ष' : 'THE GROOM’S FAMILY', pick(f.groomParents)]].forEach(([lab, val], j) => {
        if (!val) return;
        line(ctx, fs, lab, cx, y, { role: 'caps', size: u * 3, color: C.gold, alpha: rev(local, 0.6 + j * 0.8), maxW, ls: 0.18, align: al }); y += u * 6.5;
        line(ctx, fs, val, cx, y, { role: 'display', size: u * 5, color: C.main, alpha: rev(local, 0.8 + j * 0.8), maxW, align: al }); y += u * 12;
      });
      const fam = pick(f.familyNames); if (fam) line(ctx, fs, fam, cx, y, { role: 'italic', size: u * 3.8, color: C.dark, alpha: rev(local, 2.2), maxW, align: al });
    } else if (k === 'event') {
      const list = sc.data || [];
      const e = list[0]; if (!e) { ctx.restore(); return; }
      // split into blocks of functions sharing a date & venue (merged names), up to 3 blocks per scene
      const blocks = [];
      list.forEach(x => { const lb = blocks[blocks.length - 1]; if (lb && this.st.mergeEvents && lb[0].date === x.date && (lb[0].venue || '') === (x.venue || '')) lb.push(x); else blocks.push([x]); });
      const n = Math.min(3, blocks.length), K = n === 1 ? 1 : n === 2 ? 0.9 : 0.74;
      const draw = (items, y0, base) => {
        let y = y0; const v = u * K;
        const it = items[0];
        const dp = dateParts(it.date || this.design.wedding.date, lg);
        if (dp) {
          ctx.save(); ctx.font = fontStr(fs, 'num', v * 9, dp.day); const dw = ctx.measureText(dp.day).width; ctx.font = fontStr(fs, 'capsL', v * 3.6, dp.rest); const rw = ctx.measureText(dp.rest).width; ctx.restore();
          const tot = dw + v * 1.2 + rw, x0 = al === 'left' ? cx : cx - tot / 2;
          line(ctx, fs, dp.day, x0, y, { role: 'num', size: v * 9, color: C.dark, alpha: rev(local, base), align: 'left' });
          if (dp.sup) line(ctx, fs, dp.sup, x0 + dw + v * 0.2, y - v * 5.2, { role: 'script', size: v * 5.4, color: C.dark, alpha: rev(local, base + 0.2), align: 'left' });
          line(ctx, fs, dp.rest, x0 + dw + v * 1.2, y, { role: 'capsL', size: v * 3.6, color: C.dark, alpha: rev(local, base + 0.1), align: 'left' });
          y += v * 6;
        }
        const tm = timePhrase(it.start, lg, false);
        if (tm) { line(ctx, fs, tm, cx, y, { role: 'body', size: v * 3.3, color: C.dark, alpha: rev(local, base + 0.4), align: al, maxW }); y += v * 9.5; }
        const name = items.map(x => this.T(x.name)).join(' & ');
        line(ctx, fs, lg === 'hi' ? name : name.toUpperCase(), cx, y, { role: 'capsL', size: v * 7, color: C.gold, alpha: rev(local, base + 0.7), maxW, align: al, ls: 0.04, rise: (1 - rev(local, base + 0.7)) * v * 1.5 });
        y += v * 6;
        if (st.showVenue && it.venue) { line(ctx, fs, lg === 'hi' ? it.venue : it.venue.toUpperCase(), cx, y, { role: 'capsL', size: v * 2.9, color: C.dark, alpha: rev(local, base + 1.1), maxW, align: al, ls: 0.12 }); y += v * 4.4; }
        if (st.showVenue && it.address && n < 3) { line(ctx, fs, it.address, cx, y, { role: 'italic', size: v * 2.8, color: C.dark, alpha: rev(local, base + 1.3) * 0.9, maxW, align: al }); y += v * 4; }
        if (it.dress && n < 3) { line(ctx, fs, (lg === 'hi' ? 'वेशभूषा: ' : 'Dress code: ') + it.dress, cx, y, { role: 'italic', size: v * 2.7, color: C.main, alpha: rev(local, base + 1.5) * 0.9, maxW, align: al }); y += v * 4; }
        return y;
      };
      let y = H * (n === 1 ? 0.2 : n === 2 ? 0.13 : 0.09);
      blocks.slice(0, 3).forEach((bk, j) => { y = draw(bk, y, 0.1 + j * 0.7) + u * (n === 3 ? 6 : 7); });
    } else if (k === 'main') {
      const e = (sc.data || [])[0];
      const date = e?.date || this.design.wedding.date, time = e?.start || this.design.wedding.time;
      let y = H * 0.12;
      const dp = dateParts(date, lg);
      if (dp) {
        ctx.save(); ctx.font = fontStr(fs, 'num', u * 9.5, dp.day); const dw = ctx.measureText(dp.day).width; ctx.font = fontStr(fs, 'capsL', u * 3.8, dp.rest); const rw = ctx.measureText(dp.rest).width; ctx.restore();
        const tot = dw + u * 1.2 + rw, x0 = al === 'left' ? cx : cx - tot / 2;
        line(ctx, fs, dp.day, x0, y, { role: 'num', size: u * 9.5, color: C.light, alpha: rev(local, 0.9), align: 'left', shadow: 'rgba(20,30,60,.35)' });
        if (dp.sup) line(ctx, fs, dp.sup, x0 + dw + u * 0.2, y - u * 6.6, { role: 'script', size: u * 5.4, color: C.light, alpha: rev(local, 1.1), align: 'left', shadow: 'rgba(20,30,60,.35)' });
        line(ctx, fs, dp.rest, x0 + dw + u * 1.2, y, { role: 'capsL', size: u * 3.8, color: C.light, alpha: rev(local, 1.0), align: 'left', shadow: 'rgba(20,30,60,.35)' });
        y += u * 13;
      }
      const isMain = !e || MAIN_IDS.includes(e.preset);
      const wd = (isMain ? this.T(st.mainWord) : '') || (e ? this.T(e.name).replace(/\s*ceremony/i, '') : '') || (lg === 'hi' ? 'शुभ विवाह' : 'Wedding');
      const p = clamp01((local - 1.5) / 1.6);
      ctx.save();
      const sz = u * 15;
      ctx.font = fontStr(fs, 'script', sz, wd); ctx.textAlign = al; ctx.textBaseline = 'alphabetic';
      let fsz = sz; while (ctx.measureText(wd).width > maxW && fsz > sz * 0.45) { fsz *= 0.95; ctx.font = fontStr(fs, 'script', fsz, wd); }
      const Ld = fsz * 10;
      ctx.setLineDash([Ld, Ld]); ctx.lineDashOffset = Ld * (1 - ease(p)); ctx.lineWidth = fsz * 0.03; ctx.strokeStyle = C.script; ctx.strokeText(wd, cx, y);
      ctx.setLineDash([]);
      ctx.globalAlpha *= ease((local - 2.4) / 1); ctx.fillStyle = C.script;
      ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = fsz * 0.25; ctx.fillText(wd, cx, y);
      ctx.restore();
      y += u * 8;
      line(ctx, fs, timePhrase(time, lg, true), cx, y, { role: 'caps', size: u * 3.4, color: C.light, alpha: rev(local, 3.2), maxW, align: al, ls: 0.12, shadow: 'rgba(20,30,60,.4)' });
      y += u * 5;
      const venue = e?.venue || this.design.wedding.venue;
      if (st.showVenue && venue) line(ctx, fs, venue, cx, y, { role: 'italic', size: u * 3.4, color: C.light, alpha: rev(local, 3.6), maxW, align: al, shadow: 'rgba(20,30,60,.4)' });
    } else if (k === 'bless' || k === 'closing') {
      const base = k === 'bless' ? 0.6 : -10;
      let y = H * 0.34;
      const col = k === 'closing' ? '#F3E6DA' : C.main;
      this.T(st.closing1).split('\n').filter(Boolean).forEach((ln, j) => { line(ctx, fs, ln, cx, y, { role: 'italic', size: u * 4.4, color: col, alpha: rev(local, base + j * 0.35, 1), maxW, align: al }); y += u * 5.6; });
      if (st.showClosing2) { y += u * 3; this.T(st.closing2).split('\n').filter(Boolean).forEach((ln, j) => { line(ctx, fs, ln, cx, y, { role: 'italic', size: u * 3.4, color: col, alpha: rev(local, base + 1.2 + j * 0.3) * 0.95, maxW, align: al }); y += u * 4.6; }); }
      if (st.showFamilies) { const fam = this.T(this.design.family.familyNames); if (fam) { y += u * 4; line(ctx, fs, '— ' + fam + ' —', cx, y, { role: 'capsL', size: u * 2.8, color: k === 'closing' ? '#E9D6B8' : C.gold, alpha: rev(local, base + 1.8), maxW, align: al, ls: 0.1 }); } }
      if (k === 'closing' && st.showHandle && st.handle) line(ctx, fs, st.handle, W / 2, H * 0.62, { role: 'caps', size: u * 3, color: '#F3E6DA', alpha: rev(local, 0.8), maxW, ls: 0.06 });
    }
    ctx.restore();
  }
}
function hasDevaVerse(d) { const t = invocationText(d, 'hi'); return hasDeva(t); }

export async function ensureStoryFonts(design) {
  if (!document.fonts?.load) return;
  const fs = FONT_SETS[design.story?.fonts] || FONT_SETS.classic;
  const jobs = [
    `${fs.dw} 40px "${fs.display}"`, `500 40px "${fs.display}"`, `600 40px "${fs.caps}"`, `400 40px "${fs.caps}"`, `40px "${fs.script}"`, `italic 400 40px "${fs.italic}"`,
  ].map(f => document.fonts.load(f, 'Aa&'));
  jobs.push(document.fonts.load(`40px "${fs.deva}"`, 'श्री गणेशाय नमः'), document.fonts.load(`40px "${fs.devaD}"`, 'विवाह'), document.fonts.load('400 40px "Playfair Display"', 'AB'));
  await Promise.race([Promise.allSettled(jobs), new Promise(r => setTimeout(r, 4000))]);
}
export const devaDigits = toDeva;
