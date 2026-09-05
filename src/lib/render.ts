import { CELL_H, CELL_W, autoGrid } from './layout';
import type { PhotoSlot, Theme } from './types';

/** Deterministic pseudo-random from index so preview is stable. */
function jitterFor(index: number, maxDeg: number): number {
  if (!maxDeg) return 0;
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  const frac = x - Math.floor(x);
  return (frac - 0.5) * 2 * maxDeg;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function paintBackground(ctx: CanvasRenderingContext2D, theme: Theme, W: number, H: number) {
  if (theme.bg.length === 1) {
    ctx.fillStyle = theme.bg[0];
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  theme.bg.forEach((c, i) => g.addColorStop(i / (theme.bg.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawPattern(ctx: CanvasRenderingContext2D, theme: Theme, W: number, H: number) {
  if (theme.pattern === 'none') return;
  ctx.save();
  if (theme.pattern === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    const step = 96;
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme.pattern === 'stripes') {
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 3;
    for (let y = 0; y < H; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGrain(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  // ~2500 specks is plenty to unify exposures without slowing export
  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Draw the full sheet at native 1x scale.
 * - contain-fit: whole photo visible, no cropping ever
 * - caption strip reserved when ANY photo has a caption (uniform look)
 */
export function sheetSize(slotCount: number, theme: Theme, hasCaptions: boolean) {
  const { cols, rows } = autoGrid(Math.max(slotCount, 1));
  const capH = hasCaptions ? theme.captionHeight : 0;
  const cellFullH = CELL_H + capH;
  const W = theme.outerPad * 2 + cols * CELL_W + (cols - 1) * theme.gap;
  const H = theme.outerPad * 2 + rows * cellFullH + (rows - 1) * theme.gap;
  return { W, H, cols, rows, capH };
}

export function drawSheet(
  canvas: HTMLCanvasElement,
  slots: PhotoSlot[],
  theme: Theme,
): { width: number; height: number } {
  const hasCaptions = slots.some((s) => s.caption.trim().length > 0);
  const count = Math.max(slots.length, 1);
  const { W, H, cols, capH } = sheetSize(count, theme, hasCaptions);
  const cellFullH = CELL_H + capH;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: W, height: H };

  paintBackground(ctx, theme, W, H);
  drawPattern(ctx, theme, W, H);

  for (let i = 0; i < cols * Math.ceil(count / cols); i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = theme.outerPad + col * (CELL_W + theme.gap);
    const y = theme.outerPad + row * (cellFullH + theme.gap);
    const slot = slots[i];

    ctx.save();
    // Polaroid-style wiggle around cell center
    if (theme.jitterDeg) {
      const deg = jitterFor(i, theme.jitterDeg);
      ctx.translate(x + CELL_W / 2, y + cellFullH / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.translate(-(x + CELL_W / 2), -(y + cellFullH / 2));
    }

    // Cell card with optional drop shadow for depth
    if (theme.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 24;
      ctx.fillStyle = slot ? theme.cellBg : 'rgba(127,127,127,0.18)';
      roundRect(ctx, x, y, CELL_W, cellFullH, theme.radius);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = slot ? theme.cellBg : 'rgba(127,127,127,0.18)';
      roundRect(ctx, x, y, CELL_W, cellFullH, theme.radius);
      ctx.fill();
    }
    // Refined border: theme-defined, or a whisper of definition
    ctx.save();
    if (theme.borderColor) {
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = theme.borderWidth;
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 3;
    }
    roundRect(ctx, x, y, CELL_W, cellFullH, theme.radius);
    ctx.stroke();
    ctx.restore();

    if (slot) {
      // contain-fit image into CELL_W x CELL_H area (top part of card)
      const bw = slot.bitmap.width;
      const bh = slot.bitmap.height;
      const scale = Math.min(CELL_W / bw, CELL_H / bh);
      const dw = Math.floor(bw * scale);
      const dh = Math.floor(bh * scale);
      const dx = x + Math.floor((CELL_W - dw) / 2);
      const dy = y + Math.floor((CELL_H - dh) / 2);
      ctx.save();
      roundRect(ctx, x, y, CELL_W, cellFullH, theme.radius);
      ctx.clip();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(slot.bitmap, dx, dy, dw, dh);

      // Caption
      if (hasCaptions && slot.caption.trim()) {
        const cy = y + CELL_H;
        if (theme.captionBg) {
          ctx.fillStyle = theme.captionBg;
          ctx.fillRect(x, cy, CELL_W, capH);
        }
        ctx.fillStyle = theme.captionColor;
        ctx.font = theme.captionFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = slot.caption.trim().slice(0, 80);
        ctx.fillText(label, x + CELL_W / 2, cy + capH / 2, CELL_W - 60);
      } else if (hasCaptions) {
        // empty caption space stays clean — keeps grid uniform
      }
      ctx.restore();
    } else {
      // Empty themed placeholder cell — tinted to match the theme
      ctx.fillStyle = theme.placeholderColor;
      ctx.font = '500 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('drop a photo here', x + CELL_W / 2, y + cellFullH / 2);
    }
    ctx.restore();
  }

  if (theme.grain) drawGrain(ctx, W, H);
  if (theme.vignette) drawVignette(ctx, W, H);

  return { width: W, height: H };
}

export async function exportSheet(canvas: HTMLCanvasElement, kind: 'png' | 'jpeg' = 'png'): Promise<Blob> {
  const type = kind === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = kind === 'jpeg' ? 0.92 : undefined;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality),
  );
  if (!blob) throw new Error('Export failed — canvas is empty?');
  return blob;
}
