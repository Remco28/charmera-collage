export type ThemeCategory = 'Dark' | 'Light' | 'Retro' | 'Playful' | 'Elegant' | 'Nature';

export type ThemeId =
  | 'darkroom' | 'polaroid' | 'gallery' | 'y2k' | 'playground'
  | 'midnight-neon' | 'espresso' | 'forest' | 'ocean' | 'desert'
  | 'sakura' | 'mono-ink' | 'blueprint' | 'newsprint' | 'noir'
  | 'disco' | 'candy' | 'pastel' | 'bauhaus' | 'chalkboard' | 'golden';

export interface PhotoSlot {
  id: string;
  file: File;
  url: string; // object URL for thumbnails
  bitmap: ImageBitmap; // full-res decoded, orientation-corrected
  caption: string;
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
  pattern: 'none' | 'dots' | 'stripes';
  placeholderColor: string;
}
