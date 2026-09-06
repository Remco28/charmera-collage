import { freestyleRects, seedLabel } from './freestyle';
import { layoutsFor } from './layouts';
import type { LayoutMode, MosaicTemplate, PhotoSlot, PlacedCell, ResolvedLayout, Theme } from './types';

/** Mosaic grid DNA: 12 columns, 4:3 units — heroes land near native scale. */
export const COLW = 360;
export const ROWH = 270;
export const GRID_COLS = 12;

/**
 * Caption strips live INSIDE each slot (photo area shrinks when captions
 * exist). Footprints never change, so strips can never overlap neighbors —
 * in mosaic, justified, or freestyle alike. Canvases don't balloon.
 */
function sheetInnerWidth(gap: number, pad: number): { W: number; inner: number } {
  const inner = GRID_COLS * COLW + (GRID_COLS - 1) * gap;
  return { W: inner + pad * 2, inner };
}

function mosaicCells(t: MosaicTemplate, gap: number, pad: number): { cells: PlacedCell[]; W: number; H: number } {
  const { W } = sheetInnerWidth(gap, pad);
  const unitX = COLW + gap;
  const unitY = ROWH + gap;
  let bottom = 0;
  const cells = t.slots.map((s, i) => {
    const x = pad + s.c * unitX;
    const y = pad + s.r * unitY;
    const w = s.cs * COLW + (s.cs - 1) * gap;
    const h = s.rs * ROWH + (s.rs - 1) * gap;
    bottom = Math.max(bottom, y + h);
    return { slotIndex: i, x, y, w, h };
  });
  return { cells, W, H: bottom + pad };
}

function justifiedCells(slots: PhotoSlot[], gap: number, pad: number): { cells: PlacedCell[]; W: number; H: number } {
  const { W, inner } = sheetInnerWidth(gap, pad);
  const TARGET_H = 880;
  const cells: PlacedCell[] = [];
  let y = pad;
  let row: { idx: number; aspect: number }[] = [];
  let rowAspect = 0;

  const flush = (last: boolean) => {
    if (row.length === 0) return;
    // Exact-fit rows; the last row keeps natural height, left-aligned.
    const h = last ? TARGET_H : (inner - (row.length - 1) * gap) / rowAspect;
    let x = pad;
    for (const { idx, aspect } of row) {
      const w = aspect * h;
      cells.push({ slotIndex: idx, x, y, w, h });
      x += w + gap;
    }
    y += h + gap;
    row = [];
    rowAspect = 0;
  };

  slots.forEach((s, idx) => {
    const aspect = s.bitmap.width / Math.max(1, s.bitmap.height);
    row.push({ idx, aspect });
    rowAspect += aspect;
    if (rowAspect * TARGET_H + (row.length - 1) * gap >= inner) flush(false);
  });
  flush(true);
  return { cells, W, H: y - gap + pad };
}

export interface ResolveOpts {
  mode: LayoutMode;
  /** mosaic variant index (wraps); ignored otherwise */
  variantIdx: number;
  /** freestyle seed; ignored otherwise */
  seed: number;
}

export function resolveLayout(slots: PhotoSlot[], theme: Theme, opts: ResolveOpts): ResolvedLayout {
  const n = slots.length;
  const gap = theme.gap;
  const pad = theme.outerPad;
  const capH = slots.some((s) => s.caption.trim().length > 0) ? theme.captionHeight : 0;

  if (opts.mode === 'justified') {
    const { cells, W, H } = justifiedCells(slots, gap, pad);
    return { cells, W, H, capH, label: 'Justified Rows' };
  }
  if (opts.mode === 'freestyle') {
    const { rects, W, H } = freestyleRects(n, opts.seed, gap, pad);
    const cells: PlacedCell[] = rects.map((r, i) => ({ slotIndex: i, x: r.x, y: r.y, w: r.w, h: r.h }));
    return { cells, W, H, capH, label: `Freestyle #${seedLabel(opts.seed)}` };
  }
  const variants = layoutsFor(n);
  const t = variants[opts.variantIdx % Math.max(1, variants.length)];
  if (!t) {
    // n out of 1..12 (shouldn't happen with the cap) — fall back to justified.
    const { cells, W, H } = justifiedCells(slots, gap, pad);
    return { cells, W, H, capH, label: 'Justified Rows' };
  }
  const { cells, W, H } = mosaicCells(t, gap, pad);
  return {
    cells,
    W,
    H,
    capH,
    label: variants.length > 1 ? `${t.name} (${(opts.variantIdx % variants.length) + 1} of ${variants.length})` : t.name,
  };
}
