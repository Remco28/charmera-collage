import { BODIES } from './bodies';
import type { BodyId } from './bodies';
import type { BgMatch } from './harmonize';
import type { RowAlign } from './recipes';
import { CUSTOM_ID, DEFAULT_MIX, DEFAULT_THEME_ID, LEGACY_THEME_IDS, MIX_BORDERS, THEMES } from './themes';
import type { CustomMix } from './themes';

/** Look-and-export settings remembered in this browser between visits. Photos are never stored. */
export interface Prefs {
  themeId: string;
  align: RowAlign;
  bgMatch: BgMatch;
  format: 'png' | 'jpeg';
  size: 'full' | 'phone';
  body: BodyId;
  /** Colors and border for the Mix Your Own theme. */
  custom: CustomMix;
}

export const DEFAULT_PREFS: Prefs = {
  themeId: DEFAULT_THEME_ID,
  align: 'centered',
  bgMatch: 'off',
  format: 'png',
  size: 'full',
  body: 'sunny',
  custom: DEFAULT_MIX,
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
    themeId: themeIdFrom(data.themeId),
    align: pick(data.align, ['centered', 'contact'] as const, d.align),
    bgMatch: pick(data.bgMatch, ['off', 'blend', 'contrast'] as const, d.bgMatch),
    format: pick(data.format, ['png', 'jpeg'] as const, d.format),
    size: pick(data.size, ['full', 'phone'] as const, d.size),
    body: pick(data.body, BODIES.map((b) => b.id), d.body),
    custom: mixFrom(data.custom),
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
const hexOr = (value: unknown, fallback: string) => (typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : fallback);

function mixFrom(value: unknown): CustomMix {
  const m = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const d = DEFAULT_MIX;
  return {
    surface: hexOr(m.surface, d.surface),
    card: hexOr(m.card, d.card),
    ink: hexOr(m.ink, d.ink),
    border: pick(m.border, MIX_BORDERS, d.border),
    scatter: typeof m.scatter === 'boolean' ? m.scatter : d.scatter,
  };
}

/** Current theme ids pass; ids from before the concept redesign map to their nearest look. */
function themeIdFrom(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_THEME_ID;
  if (THEMES[value] || value === CUSTOM_ID) return value;
  return LEGACY_THEME_IDS[value] ?? DEFAULT_THEME_ID;
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
