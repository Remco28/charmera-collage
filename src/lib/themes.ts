import { DISPLAY, HAND, MARKER, SERIF, TYPE } from './fonts';
import type { ConceptId, Palette, Theme } from './types';

/**
 * Themes are concepts — each one a real photo object with its own way of
 * building a card — and each concept comes in a few colorways. Geometry is
 * in sheet pixels around the native 1440×1080 photo, which is never scaled.
 */
type Base = Omit<Theme, 'id' | 'name' | 'palette' | 'surface' | 'concept' | 'conceptName' | 'tagline'>;
type Colorway = { key: string; name: string; palette: Palette; surface: Theme['surface'] } & Partial<Base>;

interface Concept {
  id: ConceptId;
  name: string;
  tagline: string;
  base: Base;
  colorways: Colorway[];
}

const border = (all: number, bottom = all) => ({ top: all, right: all, bottom, left: all });

const DEFAULTS = {
  captionArea: 0,
  radius: 0,
  jitterDeg: 0,
  shadow: 'soft',
  grain: false,
  vignette: false,
  dateStamp: false,
  tintable: false,
} as const;

/** The one theme you set yourself: exact colors, border width, straight or tossed. */
export interface CustomMix {
  surface: string;
  card: string;
  ink: string;
  border: MixBorder;
  scatter: boolean;
}
export type MixBorder = 'none' | 'thin' | 'classic' | 'wide';
export const MIX_BORDERS: readonly MixBorder[] = ['none', 'thin', 'classic', 'wide'];
const MIX_BORDER_PX: Record<MixBorder, number> = { none: 0, thin: 36, classic: 80, wide: 150 };

export const CUSTOM_ID = 'custom-mix';
export const DEFAULT_MIX: CustomMix = { surface: '#f6f1e7', card: '#ffffff', ink: '#2a2730', border: 'classic', scatter: false };

/** A plain print on a flat color: nothing decorative, so the picked colors are exactly what you see. */
export function customTheme(mix: CustomMix): Theme {
  const none = mix.border === 'none';
  return {
    ...DEFAULTS,
    id: CUSTOM_ID,
    concept: 'custom',
    conceptName: 'Mix Your Own',
    name: 'Your colors',
    tagline: 'Pick exact colors for this set of photos',
    card: none ? 'bare' : 'print',
    surface: 'solid',
    palette: { surface: [mix.surface], card: [mix.card], ink: mix.ink, accent: [mix.ink], detail: mix.card },
    border: border(MIX_BORDER_PX[mix.border]),
    captionArea: 150,
    captionFont: `700 100px ${HAND}`,
    gap: 120,
    rowGap: 120,
    pad: 220,
    radius: none ? 12 : 4,
    jitterDeg: mix.scatter ? 2.4 : 0,
    shadow: none ? 'lifted' : 'soft',
  };
}

function customConcept(): Concept {
  const { id: _id, name, palette, surface, concept: _c, conceptName, tagline, ...base } = customTheme(DEFAULT_MIX);
  return { id: 'custom', name: conceptName, tagline, base, colorways: [{ key: 'mix', name, palette, surface }] };
}

