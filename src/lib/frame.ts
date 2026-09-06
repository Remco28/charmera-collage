import type { FrameLevel, Theme } from './types';

/**
 * Frame intensity override. Returns an effective theme — no theme data
 * changes. None/hairline apply uniformly so "hairline" means the same
 * whisper in every theme; standard is the theme as designed.
 */
export function applyFrame(theme: Theme, level: FrameLevel): Theme {
  if (level === 'standard' || !theme.framed) return theme;
  if (level === 'none') {
    return {
      ...theme,
      mat: 0,
      matBottom: 0,
      borderWidth: 0,
      gap: Math.max(16, Math.round(theme.gap * 0.5)),
    };
  }
  return {
    ...theme,
    mat: 4,
    matBottom: 4,
    borderWidth: 2,
    gap: Math.max(20, Math.round(theme.gap * 0.75)),
  };
}
