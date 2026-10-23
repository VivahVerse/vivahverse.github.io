# Shubh Vivah Studio

An Indian wedding invitation maker that runs entirely in the browser. Pick an original template, enter the couple's and family's details in English, Hindi or both, add every function from Roka to Reception, and download:

- print-ready PDFs (5 × 7 in, A5, A4, optional 3 mm bleed with crop marks)
- PNG and high-resolution JPEG images
- a separate card for each function
- Instagram sizes (9:16, 4:5, 1:1)
- a music video invitation (true MP4 via WebCodecs in Chrome/Edge/Safari; WebM fallback)
- a self-hosted wedding website (.zip)
- **viral reel invitations**: 8-scene hand-painted watercolour wedding stories (Shiv–Parvati, Radha–Krishna, Sita–Ram, royal and modern), about 34 s, 9:16 MP4 in Full HD or 4K

A **My Account** page saves your names, families, venue and functions on this device, so every new card or reel can be filled in with one tap.

There's no account, server or build step. It's plain HTML, CSS and JavaScript (ES modules), so it runs as-is on **GitHub Pages**.

---

## 1. Deploy to GitHub Pages

### Option A: upload through the website (no tools needed)

1. Sign in to GitHub and click **New repository**. Name it, for example, `shubh-vivah-studio`, make it **Public**, and click **Create repository**.
2. On the new repository page, click **uploading an existing file**.
3. Unzip `shubh-vivah-studio.zip` on your computer. Open the unzipped folder and **drag everything inside it** into the GitHub upload area. This includes the `assets`, `icons`, `scripts`, `styles`, `vendor` and `.github` folders, and the `.nojekyll` file.
   - Hidden files: on macOS press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>.</kbd> in Finder to show `.nojekyll` and `.github`. On Windows, turn on *View → Hidden items*. If you can't upload them, the site still works without them.
   - `index.html` must sit at the **top level** of the repository, not inside another folder.
4. Click **Commit changes**.
5. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main`**, **Folder: `/ (root)`**, then click **Save**.
6. After a minute or two, your site will be live at
   `https://<your-username>.github.io/shubh-vivah-studio/`
   (the exact address is shown at the top of the Pages settings).

### Option B: Git command line

```bash
cd shubh-vivah-studio          # the unzipped folder
git init
git add .
git commit -m "Shubh Vivah Studio"
git branch -M main
git remote add origin https://github.com/<your-username>/shubh-vivah-studio.git
git push -u origin main
```
Then do step 5 above.

### Option C: GitHub Actions

A ready workflow is included at `.github/workflows/pages.yml`. In **Settings → Pages**, set **Source: GitHub Actions**. Every push to `main` then deploys automatically. Nothing is built, the files are published as they are.

### After deploying (optional but recommended)

- **Social previews:** in `index.html`, change `content="assets/og-image.png"` to the full address, for example `https://<you>.github.io/shubh-vivah-studio/assets/og-image.png`. Most platforms need an absolute URL. Platforms cache previews, so a new link may take time to update, and they may still show previews differently.
- **Sitemap:** replace `YOUR-USERNAME/YOUR-REPO` in `sitemap.xml`, then uncomment the `Sitemap:` line in `robots.txt`.
- **Feedback link:** set `feedbackUrl` in `scripts/config.js`, for example to your repository's Issues page.

All paths are relative, so the site works at a sub-path like `/shubh-vivah-studio/` without changes.

