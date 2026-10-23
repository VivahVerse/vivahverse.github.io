// Viral reel invitations: gallery (#/reels) and a simple 3-step editor (#/reel?id=… or ?new=<template>).
// Personalize → Customize → Preview & download. Autosaves to My Designs.
import { STORY_TEMPLATES, STORY_MAP, StoryTimeline, defaultStory, ensureStoryFonts, warmLayers, mainEventOf, FONT_SETS } from './render/story.js';
import { defaultDesign, makeEvent, uid } from './state.js';
import { INVOCATIONS, EVENT_PRESETS, EVENT_PICKER } from './data/culture.js';
import { TRACKS, renderTrack, decodeFile, playPreview, stopPreview } from './music.js';
import { exportBestVideo, VIDEO_FORMATS } from './video.js';
import { storage, prefs } from './storage.js';
import { profiles, applyProfile, accountBar, handleAccountClick } from './profile.js';
import { $, $$, esc, icon, toast, confirmDialog, openModal, closeModal, downloadBlob, fmtBytes, slug, debounce, reducedMotion } from './ui.js';
import { CONFIG } from './config.js';

const PW = 432, PH = 768; // preview resolution
let d = null, step = 1, tl = null, playing = false, t = 0, raf = 0, lastTs = 0, audioCache = { key: '', buf: null }, exportJob = null, lastExport = null, wired = false;

