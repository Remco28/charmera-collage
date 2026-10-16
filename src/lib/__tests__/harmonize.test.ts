import { describe, expect, it } from 'vitest';
import { bgIsDark, dominantHue, harmonizeBackground } from '../harmonize';
import type { WeightedPixel } from '../harmonize';

const px = (r: number, g: number, b: number, n = 10, w = 1): WeightedPixel[] =>
  Array.from({ length: n }, () => ({ r, g, b, w }));

describe('dominantHue', () => {
  it('finds the hue that most saturated pixels share', () => {
    const pool = [...px(30, 90, 220, 40), ...px(200, 180, 150, 30)]; // pool blue + sandy deck
    const dom = dominantHue(pool)!;
    expect(dom.h).toBeGreaterThan(210);
    expect(dom.h).toBeLessThan(235);
  });

  it('returns null for a black-and-white set', () => {
    expect(dominantHue([...px(0, 0, 0), ...px(128, 128, 128), ...px(255, 255, 255)])).toBeNull();
  });
});

describe('harmonizeBackground', () => {
  const greens = px(40, 160, 60, 50);

  it('returns one hex stop per theme stop', () => {
    const stops = harmonizeBackground(greens, 3, 'blend', true);
    expect(stops).toHaveLength(3);
    for (const s of stops) expect(s).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps a dark theme dark and a light theme light', () => {
    for (const s of harmonizeBackground(greens, 2, 'blend', true)) expect(bgIsDark([s])).toBe(true);
    for (const s of harmonizeBackground(greens, 2, 'contrast', false)) expect(bgIsDark([s])).toBe(false);
  });

  it('returns nothing when there is nothing to sample', () => {
    expect(harmonizeBackground([], 2, 'blend', true)).toEqual([]);
  });
});

describe('bgIsDark', () => {
  it('reads the first stop', () => {
    expect(bgIsDark(['#0b0705', '#ffffff'])).toBe(true);
    expect(bgIsDark(['#faf7f0'])).toBe(false);
  });
  it('treats unparseable colors as light', () => {
    expect(bgIsDark(['rebeccapurple'])).toBe(false);
  });
});
