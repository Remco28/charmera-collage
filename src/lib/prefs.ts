import { BODIES } from './bodies';
import type { BodyId } from './bodies';
import type { BgMatch } from './harmonize';
import type { RowAlign } from './recipes';
import { THEME_CATEGORIES, THEMES } from './themes';
import type { ThemeCategoryFilter } from './themes';
import type { FrameLevel, ThemeId } from './types';

/** Look-and-export settings remembered in this browser between visits. Photos are never stored. */
export interface Prefs {
  themeId: ThemeId;
  catFilter: ThemeCategoryFilter;
  align: RowAlign;
  frameLevel: FrameLevel;
  bgMatch: BgMatch;
  format: 'png' | 'jpeg';
  size: 'full' | 'phone';
  body: BodyId;
}

export const DEFAULT_PREFS: Prefs = {
  themeId: 'darkroom',
  catFilter: 'All',
  align: 'centered',
  frameLevel: 'standard',
  bgMatch: 'off',
  format: 'png',
  size: 'full',
  body: 'sunny',
};

const KEY = 'charmera-collage:prefs:v1';

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Validate stored JSON field by field; anything unknown falls back to the default. */
export function parsePrefs(raw: string | null): Prefs {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // corrupt entry — use defaults
  }
  const d = DEFAULT_PREFS;
  return {
    themeId: pick(data.themeId, Object.keys(THEMES) as ThemeId[], d.themeId),
    catFilter: pick(data.catFilter, THEME_CATEGORIES, d.catFilter),
    align: pick(data.align, ['centered', 'contact'] as const, d.align),
    frameLevel: pick(data.frameLevel, ['none', 'hairline', 'standard'] as const, d.frameLevel),
    bgMatch: pick(data.bgMatch, ['off', 'blend', 'contrast'] as const, d.bgMatch),
    format: pick(data.format, ['png', 'jpeg'] as const, d.format),
    size: pick(data.size, ['full', 'phone'] as const, d.size),
    body: pick(data.body, BODIES.map((b) => b.id), d.body),
  };
}

export function loadPrefs(): Prefs {
  try {
    return parsePrefs(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_PREFS; // storage blocked (private mode, sandboxed preview)
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // not fatal — settings just won't stick
  }
}
