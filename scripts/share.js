// Sharing helpers: invitation wording, WhatsApp links, captions, hashtags, Web Share API, QR.
import { fmtDate, fmtTime, fmtTimeRange } from './i18n.js';
import { drawQR } from './render/card.js';

const nm = (d, k) => d.couple[k].en || d.couple[k].hi || '';

export function invitationText(design, lang = design.lang === 'hi' ? 'hi' : 'en') {
  const d = design, w = d.wedding;
  const L = lang === 'hi';
  const B = L ? (d.couple.bride.hi || nm(d, 'bride')) : nm(d, 'bride');
  const G = L ? (d.couple.groom.hi || nm(d, 'groom')) : nm(d, 'groom');
  const lines = [];
  lines.push(L ? `🌸 शुभ विवाह 🌸` : `🌸 Wedding Invitation 🌸`);
  lines.push('');
  lines.push(L ? (d.wording.message.hi || d.wording.message.en) : d.wording.message.en);
  lines.push('');
  lines.push(L ? `${B} संग ${G}` : `${B} & ${G}`);
  if (w.date) lines.push(`📅 ${fmtDate(w.date, lang)}${w.time ? ', ' + fmtTime(w.time, lang) : ''}`);
  if (w.venue) lines.push(`📍 ${w.venue}${w.address ? ', ' + w.address : ''}`);
  if (w.maps) lines.push(`🗺️ ${w.maps}`);
  if (d.events.length) {
    lines.push('');
    lines.push(L ? 'कार्यक्रम:' : 'Celebrations:');
    sortedEvents(d).forEach(e => {
      const n = L ? (e.name.hi || e.name.en) : e.name.en;
      const parts = [e.date && fmtDate(e.date, lang, { short: true }), fmtTimeRange(e.start, e.end, lang), e.venue].filter(Boolean);
      lines.push(`• ${n}${parts.length ? ' — ' + parts.join(', ') : ''}`);
    });
  }
  if (d.rsvp.phone || d.rsvp.name) { lines.push(''); lines.push(`${L ? 'संपर्क' : 'RSVP'}: ${[d.rsvp.name, d.rsvp.phone].filter(Boolean).join(' · ')}`); }
  if (d.site?.url) lines.push(`${L ? 'वेबपेज' : 'Wedding website'}: ${d.site.url}`);
  if (d.couple.hashtag) { lines.push(''); lines.push(d.couple.hashtag); }
  const closing = L ? (d.wording.closing.hi || d.wording.closing.en) : d.wording.closing.en;
  if (closing) { lines.push(''); lines.push(`${closing}${d.family.hosts.en ? ',\n' + (L ? (d.family.hosts.hi || d.family.hosts.en) : d.family.hosts.en) : ''}`); }
  return lines.join('\n');
}

export function sortedEvents(d) {
  return [...d.events].sort((a, b) => ((a.date || '9999') + (a.start || '')).localeCompare((b.date || '9999') + (b.start || '')));
}

export const digits = phone => String(phone || '').replace(/[^\d]/g, '').replace(/^0+/, '');
export function waLink(text, phone = '') {
  const p = digits(phone);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
export function rsvpMessage(d) {
  return `Namaste! This is to confirm our attendance for ${nm(d, 'bride')} & ${nm(d, 'groom')}'s wedding.\n\nName: \nNumber of guests: \nAttending functions: ${d.events.map(e => e.name.en).join(', ')}\nArrival date: \n\nWith best wishes 🙏`;
}

export function hashtags(d) {
  const B = (nm(d, 'bride') || 'Bride').replace(/\s+/g, ''), G = (nm(d, 'groom') || 'Groom').replace(/\s+/g, '');
  const tags = new Set([d.couple.hashtag?.trim()].filter(Boolean));
  [`#${B}Weds${G}`, `#${G}Ki${B}`, `#${B}And${G}Forever`, `#${B}${G}Shaadi`, '#ShubhVivah', '#IndianWedding', '#ShaadiSeason', '#WeddingInvitation']
    .forEach(t => tags.add(t));
  d.events.slice(0, 4).forEach(e => { const n = (e.name.en || '').replace(/[^\w]/g, ''); if (n) tags.add(`#${n}Ceremony`); });
  return [...tags];
}

export function captions(d) {
  const B = nm(d, 'bride'), G = nm(d, 'groom');
  const date = d.wedding.date ? fmtDate(d.wedding.date, 'en', { short: true }) : 'soon';
  const city = (d.wedding.address || '').split(',').slice(-2, -1)[0]?.trim() || d.wedding.venue || '';
  return [
    `Two families, one celebration. ${B} & ${G} are getting married on ${date}${city ? ' in ' + city : ''} — and we would love for you to be there. ✨`,
    `Save the date! 💛 ${B} & ${G} · ${date}. Haldi, mehendi, dance and a lifetime of happiness — join us!`,
    `With the blessings of our elders, we invite you to celebrate the wedding of ${B} & ${G}. 🌸 ${date}`,
  ];
}

export function canShareFiles(file) {
  try { return !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch { return false; }
}

export async function shareFile(blob, name, text) {
  const file = new File([blob], name, { type: blob.type });
  if (!canShareFiles(file)) return { ok: false, reason: 'unsupported' };
  try { await navigator.share({ files: [file], text, title: 'Wedding Invitation' }); return { ok: true }; }
  catch (e) { return { ok: false, reason: e.name === 'AbortError' ? 'cancelled' : 'error' }; }
}
export async function shareText(text, url) {
  if (!navigator.share) return { ok: false, reason: 'unsupported' };
  try { await navigator.share({ text, url, title: 'Wedding Invitation' }); return { ok: true }; }
  catch (e) { return { ok: false, reason: e.name === 'AbortError' ? 'cancelled' : 'error' }; }
}

export function qrCanvas(text, size = 600, label = '') {
  const c = document.createElement('canvas');
  const pad = label ? 70 : 0;
  c.width = size; c.height = size + pad;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  const ok = drawQR(ctx, text, 0, 0, size, '#2a1a17', '#ffffff');
  if (!ok) return null;
  if (label) { ctx.fillStyle = '#2a1a17'; ctx.font = '600 30px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, size / 2, size + 44); }
  return c;
}

export function isUrl(s) {
  try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}
