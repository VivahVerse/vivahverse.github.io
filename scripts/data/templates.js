// Data-driven template catalogue. Each template combines a palette, background,
// frame, ornaments and typography that the renderer (render/card.js) understands.
// To add a template, append an object here — no other code changes are needed.

export const FONTS = {
  display: ['Cinzel', 'Cormorant Garamond', 'Playfair Display', 'Marcellus', 'DM Serif Display', 'Josefin Sans'],
  script: ['Great Vibes', 'Pinyon Script', 'Cormorant Garamond', 'Playfair Display'],
  body: ['Cormorant Garamond', 'Josefin Sans', 'Marcellus', 'Playfair Display', 'Manrope'],
  deva: ['Tiro Devanagari Hindi', 'Noto Serif Devanagari', 'Yatra One', 'Amita', 'Rozha One'],
};

export const CATEGORIES = ['Traditional', 'Royal', 'Minimalist', 'Floral', 'Modern', 'Luxury', 'Pastel'];
export const CULTURE_TAGS = ['Hindu', 'Sikh', 'Muslim', 'Christian', 'Jain', 'Universal'];
export const REGIONS = ['Pan-India', 'North', 'South', 'East', 'West', 'Punjab', 'Rajasthan'];

const base = {
  languages: ['en', 'hi', 'bi'],
  formats: ['Card', 'Print PDF', 'Video', 'Website'],
};

