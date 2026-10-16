import { describe, expect, it } from 'vitest';
import { applyFrame } from '../frame';
import { DEFAULT_PREFS, parsePrefs } from '../prefs';
import { MAX_SAFE_PIXELS, safeScale } from '../render';
import { THEMES, THEME_LIST } from '../themes';

describe('themes', () => {
  it('lists every theme exactly once', () => {
    expect(THEME_LIST).toHaveLength(Object.keys(THEMES).length);
    expect(new Set(THEME_LIST.map((t) => t.id)).size).toBe(THEME_LIST.length);
  });
});

describe('applyFrame', () => {
  const t = THEMES.polaroid;
  it('leaves the theme alone at standard', () => {
    expect(applyFrame(t, 'standard')).toBe(t);
  });
  it('drops mat and border at none', () => {
    const f = applyFrame(t, 'none');
    expect([f.mat, f.matBottom, f.borderWidth]).toEqual([0, 0, 0]);
  });
  it('never touches frameless themes', () => {
    expect(applyFrame(THEMES.float, 'none')).toBe(THEMES.float);
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
    const p = parsePrefs(JSON.stringify({ themeId: 'polaroid', format: 'gif', body: 'cobalt', size: 'phone' }));
    expect(p.themeId).toBe('polaroid');
    expect(p.format).toBe(DEFAULT_PREFS.format);
    expect(p.body).toBe('cobalt');
    expect(p.size).toBe('phone');
  });
  it('drops a theme that no longer exists', () => {
    expect(parsePrefs(JSON.stringify({ themeId: 'deleted-theme' })).themeId).toBe(DEFAULT_PREFS.themeId);
  });
});
