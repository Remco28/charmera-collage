/**
 * A theme is one colorway of a concept. The concept is a real photo object
 * (contact sheet, instant print, slide mount...) and decides how a card is
 * built and drawn; the colorway only picks palette and surface.
 */
export type ConceptId =
  | 'contact' | 'prints' | 'instant' | 'clothesline' | 'scrapbook' | 'stickers' | 'lightbox'
  | 'gallery' | 'corkboard' | 'cyanotype' | 'zine' | 'flash' | 'stamps' | 'float';

/** How a single card is drawn around its photo. */
export type CardKind =
  | 'film' | 'print' | 'instant' | 'pegged' | 'taped' | 'cornered' | 'sticker' | 'slide'
  | 'framed' | 'pinned' | 'plate' | 'zine' | 'flash' | 'stamp' | 'bare';

/** What the sheet itself is: the table, wall or page the cards sit on. */
export type SurfaceKind =
  | 'paper' | 'safelight' | 'wood' | 'formica' | 'sky' | 'kraft' | 'graph' | 'album'
  | 'sprinkles' | 'stars' | 'halftone' | 'lightbox' | 'wall' | 'cork' | 'cyan' | 'xerox'
  | 'night' | 'airmail';

export interface Palette {
  /** Surface base colors (1–2 stops). Replaced by the photo harmonizer when the theme is tintable. */
  surface: string[];
  /** Card body (border, mat, mount). Several entries cycle per card. */
  card: string[];
  /** Main mark color: captions, numbers, rules. */
  ink: string;
  /** Second mark color: tape, pins, stamps, labels. Several entries cycle per card. */
  accent: string[];
  /** Third color for details (frame moulding, sprocket band, glow). */
  detail: string;
}

export interface Theme {
  /** Stable id, `${concept}-${colorway}`; stored in prefs. */
  id: string;
  concept: ConceptId;
  conceptName: string;
  /** Colorway name, e.g. 'Kitchen Table'. */
  name: string;
  tagline: string;
  card: CardKind;
  surface: SurfaceKind;
  palette: Palette;
  /** Card border around the native 1440×1080 photo, sheet pixels. */
  border: { top: number; right: number; bottom: number; left: number };
  /** Extra card height added below the photo when any photo has a caption. */
  captionArea: number;
  captionFont: string;
  /** Space between cards in a row, between rows, and around the sheet. */
  gap: number;
  rowGap: number;
  pad: number;
  radius: number;
  /** Max per-card tilt in degrees (seeded, stable). */
  jitterDeg: number;
  /** Soft cast shadow under each card. */
  shadow: 'none' | 'soft' | 'lifted' | 'glow';
  /** Film grain over the whole sheet. */
  grain: boolean;
  vignette: boolean;
  /** Orange date stamp burned into the photo corner, like a disposable. */
  dateStamp: boolean;
  /** Photo-matched background allowed (surface is a plain color, not wood or cork). */
  tintable: boolean;
}

export interface PhotoSlot {
  id: string;
  file: File;
  url: string; // object URL for thumbnails
  bitmap: ImageBitmap; // full-res decoded, orientation-corrected
  caption: string;
  hash: string; // SHA-256 of file bytes, for duplicate detection
  /** When the photo was taken (EXIF), else the file's modified time. */
  taken: Date;
}