## 2. Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
cd shubh-vivah-studio
python3 -m http.server 8000
# open http://localhost:8000
```
(Or `npx serve .`.)

## 3. Project structure

```
index.html              Home, gallery, studio and My Designs (one page, hash routes)
privacy.html, terms.html, 404.html
styles/main.css         Design system & layout
styles/fonts.css        Self-hosted font faces (latin, devanagari, gurmukhi, arabic subsets)
scripts/
  app.js                Router, navigation, theme, hero animations, template gallery, My Designs
  studio.js             5-step card editor, live preview, undo/redo, autosave, downloads, sharing UI
  reels.js              Viral reel gallery + 3-step reel editor (Personalize → Customize → Preview & download)
  profile.js            My Account: saved wedding details on this device, auto-fill, export/import
  state.js              Design model, defaults, page list, undo/redo store, formats
  i18n.js               Card labels, Indian date/time formatting (English & Hindi)
  render/card.js        Canvas renderer: layout engine with auto-fit text, frames, pages
  render/reel.js        Cinematic reel videos: painted sacred scenes, deity symbols, timed text scenes
  render/watercolor.js  Procedural watercolour engine: paper, washes, granulation, figures seen from behind, sacred objects
  render/story.js       8-scene story timeline + 5 viral templates (Divine Union, Vrindavan Prem, Siya Ram Vivah, Rajwada Royal, Pastel Promise)
  render/motifs.js      Original ornaments: lotus, paisley, mandala, marigold, toran, diya, arches…
  data/templates.js     95 template definitions + palettes + fonts (data-driven)
  data/culture.js       26 traditions, 80 blessings/verses (Ram Charit Manas, Valmiki Ramayan, Vedic, Shiv, Krishna, Ganesh, Lakshmi…), 45 function presets, wording
  exporter.js           PNG / JPEG / PDF / ZIP
  video.js              Animated timeline + MediaRecorder export
  music.js              Original synthesised tracks, audio decoding, WAV encoder
  share.js              WhatsApp text, Web Share API, QR, captions & hashtags
  microsite.js          Wedding website generator
  storage.js            IndexedDB drafts & audio, localStorage prefs
  ui.js, config.js      Helpers & settings
