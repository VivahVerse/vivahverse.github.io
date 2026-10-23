// Wedding microsite generator: a single static page (plus assets) the couple can host anywhere.
import { paletteFor, templateById, fontsFor, renderPage, ensureFonts, preloadImages } from './render/card.js';
import { fmtDate, fmtTimeRange, fmtTime } from './i18n.js';
import { invocationText } from './state.js';
import { sortedEvents, rsvpMessage, digits } from './share.js';
import { esc, loadScript, slug } from './ui.js';
import { renderTrack, bufferToWav } from './music.js';

async function fontFaces(families, mode) {
  const css = await (await fetch('styles/fonts.css')).text();
  const blocks = css.match(/@font-face\s*{[^}]+}/g) || [];
  const files = [];
  const out = blocks.filter(b => families.some(f => b.includes(`'${f}'`))).map(b => {
    const m = b.match(/url\(\.\.\/assets\/fonts\/([^)]+)\)/);
    if (!m) return '';
    files.push(m[1]);
    const url = mode === 'zip' ? `fonts/${m[1]}` : new URL(`assets/fonts/${m[1]}`, location.href).href;
    return b.replace(m[0], `url(${url})`);
  });
  return { css: out.join('\n'), files };
}

const dataUrlToBlob = async u => (await fetch(u)).blob();

/**
 * Build the microsite. mode: 'preview' (single HTML with inline/absolute assets) or 'zip'.
 * getUploadBlob: async () => Blob|null for uploaded audio.
 */
