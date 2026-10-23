// Cultural styles, invocations, wording presets and function presets.
// Everything here is a suggestion: users can edit or hide every line.
// To add a language: add its key to LANGUAGES, add strings to each {en, hi, ...} object,
// and add a font stack in render/fonts.js.

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
  { id: 'bi', label: 'English + हिन्दी' },
];

// Invocations / blessings. `text` is per language; users may type their own.
export const INVOCATIONS = [
  { id: 'none', label: 'No invocation', text: { en: '', hi: '' } },
  { id: 'ganesh', label: 'Shri Ganeshaya Namah', text: { en: '|| Shri Ganeshaya Namah ||', hi: '॥ श्री गणेशाय नमः ॥' } },
  { id: 'om', label: 'Om', text: { en: 'ॐ', hi: 'ॐ' } },
  { id: 'vakratunda', label: 'Vakratunda Mahakaya (shloka)', text: { en: 'Vakratunda Mahakaya Suryakoti Samaprabha\nNirvighnam Kuru Me Deva Sarva Karyeshu Sarvada', hi: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥' } },
  { id: 'ikonkar', label: 'Ik Onkar', text: { en: 'ੴ', hi: 'ੴ' } },
  { id: 'waheguru', label: 'Waheguru Ji Ka Khalsa', text: { en: 'Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh', hi: 'वाहेगुरु जी का खालसा, वाहेगुरु जी की फ़तेह' } },
  { id: 'bismillah', label: 'Bismillah', text: { en: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ', hi: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ' } },
  { id: 'christian', label: 'Two shall become one', text: { en: '“And the two shall become one.”', hi: '“और वे दोनों एक तन होंगे।”' } },
  { id: 'jain', label: 'Namokar (Jain)', text: { en: 'Namo Arihantanam', hi: 'णमो अरिहंताणं' } },
  { id: 'durga', label: 'Shubh Vivah (Bengali style)', text: { en: '|| Shubho Bibaho ||', hi: '॥ शुभ विवाह ॥' } },
  { id: 'custom', label: 'Write my own', text: { en: '', hi: '' } },
];

export const CULTURES = [
  { id: 'universal', label: 'Universal / Non-religious', invocation: 'none', template: 'chandni',
    events: ['mehendi', 'sangeet', 'wedding', 'reception'] },
  { id: 'hindu-north', label: 'Hindu — North Indian', invocation: 'ganesh', template: 'rajmahal',
    events: ['tilak', 'haldi', 'mehendi', 'sangeet', 'baraat', 'pheras', 'reception'] },
  { id: 'hindu-south', label: 'Hindu — South Indian', invocation: 'vakratunda', template: 'kasavu',
    events: ['nischayam', 'haldi', 'muhurtham', 'reception'] },
  { id: 'marathi', label: 'Marathi', invocation: 'ganesh', template: 'paithani',
    events: ['sakharpuda', 'haldi', 'wedding', 'reception'] },
  { id: 'gujarati', label: 'Gujarati', invocation: 'ganesh', template: 'genda',
    events: ['ganeshpuja', 'mehendi', 'garba', 'wedding', 'reception'] },
  { id: 'bengali', label: 'Bengali', invocation: 'durga', template: 'alpana',
    events: ['aashirbaad', 'gayeholud', 'wedding', 'bouBhaat'] },
  { id: 'rajasthani', label: 'Rajasthani', invocation: 'ganesh', template: 'jharokha',
    events: ['tilak', 'haldi', 'mehendi', 'sangeet', 'baraat', 'pheras'] },
  { id: 'sikh', label: 'Sikh', invocation: 'ikonkar', template: 'phulkari',
    events: ['roka', 'chunni', 'mehendi', 'anandkaraj', 'reception'] },
  { id: 'muslim', label: 'Muslim', invocation: 'bismillah', template: 'noor',
    events: ['mangni', 'mehendi', 'nikah', 'walima'] },
  { id: 'christian', label: 'Christian', invocation: 'christian', template: 'chapel',
    events: ['engagement', 'church', 'reception'] },
  { id: 'jain', label: 'Jain', invocation: 'jain', template: 'kamal',
    events: ['sagai', 'mehendi', 'wedding', 'reception'] },
];

// Function presets. `name` per language, default time, a short default message.
export const EVENT_PRESETS = {
  roka:       { name: { en: 'Roka', hi: 'रोका' }, time: '11:00', icon: 'ring', msg: { en: 'A blessed beginning of two families.', hi: 'दो परिवारों के मिलन की शुभ शुरुआत।' } },
  sagai:      { name: { en: 'Sagai', hi: 'सगाई' }, time: '18:00', icon: 'ring', msg: { en: 'Join us as the rings are exchanged.', hi: 'अंगूठी की रस्म में सम्मिलित हों।' } },
  engagement: { name: { en: 'Engagement', hi: 'सगाई' }, time: '18:00', icon: 'ring', msg: { en: 'Join us as the rings are exchanged.', hi: 'अंगूठी की रस्म में सम्मिलित हों।' } },
  mangni:     { name: { en: 'Mangni', hi: 'मंगनी' }, time: '18:00', icon: 'ring', msg: { en: 'Join us for the engagement.', hi: 'मंगनी की रस्म में सम्मिलित हों।' } },
  sakharpuda: { name: { en: 'Sakharpuda', hi: 'साखरपुडा' }, time: '17:00', icon: 'ring', msg: { en: 'A sweet beginning — join us for the engagement.', hi: 'सगाई के मधुर अवसर पर पधारें।' } },
  nischayam:  { name: { en: 'Nischayathartham', hi: 'निश्चयतार्थम्' }, time: '10:00', icon: 'ring', msg: { en: 'The formal engagement of the couple.', hi: 'वर-वधू का औपचारिक वाग्दान।' } },
  tilak:      { name: { en: 'Tilak', hi: 'तिलक' }, time: '11:00', icon: 'diya', msg: { en: 'The bride’s family welcomes the groom.', hi: 'वधू पक्ष द्वारा वर का तिलक।' } },
  chunni:     { name: { en: 'Chunni Ceremony', hi: 'चुन्नी की रस्म' }, time: '12:00', icon: 'flower', msg: { en: 'The groom’s family welcomes the bride.', hi: 'वर पक्ष द्वारा वधू का स्वागत।' } },
  ganeshpuja: { name: { en: 'Ganesh Puja', hi: 'गणेश पूजा' }, time: '09:00', icon: 'diya', msg: { en: 'Seeking blessings for an auspicious start.', hi: 'शुभ आरंभ हेतु विघ्नहर्ता का पूजन।' } },
  chowki:     { name: { en: 'Mata Ki Chowki', hi: 'माता की चौकी' }, time: '19:00', icon: 'diya', msg: { en: 'An evening of bhajans and devotion.', hi: 'भजन संध्या एवं माता का जागरण।' } },
  haldi:      { name: { en: 'Haldi', hi: 'हल्दी' }, time: '10:00', icon: 'marigold', dress: 'Shades of yellow', msg: { en: 'Come dressed in yellow and bring your brightest smiles.', hi: 'पीले परिधान में पधारें, हल्दी की रस्म में रंग भरें।' } },
  gayeholud:  { name: { en: 'Gaye Holud', hi: 'गाये हलुद' }, time: '09:00', icon: 'marigold', dress: 'Yellow & white', msg: { en: 'A morning of turmeric, songs and laughter.', hi: 'हल्दी, गीत और हँसी की एक सुबह।' } },
  mehendi:    { name: { en: 'Mehendi', hi: 'मेहंदी' }, time: '16:00', icon: 'leaf', dress: 'Greens & florals', msg: { en: 'An afternoon of henna, music and colour.', hi: 'मेहंदी, संगीत और रंगों की एक शाम।' } },
  sangeet:    { name: { en: 'Sangeet', hi: 'संगीत' }, time: '19:30', icon: 'music', dress: 'Festive glamour', msg: { en: 'An evening of music, dance and celebration.', hi: 'संगीत, नृत्य और उल्लास की संध्या।' } },
  garba:      { name: { en: 'Garba Night', hi: 'गरबा' }, time: '20:00', icon: 'music', dress: 'Chaniya choli & kediyu', msg: { en: 'Bring your dandiya — we dance till late!', hi: 'डांडिया लेकर आइए, देर रात तक गरबा!' } },
  baraat:     { name: { en: 'Baraat', hi: 'बारात' }, time: '19:00', icon: 'music', msg: { en: 'Dance with us as the groom arrives.', hi: 'वर के आगमन पर बारात में झूमें।' } },
  mandap:     { name: { en: 'Mandap Ceremony', hi: 'मंडप' }, time: '10:00', icon: 'arch', msg: { en: 'The sacred mandap is raised.', hi: 'पावन मंडप की स्थापना।' } },
  wedding:    { name: { en: 'Wedding Ceremony', hi: 'विवाह संस्कार' }, time: '20:00', icon: 'arch', msg: { en: 'Witness the sacred union and bless the couple.', hi: 'पावन परिणय के साक्षी बनें, वर-वधू को आशीर्वाद दें।' } },
  pheras:     { name: { en: 'Pheras', hi: 'फेरे' }, time: '22:00', icon: 'diya', msg: { en: 'Seven vows around the sacred fire.', hi: 'अग्नि के समक्ष सात वचन।' } },
  muhurtham:  { name: { en: 'Muhurtham', hi: 'मुहूर्तम्' }, time: '07:30', icon: 'diya', msg: { en: 'The auspicious moment of the wedding.', hi: 'विवाह का शुभ मुहूर्त।' } },
  anandkaraj: { name: { en: 'Anand Karaj', hi: 'आनंद कारज' }, time: '10:00', icon: 'arch', msg: { en: 'The blissful union, in the presence of Guru Granth Sahib Ji.', hi: 'श्री गुरु ग्रंथ साहिब जी की हजूरी में आनंद कारज।' } },
  nikah:      { name: { en: 'Nikah', hi: 'निकाह' }, time: '19:00', icon: 'moon', msg: { en: 'We request the honour of your presence at the Nikah.', hi: 'निकाह की मुबारक घड़ी में शिरकत फ़रमाएँ।' } },
  walima:     { name: { en: 'Walima', hi: 'वलीमा' }, time: '20:00', icon: 'moon', msg: { en: 'Join us for the Walima dinner.', hi: 'दावत-ए-वलीमा में शिरकत फ़रमाएँ।' } },
  church:     { name: { en: 'Church Wedding', hi: 'चर्च विवाह' }, time: '11:00', icon: 'bell', msg: { en: 'Join us as we exchange our vows.', hi: 'हमारी प्रतिज्ञाओं के साक्षी बनें।' } },
  aashirbaad: { name: { en: 'Aashirbaad', hi: 'आशीर्वाद' }, time: '11:00', icon: 'flower', msg: { en: 'The elders bless the couple.', hi: 'बड़ों का आशीर्वाद।' } },
  bouBhaat:   { name: { en: 'Bou Bhaat', hi: 'बौ भात' }, time: '20:00', icon: 'flower', msg: { en: 'A feast to welcome the bride home.', hi: 'वधू के स्वागत में प्रीतिभोज।' } },
  reception:  { name: { en: 'Reception', hi: 'प्रीतिभोज' }, time: '20:00', icon: 'star', dress: 'Formal / Indo-western', msg: { en: 'Dinner, music and blessings for the newlyweds.', hi: 'नवदंपति के आशीर्वाद समारोह एवं प्रीतिभोज।' } },
  vidaai:     { name: { en: 'Vidaai', hi: 'विदाई' }, time: '06:00', icon: 'flower', msg: { en: 'Bid a tearful, joyful farewell.', hi: 'भावभीनी विदाई।' } },
  lunch:      { name: { en: 'Post-wedding Lunch', hi: 'भोज' }, time: '13:00', icon: 'star', msg: { en: 'Relax and celebrate with us over lunch.', hi: 'दोपहर के भोज में सम्मिलित हों।' } },
  custom:     { name: { en: 'Custom Ceremony', hi: 'विशेष समारोह' }, time: '18:00', icon: 'star', msg: { en: '', hi: '' } },
};

// Order used for the "Add a function" picker.
export const EVENT_PICKER = ['roka', 'sagai', 'tilak', 'chunni', 'ganeshpuja', 'chowki', 'haldi', 'gayeholud', 'mehendi',
  'sangeet', 'garba', 'mandap', 'baraat', 'wedding', 'pheras', 'muhurtham', 'nikah', 'anandkaraj', 'church',
  'reception', 'walima', 'vidaai', 'lunch', 'custom'];

// Editable invitation wording presets.
export const WORDING = {
  headline: [
    { en: 'Together with their families', hi: 'सपरिवार सहर्ष आमंत्रण' },
    { en: 'With the blessings of our elders', hi: 'बड़ों के आशीर्वाद से' },
    { en: 'Request the pleasure of your company', hi: 'आपकी गरिमामयी उपस्थिति के आकांक्षी' },
    { en: 'Invite you to celebrate the wedding of', hi: 'के शुभ विवाह में आप सादर आमंत्रित हैं' },
  ],
  message: [
    { en: 'We joyfully invite you and your family to bless the couple with your presence.', hi: 'आप सपरिवार पधारकर वर-वधू को अपना आशीर्वाद प्रदान करें।' },
    { en: 'Your presence will make our celebration complete.', hi: 'आपकी उपस्थिति से हमारा उत्सव पूर्ण होगा।' },
    { en: 'Two hearts, one journey — come celebrate with us.', hi: 'दो दिल, एक सफ़र — हमारे साथ उत्सव मनाइए।' },
  ],
  closing: [
    { en: 'With love and warm regards', hi: 'सादर एवं सस्नेह' },
    { en: 'Awaiting your gracious presence', hi: 'आपकी प्रतीक्षा में' },
    { en: 'Your blessings are our greatest gift', hi: 'आपका आशीर्वाद ही हमारा उपहार है' },
  ],
};

// Starting tradition when a design is opened from a template. Regional templates get their
// region's presets; the rest start neutral, and the user picks a tradition in step 2.
export const TEMPLATE_CULTURE = {
  rajmahal: 'hindu-north', kasavu: 'hindu-south', alpana: 'bengali', phulkari: 'sikh', noor: 'muslim',
  chapel: 'christian', jharokha: 'rajasthani', paithani: 'marathi', genda: 'gujarati', banarasi: 'hindu-north',
};
export const cultureForTemplate = id => TEMPLATE_CULTURE[id] || 'universal';