vendor/                 jsPDF 2.5.2, JSZip 3.10.1, qrcode-generator 1.4.4, mp4-muxer 5.1.3 (local copies + licences)
assets/fonts/           WOFF2 font files (SIL OFL)
assets/og-image.png     Social preview image
icons/                  Favicons & app icons
```

### Adding a template
Append an object to `TEMPLATES` in `scripts/data/templates.js`. Choose a palette, a `bg` (solid / radial / linear / watercolor / archBlock, plus an optional pattern), a `frame` type, `top` / `bottom` / `corners` ornaments, fonts, a name style and a divider. The gallery, filters and studio pick it up automatically.

### Adding a language
1. Add it to `LANGUAGES` in `data/culture.js` and add its strings to the `{en, hi}` objects (invocations, function names, wording).
2. Add labels to `LABELS` and a locale in `i18n.js`.
3. Add a font for the script (copy its WOFF2 subset into `assets/fonts/` and add an `@font-face` to `styles/fonts.css`), and include it in the font fallback in `render/card.js`.
4. Bengali, Marathi (Devanagari, works already), Gujarati, Punjabi (Gurmukhi), Tamil, Telugu, Kannada and Malayalam all fit this pattern.

## 4. What's implemented and what needs a backend

### Implemented in this static version
- Home page with an animated hero, card mock-ups and a phone video preview (motion is disabled when *reduce motion* is on)
- Template gallery: 95 original templates (82 suitable for Hindu weddings, incl. painted sacred-scene designs: traditional, devotional, folk-art, modern and trending) across Hindu (regional), Sikh, Muslim, Christian, Jain, Buddhist, Parsi and non-religious styles, with search, style chips, filters, sorting, "show more", a preview modal and an empty state
- Simple 5-step editor (Choose design → Your details → Functions → Style & music → Download) with optional sections folded away, validation, free navigation and autosave
- Couple and family details, all optional lines with show/hide, editable wording presets in English and Hindi
- 26 tradition presets, 80 blessings and verses (Ram Charit Manas chaupais with meanings, Valmiki Ramayan, Vedic mantras, Shiv, Krishna, Ganesh, Lakshmi, Sikh, Muslim, Christian KJV, Jain, Buddhist, Parsi) or your own, 45 function presets plus custom functions
- Viral reel invitations: 5 watercolour story templates with 8 scenes (opening, gold monogram drawn stroke by stroke, divine setting, invitation, functions, wedding, blessings, closing), editable text layers, monogram styles, accents, fonts, background intensity, petals, music with fades, Full HD or 4K MP4, poster PNG, scene navigator and a final review
- My Account: saved profiles on this device, default profile, auto-fill for new cards and reels, “Fill my details” / “Save to my account” in both editors, export/import
- Functions: add, rename, edit, reorder, duplicate, delete, sort by date, timeline view, per-function photo, QR, message, dress code and an optional separate template
- Editor: palettes, custom colours, fonts for names, headings, body and Devanagari, text, name and line-spacing sizes, weight, alignment, frames, ornament level, background pattern, element visibility, photo upload with zoom and position plus four frame shapes, undo/redo (buttons and <kbd>Ctrl/Cmd+Z</kbd>), reset styling, duplicate, start over, and Easy/Advanced modes
- English, Hindi and bilingual cards with Hindi dates and times (“रात्रि 8:00 बजे”) and optional Devanagari numerals
- Live preview drawn by the same renderer as the exports, with a warning when text has to be shortened to fit
- Downloads: PNG, JPEG, single or multi-page PDF (5×7 / A5 / A4, bleed and crop marks), function cards ZIP, save-the-date, Instagram set, shown with file name, size and dimensions after each file is created
- Video: 4 aspect ratios, short or extended length, 3 transitions, petals or sparkles, 9 original music tracks or your own song file, volume, start position, preview, true MP4 export (WebCodecs, faster than real time) with progress and cancel
- Music links: paste a YouTube or Spotify link to play that song on the wedding website through the official embedded player, plus a list of popular wedding-song ideas
- One-click downloads: Image (PNG/JPG), PDF, MP4, Website, or **Download everything** as one ZIP
- Sharing: Web Share API (files) with a download fallback, an editable WhatsApp message, copy wording, a website link, QR codes (website, venue, functions, RSVP), a WhatsApp RSVP link and reply template, captions and hashtags
- Wedding website: countdown, story, functions in order with directions and **Add to calendar (.ics)**, invitation image, gallery with lightbox, WhatsApp RSVP and blessings, optional music button, preview in a new tab or download as a ZIP with instructions
- My Designs: list, open, rename, duplicate, delete, export and import backups (with photos and audio), reset all local data
- Light and dark workspace, keyboard accessible, mobile-first layout, reduced-motion support, no external network dependencies

### Needs a backend or extra service (not included)
| Feature | Why |
|---|---|
| Automatic public link for each couple's website | Needs storage and hosting per user. Today you download the ZIP and host it yourself. |
| Online RSVP form that collects responses | Needs a database or form service, plus consent, spam protection and data retention. |
| Guest list management and reminders | Same as above, plus messaging. |
| Cloud sync and accounts | Needs authentication and storage. |
| Machine translation | Needs a translation API, and you'd have to be told when text leaves the device. |
| Guaranteed MP4 with AAC audio in every browser | Browser recorders differ. A server-side or WebCodecs encoder would be needed for Firefox. |
| Licensed commercial music library | Needs licences. Only original synthesised tracks are bundled. |
| Putting YouTube/Spotify audio inside the MP4 | Not allowed by those platforms' terms and usually copyrighted. Links are used only as embedded players on the website. |

## 5. Browser notes
- PNG, JPEG, PDF, ZIP and the website export work in current Chrome, Edge, Firefox and Safari.
- Video: Chrome, Edge and Safari encode a real MP4 with WebCodecs (H.264 + AAC where the platform supports AAC, otherwise Opus). Other browsers fall back to `MediaRecorder`, which records in real time (Firefox gives WebM). The studio tells you which audio codec was used.
- Sharing files through the share sheet works on most phones and on Safari and Edge on desktop. Otherwise the file is downloaded and you attach it yourself. WhatsApp links can only carry text.
- Drafts live in IndexedDB on one device. Private or incognito windows delete them when closed.

## 6. Licences
Code: MIT (see `LICENSE`). Fonts: SIL Open Font License 1.1. Libraries: jsPDF (MIT), JSZip (MIT or GPLv3, used under MIT), qrcode-generator (MIT) and mp4-muxer (MIT). Templates, ornaments and music are original to this project. See `ATTRIBUTION.md`.
