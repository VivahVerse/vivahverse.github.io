// "My Account": saved wedding details (names, families, date, venue, functions, RSVP) kept on this
// device, so they never need to be typed again. Used to auto-fill new invitations and reels.
// There is no server: profiles live in this browser's localStorage and can be exported/imported.
import { $, $$, esc, icon, toast, confirmDialog, downloadBlob } from './ui.js';
import { uid, makeEvent } from './state.js';
import { EVENT_PRESETS, EVENT_PICKER } from './data/culture.js';

const KEY = 'svs-profiles', ACTIVE = 'svs-profile-active', AUTO = 'svs-profile-auto';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { toast('Could not save on this device (storage is full or blocked).', 'err'); return false; } };
const L = (en = '', hi = '') => ({ en, hi });

export function blankProfile(name = 'Our wedding') {
  return {
    id: uid(), label: name, updatedAt: Date.now(), lang: 'en',
    couple: { bride: L(), groom: L(), brideFull: L(), groomFull: L(), order: 'bride', hashtag: '' },
    family: { brideParents: L(), groomParents: L(), brideGrand: L(), groomGrand: L(), familyNames: L(), hosts: L() },
    wedding: { date: '', time: '', venue: '', address: '', maps: '' },
    rsvp: { name: '', phone: '', email: '' },
    events: [],
  };
}

export const profiles = {
  list: read,
  get: id => read().find(p => p.id === id) || null,
  activeId() { try { return localStorage.getItem(ACTIVE) || ''; } catch { return ''; } },
  active() { const l = read(); return l.find(p => p.id === this.activeId()) || l[0] || null; },
  setActive(id) { try { localStorage.setItem(ACTIVE, id); } catch { } },
  autofill() { try { return localStorage.getItem(AUTO) !== '0'; } catch { return true; } },
  setAutofill(v) { try { localStorage.setItem(AUTO, v ? '1' : '0'); } catch { } },
  save(p) { const l = read(); p.updatedAt = Date.now(); const i = l.findIndex(x => x.id === p.id); if (i >= 0) l[i] = p; else l.push(p); const ok = write(l); if (ok && l.length === 1) this.setActive(p.id); return ok; },
  remove(id) { write(read().filter(p => p.id !== id)); if (this.activeId() === id) this.setActive(read()[0]?.id || ''); },
};

const pickL = o => ({ en: o?.en || '', hi: o?.hi || '' });
/** Copy the personal details of a design into a profile. */
export function profileFromDesign(d, base = null) {
  const p = base ? structuredClone(base) : blankProfile(`${d.couple.bride.en || 'Bride'} & ${d.couple.groom.en || 'Groom'}`);
  p.lang = d.lang;
  ['bride', 'groom', 'brideFull', 'groomFull'].forEach(k => (p.couple[k] = pickL(d.couple[k])));
  p.couple.order = d.couple.order; p.couple.hashtag = d.couple.hashtag || '';
  ['brideParents', 'groomParents', 'brideGrand', 'groomGrand', 'familyNames', 'hosts'].forEach(k => (p.family[k] = pickL(d.family[k])));
  p.wedding = { date: d.wedding.date || '', time: d.wedding.time || '', venue: d.wedding.venue || '', address: d.wedding.address || '', maps: d.wedding.maps || '' };
  p.rsvp = { name: d.rsvp.name || '', phone: d.rsvp.phone || '', email: d.rsvp.email || '' };
  p.events = (d.events || []).map(e => ({ preset: e.preset, name: pickL(e.name), date: e.date, start: e.start, end: e.end || '', venue: e.venue || '', address: e.address || '', maps: e.maps || '', dress: e.dress || '', msg: pickL(e.msg), tithi: e.tithi || '', note: e.note || '' }));
  return p;
}
/** Fill a design with a profile. Empty profile fields never wipe out the design's values. */
export function applyProfile(d, p, { events = true } = {}) {
  if (!p) return d;
  const setL = (tgt, src) => { if (src?.en) tgt.en = src.en; if (src?.hi) tgt.hi = src.hi; };
  ['bride', 'groom', 'brideFull', 'groomFull'].forEach(k => setL(d.couple[k], p.couple[k]));
  if (p.couple.order) d.couple.order = p.couple.order;
  if (p.couple.hashtag) d.couple.hashtag = p.couple.hashtag;
  else if (p.couple.bride.en && p.couple.groom.en) d.couple.hashtag = `#${p.couple.bride.en.replace(/\s+/g, '')}Weds${p.couple.groom.en.replace(/\s+/g, '')}`;
  ['brideParents', 'groomParents', 'brideGrand', 'groomGrand', 'familyNames', 'hosts'].forEach(k => setL(d.family[k], p.family[k]));
  Object.entries(p.wedding || {}).forEach(([k, v]) => { if (v) d.wedding[k] = v; });
  Object.entries(p.rsvp || {}).forEach(([k, v]) => { if (v) d.rsvp[k] = v; });
  if (events && p.events?.length) d.events = p.events.map(e => makeEvent(e.preset || 'custom', { ...e, name: { ...e.name }, msg: { ...(e.msg || { en: '', hi: '' }) } }));
  if (p.lang) d.lang = p.lang;
  return d;
}

