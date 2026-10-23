// Realistic devotional artwork bundled with the site: paintings and prints by Raja Ravi Varma (1848–1906)
// and his press, from Wikimedia Commons. Public domain (artist died over 100 years ago) or CC BY 4.0
// (Wellcome Collection scans, which require the credit shown here).
// crop = fraction trimmed from [left, top, right, bottom] (removes printed captions & signatures).
// focus = default point of interest (0–1) used for slow Ken-Burns camera moves.
export const ART = {
  'shiva-parvati-nandi': { file: 'assets/art/rv-shiva-parvati-nandi.jpg', title: 'Shiva and Parvati with Nandi', deity: 'Shiv & Parvati', artist: 'Raja Ravi Varma (oleograph)', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:An_Oleograph_of_Shiva,_Parvati_and_Nandi_by_Raja_Ravi_Varma.jpg', crop: [0, 0, 0, 0.02], focus: [0.55, 0.3] },
  'shiva-parvati-ganesha': { file: 'assets/art/rv-shiva-parvati-ganesha.jpg', title: 'Shiva, Parvati and Ganesha on Nandi', deity: 'Shiv, Parvati & Ganesh', artist: 'Raja Ravi Varma', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Siva-parvati-by-raja-ravi-varma.jpg', crop: [0.02, 0.02, 0.02, 0.07], focus: [0.5, 0.35] },
  'kailash-family': { file: 'assets/art/rv-kailash-family.jpg', title: 'Shiva, Parvati and Ganesha enthroned on Mount Kailas', deity: 'Shiv, Parvati & Ganesh', artist: 'Ravi Varma Press, chromolithograph', license: 'CC BY 4.0 — Wellcome Collection', url: 'https://commons.wikimedia.org/wiki/File:Shiva,_Parvati_and_Ganesha_enthroned_on_Mount_Kailas_with_Na_Wellcome_V0045136.jpg', crop: [0.02, 0.02, 0.02, 0.06], focus: [0.45, 0.35] },
  'krishna-radha': { file: 'assets/art/rv-krishna-radha.jpg', title: 'Krishna embracing Radha', deity: 'Radha & Krishna', artist: 'Raja Ravi Varma, chromolithograph', license: 'CC BY 4.0 — Wellcome Collection', url: 'https://commons.wikimedia.org/wiki/File:Krishna_embracing_Radha._Chromolithograph_by_R._Varma._Wellcome_V0045101.jpg', crop: [0.03, 0.03, 0.03, 0.07], focus: [0.45, 0.3] },
  'sita-swayamvar': { file: 'assets/art/rv-sita-swayamvar.jpg', title: 'Rama breaking the bow to win Sita', deity: 'Sita & Ram', artist: 'Raja Ravi Varma', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Rama_breaking_the_bow_to_win_Sita_as_wife.jpg', crop: [0, 0, 0, 0.03], focus: [0.5, 0.45] },
  'ram-darbar': { file: 'assets/art/rv-ram-darbar.jpg', title: 'Ram Panchayatan (Ram Darbar)', deity: 'Sita & Ram', artist: 'Raja Ravi Varma (lithograph)', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Ramapanchayan,_Raja_Ravi_Varma_(Lithograph).jpg', crop: [0.02, 0.02, 0.02, 0.04], focus: [0.5, 0.4] },
  'gajalakshmi': { file: 'assets/art/rv-gajalakshmi.jpg', title: 'Gajalakshmi with Saraswati', deity: 'Lakshmi', artist: 'Raja Ravi Varma', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Gajalakshmi.jpeg', crop: [0, 0, 0, 0.02], focus: [0.5, 0.3] },
  'lakshmi': { file: 'assets/art/rv-lakshmi.jpg', title: 'Goddess Lakshmi', deity: 'Lakshmi', artist: 'Raja Ravi Varma', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Raja_Ravi_Varma,_Goddess_Lakshmi,_1896.jpg', crop: [0, 0, 0, 0.02], focus: [0.5, 0.3] },
};
export const ART_LIST = Object.entries(ART).map(([id, a]) => ({ id, ...a }));
export const artCredit = a => `${a.title} — ${a.artist}. ${a.license}. Source: Wikimedia Commons.`;

/**
 * Copy-ready prompts for people who want photorealistic AI artwork or video clips of their own
 * (e.g. Google Gemini / Veo, Meta AI, Microsoft Designer, Midjourney, Kling, Runway).
 * The site never sends anything to those services — users generate, check and upload the result themselves.
 */
const COMMON = 'Vertical 9:16 composition, 1080x1920. Photorealistic, cinematic soft light, rich natural colours, reverent and dignified depiction of the deity, traditional Indian attire and jewellery, no text, no letters, no watermark, no logo, leave the upper third calm for text.';
export const PROMPTS = {
  'kailash-dawn': `Mount Kailash at golden sunrise, clouds slowly parting, snow peaks glowing, a small Shiva temple with diyas on a ledge. ${COMMON}`,
  'mushak-messenger': `Lord Ganesha's little mouse (Mushak) wearing a tiny red silk saddle, joyfully carrying a rolled wedding invitation card through Himalayan meadows towards Mount Kailash, shallow depth of field, Pixar-level fur detail but photoreal. ${COMMON}`,
  'parvati-ganesha': `Goddess Parvati in a red silk saree with gold jewellery, lovingly holding child Ganesha on a decorated Kailash shrine with marigolds, diyas and rose petals, snow peaks behind. ${COMMON}`,
  'ganesha-blessing': `Adorable child Lord Ganesha with a gold mukut and red tilak, blessing a wedding invitation card resting on a brass thali with kumkum, rice and flowers, warm candle light. ${COMMON}`,
  'shiva-parvati-kailash': `Lord Shiva with blue-grey skin, matted hair with a crescent moon and the Ganga, rudraksha, trishul and damru, sitting with Goddess Parvati in a red saree on a rock at Kailash, Nandi resting nearby, serene expressions, sunrise. ${COMMON}`,
  'eagle-scroll': `A majestic eagle flying over pine forests and a turquoise Himalayan lake, carrying a golden rolled scroll tied with red thread in its talons. ${COMMON}`,
  'nandi-scroll': `Nandi, a white sacred bull with a decorated saddle and bells, walking across a snowy bridge at Mount Kailash carrying a golden scroll. ${COMMON}`,
  'bride-hands': `Close-up of a bride's hands with intricate mehendi, red and gold bangles and a red dupatta, holding a golden rolled scroll in front of a calm mountain lake. ${COMMON}`,
  'radha-krishna': `Lord Krishna in yellow pitambar with a peacock-feather crown and flute, with Radha in a pink lehenga, on the banks of the Yamuna at Vrindavan at dusk, lotus flowers, soft lamps. ${COMMON}`,
  'krishna-hand-lotus': `Pichwai painting style: the blue hand of Lord Krishna with gold bangles holding a pink lotus, reaching towards a bride's hennaed hand, ivory floral background with fine gold border. ${COMMON}`,
  'sita-ram': `Lord Rama in royal yellow and gold with his bow, and Goddess Sita in a red bridal saree holding a varmala, in a palace courtyard of Janakpur decorated with marigolds. ${COMMON}`,
  'lakshmi-lotus': `Goddess Lakshmi standing on a pink lotus in a lake, gold coins falling softly, two white elephants with garlands, dawn light. ${COMMON}`,
  'carved-doors': `Ornate carved Indian wooden double doors with brass knockers, slowly opening to bright golden light, marigold toran above. Horizontal or vertical. No text.`,
  'couple-photo': `Use your own photo. For a sticker cut-out look, save it as a PNG with a transparent background (iPhone: touch and hold the subject → Copy/Share; Android Google Photos, Canva or remove.bg can also remove backgrounds).`,
};
