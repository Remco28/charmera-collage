export type ThemeCategory = 'Dark' | 'Light' | 'Retro' | 'Playful' | 'Elegant' | 'Nature';

export type TextureKind =
  | 'none' | 'dots' | 'stripes' | 'halftone' | 'rays' | 'weave'
  | 'stars' | 'sprinkles' | 'terrazzo' | 'grid' | 'fiber' | 'lightleak'
  | 'checker';

export type ThemeId =
  | 'darkroom' | 'polaroid' | 'gallery' | 'y2k' | 'playground'
  | 'midnight-neon' | 'espresso' | 'forest' | 'ocean' | 'desert'
  | 'sakura' | 'mono-ink' | 'blueprint' | 'newsprint' | 'noir'
  | 'disco' | 'candy' | 'pastel' | 'bauhaus' | 'chalkboard' | 'golden'
  | 'pop-art' | 'sunburst' | 'linen' | 'starry' | 'confetti'
  | 'terrazzo' | 'studio' | 'ember' | 'dusk' | 'kraft'
  | 'soda' | 'tuxedo' | 'nautical' | 'matcha' | 'royal';

export interface PhotoSlot {
  id: string;
  file: File;
  url: string; // object URL for thumbnails
  bitmap: ImageBitmap; // full-res decoded, orientation-corrected
  caption: string;
  hash: string; // SHA-256 of file bytes, for duplicate detection
}

export type LayoutMode = 'mosaic' | 'justified' | 'freestyle';

/** One slot in a mosaic template, in 12-col grid units. */
export interface MosaicSlot {
  c: number; // left column (0-11)
  r: number; // top row
  cs: number; // column span
  rs: number; // row span
}

export interface MosaicTemplate {
  id: string; // stable id, e.g. 'five-dice'
  name: string; // human name shown in UI, e.g. 'Five-Dice'
  n: number; // exact photo count it tiles — no placeholders, ever
  slots: MosaicSlot[]; // length === n, authored in reading order
}

/** A photo box placed on the sheet, in native-scale pixels. */
export interface PlacedCell {
  slotIndex: number; // index into slots[] (tray order = assignment)
  x: number; // photo-box left
  y: number; // photo-box top
  w: number; // photo-box width
  h: number; // photo-box height (caption strip goes below)
}

export interface ResolvedLayout {
  cells: PlacedCell[];
  W: number;
  H: number;
  capH: number; // caption strip height (0 when no captions)
  label: string; // e.g. 'Five-Dice (2 of 3)' or 'Freestyle #a3f9'
}

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  category: ThemeCategory;
  /** canvas background fill (solid or gradient stops) */
  bg: string[];
  cellBg: string;
  gap: number;
  outerPad: number;
  radius: number;
  captionHeight: number;
  captionFont: string;
  captionColor: string;
  captionBg: string | null;
  grain: boolean;
  vignette: boolean;
  jitterDeg: number;
  swatch: string; // css preview for picker button
  borderColor: string | null;
  borderWidth: number;
  shadow: boolean;
  /** Procedural background texture. Tuned to read in narrow gutters. */
  texture: TextureKind;
  /** Override tint for the texture (null = painter default). */
  textureColor: string | null;
  /** Background gradient shape. */
  bgStyle: 'linear' | 'radial';
  placeholderColor: string;
  /** Inner mat: photo is inset by mat on top/left/right, matBottom below.
   *  Makes the cellBg a visible frame around every photo. */
  mat: number;
  matBottom: number;
}