// ---------------- account page ----------------
let editing = null; // profile being edited
const inp = (label, path, val, { type = 'text', lang = '', ph = '', full = false } = {}) =>
  `<div class="field ${full ? 'full' : ''}"><span><label for="pf-${path}">${esc(label)}</label></span><input id="pf-${path}" type="${type}" data-pf="${path}" value="${esc(val || '')}" ${lang ? `lang="${lang}"` : ''} placeholder="${esc(ph)}"></div>`;
const get = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
const set = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => (a[k] ??= {}), o)[last] = v; };

function profileCard(p, active) {
  const names = [p.couple.bride.en || p.couple.bride.hi, p.couple.groom.en || p.couple.groom.hi].filter(Boolean).join(' & ') || 'Names not added yet';
  return `<article class="acc-card ${active ? 'is-active' : ''}" data-pid="${p.id}">
    <div class="acc-ico">${icon('lotus')}</div>
    <div class="acc-meta"><h3>${esc(p.label || 'My details')} ${active ? '<span class="badge">Default</span>' : ''}</h3>
      <small>${esc(names)}${p.wedding.date ? ' · ' + esc(new Date(p.wedding.date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })) : ''} · ${p.events.length} function${p.events.length === 1 ? '' : 's'}</small></div>
    <div class="acc-actions">
      <button class="btn btn-maroon btn-sm" type="button" data-pa="edit">${icon('edit')}Edit</button>
      <a class="btn btn-outline btn-sm" href="#/studio?new=1&profile=${p.id}">Card</a>
      <a class="btn btn-outline btn-sm" href="#/reels?profile=${p.id}">Reel</a>
      ${active ? '' : '<button class="btn btn-text btn-sm" type="button" data-pa="default">Make default</button>'}
      <button class="btn btn-text btn-sm danger" type="button" data-pa="del">Delete</button>
    </div></article>`;
}

