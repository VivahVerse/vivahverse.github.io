// App shell: routing, navigation, theme, home page (hero, gallery), My Designs.
import { TEMPLATES, CATEGORIES, CULTURE_TAGS, REGIONS, TEMPLATE_MAP } from './data/templates.js';
import { cultureForTemplate } from './data/culture.js';
import { defaultDesign, uid } from './state.js';
import { renderPage, ensureFonts } from './render/card.js';
import { makeTimeline } from './video.js';
import { $, $$, esc, icon, toast, openModal, closeModal, confirmDialog, promptDialog, reducedMotion } from './ui.js';
import { storage, prefs } from './storage.js';
import { openStudio, leaveStudio, exportBackup, migrate } from './studio.js';
import { CONFIG } from './config.js';
import { renderReelGallery, openReelEditor, leaveReelEditor, newStoryDesign } from './reels.js';
import { renderAccount, initAccount } from './profile.js';
import { StoryTimeline, ensureStoryFonts, STORY_MAP } from './render/story.js';

// ---------- theme ----------
const root = document.documentElement;
function setTheme(t) {
  root.dataset.theme = t;
  const b = $('#theme-toggle');
  b.innerHTML = `<svg aria-hidden="true"><use href="#i-${t === 'dark' ? 'sun' : 'moon'}"/></svg>`;
  b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}
setTheme(prefs.get('theme', 'light'));
$('#theme-toggle').addEventListener('click', () => { const t = root.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(t); prefs.set('theme', t); });

// ---------- nav ----------
const menuBtn = $('#menu-btn'), nav = $('#main-nav');
menuBtn.addEventListener('click', () => {
  const open = !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.innerHTML = `<svg aria-hidden="true"><use href="#i-${open ? 'x' : 'menu'}"/></svg>`;
});
nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.innerHTML = '<svg aria-hidden="true"><use href="#i-menu"/></svg>'; } });
if (CONFIG.feedbackUrl) { const f = $('#feedback-link'); f.href = CONFIG.feedbackUrl; f.hidden = false; }

// ---------- router ----------
let currentView = null;
function parseHash() {
  const h = location.hash || '#home';
  if (h.startsWith('#/')) {
    const [path, qs] = h.slice(2).split('?');
    return { view: path || 'home', params: Object.fromEntries(new URLSearchParams(qs || '')) };
  }
  return { view: 'home', anchor: h.slice(1) };
}
async function route() {
  const { view, params, anchor } = parseHash();
  const target = ['studio', 'designs', 'reels', 'reel', 'account'].includes(view) ? view : 'home';
  if (currentView === 'studio' && target !== 'studio') leaveStudio();
  if (currentView === 'reel' && target !== 'reel') leaveReelEditor();
  $$('.view').forEach(v => (v.hidden = v.id !== `view-${target}`));
  $$('[data-nav]').forEach(a => a.removeAttribute('aria-current'));
  const navKey = target === 'home' ? (['templates', 'video', 'website', 'help'].includes(anchor) ? anchor : 'home') : target === 'reel' ? 'reels' : target;
  $(`[data-nav="${navKey}"]`)?.setAttribute('aria-current', 'page');
  const changed = currentView !== target;
  currentView = target;
  if (target === 'home') {
    initHome();
    if (anchor && anchor !== 'home') requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: changed || reducedMotion() ? 'auto' : 'smooth' }));
    else if (changed) window.scrollTo(0, 0);
    document.title = 'Shubh Vivah Studio — Indian Wedding Invitation Maker';
  } else if (target === 'reels') {
    window.scrollTo(0, 0);
    document.title = 'Viral Reel Invitations — Shubh Vivah Studio';
    renderReelGallery(params);
  } else if (target === 'reel') {
    window.scrollTo(0, 0);
    document.title = 'Reel Editor — Shubh Vivah Studio';
    await openReelEditor(params);
  } else if (target === 'account') {
    window.scrollTo(0, 0);
    document.title = 'My Account — Shubh Vivah Studio';
    initAccount(); renderAccount(params);
  } else if (target === 'studio') {
    if (params.id) { const x = await storage.getDesign(params.id); if (x?.kind === 'story') { location.replace(`#/reel?id=${params.id}`); return; } }
    window.scrollTo(0, 0);
    document.title = 'Create Invitation — Shubh Vivah Studio';
    await openStudio(params);
    // clean one-shot params so refresh doesn't create another new design
    if (params.new || params.template || params.profile) history.replaceState(null, '', '#/studio');
  } else if (target === 'designs') {
    window.scrollTo(0, 0);
    document.title = 'My Designs — Shubh Vivah Studio';
    renderDesigns();
  }
  if (changed && target !== 'home') $('#main').focus?.({ preventScroll: true });
}
window.addEventListener('hashchange', route);

