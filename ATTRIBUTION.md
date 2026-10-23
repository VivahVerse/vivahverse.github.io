# Credits & licences

## Original to this project
- **Invitation templates and ornaments.** The 95 templates and every motif (lotus, paisley, mandala, marigold toran and garland, mango leaves, kalash, peacock feathers, kolam, palm fronds, roses, domes, lanterns, fairy lights, dharma chakra, fish, Warli figures, chinar leaves, gopuram, shankha, art-deco fans, agni kund, dhanush, mandap, bindi, trishul & damru, bansuri, painted ghats, Kailash, Vrindavan, Ayodhya, temple and palace scenes, arches, diyas, bells, jaali, kasavu, phulkari, alpana, madhubani, gamosa, pattachitra, bandhani, leheriya, ikat, brocade and paithani borders) are drawn procedurally in `scripts/render/motifs.js` and `scripts/render/card.js`. No third-party artwork or stock images are used.
- **Watercolour reel artwork.** The story reels (Divine Union, Vrindavan Prem, Siya Ram Vivah, Rajwada Royal, Pastel Promise) are painted procedurally in `scripts/render/watercolor.js` and `scripts/render/story.js`: paper texture, washes, river ghats, Kailash, courtyard gateway, marigold garlands, Nandi, trishul and damru, flute and peacock feathers, bow and quiver, kalash, lotuses and figures seen from behind. They were inspired by the popular style of reel invitations, but no frames, illustrations, music or branding from any reel or creator were copied.
- **Music.** “Shehnai Dawn”, “Sitar Sandhya”, “Bansuri Breeze”, “Mehendi Bells”, “Dholki Nights”, “Royal Procession”, “Sufi Shaam”, “Piano Vows” and “Chapel Organ” are original compositions synthesised in the browser by `scripts/music.js`. You may use them in invitations made with this tool.
- **Sample content.** All names, addresses and phone numbers are fictional.

## Paintings (bundled in `assets/art/`, from Wikimedia Commons)
Raja Ravi Varma (1848–1906) died more than 100 years ago, so his paintings are in the public domain. The Wellcome Collection scans are licensed CC BY 4.0 and must be credited, which the reels do automatically on their last frame.
| File | Work | Licence |
|---|---|---|
| rv-shiva-parvati-nandi.jpg | Shiva and Parvati with Nandi, oleograph by Raja Ravi Varma | Public domain |
| rv-shiva-parvati-ganesha.jpg | Shiva, Parvati and Ganesha on Nandi, Raja Ravi Varma | Public domain |
| rv-kailash-family.jpg | Shiva, Parvati and Ganesha enthroned on Mount Kailas, Ravi Varma Press chromolithograph, Wellcome Collection | CC BY 4.0 |
| rv-krishna-radha.jpg | Krishna embracing Radha, chromolithograph by R. Varma, Wellcome Collection | CC BY 4.0 |
| rv-sita-swayamvar.jpg | Rama breaking the bow to win Sita, Raja Ravi Varma | Public domain |
| rv-ram-darbar.jpg | Ram Panchayatan, Raja Ravi Varma (lithograph) | Public domain |
| rv-gajalakshmi.jpg | Gajalakshmi with Saraswati, Raja Ravi Varma | Public domain |
| rv-lakshmi.jpg | Goddess Lakshmi (1896), Raja Ravi Varma | Public domain |

Source pages are linked in `scripts/data/art.js`. Images were resized (maximum 1800 px).

The six realistic reel templates were *inspired by* viral Instagram invitation reels (scene ideas such as a messenger carrying the card to Kailash, carved doors opening onto a red-and-gold patrika, a Pichwai save-the-date, and photo "meet the couple" reels). No frames, artwork, music, logos or watermarks from those reels or their creators are used. Users who want photorealistic AI art generate it themselves with their own tools and upload it.

## Third-party software (bundled in `vendor/`)
| Library | Version | Licence |
|---|---|---|
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.2 | MIT (`vendor/LICENSE-jspdf.txt`) |
| [JSZip](https://github.com/Stuk/jszip) | 3.10.1 | MIT or GPLv3, used under MIT (`vendor/LICENSE-jszip.md`) |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) | 1.4.4 | MIT, © Kazuhiko Arase |
| [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) | 5.1.3 | MIT (`vendor/LICENSE-mp4-muxer.txt`) |

## Verses
Ram Charit Manas (Goswami Tulsidas, 16th century), Rigveda mantras, Sanskrit shlokas, Pali and Jain prayers are traditional public-domain texts. Bible verses use the King James Version (public domain). The Quran 30:21 line is our own plain-language rendering of its meaning. Song titles in the “song ideas” list are given for reference only; no songs are included or downloaded.

## Fonts (bundled in `assets/fonts/`, via [Fontsource](https://fontsource.org))
All under the SIL Open Font License 1.1. Licence texts are in `assets/fonts/LICENSE-*.txt`.
Cinzel · Cormorant Garamond · Playfair Display · Marcellus · DM Serif Display · Josefin Sans · Great Vibes · Pinyon Script · Manrope · Tiro Devanagari Hindi · Noto Serif Devanagari · Yatra One · Amita · Rozha One · Noto Sans Gurmukhi · Amiri

## Inspiration
General usability patterns, such as template discovery, step-by-step editing and export flows, were informed by common practice in online design and invitation tools. No proprietary templates, code, branding or assets from any such product were used.
