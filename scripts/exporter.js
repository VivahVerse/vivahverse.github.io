// Exports: PNG / JPEG / PDF (single & multi-page, print sizes with bleed) / ZIP of cards.
import { renderPage, ensureFonts, preloadImages } from './render/card.js';
import { FORMATS, pageList } from './state.js';
import { loadScript, slug } from './ui.js';

const BLEED_MM = 3;

export async function prepare(design) {
  await ensureFonts(design);
  await preloadImages(design);
}

/** Render one page to a new canvas at full export resolution. */
export function renderCanvas(design, page, fmtKey, { bleed = false } = {}) {
  const f = FORMATS[fmtKey] || FORMATS['5x7'];
  let W = f.w, H = f.h, b = 0;
  if (bleed && f.mm) {
    const pxPerMm = f.w / f.mm[0];
    b = Math.round(BLEED_MM * pxPerMm);
    W += 2 * b; H += 2 * b;
  }
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  renderPage(c.getContext('2d'), W, H, design, page, { bleed: b });
  return c;
}

export const toBlob = (canvas, type = 'image/png', q = 0.92) =>
  new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Your browser could not create the image (it may be out of memory).'))), type, q));

export async function exportImage(design, page, fmtKey, type = 'png') {
  await prepare(design);
  const c = renderCanvas(design, page, fmtKey);
  const blob = await toBlob(c, type === 'jpg' ? 'image/jpeg' : 'image/png', 0.93);
  return { blob, name: `${slug(fileBase(design))}-${slug(pageName(design, page))}-${fmtKey}.${type}`, w: c.width, h: c.height };
}

export function fileBase(design) {
  const c = design.couple;
  return `${c.bride.en || 'bride'}-${c.groom.en || 'groom'}`;
}
export function pageName(design, page) {
  if (page.kind === 'event') return design.events[page.index]?.name.en || 'function';
  if (page.kind === 'events') return page.from ? `functions-${page.from / 4 + 1}` : 'functions';
  return page.kind;
}

async function jspdf() {
  const m = await loadScript('vendor/jspdf.umd.min.js', 'jspdf');
  if (!m?.jsPDF) throw new Error('The PDF library failed to load. Check your connection and try again.');
  return m.jsPDF;
}

/** PDF of the given pages. Print formats use real mm sizes; screen formats use 300 dpi equivalents. */
export async function exportPDF(design, pages, fmtKey, { bleed = false, onProgress } = {}) {
  const JsPDF = await jspdf();
  await prepare(design);
  const f = FORMATS[fmtKey] || FORMATS['5x7'];
  const mm = f.mm || [f.w / 300 * 25.4, f.h / 300 * 25.4];
  const extra = bleed && f.mm ? BLEED_MM * 2 : 0;
  const pw = mm[0] + extra, ph = mm[1] + extra;
  const doc = new JsPDF({ unit: 'mm', format: [pw, ph], orientation: pw > ph ? 'landscape' : 'portrait', compress: true });
  doc.setProperties({ title: `${design.couple.bride.en} & ${design.couple.groom.en} — Wedding Invitation`, creator: 'Shubh Vivah Studio' });
  for (let i = 0; i < pages.length; i++) {
    if (i) doc.addPage([pw, ph], pw > ph ? 'landscape' : 'portrait');
    const c = renderCanvas(design, pages[i], fmtKey, { bleed: bleed && !!f.mm });
    const data = c.toDataURL('image/jpeg', 0.94);
    doc.addImage(data, 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
    if (bleed && f.mm) drawCropMarks(doc, pw, ph);
    onProgress?.((i + 1) / pages.length);
    await new Promise(r => setTimeout(r, 0));
  }
  const blob = doc.output('blob');
  const tag = pages.length > 1 ? 'invitation' : pageName(design, pages[0]);
  return { blob, name: `${slug(fileBase(design))}-${slug(tag)}-${fmtKey}${bleed ? '-bleed' : ''}.pdf`, w: `${Math.round(pw * 10) / 10} mm`, h: `${Math.round(ph * 10) / 10} mm`, pages: pages.length };
}

function drawCropMarks(doc, pw, ph) {
  const b = BLEED_MM, L = 2.2;
  doc.setDrawColor(0); doc.setLineWidth(0.1);
  [[b, 0, b, L], [0, b, L, b], [pw - b, 0, pw - b, L], [pw - L, b, pw, b], [b, ph - L, b, ph], [0, ph - b, L, ph - b], [pw - b, ph - L, pw - b, ph], [pw - L, ph - b, pw, ph - b]]
    .forEach(([x1, y1, x2, y2]) => doc.line(x1, y1, x2, y2));
}

export async function exportZipCards(design, fmtKey, type = 'png', onProgress) {
  const JSZip = await loadScript('vendor/jszip.min.js', 'JSZip');
  if (!JSZip) throw new Error('The ZIP library failed to load.');
  await prepare(design);
  const zip = new JSZip();
  const pages = design.events.map((_, i) => ({ kind: 'event', index: i }));
  for (let i = 0; i < pages.length; i++) {
    const c = renderCanvas(design, pages[i], fmtKey);
    const blob = await toBlob(c, type === 'jpg' ? 'image/jpeg' : 'image/png', 0.93);
    zip.file(`${String(i + 1).padStart(2, '0')}-${slug(design.events[i].name.en || 'function')}.${type}`, blob);
    onProgress?.((i + 1) / pages.length);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, name: `${slug(fileBase(design))}-function-cards-${fmtKey}.zip`, count: pages.length };
}

export { pageList };
