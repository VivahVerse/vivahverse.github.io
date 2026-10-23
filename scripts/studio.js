// The invitation studio: 9-step wizard, live preview, undo/redo, autosave.
import { store, defaultDesign, makeEvent, eventsForCulture, pageList, FORMATS, uid, invocationText } from './state.js';
import { TEMPLATES, TEMPLATE_MAP, PALETTES, FONTS } from './data/templates.js';
import { CULTURES, INVOCATIONS, EVENT_PRESETS, EVENT_PICKER, WORDING, LANGUAGES, cultureForTemplate } from './data/culture.js';
import { renderPage, ensureFonts, setAssetListener, preloadImages, paletteFor } from './render/card.js';
import { fmtDate, fmtTimeRange, parseDate } from './i18n.js';
import { $, $$, esc, icon, toast, confirmDialog, openModal, closeModal, downloadBlob, copyText, fmtBytes, debounce, readImage, slug, reducedMotion } from './ui.js';
import { storage, prefs } from './storage.js';
import * as EX from './exporter.js';
import { TRACKS, renderTrack, decodeFile, playPreview, stopPreview, isPlaying } from './music.js';
import { Timeline, VIDEO_FORMATS, recordVideo, getMusic, videoSupport } from './video.js';
import { invitationText, waLink, rsvpMessage, hashtags, captions, shareFile, shareText, canShareFiles, qrCanvas, isUrl, sortedEvents } from './share.js';
import { buildMicrosite } from './microsite.js';
import { CONFIG } from './config.js';

const idle = fn => (window.requestIdleCallback ? requestIdleCallback(() => fn(), { timeout: 200 }) : setTimeout(fn, 1));
const STEPS = [
  { id: 1, name: 'Template' }, { id: 2, name: 'Type & style' }, { id: 3, name: 'Couple & date' },
  { id: 4, name: 'Family & wording' }, { id: 5, name: 'Functions' }, { id: 6, name: 'Customize' },
  { id: 7, name: 'Music & video' }, { id: 8, name: 'Preview' }, { id: 9, name: 'Download & share' },
];

const ui = { step: 1, page: 0, fmt: '5x7', errors: {}, openEvent: null, visited: new Set([1]), playing: null, exportJob: null, audioBuf: null, audioDur: 0 };
let initialised = false;

// ---------- path helpers ----------
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.'); const last = ks.pop();
  const t = ks.reduce((a, k) => (a[k] == null ? (a[k] = {}) : a[k]), o);
  t[last] = v;
}
const D = () => store.get();

// ---------- field builders ----------
function field(label, path, { type = 'text', hint = '', full = false, lang = '', ph = '', vis = '', cls = '', req = false, min, max, step, rows } = {}) {
  const v = getPath(D(), path) ?? '';
  const err = ui.errors[path];
  const id = 'f-' + path.replace(/\./g, '-');
  const visHtml = vis ? `<label class="vis"><input type="checkbox" data-bind="show.${vis}" ${D().show[vis] ? 'checked' : ''}> Show</label>` : '';
  const input = type === 'textarea'
    ? `<textarea id="${id}" data-bind="${path}" ${lang ? `lang="${lang}"` : ''} rows="${rows || 3}" placeholder="${esc(ph)}" ${err ? `aria-invalid="true" aria-describedby="${id}-e"` : ''}>${esc(v)}</textarea>`
    : `<input id="${id}" type="${type}" data-bind="${path}" value="${esc(v)}" ${lang ? `lang="${lang}"` : ''} placeholder="${esc(ph)}" ${req ? 'required aria-required="true"' : ''} ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} ${step != null ? `step="${step}"` : ''} ${err ? `aria-invalid="true" aria-describedby="${id}-e"` : ''} ${type === 'tel' ? 'inputmode="tel" autocomplete="tel"' : ''}>`;
  return `<div class="field ${full ? 'full' : ''} ${err ? 'invalid' : ''} ${cls}"><span><label for="${id}">${esc(label)}${req ? ' <span aria-hidden="true">*</span>' : ''}</label>${hint ? ` <span class="hint">${esc(hint)}</span>` : ''}${visHtml}</span>${input}${err ? `<span class="err-msg" id="${id}-e">${esc(err)}</span>` : ''}</div>`;
}
function bilingual(label, path, o = {}) {
  const lang = D().lang;
  const showHi = lang !== 'en' || o.alwaysHi;
  return field(label + (showHi ? ' (English)' : ''), path + '.en', { ...o, full: o.full ?? false, req: o.req && lang === 'en' }) +
    (showHi ? field(label + ' (हिन्दी)', path + '.hi', { ...o, lang: 'hi', vis: '', ph: o.phHi || '', req: o.req && lang === 'hi', hint: 'type or paste' }) : '');
}
function select(label, path, options, { full = false, cls = '', hint = '' } = {}) {
  const v = getPath(D(), path);
  const id = 'f-' + path.replace(/\./g, '-');
  return `<div class="field ${full ? 'full' : ''} ${cls}"><span><label for="${id}">${esc(label)}</label>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span><select id="${id}" data-bind="${path}">${options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select></div>`;
}
function check(label, path, cls = '') {
  return `<label class="check ${cls}"><input type="checkbox" data-bind="${path}" ${getPath(D(), path) ? 'checked' : ''}> ${esc(label)}</label>`;
}
function range(label, path, min, max, step, fmt = v => v, cls = '') {
  const v = getPath(D(), path);
  const id = 'f-' + path.replace(/\./g, '-');
  return `<div class="field range ${cls}"><label for="${id}" class="label">${esc(label)}</label><output for="${id}" data-out="${path}">${esc(fmt(v))}</output><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-bind="${path}" data-num="1"></div>`;
}

// ---------- step renderers ----------
const R = {};

R[1] = () => `
  <h2>Choose a template</h2>
  <p class="lead">Each design has its own palette, ornaments and typography. You can switch at any time without losing your details. The previews show your own names.</p>
  <label class="search" style="margin-bottom:14px">${icon('search')}<span class="sr">Filter templates</span><input type="search" id="mini-search" placeholder="Filter by name or style"></label>
  <div class="mini-grid" id="mini-grid">${TEMPLATES.map(t => `<button type="button" class="mini" data-tpl="${t.id}" aria-pressed="${D().templateId === t.id}" data-search="${esc((t.name + ' ' + t.tagline + ' ' + t.categories.join(' ') + ' ' + t.cultures.join(' ') + ' ' + t.region).toLowerCase())}"><canvas width="236" height="330" aria-hidden="true"></canvas>${esc(t.name)}</button>`).join('')}</div>`;