export const CONCEPTS: Concept[] = [
  {
    id: 'contact',
    name: 'Contact Sheet',
    tagline: 'Film strips, sprocket holes, grease pencil',
    base: {
      ...DEFAULTS,
      card: 'film',
      border: { top: 190, right: 20, bottom: 190, left: 20 },
      captionArea: 140,
      captionFont: `400 92px ${MARKER}`,
      gap: 0,
      rowGap: 110,
      pad: 160,
      shadow: 'none',
    },
    colorways: [
      {
        key: 'darkroom', name: 'Darkroom', surface: 'safelight', grain: true, vignette: true,
        palette: { surface: ['#140806', '#6e1409'], card: ['#0d0b0a'], ink: '#f2b33d', accent: ['#f4ead8'], detail: '#3a0d07' },
      },
      {
        key: 'proof', name: 'Proof Sheet', surface: 'paper',
        palette: { surface: ['#f7f4ee', '#ece7dd'], card: ['#151312'], ink: '#e2a93d', accent: ['#d42a20'], detail: '#f7f4ee' },
      },
    ],
  },
  {
    id: 'prints',
    name: 'One-Hour Prints',
    tagline: 'Fresh from the photo counter, date stamp and all',
    base: {
      ...DEFAULTS,
      card: 'print',
      border: border(64),
      captionArea: 150,
      captionFont: `700 104px ${HAND}`,
      gap: 120,
      rowGap: 120,
      pad: 210,
      radius: 6,
      jitterDeg: 2.6,
      dateStamp: true,
    },
    colorways: [
      {
        key: 'kitchen', name: 'Kitchen Table', surface: 'formica',
        palette: { surface: ['#bfe3d6', '#a6d3c3'], card: ['#fbfaf6'], ink: '#2b3a8c', accent: ['#ff8a1e'], detail: '#e46a5a' },
      },
      {
        key: 'wood', name: 'Coffee Table', surface: 'wood',
        palette: { surface: ['#b98552', '#8f5c34'], card: ['#fbfaf6'], ink: '#2b3a8c', accent: ['#ff8a1e'], detail: '#5e3a1f' },
      },
    ],
  },
  {
    id: 'instant',
    name: 'Instant',
    tagline: 'The fat bottom border, a marker, a little wiggle',
    base: {
      ...DEFAULTS,
      card: 'instant',
      border: { top: 88, right: 88, bottom: 380, left: 88 },
      captionFont: `400 96px ${MARKER}`,
      gap: 110,
      rowGap: 120,
      pad: 210,
      radius: 8,
      jitterDeg: 2.2,
      shadow: 'lifted',
    },
    colorways: [
      {
        key: 'classic', name: 'Classic', surface: 'paper', tintable: true,
        palette: { surface: ['#efe9df', '#e1d8c8'], card: ['#fbfaf5'], ink: '#262a33', accent: ['#262a33'], detail: '#d9d2c4' },
      },
      {
        key: 'pastel', name: 'Pastel Frames', surface: 'paper', tintable: true,
        palette: {
          surface: ['#ebe4f7', '#d9e6f6'],
          card: ['#ffd6e0', '#d3f0dc', '#fff0b3', '#d3e6ff', '#e6d9ff'],
          ink: '#4a3f6b', accent: ['#4a3f6b'], detail: '#c9c0dc',
        },
      },
      {
        key: 'midnight', name: 'Black Frames', surface: 'paper', tintable: true, grain: true,
        palette: { surface: ['#24222a', '#141318'], card: ['#0e0e11'], ink: '#f5f1e8', accent: ['#f5f1e8'], detail: '#2c2a31' },
      },
    ],
  },
  {
    id: 'clothesline',
    name: 'Clothesline',
    tagline: 'Every row hung out on a string with pegs',
    base: {
      ...DEFAULTS,
      card: 'pegged',
      border: border(56),
      captionArea: 150,
      captionFont: `700 100px ${HAND}`,
      gap: 110,
      rowGap: 300,
      pad: 270,
      radius: 4,
      jitterDeg: 2,
    },
    colorways: [
      {
        key: 'backyard', name: 'Backyard', surface: 'sky',
        palette: { surface: ['#8fcaf0', '#eaf7ff'], card: ['#fdfcf8'], ink: '#2a3c5c', accent: ['#d9a066', '#c88f57', '#e2ae78'], detail: '#6f6153' },
      },
      {
        key: 'drying', name: 'Drying Line', surface: 'safelight', grain: true, vignette: true,
        palette: { surface: ['#140806', '#6e1409'], card: ['#f1ece2'], ink: '#3b0f0f', accent: ['#c9cdd2', '#b9bec4'], detail: '#2b1512' },
      },
    ],
  },
  {
    id: 'scrapbook',
    name: 'Scrapbook',
    tagline: 'Washi tape, photo corners and handwriting',
    base: {
      ...DEFAULTS,
      card: 'taped',
      border: border(40),
      captionArea: 190,
      captionFont: `700 112px ${HAND}`,
      gap: 140,
      rowGap: 130,
      pad: 230,
      radius: 3,
      jitterDeg: 3.2,
    },
    colorways: [
      {
        key: 'kraft', name: 'Kraft Paper', surface: 'kraft',
        palette: {
          surface: ['#caa576', '#b48d5c'], card: ['#fffdf7'], ink: '#3a2a1c',
          accent: ['rgba(240,128,128,0.82)', 'rgba(118,190,168,0.82)', 'rgba(244,198,86,0.85)', 'rgba(140,160,232,0.82)'],
          detail: 'rgba(255,255,255,0.45)',
        },
      },
      {
        key: 'notebook', name: 'Graph Notebook', surface: 'graph',
        palette: {
          surface: ['#fbfbf6', '#f4f3ec'], card: ['#ffffff'], ink: '#24356e',
          accent: ['rgba(255,170,190,0.82)', 'rgba(255,214,120,0.85)', 'rgba(150,210,190,0.82)'],
          detail: 'rgba(255,255,255,0.5)',
        },
      },
      {
        key: 'album', name: 'Black Album', surface: 'album', card: 'cornered',
        border: border(24),
        palette: { surface: ['#1d1c20', '#121114'], card: ['#f7f4ec'], ink: '#f3efe4', accent: ['#0c0c0d'], detail: '#4a4850' },
      },
    ],
  },
  {
    id: 'stickers',
    name: 'Sticker Sheet',
    tagline: 'Die-cut, glossy, slapped on at the party',
    base: {
      ...DEFAULTS,
      card: 'sticker',
      border: border(54),
      captionArea: 130,
      captionFont: `800 80px ${DISPLAY}`,
      gap: 120,
      rowGap: 140,
      pad: 210,
      radius: 70,
      jitterDeg: 3.5,
      shadow: 'lifted',
      tintable: true,
    },
    colorways: [
      {
        key: 'party', name: 'Party', surface: 'sprinkles',
        palette: { surface: ['#ffd3e2', '#ffc0d5'], card: ['#ffffff'], ink: '#ffffff', accent: ['#ff4f93', '#7b5cff', '#ff8f1f', '#16a99a'], detail: '#ffffff' },
      },
      {
        key: 'sky', name: 'After Dark', surface: 'stars',
        palette: { surface: ['#3d57d6', '#23339c'], card: ['#ffffff'], ink: '#1d1a24', accent: ['#ffcc33', '#ff7a6b', '#4fe0b0'], detail: '#ffffff' },
      },
      {
        key: 'sunny', name: 'Sunny', surface: 'halftone',
        palette: { surface: ['#ffda4d', '#ffc21a'], card: ['#ffffff'], ink: '#ffffff', accent: ['#ef4130', '#2c6fe0', '#1d1a24'], detail: '#ffffff' },
      },
    ],
  },
  {
    id: 'lightbox',
    name: 'Slide Lightbox',
    tagline: 'Mounted slides glowing on a light table',
    base: {
      ...DEFAULTS,
      card: 'slide',
      border: { top: 400, right: 230, bottom: 400, left: 230 },
      captionFont: `400 74px ${TYPE}`,
      gap: 90,
      rowGap: 90,
      pad: 230,
      radius: 70,
      jitterDeg: 1.2,
    },
    colorways: [
      {
        key: 'card', name: 'Card Mounts', surface: 'lightbox',
        palette: { surface: ['#fdfeff', '#dfe8f0'], card: ['#f4f0e6'], ink: '#2c2c30', accent: ['#d94a3a'], detail: '#8b939c' },
      },
      {
        key: 'plastic', name: 'Plastic Mounts', surface: 'lightbox',
        palette: { surface: ['#fdfeff', '#dfe8f0'], card: ['#9ea4aa'], ink: '#1d2024', accent: ['#2f68d8'], detail: '#3c4248' },
      },
    ],
  },
  {
    id: 'gallery',
    name: 'Gallery Wall',
    tagline: 'Wide mats, real frames, a label by each one',
    base: {
      ...DEFAULTS,
      card: 'framed',
      border: border(260),
      captionArea: 320,
      captionFont: `600 76px ${SERIF}`,
      gap: 230,
      rowGap: 170,
      pad: 320,
      tintable: true,
    },
    colorways: [
      {
        key: 'white', name: 'White Cube', surface: 'wall',
        palette: { surface: ['#f4f2ee', '#e7e3dc'], card: ['#fbfaf7'], ink: '#1b1b1b', accent: ['#ffffff'], detail: '#151515' },
      },
      {
        key: 'salon', name: 'Salon Green', surface: 'wall',
        palette: { surface: ['#24443a', '#16302a'], card: ['#f3eee2'], ink: '#1c1a16', accent: ['#f6f1e5'], detail: '#b8913f' },
      },
      {
        key: 'oak', name: 'Oak & Linen', surface: 'wall',
        palette: { surface: ['#dcd5c8', '#cbc2b2'], card: ['#fbf8f1'], ink: '#2a2420', accent: ['#fffdf8'], detail: '#a8763f' },
      },
    ],
  },
  {
    id: 'corkboard',
    name: 'Corkboard',
    tagline: 'Pinned up by the fridge, slightly crooked',
    base: {
      ...DEFAULTS,
      card: 'pinned',
      border: border(50),
      captionArea: 150,
      captionFont: `700 102px ${HAND}`,
      gap: 120,
      rowGap: 150,
      pad: 220,
      radius: 3,
      jitterDeg: 3.5,
    },
    colorways: [
      {
        key: 'cork', name: 'Cork', surface: 'cork',
        palette: { surface: ['#c69c6d', '#ad8155'], card: ['#fdfcf7'], ink: '#2a2a2a', accent: ['#e8402f', '#2c6fe0', '#ffc61a', '#22a06b', '#8a3fd1'], detail: '#7a5532' },
      },
    ],
  },
  {
    id: 'cyanotype',
    name: 'Sun Print',
    tagline: 'Brushed emulsion, ruled plates, typed labels',
    base: {
      ...DEFAULTS,
      card: 'plate',
      border: border(70),
      captionArea: 170,
      captionFont: `400 64px ${TYPE}`,
      gap: 160,
      rowGap: 140,
      pad: 250,
      shadow: 'none',
    },
    colorways: [
      {
        key: 'cyan', name: 'Cyanotype', surface: 'cyan',
        palette: { surface: ['#1f4f8f', '#163c70'], card: ['#f3f0e6'], ink: '#eaf2ff', accent: ['#eaf2ff'], detail: '#dce9ff' },
      },
      {
        key: 'vandyke', name: 'Van Dyke Brown', surface: 'cyan',
        palette: { surface: ['#5a3a25', '#46301f'], card: ['#efe6d2'], ink: '#f5ead6', accent: ['#f5ead6'], detail: '#ecdcc0' },
      },
    ],
  },
  {
    id: 'zine',
    name: 'Photocopy Zine',
    tagline: 'Hard borders, big numbers, typed labels',
    base: {
      ...DEFAULTS,
      card: 'zine',
      border: border(26),
      captionArea: 150,
      captionFont: `400 66px ${TYPE}`,
      gap: 90,
      rowGap: 120,
      pad: 210,
      jitterDeg: 1,
      shadow: 'none',
    },
    colorways: [
      {
        key: 'xerox', name: 'Xerox', surface: 'xerox',
        palette: { surface: ['#f2f0ea'], card: ['#f7f6f2'], ink: '#111111', accent: ['#111111'], detail: '#111111' },
      },
      {
        key: 'riso', name: 'Riso Pink & Blue', surface: 'xerox',
        palette: { surface: ['#f6efe1'], card: ['#fbf6ea'], ink: '#2c4bd1', accent: ['#ff4f87'], detail: '#2c4bd1' },
      },
    ],
  },
  {
    id: 'flash',
    name: 'Night Flash',
    tagline: 'On-camera flash, neon marker, after midnight',
    base: {
      ...DEFAULTS,
      card: 'flash',
      border: border(0),
      captionArea: 180,
      captionFont: `400 92px ${MARKER}`,
      gap: 110,
      rowGap: 120,
      pad: 220,
      radius: 6,
      shadow: 'glow',
      grain: true,
      tintable: true,
    },
    colorways: [
      {
        key: 'neon', name: 'Hot Pink', surface: 'night',
        palette: { surface: ['#0b0910', '#160d1e'], card: ['#000000'], ink: '#ff5ad9', accent: ['#ff5ad9'], detail: '#7c5cff' },
      },
      {
        key: 'uv', name: 'Ultraviolet', surface: 'night',
        palette: { surface: ['#07080f', '#0d1024'], card: ['#000000'], ink: '#7cf2ff', accent: ['#7c5cff'], detail: '#2a7bff' },
      },
    ],
  },
  {
    id: 'stamps',
    name: 'Stamp Album',
    tagline: 'Perforated edges, a value, the odd postmark',
    base: {
      ...DEFAULTS,
      card: 'stamp',
      border: { top: 90, right: 90, bottom: 190, left: 90 },
      captionFont: `600 58px ${SERIF}`,
      gap: 110,
      rowGap: 110,
      pad: 230,
      jitterDeg: 0.8,
    },
    colorways: [
      {
        key: 'album', name: 'Collector', surface: 'paper', tintable: true,
        palette: { surface: ['#f1ead8', '#e5dbc3'], card: ['#fffdf6'], ink: '#2f3a56', accent: ['#c4372f', '#2d5aa6', '#2f7a4f'], detail: '#2f3a56' },
      },
      {
        key: 'airmail', name: 'Airmail', surface: 'airmail',
        palette: { surface: ['#fbfaf6'], card: ['#ffffff'], ink: '#24479b', accent: ['#d23b2f', '#24479b'], detail: '#24479b' },
      },
    ],
  },
  {
    id: 'float',
    name: 'Frameless',
    tagline: 'Just the photos, floating, nothing else',
    base: {
      ...DEFAULTS,
      card: 'bare',
      border: border(0),
      captionArea: 150,
      captionFont: `700 96px ${HAND}`,
      gap: 110,
      rowGap: 120,
      pad: 220,
      radius: 18,
      shadow: 'lifted',
      tintable: true,
    },
    colorways: [
      {
        key: 'paper', name: 'Paper', surface: 'paper',
        palette: { surface: ['#f6f4ef', '#e9e5dc'], card: ['#ffffff'], ink: '#4a4650', accent: ['#4a4650'], detail: '#ffffff' },
      },
      {
        key: 'night', name: 'Charcoal', surface: 'paper',
        palette: { surface: ['#222127', '#141318'], card: ['#000000'], ink: '#d9d4cc', accent: ['#d9d4cc'], detail: '#000000' },
      },
    ],
  },
  customConcept(),
];

