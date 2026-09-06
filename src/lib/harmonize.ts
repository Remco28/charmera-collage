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

export interface WeightedPixel extends Rgb {
  w: number;
}

/**
 * Sample a photo as a pixel SET (24x24 grid, edge pixels weighted x3 —
 * edges are what touch the background). Averaging happens later by hue
 * vote, never by RGB mean (RGB means of varied sets always collapse to mud).
 */
export function samplePhotoPixels(bmp: ImageBitmap): WeightedPixel[] {
  const S = 24;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [{ r: 128, g: 128, b: 128, w: 1 }];
  ctx.drawImage(bmp, 0, 0, S, S);
  const d = ctx.getImageData(0, 0, S, S).data;
  const out: WeightedPixel[] = [];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const edge = x === 0 || y === 0 || x === S - 1 || y === S - 1 ? 3 : 1;
      const i = (y * S + x) * 4;
      out.push({ r: d[i], g: d[i + 1], b: d[i + 2], w: edge });
    }
  }
  return out;
}

/**
 * Dominant chromatic hue by saturation-weighted histogram vote.
 * Pool blues stay blue; grass stays green — the peak survives where
 * an RGB mean would collapse to tan. Returns null when nothing
 * chromatic exists (true B&W sets).
 */
export function dominantHue(pixels: WeightedPixel[]): { h: number; s: number } | null {
  const BINS = 36;
  const votes = new Array<number>(BINS).fill(0);
  const members: { h: number; s: number; w: number }[][] = Array.from({ length: BINS }, () => []);
  for (const p of pixels) {
    const { h, s, l } = rgbToHsl(p);
    if (s < 0.12 || l < 0.08 || l > 0.95) continue; // gray / black / white don't vote
    const bin = Math.min(BINS - 1, Math.floor(h / (360 / BINS)));
    votes[bin] += s * p.w;
    members[bin].push({ h, s, w: s * p.w });
  }
  let peak = -1;
  let peakVotes = 0;
  for (let b = 0; b < BINS; b++) {
    if (votes[b] > peakVotes) {
      peakVotes = votes[b];
      peak = b;
    }
  }
  if (peak < 0) return null;
  // Circular mean hue + weighted-median saturation of the winning bin.
  const ms = members[peak];
  let sx = 0;
  let sy = 0;
  let tw = 0;
  for (const m of ms) {
    const a = (m.h * Math.PI) / 180;
    sx += Math.cos(a) * m.w;
    sy += Math.sin(a) * m.w;
    tw += m.w;
  }
  let h = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (h < 0) h += 360;
  const sorted = [...ms].sort((a, b) => a.s - b.s);
  let acc = 0;
  let s = sorted[sorted.length - 1]?.s ?? 0;
  for (const m of sorted) {
    acc += m.w;
    if (acc >= tw / 2) {
      s = m.s;
      break;
    }
  }
  return { h, s };
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
 * Build bg gradient stops from sampled photo pixels.
 * Keeps the theme's light/dark band so text and mats still read.
 */
export function harmonizeBackground(
  pixels: WeightedPixel[],
  stopCount: number,
  mode: Exclude<BgMatch, 'off'>,
  dark: boolean,
): string[] {
  if (pixels.length === 0 || stopCount <= 0) return [];
  const dom = dominantHue(pixels);
  let h: number;
  let s: number;
  if (!dom) {
    // Genuinely monochrome set: warm stone that flatters B&W.
    h = 36;
    s = mode === 'blend' ? 0.18 : 0.3;
  } else if (mode === 'blend') {
    h = dom.h;
    s = Math.min(dom.s * 0.55, 0.42);
  } else {
    h = (dom.h + 180) % 360; // complementary accent, restrained
    s = Math.min(Math.max(dom.s * 0.75, 0.35), 0.6);
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