R[2] = () => {
  const d = D();
  const types = [
    ['complete', 'Complete invitation', 'Cover, functions page, a card per function and a closing page'],
    ['events', 'Function cards only', 'A separate card for each function'],
    ['savedate', 'Save the date', 'A single announcement card'],
    ['video', 'Video invitation', 'Animated cards with music (step 7)'],
    ['website', 'Wedding website', 'A downloadable one-page site (step 9)'],
  ];
  return `
  <h2>Invitation type &amp; tradition</h2>
  <p class="lead">These choices fill in suggestions. Nothing is fixed, so you can edit or remove anything later.</p>
  <fieldset class="fieldset"><legend>What are you making?</legend>
    <div class="radio-cards">${types.map(([v, t, s]) => `<label class="radio-card"><input type="radio" name="type" value="${v}" data-bind="type" ${d.type === v ? 'checked' : ''}><strong>${t}</strong><small>${s}</small></label>`).join('')}</div>
    ${d.type === 'complete' || d.type === 'video' || d.type === 'website' ? `<div class="sep"></div><p class="label">Pages to include</p><div class="checks">${check('Cover', 'pages.cover')}${check('All-functions page', 'pages.events')}${check('Card for each function', 'pages.eventCards')}${check('Closing & RSVP page', 'pages.closing')}</div>` : ''}
  </fieldset>
  <fieldset class="fieldset"><legend>Tradition</legend>
    <div class="fgrid">
      <div class="field full"><span><label for="culture-pick">Cultural style</label><span class="hint">suggests invocation &amp; functions</span></span>
        <select id="culture-pick">${CULTURES.map(c => `<option value="${c.id}" ${d.culture === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
    </div>
    <p class="muted" style="margin-top:8px" id="culture-hint">${cultureHint()}</p>
  </fieldset>
  <fieldset class="fieldset"><legend>Language</legend>
    <div class="radio-cards">${LANGUAGES.map(l => `<label class="radio-card"><input type="radio" name="lang" value="${l.id}" data-bind="lang" ${d.lang === l.id ? 'checked' : ''}><strong lang="${l.id === 'hi' ? 'hi' : 'en'}">${esc(l.label)}</strong><small>${l.id === 'en' ? 'All text in English' : l.id === 'hi' ? 'Hindi text, Devanagari fonts' : 'English with Hindi beneath'}</small></label>`).join('')}</div>
    ${d.lang !== 'en' ? `<div style="margin-top:10px">${check('Use Devanagari numerals (१२ फ़रवरी)', 'style.devaDigits')}</div>` : ''}
    <p class="note" style="margin-top:12px">${icon('info')}<span>There's no automatic translation. You type the Hindi wording yourself, and we provide ready-made Hindi phrases you can edit. Text never leaves your device. More Indian languages can be added later.</span></p>
  </fieldset>`;
};
function cultureHint() {
  const c = CULTURES.find(x => x.id === D().culture);
  if (!c) return '';
  const t = TEMPLATE_MAP[c.template];
  return `Suggested functions: ${c.events.map(e => EVENT_PRESETS[e].name.en).join(', ')}.${t && t.id !== D().templateId ? ` Suggested template: <button type="button" class="btn btn-text" data-act="apply-tpl" data-tpl="${t.id}" style="padding:0;min-height:0;text-decoration:underline">${esc(t.name)}</button>` : ''}`;
}

R[3] = () => {
  const d = D();
  const p = d.photos.couple;
  return `
  <h2>The couple &amp; the date</h2>
  <p class="lead">Names in English and, if you chose Hindi, in Devanagari. Long names are fitted automatically.</p>
  <fieldset class="fieldset"><legend>Names</legend><div class="fgrid">
    ${bilingual("Bride's name", 'couple.bride', { req: true, ph: 'e.g. Aanya', phHi: 'जैसे आन्या' })}
    ${bilingual("Groom's name", 'couple.groom', { req: true, ph: 'e.g. Vihaan', phHi: 'जैसे विहान' })}
    <div class="full advanced-only">${check('Use full names on the card', 'couple.useFull')}</div>
    ${d.couple.useFull ? bilingual("Bride's full name", 'couple.brideFull', { cls: 'advanced-only' }) + bilingual("Groom's full name", 'couple.groomFull', { cls: 'advanced-only' }) : ''}
    ${select('Name order', 'couple.order', [['bride', "Bride's name first"], ['groom', "Groom's name first"]])}
    <div class="field"><span><label for="f-couple-hashtag">Wedding hashtag</label><label class="vis"><input type="checkbox" data-bind="show.hashtag" ${d.show.hashtag ? 'checked' : ''}> Show</label></span>
      <div class="inline"><input id="f-couple-hashtag" type="text" data-bind="couple.hashtag" value="${esc(d.couple.hashtag)}" placeholder="#AanyaWedsVihaan"><button type="button" class="btn btn-outline btn-sm" data-act="suggest-tag">Suggest</button></div></div>
  </div></fieldset>
  <fieldset class="fieldset"><legend>Wedding date &amp; venue</legend><div class="fgrid">
    ${field('Wedding date', 'wedding.date', { type: 'date', req: true, vis: 'date' })}
    ${field('Time', 'wedding.time', { type: 'time', vis: 'time' })}
    ${field('Muhurat / ceremony time', 'wedding.muhurat', { type: 'time', vis: 'muhurat', hint: 'optional' })}
    ${field('Venue name', 'wedding.venue', { vis: 'venue', ph: 'e.g. The Lotus Courtyard' })}
    ${field('Full address', 'wedding.address', { full: true, vis: 'address', ph: 'Street, area, city, PIN' })}
    ${field('Google Maps link', 'wedding.maps', { type: 'url', full: true, ph: 'https://maps.app.goo.gl/…', hint: 'used for QR & directions' })}
  </div></fieldset>
  <fieldset class="fieldset"><legend>Couple photo <span class="muted">(optional)</span></legend>
    ${photoEditor('couple', p)}
  </fieldset>
  <fieldset class="fieldset advanced-only"><legend>Family photos for the website gallery</legend>
    <p class="muted">Up to 6 photos. Used only in the wedding website package.</p>
    <div class="photo-actions" style="margin-top:10px">${(d.photos.family || []).map((f, i) => `<div class="thumb" style="width:70px;height:70px;border-radius:8px;background:url('${f.src}') center/cover;position:relative"><button type="button" class="icon-btn" data-act="rm-family" data-i="${i}" aria-label="Remove family photo ${i + 1}" style="position:absolute;right:-10px;top:-10px;width:30px;height:30px;background:var(--panel)">${icon('x')}</button></div>`).join('')}
    ${(d.photos.family || []).length < 6 ? `<label class="btn btn-outline btn-sm file-btn">${icon('upload')}Add photos<input type="file" accept="image/*" multiple hidden data-upload="family"></label>` : ''}</div>
  </fieldset>
  <fieldset class="fieldset advanced-only"><legend>Your story <span class="muted">(website only)</span></legend>
    ${field('A few lines about how you met', 'couple.story', { type: 'textarea', full: true })}
  </fieldset>`;
};

function photoEditor(kind, p, evIdx) {
  const base = kind === 'couple' ? 'photos.couple' : `events.${evIdx}.photo`;
  return `<div class="photo-box">
    <div class="thumb" style="${p?.src ? `background-image:url('${p.src}')` : ''}">${p?.src ? '' : icon('image')}</div>
    <div style="flex:1;display:grid;gap:8px">
      <div class="photo-actions">
        <label class="btn btn-outline btn-sm file-btn">${icon('upload')}${p?.src ? 'Replace' : 'Upload photo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-upload="${kind}" ${evIdx != null ? `data-ev="${evIdx}"` : ''}></label>
        ${p?.src ? `<button type="button" class="btn btn-text danger btn-sm" data-act="rm-photo" data-kind="${kind}" ${evIdx != null ? `data-ev="${evIdx}"` : ''}>${icon('trash')}Remove</button>` : ''}
        ${kind === 'couple' && p?.src ? `<label class="vis"><input type="checkbox" data-bind="show.photo" ${D().show.photo ? 'checked' : ''}> Show on card</label>` : ''}
      </div>
      ${p?.src ? `${range('Zoom', base + '.zoom', 1, 3, 0.05, v => (+v).toFixed(2) + '×')}
      ${range('Horizontal position', base + '.x', -1, 1, 0.02, v => Math.round(v * 100))}
      ${range('Vertical position', base + '.y', -1, 1, 0.02, v => Math.round(v * 100))}
      ${kind === 'couple' ? select('Photo frame shape', 'style.photoShape', [['arch', 'Arch'], ['circle', 'Circle'], ['rounded', 'Rounded'], ['square', 'Square']]) : ''}` : `<p class="muted">JPEG, PNG or WebP up to ${CONFIG.maxPhotoMB} MB. Photos are resized and kept on this device.</p>`}
    </div></div>`;
}

R[4] = () => {
  const d = D();
  return `
  <h2>Family &amp; wording</h2>
  <p class="lead">Use the suggested wording or write your own. Tick <em>Show</em> to include a line or untick it to hide it.</p>
  <fieldset class="fieldset"><div class="fs-head"><span class="fs-title">Invocation / blessing</span><label class="vis"><input type="checkbox" data-bind="show.invocation" ${d.show.invocation ? 'checked' : ''}> Show</label></div>
    ${select('Choose', 'wording.invocation', INVOCATIONS.map(i => [i.id, i.label]), { full: true })}
    ${d.wording.invocation === 'custom' ? `<div class="fgrid" style="margin-top:10px">${bilingual('Your invocation', 'wording.invocationCustom', { full: true, alwaysHi: true })}</div>` : `<p class="muted" style="margin-top:6px" lang="hi">${esc(invocationText(d, d.lang === 'en' ? 'en' : 'hi')) || 'No invocation will be shown.'}</p>`}
  </fieldset>
  <fieldset class="fieldset"><div class="fs-head"><span class="fs-title">Opening line</span><label class="vis"><input type="checkbox" data-bind="show.headline" ${d.show.headline ? 'checked' : ''}> Show</label></div>
    ${presetPicker('headline')}
    <div class="fgrid">${bilingual('Opening line', 'wording.headline', { full: true })}</div>
  </fieldset>
  <fieldset class="fieldset"><div class="fs-head"><span class="fs-title">Parents</span><label class="vis"><input type="checkbox" data-bind="show.parents" ${d.show.parents ? 'checked' : ''}> Show</label></div>
    <div class="fgrid">${bilingual("Bride's parents", 'family.brideParents', { full: true, ph: 'Mrs. … & Mr. …' })}${bilingual("Groom's parents", 'family.groomParents', { full: true })}</div>
  </fieldset>
  <fieldset class="fieldset advanced-only"><div class="fs-head"><span class="fs-title">Grandparents</span><label class="vis"><input type="checkbox" data-bind="show.grandparents" ${d.show.grandparents ? 'checked' : ''}> Show</label></div>
    <div class="fgrid">${bilingual("Bride's grandparents", 'family.brideGrand', { full: true })}${bilingual("Groom's grandparents", 'family.groomGrand', { full: true })}</div>
  </fieldset>
  <fieldset class="fieldset"><div class="fs-head"><span class="fs-title">Hosts &amp; family names</span></div>
    <div class="fgrid">
      <div class="full fs-head" style="margin:0"><span class="label">Invitation hosts (closing page)</span><label class="vis"><input type="checkbox" data-bind="show.hosts" ${d.show.hosts ? 'checked' : ''}> Show</label></div>
      ${bilingual('Hosts', 'family.hosts', { full: true })}
      <div class="full fs-head advanced-only" style="margin:0"><span class="label">Family names (cover)</span><label class="vis"><input type="checkbox" data-bind="show.familyNames" ${d.show.familyNames ? 'checked' : ''}> Show</label></div>
      ${bilingual('Family names', 'family.familyNames', { full: true, cls: 'advanced-only' })}
    </div>
  </fieldset>
  <fieldset class="fieldset"><div class="fs-head"><span class="fs-title">Personal message</span><label class="vis"><input type="checkbox" data-bind="show.message" ${d.show.message ? 'checked' : ''}> Show</label></div>
    ${presetPicker('message')}
    <div class="fgrid">${bilingual('Message', 'wording.message', { type: 'textarea', full: true })}</div>
  </fieldset>
  <fieldset class="fieldset"><div class="fs-head"><span class="fs-title">Closing</span></div>
    ${presetPicker('closing')}
    <div class="fgrid">${bilingual('Closing line', 'wording.closing', { full: true })}</div>
  </fieldset>
  <fieldset class="fieldset"><div class="fs-head"><span class="fs-title">RSVP</span><label class="vis"><input type="checkbox" data-bind="show.rsvp" ${d.show.rsvp ? 'checked' : ''}> Show</label></div>
    <div class="fgrid">
      ${field('Contact name', 'rsvp.name')}
      ${field('Phone / WhatsApp', 'rsvp.phone', { type: 'tel', ph: '+91 …', hint: 'with country code' })}
      ${field('Email', 'rsvp.email', { type: 'email', hint: 'optional' })}
      ${field('RSVP note', 'rsvp.note', { ph: 'Kindly confirm by …' })}
    </div>
  </fieldset>`;
};
function presetPicker(key) {
  return `<div class="field" style="margin-bottom:10px"><span><label for="preset-${key}">Suggestions</label></span><select id="preset-${key}" data-preset="${key}"><option value="">Choose a suggested line…</option>${WORDING[key].map((w, i) => `<option value="${i}">${esc(w.en)} / ${esc(w.hi)}</option>`).join('')}</select></div>`;
}

R[5] = () => {
  const d = D();
  return `
  <h2>Wedding functions</h2>
  <p class="lead">These are suggestions for your tradition. Add, rename, reorder, duplicate or delete them. Each function gets its own card.</p>
  <ul class="event-list" id="event-list">${d.events.map((e, i) => eventItem(e, i)).join('')}</ul>
  ${d.events.length ? '' : '<div class="empty"><p>No functions yet. Add one below.</p></div>'}
  <div class="add-row">
    <label class="sr" for="add-preset">Function to add</label>
    <select id="add-preset">${EVENT_PICKER.map(id => `<option value="${id}">${esc(EVENT_PRESETS[id].name.en)} · ${esc(EVENT_PRESETS[id].name.hi)}</option>`).join('')}</select>
    <button type="button" class="btn btn-maroon" data-act="add-event">${icon('plus')}Add</button>
  </div>
  <div class="inline" style="margin-top:10px">
    <button type="button" class="btn btn-text btn-sm" data-act="sort-events">Sort by date &amp; time</button>
    <label class="vis">${'<input type="checkbox" data-bind="show.eventsOnCover" ' + (d.show.eventsOnCover ? 'checked' : '') + '>'} List functions on the cover too</label>
  </div>
  <div class="sep"></div>
  <p class="h3">Timeline</p>
  ${d.events.length ? `<ol class="timeline">${sortedEvents(d).map(e => `<li><strong>${esc(e.name.en || e.name.hi)}</strong><small>${esc([fmtDate(e.date, 'en'), fmtTimeRange(e.start, e.end, 'en'), e.venue].filter(Boolean).join(' · ') || 'Date to be added')}</small></li>`).join('')}</ol>` : '<p class="muted">Your functions will appear here in date order.</p>'}`;
};
function eventItem(e, i) {
  const d = D();
  const open = ui.openEvent === e.id;
  const bad = Object.keys(ui.errors).some(k => k.startsWith(`events.${i}.`));
  const sub = [e.date ? fmtDate(e.date, 'en', { short: true }) : 'No date', fmtTimeRange(e.start, e.end, 'en')].filter(Boolean).join(' · ');
  return `<li class="ev ${bad ? 'invalid' : ''}" data-id="${e.id}">
    <div class="ev-head">
      <button type="button" class="ev-title" data-act="toggle-event" data-id="${e.id}" aria-expanded="${open}"><strong>${esc(e.name.en || e.name.hi || 'Untitled function')}</strong><small>${esc(sub)}</small></button>
      <div class="ev-tools">
        <button type="button" class="icon-btn" data-act="ev-up" data-i="${i}" aria-label="Move ${esc(e.name.en)} up" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
        <button type="button" class="icon-btn" data-act="ev-down" data-i="${i}" aria-label="Move ${esc(e.name.en)} down" ${i === d.events.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
        <button type="button" class="icon-btn" data-act="ev-dup" data-i="${i}" aria-label="Duplicate ${esc(e.name.en)}">${icon('copy')}</button>
        <button type="button" class="icon-btn danger" data-act="ev-del" data-i="${i}" aria-label="Delete ${esc(e.name.en)}">${icon('trash')}</button>
      </div>
    </div>
    ${open ? `<div class="ev-body"><div class="fgrid">
      ${bilingual('Function name', `events.${i}.name`, { req: true, alwaysHi: d.lang !== 'en' })}
      ${field('Date', `events.${i}.date`, { type: 'date', req: true })}
      ${field('Starts', `events.${i}.start`, { type: 'time' })}
      ${field('Ends', `events.${i}.end`, { type: 'time', hint: 'optional' })}
      ${field('Venue', `events.${i}.venue`)}
      ${field('Address', `events.${i}.address`, { full: true })}
      ${field('Google Maps link', `events.${i}.maps`, { type: 'url', full: true, ph: 'https://maps.app.goo.gl/…' })}
      ${field('Dress code / instructions', `events.${i}.dress`, { full: true, hint: 'optional' })}
      ${bilingual('Short message', `events.${i}.msg`, { full: true, type: 'textarea', rows: 2 })}
      ${select('Icon', `events.${i}.icon`, [['ring', 'Ring'], ['diya', 'Diya'], ['marigold', 'Marigold'], ['leaf', 'Leaf'], ['music', 'Music'], ['arch', 'Mandap arch'], ['moon', 'Moon & star'], ['bell', 'Bell'], ['flower', 'Flower'], ['star', 'Star']])}
      ${select('Separate design', `events.${i}.ownTemplate`, [['', 'Same as invitation'], ...TEMPLATES.map(t => [t.id, t.name])], { cls: 'advanced-only' })}
      <div class="full"><p class="label">Function photo <span class="hint">optional</span></p>${photoEditor('event', e.photo, i)}</div>
      <div class="full inline"><button type="button" class="btn btn-outline btn-sm" data-act="preview-event" data-i="${i}">${icon('eye')}Preview this card</button></div>
    </div></div>` : ''}
  </li>`;
}

R[6] = () => {
  const d = D();
  const s = d.style;
  const tpl = TEMPLATE_MAP[d.templateId];
  const fontOpts = (list, def) => [['', `Template default (${def})`], ...list.map(f => [f, f])];
  return `
  <h2>Customize the design</h2>
  <p class="lead">${d.style.mode === 'easy' ? 'Easy mode shows the essentials. Switch to Advanced (top bar) for fonts, custom colours and more.' : 'Advanced controls. The preview uses the same renderer as the export.'}</p>
  <fieldset class="fieldset"><legend>Colour palette</legend>
    <div class="swatches">${PALETTES.map(p => {
      const c = p.colors || tpl.palette;
      return `<button type="button" class="swatch" data-palette="${p.id}" aria-pressed="${(s.palette || 'template') === p.id}"><span class="dots"><i style="background:${c.bg}"></i><i style="background:${c.accent}"></i><i style="background:${c.ink}"></i></span>${esc(p.name)}</button>`;
    }).join('')}</div>
    <div class="fgrid advanced-only" style="margin-top:12px">
      ${['bg', 'ink', 'accent'].map(k => `<div class="field"><span><label for="cc-${k}">${{ bg: 'Background', ink: 'Text', accent: 'Accent / gold' }[k]}</label></span><input id="cc-${k}" type="color" data-color="${k}" value="${(s.custom?.[k]) || paletteFor(d, tpl).pal[k]}" style="padding:2px;height:44px"></div>`).join('')}
      <div class="field"><span>&nbsp;</span><button type="button" class="btn btn-text btn-sm" data-act="clear-colors">Clear custom colours</button></div>
    </div>
  </fieldset>
  <fieldset class="fieldset"><legend>Typography</legend><div class="fgrid">
    ${select('Names font', 'style.fontScript', fontOpts([...new Set([...FONTS.script, ...FONTS.display])], tpl.fonts.script))}
    ${select('Headings font', 'style.fontDisplay', fontOpts(FONTS.display, tpl.fonts.display), { cls: 'advanced-only' })}
    ${select('Body font', 'style.fontBody', fontOpts(FONTS.body, tpl.fonts.body), { cls: 'advanced-only' })}
    ${select('Hindi (Devanagari) font', 'style.fontDeva', fontOpts(FONTS.deva, tpl.fonts.deva))}
    ${range('Text size', 'style.scale', 0.8, 1.25, 0.01, v => Math.round(v * 100) + '%')}
    ${range('Names size', 'style.nameScale', 0.7, 1.3, 0.01, v => Math.round(v * 100) + '%')}
    ${range('Line spacing', 'style.lineHeight', 0.85, 1.35, 0.01, v => Math.round(v * 100) + '%', 'advanced-only')}
    ${select('Heading weight', 'style.weight', [['normal', 'Regular'], ['bold', 'Semi-bold']], { cls: 'advanced-only' })}
    ${select('Alignment', 'style.align', [['center', 'Centred'], ['left', 'Left'], ['right', 'Right']], { cls: 'advanced-only' })}
  </div></fieldset>
  <fieldset class="fieldset"><legend>Decoration</legend><div class="fgrid">
    ${select('Ornaments', 'style.ornaments', [['full', 'Full ornaments'], ['minimal', 'Minimal'], ['none', 'None (clean)']])}
    ${select('Frame / border', 'style.frame', [['template', 'Template default'], ['double', 'Double line'], ['thin', 'Thin line'], ['arch', 'Arch'], ['kasavu', 'Kasavu bands'], ['phulkari', 'Phulkari'], ['brocade', 'Brocade'], ['paithani', 'Paithani'], ['alpana', 'Alpana'], ['none', 'No frame']])}
    <div class="full">${check('Background pattern', 'style.pattern')}</div>
  </div></fieldset>
  <fieldset class="fieldset"><legend>Visibility</legend>
    <div class="checks">${[['invocation', 'Invocation'], ['headline', 'Opening line'], ['parents', 'Parents'], ['grandparents', 'Grandparents'], ['familyNames', 'Family names'], ['hosts', 'Hosts'], ['date', 'Date'], ['time', 'Time'], ['muhurat', 'Muhurat'], ['venue', 'Venue'], ['address', 'Address'], ['message', 'Message'], ['photo', 'Couple photo'], ['hashtag', 'Hashtag'], ['rsvp', 'RSVP'], ['qr', 'QR codes'], ['dress', 'Dress codes'], ['eventMsg', 'Function messages'], ['eventsOnCover', 'Functions on cover']]
      .map(([k, l]) => check(l, 'show.' + k)).join('')}</div>
  </fieldset>
  <div class="inline" style="margin-bottom:16px">
    <button type="button" class="btn btn-outline btn-sm" data-act="reset-style">Reset styling</button>
    <button type="button" class="btn btn-outline btn-sm" data-act="duplicate">${icon('copy')}Duplicate design</button>
    <button type="button" class="btn btn-text danger btn-sm" data-act="start-over">Start over</button>
  </div>`;
};

R[7] = () => {
  const d = D(), v = d.video;
  const sup = videoSupport();
  return `
  <h2>Music &amp; video</h2>
  <p class="lead">Turn your cards into an animated invitation. Press <strong>Play preview</strong> to watch it in the preview area.</p>
  <fieldset class="fieldset"><legend>Video</legend><div class="fgrid">
    ${select('Format', 'video.format', Object.entries(VIDEO_FORMATS).map(([k, f]) => [k, f.label]), { full: true })}
    ${select('Length', 'video.length', [['short', 'Short (about 15–20 s)'], ['long', 'Extended (one scene per function)']])}
    ${select('Transition', 'video.transition', [['fade', 'Soft crossfade'], ['zoom', 'Slow zoom + fade'], ['slide', 'Slide']])}
    ${select('Effects', 'video.particles', [['petals', 'Falling petals'], ['sparkles', 'Gold sparkles'], ['none', 'None']])}
    <div class="field">${check('Include functions', 'video.timeline')}</div>
  </div>
  <p class="muted" style="margin-top:8px" id="video-len"></p></fieldset>
  <fieldset class="fieldset"><legend>Music</legend>
    <div class="radio-cards" style="grid-template-columns:1fr">${TRACKS.map(t => `<label class="radio-card"><input type="radio" name="track" value="${t.id}" data-bind="video.track" ${v.track === t.id ? 'checked' : ''}><strong>${esc(t.name)}${t.id === 'upload' && v.audioName ? `: ${esc(v.audioName)}` : ''}</strong>${t.desc ? `<small>${esc(t.desc)}</small>` : ''}</label>`).join('')}</div>
    ${v.track === 'upload' ? `<div class="inline" style="margin-top:12px"><label class="btn btn-outline btn-sm file-btn">${icon('upload')}${v.audioName ? 'Replace audio' : 'Choose audio file'}<input type="file" accept="audio/*" hidden data-upload="audio"></label><span class="muted">MP3, M4A, WAV or OGG, up to ${CONFIG.maxAudioMB} MB</span></div>` : ''}
    ${v.track !== 'none' ? `<div class="fgrid" style="margin-top:12px">
      ${range('Volume', 'video.volume', 0, 1, 0.05, x => Math.round(x * 100) + '%')}
      ${v.track === 'upload' && ui.audioDur ? range('Start from', 'video.start', 0, Math.max(0, Math.floor(ui.audioDur - 5)), 1, x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`) : ''}
    </div>
    <div class="inline" style="margin-top:8px"><button type="button" class="btn btn-outline btn-sm" data-act="music-test">${icon(isPlaying() ? 'pause' : 'music')}${isPlaying() ? 'Stop music' : 'Listen to music'}</button></div>` : ''}
    <p class="note" style="margin-top:12px">${icon('info')}<span>Only upload music you have the right to use. We never download songs from YouTube, Spotify or other services. Instagram and WhatsApp may mute copyrighted audio after you share, and exporting doesn't guarantee the music stays audible. The three built-in tracks are original compositions generated in your browser.</span></p>
  </fieldset>
  <div class="inline">
    <button type="button" class="btn btn-gold" data-act="video-preview">${icon(ui.playing ? 'pause' : 'play')}${ui.playing ? 'Stop preview' : 'Play preview'}</button>
    <button type="button" class="btn btn-maroon" data-act="video-export" ${sup.mime ? '' : 'disabled'}>${icon('film')}Export video${sup.mime ? ` (${sup.mime.ext.toUpperCase()})` : ''}</button>
  </div>
  <div id="video-progress" style="margin-top:12px"></div>
  <p class="muted" style="margin-top:10px">${sup.mime ? `Your browser will record <strong>${sup.mime.ext.toUpperCase()}</strong>${sup.mime.ext === 'webm' ? '. WhatsApp and Instagram prefer MP4, so for MP4 use recent Chrome, Edge or Safari, or convert the file afterwards' : ''}. Recording runs in real time, so keep this tab open and visible.` : 'Video export is not supported in this browser. You can still download every card as an image or PDF in step 9.'}</p>`;
};

R[8] = () => `
  <h2>Preview all pages</h2>
  <p class="lead">Every page in the selected format. Select a page to view it larger, or change the format above the preview.</p>
  <div class="field" style="margin-bottom:14px"><span><label for="pv-fmt">Format</label></span><select id="pv-fmt">${Object.entries(FORMATS).map(([k, f]) => `<option value="${k}" ${ui.fmt === k ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select></div>
  <div class="preview-grid" id="pv-grid">${pagesFor().map((p, i) => `<button type="button" data-page="${i}"><canvas width="${thumbSize().w}" height="${thumbSize().h}" aria-hidden="true"></canvas>${esc(p.label)}</button>`).join('')}</div>
  <div class="sep"></div>
  <p class="h3">Save-the-date</p>
  <div class="preview-grid"><button type="button" data-savedate="1"><canvas width="${thumbSize().w}" height="${thumbSize().h}" id="pv-sd" aria-hidden="true"></canvas>Save the Date</button></div>`;
const thumbSize = () => { const f = FORMATS[ui.fmt]; const k = 260 / Math.max(f.w, f.h); return { w: Math.round(f.w * k), h: Math.round(f.h * k) }; };

R[9] = () => {
  const d = D();
  const pages = pagesFor();
  const pageOpts = [...pages.map((p, i) => [String(i), p.label]), ['sd', 'Save the Date']];
  const fmtOpts = Object.entries(FORMATS).map(([k, f]) => `<option value="${k}" ${ui.fmt === k ? 'selected' : ''}>${esc(f.label)} · ${f.w}×${f.h}</option>`).join('');
  const shareSupported = !!navigator.share;
  return `
  <h2>Download &amp; share</h2>
  <p class="lead">Files are created on your device at full resolution. Nothing is uploaded.</p>
  ${Object.keys(ui.errors).length ? `<p class="note" style="border-left-color:var(--danger)">${icon('info')}<span>Some details still need attention. <button class="btn btn-text btn-sm" data-act="goto-error" style="padding:0;min-height:0;text-decoration:underline">Review</button></span></p>` : ''}
  <fieldset class="fieldset"><legend>Images</legend>
    <div class="fgrid">
      <div class="field"><span><label for="dl-page">Page</label></span><select id="dl-page">${pageOpts.map(([v, l]) => `<option value="${v}" ${String(ui.page) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="field"><span><label for="dl-fmt">Size</label></span><select id="dl-fmt">${fmtOpts}</select></div>
    </div>
    <div class="dl-list" style="margin-top:12px">
      ${dlItem('png', 'PNG image', 'Lossless, best for sharing')}
      ${dlItem('jpg', 'High-resolution JPEG', 'Smaller file, quality 93%')}
      ${dlItem('social', 'Instagram set', 'Cover as 9:16 story, 4:5 post and 1:1 square (3 PNGs)')}
    </div>
  </fieldset>
  <fieldset class="fieldset"><legend>Print-ready PDF</legend>
    <div class="fgrid">
      ${select('Paper size', 'print.size', [['5x7', '5 × 7 in (127 × 178 mm)'], ['a5', 'A5 (148 × 210 mm)'], ['a4', 'A4 (210 × 297 mm)']])}
      <div class="field"><span>&nbsp;</span>${check('Add 3 mm bleed + crop marks', 'print.bleed')}</div>
    </div>
    <div class="dl-list" style="margin-top:12px">
      ${dlItem('pdf-all', 'Complete invitation PDF', `${pages.length} page${pages.length === 1 ? '' : 's'}, all in one file`)}
      ${dlItem('pdf-one', 'Selected page as PDF', 'The page chosen under Images')}
      ${d.events.length ? dlItem('zip', 'All function cards', `${d.events.length} separate high-quality JPEG cards in a ZIP, at the size chosen above`) : ''}
    </div>
    <p class="muted" style="margin-top:8px">300 dpi. Keep important text inside the frame. Most print shops prefer PDF with bleed.</p>
  </fieldset>
  <fieldset class="fieldset"><legend>Video &amp; website</legend>
    <div class="dl-list">
      <div class="dl-item">${icon('film')}<div class="dl-info"><strong>Video invitation</strong><small>${esc(VIDEO_FORMATS[d.video.format].label)} · music: ${esc(TRACKS.find(t => t.id === d.video.track)?.name || 'none')}</small></div><button class="btn btn-outline btn-sm" type="button" data-goto="7">Set up &amp; export</button></div>
      <div class="dl-item">${icon('globe')}<div class="dl-info"><strong>Wedding website (.zip)</strong><small>Static site with countdown, functions, gallery, WhatsApp RSVP</small><span class="dl-result" data-res="site"></span></div><button class="btn btn-text btn-sm" type="button" data-act="site-preview">Preview</button><button class="btn btn-maroon btn-sm" type="button" data-dl="site">${icon('download')}ZIP</button></div>
    </div>
    <div class="checks" style="margin-top:10px">${check('Countdown', 'site.countdown')}${check('Our story', 'site.story')}${check('Photo gallery', 'site.gallery')}${check('Background music button', 'site.music')}${check('Blessings box (sent via WhatsApp)', 'site.blessings')}</div>
    <p class="note" style="margin-top:10px">${icon('info')}<span>The site is a package you host yourself, free on GitHub Pages, Netlify Drop or Cloudflare Pages. Instructions are inside the ZIP. This studio can't publish a link for you or store RSVPs.</span></p>
  </fieldset>
  <fieldset class="fieldset"><legend>Share</legend>
    ${field('Your wedding website link', 'site.url', { type: 'url', full: true, ph: 'https://yourname.github.io/our-wedding/', hint: 'after you host it' })}
    <div class="share-grid" style="margin-top:12px">
      <button class="btn btn-gold" type="button" data-act="share-image">${icon('share')}Share invitation image</button>
      <a class="btn btn-maroon" id="wa-link" href="#" target="_blank" rel="noopener">${icon('chat')}Send on WhatsApp</a>
      <button class="btn btn-outline" type="button" data-act="copy-wording">${icon('copy')}Copy invitation text</button>
      <button class="btn btn-outline" type="button" data-act="copy-link" ${d.site.url ? '' : 'disabled'}>${icon('globe')}Copy website link</button>
    </div>
    <p class="muted" style="margin-top:8px">${shareSupported ? 'Share opens your device’s share sheet so you can pick WhatsApp, Instagram and other apps.' : 'Your browser has no share sheet. Download the image and attach it in WhatsApp or Instagram yourself.'} WhatsApp links can only carry text, so attach images and videos as files.</p>
    <div class="field" style="margin-top:12px"><span><label for="wa-text">WhatsApp message</label><span class="hint">editable</span></span><textarea id="wa-text" rows="7">${esc(invitationText(d))}</textarea></div>
    <div class="sep"></div>
    <p class="h3">QR code</p>
    <div class="fgrid"><div class="field full"><span><label for="qr-target">Link to</label></span><select id="qr-target">
      ${d.site.url ? `<option value="${esc(d.site.url)}">Wedding website</option>` : ''}
      ${d.wedding.maps ? `<option value="${esc(d.wedding.maps)}">Wedding venue directions</option>` : ''}
      ${d.events.filter(e => e.maps).map(e => `<option value="${esc(e.maps)}">${esc(e.name.en)} directions</option>`).join('')}
      ${d.rsvp.phone ? `<option value="${esc(waLink(rsvpMessage(d), d.rsvp.phone))}">WhatsApp RSVP</option>` : ''}
    </select></div></div>
    <div class="qr-out"><canvas id="qr-canvas" width="240" height="240" aria-label="QR code"></canvas><div style="display:grid;gap:8px"><button class="btn btn-outline btn-sm" type="button" data-act="qr-dl">${icon('download')}Download QR (PNG)</button><p class="muted">QR codes for venue maps appear on function cards and the closing page when <em>QR codes</em> is ticked in Customize.</p></div></div>
    <div class="sep"></div>
    <p class="h3">RSVP on WhatsApp</p>
    ${d.rsvp.phone ? `<div class="inline"><button class="btn btn-outline btn-sm" type="button" data-act="copy-rsvp">${icon('copy')}Copy RSVP link</button><button class="btn btn-text btn-sm" type="button" data-act="copy-rsvp-tpl">Copy RSVP reply template</button></div>` : '<p class="muted">Add a phone number in step 4 to create an RSVP link.</p>'}
    <div class="sep"></div>
    <p class="h3">Captions &amp; hashtags</p>
    <div class="dl-list">${captions(d).map((c, i) => `<div class="dl-item"><div class="dl-info"><small style="font-size:.88rem;color:var(--ink)">${esc(c)}</small></div><button class="icon-btn" type="button" data-copy-cap="${i}" aria-label="Copy caption ${i + 1}">${icon('copy')}</button></div>`).join('')}</div>
    <p style="margin-top:10px;font-size:.88rem;color:var(--ink-2)" id="tags">${esc(hashtags(d).join(' '))}</p>
    <button class="btn btn-text btn-sm" type="button" data-act="copy-tags">${icon('copy')}Copy hashtags</button>
  </fieldset>
  <fieldset class="fieldset"><legend>Your design</legend>
    <div class="inline"><button class="btn btn-outline btn-sm" type="button" data-act="save-now">${icon('save')}Save draft</button><button class="btn btn-outline btn-sm" type="button" data-act="backup">${icon('download')}Export backup (.json)</button><button class="btn btn-outline btn-sm" type="button" data-act="duplicate">${icon('copy')}Duplicate</button></div>
    <p class="muted" style="margin-top:8px">Drafts are saved in this browser on this device only. Use a backup file to move a design to another device.</p>
  </fieldset>`;
};
function dlItem(key, title, sub) {
  return `<div class="dl-item">${icon(key.startsWith('pdf') ? 'download' : key === 'zip' ? 'copy' : 'image')}<div class="dl-info"><strong>${esc(title)}</strong><small>${esc(sub)}</small><span class="dl-result" data-res="${key}"></span></div><button class="btn btn-maroon btn-sm" type="button" data-dl="${key}">${icon('download')}Download</button></div>`;
}

// ---------- pages / preview ----------
function pagesFor(fmt = ui.fmt) { return pageList(D(), fmt); }
function currentPage() {
  const list = pagesFor();
  if (ui.page === 'sd') return { kind: 'savedate', label: 'Save the Date' };
  return list[Math.min(ui.page, list.length - 1)] || list[0];
}

const off = document.createElement('canvas');
let rafId = 0;
function schedulePreview() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => { rafId = 0; drawPreview(); });
}
function drawPreview() {
  if (ui.playing) return;
  const d = D(); if (!d) return;
  const f = FORMATS[ui.fmt];
  const k = Math.min(1, 2100 / Math.max(f.w, f.h));
  const W = Math.round(f.w * k), H = Math.round(f.h * k);
  off.width = W; off.height = H;
  const res = renderPage(off.getContext('2d'), W, H, d, currentPage());
  const cv = $('#stage-canvas');
  const wrap = $('#stage-canvas-wrap');
  const box = wrap.getBoundingClientRect();
  const fit = Math.min((box.width || 400) / W, (box.height || 560) / H, 1);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.max(1, Math.round(W * fit)), ch = Math.max(1, Math.round(H * fit));
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, 0, 0, cv.width, cv.height);
  const p = currentPage();
  cv.setAttribute('aria-label', `Preview: ${p.label} page, ${f.label}`);
  const note = $('#stage-note');
  if (res.dropped > 0) { note.textContent = `Text was shortened to fit: ${res.dropped} optional line${res.dropped > 1 ? 's were' : ' was'} left out. Shorten the wording or hide some lines.`; note.classList.add('warn'); }
  else { note.textContent = `${f.label} · ${f.w} × ${f.h} px — the export matches this preview.`; note.classList.remove('warn'); }
}

function renderTabs() {
  const pages = pagesFor();
  if (ui.page !== 'sd' && ui.page >= pages.length) ui.page = 0;
  const tabs = [...pages.map((p, i) => [i, p.label]), ['sd', 'Save the Date']];
  $('#page-tabs').innerHTML = tabs.map(([i, l]) => `<button type="button" role="tab" data-page="${i}" aria-selected="${String(ui.page) === String(i)}">${esc(l)}</button>`).join('');
}

// ---------- panel ----------
function renderPanel({ keepScroll = false } = {}) {
  const panel = $('#panel');
  const st = panel.scrollTop;
  const d = D();
  $('#view-studio').dataset.mode = d.style.mode || 'easy';
  panel.innerHTML = `<div class="panel-content">${R[ui.step]()}</div>
    <div class="panel-foot">
      <button type="button" class="btn btn-outline" data-act="back" ${ui.step === 1 ? 'disabled' : ''}>${icon('left')}Back</button>
      <span class="muted" style="align-self:center">Step ${ui.step} of 9</span>
      ${ui.step < 9 ? `<button type="button" class="btn btn-maroon" data-act="next">Next${icon('right')}</button>` : `<button type="button" class="btn btn-gold" data-act="save-now">${icon('save')}Save</button>`}
    </div>`;
  if (keepScroll) panel.scrollTop = st; else panel.scrollTop = 0;
  renderStepper();
  afterPanel();
}
function renderStepper() {
  $('#stepper').innerHTML = STEPS.map(s => {
    const err = stepErrors(s.id);
    return `<button type="button" data-step="${s.id}" ${ui.step === s.id ? 'aria-current="step"' : ''} class="${err ? 'err' : ui.visited.has(s.id) && s.id !== ui.step ? 'done' : ''}"><span class="num">${s.id}</span>${s.name}${err ? '<span class="sr"> (needs attention)</span>' : ''}</button>`;
  }).join('');
  $('#stepper [aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
}
function stepErrors(step) {
  const keys = Object.keys(ui.errors);
  if (step === 3) return keys.some(k => /^(couple|wedding)\./.test(k));
  if (step === 4) return keys.some(k => /^rsvp\./.test(k));
  if (step === 5) return keys.some(k => /^events\./.test(k));
  return false;
}

function afterPanel() {
  if (ui.step === 1) drawMiniThumbs();
  if (ui.step === 7) updateVideoLen();
  if (ui.step === 8) drawPreviewGrid();
  if (ui.step === 9) { updateWa(); drawQRBox(); }
}

let thumbJob = 0;
function drawMiniThumbs() {
  const job = ++thumbJob;
  const btns = $$('#mini-grid .mini');
  let i = 0;
  const next = () => {
    if (job !== thumbJob || i >= btns.length) return;
    const b = btns[i++];
    const c = b.querySelector('canvas');
    renderPage(c.getContext('2d'), c.width, c.height, D(), { kind: 'cover' }, { templateId: b.dataset.tpl });
    idle(next);
  };
  next();
}
function drawPreviewGrid() {
  const job = ++thumbJob;
  const pages = pagesFor();
  const cs = $$('#pv-grid canvas');
  let i = 0;
  const next = () => {
    if (job !== thumbJob) return;
    if (i < cs.length) { const c = cs[i]; renderPage(c.getContext('2d'), c.width, c.height, D(), pages[i]); i++; idle(next); }
    else { const c = $('#pv-sd'); if (c) renderPage(c.getContext('2d'), c.width, c.height, D(), { kind: 'savedate' }); }
  };
  next();
}
function updateVideoLen() {
  const el = $('#video-len'); if (!el) return;
  const tl = new Timeline(D(), 10, 10);
  el.textContent = `Duration about ${Math.round(tl.total)} seconds · ${tl.scenes.length} scenes · ${VIDEO_FORMATS[D().video.format].w}×${VIDEO_FORMATS[D().video.format].h}`;
}
function updateWa() {
  const t = $('#wa-text'); const a = $('#wa-link');
  if (t && a) a.href = waLink(t.value);
}
function drawQRBox() {
  const sel = $('#qr-target'), c = $('#qr-canvas');
  if (!sel || !c) return;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  if (!sel.value) { ctx.fillStyle = '#8a766c'; ctx.font = '14px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Add a maps or website link', 120, 124); return; }
  const q = qrCanvas(sel.value, 240);
  if (q) ctx.drawImage(q, 0, 0); else { ctx.fillStyle = '#a3222d'; ctx.font = '14px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('QR library unavailable', 120, 124); }
}

// ---------- validation ----------
const PHONE = /^\+?[\d\s()-]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validate() {
  const d = D(), e = {};
  // the name must exist in the language shown on the card (Hindi falls back to English)
  const has = o => (d.lang === 'hi' ? (o.hi || o.en || '').trim() : (o.en || '').trim());
  if (!has(d.couple.bride)) e[d.lang === 'hi' ? 'couple.bride.hi' : 'couple.bride.en'] = "Please enter the bride's name.";
  if (!has(d.couple.groom)) e[d.lang === 'hi' ? 'couple.groom.hi' : 'couple.groom.en'] = "Please enter the groom's name.";
  if (!d.wedding.date) e['wedding.date'] = 'Please choose the wedding date.';
  else if (!parseDate(d.wedding.date)) e['wedding.date'] = 'This date is not valid.';
  if (d.wedding.maps && !isUrl(d.wedding.maps)) e['wedding.maps'] = 'Paste a full link starting with https://';
  if (d.rsvp.phone && !PHONE.test(d.rsvp.phone)) e['rsvp.phone'] = 'Use digits with an optional + country code.';
  if (d.rsvp.email && !EMAIL.test(d.rsvp.email)) e['rsvp.email'] = 'This email address looks incomplete.';
  if (d.site.url && !isUrl(d.site.url)) e['site.url'] = 'Paste a full link starting with https://';
  d.events.forEach((ev, i) => {
    if (!has(ev.name)) e[`events.${i}.name.${d.lang === 'hi' ? 'hi' : 'en'}`] = 'Give this function a name.';
    if (!ev.date) e[`events.${i}.date`] = 'Choose a date.';
    if (ev.maps && !isUrl(ev.maps)) e[`events.${i}.maps`] = 'Paste a full link starting with https://';
    if (ev.start && ev.end && ev.end <= ev.start && ev.end > '04:00') e[`events.${i}.end`] = 'End time is before the start time.';
  });
  ui.errors = e;
  return e;
}
function errorsForStep(step) {
  const e = validate();
  return Object.keys(e).filter(k => (step === 3 ? /^(couple|wedding)\./ : step === 4 ? /^rsvp\./ : step === 5 ? /^events\./ : step === 9 ? /^site\./ : /^$/).test(k));
}

function goStep(n, { force = false } = {}) {
  n = Math.max(1, Math.min(9, n));
  if (!force && n > ui.step) {
    const errs = errorsForStep(ui.step);
    if (errs.length) {
      if (ui.step === 5) { const m = errs[0].match(/^events\.(\d+)/); if (m) ui.openEvent = D().events[+m[1]]?.id; }
      renderPanel({ keepScroll: true });
      const first = $('#panel [aria-invalid="true"]');
      first?.focus();
      toast('Please fix the highlighted fields before continuing.', 'err');
      return;
    }
  }
  stopVideo();
  ui.step = n; ui.visited.add(n);
  if (n === 9 || n === 8) validate();
  else ui.errors = Object.fromEntries(Object.entries(ui.errors).filter(() => false));
  renderPanel();
  history.replaceState(null, '', `#/studio?step=${n}`);
}

// ---------- events from panel ----------
function onInput(e) {
  const el = e.target;
  const path = el.dataset.bind;
  if (el.id === 'wa-text') { updateWa(); return; }
  if (el.dataset.color) {
    const k = el.dataset.color, v = el.value;
    store.update(d => { d.style.custom = { ...(d.style.custom || {}), [k]: v }; }, { coalesce: true });
    return;
  }
  if (!path) return;
  if (el.type === 'radio' && !el.checked) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.num || el.type === 'range') v = parseFloat(v);
  store.update(d => setPath(d, path, v), { coalesce: el.type !== 'checkbox' && el.type !== 'radio' && e.type === 'input' });
  const out = $(`[data-out="${CSS.escape(path)}"]`);
  if (out) out.textContent = rangeFmt(path, v);
  if (ui.errors[path] || ui.errors[path.replace(/\.hi$/, '.en')]) { // live-clear errors
    validate();
    const f = el.closest('.field');
    if (f && !ui.errors[path]) { f.classList.remove('invalid'); f.querySelector('.err-msg')?.remove(); el.removeAttribute('aria-invalid'); }
  }
  // structural changes need a panel refresh
  const rerender = ['type', 'lang', 'wording.invocation', 'couple.useFull', 'video.track', 'style.mode', 'site.url', 'print.size'];
  if (rerender.includes(path) || (el.type === 'radio')) { renderPanel({ keepScroll: true }); }
  if (/^events\.\d+\.(name|date|start|end)/.test(path) && e.type === 'change') renderPanel({ keepScroll: true });
  if (path.startsWith('video.')) updateVideoLen();
}
function rangeFmt(path, v) {
  if (/zoom$/.test(path)) return v.toFixed(2) + '×';
  if (/\.(x|y)$/.test(path)) return Math.round(v * 100);
  if (/scale|nameScale|lineHeight|volume/i.test(path)) return Math.round(v * 100) + '%';
  if (/video\.start/.test(path)) return `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
  return v;
}

async function onClick(e) {
  const t = e.target.closest('button, a, [data-tpl]');
  if (!t) return;
  const act = t.dataset.act;
  const d = D();
  if (t.dataset.tpl && t.classList.contains('mini')) {
    store.update(x => { x.templateId = t.dataset.tpl; });
    $$('#mini-grid .mini').forEach(b => b.setAttribute('aria-pressed', b === t));
    return;
  }
  if (t.dataset.palette) {
    store.update(x => { x.style.palette = t.dataset.palette; x.style.custom = null; });
    $$('[data-palette]').forEach(b => b.setAttribute('aria-pressed', b === t));
    return;
  }
  if (t.dataset.page != null && t.closest('#pv-grid')) { ui.page = +t.dataset.page; renderTabs(); schedulePreview(); openStageMobile(); return; }
  if (t.dataset.savedate) { ui.page = 'sd'; renderTabs(); schedulePreview(); openStageMobile(); return; }
  if (t.dataset.goto) { goStep(+t.dataset.goto, { force: true }); return; }
  if (t.dataset.dl) { doDownload(t.dataset.dl, t); return; }
  if (t.dataset.copyCap != null) { (await copyText(captions(d)[+t.dataset.copyCap])) ? toast('Caption copied.', 'ok') : toast('Copy failed. Select the text and copy it manually.', 'err'); return; }
  switch (act) {
    case 'next': goStep(ui.step + 1); break;
    case 'back': goStep(ui.step - 1, { force: true }); break;
    case 'apply-tpl': store.update(x => { x.templateId = t.dataset.tpl; }); renderPanel({ keepScroll: true }); toast(`Template changed to ${TEMPLATE_MAP[t.dataset.tpl].name}.`, 'ok'); break;
    case 'suggest-tag': {
      const tag = `#${(d.couple.bride.en || 'Bride').replace(/\s+/g, '')}Weds${(d.couple.groom.en || 'Groom').replace(/\s+/g, '')}`;
      store.update(x => { x.couple.hashtag = tag; }); $('#f-couple-hashtag').value = tag; break;
    }
    case 'rm-photo': {
      const ok = await confirmDialog('Remove photo?', 'The photo will be removed from this design.', 'Remove', true);
      if (!ok) return;
      store.update(x => { if (t.dataset.kind === 'couple') x.photos.couple = null; else x.events[+t.dataset.ev].photo = null; });
      renderPanel({ keepScroll: true }); break;
    }
    case 'rm-family': store.update(x => { x.photos.family.splice(+t.dataset.i, 1); }); renderPanel({ keepScroll: true }); break;
    case 'toggle-event': ui.openEvent = ui.openEvent === t.dataset.id ? null : t.dataset.id; renderPanel({ keepScroll: true }); break;
    case 'add-event': {
      const id = $('#add-preset').value;
      const ev = makeEvent(id, { date: d.wedding.date, venue: d.wedding.venue, address: d.wedding.address, maps: d.wedding.maps });
      store.update(x => { x.events.push(ev); });
      ui.openEvent = ev.id; renderPanel({ keepScroll: true });
      setTimeout(() => $(`.ev[data-id="${ev.id}"]`)?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }), 30);
      toast(`${ev.name.en} added.`, 'ok'); break;
    }
    case 'ev-up': case 'ev-down': {
      const i = +t.dataset.i, j = act === 'ev-up' ? i - 1 : i + 1;
      store.update(x => { [x.events[i], x.events[j]] = [x.events[j], x.events[i]]; });
      renderPanel({ keepScroll: true });
      $(`[data-act="${act}"][data-i="${j}"]`)?.focus(); break;
    }
    case 'ev-dup': {
      const i = +t.dataset.i;
      const copy = structuredClone(d.events[i]); copy.id = uid(); copy.name.en = copy.name.en + ' (copy)';
      store.update(x => { x.events.splice(i + 1, 0, copy); });
      ui.openEvent = copy.id; renderPanel({ keepScroll: true }); break;
    }
    case 'ev-del': {
      const i = +t.dataset.i;
      const ok = await confirmDialog('Delete function?', `“${d.events[i].name.en}” will be removed. You can undo this.`, 'Delete', true);
      if (!ok) return;
      store.update(x => { x.events.splice(i, 1); });
      validate(); renderPanel({ keepScroll: true }); toast('Function deleted. Press Undo to restore it.', 'info'); break;
    }
    case 'sort-events': store.update(x => { x.events = sortedEvents(x); }); renderPanel({ keepScroll: true }); break;
    case 'preview-event': { const pages = pagesFor(); const idx = pages.findIndex(p => p.kind === 'event' && p.index === +t.dataset.i); if (idx >= 0) { ui.page = idx; } else { ui.page = 0; toast('Enable “Card for each function” in step 2 to add these cards to the invitation. Showing the cover.', 'info'); } renderTabs(); schedulePreview(); openStageMobile(); break; }
    case 'clear-colors': store.update(x => { x.style.custom = null; }); renderPanel({ keepScroll: true }); break;
    case 'reset-style': {
      const ok = await confirmDialog('Reset styling?', 'Colours, fonts, sizes and decoration will return to the template defaults. Your text is kept.', 'Reset');
      if (!ok) return;
      const def = defaultDesign().style;
      store.update(x => { x.style = { ...def, mode: x.style.mode }; }); renderPanel({ keepScroll: true }); break;
    }
    case 'start-over': {
      const ok = await confirmDialog('Start over?', 'This replaces everything in this design with the sample content. Saved copies in My Designs are not affected.', 'Start over', true);
      if (!ok) return;
      const n = defaultDesign(d.templateId, d.culture); n.id = d.id; n.name = d.name;
      store.update(x => Object.assign(x, n)); renderPanel(); break;
    }
    case 'duplicate': await duplicateCurrent(); break;
    case 'save-now': await saveNow(true); break;
    case 'backup': exportBackup(d); break;
    case 'music-test': await musicTest(); break;
    case 'video-preview': await toggleVideoPreview(); break;
    case 'video-export': await exportVideo(t); break;
    case 'site-preview': await sitePreview(); break;
    case 'share-image': await shareImage(t); break;
    case 'copy-wording': (await copyText($('#wa-text')?.value || invitationText(d))) ? toast('Invitation text copied.', 'ok') : toast('Copy failed.', 'err'); break;
    case 'copy-link': (await copyText(d.site.url)) ? toast('Website link copied.', 'ok') : toast('Copy failed.', 'err'); break;
    case 'copy-rsvp': (await copyText(waLink(rsvpMessage(d), d.rsvp.phone))) ? toast('RSVP link copied. Paste it into your message.', 'ok') : toast('Copy failed.', 'err'); break;
    case 'copy-rsvp-tpl': (await copyText(rsvpMessage(d))) ? toast('RSVP reply template copied.', 'ok') : toast('Copy failed.', 'err'); break;
    case 'copy-tags': (await copyText(hashtags(d).join(' '))) ? toast('Hashtags copied.', 'ok') : toast('Copy failed.', 'err'); break;
    case 'qr-dl': {
      const v = $('#qr-target')?.value; if (!v) { toast('Add a maps or website link first.', 'err'); return; }
      const c = qrCanvas(v, 1000, $('#qr-target').selectedOptions[0].textContent);
      if (!c) { toast('QR code could not be created.', 'err'); return; }
      downloadBlob(await EX.toBlob(c), `${slug(EX.fileBase(d))}-qr.png`); toast('QR code downloaded.', 'ok'); break;
    }
    case 'goto-error': {
      const k = Object.keys(ui.errors)[0];
      const step = /^events/.test(k) ? 5 : /^rsvp/.test(k) ? 4 : /^site/.test(k) ? 9 : 3;
      if (step === 5) { const m = k.match(/^events\.(\d+)/); ui.openEvent = D().events[+m[1]]?.id; }
      ui.step = step; renderPanel(); $('#panel [aria-invalid="true"]')?.focus(); break;
    }
  }
}