export const TEMPLATES = [
  {
    ...base, id: 'rajmahal', name: 'Rajmahal', tagline: 'Maroon & gold palace arch',
    categories: ['Royal', 'Traditional', 'Luxury'], cultures: ['Hindu', 'Universal'], region: 'North', popular: 98,
    palette: { bg: '#5a0f1c', bg2: '#3b0811', ink: '#f7e7c6', ink2: '#e2c48d', accent: '#d8a84e', accent2: '#8a6420', leaf: '#3f6b3a', flower: '#e6b45c' },
    bg: { type: 'radial', pattern: 'mandala', patternAlpha: 0.08 },
    frame: { type: 'arch', style: 'cusped', inset: 5 }, top: 'bells', bottom: 'lotus', corners: null,
    fonts: { display: 'Cinzel', script: 'Great Vibes', body: 'Cormorant Garamond', deva: 'Tiro Devanagari Hindi' },
    names: 'script', divider: 'lotus', dark: true,
  },
  {
    ...base, id: 'genda', name: 'Genda Phool', tagline: 'Marigold toran & mango leaves',
    categories: ['Traditional', 'Floral'], cultures: ['Hindu', 'Jain', 'Universal'], region: 'West', popular: 95,
    palette: { bg: '#fff6e3', bg2: '#ffe7b8', ink: '#6b1f12', ink2: '#9a3b1c', accent: '#c46a12', accent2: '#8a3f08', leaf: '#3a7a35', leafVein: '#245322', marigold: '#f5a623', marigold2: '#e26d0e', flower: '#e26d0e' },
    bg: { type: 'radial', pattern: 'dots', patternAlpha: 0.12 },
    frame: { type: 'double', inset: 4 }, top: 'toran', bottom: 'diyas', corners: null,
    fonts: { display: 'Marcellus', script: 'Great Vibes', body: 'Cormorant Garamond', deva: 'Yatra One' },
    names: 'script', divider: 'dots', dark: false,
  },
  {
    ...base, id: 'kamal', name: 'Kamal', tagline: 'Blush lotus pond',
    categories: ['Floral', 'Pastel', 'Traditional'], cultures: ['Hindu', 'Jain', 'Universal'], region: 'Pan-India', popular: 92,
    palette: { bg: '#fdf0ef', bg2: '#f6d9d7', ink: '#5b2433', ink2: '#8c4a5a', accent: '#b8873a', accent2: '#e3a3ae', leaf: '#6f9a7d', flower: '#e8a0ad' },
    bg: { type: 'linear', pattern: null },
    frame: { type: 'thin', inset: 4.5 }, top: 'lotusRow', bottom: 'lotusPond', corners: null,
    fonts: { display: 'Cormorant Garamond', script: 'Pinyon Script', body: 'Cormorant Garamond', deva: 'Noto Serif Devanagari' },
    names: 'script', divider: 'lotus', dark: false,
  },
  {
    ...base, id: 'bagh', name: 'Mehendi Bagh', tagline: 'Emerald garden with paisleys',
    categories: ['Traditional', 'Floral', 'Luxury'], cultures: ['Hindu', 'Muslim', 'Sikh', 'Universal'], region: 'North', popular: 90,
    palette: { bg: '#0f3b2e', bg2: '#082519', ink: '#f3ead2', ink2: '#cfe0c3', accent: '#d4af5a', accent2: '#8d6d24', leaf: '#5c9a63', flower: '#e8c46a' },
    bg: { type: 'radial', pattern: 'buti', patternAlpha: 0.1 },
    frame: { type: 'double', inset: 4.5 }, top: 'mandalaHalf', bottom: 'paisleys', corners: 'paisley',
    fonts: { display: 'Playfair Display', script: 'Great Vibes', body: 'Cormorant Garamond', deva: 'Amita' },
    names: 'script', divider: 'paisley', dark: true,
  },
  {
    ...base, id: 'chandni', name: 'Chandni', tagline: 'Quiet ivory minimalism',
    categories: ['Minimalist', 'Modern'], cultures: ['Universal', 'Hindu', 'Christian', 'Muslim', 'Sikh', 'Jain'], region: 'Pan-India', popular: 88,
    palette: { bg: '#faf7f0', bg2: '#f1ece0', ink: '#2b2722', ink2: '#6d665a', accent: '#a88a52', accent2: '#cdb88a' },
    bg: { type: 'solid', pattern: null },
    frame: { type: 'thin', inset: 6 }, top: 'monogram', bottom: null, corners: null,
    fonts: { display: 'Cormorant Garamond', script: 'Cormorant Garamond', body: 'Josefin Sans', deva: 'Noto Serif Devanagari' },
    names: 'display', divider: 'line', dark: false,
  },
  {
    ...base, id: 'nouveau', name: 'Shaadi Nouveau', tagline: 'Bold terracotta arch, modern type',
    categories: ['Modern', 'Minimalist'], cultures: ['Universal', 'Hindu'], region: 'Pan-India', popular: 84,
    palette: { bg: '#f4e6d8', bg2: '#c8603f', ink: '#2a1a14', ink2: '#5a3a2c', accent: '#c8603f', accent2: '#1f4d4a', flower: '#e8a24a' },
    bg: { type: 'archBlock', pattern: null },
    frame: { type: 'none', inset: 5 }, top: null, bottom: 'sun', corners: null,
    fonts: { display: 'DM Serif Display', script: 'DM Serif Display', body: 'Josefin Sans', deva: 'Rozha One' },
    names: 'display', divider: 'dots', dark: false,
  },
  {
    ...base, id: 'jaali', name: 'Sone ki Jaali', tagline: 'Black & gold lattice luxury',
    categories: ['Luxury', 'Royal', 'Modern'], cultures: ['Universal', 'Hindu', 'Muslim', 'Sikh'], region: 'Pan-India', popular: 91,
    palette: { bg: '#141210', bg2: '#050404', ink: '#f1e3c0', ink2: '#bfae86', accent: '#e0b65a', accent2: '#8b6a26' },
    bg: { type: 'radial', pattern: 'jaali', patternAlpha: 0.12 },
    frame: { type: 'double', inset: 4 }, top: 'mandalaHalf', bottom: null, corners: 'star',
    fonts: { display: 'Cinzel', script: 'Pinyon Script', body: 'Marcellus', deva: 'Tiro Devanagari Hindi' },
    names: 'caps', divider: 'diamond', dark: true,
  },
  {
    ...base, id: 'gulabi', name: 'Gulabi Pastel', tagline: 'Peach & lavender watercolour florals',
    categories: ['Pastel', 'Floral', 'Modern'], cultures: ['Universal', 'Christian', 'Hindu'], region: 'Pan-India', popular: 87,
    palette: { bg: '#fbf1ec', bg2: '#ece3f4', ink: '#4a3557', ink2: '#7a6688', accent: '#c58f7a', accent2: '#b9a3d6', leaf: '#9fbf9a', flower: '#f1b3a5' },
    bg: { type: 'watercolor', pattern: null },
    frame: { type: 'none', inset: 6 }, top: null, bottom: null, corners: 'floral',
    fonts: { display: 'Cormorant Garamond', script: 'Great Vibes', body: 'Josefin Sans', deva: 'Amita' },
    names: 'script', divider: 'dots', dark: false,
  },
  {
    ...base, id: 'kasavu', name: 'Kasavu', tagline: 'Kerala off-white & gold bands, temple lamps',
    categories: ['Traditional', 'Minimalist'], cultures: ['Hindu', 'Universal'], region: 'South', popular: 86,
    palette: { bg: '#f7f2e4', bg2: '#efe6cf', ink: '#3a2a12', ink2: '#6a5228', accent: '#c9a03d', accent2: '#9b7522', diya: '#a86b2a' },
    bg: { type: 'solid', pattern: null },
    frame: { type: 'kasavu', inset: 3 }, top: 'bells', bottom: 'diyas', corners: null,
    fonts: { display: 'Marcellus', script: 'Cormorant Garamond', body: 'Cormorant Garamond', deva: 'Tiro Devanagari Hindi' },
    names: 'display', divider: 'diamond', dark: false,
  },
  {
    ...base, id: 'alpana', name: 'Alpana', tagline: 'Bengal red-and-white with alpana borders',
    categories: ['Traditional', 'Minimalist'], cultures: ['Hindu', 'Universal'], region: 'East', popular: 83,
    palette: { bg: '#fffaf5', bg2: '#f8ebe2', ink: '#7a0f12', ink2: '#9a3a2a', accent: '#b3161b', accent2: '#e2a23a', flower: '#b3161b' },
    bg: { type: 'solid', pattern: null },
    frame: { type: 'alpana', inset: 4 }, top: 'alpanaMotif', bottom: 'alpanaMotif', corners: null,
    fonts: { display: 'Cormorant Garamond', script: 'Cormorant Garamond', body: 'Cormorant Garamond', deva: 'Noto Serif Devanagari' },
    names: 'display', divider: 'dots', dark: false,
  },
  {
    ...base, id: 'phulkari', name: 'Phulkari', tagline: 'Punjabi embroidery in vivid geometry',
    categories: ['Traditional', 'Modern'], cultures: ['Sikh', 'Hindu', 'Universal'], region: 'Punjab', popular: 85,
    palette: { bg: '#7c0f2a', bg2: '#560a1d', ink: '#fff1d6', ink2: '#ffd79a', accent: '#f6a723', accent2: '#e94f8a', flower: '#ff7a2f', leaf: '#ffd23f' },
    bg: { type: 'radial', pattern: 'chevron', patternAlpha: 0.07 },
    frame: { type: 'phulkari', inset: 4 }, top: null, bottom: null, corners: null,
    fonts: { display: 'DM Serif Display', script: 'Great Vibes', body: 'Josefin Sans', deva: 'Yatra One' },
    names: 'script', divider: 'diamond', dark: true,
  },
  {
    ...base, id: 'jharokha', name: 'Jharokha', tagline: 'Rajasthani window arches in peacock blue',
    categories: ['Royal', 'Traditional'], cultures: ['Hindu', 'Universal'], region: 'Rajasthan', popular: 89,
    palette: { bg: '#123c5a', bg2: '#0a2338', ink: '#fbecd7', ink2: '#f2c7a5', accent: '#e9a23b', accent2: '#e0577b', leaf: '#2e8b7a', flower: '#e0577b' },
    bg: { type: 'radial', pattern: 'star8', patternAlpha: 0.06 },
    frame: { type: 'arch', style: 'pointed', inset: 5 }, top: 'jharokhas', bottom: 'lotus', corners: null,
    fonts: { display: 'Cinzel', script: 'Great Vibes', body: 'Cormorant Garamond', deva: 'Rozha One' },
    names: 'script', divider: 'star', dark: true,
  },
  {
    ...base, id: 'noor', name: 'Noor', tagline: 'Emerald geometry, crescent & stars',
    categories: ['Luxury', 'Traditional'], cultures: ['Muslim', 'Universal'], region: 'Pan-India', popular: 82,
    palette: { bg: '#0d4a42', bg2: '#062c27', ink: '#f6efdc', ink2: '#cfe3d8', accent: '#d9b25f', accent2: '#8f7230' },
    bg: { type: 'radial', pattern: 'star8', patternAlpha: 0.1 },
    frame: { type: 'arch', style: 'round', inset: 5 }, top: 'crescent', bottom: null, corners: 'star',
    fonts: { display: 'Marcellus', script: 'Pinyon Script', body: 'Cormorant Garamond', deva: 'Noto Serif Devanagari' },
    names: 'script', divider: 'star', dark: true,
  },
  {
    ...base, id: 'chapel', name: 'White Chapel', tagline: 'Sage wreath & soft white',
    categories: ['Minimalist', 'Floral'], cultures: ['Christian', 'Universal'], region: 'Pan-India', popular: 80,
    palette: { bg: '#fbfbf7', bg2: '#eef1e8', ink: '#2f3a2f', ink2: '#5c6b5a', accent: '#8a9a6b', accent2: '#c9b48a', leaf: '#8fa77f', flower: '#e7d9c1' },
    bg: { type: 'linear', pattern: null },
    frame: { type: 'thin', inset: 5 }, top: 'wreath', bottom: null, corners: null,
    fonts: { display: 'Cormorant Garamond', script: 'Pinyon Script', body: 'Josefin Sans', deva: 'Noto Serif Devanagari' },
    names: 'script', divider: 'line', dark: false,
  },
  {
    ...base, id: 'banarasi', name: 'Banarasi', tagline: 'Wine brocade with gold buti',
    categories: ['Luxury', 'Royal', 'Traditional'], cultures: ['Hindu', 'Universal'], region: 'North', popular: 90,
    palette: { bg: '#4a1036', bg2: '#2a0820', ink: '#fae9cf', ink2: '#e7c6a0', accent: '#e2b354', accent2: '#946a1f', flower: '#e2b354', leaf: '#6f8f4a' },
    bg: { type: 'radial', pattern: 'buti', patternAlpha: 0.14 },
    frame: { type: 'brocade', inset: 3.5 }, top: 'mandalaHalf', bottom: 'lotus', corners: 'paisley',
    fonts: { display: 'Playfair Display', script: 'Great Vibes', body: 'Cormorant Garamond', deva: 'Tiro Devanagari Hindi' },
    names: 'script', divider: 'paisley', dark: true,
  },
  {
    ...base, id: 'paithani', name: 'Paithani', tagline: 'Maharashtrian green & magenta silk border',
    categories: ['Traditional', 'Floral'], cultures: ['Hindu', 'Universal'], region: 'West', popular: 81,
    palette: { bg: '#fdf3e1', bg2: '#f6e2bf', ink: '#4b0f3b', ink2: '#7a2a5f', accent: '#b0217a', accent2: '#1e7a52', leaf: '#1e7a52', flower: '#b0217a', marigold: '#f3a21b', marigold2: '#d9640f' },
    bg: { type: 'radial', pattern: null },
    frame: { type: 'paithani', inset: 3 }, top: 'garland', bottom: 'lotus', corners: null,
    fonts: { display: 'Marcellus', script: 'Great Vibes', body: 'Cormorant Garamond', deva: 'Yatra One' },
    names: 'script', divider: 'lotus', dark: false,
  },
];