// ---------------- model ----------------
export function newStoryDesign(tplId, profileId, { sample = false } = {}) {
  const tpl = STORY_MAP[tplId] || STORY_TEMPLATES[0];
  const x = defaultDesign('kashi-ghat', 'hindu-shiv');
  x.kind = 'story'; x.name = `${tpl.name} reel`;
  x.story = defaultStory(tpl.id);
  x.wording.invocation = tpl.verse;
  x.video = { ...x.video, format: 'story', track: tpl.track, volume: 0.8, start: 0 };
  const date = x.wedding.date;
  const prev = (() => { const [y, m, dd] = date.split('-').map(Number); const dt = new Date(y, m - 1, dd - 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; })();
  x.events = [
    makeEvent('haldi', { date: prev, start: '11:00', venue: 'At Home', address: '' }),
    makeEvent('mehendi', { date: prev, start: '11:00', venue: 'At Home', address: '' }),
    makeEvent('wedding', { date, start: '20:00', venue: x.wedding.venue, address: x.wedding.address, maps: x.wedding.maps }),
  ];
  if (tpl.id === 'pastel-promise') x.story.intro = { en: 'Together with their families\nwe joyfully invite you\nto celebrate the', hi: 'सपरिवार सहर्ष आमंत्रण' };
  const p = sample ? null : profileId ? profiles.get(profileId) : (profiles.autofill() ? profiles.active() : null);
  if (p) applyProfile(x, p, { events: true });
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
const tplOf = () => STORY_MAP[d.story.template] || STORY_TEMPLATES[0];
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

// ---------------- gallery ----------------
export function renderReelGallery(params = {}) {
  const grid = $('#reel-tpls');
  grid.innerHTML = STORY_TEMPLATES.map(tp => `<article class="rt-card">
    <div class="rt-media"><canvas width="216" height="384" data-rt="${tp.id}" aria-label="${esc(tp.name)} preview" role="img"></canvas><span class="rt-tag">${esc(tp.tag)}</span>
      <button class="rt-play" type="button" data-rt-play="${tp.id}" aria-label="Play ${esc(tp.name)} preview">${icon('play')}</button></div>
    <div class="rt-body"><h3>${esc(tp.name)}</h3><p class="rt-sub">${esc(tp.sub)} · ${esc(tp.deity)}</p><p class="rt-desc">${esc(tp.desc)}</p>
      <div class="inline"><a class="btn btn-maroon btn-sm" href="#/reel?new=${tp.id}${params.profile ? '&profile=' + params.profile : ''}">${icon('edit')}Use this template</a><button class="btn btn-text btn-sm" type="button" data-rt-play="${tp.id}">${icon('eye')}Preview</button></div></div>
  </article>`).join('');
  drawThumbs();
}
async function drawThumbs() {
  await ensureStoryFonts(newStoryDesign('divine-union', null, { sample: true }));
  for (const c of $$('[data-rt]')) {
    await new Promise(r => setTimeout(r, 30));
    const x = newStoryDesign(c.dataset.rt, null, { sample: true });
    const tl2 = new StoryTimeline(x, c.width, c.height);
    const sc = tl2.scenes.find(s => s.kind === 'invite');
    tl2.draw(c.getContext('2d'), sc.start + sc.dur * 0.8);
  }
}
function previewModal(id) {
  const tp = STORY_MAP[id];
  openModal(`${tp.name} — preview`, `<div class="rt-modal"><canvas id="rt-modal-c" width="324" height="576" aria-label="Animated preview"></canvas>
    <p class="muted">${esc(tp.desc)} Sample names are fictional.</p>
    <div class="inline"><a class="btn btn-maroon" href="#/reel?new=${tp.id}">${icon('edit')}Use this template</a></div></div>`, { onClose: () => cancelAnimationFrame(modalRaf) });
  const c = $('#rt-modal-c'), ctx = c.getContext('2d');
  const x = newStoryDesign(id, null, { sample: true });
  ensureStoryFonts(x).then(() => {
    const tl2 = new StoryTimeline(x, c.width, c.height);
    const t0 = performance.now();
    const loop = now => { if (!c.isConnected) return; tl2.draw(ctx, ((now - t0) / 1000) % tl2.total); modalRaf = requestAnimationFrame(loop); };
    if (reducedMotion()) tl2.draw(ctx, 12); else modalRaf = requestAnimationFrame(loop);
  });
}
let modalRaf = 0;

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
  lastExport = null; audioCache = { key: '', buf: null };
  $('#reel-name').value = d.name;
  $('#reel-save').textContent = 'Saved on this device';
  await ensureStoryFonts(d);
  renderPanel();
  rebuild();
}
export function leaveReelEditor() { stop(); exportJob && (exportJob.cancelled = true); }

function rebuild() {
  const c = $('#reel-canvas');
  const note = $('#reel-note');
  note.textContent = 'Painting…';
  requestAnimationFrame(() => setTimeout(() => {
    tl = new StoryTimeline(d, PW, PH);
    if (t > tl.total) t = 0;
    drawAt(t || firstFrameTime());
    renderScenes();
    note.textContent = `${tl.scenes.length} scenes · about ${Math.round(tl.total)} seconds · 9:16`;
  }, 0));
  void c;
}
const firstFrameTime = () => { const s = tl.scenes.find(x => x.kind === 'invite'); return s ? s.start + s.dur * 0.75 : 3; };
function drawAt(time) {
  t = time;
  const c = $('#reel-canvas'); tl.draw(c.getContext('2d'), time);
  const r = $('#reel-scrub'); if (r) { r.max = tl.total.toFixed(2); r.value = time.toFixed(2); }
  const lab = $('#reel-time'); if (lab) lab.textContent = `${fmtS(time)} / ${fmtS(tl.total)}`;
  const i = tl.sceneAt(time); $$('#reel-scenes [data-scene]').forEach(b => b.setAttribute('aria-current', +b.dataset.scene === i ? 'true' : 'false'));
}
const fmtS = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const SCENE_NAMES = { open: 'Opening', monogram: 'Monogram', reveal: 'Divine setting', invite: 'Invitation', family: 'Families', main: 'Wedding', bless: 'Blessings', closing: 'Closing' };
function renderScenes() {
  $('#reel-scenes').innerHTML = tl.scenes.map((s, i) => `<button type="button" class="chip" data-scene="${i}" aria-current="false">${i + 1}. ${esc(s.kind === 'event' ? (s.data || []).map(e => e.name.en || e.name.hi).join(' & ') : SCENE_NAMES[s.kind])}</button>`).join('');
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
  playing = true; updatePlayBtn();
  if (t >= tl.total - 0.1) t = 0;
  try { const buf = await musicBuffer(); if (buf && playing) playPreview(buf, { volume: d.video.volume ?? 0.8, start: (d.video.track === 'upload' ? d.video.start || 0 : 0) + t }); } catch (e) { toast(e.message || 'Music could not play.', 'err'); }
  lastTs = performance.now();
  const loop = now => {
    if (!playing) return;
    t += (now - lastTs) / 1000; lastTs = now;
    if (t >= tl.total) { drawAt(tl.total - 0.01); stop(); return; }
    drawAt(t); raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function stop() { playing = false; cancelAnimationFrame(raf); stopPreview(); updatePlayBtn(); }
function updatePlayBtn() { const b = $('#reel-play'); if (b) b.innerHTML = playing ? `${icon('pause')}Pause` : `${icon('play')}Play`; }

// ---------------- panel ----------------
const STEPS = ['Personalize', 'Customize', 'Preview & download'];
const inp = (label, path, { type = 'text', lang = '', ph = '', full = false, hint = '' } = {}) => {
  const v = get(d, path) ?? '';
  const id = 'r-' + path.replace(/\./g, '-');
  return `<div class="field ${full ? 'full' : ''}"><span><label for="${id}">${esc(label)}</label>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span>${type === 'textarea' ? `<textarea id="${id}" rows="3" data-rb="${path}" ${lang ? `lang="${lang}"` : ''} placeholder="${esc(ph)}">${esc(v)}</textarea>` : `<input id="${id}" type="${type}" data-rb="${path}" value="${esc(v)}" ${lang ? `lang="${lang}"` : ''} placeholder="${esc(ph)}">`}</div>`;
};
const sel = (label, path, opts, { full = false, hint = '' } = {}) => {
  const v = String(get(d, path) ?? ''); const id = 'r-' + path.replace(/\./g, '-');
  return `<div class="field ${full ? 'full' : ''}"><span><label for="${id}">${esc(label)}</label>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span><select id="${id}" data-rb="${path}">${opts.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>`;
};
const chk = (label, path) => `<label class="check"><input type="checkbox" data-rb="${path}" ${get(d, path) ? 'checked' : ''}> ${esc(label)}</label>`;
const showHi = () => d.lang !== 'en';

function issues() {
  const out = [];
  if (!d.couple.bride.en && !d.couple.bride.hi) out.push(['Add the bride’s name', 1]);
  if (!d.couple.groom.en && !d.couple.groom.hi) out.push(['Add the groom’s name', 1]);
  if (d.lang === 'hi' && (!d.couple.bride.hi || !d.couple.groom.hi)) out.push(['Add the names in Hindi (the reel is in Hindi)', 1]);
  const m = mainEventOf(d);
  if (!m) out.push(['Add the main wedding ceremony', 1]);
  (d.events || []).forEach(e => {
    const n = e.name.en || e.name.hi || 'A function';
    if (!e.name.en && !e.name.hi) out.push(['A function has no name', 1]);
    if (!e.date) out.push([`${n}: add a date`, 1]);
    if (!e.start) out.push([`${n}: add a time`, 1]);
    if (e.date && new Date(e.date + 'T23:59') < new Date()) out.push([`${n}: the date is in the past. Please check it`, 1]);
  });
  if ((d.couple.bride.en || '').length > 18 || (d.couple.groom.en || '').length > 18) out.push(['Long names are shrunk to fit. Consider short names for the reel', 1]);
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
      ${showHi() ? inp('Name in Hindi', `events.${i}.name.hi`, { lang: 'hi', ph: 'हल्दी' }) : ''}
      ${inp('Date', `events.${i}.date`, { type: 'date' })}
      ${inp('Time', `events.${i}.start`, { type: 'time' })}
      ${inp('Venue', `events.${i}.venue`, { ph: 'At Home', full: true })}
      ${inp('Address (optional)', `events.${i}.address`, { full: true })}
      ${inp('Google Maps link (optional)', `events.${i}.maps`, { type: 'url', full: true, hint: 'used on your wedding website' })}
      ${inp('Dress code (optional)', `events.${i}.dress`, { full: true })}
      ${inp('Description (optional)', `events.${i}.msg.en`, { full: true, hint: 'for cards & website' })}
    </div>
    <label class="check"><input type="radio" name="r-main" data-ra="main" value="${e.id}" ${isMain ? 'checked' : ''}> This is the main wedding ceremony (gets the big “Wedding” scene)</label>
  </div>`;
}

function verseOptions() {
  const groups = {};
  INVOCATIONS.forEach(v => { if (v.id === 'custom') return; (groups[v.group] ||= []).push(v); });
  const cur = d.wording.invocation;
  return `<div class="field full"><span><label for="r-verse">Blessing / mantra at the top</label><span class="hint">optional</span></span><select id="r-verse" data-rb="wording.invocation">${Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(v => `<option value="${v.id}" ${v.id === cur ? 'selected' : ''}>${esc(v.id === 'none' ? 'No verse or mantra' : v.label)}</option>`).join('')}</optgroup>`).join('')}</select>
  ${(() => { const v = INVOCATIONS.find(x => x.id === cur); return v?.meaning ? `<small class="muted">${esc(v.translit ? v.translit.split('\n')[0] + ' — ' : '')}${esc(v.meaning)}</small>` : ''; })()}</div>`;
}

function renderPanel(keepScroll = false) {
  const p = $('#reel-panel'); const sc = p.scrollTop;
  $('#reel-stepper').innerHTML = STEPS.map((s, i) => `<button type="button" data-rstep="${i + 1}" ${step === i + 1 ? 'aria-current="step"' : ''}><span class="num">${i + 1}</span>${s}</button>`).join('');
  let html = '';
  if (step === 1) {
    html = `<h2>Personalize</h2><p class="lead">Names, families and functions. Every scene updates as you type.</p>
    ${accountBar()}
    <fieldset class="fieldset"><legend>Couple</legend><div class="fgrid">
      ${inp('Bride’s name', 'couple.bride.en', { ph: 'Mansi' })}${inp('Groom’s name', 'couple.groom.en', { ph: 'Naveen' })}
      ${showHi() ? inp('Bride’s name (Hindi)', 'couple.bride.hi', { lang: 'hi', ph: 'मानसी' }) + inp('Groom’s name (Hindi)', 'couple.groom.hi', { lang: 'hi', ph: 'नवीन' }) : ''}
      ${inp('Bride’s full name', 'couple.brideFull.en', { hint: 'optional' })}${inp('Groom’s full name', 'couple.groomFull.en', { hint: 'optional' })}
      <div class="field full">${chk('Use full names on the invitation scene', 'couple.useFull')}</div>
      ${sel('Name order', 'couple.order', [['bride', 'Bride first'], ['groom', 'Groom first']])}
      ${inp('Initials for the monogram', 'story.initials', { ph: 'auto, e.g. M & N', hint: 'leave empty for auto' })}
    </div></fieldset>
    <fieldset class="fieldset"><legend>Families</legend><div class="fgrid">
      ${inp('Bride’s parents', 'family.brideParents.en', { full: true })}${showHi() ? inp('Bride’s parents (Hindi)', 'family.brideParents.hi', { lang: 'hi', full: true }) : ''}
      ${inp('Groom’s parents', 'family.groomParents.en', { full: true })}${showHi() ? inp('Groom’s parents (Hindi)', 'family.groomParents.hi', { lang: 'hi', full: true }) : ''}
      ${inp('Family names', 'family.familyNames.en', { full: true, ph: 'The Sharma & Kapoor families' })}${showHi() ? inp('Family names (Hindi)', 'family.familyNames.hi', { lang: 'hi', full: true }) : ''}
      <div class="field full">${chk('Show family names at the end', 'story.showFamilies')}<small class="muted">The extended version also adds a “With the blessings of” scene with both families.</small></div>
    </div></fieldset>
    <fieldset class="fieldset"><legend>Functions</legend>
      <p class="muted">Functions on the same day and venue are combined (for example “Haldi &amp; Mehendi”). Mark the main ceremony for the big “Wedding” scene.</p>
      ${d.events.map(eventCard).join('')}
      <div class="inline"><label class="sr" for="r-add">Function to add</label><select id="r-add">${EVENT_PICKER.map(id => `<option value="${id}">${esc(EVENT_PRESETS[id].name.en)} · ${esc(EVENT_PRESETS[id].name.hi)}</option>`).join('')}</select><button type="button" class="btn btn-outline btn-sm" data-ra="add-ev">${icon('plus')}Add function</button></div>
      <div style="margin-top:8px">${chk('Combine functions on the same day & venue', 'story.mergeEvents')}${chk('Show venue and address lines', 'story.showVenue')}</div>
    </fieldset>`;
  } else if (step === 2) {
    const tp = tplOf();
    html = `<h2>Customize</h2><p class="lead">Choose the story, words, colours and music. Presets are ready, so change only what you like.</p>
    <fieldset class="fieldset"><legend>Story template</legend><div class="rt-pick">${STORY_TEMPLATES.map(x => `<button type="button" class="rt-mini" data-ra="tpl" data-tpl="${x.id}" aria-pressed="${x.id === tp.id}"><strong>${esc(x.name)}</strong><small>${esc(x.deity)}</small></button>`).join('')}</div></fieldset>
    <fieldset class="fieldset"><legend>Language & verse</legend><div class="fgrid">
      ${sel('Language', 'lang', [['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['bi', 'English + हिन्दी names']], { full: true })}
      ${verseOptions()}
    </div><p class="muted" style="margin-top:6px">Religious text is optional. Choose “No verse or mantra” for a non-religious reel.</p></fieldset>
    <fieldset class="fieldset"><legend>Wording</legend><div class="fgrid">
      ${inp('Invitation message', d.lang === 'hi' ? 'story.intro.hi' : 'story.intro.en', { type: 'textarea', full: true, lang: d.lang === 'hi' ? 'hi' : '' })}
      ${inp('Heading', d.lang === 'hi' ? 'story.heading.hi' : 'story.heading.en', { lang: d.lang === 'hi' ? 'hi' : '' })}
      ${inp('Main scene title', d.lang === 'hi' ? 'story.mainWord.hi' : 'story.mainWord.en', { lang: d.lang === 'hi' ? 'hi' : '', ph: 'Wedding' })}
      ${inp('Closing message', d.lang === 'hi' ? 'story.closing1.hi' : 'story.closing1.en', { type: 'textarea', full: true, lang: d.lang === 'hi' ? 'hi' : '' })}
      <div class="field full">${chk('Add a second closing line', 'story.showClosing2')}</div>
      ${d.story.showClosing2 ? inp('Second line', d.lang === 'hi' ? 'story.closing2.hi' : 'story.closing2.en', { type: 'textarea', full: true, lang: d.lang === 'hi' ? 'hi' : '' }) : ''}
    </div></fieldset>
    <fieldset class="fieldset"><legend>Look</legend><div class="fgrid">
      ${sel('Monogram', 'story.monogram', [['serif', 'Classic serif'], ['script', 'Calligraphy script'], ['royal', 'Royal'], ['framed', 'In a gold circle'], ['deva', 'Hindi initials']])}
      ${sel('Fonts', 'story.fonts', Object.entries(FONT_SETS).map(([k, f]) => [k, f.label]))}
      ${sel('Accent colour', 'story.accent', [['auto', 'Template default'], ['gold', 'Antique gold'], ['terracotta', 'Terracotta'], ['rose', 'Dusty rose'], ['neutral', 'Neutral brown']])}
      ${sel('Background', 'story.bg', [['auto', 'As painted'], ['parchment', 'Warm parchment'], ['blue', 'Blue watercolour']])}
      ${sel('Text alignment', 'story.align', [['center', 'Centred'], ['left', 'Left']])}
      ${sel('Illustration side', 'story.placement', [['left', 'Left'], ['right', 'Right']])}
      ${sel('Petals', 'story.petals', [['gentle', 'Gentle'], ['more', 'More petals'], ['none', 'None']])}
      <div class="field range"><label for="r-int" class="label">Watercolour intensity</label><output>${Math.round(d.story.intensity * 100)}%</output><input id="r-int" type="range" min="0.6" max="1.4" step="0.1" value="${d.story.intensity}" data-rb="story.intensity" data-num="1"></div>
    </div></fieldset>
    <fieldset class="fieldset"><legend>Music</legend>
      <div class="track-grid">${TRACKS.map(x => `<label class="radio-card track"><input type="radio" name="r-track" value="${x.id}" data-rb="video.track" ${d.video.track === x.id ? 'checked' : ''}><strong>${esc(x.name)}${x.id === 'upload' && d.video.audioName ? `<br><span class="muted">${esc(d.video.audioName)}</span>` : ''}</strong>${x.desc ? `<small>${esc(x.desc)}</small>` : ''}</label>`).join('')}</div>
      ${d.video.track === 'upload' ? `<div class="inline" style="margin-top:12px"><label class="btn btn-maroon btn-sm file-btn">${icon('upload')}${d.video.audioName ? 'Choose a different song' : 'Choose a song file'}<input type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg" hidden id="r-audio"></label><span class="muted">Up to ${CONFIG.maxAudioMB} MB. Stays on your device.</span></div>
        <div class="field range" style="margin-top:10px"><label for="r-start" class="label">Start the song from (seconds)</label><output>${d.video.start || 0}s</output><input id="r-start" type="range" min="0" max="240" step="1" value="${d.video.start || 0}" data-rb="video.start" data-num="1"></div>` : ''}
      ${d.video.track !== 'none' ? `<div class="field range" style="margin-top:10px"><label for="r-vol" class="label">Volume</label><output>${Math.round((d.video.volume ?? 0.8) * 100)}%</output><input id="r-vol" type="range" min="0.1" max="1" step="0.05" value="${d.video.volume ?? 0.8}" data-rb="video.volume" data-num="1"></div>` : ''}
      <p class="note" style="margin-top:12px">${icon('info')}<span>Music fades in and out automatically. Built-in tracks are original and free to use. YouTube and Spotify songs cannot be put inside a video file (their terms don't allow it). Upload a song file you have the right to use instead. Instagram may mute recognised copyrighted songs.</span></p>
    </fieldset>
    <fieldset class="fieldset"><legend>Length & ending</legend><div class="fgrid">
      ${sel('Length', 'story.length', [['standard', 'Standard (about 34–38 s)'], ['extended', 'Extended (about 42–50 s, adds families)']], { full: true })}
      ${sel('Final screen', 'story.endScreen', [['black', 'Fade to black'], ['ivory', 'Fade to ivory']])}
      <div class="field">${chk('Show a name or handle at the end', 'story.showHandle')}</div>
      ${d.story.showHandle ? inp('Name or handle', 'story.handle', { ph: '#MansiWedsNaveen', full: true }) : ''}
    </div></fieldset>
    <div class="inline"><button type="button" class="btn btn-text btn-sm" data-ra="reset">Reset to template defaults</button></div>`;
  } else {
    const is = issues();
    html = `<h2>Preview &amp; download</h2><p class="lead">Watch the whole reel, check spellings and dates, then create your MP4.</p>
    <fieldset class="fieldset"><legend>Final check</legend>
      ${is.length ? `<ul class="r-issues">${is.map(([m]) => `<li>${icon('info')}<span>${esc(m)}</span><button type="button" class="btn btn-text btn-sm" data-rstep="1">Fix</button></li>`).join('')}</ul>` : `<p class="ok-line">${icon('check')}Everything needed is filled in.</p>`}
      <dl class="r-review">
        <dt>Couple</dt><dd>${esc(d.couple.bride.en || d.couple.bride.hi)} &amp; ${esc(d.couple.groom.en || d.couple.groom.hi)}</dd>
        ${d.events.map(e => `<dt>${esc(e.name.en || e.name.hi)}</dt><dd>${esc(e.date ? new Date(e.date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'no date')}${e.start ? ' · ' + esc(e.start) : ''}${e.venue ? ' · ' + esc(e.venue) : ''}</dd>`).join('')}
        <dt>Music</dt><dd>${esc(TRACKS.find(x => x.id === d.video.track)?.name || '')}</dd>
      </dl></fieldset>
    <fieldset class="fieldset"><legend>Download</legend>
      ${sel('Quality', 'video.format', [['story', 'Full HD 1080 × 1920 (recommended)'], ['story4k', '4K 2160 × 3840 (slower, large file)']], { full: true })}
      <div class="inline" style="margin-top:10px"><button type="button" class="btn btn-gold btn-lg" data-ra="export" ${window.VideoEncoder || window.MediaRecorder ? '' : 'disabled'}>${icon('film')}Create MP4 video</button>
      <button type="button" class="btn btn-outline" data-ra="poster">${icon('image')}Download poster (PNG)</button></div>
      <div id="r-export"></div>
      <p class="muted" style="margin-top:10px">The video is made on your device. Nothing is uploaded. Chrome, Edge and Safari make a real MP4 (H.264) quickly. Firefox records a WebM in real time.</p>
    </fieldset>`;
  }
  html += `<div class="panel-foot">${step > 1 ? `<button type="button" class="btn btn-outline" data-rstep="${step - 1}">${icon('left')}Back</button>` : '<span></span>'}${step < 3 ? `<button type="button" class="btn btn-maroon" data-rstep="${step + 1}">Next: ${STEPS[step]}${icon('right')}</button>` : `<a class="btn btn-text" href="#/designs">My Designs</a>`}</div>`;
  p.innerHTML = `<div class="panel-content">${html}</div>`;
  if (keepScroll) p.scrollTop = sc; else p.scrollTop = 0;
  if (lastExport && step === 3) showExportResult(lastExport);
}

// ---------------- export ----------------
async function doExport(btn) {
  if (exportJob) return;
  stop();
  const box = $('#r-export');
  const job = exportJob = { cancelled: false };
  box.innerHTML = `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div><p class="muted" id="r-prog">Preparing the paintings and music…</p><button type="button" class="btn btn-text btn-sm" data-ra="cancel">Cancel</button>`;
  btn.disabled = true;
  try {
    const fmt = VIDEO_FORMATS[d.video.format] || VIDEO_FORMATS.story;
    const design = structuredClone(d);
    await ensureStoryFonts(design);
    await new Promise(r => setTimeout(r, 30));
    warmLayers(design, fmt.w, fmt.h);
    const probe = new StoryTimeline(design, 10, 10);
    let audio = null;
    if (design.video.track !== 'none') {
      try { audio = design.video.track === 'upload' ? (await storage.getAudio(design.id).then(b => b && decodeFile(b))) : await renderTrack(design.video.track, Math.ceil(probe.total) + 2); } catch (e) { toast('Music could not be prepared. Exporting without music.', 'err'); }
    }
    const r = await exportBestVideo(design, { audio, signal: job, onProgress: p => { const s = box.querySelector('.progress span'); if (s) { s.style.width = (p * 100).toFixed(0) + '%'; box.querySelector('.progress').setAttribute('aria-valuenow', Math.round(p * 100)); } const l = $('#r-prog'); if (l) l.textContent = `Creating video… ${Math.round(p * 100)}%`; } });
    if (!r || job.cancelled) { box.innerHTML = '<p class="muted">Cancelled.</p>'; return; }
    r.name = `${slug(`${design.couple.bride.en || 'bride'}-${design.couple.groom.en || 'groom'}-${tplOf().id}`)}.${r.ext}`;
    lastExport = r;
    showExportResult(r);
    downloadBlob(r.blob, r.name);
    toast('Your video is ready.', 'ok');
  } catch (e) {
    console.error(e);
    box.innerHTML = `<p class="note" style="border-left-color:var(--danger)">${icon('info')}<span>The video could not be created on this browser (${esc(e.message || e)}). Try Chrome or Edge on a computer, or choose Full HD instead of 4K.</span></p>`;
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
  await new Promise(r => setTimeout(r, 30));
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const tl2 = new StoryTimeline(d, 1080, 1920);
  const sc = tl2.scenes.find(s => s.kind === 'invite');
  tl2.draw(c.getContext('2d'), sc.start + sc.dur * 0.8);
  c.toBlob(b => downloadBlob(b, `${slug(`${d.couple.bride.en}-${d.couple.groom.en}`)}-invitation.png`), 'image/png');
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
    const structural = ['lang', 'video.track', 'story.showClosing2', 'story.showHandle', 'wording.invocation'].includes(path) || /\.name\.en$/.test(path) && e.type === 'change';
    if (path === 'video.track' || path === 'video.volume' || path === 'video.start') audioCache = { key: '', buf: null };
    changed({ panel: structural && e.type === 'change' });
  };
  panel.addEventListener('input', e => { if (e.target.type !== 'radio' && e.target.tagName !== 'SELECT') onField(e); });
  panel.addEventListener('change', async e => {
    if (e.target.id === 'r-audio') return uploadAudio(e.target);
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
      const old = tplOf(), nt = STORY_MAP[b.dataset.tpl];
      d.story.template = nt.id;
      if (d.wording.invocation === old.verse) d.wording.invocation = nt.verse;
      if (d.video.track === old.track) d.video.track = nt.track;
      if (d.name === `${old.name} reel`) { d.name = `${nt.name} reel`; $('#reel-name').value = d.name; }
      audioCache = { key: '', buf: null }; changed({ panel: true }); toast(`${nt.name} applied.`, 'ok');
    }
    else if (a === 'reset') { if (await confirmDialog('Reset styling?', 'Wording, colours, fonts and music go back to the template defaults. Names and functions are kept.', 'Reset')) { const tp = tplOf(); const keepInit = d.story.initials, keepMain = d.story.mainEvent; d.story = { ...defaultStory(tp.id), initials: keepInit, mainEvent: keepMain }; d.wording.invocation = tp.verse; d.video.track = tp.track; d.video.volume = 0.8; changed({ panel: true }); } }
    else if (a === 'export') doExport(b);
    else if (a === 'cancel' && exportJob) exportJob.cancelled = true;
    else if (a === 'poster') poster();
    else if (a === 'share' && lastExport) { try { await navigator.share({ files: [new File([lastExport.blob], lastExport.name, { type: lastExport.mime })], title: 'Wedding invitation' }); } catch { } }
  });
  $('#reel-stepper').addEventListener('click', e => { const b = e.target.closest('[data-rstep]'); if (b) goStep(+b.dataset.rstep); });
  $('#reel-play').addEventListener('click', play);
  $('#reel-scrub').addEventListener('input', e => { stop(); drawAt(+e.target.value); });
  $('#reel-scenes').addEventListener('click', e => { const b = e.target.closest('[data-scene]'); if (!b) return; stop(); const s = tl.scenes[+b.dataset.scene]; drawAt(s.start + Math.min(s.dur - 0.4, s.dur * 0.78)); });
  $('#reel-reset-tpl')?.addEventListener('click', () => goStep(2));
  // gallery
  $('#reel-tpls').addEventListener('click', e => { const b = e.target.closest('[data-rt-play]'); if (b) previewModal(b.dataset.rtPlay); });
}
function goStep(n) { stop(); step = Math.max(1, Math.min(3, n)); renderPanel(); if (step === 3) drawAt(firstFrameTime()); }

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
export const isStory = x => x?.kind === 'story';
export { uid };