async function onChange(e) {
  const el = e.target;
  if (el.id === 'culture-pick') return changeCulture(el.value);
  if (el.dataset.preset) {
    const w = WORDING[el.dataset.preset][+el.value]; if (!w) return;
    store.update(d => { d.wording[el.dataset.preset] = { ...w }; }); renderPanel({ keepScroll: true }); return;
  }
  if (el.id === 'mini-search') return;
  if (el.id === 'pv-fmt' || el.id === 'dl-fmt') { ui.fmt = el.value; $('#stage-format').value = ui.fmt; renderTabs(); schedulePreview(); if (el.id === 'pv-fmt') renderPanel({ keepScroll: true }); return; }
  if (el.id === 'dl-page') { ui.page = el.value === 'sd' ? 'sd' : +el.value; renderTabs(); schedulePreview(); return; }
  if (el.id === 'qr-target') { drawQRBox(); return; }
  if (el.dataset.upload) return handleUpload(el);
  onInput(e);
}

async function changeCulture(id) {
  const c = CULTURES.find(x => x.id === id);
  const d = D();
  const replace = await confirmDialog(`Use ${c.label} suggestions?`, `This sets the invocation and can replace your functions with: ${c.events.map(e => EVENT_PRESETS[e].name.en).join(', ')}. Choose “Replace functions” to swap them, or Cancel to keep your current functions.`, 'Replace functions');
  store.update(x => {
    x.culture = id; x.wording.invocation = c.invocation;
    if (replace) x.events = eventsForCulture(id, x.wedding.date).map(ev => ({ ...ev, venue: x.wedding.venue, address: x.wedding.address, maps: x.wedding.maps }));
  });
  renderPanel({ keepScroll: true });
  toast(replace ? 'Functions and invocation updated.' : 'Invocation updated. Your functions were kept.', 'ok');
}