export const THEME_LIST: Theme[] = CONCEPTS.flatMap((c) =>
  c.colorways.map(({ key, ...cw }) => ({
    ...c.base,
    ...cw,
    id: `${c.id}-${key}`,
    concept: c.id,
    conceptName: c.name,
    tagline: c.tagline,
  })),
);

export const THEMES: Record<string, Theme> = Object.fromEntries(THEME_LIST.map((t) => [t.id, t]));

export const DEFAULT_THEME_ID = 'prints-kitchen';

/** Themes from before the concept redesign, mapped to their nearest concept look. */
export const LEGACY_THEME_IDS: Record<string, string> = {
  darkroom: 'contact-darkroom', noir: 'contact-proof', tuxedo: 'contact-proof',
  polaroid: 'instant-classic', pastel: 'instant-pastel', candy: 'instant-pastel', sakura: 'instant-pastel',
  gallery: 'gallery-white', linen: 'gallery-oak', royal: 'gallery-salon', forest: 'gallery-salon',
  kraft: 'scrapbook-kraft', chalkboard: 'scrapbook-album', espresso: 'scrapbook-album',
  confetti: 'stickers-party', sticker: 'stickers-party', playground: 'stickers-party',
  'pop-art': 'stickers-sunny', sunburst: 'stickers-sunny', starry: 'stickers-sky',
  blueprint: 'cyanotype-cyan', nautical: 'cyanotype-cyan', ocean: 'cyanotype-cyan',
  newsprint: 'zine-xerox', 'mono-ink': 'zine-xerox', bauhaus: 'zine-riso',
  'midnight-neon': 'flash-neon', disco: 'flash-neon', y2k: 'flash-uv', dusk: 'flash-uv',
  seamless: 'float-paper', float: 'float-paper', studio: 'float-paper', 'night-float': 'float-night',
  terrazzo: 'prints-kitchen', soda: 'prints-kitchen', desert: 'prints-wood', golden: 'prints-wood', ember: 'prints-wood',
  matcha: 'clothesline-backyard',
};

/** The theme for a saved id; the custom one is rebuilt from the saved mix. */
export function themeFor(id: string, mix: CustomMix): Theme {
  if (id === CUSTOM_ID) return customTheme(mix);
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
}
