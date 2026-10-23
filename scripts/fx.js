// Site-wide extras: a live clock, a wedding calendar popover (with your saved functions and a
// countdown), and gentle mouse-tracking effects (golden glow + sparkle trail + 3D tilt on cards).
import { $, $$, esc, icon, reducedMotion } from './ui.js';
import { storage, prefs } from './storage.js';
import { profiles } from './profile.js';

const pad = n => String(n).padStart(2, '0');
const iso = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

// ---------------- clock ----------------
function initClock() {
  const actions = $('.header-actions'); if (!actions || $('#clock-btn')) return;
  const b = document.createElement('button');
  b.id = 'clock-btn'; b.type = 'button'; b.className = 'clock-chip';
  b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
  b.innerHTML = `<svg aria-hidden="true"><use href="#i-cal"/></svg><span class="clk-time" aria-hidden="true"></span><span class="clk-date" aria-hidden="true"></span><span class="sr">Open calendar</span>`;
  actions.prepend(b);
  const tick = () => {
    const n = new Date();
    b.querySelector('.clk-time').innerHTML = `${n.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}<small>:${pad(n.getSeconds())}</small>`;
    b.querySelector('.clk-date').textContent = n.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    b.title = n.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' });
  };
  tick(); setInterval(tick, 1000);
  b.addEventListener('click', e => { e.stopPropagation(); toggleCal(); });
}

// ---------------- calendar ----------------
let calMonth = null, marks = new Map(), pop = null;
async function loadMarks() {
  marks = new Map();
  const add = (date, label, href) => { if (!date) return; if (!marks.has(date)) marks.set(date, []); const l = marks.get(date); if (!l.some(x => x.label === label)) l.push({ label, href }); };
  try {
    (await storage.listDesigns()).forEach(d => {
      const who = [d.couple?.bride?.en, d.couple?.groom?.en].filter(Boolean).join(' & ');
      const href = d.kind === 'story' ? `#/reel?id=${d.id}` : `#/studio?id=${d.id}`;
      (d.events || []).forEach(e => add(e.date, `${e.name?.en || e.name?.hi || 'Function'}${who ? ' · ' + who : ''}`, href));
      if (d.wedding?.date && !(d.events || []).some(e => e.date === d.wedding.date)) add(d.wedding.date, `Wedding${who ? ' · ' + who : ''}`, href);
    });
  } catch { }
  profiles.list().forEach(p => { const who = [p.couple.bride.en, p.couple.groom.en].filter(Boolean).join(' & '); (p.events || []).forEach(e => add(e.date, `${e.name?.en || 'Function'}${who ? ' · ' + who : ''}`, '#/account')); if (p.wedding.date) add(p.wedding.date, `Wedding${who ? ' · ' + who : ''}`, '#/account'); });
}
function nextEvent() {
  const today = iso(new Date());
  const ds = [...marks.keys()].filter(d => d >= today).sort();
  if (!ds.length) return null;
  const d = ds[0], [y, m, dd] = d.split('-').map(Number);
  const days = Math.round((new Date(y, m - 1, dd) - new Date(new Date().toDateString())) / 864e5);
  return { d, days, items: marks.get(d) };
}
function renderCal() {
  const m = calMonth, y = m.getFullYear(), mo = m.getMonth();
  const first = new Date(y, mo, 1), start = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate(), today = iso(new Date());
  let cells = '';
  for (let i = 0; i < start; i++) cells += '<span class="cal-cell is-empty"></span>';
  for (let dd = 1; dd <= days; dd++) {
    const k = `${y}-${pad(mo + 1)}-${pad(dd)}`, ev = marks.get(k);
    cells += `<button type="button" class="cal-cell ${k === today ? 'is-today' : ''} ${ev ? 'has-ev' : ''}" data-day="${k}" aria-label="${new Date(y, mo, dd).toDateString()}${ev ? `, ${ev.length} function${ev.length > 1 ? 's' : ''}` : ''}">${dd}${ev ? '<i></i>' : ''}</button>`;
  }
  const nx = nextEvent();
  pop.innerHTML = `
    <div class="cal-big"><span class="cal-time" id="cal-time"></span><span class="cal-today">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
    ${nx ? `<a class="cal-count" href="${nx.items[0].href}"><strong>${nx.days === 0 ? 'Today!' : nx.days === 1 ? 'Tomorrow' : `${nx.days} days`}</strong><span>${esc(nx.items[0].label)}</span></a>` : '<p class="cal-hint">Your saved functions appear here as gold dots.</p>'}
    <div class="cal-head"><button type="button" class="icon-btn" data-cal="prev" aria-label="Previous month">${icon('left')}</button><strong>${first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong><button type="button" class="icon-btn" data-cal="next" aria-label="Next month">${icon('right')}</button></div>
    <div class="cal-grid" role="grid">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => `<span class="cal-dow">${d}</span>`).join('')}${cells}</div>
    <div class="cal-list" id="cal-list" aria-live="polite"></div>
    <div class="cal-foot"><button type="button" class="btn btn-text btn-sm" data-cal="today">Today</button><label class="check"><input type="checkbox" id="fx-toggle" ${fxOn() ? 'checked' : ''}> Cursor sparkles</label></div>
    <p class="cal-note">Gregorian calendar. Tithis and muhurats are not calculated here. Please check them with your pandit or panchang.</p>`;
  clockInPop();
}
function clockInPop() { const el = $('#cal-time'); if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); }
async function toggleCal(force) {
  const btn = $('#clock-btn');
  const open = force ?? !(pop && !pop.hidden);
  if (!pop) {
    pop = document.createElement('div'); pop.className = 'cal-pop'; pop.id = 'cal-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Calendar'); pop.hidden = true;
    document.body.appendChild(pop);
    pop.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('[data-cal],[data-day]'); if (!b) return;
      if (b.dataset.cal === 'prev') { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCal(); }
      else if (b.dataset.cal === 'next') { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCal(); }
      else if (b.dataset.cal === 'today') { calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); renderCal(); }
      else if (b.dataset.day) {
        $$('.cal-cell.is-sel', pop).forEach(x => x.classList.remove('is-sel')); b.classList.add('is-sel');
        const ev = marks.get(b.dataset.day);
        $('#cal-list').innerHTML = ev ? ev.map(x => `<a href="${x.href}">${esc(x.label)}</a>`).join('') : `<span class="muted">${new Date(b.dataset.day + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}: nothing saved.</span>`;
      }
    });
    pop.addEventListener('change', e => { if (e.target.id === 'fx-toggle') { prefs.set('fx', e.target.checked ? '1' : '0'); setFx(e.target.checked); } });
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) toggleCal(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { toggleCal(false); btn.focus(); } });
    setInterval(() => { if (!pop.hidden) clockInPop(); }, 1000);
  }
  if (open) {
    await loadMarks();
    if (!calMonth) { const nx = nextEvent(); const base = nx ? new Date(nx.d + 'T00:00') : new Date(); calMonth = new Date(base.getFullYear(), base.getMonth(), 1); }
    renderCal();
    const r = btn.getBoundingClientRect();
    pop.style.top = `${r.bottom + 8 + window.scrollY}px`;
    pop.style.left = `${Math.max(8, Math.min(window.innerWidth - 328, r.right - 320))}px`;
  }
  pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
}

