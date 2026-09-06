/**
 * Background harmonizer: derive sheet colors from the actual photo set.
 * Edge-weighted sampling (photo edges are what touch the background),
 * then blend (analogous, muted) or contrast (complementary, restrained).
 * A starting point, never a commitment — toggling off restores the theme.
 */
export type BgMatch = 'off' | 'blend' | 'contrast';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function rgbToHsl(c: Rgb): { h: number; s: number; l: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToCss(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Edge-weighted average color of one photo (edges touch the background). */
export function samplePhotoColor(bmp: ImageBitmap): Rgb {
  const S = 24;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { r: 128, g: 128, b: 128 };
  ctx.drawImage(bmp, 0, 0, S, S);
  const d = ctx.getImageData(0, 0, S, S).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let w = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const edge = x === 0 || y === 0 || x === S - 1 || y === S - 1 ? 3 : 1;
      const i = (y * S + x) * 4;
      r += d[i] * edge;
      g += d[i + 1] * edge;
      b += d[i + 2] * edge;
      w += edge;
    }
  }
  return { r: r / w, g: g / w, b: b / w };
}

/** Rough darkness test for a theme background (first stop decides). */
export function bgIsDark(bg: string[]): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(bg[0]?.trim() ?? '');
  if (!m) return false;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.4;
}

/**
 * Build bg gradient stops from a set of sampled colors.
 * Keeps the theme's light/dark band so text and mats still read.
 */
export function harmonizeBackground(
  colors: Rgb[],
  stopCount: number,
  mode: Exclude<BgMatch, 'off'>,
  dark: boolean,
): string[] {
  if (colors.length === 0 || stopCount <= 0) return [];
  const avg = {
    r: colors.reduce((n, c) => n + c.r, 0) / colors.length,
    g: colors.reduce((n, c) => n + c.g, 0) / colors.length,
    b: colors.reduce((n, c) => n + c.b, 0) / colors.length,
  };
  let { h, s } = rgbToHsl(avg);

  if (s < 0.08) {
    // Near-monochrome set: fall back to a warm stone that flatters B&W.
    h = 36;
    s = mode === 'blend' ? 0.18 : 0.3;
  } else if (mode === 'blend') {
    s = Math.min(s * 0.45, 0.3);
  } else {
    h = (h + 180) % 360; // complementary accent, restrained
    s = Math.min(Math.max(s * 0.7, 0.35), 0.55);
  }

  // Lightness ladder fitted to the theme's band.
  const lo = dark ? 0.07 : 0.8;
  const hi = dark ? 0.17 : 0.9;
  const stops: string[] = [];
  for (let i = 0; i < stopCount; i++) {
    const t = stopCount === 1 ? 0.5 : i / (stopCount - 1);
    stops.push(hslToCss(h, s, lo + (hi - lo) * t));
  }
  return stops;
}