export const TEMPLATE_MAP = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

// Curated palettes users can apply on top of any template.
export const PALETTES = [
  { id: 'template', name: 'Template default', colors: null },
  { id: 'maroon-gold', name: 'Maroon & Gold', colors: { bg: '#5a0f1c', bg2: '#3b0811', ink: '#f7e7c6', ink2: '#e2c48d', accent: '#d8a84e', accent2: '#8a6420' }, dark: true },
  { id: 'ivory-gold', name: 'Ivory & Champagne', colors: { bg: '#faf6ec', bg2: '#efe5cf', ink: '#3a2c1a', ink2: '#6e5a3c', accent: '#b08d48', accent2: '#d8c08a' } },
  { id: 'emerald', name: 'Emerald Night', colors: { bg: '#0f3b2e', bg2: '#082519', ink: '#f3ead2', ink2: '#cfe0c3', accent: '#d4af5a', accent2: '#8d6d24' }, dark: true },
  { id: 'rose', name: 'Rose Blush', colors: { bg: '#fbeeee', bg2: '#f2d4d6', ink: '#5b2433', ink2: '#8c4a5a', accent: '#b8873a', accent2: '#e3a3ae' } },
  { id: 'haldi', name: 'Haldi Yellow', colors: { bg: '#fff4c9', bg2: '#ffe17a', ink: '#5c2a06', ink2: '#8a4510', accent: '#d1720c', accent2: '#2f7a3a' } },
  { id: 'midnight', name: 'Midnight Indigo', colors: { bg: '#18203f', bg2: '#0b1026', ink: '#f2ead8', ink2: '#c3c7e0', accent: '#e2b862', accent2: '#8d6f2b' }, dark: true },
  { id: 'sage', name: 'Sage & Linen', colors: { bg: '#f3f4ec', bg2: '#e1e6d5', ink: '#2f3a2f', ink2: '#5c6b5a', accent: '#7c8f5c', accent2: '#c9b48a' } },
  { id: 'lavender', name: 'Lavender Mist', colors: { bg: '#f4f0fa', bg2: '#e3d9f2', ink: '#3f2f57', ink2: '#6f5f88', accent: '#9a7cc4', accent2: '#e2b3c4' } },
  { id: 'peacock', name: 'Peacock', colors: { bg: '#0e3d4f', bg2: '#06222e', ink: '#f6ecd8', ink2: '#bfe0e0', accent: '#e9a23b', accent2: '#2fa38f' }, dark: true },
];