async function handleUpload(el) {
  const kind = el.dataset.upload;
  const files = [...el.files];
  el.value = '';
  if (!files.length) return;
  try {
    if (kind === 'audio') {
      const f = files[0];
      if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|aac|wav|ogg|oga|flac|webm)$/i.test(f.name)) throw new Error('Please choose an audio file (MP3, M4A, WAV or OGG).');
      if (f.size > CONFIG.maxAudioMB * 1048576) throw new Error(`That file is larger than ${CONFIG.maxAudioMB} MB.`);
      toast('Reading audio…', 'info', 1500);
      const buf = await decodeFile(f);
      await storage.saveAudio(D().id, f);
      ui.audioBuf = buf; ui.audioDur = buf.duration;
      store.update(d => { d.video.audioName = f.name; d.video.track = 'upload'; d.video.start = 0; });
      renderPanel({ keepScroll: true });
      toast(`Audio added (${Math.round(buf.duration)} s). Make sure you have the right to use it.`, 'ok');
      return;
    }
    if (kind === 'family') {
      const room = 6 - (D().photos.family || []).length;
      const srcs = [];
      for (const f of files.slice(0, room)) srcs.push(await readImage(f, 1400, CONFIG.maxPhotoMB));
      store.update(d => { d.photos.family = [...(d.photos.family || []), ...srcs.map(src => ({ src }))]; });
      if (files.length > room) toast('Only 6 gallery photos are allowed. Extra photos were skipped.', 'info');
      renderPanel({ keepScroll: true }); return;
    }
    const src = await readImage(files[0], CONFIG.photoMaxSide, CONFIG.maxPhotoMB);
    store.update(d => {
      const p = { src, zoom: 1, x: 0, y: 0 };
      if (kind === 'couple') { d.photos.couple = p; d.show.photo = true; }
      else d.events[+el.dataset.ev].photo = p;
    });
    renderPanel({ keepScroll: true });
    toast('Photo added. Adjust zoom and position if needed.', 'ok');
  } catch (err) { toast(err.message || 'Upload failed.', 'err'); }
}