// ---------- home ----------
let homeReady = false;
const sample = (tpl, culture, lang = 'en') => { const d = defaultDesign(tpl, culture); d.lang = lang; d.photos.couple = null; return d; };
function initHome() {
  if (homeReady) return;
  homeReady = true;
  const a = sample('rajmahal', 'hindu-north', 'bi'), b = sample('gulabi', 'universal');
  b.wording.invocation = 'none';
  const c1 = $('.hero-card-1'), c2 = $('.hero-card-2');
  const draw = () => {
    renderPage(c1.getContext('2d'), c1.width, c1.height, b, { kind: 'cover' });
    renderPage(c2.getContext('2d'), c2.width, c2.height, a, { kind: 'cover' });
    drawSiteMock();
  };
  draw();
  Promise.all([ensureFonts(a), ensureFonts(b)]).then(draw);
  const v = sample('kashi-ghat', 'hindu-shiv'); v.video.particles = 'petals'; v.video.reel = 'kashi';
  const v2 = sample('vrindavan', 'hindu-krishna'); v2.video.particles = 'petals'; v2.video.reel = 'vrindavan';
  Promise.all([ensureFonts(v), ensureFonts(v2)]).then(() => { phoneLoop($('#hero-phone'), v); phoneLoop($('#video-phone'), v2); });
  buildFilters();
  renderGallery();
  // viral reel phone: paint lazily when it scrolls into view
  const rp = $('#reel-phone');
  if (rp) { const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; io.disconnect(); const sd = newStoryDesign('divine-union', null, { sample: true }); ensureStoryFonts(sd).then(() => setTimeout(() => phoneLoop(rp, sd), 50)); }, { rootMargin: '200px' }); io.observe(rp); }
}

