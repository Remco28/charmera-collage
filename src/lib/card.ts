import { CELL_H, CELL_W } from './layout';
import type { PhotoSlot, Theme } from './types';

/** Any caption on the sheet reserves the caption area on every card, so cards stay identical. */
export function anyCaptions(slots: PhotoSlot[]): boolean {
  return slots.some((s) => s.caption.trim().length > 0);
}

/** Card size for a theme: the native photo plus the concept's border, plus caption room. */
export function cardBox(theme: Theme, withCaptions: boolean) {
  const b = theme.border;
  return {
    w: CELL_W + b.left + b.right,
    h: CELL_H + b.top + b.bottom + (withCaptions ? theme.captionArea : 0),
  };
}
