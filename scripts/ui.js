// Small UI helpers: escaping, toasts, modal, downloads, clipboard, script loading.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = (n, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function toast(msg, kind = 'info', ms = 4200) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  el.textContent = msg;
  box.append(el);
  setTimeout(() => el.remove(), ms);
}

let lastFocus = null;
export function openModal(title, html, { small = false, onClose } = {}) {
  const m = $('#modal');
  lastFocus = document.activeElement;
  $('#modal-title').textContent = title;
  const body = $('#modal-body');
  if (typeof html === 'string') body.innerHTML = html; else { body.innerHTML = ''; body.append(html); }
  m.querySelector('.modal-box').classList.toggle('sm', small);
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  m._onClose = onClose;
  setTimeout(() => (m.querySelector('[data-autofocus]') || m.querySelector('.modal-x')).focus(), 30);
  return body;
}
export function closeModal() {
  const m = $('#modal');
  if (m.hidden) return;
  m.hidden = true;
  document.body.style.overflow = '';
  m._onClose?.();
  lastFocus?.focus?.();
}
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => {
  const m = $('#modal');
  if (m.hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab') { // simple focus trap
    const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', m).filter(x => !x.disabled && x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

export function confirmDialog(title, text, okLabel = 'Continue', danger = false) {
  return new Promise(res => {
    let done = false;
    const body = openModal(title, `<p>${esc(text)}</p><div class="modal-actions"><button class="btn btn-outline" data-act="no">Cancel</button><button class="btn ${danger ? 'btn-maroon' : 'btn-gold'}" data-act="yes" data-autofocus>${esc(okLabel)}</button></div>`, { small: true, onClose: () => { if (!done) res(false); } });
    body.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      done = true; closeModal(); res(a.dataset.act === 'yes');
    });
  });
}

export function promptDialog(title, label, value = '') {
  return new Promise(res => {
    let done = false;
    const body = openModal(title, `<form class="field"><span>${esc(label)}</span><input type="text" maxlength="60" value="${esc(value)}" data-autofocus required><div class="modal-actions"><button type="button" class="btn btn-outline" data-act="no">Cancel</button><button class="btn btn-gold" type="submit">Save</button></div></form>`, { small: true, onClose: () => { if (!done) res(null); } });
    const f = body.querySelector('form');
    f.addEventListener('submit', e => { e.preventDefault(); done = true; const v = f.querySelector('input').value.trim(); closeModal(); res(v || null); });
    f.querySelector('[data-act="no"]').onclick = () => closeModal();
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.append(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { }
    t.remove(); return ok;
  }
}

const loaded = {};
export function loadScript(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
  if (!loaded[src]) loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => res(globalName ? window[globalName] : true);
    s.onerror = () => { delete loaded[src]; rej(new Error(`Could not load ${src}`)); };
    document.head.append(s);
  });
  return loaded[src];
}

export const fmtBytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
export const slug = s => String(s || 'invitation').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 40) || 'invitation';
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Resize an uploaded image to a JPEG data URL.
export function readImage(file, maxSide = 1600, maxMB = 15) {
  return new Promise((res, rej) => {
    if (!file) return rej(new Error('No file selected.'));
    if (!/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.type)) return rej(new Error('Please choose a JPEG, PNG or WebP image.'));
    if (file.size > maxMB * 1048576) return rej(new Error(`That image is larger than ${maxMB} MB.`));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('This image format could not be read by your browser.')); };
    img.src = url;
  });
}