function phoneLoop(canvas, design) {
  const W = canvas.width, H = canvas.height;
  const tl = makeTimeline(design, W, H);
  const ctx = canvas.getContext('2d');
  if (reducedMotion()) { tl.draw(ctx, 4); return; }
  let t0 = performance.now(), visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);
  const loop = now => {
    if (visible && !document.hidden && currentView === 'home') {
      const t = ((now - t0) / 1000) % tl.total;
      tl.draw(ctx, t);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function drawSiteMock() {
  const c = $('#site-mock'); if (!c) return;
  const ctx = c.getContext('2d'), W = c.width, H = c.height;
  const d = sample('noor', 'muslim');
  ctx.fillStyle = '#0d4a42'; ctx.fillRect(0, 0, W, H);
  // left: mini card
  const card = document.createElement('canvas'); card.width = 200; card.height = 280;
  renderPage(card.getContext('2d'), 200, 280, d, { kind: 'cover' });
  ctx.drawImage(card, 34, 50, 200, 280);
  ctx.fillStyle = '#f6efdc'; ctx.textAlign = 'left';
  ctx.font = '400 40px "Pinyon Script", serif'; ctx.fillText('Aanya & Vihaan', 262, 110);
  ctx.font = '600 13px Manrope, sans-serif'; ctx.fillStyle = '#d9b25f'; ctx.fillText('FRIDAY, 12 FEBRUARY 2027', 264, 140);
  [['112', 'DAYS'], ['09', 'HRS'], ['41', 'MIN']].forEach(([n, l], i) => {
    ctx.strokeStyle = '#d9b25f'; ctx.strokeRect(264 + i * 74, 160, 62, 58);
    ctx.fillStyle = '#f6efdc'; ctx.font = '500 24px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.fillText(n, 295 + i * 74, 192);
    ctx.font = '600 9px Manrope, sans-serif'; ctx.fillText(l, 295 + i * 74, 208);
  });
  ctx.textAlign = 'left';
  ['Mehendi · 10 Feb', 'Nikah · 12 Feb', 'Walima · 13 Feb'].forEach((t, i) => {
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(264, 236 + i * 32, 250, 26);
    ctx.fillStyle = '#f6efdc'; ctx.font = '500 13px Manrope, sans-serif'; ctx.fillText(t, 274, 254 + i * 32);
  });
  ctx.fillStyle = '#d9b25f'; ctx.beginPath(); ctx.roundRect?.(264, 336, 120, 30, 15); ctx.fill();
  ctx.fillStyle = '#062c27'; ctx.font = '700 12px Manrope, sans-serif'; ctx.fillText('RSVP on WhatsApp', 276, 356);
}

// ---------- gallery ----------
const F = { q: '', cat: '', culture: '', region: '', format: '', lang: '', sort: 'popular' };
function buildFilters() {
  $('#f-cats').innerHTML = ['All', ...CATEGORIES].map(c => `<button type="button" class="chip" data-cat="${c === 'All' ? '' : c}" aria-pressed="${(c === 'All' ? '' : c) === F.cat}">${c}</button>`).join('');
  $('#f-culture').insertAdjacentHTML('beforeend', CULTURE_TAGS.map(c => `<option>${c}</option>`).join(''));
  $('#f-region').insertAdjacentHTML('beforeend', REGIONS.map(c => `<option>${c}</option>`).join(''));
  $('#f-cats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; F.cat = b.dataset.cat; $$('#f-cats .chip').forEach(x => x.setAttribute('aria-pressed', x === b)); renderGallery(); });
  $('#tpl-search').addEventListener('input', e => { F.q = e.target.value.trim().toLowerCase(); renderGallery(); });
  [['#f-culture', 'culture'], ['#f-region', 'region'], ['#f-format', 'format'], ['#f-lang', 'lang'], ['#f-sort', 'sort']].forEach(([s, k]) => $(s).addEventListener('change', e => { F[k] = e.target.value; renderGallery(); }));
  $('#tpl-reset').addEventListener('click', () => {
    Object.assign(F, { q: '', cat: '', culture: '', region: '', format: '', lang: '', sort: 'popular' });
    $('#tpl-search').value = ''; ['#f-culture', '#f-region', '#f-format', '#f-lang'].forEach(s => ($(s).value = '')); $('#f-sort').value = 'popular';
    $$('#f-cats .chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.cat === ''));
    renderGallery();
  });
  $('#tpl-more-btn').addEventListener('click', () => renderGallery(true));
  $('#tpl-grid').addEventListener('click', e => {
    const b = e.target.closest('[data-preview]'); if (b) previewTemplate(b.dataset.preview);
  });
}

function filtered() {
  let list = TEMPLATES.filter(t => {
    const hay = `${t.name} ${t.tagline} ${t.categories.join(' ')} ${t.cultures.join(' ')} ${t.region}`.toLowerCase();
    return (!F.q || F.q.split(/\s+/).every(w => hay.includes(w))) && (!F.cat || t.categories.includes(F.cat)) &&
      (!F.culture || t.cultures.includes(F.culture)) && (!F.region || t.region === F.region) &&
      (!F.format || t.formats.includes(F.format)) && (!F.lang || t.languages.includes(F.lang));
  });
  const s = F.sort;
  list.sort((a, b) => s === 'name' ? a.name.localeCompare(b.name) : s === 'dark' ? (b.dark - a.dark) || b.popular - a.popular : s === 'light' ? (a.dark - b.dark) || b.popular - a.popular : b.popular - a.popular);
  return list;
}

const thumbObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const c = en.target; thumbObserver.unobserve(c);
    drawThumb(c);
  });
}, { rootMargin: '200px' }) : null;
function drawThumb(c) {
  const t = TEMPLATE_MAP[c.dataset.tpl];
  const culture = cultureForTemplate(t.id);
  const d = sample(t.id, culture, F.lang === 'hi' ? 'hi' : F.lang === 'bi' ? 'bi' : 'en');
  ensureFonts(d).then(() => renderPage(c.getContext('2d'), c.width, c.height, d, { kind: 'cover' }));
}

