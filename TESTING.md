# Testing checklist

Run these checks locally (`python3 -m http.server 8000`) and again on the live GitHub Pages address. Test on one desktop browser and one phone.

## Navigation & home
- [ ] Every header link works: Home, Templates, Create Invitation, Video Invitations, Wedding Website, My Designs, How It Works
- [ ] On a phone, the ☰ menu opens and closes, and choosing a link closes it
- [ ] The theme toggle switches light/dark and is remembered after reload
- [ ] The hero cards and phone animate. With *Reduce motion* turned on in the OS, they stay still.
- [ ] No horizontal scrolling at 360 px width

## Template gallery
- [ ] Search finds “punjab”, “lotus”, “royal”. Nonsense text shows the empty state, and **Clear filters** resets everything.
- [ ] Each style chip, tradition, region, format and language filter, and sort order, changes the results
- [ ] **Preview** opens a modal with 5 pages. <kbd>Esc</kbd> closes it and focus returns.
- [ ] **Customize** opens the studio with that template and suitable tradition presets

## Editor (5 steps)
- [ ] Step 1: tradition chips (Hindu, Sikh, Muslim…) and search filter the 73 designs
- [ ] Step 2: choose a Ram Charit Manas chaupai; it appears in Devanagari at the top of the card
- [ ] Step 4: paste a YouTube link, see “link added”, press “Listen here”
- [ ] Step 5: PNG, JPG, PDF, Create MP4, Website ZIP and “Download everything” all download
- [ ] Clear the bride's name, press **Next**: the field is highlighted with a message and you stay on the step
- [ ] Clicking a step in the progress bar jumps there, and data entered earlier is still there
- [ ] Switching language to Hindi or bilingual shows the Hindi fields, and the preview updates
- [ ] Changing tradition asks before replacing functions. **Cancel** keeps them.
- [ ] Every **Show** checkbox hides or shows its line in the preview
- [ ] Upload a couple photo, then try zoom, horizontal and vertical position, shape, and Remove
- [ ] Functions: Add, edit, Move up/down, Duplicate, Delete (with confirmation), Sort by date, and the Timeline shows them in order
- [ ] Remove a function's date: going to step 9 flags it, and **Review** jumps to it
- [ ] Customize: palettes, fonts (Advanced), sizes, frame, ornaments None/Minimal, visibility checkboxes
- [ ] Undo/Redo buttons and <kbd>Ctrl/Cmd+Z</kbd> (outside text boxes)
- [ ] Very long names (for example 40 characters) shrink to fit and never get cut off. The notice appears if lines are dropped.
- [ ] Easy/Advanced toggle hides and shows the advanced controls

## Downloads (step 9)
- [ ] PNG and JPEG download. The size line shows the correct dimensions (5×7 = 1500×2100).
- [ ] Instagram set downloads 3 files
- [ ] Complete PDF has every page. A5 and A4 sizes are correct. Bleed adds 3 mm and crop marks.
- [ ] Function cards ZIP contains one JPEG per function
- [ ] Open each file: the text is sharp and matches the preview
- [ ] Save-the-date page (Page → Save the Date) downloads

## Video (step 7)
- [ ] Play preview animates in the preview area, with music
- [ ] Listen to music plays and stops each built-in track
- [ ] Upload an MP3, then check the start position slider and volume
- [ ] Export video shows progress, Cancel works, and the finished file plays with sound
- [ ] Check the format label (MP4 or WebM) is correct for the browser

