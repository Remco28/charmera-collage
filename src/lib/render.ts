import { CELL_H, CELL_W } from './layout';
import type { PhotoSlot, Theme } from './types';
import type { PlacedSheet } from './recipes';

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
  if (theme.bgStyle === 'radial') {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.08, W / 2, H / 2, Math.max(W, H) * 0.72);
    theme.bg.forEach((c, i) => g.addColorStop(i / (theme.bg.length - 1), c));
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    theme.bg.forEach((c, i) => g.addColorStop(i / (theme.bg.length - 1), c));
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, W, H);
}

/** Seeded RNG so preview and export are pixel-identical every run. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function themeSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Procedural background textures. Everything is tuned to read in narrow
 * gutters (44–96px) — small-scale marks, low alpha, no sweeping murals
 * (photos cover ~93% of the sheet anyway).
 */
function drawTexture(ctx: CanvasRenderingContext2D, theme: Theme, W: number, H: number) {
  const kind = theme.texture;
  if (kind === 'none') return;
  const rand = mulberry32(themeSeed(theme.id));
  ctx.save();

  if (kind === 'dots') {
    ctx.fillStyle = theme.textureColor ?? 'rgba(255,255,255,0.07)';
    const step = 96;
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === 'stripes') {
    ctx.strokeStyle = theme.textureColor ?? 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 3;
    for (let y = 0; y < H; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  } else if (kind === 'halftone') {
    // Comic-print dots, sized by a sine field — bold enough for gutters.
    ctx.fillStyle = theme.textureColor ?? 'rgba(0,0,0,0.12)';
    const step = 64;
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        const r = 2 + 8 * (0.5 + 0.5 * Math.sin(x * 0.004) * Math.cos(y * 0.004));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === 'rays') {
    // Retro sunburst from sheet center.
    ctx.fillStyle = theme.textureColor ?? 'rgba(255,255,255,0.08)';
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.max(W, H);
    const wedges = 24;
    for (let i = 0; i < wedges; i += 2) {
      const a0 = (i / wedges) * Math.PI * 2;
      const a1 = ((i + 1) / wedges) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'weave') {
    // Linen: fine lines both directions, batched into two paths.
    ctx.strokeStyle = theme.textureColor ?? 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y < H; y += 8) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x < W; x += 8) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    ctx.stroke();
  } else if (kind === 'stars') {
    // Tiny plus-sign stars, seeded.
    ctx.strokeStyle = theme.textureColor ?? 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 240; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const s = 3 + rand() * 8;
      ctx.globalAlpha = 0.15 + rand() * 0.4;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s);
      ctx.lineTo(x, y + s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'sprinkles') {
    // Static confetti dashes in a fixed pastel palette.
    const palette = ['#ff8fab', '#ffd93d', '#6bcbff', '#8fe3a8', '#d9b8f0', '#ff9d5c'];
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 170; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const a = rand() * Math.PI;
      const len = 10 + rand() * 16;
      ctx.strokeStyle = palette[Math.floor(rand() * palette.length)];
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'terrazzo') {
    // Organic chips in warm neutrals.
    const palette = ['rgba(0,0,0,0.07)', 'rgba(120,90,60,0.12)', 'rgba(178,158,128,0.16)', 'rgba(255,255,255,0.55)'];
    for (let i = 0; i < 95; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const r = 12 + rand() * 34;
      const pts = 5 + Math.floor(rand() * 3);
      const rot = rand() * Math.PI * 2;
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
      ctx.beginPath();
      for (let p = 0; p < pts; p++) {
        const a = rot + (p / pts) * Math.PI * 2;
        const rr = r * (0.7 + rand() * 0.5);
        const vx = x + Math.cos(a) * rr;
        const vy = y + Math.sin(a) * rr;
        if (p === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'grid') {
    // Drafting grid, fine + major lines.
    ctx.strokeStyle = theme.textureColor ?? 'rgba(0,0,0,0.09)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 0; y < H; y += 56) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    for (let x = 0; x < W; x += 56) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    ctx.stroke();
  } else if (kind === 'fiber') {
    // Handmade-paper wash: soft translucent blobs.
    for (let i = 0; i < 70; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const rx = 120 + rand() * 320;
      const ry = 80 + rand() * 200;
      const rot = rand() * Math.PI;
      ctx.fillStyle =
        theme.textureColor ?? (i % 3 === 0 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.06)');
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'lightleak') {
    // Film light leak: warm blooms from two corners.
    let g = ctx.createRadialGradient(0, H, 0, 0, H, Math.max(W, H) * 0.55);
    g.addColorStop(0, 'rgba(255,110,30,0.30)');
    g.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W, 0, 0, W, 0, Math.max(W, H) * 0.4);
    g.addColorStop(0, 'rgba(255,200,90,0.20)');
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (kind === 'checker') {
    // Subtle checkerboard for soda-shop / ska moods.
    ctx.fillStyle = theme.textureColor ?? 'rgba(0,0,0,0.06)';
    const s = 72;
    let row = 0;
    for (let y = 0; y < H; y += s, row++) {
      for (let x = (row % 2) * s; x < W; x += s * 2) {
        ctx.fillRect(x, y, s, s);
      }
    }
  }
  ctx.restore();
}

function drawGrain(ctx: CanvasRenderingContext2D, W: number, H: number, seed: number) {
  // Two-tone film grain, seeded so every export matches the preview.
  const rand = mulberry32(seed ^ 0x9e3779b9);
  ctx.save();
  for (let i = 0; i < 2600; i++) {
    const x = rand() * W;
    const y = rand() * H;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)';
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
 * Draw the full sheet of IDENTICAL cards positioned by a row recipe.
 * - native pixels, no resizing, no cropping ever
 * - exactly n cards, no placeholders — rows simply end
 * - caption strip reserved when ANY photo has a caption (uniform look)
 */
export function drawSheet(
  canvas: HTMLCanvasElement,
  slots: PhotoSlot[],
  theme: Theme,
  sheet: PlacedSheet,
): { width: number; height: number } {
  const hasCaptions = slots.some((s) => s.caption.trim().length > 0);
  const capH = hasCaptions ? theme.captionHeight : 0;
  const cellFullH = CELL_H + capH;
  const { W, H } = sheet;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: W, height: H };

  paintBackground(ctx, theme, W, H);
  drawTexture(ctx, theme, W, H);

  sheet.positions.forEach((pos, i) => {
    const x = pos.x;
    const y = pos.y;
    const slot = slots[i];
    if (!slot) return;

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
    // Caption band BEFORE the border, so the rule stays crisp and
    // unbroken (painting it after ate the inner half of thick borders).
    if (hasCaptions && capH > 0 && theme.captionBg) {
      ctx.fillStyle = theme.captionBg;
      ctx.fillRect(x, y + CELL_H, CELL_W, capH);
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

    // One sealed unit: photo + frame + caption. Identical size, always.
    {
      // contain-fit image into the mat frame (top part of card, inset by mat).
      // Zero cropping ever — the mat just makes cellBg a visible frame.
      const px = x + theme.mat;
      const py = y + theme.mat;
      const pw = CELL_W - theme.mat * 2;
      const ph = CELL_H - theme.mat - theme.matBottom;
      const bw = slot.bitmap.width;
      const bh = slot.bitmap.height;
      const scale = Math.min(pw / bw, ph / bh);
      const dw = Math.floor(bw * scale);
      const dh = Math.floor(bh * scale);
      const dx = px + Math.floor((pw - dw) / 2);
      const dy = py + Math.floor((ph - dh) / 2);
      ctx.save();
      roundRect(ctx, x, y, CELL_W, cellFullH, theme.radius);
      ctx.clip();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(slot.bitmap, dx, dy, dw, dh);

      // Caption text only — the band itself was painted before the border.
      if (hasCaptions && slot.caption.trim()) {
        const cy = y + CELL_H;
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
    }
    ctx.restore();
  });

  if (theme.grain) drawGrain(ctx, W, H, themeSeed(theme.id));
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
