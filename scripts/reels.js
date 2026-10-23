// Viral reel invitations: gallery (#/reels) and a simple 3-step editor (#/reel?id=… or ?new=<template>).
// Two engines: realistic-art reels (paintings, photos, AI clips — render/artreel.js) and
// watercolour story reels (render/story.js). Personalize → Customize → Preview & download.
import { STORY_TEMPLATES, STORY_MAP, defaultStory, ensureStoryFonts, warmLayers, mainEventOf, FONT_SETS } from './render/story.js';
import { ART_TEMPLATES, ART_MAP, artDefaults, isArtTemplate, artCredits } from './render/artreel.js';
import { ART, PROMPTS } from './data/art.js';
import { defaultDesign, makeEvent, uid } from './state.js';
import { INVOCATIONS, EVENT_PRESETS, EVENT_PICKER } from './data/culture.js';
import { TRACKS, renderTrack, decodeFile, playPreview, stopPreview } from './music.js';
import { exportBestVideo, VIDEO_FORMATS, makeTimeline, clipBlob } from './video.js';
import { storage, prefs } from './storage.js';
import { profiles, applyProfile, accountBar, handleAccountClick } from './profile.js';
import { $, $$, esc, icon, toast, confirmDialog, openModal, downloadBlob, fmtBytes, slug, debounce, reducedMotion, copyText } from './ui.js';
import { CONFIG } from './config.js';

const PW = 432, PH = 768; // preview resolution
let d = null, step = 1, tl = null, playing = false, t = 0, raf = 0, lastTs = 0, audioCache = { key: '', buf: null }, exportJob = null, lastExport = null, wired = false, buildId = 0;

export const ALL_REELS = [...ART_TEMPLATES, ...STORY_TEMPLATES];
const anyTpl = id => ART_MAP[id] || STORY_MAP[id] || ART_TEMPLATES[0];
const isArt = () => isArtTemplate(d.story.template);
const addDays = (iso, n) => { const [y, m, dd] = iso.split('-').map(Number); const dt = new Date(y, m - 1, dd + n); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; };

// ---------------- model ----------------
function sampleEvents(tplId, x) {
  const date = x.wedding.date, at = { venue: x.wedding.venue, address: x.wedding.address, maps: x.wedding.maps };
  if (tplId === 'pichwai-utsav') return [
    makeEvent('mehendi', { date: addDays(date, -2), start: '17:00', ...at }), makeEvent('sangeet', { date: addDays(date, -1), start: '19:30', ...at }), makeEvent('wedding', { date, start: '20:00', ...at })];
  if (tplId === 'ghar-ka-beta') return [makeEvent('roka', { date: addDays(date, -90), start: '19:00', venue: 'Hotel Rang Mahal', address: '' }), makeEvent('wedding', { date, start: '20:00', ...at })];
  if (tplId === 'meet-couple') return [makeEvent('wedding', { date, start: '20:00', ...at })];
  if (tplId === 'mangal-patrika' || tplId === 'shahi-lal') return [
    makeEvent('haldi', { date: addDays(date, -1), start: '10:00', venue: 'निवास स्थान', address: '' }), makeEvent('mehendi', { date: addDays(date, -1), start: '10:00', venue: 'निवास स्थान', address: '' }),
    makeEvent('wedding', { date, start: '20:00', ...at }), makeEvent('reception', { date: addDays(date, 1), start: '19:30', ...at })];
  return [
    makeEvent('haldi', { date: addDays(date, -1), start: '11:00', venue: 'At Home', address: '' }), makeEvent('mehendi', { date: addDays(date, -1), start: '11:00', venue: 'At Home', address: '' }),
    makeEvent('wedding', { date, start: '20:00', ...at })];
}
export function newStoryDesign(tplId, profileId, { sample = false } = {}) {
  const tpl = anyTpl(tplId);
  const x = defaultDesign('kashi-ghat', 'hindu-shiv');
  x.kind = 'story'; x.name = `${tpl.name} reel`;
  x.story = defaultStory(tpl.id);
  x.story.template = tpl.id;
  if (ART_MAP[tpl.id]) { x.story.art = artDefaults(tpl); x.lang = tpl.lang || 'en'; }
  x.artSlots = {};
  x.photos = { ...x.photos, bride: null, groom: null };
  x.wording.invocation = tpl.verse;
  x.video = { ...x.video, format: 'story', track: tpl.track, volume: 0.8, start: 0 };
  x.events = sampleEvents(tpl.id, x);
  if (tpl.id === 'pastel-promise') x.story.intro = { en: 'Together with their families\nwe joyfully invite you\nto celebrate the', hi: 'सपरिवार सहर्ष आमंत्रण' };
  const p = sample ? null : profileId ? profiles.get(profileId) : (profiles.autofill() ? profiles.active() : null);
  if (p) applyProfile(x, p, { events: p.events.length > 0 });
  x.story.mainEvent = mainEventOf(x)?.id || '';
  return x;
}
function migrateStory(x) {
  const base = newStoryDesign(x.story?.template || 'divine-union', null, { sample: true });
  const merge = (a, b) => { for (const k in a) { if (b[k] === undefined) b[k] = a[k]; else if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && b[k] && typeof b[k] === 'object') merge(a[k], b[k]); } return b; };
  const out = merge(base, x);
  out.events = (out.events || []).map(e => merge(makeEvent(e.preset || 'custom'), e));
  return out;
}
const tplOf = () => anyTpl(d.story.template);
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const set = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => (a[k] ??= {}), o)[last] = v; };

const save = debounce(async () => {
  if (!d) return;
  d.updatedAt = Date.now();
  try { await storage.saveDesign(d); prefs.set('last-reel', d.id); $('#reel-save').textContent = 'Saved'; } catch { $('#reel-save').textContent = 'Not saved (storage full?)'; }
}, 600);
function changed({ redraw = true, panel = false } = {}) {
  $('#reel-save').textContent = 'Saving…';
  save();
  if (panel) renderPanel(true);
  if (redraw) rebuild();
}
/** Create a timeline and make sure its fonts, paintings, photos and clips are loaded. */
export async function readyTimeline(design, W, H) {
  await ensureStoryFonts(design);
  const x = makeTimeline(design, W, H);
  if (x.ready) await x.ready(clipBlob);
  return x;
}
const posterTime = x => { const s = x.scenes.find(s => ['invite', 'patrikaCard', 'redMain', 'pichSave', 'meetTitle', 'bhaiIntro', 'scrollInvite'].includes(s.kind)) || x.scenes[Math.min(2, x.scenes.length - 1)]; return s.start + s.dur * 0.82; };