// ---------- music & video ----------
async function getUploadBlob() { return storage.getAudio(D().id); }
async function musicBuffer(seconds = 30) {
  const d = D();
  if (d.video.track === 'upload') {
    if (ui.audioBuf && ui.audioFor === d.id) return ui.audioBuf;
    const blob = await getUploadBlob();
    if (!blob) return null;
    ui.audioBuf = await decodeFile(blob); ui.audioDur = ui.audioBuf.duration; ui.audioFor = d.id;
    return ui.audioBuf;
  }
  if (d.video.track === 'none') return null;
  return renderTrack(d.video.track, seconds);
}
async function musicTest() {
  if (isPlaying()) { stopPreview(); renderPanel({ keepScroll: true }); return; }
  try {
    const buf = await musicBuffer(30);
    if (!buf) { toast('Upload an audio file first.', 'err'); return; }
    playPreview(buf, { volume: D().video.volume, start: D().video.track === 'upload' ? D().video.start : 0, onEnd: () => ui.step === 7 && renderPanel({ keepScroll: true }) });
    renderPanel({ keepScroll: true });
  } catch (e) { toast(e.message || 'Could not play audio.', 'err'); }
}

function stopVideo() {
  if (ui.playing) { cancelAnimationFrame(ui.playing.raf); ui.playing = null; stopPreview(); schedulePreview(); }
}
async function toggleVideoPreview() {
  if (ui.playing) { stopVideo(); renderPanel({ keepScroll: true }); return; }
  const d = D();
  await ensureFonts(d); await preloadImages(d);
  const f = VIDEO_FORMATS[d.video.format];
  const k = 640 / Math.max(f.w, f.h);
  const W = Math.round(f.w * k), H = Math.round(f.h * k);
  const tl = new Timeline(structuredClone(d), W, H);
  let buf = null;
  try { buf = await musicBuffer(tl.total + 2); } catch (e) { toast(e.message, 'err'); }
  const cv = $('#stage-canvas');
  const box = $('#stage-canvas-wrap').getBoundingClientRect();
  const fit = Math.min((box.width || 400) / W, (box.height || 560) / H, 1.4);
  cv.width = W; cv.height = H; cv.style.width = Math.round(W * fit) + 'px'; cv.style.height = Math.round(H * fit) + 'px';
  const ctx = cv.getContext('2d');
  if (buf) playPreview(buf, { volume: d.video.volume, start: d.video.track === 'upload' ? d.video.start : 0 });
  const t0 = performance.now();
  ui.playing = { raf: 0 };
  openStageMobile();
  const loop = () => {
    if (!ui.playing) return;
    const t = (performance.now() - t0) / 1000;
    if (t >= tl.total) { stopVideo(); if (ui.step === 7) renderPanel({ keepScroll: true }); return; }
    tl.draw(ctx, t);
    $('#stage-note').textContent = `Video preview · ${t.toFixed(1)} / ${tl.total.toFixed(0)} s (reduced resolution)`;
    ui.playing.raf = requestAnimationFrame(loop);
  };
  renderPanel({ keepScroll: true });
  loop();
}
async function exportVideo(btn) {
  if (ui.exportJob) { ui.exportJob.cancelled = true; return; }
  stopVideo();
  const d = structuredClone(D());
  const box = $('#video-progress');
  const job = { cancelled: false };
  ui.exportJob = job;
  btn.innerHTML = `${icon('x')}Cancel export`;
  box.innerHTML = `<div class="progress" role="progressbar" aria-label="Video export progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><p class="muted" id="vp-text" style="margin-top:6px">Preparing music…</p>`;
  const bar = box.querySelector('.progress'), fill = bar.querySelector('i'), txt = box.querySelector('#vp-text');
  try {
    const { total } = new Timeline(d, 10, 10);
    const audio = await getMusic(d, getUploadBlob, total + 2);
    if (d.video.track === 'upload' && !audio) throw new Error('The uploaded audio could not be found. Please upload it again.');
    txt.textContent = 'Recording… keep this tab open and visible.';
    const res = await recordVideo(d, { audio, signal: job, onProgress: p => { fill.style.width = (p * 100).toFixed(1) + '%'; bar.setAttribute('aria-valuenow', Math.round(p * 100)); } });
    if (!res) { txt.textContent = 'Export cancelled.'; return; }
    if (!res.blob.size) throw new Error('The recording came out empty. Please try again with the tab in the foreground.');
    const name = `${slug(EX.fileBase(d))}-video-${d.video.format}.${res.ext}`;
    downloadBlob(res.blob, name);
    ui.lastVideo = { blob: res.blob, name };
    fill.style.width = '100%';
    box.innerHTML = `<p class="dl-result">✓ ${esc(name)} · ${res.w}×${res.h} · ${Math.round(res.duration)} s · ${fmtBytes(res.blob.size)}</p>
      ${res.ext === 'mp4' && audio && !/mp4a/i.test(res.codec || '') ? '<p class="muted">Note: your browser stored the music as Opus audio inside the MP4. Most Android phones and WhatsApp play it, but some iPhones may play the video silently. Recording in Safari or desktop Chrome/Edge with AAC support avoids this.</p>' : ''}
      ${res.ext === 'webm' ? '<p class="muted">Saved as WebM, which your browser supports. WhatsApp may not play WebM, so convert it to MP4 or record in Chrome, Edge or Safari.</p>' : ''}
      <div class="inline" style="margin-top:8px"><button class="btn btn-outline btn-sm" type="button" id="share-video">${icon('share')}Share video</button></div>`;
    $('#share-video').onclick = async () => {
      const r = await shareFile(res.blob, name, invitationText(D()));
      if (!r.ok && r.reason === 'unsupported') toast('Sharing video files is not supported here. Attach the downloaded file in WhatsApp or Instagram.', 'info', 6000);
    };
    toast('Video ready and downloaded.', 'ok');
  } catch (e) {
    box.innerHTML = `<p class="err-msg">Export failed: ${esc(e.message || e)}</p>`;
    toast('Video export failed. See the message under the button.', 'err');
  } finally {
    ui.exportJob = null;
    btn.innerHTML = `${icon('film')}Export video${videoSupport().mime ? ` (${videoSupport().mime.ext.toUpperCase()})` : ''}`;
  }
}

