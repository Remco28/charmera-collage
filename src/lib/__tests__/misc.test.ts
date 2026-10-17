import { describe, expect, it } from 'vitest';
import { cardBox } from '../card';
import { exifDate } from '../exif';
import { CELL_H, CELL_W } from '../layout';
import { DEFAULT_PREFS, parsePrefs } from '../prefs';
import { MAX_SAFE_PIXELS, safeScale } from '../render';
import { fitRoll } from '../roll';
import { CONCEPTS, DEFAULT_THEME_ID, LEGACY_THEME_IDS, THEMES, THEME_LIST } from '../themes';

describe('themes', () => {
  it('has unique ids, one per concept colorway', () => {
    const count = CONCEPTS.reduce((n, c) => n + c.colorways.length, 0);
    expect(THEME_LIST).toHaveLength(count);
    expect(new Set(THEME_LIST.map((t) => t.id)).size).toBe(count);
    expect(THEMES[DEFAULT_THEME_ID]).toBeDefined();
  });

  it('maps every legacy theme id to a theme that exists', () => {
    for (const [old, now] of Object.entries(LEGACY_THEME_IDS)) expect(THEMES[now], old).toBeDefined();
  });

  it('gives every theme usable geometry and palette', () => {
    for (const t of THEME_LIST) {
      expect(t.palette.surface.length, t.id).toBeGreaterThan(0);
      expect(t.palette.card.length, t.id).toBeGreaterThan(0);
      expect(t.palette.accent.length, t.id).toBeGreaterThan(0);
      for (const v of [t.gap, t.rowGap, t.pad, t.captionArea, ...Object.values(t.border)]) expect(v).toBeGreaterThanOrEqual(0);
      expect(t.captionFont, t.id).toMatch(/\d+px/);
    }
  });
});

describe('cardBox', () => {
  const t = THEMES['instant-classic'];
  it('wraps the native photo in the concept border', () => {
    const { w, h } = cardBox(t, false);
    expect(w).toBe(CELL_W + t.border.left + t.border.right);
    expect(h).toBe(CELL_H + t.border.top + t.border.bottom);
  });
  it('adds the caption area only when there are captions', () => {
    const p = THEMES['prints-kitchen'];
    expect(cardBox(p, true).h - cardBox(p, false).h).toBe(p.captionArea);
  });
});

describe('safeScale', () => {
  it('is 1 when the sheet already fits', () => {
    expect(safeScale(4000, 4000)).toBe(1);
  });
  it('shrinks a big sheet to just under the iOS canvas limit', () => {
    const [W, H] = [9108, 3564];
    const s = safeScale(W, H);
    const area = Math.round(W * s) * Math.round(H * s);
    expect(area).toBeLessThanOrEqual(MAX_SAFE_PIXELS);
    expect(area).toBeGreaterThan(MAX_SAFE_PIXELS * 0.97);
  });
});

describe('parsePrefs', () => {
  it('falls back to defaults for missing or corrupt storage', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{not json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('"a string"')).toEqual(DEFAULT_PREFS);
  });
  it('keeps valid fields and replaces unknown values one by one', () => {
    const p = parsePrefs(JSON.stringify({ themeId: 'instant-pastel', format: 'gif', body: 'cobalt', size: 'phone' }));
    expect(p.themeId).toBe('instant-pastel');
    expect(p.format).toBe(DEFAULT_PREFS.format);
    expect(p.body).toBe('cobalt');
    expect(p.size).toBe('phone');
  });
  it('moves a saved theme from before the redesign to its nearest look', () => {
    expect(parsePrefs(JSON.stringify({ themeId: 'polaroid' })).themeId).toBe('instant-classic');
    expect(parsePrefs(JSON.stringify({ themeId: 'deleted-theme' })).themeId).toBe(DEFAULT_THEME_ID);
  });
});

/** Minimal JPEG: SOI, APP1 Exif with a little-endian TIFF holding one tag, then SOS. */
function jpegWithDate(tag: number, value: string): ArrayBuffer {
  const ascii = [...value].map((c) => c.charCodeAt(0)).concat(0);
  const tiff: number[] = [0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0];
  const le16 = (n: number) => [n & 255, (n >> 8) & 255];
  const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
  const dataAt = 8 + 2 + 12 + 4;
  tiff.push(...le16(1), ...le16(tag), ...le16(2), ...le32(ascii.length), ...le32(dataAt), ...le32(0), ...ascii);
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const app1 = [0xff, 0xe1, ((payload.length + 2) >> 8) & 255, (payload.length + 2) & 255, ...payload];
  return new Uint8Array([0xff, 0xd8, ...app1, 0xff, 0xda, 0, 2]).buffer;
}

describe('exifDate', () => {
  it('reads DateTime from IFD0', () => {
    const d = exifDate(jpegWithDate(0x0132, '2026:07:04 14:30:00'))!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 6, 4, 14]);
  });
  it('treats an unset camera clock as unknown', () => {
    expect(exifDate(jpegWithDate(0x0132, '0000:00:00 00:00:00'))).toBeNull();
  });
  it('returns null for non-JPEG or truncated data', () => {
    expect(exifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(exifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 40]).buffer)).toBeNull();
  });
});

describe('fitRoll', () => {
  it('keeps what fits under the cap and hands back the rest', () => {
    expect(fitRoll(10, ['a', 'b', 'c'], 12)).toEqual({ kept: ['a', 'b'], dropped: ['c'] });
    expect(fitRoll(0, ['a'], 12)).toEqual({ kept: ['a'], dropped: [] });
  });
  it('keeps nothing when the roll already went past the cap', () => {
    expect(fitRoll(13, ['a'], 12)).toEqual({ kept: [], dropped: ['a'] });
  });
});