// ---------------- gallery ----------------
export function renderReelGallery(params = {}) {
  const card = tp => `<article class="rt-card">
    <div class="rt-media"><canvas width="216" height="384" data-rt="${tp.id}" aria-label="${esc(tp.name)} preview" role="img"></canvas><span class="rt-tag">${esc(tp.tag)}</span>
      <button class="rt-play" type="button" data-rt-play="${tp.id}" aria-label="Play ${esc(tp.name)} preview">${icon('play')}</button></div>
    <div class="rt-body"><h3>${esc(tp.name)}</h3><p class="rt-sub">${esc(tp.sub)} · ${esc(tp.deity)}</p><p class="rt-desc">${esc(tp.desc)}</p>
      <div class="inline"><a class="btn btn-maroon btn-sm" href="#/reel?new=${tp.id}${params.profile ? '&profile=' + params.profile : ''}">${icon('edit')}Use this template</a><button class="btn btn-text btn-sm" type="button" data-rt-play="${tp.id}">${icon('eye')}Preview</button></div></div>
  </article>`;
  $('#reel-tpls').innerHTML = `<h3 class="rt-group">Realistic &amp; trending <span class="badge">New</span></h3><p class="muted rt-group-sub">Real paintings by Raja Ravi Varma, your own photos, or AI artwork you make and upload.</p>
    <div class="rt-grid">${ART_TEMPLATES.map(card).join('')}</div>
    <h3 class="rt-group">Watercolour stories</h3><p class="muted rt-group-sub">Hand-painted style, 8 scenes, about 34 seconds.</p>
    <div class="rt-grid">${STORY_TEMPLATES.map(card).join('')}</div>`;
  drawThumbs();
}
let thumbJob = 0;
async function drawThumbs() {
  const job = ++thumbJob;
  for (const c of $$('[data-rt]')) {
    await new Promise(r => setTimeout(r, 20));
    if (job !== thumbJob || !c.isConnected) return;
    const x = newStoryDesign(c.dataset.rt, null, { sample: true });
    const tl2 = await readyTimeline(x, c.width, c.height);
    tl2.draw(c.getContext('2d'), posterTime(tl2));
  }
}
let modalRaf = 0;
async function previewModal(id) {
  const tp = anyTpl(id);
  openModal(`${tp.name} — preview`, `<div class="rt-modal"><canvas id="rt-modal-c" width="324" height="576" aria-label="Animated preview"></canvas>
    <p class="muted">${esc(tp.desc)} Sample names are fictional.</p>
    <div class="inline"><a class="btn btn-maroon" href="#/reel?new=${tp.id}">${icon('edit')}Use this template</a></div></div>`, { onClose: () => cancelAnimationFrame(modalRaf) });
  const c = $('#rt-modal-c'), ctx = c.getContext('2d');
  const tl2 = await readyTimeline(newStoryDesign(id, null, { sample: true }), c.width, c.height);
  const t0 = performance.now();
  const loop = now => { if (!c.isConnected) return; tl2.draw(ctx, ((now - t0) / 1000) % tl2.total); modalRaf = requestAnimationFrame(loop); };
  if (reducedMotion()) tl2.draw(ctx, posterTime(tl2)); else modalRaf = requestAnimationFrame(loop);
}

// ---------------- editor ----------------
export async function openReelEditor(params = {}) {
  initEditor();
  stop();
  if (params.id) {
    const found = await storage.getDesign(params.id);
    if (!found || found.kind !== 'story') { toast('That reel was not found on this device.', 'err'); location.hash = '#/reels'; return; }
    d = migrateStory(found);
  } else if (params.new) {
    d = newStoryDesign(params.new, params.profile);
    await storage.saveDesign(d); prefs.set('last-reel', d.id);
    history.replaceState(null, '', `#/reel?id=${d.id}`);
  } else if (!d) {
    const last = prefs.get('last-reel'); const found = last ? await storage.getDesign(last) : null;
    if (found?.kind === 'story') d = migrateStory(found); else { location.hash = '#/reels'; return; }
  }
  step = params.step ? Math.max(1, Math.min(3, +params.step)) : 1;
  lastExport = null; audioCache = { key: '', buf: null }; t = 0;
  $('#reel-name').value = d.name;
  $('#reel-save').textContent = 'Saved on this device';
  renderPanel();
  await rebuild();
}
export function leaveReelEditor() { stop(); exportJob && (exportJob.cancelled = true); }

const rebuild = debounce(async () => {
  const id = ++buildId;
  const note = $('#reel-note'); note.textContent = 'Preparing artwork…';
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const x = await readyTimeline(d, PW, PH);
  if (id !== buildId) return;
  tl?.stopClips?.();
  tl = x;
  if (t > tl.total) t = 0;
  await drawAt(t || posterTime(tl));
  renderScenes();
  note.textContent = `${tl.scenes.length} scenes · about ${Math.round(tl.total)} seconds · 9:16`;
}, 120);
async function drawAt(time, live = false) {
  t = time;
  if (!tl) return;
  if (!live && tl.prepare) await tl.prepare(time);
  const c = $('#reel-canvas'); tl.draw(c.getContext('2d'), time);
  const r = $('#reel-scrub'); if (r) { r.max = tl.total.toFixed(2); r.value = time.toFixed(2); }
  const lab = $('#reel-time'); if (lab) lab.textContent = `${fmtS(time)} / ${fmtS(tl.total)}`;
  const i = tl.sceneAt(time); $$('#reel-scenes [data-scene]').forEach(b => b.setAttribute('aria-current', +b.dataset.scene === i ? 'true' : 'false'));
}
const fmtS = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const SCENE_NAMES = {
  open: 'Opening', monogram: 'Monogram', reveal: 'Divine setting', invite: 'Invitation', family: 'Families', main: 'Wedding', bless: 'Blessings', closing: 'Closing',
  patrikaOpen: 'Kailash', patrikaVerse: 'Ganesh blessing', patrikaCard: 'Patrika', patrikaSwastik: 'Swastik', patrikaFamily: 'Families', patrikaClose: 'Closing',
  scrollJourney: 'Journey', divineReveal: 'Shiv & Parvati', scrollInvite: 'Scroll', divineBless: 'Blessings', scrollClose: 'Closing',
  doorsOpen: 'Doors', deityFrame: 'Ganesh', redMain: 'Shubh Vivah', redLists: 'Family list', redClose: 'Closing',
  velvetOpen: 'Opening', pichSave: 'Save the date', pichNames: 'Names', pichDates: 'Dates', velvetMonogram: 'Monogram',
  meetTitle: 'Meet the couple', meetBride: 'Bride', meetGroom: 'Groom', meetDate: 'Date',
  bhaiIntro: 'Groom intro', beti: 'Bride intro', opposites: 'Together', rokaDate: 'Save the date', tulipsEnd: 'Ending',
};
function renderScenes() {
  $('#reel-scenes').innerHTML = tl.scenes.map((s, i) => {
    const evs = Array.isArray(s.data) && s.data[0]?.name ? s.data.map(e => e.name.en || e.name.hi).join(' & ') : '';
    const lab = evs || (s.kind === 'redLists' ? (s.data?.title?.hi || s.data?.title?.en || 'List') : SCENE_NAMES[s.kind] || s.kind);
    return `<button type="button" class="chip" data-scene="${i}" aria-current="false">${i + 1}. ${esc(lab)}</button>`;
  }).join('');
}