// ---------------- mouse tracking ----------------
const fxOn = () => prefs.get('fx', '1') !== '0';
let fxCanvas = null, glow = null, fxRunning = false, parts = [], mx = -999, my = -999, gx = -999, gy = -999, lastSpawn = 0;
function setFx(on) {
  const ok = on && !reducedMotion() && window.matchMedia('(pointer: fine)').matches;
  document.documentElement.classList.toggle('fx-on', ok);
  if (ok && !fxCanvas) {
    fxCanvas = document.createElement('canvas'); fxCanvas.className = 'fx-canvas'; fxCanvas.setAttribute('aria-hidden', 'true');
    glow = document.createElement('div'); glow.className = 'fx-glow'; glow.setAttribute('aria-hidden', 'true');
    document.body.append(glow, fxCanvas);
    const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); fxCanvas.width = innerWidth * dpr; fxCanvas.height = innerHeight * dpr; fxCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || !document.documentElement.classList.contains('fx-on')) return;
      mx = e.clientX; my = e.clientY;
      const now = performance.now();
      if (now - lastSpawn > 28 && !document.querySelector('.studio:not([hidden])')) { lastSpawn = now; parts.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 0.8, vy: -0.3 - Math.random() * 0.6, life: 1, s: 1.5 + Math.random() * 2.5, h: Math.random() }); if (parts.length > 60) parts.shift(); }
      if (!fxRunning) { fxRunning = true; requestAnimationFrame(loop); }
    }, { passive: true });
    addEventListener('pointerleave', () => { mx = my = -999; });
    document.addEventListener('mouseleave', () => { if (glow) glow.style.opacity = '0'; });
  }
  if (!ok && fxCanvas) { parts = []; fxCanvas.getContext('2d').clearRect(0, 0, fxCanvas.width, fxCanvas.height); if (glow) glow.style.opacity = '0'; }
}
function loop() {
  if (!document.documentElement.classList.contains('fx-on')) { fxRunning = false; return; }
  gx += (mx - gx) * 0.18; gy += (my - gy) * 0.18;
  if (mx > -900) { glow.style.opacity = '1'; glow.style.transform = `translate(${gx - 150}px, ${gy - 150}px)`; }
  const c = fxCanvas.getContext('2d'); c.clearRect(0, 0, innerWidth, innerHeight);
  parts.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.015; p.life -= 0.022;
    if (p.life <= 0) return;
    c.save(); c.globalAlpha = p.life * 0.9; c.translate(p.x, p.y); c.rotate(p.life * 3);
    c.fillStyle = p.h > 0.7 ? '#F2A7B0' : p.h > 0.35 ? '#F6D27A' : '#E9B44C';
    const s = p.s * (0.6 + p.life * 0.6);
    c.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.35 : s * 1.2; const a = (k / 8) * Math.PI * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill();
    c.restore();
  });
  parts = parts.filter(p => p.life > 0);
  if (parts.length || Math.abs(mx - gx) > 0.5) requestAnimationFrame(loop); else fxRunning = false;
}
/** 3D tilt that follows the mouse on cards and phones. */
function initTilt() {
  const SEL = '.tpl-card, .rt-card, .acc-card, .d-card';
  let cur = null;
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !document.documentElement.classList.contains('fx-on')) return;
    const el = e.target.closest?.(SEL);
    if (cur && cur !== el) { cur.style.removeProperty('--tx'); cur.style.removeProperty('--ty'); cur.classList.remove('is-tilt'); }
    cur = el; if (!el) return;
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.classList.add('is-tilt');
    el.style.setProperty('--tx', `${(-py * 6).toFixed(2)}deg`); el.style.setProperty('--ty', `${(px * 8).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`); el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
  }, { passive: true });
  // hero parallax
  const hero = $('.hero-stage');
  hero && document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !document.documentElement.classList.contains('fx-on')) return;
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    hero.style.setProperty('--px', `${(x * 18).toFixed(1)}px`); hero.style.setProperty('--py', `${(y * 14).toFixed(1)}px`);
  }, { passive: true });
}

export function initFx() {
  initClock();
  setFx(fxOn());
  initTilt();
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => setFx(fxOn()));
}
