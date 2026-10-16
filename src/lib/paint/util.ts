import type { Theme } from '../types';

export type Ctx = CanvasRenderingContext2D;

/** Seeded RNG so preview and export are pixel-identical every run. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable value in [-1, 1) per index and salt, for tilts and offsets. */
export function wobble(i: number, salt = 0): number {
  const x = Math.sin(i * 127.1 + salt * 311.7 + 17.3) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Cycle through a palette list by card index. */
export const pick = (list: string[], i: number) => list[i % list.length];

/** Shadows ignore the canvas transform, so their size is scaled by hand. */
export function setShadow(ctx: Ctx, theme: Theme, scale: number, dark = false) {
  const s = theme.shadow;
  if (s === 'none') return;
  if (s === 'glow') {
    ctx.shadowColor = theme.palette.accent[0];
    ctx.shadowBlur = 90 * scale;
    return;
  }
  const lifted = s === 'lifted';
  ctx.shadowColor = `rgba(0,0,0,${dark ? 0.55 : lifted ? 0.3 : 0.26})`;
  ctx.shadowBlur = (lifted ? 70 : 38) * scale;
  ctx.shadowOffsetY = (lifted ? 30 : 14) * scale;
}

export function clearShadow(ctx: Ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** Contain-fit a bitmap into a box; native-size photos land exactly 1:1. */
export function photoRect(bmp: ImageBitmap, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / bmp.width, h / bmp.height);
  const dw = Math.round(bmp.width * s);
  const dh = Math.round(bmp.height * s);
  return { x: x + Math.round((w - dw) / 2), y: y + Math.round((h - dh) / 2), w: dw, h: dh };
}

/** Set a font, shrinking its size until the text fits maxWidth (to 55%); fillText squashes the rest. */
export function fitFont(ctx: Ctx, font: string, text: string, maxWidth: number): string {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  ctx.font = font;
  if (!m) return font;
  const size = parseFloat(m[1]);
  const w = ctx.measureText(text).width;
  if (w <= maxWidth) return font;
  const next = font.replace(m[0], `${Math.max(size * 0.55, (size * maxWidth) / w).toFixed(1)}px`);
  ctx.font = next;
  return next;
}

export function fontSize(font: string): number {
  return parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? '60');
}

/** Darken (amt < 0) or lighten (amt > 0) a #rrggbb color. */
export function shade(hex: string, amt: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const ch = (shift: number) => {
    const c = (v >> shift) & 255;
    const t = amt < 0 ? 0 : 255;
    return Math.round(c + (t - c) * Math.abs(amt));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

export function isDark(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const v = parseInt(m[1], 16);
  return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255 < 0.42;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const monthShort = (d: Date) => MONTHS[d.getMonth()];
export const pad2 = (n: number) => String(n).padStart(2, '0');

export function roman(n: number): string {
  const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}
