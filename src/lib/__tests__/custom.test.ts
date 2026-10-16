import { describe, expect, it } from 'vitest';
import { cardBox } from '../card';
import { estimateBytes, formatBytes } from '../estimate';
import { photoSwatches } from '../harmonize';
import type { WeightedPixel } from '../harmonize';
import { DEFAULT_PREFS, parsePrefs } from '../prefs';
import { CUSTOM_ID, DEFAULT_MIX, DEFAULT_THEME_ID, THEMES, customTheme, themeFor } from '../themes';

describe('Mix Your Own', () => {
  it('uses the picked colors exactly, on a flat surface', () => {
    const t = customTheme({ surface: '#123456', card: '#abcdef', ink: '#fedcba', border: 'thin', scatter: true });
    expect(t.surface).toBe('solid');
    expect(t.palette.surface).toEqual(['#123456']);
    expect(t.palette.card).toEqual(['#abcdef']);
    expect(t.palette.ink).toBe('#fedcba');
    expect(t.jitterDeg).toBeGreaterThan(0);
    expect(t.tintable).toBe(false);
  });

  it('grows the card with the border width, and drops the border for None', () => {
    const widths = (['none', 'thin', 'classic', 'wide'] as const).map((border) => cardBox(customTheme({ ...DEFAULT_MIX, border }), false).w);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    expect(customTheme({ ...DEFAULT_MIX, border: 'none' }).card).toBe('bare');
  });

  it('resolves the saved id to the saved mix, and unknown ids to the default theme', () => {
    const mix = { ...DEFAULT_MIX, surface: '#000000' };
    expect(themeFor(CUSTOM_ID, mix).palette.surface).toEqual(['#000000']);
    expect(themeFor('nope', mix)).toBe(THEMES[DEFAULT_THEME_ID]);
  });

  it('remembers the mix and repairs a bad one field by field', () => {
    const p = parsePrefs(JSON.stringify({ themeId: CUSTOM_ID, custom: { surface: '#AABBCC', card: 'red', border: 'huge', scatter: true } }));
    expect(p.themeId).toBe(CUSTOM_ID);
    expect(p.custom).toEqual({ ...DEFAULT_MIX, surface: '#aabbcc', scatter: true });
    expect(parsePrefs(null).custom).toEqual(DEFAULT_PREFS.custom);
  });
});

describe('photoSwatches', () => {
  const px = (r: number, g: number, b: number, n: number): WeightedPixel[] => Array.from({ length: n }, () => ({ r, g, b, w: 1 }));

  it('returns the distinct colors in the photos, heaviest first, as hex', () => {
    const out = photoSwatches([...px(30, 90, 220, 50), ...px(220, 40, 40, 30), ...px(240, 240, 235, 20)], 6);
    expect(out).toHaveLength(3);
    expect(out).toContain('#1e5adc');
    expect(out).toContain('#dc2828');
    for (const c of out) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('merges near-identical tones', () => {
    expect(photoSwatches([...px(200, 60, 60, 20), ...px(205, 62, 58, 20)], 6)).toHaveLength(1);
  });
});

describe('estimateBytes', () => {
  it('is the preview size when exporting at preview scale', () => {
    expect(estimateBytes(1_000_000, 0.5, 0.5, 'png')).toBeCloseTo(1_000_000);
  });

  it('grows with the export, but less than the pixel count does', () => {
    const full = estimateBytes(1_000_000, 0.25, 1, 'png');
    expect(full).toBeGreaterThan(1_000_000 * 4);
    expect(full).toBeLessThan(1_000_000 * 16);
  });

  it('formats like a person would say it', () => {
    expect(formatBytes(840_000)).toBe('≈ 840 KB');
    expect(formatBytes(4_230_000)).toBe('≈ 4.2 MB');
    expect(formatBytes(53_400_000)).toBe('≈ 53 MB');
  });
});