function editor(p) {
  const evs = p.events.map((e, i) => `<div class="acc-ev" data-ei="${i}">
      <div class="fgrid">
        ${inp('Function', `events.${i}.name.en`, e.name.en)}
        ${inp('Hindi name', `events.${i}.name.hi`, e.name.hi, { lang: 'hi' })}
        ${inp('Date', `events.${i}.date`, e.date, { type: 'date' })}
        ${inp('Start time', `events.${i}.start`, e.start, { type: 'time' })}
        ${inp('Venue', `events.${i}.venue`, e.venue, { full: true })}
        ${inp('Address', `events.${i}.address`, e.address, { full: true })}
        ${inp('Google Maps link', `events.${i}.maps`, e.maps, { type: 'url', full: true })}
        ${inp('Dress code', `events.${i}.dress`, e.dress, { full: true })}
      </div>
      <div class="inline"><button class="btn btn-text btn-sm" type="button" data-pe="up" ${i === 0 ? 'disabled' : ''}>Move up</button><button class="btn btn-text btn-sm" type="button" data-pe="down" ${i === p.events.length - 1 ? 'disabled' : ''}>Move down</button><button class="btn btn-text btn-sm danger" type="button" data-pe="del">Remove</button></div>
    </div>`).join('');
  return `<form class="acc-form" id="acc-form" novalidate>
    <div class="acc-form-head"><h3>Edit saved details</h3><div class="inline"><button class="btn btn-gold" type="submit">${icon('save')}Save details</button><button class="btn btn-text" type="button" data-pa="close">Close</button></div></div>
    <fieldset class="fieldset"><legend>Profile</legend><div class="fgrid">
      ${inp('Profile name', 'label', p.label, { ph: 'e.g. Our wedding, My sister’s wedding', full: true })}
      <div class="field"><span><label for="pf-lang">Preferred language</label></span><select id="pf-lang" data-pf="lang">${[['en', 'English'], ['hi', 'हिन्दी'], ['bi', 'English + हिन्दी']].map(([v, l]) => `<option value="${v}" ${p.lang === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><span><label for="pf-order">Name order</label></span><select id="pf-order" data-pf="couple.order"><option value="bride" ${p.couple.order !== 'groom' ? 'selected' : ''}>Bride first</option><option value="groom" ${p.couple.order === 'groom' ? 'selected' : ''}>Groom first</option></select></div>
    </div></fieldset>
    <fieldset class="fieldset"><legend>Couple</legend><div class="fgrid">
      ${inp('Bride’s name', 'couple.bride.en', p.couple.bride.en, { ph: 'Mansi' })}${inp('Groom’s name', 'couple.groom.en', p.couple.groom.en, { ph: 'Naveen' })}
      ${inp('Bride’s name (Hindi)', 'couple.bride.hi', p.couple.bride.hi, { lang: 'hi' })}${inp('Groom’s name (Hindi)', 'couple.groom.hi', p.couple.groom.hi, { lang: 'hi' })}
      ${inp('Bride’s full name', 'couple.brideFull.en', p.couple.brideFull.en)}${inp('Groom’s full name', 'couple.groomFull.en', p.couple.groomFull.en)}
      ${inp('Wedding hashtag', 'couple.hashtag', p.couple.hashtag, { ph: '#MansiWedsNaveen', full: true })}
    </div></fieldset>
    <fieldset class="fieldset"><legend>Families</legend><div class="fgrid">
      ${inp('Bride’s parents', 'family.brideParents.en', p.family.brideParents.en, { full: true })}${inp('Bride’s parents (Hindi)', 'family.brideParents.hi', p.family.brideParents.hi, { lang: 'hi', full: true })}
      ${inp('Groom’s parents', 'family.groomParents.en', p.family.groomParents.en, { full: true })}${inp('Groom’s parents (Hindi)', 'family.groomParents.hi', p.family.groomParents.hi, { lang: 'hi', full: true })}
      ${inp('Bride’s grandparents', 'family.brideGrand.en', p.family.brideGrand.en)}${inp('Groom’s grandparents', 'family.groomGrand.en', p.family.groomGrand.en)}
      ${inp('Family names', 'family.familyNames.en', p.family.familyNames.en, { ph: 'The Sharma & Kapoor families' })}${inp('Hosts', 'family.hosts.en', p.family.hosts.en)}
    </div></fieldset>
    <fieldset class="fieldset"><legend>Wedding day</legend><div class="fgrid">
      ${inp('Date', 'wedding.date', p.wedding.date, { type: 'date' })}${inp('Time', 'wedding.time', p.wedding.time, { type: 'time' })}
      ${inp('Venue', 'wedding.venue', p.wedding.venue, { full: true })}${inp('Address', 'wedding.address', p.wedding.address, { full: true })}
      ${inp('Google Maps link', 'wedding.maps', p.wedding.maps, { type: 'url', full: true })}
    </div></fieldset>
    <fieldset class="fieldset"><legend>RSVP contact</legend><div class="fgrid">
      ${inp('Name', 'rsvp.name', p.rsvp.name)}${inp('WhatsApp number', 'rsvp.phone', p.rsvp.phone, { type: 'tel', ph: '+91 …' })}${inp('Email', 'rsvp.email', p.rsvp.email, { type: 'email', full: true })}
    </div></fieldset>
    <fieldset class="fieldset"><legend>Functions</legend>
      ${evs || '<p class="muted">No functions saved yet. Add them below, or save them from any invitation you are editing.</p>'}
      <div class="inline"><label class="sr" for="pf-add">Function to add</label><select id="pf-add">${EVENT_PICKER.map(id => `<option value="${id}">${esc(EVENT_PRESETS[id].name.en)} · ${esc(EVENT_PRESETS[id].name.hi)}</option>`).join('')}</select><button class="btn btn-outline btn-sm" type="button" data-pa="add-ev">${icon('plus')}Add function</button></div>
    </fieldset>
    <div class="inline"><button class="btn btn-gold" type="submit">${icon('save')}Save details</button></div>
  </form>`;
}

export function renderAccount(params = {}) {
  const root = $('#account-root');
  const list = profiles.list(), act = profiles.active();
  if (params.edit) editing = structuredClone(profiles.get(params.edit) || editing);
  root.innerHTML = `
    <div class="acc-intro">
      <p class="note">${icon('info')}<span><strong>Your details stay on this device.</strong> There is no sign-in or server. Everything is saved in this browser only. Use <em>Export</em> to move it to another phone or computer. Clearing browser data deletes it.</span></p>
      <label class="check"><input type="checkbox" id="acc-auto" ${profiles.autofill() ? 'checked' : ''}> Fill new invitations and reels with my default details automatically</label>
    </div>
    <div class="acc-tools">
      <button class="btn btn-maroon" type="button" data-pa="new">${icon('plus')}New saved profile</button>
      <button class="btn btn-outline" type="button" data-pa="export" ${list.length ? '' : 'disabled'}>${icon('download')}Export</button>
      <label class="btn btn-outline file-btn">${icon('upload')}Import<input type="file" id="acc-import" accept=".json,application/json" hidden></label>
    </div>
    <div class="acc-list">${list.length ? list.map(p => profileCard(p, act && p.id === act.id)).join('') : `<div class="empty"><svg aria-hidden="true"><use href="#i-lotus"/></svg><p>No saved details yet. Create a profile, or press <strong>Save to my account</strong> while editing any invitation.</p></div>`}</div>
    <div id="acc-editor">${editing ? editor(editing) : ''}</div>`;
  if (editing) requestAnimationFrame(() => $('#acc-editor')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
}

let wired = false;
export function initAccount() {
  if (wired) return; wired = true;
  const root = $('#account-root');
  root.addEventListener('input', e => {
    const k = e.target.dataset.pf; if (!k || !editing) return;
    set(editing, k, e.target.value);
  });
  root.addEventListener('change', async e => {
    if (e.target.id === 'acc-auto') { profiles.setAutofill(e.target.checked); toast(e.target.checked ? 'New designs will use your default details.' : 'Auto-fill turned off.', 'ok'); }
    if (e.target.id === 'acc-import') {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try {
        if (f.size > 2e6) throw new Error('This file is too large to be a profile export.');
        const data = JSON.parse(await f.text());
        const arr = Array.isArray(data?.profiles) ? data.profiles : data?.couple ? [data] : null;
        if (!arr) throw new Error('This file is not a Shubh Vivah Studio profile export.');
        arr.forEach(p => { const base = blankProfile(); const m = { ...base, ...p, id: uid(), couple: { ...base.couple, ...p.couple }, family: { ...base.family, ...p.family }, wedding: { ...base.wedding, ...p.wedding }, rsvp: { ...base.rsvp, ...p.rsvp }, events: Array.isArray(p.events) ? p.events : [] }; profiles.save(m); });
        toast(`Imported ${arr.length} profile${arr.length === 1 ? '' : 's'}.`, 'ok'); renderAccount();
      } catch (err) { toast(err.message || 'Could not read that file.', 'err'); }
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault(); if (!editing) return;
    if (!editing.label?.trim()) editing.label = 'My details';
    if (profiles.save(editing)) { toast('Details saved on this device.', 'ok'); editing = null; renderAccount(); }
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-pa],[data-pe]'); if (!b) return;
    const card = b.closest('[data-pid]'), pid = card?.dataset.pid;
    const a = b.dataset.pa;
    if (b.dataset.pe && editing) {
      const i = +b.closest('[data-ei]').dataset.ei, ev = editing.events;
      if (b.dataset.pe === 'del') ev.splice(i, 1);
      if (b.dataset.pe === 'up' && i > 0) [ev[i - 1], ev[i]] = [ev[i], ev[i - 1]];
      if (b.dataset.pe === 'down' && i < ev.length - 1) [ev[i + 1], ev[i]] = [ev[i], ev[i + 1]];
      $('#acc-editor').innerHTML = editor(editing); return;
    }
    if (a === 'new') { editing = blankProfile(profiles.list().length ? 'Another wedding' : 'Our wedding'); renderAccount(); }
    else if (a === 'edit') { editing = structuredClone(profiles.get(pid)); renderAccount(); }
    else if (a === 'close') { editing = null; renderAccount(); }
    else if (a === 'default') { profiles.setActive(pid); renderAccount(); toast('Default profile changed.', 'ok'); }
    else if (a === 'del') { if (await confirmDialog('Delete saved details?', 'This profile will be removed from this device. Your designs are not affected.', 'Delete', true)) { profiles.remove(pid); if (editing?.id === pid) editing = null; renderAccount(); toast('Profile deleted.', 'ok'); } }
    else if (a === 'export') downloadBlob(new Blob([JSON.stringify({ app: 'shubh-vivah-studio', kind: 'profiles', v: 1, profiles: profiles.list() }, null, 2)], { type: 'application/json' }), 'my-wedding-details.json');
    else if (a === 'add-ev' && editing) {
      const id = $('#pf-add').value, ps = EVENT_PRESETS[id];
      editing.events.push({ preset: id, name: { ...ps.name }, date: editing.wedding.date || '', start: ps.time || '', end: '', venue: editing.wedding.venue || '', address: editing.wedding.address || '', maps: editing.wedding.maps || '', dress: ps.dress || '', msg: { ...ps.msg } });
      $('#acc-editor').innerHTML = editor(editing);
    }
  });
}

/** Small reusable bar for editors: "Fill from my account" + "Save to my account". */
export function accountBar() {
  const list = profiles.list();
  return `<div class="acc-bar">${icon('user')}<span>${list.length ? `<strong>${esc(profiles.active()?.label || 'My details')}</strong> saved on this device` : 'Save these details once and reuse them'}</span>
    ${list.length ? `<select id="acc-pick" aria-label="Saved profile">${list.map(p => `<option value="${p.id}" ${p.id === profiles.active()?.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select><button type="button" class="btn btn-outline btn-sm" data-acc="fill">Fill my details</button>` : ''}
    <button type="button" class="btn btn-text btn-sm" data-acc="save">${icon('save')}Save to my account</button></div>`;
}
/** Handle accountBar clicks. getDesign/setDesign let each editor plug in its own state. */
export async function handleAccountClick(btn, getDesign, onFilled) {
  const act = btn.dataset.acc;
  if (act === 'fill') {
    const p = profiles.get($('#acc-pick')?.value) || profiles.active();
    if (!p) return;
    const replaceEvents = p.events.length ? await confirmDialog('Use saved functions too?', `Replace this design's functions with the ${p.events.length} saved in “${p.label}”? Choose Cancel to keep the current functions and only fill names, families and venue.`, 'Replace functions') : false;
    onFilled(d => applyProfile(d, p, { events: replaceEvents }));
    toast(`Filled from “${p.label}”.`, 'ok');
  } else if (act === 'save') {
    const d = getDesign();
    const ex = profiles.active();
    let base = null;
    if (ex) base = (await confirmDialog('Save to my account', `Update “${ex.label}” with the names, families, venue and functions in this design? Choose Cancel to create a new profile instead.`, 'Update')) ? ex : null;
    const p = profileFromDesign(d, base);
    if (profiles.save(p)) { profiles.setActive(p.id); toast(`Saved to your account as “${p.label}”.`, 'ok'); }
    return 'saved';
  }
}