let galleryLimit = 12;
function renderGallery(more = false) {
  galleryLimit = more ? galleryLimit + 12 : 12;
  const all = filtered();
  const list = all.slice(0, galleryLimit);
  const grid = $('#tpl-grid');
  $('#tpl-count').textContent = `${all.length} template${all.length === 1 ? '' : 's'}${all.length > list.length ? ` · showing ${list.length}` : ''}`;
  $('#tpl-empty').hidden = all.length > 0;
  $('#tpl-more').hidden = all.length <= list.length;
  $('#tpl-more-btn').textContent = `Show more designs (${all.length - list.length} more)`;
  grid.innerHTML = list.map(t => `<article class="tpl-card">
    <div class="tpl-thumb"><canvas width="400" height="560" data-tpl="${t.id}" role="img" aria-label="${esc(`${t.name} template preview: ${t.tagline}`)}"></canvas>
      <div class="tpl-badges">${t.popular >= 90 ? '<span class="badge">Popular</span>' : ''}<span class="badge">${esc(t.region)}</span></div></div>
    <div class="tpl-meta">
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.tagline)}</p>
      <p class="tpl-tags">${esc(t.categories.join(' · '))} · ${esc(t.cultures.slice(0, 3).join(', '))}</p>
      <p class="tpl-tags">${esc(t.formats.join(' · '))} · EN / हिन्दी</p>
      <div class="tpl-actions"><button type="button" class="btn btn-outline btn-sm" data-preview="${t.id}">${icon('eye')}Preview</button><a class="btn btn-maroon btn-sm" href="#/studio?new=1&template=${t.id}">Customize</a></div>
    </div></article>`).join('');
  $$('canvas[data-tpl]', grid).forEach(c => (thumbObserver ? thumbObserver.observe(c) : drawThumb(c)));
}

