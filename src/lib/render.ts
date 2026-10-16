import { anyCaptions, cardBox } from './card';
import { paintCard, paintStrings } from './paint/cards';
import { paintGrain, paintSurface, paintVignette } from './paint/surfaces';
import { wobble } from './paint/util';
import type { PlacedSheet } from './recipes';
import type { PhotoSlot, Theme } from './types';

/**
 * iOS/iPadOS Safari refuses canvases over 16.7 MP (4096²): drawing silently
 * fails and toBlob returns null. Sheets of ~9+ native cards are bigger.
 */
export const MAX_SAFE_PIXELS = 4096 * 4096;

/** Largest scale (≤ 1) that keeps a W×H sheet under the iOS canvas limit. */
export function safeScale(W: number, H: number): number {
  const area = W * H;
  if (area <= MAX_SAFE_PIXELS) return 1;
  // Small margin so rounding the canvas size up can never cross the limit.
  return Math.sqrt(MAX_SAFE_PIXELS / area) * 0.995;
}

/**
 * Draw the sheet: the theme's surface, then one card per photo in tray
 * order, then whole-sheet finishing. Layout is in native sheet units, so a
 * `scale` below 1 (preview, phone-size export) draws the identical sheet smaller.
 */
export function drawSheet(
  canvas: HTMLCanvasElement,
  slots: PhotoSlot[],
  theme: Theme,
  sheet: PlacedSheet,
  scale = 1,
): { width: number; height: number } {
  const { W, H } = sheet;
  canvas.width = Math.max(1, Math.round(W * scale));
  canvas.height = Math.max(1, Math.round(H * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: canvas.width, height: canvas.height };
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const withCaptions = anyCaptions(slots);
  const { w, h } = cardBox(theme, withCaptions);
  const firstCaptioned = slots.findIndex((s) => s.caption.trim().length > 0);

  paintSurface(ctx, theme, W, H);
  if (theme.card === 'pegged') {
    const rows = [...new Set(sheet.positions.map((p) => p.y))];
    paintStrings(ctx, theme, rows, W, scale);
  }

  sheet.positions.forEach((pos, i) => {
    const slot = slots[i];
    if (!slot) return;
    ctx.save();
    if (theme.jitterDeg) {
      const cx = pos.x + w / 2;
      const cy = pos.y + h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((wobble(i, 1) * theme.jitterDeg * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    paintCard({ ctx, theme, slot, i, x: pos.x, y: pos.y, w, h, withCaptions, firstCaptioned, scale });
    ctx.restore();
  });

  if (theme.grain) paintGrain(ctx, theme, W, H);
  if (theme.vignette) paintVignette(ctx, W, H);
  return { width: canvas.width, height: canvas.height };
}

/**
 * Render the sheet on a fresh offscreen canvas and encode it. Returns null
 * when the browser cannot produce the image (e.g. over the iOS size limit).
 */
export async function renderSheetBlob(
  slots: PhotoSlot[],
  theme: Theme,
  sheet: PlacedSheet,
  kind: 'png' | 'jpeg',
  scale = 1,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  const canvas = document.createElement('canvas');
  try {
    const size = drawSheet(canvas, slots, theme, sheet, scale);
    const type = kind === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = kind === 'jpeg' ? 0.92 : undefined;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    return blob && blob.size > 0 ? { blob, ...size } : null;
  } catch {
    return null;
  } finally {
    // Free the backing store now; Safari counts it against a small budget.
    canvas.width = 0;
    canvas.height = 0;
  }
}