// ---------- downloads ----------
async function doDownload(kind, btn) {
  const d = structuredClone(D());
  const res = btn.closest('.dl-item')?.querySelector('.dl-result');
  const old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = 'Working…';
  if (res) res.textContent = '';
  try {
    validate();
    const pageVal = $('#dl-page')?.value ?? '0';
    const page = pageVal === 'sd' ? { kind: 'savedate', label: 'Save the Date' } : pagesFor()[+pageVal] || pagesFor()[0];
    const fmt = $('#dl-fmt')?.value || ui.fmt;
    let out;
    if (kind === 'png' || kind === 'jpg') {
      out = await EX.exportImage(d, page, fmt, kind);
      downloadBlob(out.blob, out.name);
      ui.lastImage = out;
      if (res) res.textContent = `✓ ${out.name} · ${out.w}×${out.h} px · ${fmtBytes(out.blob.size)}`;
    } else if (kind === 'social') {
      let total = 0;
      for (const f of ['story', 'portrait', 'square']) {
        const o = await EX.exportImage(d, page.kind === 'savedate' ? page : { kind: 'cover' }, f, 'png');
        downloadBlob(o.blob, o.name); total += o.blob.size;
        await new Promise(r => setTimeout(r, 400));
      }
      if (res) res.textContent = `✓ 3 files · 1080×1920, 1080×1350, 1080×1080 · ${fmtBytes(total)} total`;
    } else if (kind === 'pdf-all' || kind === 'pdf-one') {
      const size = d.print.size;
      const pages = kind === 'pdf-all' ? pageList(d, size) : [page];
      out = await EX.exportPDF(d, pages, size, { bleed: d.print.bleed, onProgress: p => (btn.textContent = `${Math.round(p * 100)}%`) });
      downloadBlob(out.blob, out.name);
      if (res) res.textContent = `✓ ${out.name} · ${out.pages} page${out.pages > 1 ? 's' : ''} · ${out.w} × ${out.h} · ${fmtBytes(out.blob.size)}`;
    } else if (kind === 'zip') {
      out = await EX.exportZipCards(d, fmt, 'jpg', p => (btn.textContent = `${Math.round(p * 100)}%`));
      downloadBlob(out.blob, out.name);
      if (res) res.textContent = `✓ ${out.name} · ${out.count} cards · ${fmtBytes(out.blob.size)}`;
    } else if (kind === 'site') {
      out = await buildMicrosite(d, { mode: 'zip', getUploadBlob });
      downloadBlob(out.blob, out.name);
      if (res) res.textContent = `✓ ${out.name} · ${fmtBytes(out.blob.size)}`;
    }
    toast('Download ready.', 'ok');
  } catch (e) {
    console.error(e);
    if (res) { res.textContent = ''; }
    toast(`Could not create the file: ${e.message || e}`, 'err', 7000);
  } finally { btn.disabled = false; btn.innerHTML = old; }
}