async function musicBuffer() {
  const tr = d.video.track;
  if (!tr || tr === 'none') return null;
  const key = `${tr}|${Math.ceil(tl.total)}|${d.video.audioName || ''}`;
  if (audioCache.key === key) return audioCache.buf;
  let buf = null;
  if (tr === 'upload') { const blob = await storage.getAudio(d.id); buf = blob ? await decodeFile(blob) : null; }
  else buf = await renderTrack(tr, Math.ceil(tl.total) + 2);
  audioCache = { key, buf };
  return buf;
}
async function play() {
  if (playing) return stop();
  if (!tl) return;
  playing = true; updatePlayBtn();
  if (t >= tl.total - 0.1) t = 0;
  try { const buf = await musicBuffer(); if (buf && playing) playPreview(buf, { volume: d.video.volume ?? 0.8, start: (d.video.track === 'upload' ? d.video.start || 0 : 0) + t }); } catch (e) { toast(e.message || 'Music could not play.', 'err'); }
  lastTs = performance.now();
  const loop = now => {
    if (!playing) return;
    t += (now - lastTs) / 1000; lastTs = now;
    if (t >= tl.total) { drawAt(tl.total - 0.01); stop(); return; }
    tl.liveSync?.(t);
    drawAt(t, true); raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function stop() { playing = false; cancelAnimationFrame(raf); stopPreview(); tl?.stopClips?.(); updatePlayBtn(); }
function updatePlayBtn() { const b = $('#reel-play'); if (b) b.innerHTML = playing ? `${icon('pause')}Pause` : `${icon('play')}Play`; }

// ---------------- panel ----------------
const STEPS = ['Personalize', 'Customize', 'Preview & download'];
const inp = (label, path, { type = 'text', lang = '', ph = '', full = false, hint = '' } = {}) => {
  const v = get(d, path) ?? '';
  const id = 'r-' + path.replace(/[.:]/g, '-');
  return `<div class="field ${full ? 'full' : ''}"><span><label for="${id}">${esc(label)}</label>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span>${type === 'textarea' ? `<textarea id="${id}" rows="3" data-rb="${path}" ${lang ? `lang="${lang}"` : ''} placeholder="${esc(ph)}">${esc(v)}</textarea>` : `<input id="${id}" type="${type}" data-rb="${path}" value="${esc(v)}" ${lang ? `lang="${lang}"` : ''} placeholder="${esc(ph)}">`}</div>`;
};
const sel = (label, path, opts, { full = false, hint = '' } = {}) => {
  const v = String(get(d, path) ?? ''); const id = 'r-' + path.replace(/\./g, '-');
  return `<div class="field ${full ? 'full' : ''}"><span><label for="${id}">${esc(label)}</label>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span><select id="${id}" data-rb="${path}">${opts.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>`;
};
const chk = (label, path) => `<label class="check"><input type="checkbox" data-rb="${path}" ${get(d, path) ? 'checked' : ''}> ${esc(label)}</label>`;
const showHi = () => d.lang !== 'en';
const lk = () => (d.lang === 'hi' ? 'hi' : 'en');

function issues() {
  const out = [];
  if (!d.couple.bride.en && !d.couple.bride.hi) out.push('Add the bride’s name');
  if (!d.couple.groom.en && !d.couple.groom.hi) out.push('Add the groom’s name');
  if (d.lang === 'hi' && (!d.couple.bride.hi || !d.couple.groom.hi)) out.push('Add the names in Hindi / Marathi (the reel is in Devanagari)');
  const m = mainEventOf(d);
  if (!m) out.push('Add the main wedding ceremony');
  (d.events || []).forEach(e => {
    const n = e.name.en || e.name.hi || 'A function';
    if (!e.name.en && !e.name.hi) out.push('A function has no name');
    if (!e.date) out.push(`${n}: add a date`);
    if (!e.start) out.push(`${n}: add a time`);
    if (e.date && new Date(e.date + 'T23:59') < new Date()) out.push(`${n}: the date is in the past. Please check it`);
  });
  const tp = tplOf();
  if (tp.photos) (tp.slots || []).filter(s => s.photo).forEach(s => { if (!d.photos?.[s.photo]?.src) out.push(`${s.label}: add a photo (a sample figure is shown until you do)`); });
  if ((d.couple.bride.en || '').length > 18 || (d.couple.groom.en || '').length > 18) out.push('Long names are shrunk to fit. Consider short names for the reel');
  return out;
}

function eventCard(e, i) {
  const n = d.events.length, isMain = (mainEventOf(d)?.id === e.id);
  return `<div class="ev-card r-ev ${isMain ? 'is-main' : ''}">
    <div class="ev-head"><strong>${esc(e.name.en || e.name.hi || 'Untitled function')}</strong>${isMain ? '<span class="badge">Main ceremony</span>' : ''}
      <span class="ev-tools">
        <button type="button" class="icon-btn" data-ra="ev-up" data-i="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
        <button type="button" class="icon-btn" data-ra="ev-down" data-i="${i}" aria-label="Move down" ${i === n - 1 ? 'disabled' : ''}>${icon('down')}</button>
        <button type="button" class="icon-btn danger" data-ra="ev-del" data-i="${i}" aria-label="Remove">${icon('trash')}</button></span></div>
    <div class="fgrid">
      ${inp('Function name', `events.${i}.name.en`, { ph: 'Haldi' })}
      ${showHi() ? inp('Name in Hindi / Marathi', `events.${i}.name.hi`, { lang: 'hi', ph: 'हल्दी' }) : ''}
      ${inp('Date', `events.${i}.date`, { type: 'date' })}
      ${inp('Time', `events.${i}.start`, { type: 'time' })}
      ${inp('Venue', `events.${i}.venue`, { ph: 'At Home', full: true })}
      ${inp('Address (optional)', `events.${i}.address`, { full: true })}
      ${inp('Tithi / paksha / month (optional)', `events.${i}.tithi`, { full: true, ph: 'e.g. मार्गशीर्ष शुक्ल पंचमी', hint: 'type it from your panchang' })}
      ${inp('Google Maps link (optional)', `events.${i}.maps`, { type: 'url', full: true, hint: 'used on your wedding website' })}
      ${inp('Dress code (optional)', `events.${i}.dress`, { full: true })}
      ${inp('Description (optional)', `events.${i}.msg.en`, { full: true, hint: 'for cards & website' })}
    </div>
    <label class="check"><input type="radio" name="r-main" data-ra="main" value="${e.id}" ${isMain ? 'checked' : ''}> This is the main wedding ceremony</label>
  </div>`;
}

function verseOptions() {
  const groups = {};
  INVOCATIONS.forEach(v => { if (v.id === 'custom') return; (groups[v.group] ||= []).push(v); });
  const cur = d.wording.invocation;
  return `<div class="field full"><span><label for="r-verse">Blessing / mantra / chaupai</label><span class="hint">optional</span></span><select id="r-verse" data-rb="wording.invocation">${Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(v => `<option value="${v.id}" ${v.id === cur ? 'selected' : ''}>${esc(v.id === 'none' ? 'No verse or mantra' : v.label)}</option>`).join('')}</optgroup>`).join('')}</select>
  ${(() => { const v = INVOCATIONS.find(x => x.id === cur); return v?.meaning ? `<small class="muted">${esc(v.translit ? v.translit.split('\n')[0] + ' — ' : '')}${esc(v.meaning)}</small>` : ''; })()}</div>`;
}

// ---- artwork & photo slots ----
const slotKey = s => `${d.story.template}:${s.id}`;
function slotThumb(s) {
  const user = d.artSlots?.[slotKey(s)];
  if (user?.kind === 'video') return `<div class="slot-thumb is-video">${icon('film')}<small>${esc(user.name || 'Video clip')}</small></div>`;
  if (user?.src) return `<div class="slot-thumb" style="background-image:url('${user.src}')"></div>`;
  if (s.photo && d.photos?.[s.photo]?.src) return `<div class="slot-thumb" style="background-image:url('${d.photos[s.photo].src}')"></div>`;
  if (s.def && ART[s.def]) return `<div class="slot-thumb" style="background-image:url('${ART[s.def].file}')"></div>`;
  return `<div class="slot-thumb is-empty">${icon('image')}</div>`;
}
function slotsFieldset() {
  const tp = tplOf(); if (!tp.slots?.length) return '';
  return `<fieldset class="fieldset"><legend>${tp.photos ? 'Your photos' : 'Artwork & photos'}</legend>
    <p class="muted">${tp.photos ? 'Upload clear photos. For the cut-out sticker look, use PNG files with the background removed.' : 'Each scene starts with a public-domain painting by Raja Ravi Varma. You can replace any scene with your own picture, or with an AI image or video clip you made and have the right to use.'}</p>
    ${tp.slots.map(s => {
      const user = d.artSlots?.[slotKey(s)] || (s.photo && d.photos?.[s.photo]?.src);
      const a = s.def && ART[s.def];
      const pr = PROMPTS[s.prompt];
      return `<div class="slot-row">${slotThumb(s)}<div class="slot-meta"><strong>${esc(s.label)}</strong>
        <small class="muted">${user ? 'Your upload' : a ? `${esc(a.title)}, ${esc(a.artist)} (${esc(a.license)})` : 'Sample figure until you add a photo'}</small>
        <div class="inline">
          <label class="btn btn-outline btn-sm file-btn">${icon('upload')}${s.photo ? 'Photo' : 'Image or video'}<input type="file" hidden data-slot="${s.id}" accept="${s.photo ? 'image/*' : 'image/*,video/mp4,video/webm,video/quicktime'}"></label>
          ${user ? `<button type="button" class="btn btn-text btn-sm" data-ra="slot-clear" data-slot="${s.id}">Remove</button>` : ''}
          ${pr && !s.photo ? `<button type="button" class="btn btn-text btn-sm" data-ra="prompt" data-prompt="${s.prompt}">${icon('copy')}AI prompt</button>` : ''}
          ${(s.alt || []).map(k => `<button type="button" class="btn btn-text btn-sm" data-ra="prompt" data-prompt="${k}">${icon('copy')}${esc(k.replace(/-/g, ' '))}</button>`).join('')}
        </div></div></div>`;
    }).join('')}
    ${tp.photos ? '' : `<p class="note" style="margin-top:8px">${icon('info')}<span>For photorealistic gods like the viral AI reels, copy a prompt into an AI image or video tool (for example Google Gemini, Meta AI, Microsoft Designer or Kling), check the result is respectful and that you may use it, then upload it here. Short MP4 clips play inside the scene and are exported frame by frame.</span></p>`}
  </fieldset>`;
}
function artCopyFieldset() {
  const tp = tplOf(); if (!ART_MAP[tp.id]) return '';
  const L = lk(), hl = L === 'hi' ? 'hi' : '';
  const label = k => ({ open: 'Opening line', blessIntro: 'Blessing line', shubh: 'Centre word', close: 'Closing line', divine: 'Blessing line', invite: 'Invitation line', banner: 'Banner', date: 'Label: date', day: 'Label: day', time: 'Label: time', venue: 'Label: venue', save: 'Save the date', for: 'For the … of', follow: 'Footer', meet: 'Title', couple: 'Subtitle', meetG1: 'Small title', meetG2: 'Groom title', meetB2: 'Bride title', t1: 'Line 1', t2: 'Line 2', t3: 'Line 3' }[k] || k);
  return `<fieldset class="fieldset"><legend>Wording</legend><div class="fgrid">
    ${Object.keys(tp.copy).map(k => inp(label(k), `story.art.copy.${k}.${L}`, { lang: hl, full: k.length > 2 && !['date', 'day', 'time', 'venue'].includes(k) })).join('')}
    </div></fieldset>`;
}
function artPersonalFieldsets() {
  const tp = tplOf(); if (!ART_MAP[tp.id]) return '';
  const L = lk(), hl = L === 'hi' ? 'hi' : '';
  let html = '';
  if (['mangal-patrika', 'shahi-lal'].includes(tp.id)) {
    html += `<fieldset class="fieldset"><legend>Patrika details</legend><div class="fgrid">
      ${inp('Bride’s honorific', `story.art.honor.bride.${L}`, { lang: hl, ph: L === 'hi' ? 'चि. सौ. कां.' : 'optional' })}
      ${inp('Groom’s honorific', `story.art.honor.groom.${L}`, { lang: hl, ph: L === 'hi' ? 'चि.' : 'optional' })}
      ${tp.id === 'mangal-patrika' ? inp('Blessings at the top (one per line)', `story.art.blessings.${L}`, { type: 'textarea', full: true, lang: hl }) : ''}
    </div></fieldset>`;
    html += `<fieldset class="fieldset"><legend>Family lists</legend><p class="muted">For example दर्शनाभिलाषी, स्वागतोत्सुक or “With best compliments”. One name per line.</p>
      ${(d.story.art.lists || []).map((l, i) => `<div class="r-ev"><div class="fgrid">${inp('Title', `story.art.lists.${i}.title.${L}`, { lang: hl, full: true })}${inp('Names', `story.art.lists.${i}.names.${L}`, { type: 'textarea', lang: hl, full: true })}</div><button type="button" class="btn btn-text btn-sm danger" data-ra="list-del" data-i="${i}">Remove list</button></div>`).join('')}
      <button type="button" class="btn btn-outline btn-sm" data-ra="list-add">${icon('plus')}Add a list</button></fieldset>`;
  }
  if (['meet-couple', 'ghar-ka-beta'].includes(tp.id)) {
    html += `<fieldset class="fieldset"><legend>Fun tags</legend><div class="fgrid">
      ${inp('Groom’s tags (comma separated)', 'story.art.traits.groom', { full: true, ph: 'Shy, Introvert, Comedian' })}
      ${inp('Bride’s tags (comma separated)', 'story.art.traits.bride', { full: true, ph: 'Desi Diva, Chai Lover' })}
      ${inp('Hashtag', 'couple.hashtag', { full: true })}
    </div></fieldset>`;
  }
  return html;
}

function renderPanel(keepScroll = false) {
  const p = $('#reel-panel'); const sc = p.scrollTop;
  const tp = tplOf(), art = isArt();
  $('#reel-stepper').innerHTML = STEPS.map((s, i) => `<button type="button" data-rstep="${i + 1}" ${step === i + 1 ? 'aria-current="step"' : ''}><span class="num">${i + 1}</span>${s}</button>`).join('');
  let html = '';
  if (step === 1) {
    html = `<h2>Personalize</h2><p class="lead">Names, families and functions. Every scene updates as you type.</p>
    ${accountBar()}
    <fieldset class="fieldset"><legend>Couple</legend><div class="fgrid">
      ${inp('Bride’s name', 'couple.bride.en', { ph: 'Mansi' })}${inp('Groom’s name', 'couple.groom.en', { ph: 'Naveen' })}
      ${showHi() ? inp('Bride’s name (Hindi / Marathi)', 'couple.bride.hi', { lang: 'hi', ph: 'मानसी' }) + inp('Groom’s name (Hindi / Marathi)', 'couple.groom.hi', { lang: 'hi', ph: 'नवीन' }) : ''}
      ${inp('Bride’s full name', 'couple.brideFull.en', { hint: 'optional' })}${inp('Groom’s full name', 'couple.groomFull.en', { hint: 'optional' })}
      <div class="field full">${chk('Use full names on the invitation', 'couple.useFull')}</div>
      ${sel('Name order', 'couple.order', [['bride', 'Bride first'], ['groom', 'Groom first']])}
      ${art ? '' : inp('Initials for the monogram', 'story.initials', { ph: 'auto, e.g. M & N', hint: 'leave empty for auto' })}
    </div></fieldset>
    ${tp.photos ? slotsFieldset() : ''}
    <fieldset class="fieldset"><legend>Families</legend><div class="fgrid">
      ${inp('Bride’s parents', 'family.brideParents.en', { full: true })}${showHi() ? inp('Bride’s parents (Hindi / Marathi)', 'family.brideParents.hi', { lang: 'hi', full: true }) : ''}
      ${inp('Groom’s parents', 'family.groomParents.en', { full: true })}${showHi() ? inp('Groom’s parents (Hindi / Marathi)', 'family.groomParents.hi', { lang: 'hi', full: true }) : ''}
      ${inp('Family names', 'family.familyNames.en', { full: true, ph: 'The Sharma & Kapoor families' })}${showHi() ? inp('Family names (Hindi / Marathi)', 'family.familyNames.hi', { lang: 'hi', full: true }) : ''}
      ${art ? '' : `<div class="field full">${chk('Show family names at the end', 'story.showFamilies')}</div>`}
    </div></fieldset>
    ${artPersonalFieldsets()}
    <fieldset class="fieldset"><legend>Functions</legend>
      <p class="muted">Functions on the same day and venue are combined (for example “Haldi &amp; Mehendi”). Tithis are shown exactly as you type them. They are never calculated for you.</p>
      ${d.events.map(eventCard).join('')}
      <div class="inline"><label class="sr" for="r-add">Function to add</label><select id="r-add">${EVENT_PICKER.map(id => `<option value="${id}">${esc(EVENT_PRESETS[id].name.en)} · ${esc(EVENT_PRESETS[id].name.hi)}</option>`).join('')}</select><button type="button" class="btn btn-outline btn-sm" data-ra="add-ev">${icon('plus')}Add function</button></div>
      ${art ? '' : `<div style="margin-top:8px">${chk('Combine functions on the same day & venue', 'story.mergeEvents')}${chk('Show venue and address lines', 'story.showVenue')}</div>`}
    </fieldset>`;
  } else if (step === 2) {
    const pick = list => list.map(x => `<button type="button" class="rt-mini" data-ra="tpl" data-tpl="${x.id}" aria-pressed="${x.id === tp.id}"><strong>${esc(x.name)}</strong><small>${esc(x.deity)}</small></button>`).join('');
    html = `<h2>Customize</h2><p class="lead">Choose the story, artwork, words and music. Presets are ready, so change only what you like.</p>
    <fieldset class="fieldset"><legend>Template</legend><p class="muted" style="margin:0 0 6px">Realistic &amp; trending</p><div class="rt-pick">${pick(ART_TEMPLATES)}</div><p class="muted" style="margin:12px 0 6px">Watercolour stories</p><div class="rt-pick">${pick(STORY_TEMPLATES)}</div></fieldset>
    ${tp.photos ? '' : slotsFieldset()}
    <fieldset class="fieldset"><legend>Language & verse</legend><div class="fgrid">
      ${sel('Language', 'lang', [['en', 'English'], ['hi', 'हिन्दी / मराठी (Devanagari)'], ['bi', 'English + हिन्दी names']], { full: true })}
      ${verseOptions()}
    </div><p class="muted" style="margin-top:6px">Religious text is optional. Choose “No verse or mantra” for a non-religious reel.</p></fieldset>
    ${art ? artCopyFieldset() : `<fieldset class="fieldset"><legend>Wording</legend><div class="fgrid">
      ${inp('Invitation message', `story.intro.${lk()}`, { type: 'textarea', full: true, lang: lk() === 'hi' ? 'hi' : '' })}
      ${inp('Heading', `story.heading.${lk()}`, { lang: lk() === 'hi' ? 'hi' : '' })}
      ${inp('Main scene title', `story.mainWord.${lk()}`, { lang: lk() === 'hi' ? 'hi' : '', ph: 'Wedding' })}
      ${inp('Closing message', `story.closing1.${lk()}`, { type: 'textarea', full: true, lang: lk() === 'hi' ? 'hi' : '' })}
      <div class="field full">${chk('Add a second closing line', 'story.showClosing2')}</div>
      ${d.story.showClosing2 ? inp('Second line', `story.closing2.${lk()}`, { type: 'textarea', full: true, lang: lk() === 'hi' ? 'hi' : '' }) : ''}
    </div></fieldset>
    <fieldset class="fieldset"><legend>Look</legend><div class="fgrid">
      ${sel('Deities', 'story.deity', [['painting', 'Realistic paintings (Raja Ravi Varma)'], ['figures', 'Watercolour figures & symbols']], { full: true })}
      ${sel('Monogram', 'story.monogram', [['serif', 'Classic serif'], ['script', 'Calligraphy script'], ['royal', 'Royal'], ['framed', 'In a gold circle'], ['deva', 'Hindi initials']])}
      ${sel('Fonts', 'story.fonts', Object.entries(FONT_SETS).map(([k, f]) => [k, f.label]))}
      ${sel('Accent colour', 'story.accent', [['auto', 'Template default'], ['gold', 'Antique gold'], ['terracotta', 'Terracotta'], ['rose', 'Dusty rose'], ['neutral', 'Neutral brown']])}
      ${sel('Background', 'story.bg', [['auto', 'As painted'], ['parchment', 'Warm parchment'], ['blue', 'Blue watercolour']])}
      ${sel('Text alignment', 'story.align', [['center', 'Centred'], ['left', 'Left']])}
      ${sel('Illustration side', 'story.placement', [['left', 'Left'], ['right', 'Right']])}
      ${sel('Petals', 'story.petals', [['gentle', 'Gentle'], ['more', 'More petals'], ['none', 'None']])}
      <div class="field range"><label for="r-int" class="label">Watercolour intensity</label><output>${Math.round(d.story.intensity * 100)}%</output><input id="r-int" type="range" min="0.6" max="1.4" step="0.1" value="${d.story.intensity}" data-rb="story.intensity" data-num="1"></div>
    </div></fieldset>`}
    <fieldset class="fieldset"><legend>Music</legend>
      <div class="track-grid">${TRACKS.map(x => `<label class="radio-card track"><input type="radio" name="r-track" value="${x.id}" data-rb="video.track" ${d.video.track === x.id ? 'checked' : ''}><strong>${esc(x.name)}${x.id === 'upload' && d.video.audioName ? `<br><span class="muted">${esc(d.video.audioName)}</span>` : ''}</strong>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</label>`).join('')}</div>
      ${d.video.track === 'upload' ? `<div class="inline" style="margin-top:12px"><label class="btn btn-maroon btn-sm file-btn">${icon('upload')}${d.video.audioName ? 'Choose a different song' : 'Choose a song file'}<input type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg" hidden id="r-audio"></label><span class="muted">Up to ${CONFIG.maxAudioMB} MB. Stays on your device.</span></div>
        <div class="field range" style="margin-top:10px"><label for="r-start" class="label">Start the song from (seconds)</label><output>${d.video.start || 0}s</output><input id="r-start" type="range" min="0" max="240" step="1" value="${d.video.start || 0}" data-rb="video.start" data-num="1"></div>` : ''}
      ${d.video.track !== 'none' ? `<div class="field range" style="margin-top:10px"><label for="r-vol" class="label">Volume</label><output>${Math.round((d.video.volume ?? 0.8) * 100)}%</output><input id="r-vol" type="range" min="0.1" max="1" step="0.05" value="${d.video.volume ?? 0.8}" data-rb="video.volume" data-num="1"></div>` : ''}
      <p class="note" style="margin-top:12px">${icon('info')}<span>Music fades in and out automatically. Built-in tracks are original and free to use. YouTube and Spotify songs cannot be put inside a video file (their terms don't allow it). Upload a song file you have the right to use instead. Instagram may mute recognised copyrighted songs.</span></p>
    </fieldset>
    <fieldset class="fieldset"><legend>Length & ending</legend><div class="fgrid">
      ${sel('Length', 'story.length', [['standard', 'Standard'], ['extended', 'Extended (slower, about 20% longer)']], { full: true })}
      ${art ? '' : sel('Final screen', 'story.endScreen', [['black', 'Fade to black'], ['ivory', 'Fade to ivory']])}
      ${art ? '' : `<div class="field">${chk('Show a name or handle at the end', 'story.showHandle')}</div>`}
      ${!art && d.story.showHandle ? inp('Name or handle', 'story.handle', { ph: '#MansiWedsNaveen', full: true }) : ''}
    </div></fieldset>
    <div class="inline"><button type="button" class="btn btn-text btn-sm" data-ra="reset">Reset to template defaults</button></div>`;
  } else {
    const is = issues();
    const credits = creditLines();
    html = `<h2>Preview &amp; download</h2><p class="lead">Watch the whole reel, check spellings and dates, then create your MP4.</p>
    <fieldset class="fieldset"><legend>Final check</legend>
      ${is.length ? `<ul class="r-issues">${is.map(m => `<li>${icon('info')}<span>${esc(m)}</span><button type="button" class="btn btn-text btn-sm" data-rstep="1">Fix</button></li>`).join('')}</ul>` : `<p class="ok-line">${icon('check')}Everything needed is filled in.</p>`}
      <dl class="r-review">
        <dt>Couple</dt><dd>${esc(d.couple.bride.en || d.couple.bride.hi)} &amp; ${esc(d.couple.groom.en || d.couple.groom.hi)}</dd>
        ${d.events.map(e => `<dt>${esc(e.name.en || e.name.hi)}</dt><dd>${esc(e.date ? new Date(e.date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'no date')}${e.start ? ' · ' + esc(e.start) : ''}${e.venue ? ' · ' + esc(e.venue) : ''}${e.tithi ? ' · ' + esc(e.tithi) : ''}</dd>`).join('')}
        <dt>Music</dt><dd>${esc(TRACKS.find(x => x.id === d.video.track)?.name || '')}</dd>
      </dl></fieldset>
    <fieldset class="fieldset"><legend>Download</legend>
      ${sel('Quality', 'video.format', [['story', 'Full HD 1080 × 1920 (recommended)'], ['story4k', '4K 2160 × 3840 (slower, large file)']], { full: true })}
      <div class="inline" style="margin-top:10px"><button type="button" class="btn btn-gold btn-lg" data-ra="export" ${window.VideoEncoder || window.MediaRecorder ? '' : 'disabled'}>${icon('film')}Create MP4 video</button>
      <button type="button" class="btn btn-outline" data-ra="poster">${icon('image')}Download poster (PNG)</button></div>
      <div id="r-export"></div>
      <p class="muted" style="margin-top:10px">The video is made on your device. Nothing is uploaded. Chrome, Edge and Safari make a real MP4 (H.264) quickly. Firefox records a WebM in real time.</p>
    </fieldset>
    ${credits.length ? `<fieldset class="fieldset"><legend>Artwork credits</legend><ul class="credits">${credits.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      <button type="button" class="btn btn-outline btn-sm" data-ra="copy-credits">${icon('copy')}Copy credits for your post caption</button>
      <p class="muted" style="margin-top:6px">Paintings by Raja Ravi Varma are in the public domain. Wellcome Collection scans are CC BY 4.0, which asks you to credit them. A small credit is also shown at the end of the video.</p></fieldset>` : ''}`;
  }
  html += `<div class="panel-foot">${step > 1 ? `<button type="button" class="btn btn-outline" data-rstep="${step - 1}">${icon('left')}Back</button>` : '<span></span>'}${step < 3 ? `<button type="button" class="btn btn-maroon" data-rstep="${step + 1}">Next: ${STEPS[step]}${icon('right')}</button>` : `<a class="btn btn-text" href="#/designs">My Designs</a>`}</div>`;
  p.innerHTML = `<div class="panel-content">${html}</div>`;
  if (keepScroll) p.scrollTop = sc; else p.scrollTop = 0;
  if (lastExport && step === 3) showExportResult(lastExport);
}
function creditLines() {
  const list = isArt() ? artCredits(d) : (d.story.deity !== 'figures' ? ({ 'divine-union': ['shiva-parvati-nandi'], 'vrindavan-prem': ['krishna-radha'], 'siya-ram-vivah': ['ram-darbar'], 'rajwada-royal': ['gajalakshmi'] }[d.story.template] || []).map(id => ART[id]) : []);
  return list.map(a => `“${a.title}”, ${a.artist}. ${a.license}. Via Wikimedia Commons.`);
}

// ---------------- export ----------------
async function doExport(btn) {
  if (exportJob) return;
  stop();
  const box = $('#r-export');
  const job = exportJob = { cancelled: false };
  box.innerHTML = `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div><p class="muted" id="r-prog">Preparing the artwork and music…</p><button type="button" class="btn btn-text btn-sm" data-ra="cancel">Cancel</button>`;
  btn.disabled = true;
  try {
    const fmt = VIDEO_FORMATS[d.video.format] || VIDEO_FORMATS.story;
    const design = structuredClone(d);
    await ensureStoryFonts(design);
    await new Promise(r => setTimeout(r, 30));
    if (!isArtTemplate(design.story.template)) warmLayers(design, fmt.w, fmt.h);
    const probe = makeTimeline(design, 10, 10);
    let audio = null;
    if (design.video.track !== 'none') {
      try { audio = design.video.track === 'upload' ? (await storage.getAudio(design.id).then(b => b && decodeFile(b))) : await renderTrack(design.video.track, Math.ceil(probe.total) + 2); } catch (e) { toast('Music could not be prepared. Exporting without music.', 'err'); }
    }
    const r = await exportBestVideo(design, { audio, signal: job, onProgress: p => { const s = box.querySelector('.progress span'); if (s) { s.style.width = (p * 100).toFixed(0) + '%'; box.querySelector('.progress').setAttribute('aria-valuenow', Math.round(p * 100)); } const l = $('#r-prog'); if (l) l.textContent = `Creating video… ${Math.round(p * 100)}%`; } });
    if (!r || job.cancelled) { box.innerHTML = '<p class="muted">Cancelled.</p>'; return; }
    if (!r.blob?.size || r.blob.size < 20000) throw new Error('the finished file was empty');
    r.name = `${slug(`${design.couple.bride.en || 'bride'}-${design.couple.groom.en || 'groom'}-${tplOf().id}`)}.${r.ext}`;
    lastExport = r;
    showExportResult(r);
    downloadBlob(r.blob, r.name);
    toast('Your video is ready.', 'ok');
  } catch (e) {
    console.error(e);
    box.innerHTML = `<p class="note" style="border-left-color:var(--danger)">${icon('info')}<span>The video could not be created on this browser (${esc(e.message || e)}). Press <strong>Create MP4 video</strong> to try again, or try Chrome or Edge on a computer, or Full HD instead of 4K.</span></p>`;
  } finally { exportJob = null; if (btn.isConnected) btn.disabled = false; }
}
function showExportResult(r) {
  const box = $('#r-export'); if (!box) return;
  const url = URL.createObjectURL(r.blob);
  box.innerHTML = `<div class="dl-result-card"><video src="${url}" controls playsinline muted style="width:120px;border-radius:10px"></video>
    <div><strong>${esc(r.name)}</strong><br><span class="muted">${r.w}×${r.h} · ${Math.round(r.duration)} s · ${fmtBytes(r.blob.size)} · ${esc(r.ext.toUpperCase())}${r.aac === false && r.ext === 'mp4' ? ' (Opus audio)' : ''}</span>
    <div class="inline" style="margin-top:8px"><a class="btn btn-maroon btn-sm" href="${url}" download="${esc(r.name)}">${icon('download')}Download again</a>
    ${navigator.canShare?.({ files: [new File([r.blob], r.name, { type: r.mime })] }) ? `<button type="button" class="btn btn-gold btn-sm" data-ra="share">${icon('share')}Share</button>` : ''}</div></div></div>`;
}
async function poster() {
  stop();
  toast('Preparing a high-resolution poster…', 'info', 2500);
  const tl2 = await readyTimeline(d, 1080, 1920);
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const pt = posterTime(tl2); if (tl2.prepare) await tl2.prepare(pt);
  tl2.draw(c.getContext('2d'), pt);
  c.toBlob(b => downloadBlob(b, `${slug(`${d.couple.bride.en}-${d.couple.groom.en}`)}-invitation.png`), 'image/png');
}

// ---------------- uploads ----------------
function readPhoto(file, maxSide = 1600) {
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type)) return rej(new Error('Please choose an image (JPEG, PNG or WebP).'));
    if (file.size > 20 * 1048576) return rej(new Error('That image is larger than 20 MB.'));
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, maxSide / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(/png|webp/.test(file.type) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9));
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('This image could not be read by your browser.')); };
    im.src = url;
  });
}
async function uploadSlot(el) {
  const f = el.files[0]; el.value = ''; if (!f) return;
  const s = tplOf().slots.find(x => x.id === el.dataset.slot); if (!s) return;
  try {
    if (/^video\//.test(f.type)) {
      if (f.size > 80 * 1048576) throw new Error('Please use a clip smaller than 80 MB.');
      const key = `${d.id}:art:${slotKey(s)}`;
      await storage.saveAudio(key, f);
      d.artSlots[slotKey(s)] = { kind: 'video', key, name: f.name };
    } else {
      const src = await readPhoto(f, s.photo ? 1400 : 1800);
      if (s.photo) d.photos[s.photo] = { src }; else d.artSlots[slotKey(s)] = { kind: 'image', src };
    }
    changed({ panel: true }); toast(`${s.label} updated.`, 'ok');
  } catch (e) { toast(e.message || 'That file could not be used.', 'err'); }
}
async function uploadAudio(el) {
  const f = el.files[0]; el.value = ''; if (!f) return;
  try {
    if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|aac|wav|ogg|oga|flac|webm)$/i.test(f.name)) throw new Error('Please choose an audio file (MP3, M4A, WAV or OGG).');
    if (f.size > CONFIG.maxAudioMB * 1048576) throw new Error(`That file is larger than ${CONFIG.maxAudioMB} MB.`);
    toast('Reading audio…', 'info', 1500);
    await decodeFile(f);
    await storage.saveAudio(d.id, f);
    d.video.audioName = f.name; d.video.track = 'upload'; d.video.start = 0; audioCache = { key: '', buf: null };
    changed({ panel: true, redraw: false }); toast('Song added. Press Play to listen.', 'ok');
  } catch (e) { toast(e.message || 'That audio file could not be read.', 'err'); }
}

// ---------------- events ----------------
function initEditor() {
  if (wired) return; wired = true;
  const panel = $('#reel-panel');
  $('#reel-name').addEventListener('input', e => { d.name = e.target.value || 'My reel'; changed({ redraw: false }); });
  const onField = e => {
    const el = e.target, path = el.dataset.rb; if (!path || !d) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.num) v = +v;
    if (el.type === 'radio' && !el.checked) return;
    set(d, path, v);
    const out = el.closest('.range')?.querySelector('output');
    if (out) out.textContent = path === 'video.start' ? `${v}s` : `${Math.round(v * 100)}%`;
    if (path === 'wording.invocation') d.show.invocation = v !== 'none';
    const structural = ['lang', 'video.track', 'story.showClosing2', 'story.showHandle', 'wording.invocation', 'story.deity'].includes(path) || /\.name\.en$/.test(path) && e.type === 'change';
    if (path === 'video.track' || path === 'video.volume' || path === 'video.start') audioCache = { key: '', buf: null };
    changed({ panel: structural && e.type === 'change' });
  };
  panel.addEventListener('input', e => { if (e.target.type !== 'radio' && e.target.tagName !== 'SELECT' && e.target.type !== 'file') onField(e); });
  panel.addEventListener('change', async e => {
    if (e.target.id === 'r-audio') return uploadAudio(e.target);
    if (e.target.dataset.slot) return uploadSlot(e.target);
    if (e.target.dataset.ra === 'main') { d.story.mainEvent = e.target.value; changed({ panel: true }); return; }
    if (e.target.type === 'radio' || e.target.tagName === 'SELECT' || e.target.type === 'checkbox' || e.target.type === 'date' || e.target.type === 'time') onField(e);
  });
  panel.addEventListener('click', async e => {
    const acc = e.target.closest('[data-acc]');
    if (acc) { const r = await handleAccountClick(acc, () => d, fn => { fn(d); d.story.mainEvent = mainEventOf(d)?.id || ''; changed({ panel: true }); }); if (r === 'saved') renderPanel(true); return; }
    const sb = e.target.closest('[data-rstep]'); if (sb) { goStep(+sb.dataset.rstep); return; }
    const b = e.target.closest('[data-ra]'); if (!b || b.type === 'radio') return;
    const a = b.dataset.ra, i = +b.dataset.i;
    if (a === 'ev-up' && i > 0) { [d.events[i - 1], d.events[i]] = [d.events[i], d.events[i - 1]]; changed({ panel: true }); }
    else if (a === 'ev-down' && i < d.events.length - 1) { [d.events[i + 1], d.events[i]] = [d.events[i], d.events[i + 1]]; changed({ panel: true }); }
    else if (a === 'ev-del') { if (await confirmDialog('Remove function?', `“${d.events[i].name.en || d.events[i].name.hi}” will be removed from this reel.`, 'Remove', true)) { d.events.splice(i, 1); changed({ panel: true }); } }
    else if (a === 'add-ev') { const id = $('#r-add').value; const main = mainEventOf(d); d.events.push(makeEvent(id, { date: main?.date || d.wedding.date, venue: main?.venue || '', address: main?.address || '' })); changed({ panel: true }); }
    else if (a === 'tpl') {
      const old = tplOf(), nt = anyTpl(b.dataset.tpl);
      d.story.template = nt.id;
      if (ART_MAP[nt.id] && !d.story.art?.copy) d.story.art = artDefaults(nt);
      else if (ART_MAP[nt.id]) d.story.art.copy = { ...artDefaults(nt).copy, ...Object.fromEntries(Object.entries(d.story.art.copy).filter(([k]) => k in nt.copy)) };
      if (d.wording.invocation === old.verse) d.wording.invocation = nt.verse;
      if (d.video.track === old.track) d.video.track = nt.track;
      if (nt.lang && old.lang !== nt.lang && ART_MAP[nt.id]) d.lang = nt.lang;
      if (d.name === `${old.name} reel`) { d.name = `${nt.name} reel`; $('#reel-name').value = d.name; }
      audioCache = { key: '', buf: null }; changed({ panel: true }); toast(`${nt.name} applied.`, 'ok');
    }
    else if (a === 'slot-clear') { const s = tplOf().slots.find(x => x.id === b.dataset.slot); if (s) { if (s.photo && d.photos?.[s.photo]) d.photos[s.photo] = null; const u = d.artSlots[slotKey(s)]; if (u?.key) storage.deleteAudio(u.key).catch(() => { }); delete d.artSlots[slotKey(s)]; changed({ panel: true }); } }
    else if (a === 'prompt') { const txt = PROMPTS[b.dataset.prompt]; (await copyText(txt)) ? toast('AI prompt copied. Paste it into your AI image or video tool.', 'ok') : toast(txt, 'info', 9000); }
    else if (a === 'list-add') { d.story.art.lists.push({ title: { en: '', hi: '' }, names: { en: '', hi: '' } }); changed({ panel: true, redraw: false }); }
    else if (a === 'list-del') { d.story.art.lists.splice(i, 1); changed({ panel: true }); }
    else if (a === 'copy-credits') { (await copyText(creditLines().join('\n'))) ? toast('Credits copied.', 'ok') : toast('Copy failed.', 'err'); }
    else if (a === 'reset') {
      if (await confirmDialog('Reset to template defaults?', 'Wording, colours, fonts and music go back to the template defaults. Names, photos and functions are kept.', 'Reset')) {
        const tp = tplOf(); const keepInit = d.story.initials, keepMain = d.story.mainEvent;
        d.story = { ...defaultStory(tp.id), template: tp.id, initials: keepInit, mainEvent: keepMain };
        if (ART_MAP[tp.id]) d.story.art = artDefaults(tp);
        d.wording.invocation = tp.verse; d.video.track = tp.track; d.video.volume = 0.8; changed({ panel: true });
      }
    }
    else if (a === 'export') doExport(b);
    else if (a === 'cancel' && exportJob) exportJob.cancelled = true;
    else if (a === 'poster') poster();
    else if (a === 'share' && lastExport) { try { await navigator.share({ files: [new File([lastExport.blob], lastExport.name, { type: lastExport.mime })], title: 'Wedding invitation' }); } catch { } }
  });
  $('#reel-stepper').addEventListener('click', e => { const b = e.target.closest('[data-rstep]'); if (b) goStep(+b.dataset.rstep); });
  $('#reel-play').addEventListener('click', play);
  $('#reel-scrub').addEventListener('input', e => { stop(); drawAt(+e.target.value); });
  $('#reel-scenes').addEventListener('click', e => { const b = e.target.closest('[data-scene]'); if (!b || !tl) return; stop(); const s = tl.scenes[+b.dataset.scene]; drawAt(s.start + Math.min(s.dur - 0.4, s.dur * 0.78)); });
  $('#reel-tpls').addEventListener('click', e => { const b = e.target.closest('[data-rt-play]'); if (b) previewModal(b.dataset.rtPlay); });
}
function goStep(n) { stop(); step = Math.max(1, Math.min(3, n)); renderPanel(); if (step === 3 && tl) drawAt(posterTime(tl)); }

export const isStory = x => x?.kind === 'story';
export { uid };