## Viral reels (#/reels)
- [ ] Five template cards show painted thumbnails. **Preview** plays the animation in a dialog.
- [ ] **Use this template** opens the editor with 8 scenes, about 34 s
- [ ] Typing the bride's name updates the invitation and monogram scenes live
- [ ] Two functions on the same day and venue show as one scene (“Haldi & Mehendi”). Marking a different main ceremony moves it to the “Wedding” scene.
- [ ] Add, remove and reorder functions. Switch template, language (Hindi), verse (Ram Charit Manas), monogram style, accent, fonts, background, side, petals and length.
- [ ] Play and pause with music. The scrubber and scene chips jump to scenes.
- [ ] Step 3 lists missing details. **Create MP4 video** shows progress, can be cancelled, and downloads a 1080×1920 MP4 of about 34 s that matches the preview.
- [ ] **Download poster (PNG)** saves 1080×1920
- [ ] The reel appears in My Designs with a painted thumbnail and opens in the reel editor

## Realistic reels
- [ ] Gallery shows “Realistic & trending” (6) and “Watercolour stories” (5) with painted or real-art thumbnails
- [ ] Mangal Patrika: Kailash painting through clouds, Ganesh, patrika card, swastik drawn stroke by stroke, one card per function day, families, closing. Hindi text renders correctly.
- [ ] Upload an image, then an MP4 clip, to a scene slot. Both appear in the preview and in the exported MP4. **Remove** restores the painting.
- [ ] **AI prompt** copies a prompt to the clipboard
- [ ] Meet the Couple / Ghar Ka Beta: a transparent PNG gets a white sticker outline, a normal photo gets a white border. Fun tags appear around the photo.
- [ ] A tithi typed on a function shows on its scene. Nothing is calculated.
- [ ] The last frame shows the artwork credit, and step 3 lists the credits with a copy button

## Clock, calendar & mouse effects
- [ ] The header clock ticks every second. Clicking it opens the calendar with today highlighted.
- [ ] Saved functions show as gold dots, the countdown shows the next one, and clicking a dot lists the functions with links
- [ ] With a mouse, a soft golden glow and sparkles follow the cursor, and cards tilt. The “Cursor sparkles” switch turns them off (remembered). Nothing appears on touch screens or with reduced motion.

## My Account (#/account)
- [ ] Create a profile, save, reload: it is still there and marked Default
- [ ] **Card** and **Reel** buttons open new designs filled with the saved names, venue and functions
- [ ] In either editor, **Save to my account** stores the current details. **Fill my details** fills them, and asks before replacing functions.
- [ ] Export, then Import: a copy appears. Delete asks first.
- [ ] Turning off auto-fill makes new designs start with the sample text

## Sharing
- [ ] **Send on WhatsApp** opens WhatsApp or WhatsApp Web with the edited message
- [ ] **Share invitation image** opens the share sheet on a phone, or downloads with a notice on desktop
- [ ] Copy buttons copy text, and a toast confirms it
- [ ] The QR code scans to the selected link, and Download QR works
- [ ] The RSVP link opens a chat with the RSVP number

## Wedding website
- [ ] Preview opens in a new tab (allow pop-ups). The countdown ticks, *Add to calendar* downloads an .ics, RSVP opens WhatsApp, and the music button plays and pauses.
- [ ] The ZIP contains index.html, images, fonts, music and README.txt. Opening index.html from a local server looks the same.

## My Designs & privacy
- [ ] Drafts appear after editing (autosave). Check rename, duplicate, delete and Open.
- [ ] Export backup, then Import it: a copy appears with photos and audio
- [ ] Importing a random JSON file shows a clear error
- [ ] Reset all local data empties the list after confirmation
- [ ] In DevTools → Network, after the first load, editing and exporting send no requests to other sites

## Accessibility
- [ ] You can complete the whole flow with the keyboard alone, and focus rings are visible
- [ ] A screen reader announces step names, toasts and the preview label
- [ ] Text contrast is readable in both themes

## After deploying to GitHub Pages
- [ ] Site loads at `https://<user>.github.io/<repo>/` with no 404s in DevTools (fonts, vendor scripts, icons)
- [ ] `privacy.html`, `terms.html` and a random missing URL (404 page) work
- [ ] The favicon shows. The social preview works after you set the absolute og:image URL.