export async function buildMicrosite(design, { mode = 'zip', getUploadBlob } = {}) {
  const d = design;
  const tpl = templateById(d.templateId);
  const { pal, dark } = paletteFor(d, tpl);
  const F = fontsFor(d, tpl);
  const families = [...new Set([F.display, F.script, F.body, F.deva, 'Manrope'])];
  const fonts = await fontFaces(families, mode);
  const assets = []; // {path, blob}

  // invitation card image
  await ensureFonts(d); await preloadImages(d);
  const card = document.createElement('canvas'); card.width = 900; card.height = 1260;
  renderPage(card.getContext('2d'), 900, 1260, d, { kind: 'cover' });
  const cardUrl = card.toDataURL('image/jpeg', 0.9);

  const photos = [];
  if (d.photos.couple?.src) photos.push({ src: d.photos.couple.src, alt: `${d.couple.bride.en} and ${d.couple.groom.en}` });
  d.events.forEach(e => e.photo?.src && photos.push({ src: e.photo.src, alt: e.name.en }));
  (d.photos.family || []).forEach((p, i) => p?.src && photos.push({ src: p.src, alt: `Family photo ${i + 1}` }));

  const ref = async (dataUrl, path) => {
    if (mode !== 'zip') return dataUrl;
    assets.push({ path, blob: await dataUrlToBlob(dataUrl) });
    return path;
  };
  const cardRef = await ref(cardUrl, 'images/invitation.jpg');
  const photoRefs = [];
  for (let i = 0; i < photos.length; i++) photoRefs.push({ ...photos[i], src: await ref(photos[i].src, `images/photo-${i + 1}.jpg`) });
  const heroPhoto = d.photos.couple?.src ? photoRefs[0].src : null;

  // music
  let musicRef = null;
  if (d.site.music && d.video.track && d.video.track !== 'none') {
    try {
      let blob = null, ext = 'wav';
      if (d.video.track === 'upload') { blob = await getUploadBlob?.(); ext = (d.video.audioName || 'music.mp3').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3'; }
      else blob = bufferToWav(await renderTrack(d.video.track, 60), 22050, 60);
      if (blob) {
        if (mode === 'zip') { assets.push({ path: `music.${ext}`, blob }); musicRef = `music.${ext}`; }
        else musicRef = URL.createObjectURL(blob);
      }
    } catch { musicRef = null; }
  }

  const B = d.couple.bride, G = d.couple.groom;
  const first = d.couple.order === 'groom' ? [G, B] : [B, G];
  const bi = d.lang === 'bi', hiOnly = d.lang === 'hi';
  const t = o => (hiOnly ? (o?.hi || o?.en || '') : (o?.en || o?.hi || ''));
  const t2 = o => (bi && o?.hi && o.hi !== o.en ? `<span class="hi" lang="hi">${esc(o.hi)}</span>` : '');
  const lg = hiOnly ? 'hi' : 'en';
  const events = sortedEvents(d);
  const evJson = events.map(e => ({ name: t(e.name), date: e.date, start: e.start, end: e.end, venue: e.venue, address: e.address }));
  const rsvpPhone = digits(d.rsvp.phone);
  const inv = invocationText(d, hiOnly || bi ? 'hi' : 'en');

  const html = `<!doctype html>
<html lang="${hiOnly ? 'hi' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t(first[0]))} &amp; ${esc(t(first[1]))} — Wedding</title>
<meta name="description" content="${esc(`${t(B)} & ${t(G)} are getting married${d.wedding.date ? ' on ' + fmtDate(d.wedding.date, 'en') : ''}. Join us!`)}">
<meta property="og:title" content="${esc(t(first[0]))} &amp; ${esc(t(first[1]))} — Wedding Invitation">
<meta property="og:type" content="website">
<meta name="theme-color" content="${pal.bg}">
<style>
${fonts.css}
:root{--bg:${pal.bg};--bg2:${pal.bg2};--ink:${pal.ink};--ink2:${pal.ink2 || pal.ink};--accent:${pal.accent};--accent2:${pal.accent2 || pal.accent};--paper:${dark ? '#fbf7ef' : '#ffffff'};--pink:${dark ? '#2a1a17' : pal.ink}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'${F.body}','${F.deva}','Manrope',Georgia,serif;color:var(--ink);background:var(--bg);line-height:1.6;font-size:18px}
img{max-width:100%;display:block}
a{color:inherit}
.hi{display:block;font-family:'${F.deva}',serif;font-size:.8em;opacity:.85}
.wrap{width:min(920px,100% - 32px);margin:auto}
header.hero{min-height:100svh;display:grid;place-items:center;text-align:center;padding:48px 16px;background:radial-gradient(circle at 50% 35%,var(--bg) 0,var(--bg2) 100%);position:relative;overflow:hidden}
.hero:before{content:"";position:absolute;inset:18px;border:1px solid var(--accent);opacity:.6;pointer-events:none}
.inv{color:var(--accent);font-family:'${F.deva}',serif;margin-bottom:18px;white-space:pre-line}
.photo{width:min(260px,62vw);aspect-ratio:4/5;object-fit:cover;border-radius:999px 999px 18px 18px;border:3px solid var(--accent);margin:0 auto 24px;box-shadow:0 20px 50px -20px rgba(0,0,0,.5)}
.kicker{letter-spacing:.25em;text-transform:uppercase;font-size:.78rem;color:var(--accent);font-family:'Manrope',sans-serif;font-weight:600}
h1{font-family:'${F.script}','${F.deva}',serif;font-weight:400;font-size:clamp(3rem,11vw,6rem);line-height:1.05;margin:12px 0;color:var(--ink)}
h1 .amp{display:block;font-family:'${F.display}',serif;font-style:italic;font-size:.45em;color:var(--accent)}
h2{font-family:'${F.display}','${F.deva}',serif;font-weight:500;font-size:clamp(2rem,6vw,2.8rem);text-align:center;margin-bottom:24px;color:var(--ink)}
.date{font-family:'${F.display}',serif;font-size:1.25rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.count{display:flex;gap:12px;justify-content:center;margin:26px 0 8px;flex-wrap:wrap}
.count div{min-width:74px;padding:12px 8px;border:1px solid var(--accent);border-radius:12px;background:rgba(255,255,255,.05)}
.count b{display:block;font-family:'${F.display}',serif;font-size:2rem;line-height:1}
.count span{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;font-family:'Manrope',sans-serif}
section{padding:72px 0;border-top:1px solid rgba(127,127,127,.2)}
section.alt{background:var(--bg2)}
.story{max-width:640px;margin:auto;text-align:center;font-size:1.15rem}
.events{display:grid;gap:18px;position:relative}
.ev{display:grid;grid-template-columns:120px 1fr;gap:18px;padding:22px;border:1px solid rgba(127,127,127,.3);border-radius:16px;background:rgba(255,255,255,.04)}
.ev .when{font-family:'${F.display}',serif;color:var(--accent);text-align:center;border-right:1px solid rgba(127,127,127,.3);padding-right:14px}
.ev .when b{display:block;font-size:2.2rem;line-height:1}
.ev h3{font-family:'${F.display}','${F.deva}',serif;font-size:1.6rem;font-weight:500}
.ev p{color:var(--ink2);font-size:.98rem}
.ev .acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;border:1.5px solid var(--accent);text-decoration:none;font-family:'Manrope',sans-serif;font-weight:600;font-size:.9rem;color:var(--ink);background:none;cursor:pointer}
.btn.solid{background:var(--accent);color:${dark ? '#1b0c08' : '#fff'}}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.gallery img{aspect-ratio:1;object-fit:cover;border-radius:12px;cursor:zoom-in}
.card-img{width:min(420px,100%);margin:auto;border-radius:6px;box-shadow:0 20px 60px -20px rgba(0,0,0,.6)}
.center{text-align:center}
.rsvp{display:grid;gap:12px;max-width:520px;margin:auto}
input,textarea{font:inherit;padding:12px 14px;border-radius:12px;border:1.5px solid rgba(127,127,127,.45);background:rgba(255,255,255,.9);color:#2a1a17;width:100%}
label{font-family:'Manrope',sans-serif;font-size:.85rem;font-weight:600}
footer{padding:48px 16px 80px;text-align:center;color:var(--ink2)}
.music{position:fixed;right:16px;bottom:16px;z-index:5;background:var(--accent);color:${dark ? '#1b0c08' : '#fff'};border:0;border-radius:999px;padding:12px 18px;font-family:'Manrope',sans-serif;font-weight:700;box-shadow:0 10px 30px -10px rgba(0,0,0,.6)}
.lb{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;place-items:center;z-index:9;padding:16px}
.lb.on{display:grid}.lb img{max-height:90vh;border-radius:8px}
.note{font-size:.85rem;color:var(--ink2);font-family:'Manrope',sans-serif}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
@media(max-width:560px){.ev{grid-template-columns:1fr}.ev .when{border-right:0;border-bottom:1px solid rgba(127,127,127,.3);padding:0 0 10px;display:flex;gap:10px;align-items:baseline;justify-content:center}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<header class="hero">
  <div>
    ${d.show.invocation && inv ? `<p class="inv">${esc(inv)}</p>` : ''}
    ${heroPhoto ? `<img class="photo" src="${esc(heroPhoto)}" alt="${esc(`${t(B)} and ${t(G)}`)}">` : ''}
    <p class="kicker">${esc(t(d.wording.headline) || 'Together with their families')}</p>
    <h1>${esc(t(first[0]))}${t2(first[0])}<span class="amp">&amp;</span>${esc(t(first[1]))}${t2(first[1])}</h1>
    ${d.wedding.date ? `<p class="date">${esc(fmtDate(d.wedding.date, lg))}</p>` : ''}
    ${d.wedding.venue ? `<p>${esc(d.wedding.venue)}${d.wedding.address ? ', ' + esc(d.wedding.address) : ''}</p>` : ''}
    ${d.site.countdown && d.wedding.date ? `<div class="count" id="count" aria-label="Countdown to the wedding"><div><b id="cd-d">–</b><span>Days</span></div><div><b id="cd-h">–</b><span>Hours</span></div><div><b id="cd-m">–</b><span>Minutes</span></div><div><b id="cd-s">–</b><span>Seconds</span></div></div>` : ''}
    <p style="margin-top:24px"><a class="btn solid" href="#events">View celebrations</a> ${rsvpPhone ? '<a class="btn" href="#rsvp">RSVP</a>' : ''}</p>
  </div>
</header>
<main>
${d.site.story && d.couple.story ? `<section><div class="wrap"><h2>Our story</h2><p class="story">${esc(d.couple.story)}</p></div></section>` : ''}
<section class="alt" id="events"><div class="wrap"><h2>${hiOnly ? 'शुभ कार्यक्रम' : 'Celebrations'}</h2><div class="events">
${events.map((e, i) => {
    const dt = e.date ? new Date(e.date + 'T00:00') : null;
    return `<article class="ev"><div class="when">${dt ? `<b>${dt.getDate()}</b>${esc(dt.toLocaleString(hiOnly ? 'hi-IN' : 'en-IN', { month: 'short' }))} ${dt.getFullYear()}` : ''}</div>
<div><h3>${esc(t(e.name))}${t2(e.name)}</h3>
<p>${esc([fmtDate(e.date, lg), fmtTimeRange(e.start, e.end, lg)].filter(Boolean).join(' · '))}</p>
${e.venue ? `<p><strong>${esc(e.venue)}</strong>${e.address ? ', ' + esc(e.address) : ''}</p>` : ''}
${e.dress ? `<p>Dress code: ${esc(e.dress)}</p>` : ''}
${t(e.msg) ? `<p><em>${esc(t(e.msg))}</em></p>` : ''}
<div class="acts">${e.maps ? `<a class="btn" href="${esc(e.maps)}" target="_blank" rel="noopener">Directions</a>` : ''}${e.date ? `<button class="btn" type="button" data-ics="${i}">Add to calendar</button>` : ''}</div></div></article>`;
  }).join('\n')}
</div></div></section>
<section><div class="wrap center"><h2>${hiOnly ? 'निमंत्रण पत्र' : 'Our invitation'}</h2><img class="card-img" src="${esc(cardRef)}" alt="Wedding invitation card"><p style="margin-top:18px"><a class="btn" href="${esc(cardRef)}" download="invitation.jpg">Download invitation</a></p></div></section>
${d.site.gallery && photoRefs.length ? `<section class="alt"><div class="wrap"><h2>Gallery</h2><div class="gallery">${photoRefs.map(p => `<img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" tabindex="0">`).join('')}</div></div></section>` : ''}
${rsvpPhone || d.rsvp.email ? `<section id="rsvp"><div class="wrap"><h2>RSVP</h2>
<form class="rsvp" id="rsvp-form">
<label>Your name<input name="n" required autocomplete="name"></label>
<label>Number of guests<input name="g" type="number" min="1" max="20" value="2"></label>
${d.site.blessings ? '<label>A message or blessing for the couple (optional)<textarea name="m" rows="3"></textarea></label>' : ''}
${rsvpPhone ? '<button class="btn solid" type="submit">Send RSVP on WhatsApp</button>' : ''}
<p class="note">This opens WhatsApp with your message filled in for you to review and send. Nothing is stored on this website.${d.rsvp.note ? ' ' + esc(d.rsvp.note) + '.' : ''}</p>
<p class="note">${d.rsvp.name ? esc(d.rsvp.name) + ' · ' : ''}${d.rsvp.phone ? `<a href="tel:${esc(d.rsvp.phone.replace(/[^\d+]/g, ''))}">${esc(d.rsvp.phone)}</a>` : ''}${d.rsvp.email ? ` · <a href="mailto:${esc(d.rsvp.email)}">${esc(d.rsvp.email)}</a>` : ''}</p>
</form></div></section>` : ''}
</main>
<footer><p style="font-family:'${F.script}',serif;font-size:2.2rem;color:var(--accent)">${esc(t(d.wording.closing))}</p><p>${esc(t(d.family.hosts))}</p>${d.couple.hashtag ? `<p style="margin-top:10px">${esc(d.couple.hashtag)}</p>` : ''}</footer>
${musicRef ? `<audio id="bgm" src="${esc(musicRef)}" loop preload="none"></audio><button class="music" id="music-btn" type="button" aria-pressed="false">♪ Play music</button>` : ''}
<div class="lb" id="lb" role="dialog" aria-label="Photo"><img alt=""></div>
<script>
const EV=${JSON.stringify(evJson).replace(/</g, '\\u003c')};
const WED=${JSON.stringify({ date: d.wedding.date, time: d.wedding.time }).replace(/</g, '\\u003c')};
const PHONE=${JSON.stringify(rsvpPhone)};
const COUPLE=${JSON.stringify(`${t(B)} & ${t(G)}`).replace(/</g, '\\u003c')};
(function(){
  if(WED.date&&document.getElementById('count')){
    const target=new Date(WED.date+'T'+(WED.time||'00:00')+':00');
    const el=k=>document.getElementById('cd-'+k);
    const tick=()=>{let s=Math.max(0,Math.floor((target-new Date())/1000));el('d').textContent=Math.floor(s/86400);el('h').textContent=Math.floor(s%86400/3600);el('m').textContent=Math.floor(s%3600/60);el('s').textContent=s%60;};
    tick();setInterval(tick,1000);
  }
  const pad=n=>String(n).padStart(2,'0');
  const icsDate=(d,t)=>d.replace(/-/g,'')+'T'+(t||'00:00').replace(':','')+'00';
  const icsEsc=s=>String(s||'').replace(/[\\\\,;]/g,m=>'\\\\'+m).replace(/\\n/g,'\\\\n');
  document.querySelectorAll('[data-ics]').forEach(b=>b.addEventListener('click',()=>{
    const e=EV[+b.dataset.ics];
    let end=e.end;
    if(!end&&e.start){const [h,m]=e.start.split(':').map(Number);end=pad(Math.min(23,h+3))+':'+pad(m);}
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Shubh Vivah Studio//EN','BEGIN:VEVENT','UID:'+Date.now()+'-'+b.dataset.ics+'@shubhvivah','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z',
      'DTSTART:'+icsDate(e.date,e.start),'DTEND:'+icsDate(e.date,end||e.start),'SUMMARY:'+icsEsc(e.name+' — '+COUPLE),'LOCATION:'+icsEsc([e.venue,e.address].filter(Boolean).join(', ')),'END:VEVENT','END:VCALENDAR'].join('\\r\\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download=(e.name||'event').replace(/\\W+/g,'-')+'.ics';document.body.append(a);a.click();a.remove();
  }));
  const f=document.getElementById('rsvp-form');
  if(f&&PHONE)f.addEventListener('submit',ev=>{ev.preventDefault();const n=f.n.value.trim();if(!n){f.n.focus();return;}
    const msg='Namaste! RSVP for '+COUPLE+"'s wedding.\\nName: "+n+'\\nGuests: '+(f.g.value||1)+(f.m&&f.m.value.trim()?'\\nMessage: '+f.m.value.trim():'');
    window.open('https://wa.me/'+PHONE+'?text='+encodeURIComponent(msg),'_blank','noopener');});
  const a=document.getElementById('bgm'),mb=document.getElementById('music-btn');
  if(a&&mb)mb.addEventListener('click',()=>{if(a.paused){a.play().then(()=>{mb.textContent='❚❚ Pause music';mb.setAttribute('aria-pressed','true');}).catch(()=>{});}else{a.pause();mb.textContent='♪ Play music';mb.setAttribute('aria-pressed','false');}});
  const lb=document.getElementById('lb');
  document.querySelectorAll('.gallery img').forEach(i=>{const open=()=>{lb.querySelector('img').src=i.src;lb.querySelector('img').alt=i.alt;lb.classList.add('on');};i.addEventListener('click',open);i.addEventListener('keydown',e=>{if(e.key==='Enter')open();});});
  lb.addEventListener('click',()=>lb.classList.remove('on'));document.addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('on');});
})();
</script>
</body>
</html>`;

  if (mode !== 'zip') return { html };

  const JSZip = await loadScript('vendor/jszip.min.js', 'JSZip');
  const zip = new JSZip();
  zip.file('index.html', html);
  for (const a of assets) zip.file(a.path, a.blob);
  for (const f of fonts.files) {
    try { zip.file(`fonts/${f}`, await (await fetch(`assets/fonts/${f}`)).blob()); } catch { }
  }
  zip.file('README.txt', `Your wedding website — ${t(B)} & ${t(G)}
==========================================

This folder is a complete static website. Open index.html in a browser to preview it.

To publish it for free (pick one):

1) Netlify Drop (no account needed for a quick test)
   Go to https://app.netlify.com/drop and drag this whole folder onto the page.

2) GitHub Pages
   Create a new public repository, upload every file in this folder (keep the
   folder structure), then open Settings → Pages → "Deploy from a branch",
   choose "main" and "/ (root)", and save. Your site appears at
   https://<your-username>.github.io/<repository-name>/ within a minute or two.

3) Cloudflare Pages → "Upload assets" and select this folder.

Once you have the link, paste it into Shubh Vivah Studio (Download & share →
"Your wedding website link") to add it to your QR code and WhatsApp message.

Privacy: anyone with the link can see the names, dates, venues and photos on this page.
RSVPs are sent to you through WhatsApp; this website does not store any guest data.
Fonts: SIL Open Font License 1.1 (see the original project for licence files).
${d.video.track === 'upload' ? 'Music: you uploaded this track — make sure you have the right to publish it.\n' : (musicRef ? 'Music: original composition generated by Shubh Vivah Studio, free to use.\n' : '')}`);
  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, name: `${slug(t(B) + '-' + t(G))}-wedding-website.zip`, html };
}