function previewTemplate(id) {
  const t = TEMPLATE_MAP[id];
  const culture = cultureForTemplate(t.id);
  const d = sample(t.id, culture, 'en');
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="muted" style="margin-bottom:14px">${esc(t.tagline)} · ${esc(t.categories.join(', '))} · Sample names are fictional.</p><div class="preview-row" tabindex="0" aria-label="Sample pages"></div>
    <div class="modal-actions"><button class="btn btn-outline" data-close>Close</button><a class="btn btn-gold" href="#/studio?new=1&template=${t.id}" data-autofocus>Customize this design</a></div>`;
  const row = wrap.querySelector('.preview-row');
  const pages = [['Cover', { kind: 'cover' }], ['Functions', { kind: 'events', from: 0, to: 4 }], [`${d.events[1]?.name.en || 'Function'} card`, { kind: 'event', index: 1 }], ['Closing', { kind: 'closing' }], ['Save the date', { kind: 'savedate' }]];
  pages.forEach(([label, p]) => {
    const c = document.createElement('canvas'); c.width = 560; c.height = 784;
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', `${t.name}: ${label}`);
    row.append(c);
    ensureFonts(d).then(() => renderPage(c.getContext('2d'), 560, 784, d, p));
  });
  openModal(`${t.name}`, wrap);
  wrap.querySelector('a').addEventListener('click', () => closeModal());
}

// ---------- My designs ----------
async function renderDesigns() {
  const list = await storage.listDesigns();
  const grid = $('#designs-grid');
  $('#designs-empty').hidden = list.length > 0;
  grid.innerHTML = list.map(d => `<article class="d-card ${d.kind === 'story' ? 'is-reel' : ''}" data-id="${d.id}">
    <canvas width="${d.kind === 'story' ? 236 : 300}" height="420" role="img" aria-label="${esc(d.name)} cover preview"></canvas>
    <div class="d-meta"><h3>${esc(d.name)}</h3><small>${d.kind === 'story' ? `Reel · ${esc(STORY_MAP[d.story?.template]?.name || '')}` : esc(TEMPLATE_MAP[d.templateId]?.name || '')} · ${esc(d.couple?.bride?.en || '')} &amp; ${esc(d.couple?.groom?.en || '')}</small><small>Edited ${new Date(d.updatedAt).toLocaleString()}</small></div>
    <div class="d-actions">
      <a class="btn btn-maroon" href="${d.kind === 'story' ? '#/reel' : '#/studio'}?id=${d.id}">${icon('edit')}Open</a>
      <button class="btn btn-text" type="button" data-d="rename">Rename</button>
      <button class="btn btn-text" type="button" data-d="dup">Duplicate</button>
      <button class="btn btn-text" type="button" data-d="backup">Backup</button>
      <button class="btn btn-text danger" type="button" data-d="del">Delete</button>
    </div></article>`).join('');
  $$('.d-card', grid).forEach((card, i) => {
    const raw = list.find(x => x.id === card.dataset.id);
    const c = card.querySelector('canvas');
    if (raw.kind === 'story') {
      const d = { ...newStoryDesign(raw.story?.template, null, { sample: true }), ...raw };
      ensureStoryFonts(d).then(() => setTimeout(() => { const tl = new StoryTimeline(d, c.width, c.height); const sc = tl.scenes.find(s => s.kind === 'invite'); tl.draw(c.getContext('2d'), sc.start + sc.dur * 0.8); }, 60 * i));
      return;
    }
    const d = migrate(raw);
    ensureFonts(d).then(() => renderPage(c.getContext('2d'), 300, 420, d, { kind: 'cover' }));
  });
}
$('#designs-grid').addEventListener('click', async e => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  const id = b.closest('.d-card').dataset.id;
  const d = await storage.getDesign(id); if (!d) return;
  if (b.dataset.d === 'rename') {
    const n = await promptDialog('Rename design', 'Design name', d.name);
    if (n) { d.name = n; d.updatedAt = Date.now(); await storage.saveDesign(d); renderDesigns(); toast('Renamed.', 'ok'); }
  } else if (b.dataset.d === 'dup') {
    const copy = structuredClone(d); copy.id = uid(); copy.name += ' (copy)'; copy.updatedAt = Date.now();
    await storage.saveDesign(copy);
    const a = await storage.getAudio(id).catch(() => null); if (a) await storage.saveAudio(copy.id, a);
    renderDesigns(); toast('Design duplicated.', 'ok');
  } else if (b.dataset.d === 'backup') exportBackup(migrate(d));
  else if (b.dataset.d === 'del') {
    if (await confirmDialog('Delete design?', `“${d.name}” will be permanently removed from this device.`, 'Delete', true)) {
      await storage.deleteDesign(id);
      if (prefs.get('last') === id) prefs.set('last', '');
      renderDesigns(); toast('Design deleted.', 'ok');
    }
  }
});
$('#import-file').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    if (f.size > 60 * 1048576) throw new Error('This file is too large to be a design backup.');
    const data = JSON.parse(await f.text());
    if (data?.app !== 'shubh-vivah-studio' || !data.design || typeof data.design !== 'object') throw new Error('This is not a Shubh Vivah Studio backup file.');
    const d = migrate(sanitize(data.design));
    d.id = uid(); d.updatedAt = Date.now();
    if (data.design._audio?.data?.startsWith('data:audio/')) {
      const blob = await (await fetch(data.design._audio.data)).blob();
      await storage.saveAudio(d.id, blob);
    }
    delete d._audio;
    await storage.saveDesign(d);
    renderDesigns(); toast(`Imported “${d.name}”.`, 'ok');
  } catch (err) { toast(err.message || 'Import failed.', 'err', 6000); }
});
// Only allow data:image URLs for photos, plain strings elsewhere.
function sanitize(d) {
  const okImg = p => (p && typeof p.src === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(p.src) ? { src: p.src, zoom: +p.zoom || 1, x: +p.x || 0, y: +p.y || 0 } : null);
  d.photos = { couple: okImg(d.photos?.couple), family: (d.photos?.family || []).map(okImg).filter(Boolean).slice(0, 6) };
  d.events = Array.isArray(d.events) ? d.events.slice(0, 40).map(e => ({ ...e, photo: okImg(e.photo) })) : [];
  return d;
}
$('#reset-all').addEventListener('click', async () => {
  if (!await confirmDialog('Reset all local data?', 'This permanently deletes every saved design, uploaded audio and preference stored by Shubh Vivah Studio in this browser. Export backups first if you want to keep anything.', 'Delete everything', true)) return;
  window.__svsReset = true;
  await storage.resetAll();
  toast('All local data deleted.', 'ok');
  setTimeout(() => location.reload(), 600);
});

route();
