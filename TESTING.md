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

## Wizard
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
