// Card labels and date/time formatting per language.
// Add a language: add a LABELS entry and a locale in LOCALES.

export const LABELS = {
  en: {
    weds: 'weds', and: '&', daughterOf: 'Daughter of', sonOf: 'Son of',
    granddaughterOf: 'Granddaughter of', grandsonOf: 'Grandson of',
    date: 'Date', time: 'Time', venue: 'Venue', muhurat: 'Muhurat', rsvp: 'RSVP',
    dress: 'Dress code', functions: 'Wedding Celebrations', inviteTo: 'invite you to the',
    saveTheDate: 'Save the Date', toFollow: 'Formal invitation to follow',
    scanMap: 'Scan for directions', scanSite: 'Scan to view our wedding page',
    hostedBy: 'Hosted by', onwards: 'onwards', to: 'to', with: 'with', families: 'Families',
    countdown: 'Counting down to forever', blessings: 'Send your blessings',
  },
  hi: {
    weds: 'संग', and: '&', daughterOf: 'सुपुत्री', sonOf: 'सुपुत्र',
    granddaughterOf: 'पौत्री/दौहित्री', grandsonOf: 'पौत्र/दौहित्र',
    date: 'दिनांक', time: 'समय', venue: 'स्थान', muhurat: 'शुभ मुहूर्त', rsvp: 'संपर्क',
    dress: 'वेशभूषा', functions: 'शुभ कार्यक्रम', inviteTo: 'आपको आमंत्रित करते हैं',
    saveTheDate: 'तिथि सुरक्षित रखें', toFollow: 'औपचारिक निमंत्रण शीघ्र',
    scanMap: 'मार्ग के लिए स्कैन करें', scanSite: 'वेबपेज देखने हेतु स्कैन करें',
    hostedBy: 'निवेदक', onwards: 'से', to: 'से', with: 'संग', families: 'परिवार',
    countdown: 'शुभ घड़ी की प्रतीक्षा', blessings: 'अपना आशीर्वाद भेजें',
  },
};

const LOCALES = { en: 'en-IN', hi: 'hi-IN' };

export function parseDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt) ? null : dt;
}

export function fmtDate(s, lang = 'en', opts = {}) {
  const d = parseDate(s);
  if (!d) return '';
  const loc = (LOCALES[lang] || 'en-IN') + (lang === 'hi' && opts.devaDigits ? '-u-nu-deva' : '');
  const o = opts.short
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(loc, o).format(d);
}

export function fmtDots(s) {
  const d = parseDate(s);
  if (!d) return '';
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())} · ${p(d.getMonth() + 1)} · ${d.getFullYear()}`;
}

const DEVA = '०१२३४५६७८९';
export const toDeva = str => String(str).replace(/\d/g, c => DEVA[+c]);

export function fmtTime(t, lang = 'en', opts = {}) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return '';
  let [h, m] = t.split(':').map(Number);
  if (lang === 'hi') {
    const part = h >= 4 && h < 12 ? 'प्रातः' : h >= 12 && h < 16 ? 'दोपहर' : h >= 16 && h < 20 ? 'सायं' : 'रात्रि';
    const h12 = ((h + 11) % 12) + 1;
    const out = `${part} ${h12}:${String(m).padStart(2, '0')} बजे`;
    return opts.devaDigits ? toDeva(out) : out;
  }
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function fmtTimeRange(a, b, lang, opts) {
  const A = fmtTime(a, lang, opts), B = fmtTime(b, lang, opts);
  if (A && B) return lang === 'hi' ? `${A} – ${B}` : `${A} – ${B}`;
  if (A) return lang === 'hi' ? `${A} से` : `${A} onwards`;
  return '';
}

export function L(lang, key) {
  return (LABELS[lang] || LABELS.en)[key] ?? LABELS.en[key] ?? key;
}