async function sitePreview() {
  try {
    const w = window.open('', '_blank');
    const { html } = await buildMicrosite(structuredClone(D()), { mode: 'preview', getUploadBlob });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    if (w) w.location.href = url; else { toast('Pop-up blocked. Allow pop-ups to preview the website.', 'err'); }
  } catch (e) { toast(`Preview failed: ${e.message}`, 'err'); }
}

async function shareImage(btn) {
  const d = structuredClone(D());
  btn.disabled = true;
  try {
    const out = await EX.exportImage(d, { kind: 'cover' }, 'portrait', 'png');
    const r = await shareFile(out.blob, out.name, $('#wa-text')?.value || invitationText(d));
    if (r.ok) toast('Shared.', 'ok');
    else if (r.reason === 'unsupported') {
      downloadBlob(out.blob, out.name);
      toast('Your browser cannot share files directly, so the image was downloaded. Attach it in WhatsApp or Instagram.', 'info', 7000);
    }
  } catch (e) { toast(e.message, 'err'); } finally { btn.disabled = false; }
}

// ---------- persistence ----------
let saveTimer = null;
async function saveNow(announce = false) {
  const d = D(); if (!d) return;
  try {
    await storage.saveDesign(d);
    prefs.set('last', d.id);
    const s = $('#save-state');
    s.textContent = storage.isPersistent() ? `Saved on this device · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Storage unavailable: export a backup';
    s.classList.toggle('ok', storage.isPersistent());
    if (announce) toast(storage.isPersistent() ? 'Draft saved on this device.' : 'This browser blocks local storage. Export a backup to keep your work.', storage.isPersistent() ? 'ok' : 'err');
  } catch (e) {
    toast('Could not save. Your browser storage may be full. Export a backup instead.', 'err', 7000);
  }
}
const autosave = debounce(() => saveNow(false), 1200);

export function exportBackup(d) {
  const run = async () => {
    const copy = structuredClone(d);
    const audio = await storage.getAudio(d.id).catch(() => null);
    if (audio && audio.size < 12 * 1048576) {
      copy._audio = { name: d.video.audioName, type: audio.type, data: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(audio); }) };
    }
    const blob = new Blob([JSON.stringify({ app: 'shubh-vivah-studio', version: 1, design: copy })], { type: 'application/json' });
    downloadBlob(blob, `${slug(d.name)}-backup.json`);
    toast('Backup downloaded. It contains your photos and details, so keep it private.', 'ok', 6000);
  };
  run();
}

async function duplicateCurrent() {
  const d = structuredClone(D());
  await saveNow();
  const audio = await storage.getAudio(d.id).catch(() => null);
  d.id = uid(); d.name = d.name + ' (copy)'; d.updatedAt = Date.now();
  if (audio) await storage.saveAudio(d.id, audio);
  store.set(d);
  ui.audioBuf = null;
  await saveNow();
  $('#design-name').value = d.name;
  renderPanel({ keepScroll: true });
  toast('Design duplicated. You are now editing the copy.', 'ok');
}

// ---------- stage ----------
function openStageMobile() { if (window.matchMedia('(max-width: 920px)').matches) $('#stage').classList.add('open'); }

// ---------- public API ----------
export async function openStudio(params = {}) {
  if (!initialised) init();
  let d = store.get();
  if (params.id) {
    const found = await storage.getDesign(params.id);
    if (found) d = migrate(found); else toast('That design was not found on this device.', 'err');
  } else if (params.new || !d) {
    if (!params.new && !d) {
      const last = prefs.get('last');
      const found = last ? await storage.getDesign(last) : null;
      d = found ? migrate(found) : null;
    }
    if (!d || params.new) {
      const tid = TEMPLATE_MAP[params.template] ? params.template : 'rajmahal';
      d = defaultDesign(tid, cultureForTemplate(tid));
    }
  }
  if (params.template && !params.new && d) { d.templateId = params.template; }
  if (d !== store.get()) { store.set(d); ui.audioBuf = null; ui.audioDur = 0; ui.page = 0; }
  $('#design-name').value = D().name;
  $$('.seg [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === (D().style.mode || 'easy')));
  ui.step = params.step ? Math.max(1, Math.min(9, +params.step)) : ui.step;
  ui.visited.add(ui.step);
  $('#stage-format').value = ui.fmt;
  renderPanel(); renderTabs();
  await ensureFonts(D()); schedulePreview(); if (ui.step === 1) drawMiniThumbs();
  if (D().video.track === 'upload') musicBuffer().catch(() => { });
}

export function migrate(d) {
  const base = defaultDesign(d.templateId || 'rajmahal');
  const merge = (a, b) => { for (const k in a) { if (b[k] === undefined) b[k] = a[k]; else if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && b[k] && typeof b[k] === 'object') merge(a[k], b[k]); } return b; };
  const out = merge(base, d);
  if (!TEMPLATE_MAP[out.templateId]) out.templateId = 'rajmahal';
  out.events = (out.events || []).map(e => merge(makeEvent(e.preset || 'custom'), e));
  return out;
}

function init() {
  initialised = true;
  const panel = $('#panel');
  panel.addEventListener('input', e => { if (e.target.id === 'mini-search') { const q = e.target.value.toLowerCase(); $$('#mini-grid .mini').forEach(b => (b.hidden = q && !b.dataset.search.includes(q))); return; } if (e.target.type !== 'file' && !e.target.dataset.preset && e.target.id !== 'culture-pick' && e.target.type !== 'radio' && e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') onInput(e); else if (e.target.id === 'wa-text') updateWa(); });
  panel.addEventListener('change', onChange);
  panel.addEventListener('click', onClick);
  $('#stepper').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) goStep(+b.dataset.step, { force: true }); });
  $('#page-tabs').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (!b) return; stopVideo(); ui.page = b.dataset.page === 'sd' ? 'sd' : +b.dataset.page; renderTabs(); schedulePreview(); });
  const fs = $('#stage-format');
  fs.innerHTML = Object.entries(FORMATS).map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`).join('');
  fs.addEventListener('change', () => { stopVideo(); ui.fmt = fs.value; renderTabs(); schedulePreview(); if (ui.step === 8 || ui.step === 9) renderPanel({ keepScroll: true }); });
  $('#btn-undo').onclick = () => { store.undo(); renderPanel({ keepScroll: true }); };
  $('#btn-redo').onclick = () => { store.redo(); renderPanel({ keepScroll: true }); };
  $('#btn-save').onclick = () => saveNow(true);
  $('#design-name').addEventListener('input', e => store.update(d => { d.name = e.target.value || 'Untitled design'; }, { coalesce: true }));
  $$('.seg [data-mode]').forEach(b => b.addEventListener('click', () => {
    store.update(d => { d.style.mode = b.dataset.mode; });
    $$('.seg [data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderPanel({ keepScroll: true });
  }));
  $('#preview-fab').onclick = () => { $('#stage').classList.add('open'); schedulePreview(); $('#stage-close').focus(); };
  $('#stage-close').onclick = () => { stopVideo(); $('#stage').classList.remove('open'); $('#preview-fab').focus(); };
  store.subscribe(() => {
    schedulePreview(); autosave();
    $('#btn-undo').disabled = !store.canUndo(); $('#btn-redo').disabled = !store.canRedo();
    $('#save-state').textContent = 'Unsaved changes…'; $('#save-state').classList.remove('ok');
    if (ui.step === 9) updateWaDebounced();
    fontsDebounced();
  });
  setAssetListener(() => schedulePreview());
  window.addEventListener('resize', debounce(schedulePreview, 120));
  document.addEventListener('keydown', e => {
    if ($('#view-studio').hidden || !$('#modal').hidden) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); renderPanel({ keepScroll: true }); }
    else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); store.redo(); renderPanel({ keepScroll: true }); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(true); }
    else if (e.key === 'Escape' && $('#stage').classList.contains('open')) { $('#stage-close').click(); }
  });
  window.addEventListener('beforeunload', () => { if (D() && !window.__svsReset) storage.saveDesign(D()); });
}
const updateWaDebounced = debounce(() => {
  const t = $('#wa-text');
  if (t && document.activeElement !== t) { t.value = invitationText(D()); updateWa(); }
}, 400);
const fontsDebounced = debounce(() => ensureFonts(D()).then(schedulePreview), 300);

export function leaveStudio() { stopVideo(); stopPreview(); if (D()) saveNow(); }
export { saveNow };
