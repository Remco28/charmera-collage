import { DISPLAY, SERIF, TYPE } from '../fonts';
import { CELL_H, CELL_W } from '../layout';
import type { PhotoSlot, Theme } from '../types';
import {
  clearShadow, fitFont, fontSize, isDark, monthShort, pad2, photoRect, pick, roman, roundRect, setShadow, shade, wobble,
} from './util';
import type { Ctx } from './util';

export interface CardInput {
  ctx: Ctx;
  theme: Theme;
  slot: PhotoSlot;
  /** Card index in sheet order. */
  i: number;
  /** Card box, caption area included. */
  x: number;
  y: number;
  w: number;
  h: number;
  withCaptions: boolean;
  /** Index of the first captioned card (for the grease-pencil "pick"), or -1. */
  firstCaptioned: number;
  scale: number;
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Draw one card. The photo always sits in its native 1440×1080 box at the
 * concept's border offset; each concept builds its own object around it.
 */
export function paintCard(c: CardInput) {
  const { ctx, theme, slot, i, x, y, w, h, withCaptions } = c;
  const p = theme.palette;
  const b = theme.border;
  const box: Rect = { x: x + b.left, y: y + b.top, w: CELL_W, h: CELL_H };
  const photo = photoRect(slot.bitmap, box.x, box.y, box.w, box.h);
  /** The card body without the caption area (for kinds that write captions on the surface). */
  const bodyH = h - (withCaptions ? theme.captionArea : 0);
  const below = { top: box.y + box.h, bottom: y + h };
  const text = slot.caption.trim();
  const darkSurface = isDark(p.surface[0]);
  const card = pick(p.card, i);

  const body = (r = theme.radius, height = h) => {
    ctx.save();
    setShadow(ctx, theme, c.scale, darkSurface);
    ctx.fillStyle = card;
    roundRect(ctx, x, y, w, height, r);
    ctx.fill();
    ctx.restore();
  };

  switch (theme.card) {
    case 'film': {
      // Captions go on the sheet under the strip, not on the film.
      ctx.fillStyle = card;
      ctx.fillRect(x, y, w, bodyH);
      const holes = 8;
      const pitch = w / holes;
      ctx.fillStyle = p.detail;
      for (let k = 0; k < holes; k++) {
        const hx = x + k * pitch + (pitch - 84) / 2;
        roundRect(ctx, hx, y + 36, 84, 62, 12);
        ctx.fill();
        roundRect(ctx, hx, y + bodyH - 98, 84, 62, 12);
        ctx.fill();
      }
      // edge print: frame numbers below, film stock above
      ctx.fillStyle = p.ink;
      ctx.font = `400 46px ${TYPE}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const ey = below.top + 46;
      ctx.fillText(String(i + 1), x + 50, ey);
      arrow(ctx, x + w * 0.5 - 40, ey, 16, p.ink);
      ctx.fillText(`${i + 1}A`, x + w * 0.5, ey);
      if (i % 2 === 0) {
        ctx.globalAlpha = 0.8;
        ctx.fillText('SAFETY FILM 400', x + w * 0.58, y + 144);
        ctx.globalAlpha = 1;
      }
      drawPhoto(ctx, slot, photo);
      if (text) {
        ctx.save();
        ctx.translate(x + w * 0.66, y + bodyH + theme.captionArea * 0.55);
        ctx.rotate(-0.035);
        fitFont(ctx, theme.captionFont, text, w * 0.6);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = pick(p.accent, i);
        ctx.fillText(text, 0, 0, w * 0.62);
        ctx.restore();
      }
      if (i === c.firstCaptioned) greasePencilLoop(ctx, photo, pick(p.accent, i), i);
      break;
    }

    case 'print':
    case 'pegged':
    case 'pinned': {
      body();
      edge(ctx, x, y, w, h, theme.radius);
      drawPhoto(ctx, slot, photo);
      if (theme.dateStamp) dateStamp(ctx, photo, slot.taken, c.scale);
      if (text) caption(ctx, theme, text, x + w / 2, (below.top + below.bottom) / 2, w - 140, p.ink, wobble(i, 3) * 0.02);
      if (theme.card === 'pegged') {
        peg(ctx, x + w * 0.2, y, pick(p.accent, i), c.scale);
        peg(ctx, x + w * 0.8, y, pick(p.accent, i + 1), c.scale);
      }
      if (theme.card === 'pinned') pin(ctx, x + w / 2 + wobble(i, 5) * 90, y + 44, pick(p.accent, i), c.scale);
      break;
    }

    case 'instant': {
      body();
      drawPhoto(ctx, slot, photo);
      // the print window sits a hair below the frame surface
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 3;
      ctx.strokeRect(photo.x - 1.5, photo.y - 1.5, photo.w + 3, photo.h + 3);
      if (text) caption(ctx, theme, text, x + w / 2, below.top + (below.bottom - below.top) * 0.48, w - 180, p.ink, -0.02 + wobble(i, 3) * 0.015);
      break;
    }

    case 'taped':
    case 'cornered': {
      body(theme.radius, bodyH);
      drawPhoto(ctx, slot, photo);
      if (theme.card === 'taped') {
        // One roll per photo, so the pieces match. Three ways of sticking it down,
        // chosen so neighbors never put two pieces corner to corner.
        const roll = pick(p.accent, i);
        const lean = (salt: number) => wobble(i, salt) * 0.1;
        const style = i % 3;
        if (style === 0) {
          tape(ctx, x + w / 2 + wobble(i, 22) * 140, y + 8, lean(23), roll, p.detail, 470);
        } else if (style === 1) {
          tape(ctx, x + 50, y + 24, -0.66 + lean(24), roll, p.detail, 340);
          tape(ctx, x + w - 50, y + 24, 0.66 + lean(26), roll, p.detail, 340);
        } else {
          tape(ctx, x + w - 50, y + 24, 0.7 + lean(24), roll, p.detail, 340);
          tape(ctx, x + 50, y + bodyH - 24, 0.7 + lean(26), roll, p.detail, 340);
        }
      } else {
        for (const [cx, cy, rot] of [[x, y, 0], [x + w, y, 1], [x + w, y + bodyH, 2], [x, y + bodyH, 3]] as const) {
          photoCorner(ctx, cx, cy, rot, pick(p.accent, i), p.detail);
        }
      }
      if (text) caption(ctx, theme, text, x + w / 2, y + bodyH + theme.captionArea * 0.55, w - 60, p.ink, wobble(i, 3) * 0.03);
      break;
    }

    case 'sticker': {
      body(theme.radius, bodyH);
      ctx.save();
      roundRect(ctx, photo.x, photo.y, photo.w, photo.h, theme.radius - b.left * 0.6);
      ctx.clip();
      drawPhoto(ctx, slot, photo);
      ctx.restore();
      // glossy sheen across the whole sticker
      ctx.save();
      roundRect(ctx, x, y, w, bodyH, theme.radius);
      ctx.clip();
      const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + bodyH * 0.6);
      g.addColorStop(0, 'rgba(255,255,255,0.28)');
      g.addColorStop(0.45, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, bodyH);
      ctx.restore();
      if (text) {
        ctx.save();
        const font = fitFont(ctx, theme.captionFont, text, w - 260);
        const fs = fontSize(font);
        const tw = Math.min(ctx.measureText(text).width, w - 260);
        const pw = tw + fs * 1.3;
        const ph = fs * 1.6;
        ctx.translate(x + w / 2 + wobble(i, 7) * 60, y + bodyH - 6);
        ctx.rotate(wobble(i, 8) * 0.06);
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 16 * c.scale;
        ctx.shadowOffsetY = 6 * c.scale;
        ctx.fillStyle = card;
        roundRect(ctx, -pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 24, ph / 2 + 12);
        ctx.fill();
        clearShadow(ctx);
        ctx.fillStyle = pick(p.accent, i);
        roundRect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
        ctx.fill();
        ctx.fillStyle = p.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, fs * 0.04, w - 260);
        ctx.restore();
      }
      break;
    }

    case 'slide': {
      body();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      roundRect(ctx, x + 8, y + 8, w - 16, h - 16, theme.radius - 8);
      ctx.stroke();
      ctx.fillStyle = '#121212';
      roundRect(ctx, photo.x - 12, photo.y - 12, photo.w + 24, photo.h + 24, 22);
      ctx.fill();
      ctx.save();
      roundRect(ctx, photo.x, photo.y, photo.w, photo.h, 14);
      ctx.clip();
      drawPhoto(ctx, slot, photo);
      ctx.restore();
      ctx.fillStyle = p.ink;
      ctx.textBaseline = 'middle';
      if (text) {
        ctx.textAlign = 'center';
        fitFont(ctx, theme.captionFont, text, w - 360);
        ctx.fillText(text, x + w / 2, y + b.top / 2 + 10, w - 360);
      }
      ctx.font = `400 50px ${TYPE}`;
      ctx.globalAlpha = 0.75;
      ctx.textAlign = 'left';
      ctx.fillText(`Nº ${pad2(i + 1)}`, x + 150, y + h - b.bottom / 2);
      ctx.textAlign = 'right';
      ctx.fillText(`${monthShort(slot.taken)} ${slot.taken.getFullYear()}`, x + w - 150, y + h - b.bottom / 2);
      ctx.globalAlpha = 1;
      // orientation dot, as projectionists marked them
      ctx.fillStyle = pick(p.accent, i);
      ctx.beginPath();
      ctx.arc(x + 120, y + 120, 30, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'framed': {
      const M = 40;
      // gallery light pooling on the wall above each frame
      const lg = ctx.createRadialGradient(x + w / 2, y - 80, 0, x + w / 2, y - 80, w * 0.85);
      lg.addColorStop(0, `rgba(255,248,228,${darkSurface ? 0.16 : 0.42})`);
      lg.addColorStop(1, 'rgba(255,248,228,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - w * 0.4, y - w * 0.6, w * 1.8, w * 1.4);
      ctx.save();
      setShadow(ctx, theme, c.scale, darkSurface);
      ctx.fillStyle = p.detail;
      ctx.fillRect(x, y, w, bodyH);
      ctx.restore();
      ctx.strokeStyle = shade(p.detail, 0.3);
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 4, y + 4, w - 8, bodyH - 8);
      ctx.fillStyle = card;
      ctx.fillRect(x + M, y + M, w - M * 2, bodyH - M * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + M, y + M, w - M * 2, bodyH - M * 2);
      // bevel-cut window
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(photo.x - 12, photo.y - 12, photo.w + 24, photo.h + 24);
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 3;
      ctx.strokeRect(photo.x - 12, photo.y - 12, photo.w + 24, photo.h + 24);
      drawPhoto(ctx, slot, photo);
      if (text) {
        const pw = 940;
        const ph = 220;
        const px = x + w / 2 - pw / 2;
        const py = y + bodyH + 60;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 14 * c.scale;
        ctx.shadowOffsetY = 5 * c.scale;
        ctx.fillStyle = pick(p.accent, i);
        ctx.fillRect(px, py, pw, ph);
        ctx.restore();
        ctx.fillStyle = p.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fitFont(ctx, theme.captionFont, text, pw - 80);
        ctx.fillText(text, x + w / 2, py + 86, pw - 70);
        ctx.font = `italic 400 46px ${SERIF}`;
        ctx.globalAlpha = 0.7;
        ctx.fillText(`Charmera, ${slot.taken.getFullYear()}`, x + w / 2, py + 160);
        ctx.globalAlpha = 1;
      }
      break;
    }

    case 'plate': {
      ctx.strokeStyle = p.detail;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 4;
      ctx.strokeRect(photo.x - 34, photo.y - 34, photo.w + 68, photo.h + 68);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.strokeRect(photo.x - 20, photo.y - 20, photo.w + 40, photo.h + 40);
      ctx.globalAlpha = 1;
      drawPhoto(ctx, slot, photo);
      if (withCaptions) {
        const label = `PL. ${roman(i + 1)}${text ? ` — ${text}` : ''}`;
        ctx.fillStyle = p.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        fitFont(ctx, theme.captionFont, label, photo.w + 68);
        ctx.fillText(label, photo.x - 34, below.top + 34 + (below.bottom - below.top - 34) / 2, photo.w + 68);
      }
      break;
    }

    case 'zine': {
      ctx.fillStyle = p.detail;
      ctx.fillRect(x, y, w, bodyH);
      drawPhoto(ctx, slot, photo);
      ctx.save();
      ctx.translate(x - 30, y - 30);
      ctx.rotate(wobble(i, 4) * 0.05);
      ctx.fillStyle = pick(p.accent, i);
      ctx.fillRect(0, 0, 200, 170);
      ctx.fillStyle = p.surface[0];
      ctx.font = `800 120px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pad2(i + 1), 100, 92);
      ctx.restore();
      if (text) {
        ctx.save();
        const font = fitFont(ctx, theme.captionFont, text, w - 200);
        const tw = Math.min(ctx.measureText(text).width, w - 200);
        ctx.translate(x + 40, y + bodyH + 30);
        ctx.rotate(wobble(i, 6) * 0.025);
        ctx.fillStyle = card;
        ctx.fillRect(0, 0, tw + 70, fontSize(font) * 1.55);
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, tw + 70, fontSize(font) * 1.55);
        ctx.fillStyle = p.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 35, fontSize(font) * 0.8, w - 200);
        ctx.restore();
      }
      break;
    }

    case 'flash': {
      ctx.save();
      setShadow(ctx, theme, c.scale);
      ctx.fillStyle = card;
      roundRect(ctx, photo.x, photo.y, photo.w, photo.h, theme.radius);
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, photo.x, photo.y, photo.w, photo.h, theme.radius);
      ctx.clip();
      drawPhoto(ctx, slot, photo);
      ctx.restore();
      if (text) {
        ctx.save();
        ctx.shadowColor = p.ink;
        ctx.shadowBlur = 28 * c.scale;
        caption(ctx, theme, text, x + w / 2, (below.top + below.bottom) / 2 + 10, w - 120, p.ink, wobble(i, 3) * 0.035);
        ctx.restore();
      }
      break;
    }

    case 'stamp': {
      ctx.save();
      setShadow(ctx, theme, c.scale, darkSurface);
      ctx.fillStyle = card;
      ctx.fillRect(x + 14, y + 14, w - 28, h - 28);
      ctx.restore();
      perforated(ctx, x, y, w, h, card);
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 50, y + 50, w - 100, h - 100);
      drawPhoto(ctx, slot, photo);
      ctx.fillStyle = p.ink;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'right';
      ctx.font = `600 96px ${SERIF}`;
      const value = [5, 10, 12, 15, 20, 25, 30, 50][i % 8];
      ctx.fillText(`${value}¢`, x + w - 86, y + h - 76);
      ctx.textAlign = 'left';
      const label = (text || 'Charmera Post').toUpperCase();
      fitFont(ctx, theme.captionFont, label, w - 440);
      ctx.fillText(label, x + 86, y + h - 84, w - 440);
      if (i % 3 === 1) postmark(ctx, x + w - 150, y + 150, slot.taken, pick(p.accent, i));
      break;
    }

    case 'bare': {
      ctx.save();
      setShadow(ctx, theme, c.scale, darkSurface);
      ctx.fillStyle = card;
      roundRect(ctx, photo.x, photo.y, photo.w, photo.h, theme.radius);
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, photo.x, photo.y, photo.w, photo.h, theme.radius);
      ctx.clip();
      drawPhoto(ctx, slot, photo);
      ctx.restore();
      if (text) caption(ctx, theme, text, x + w / 2, (below.top + below.bottom) / 2 + 8, w - 120, p.ink, 0);
      break;
    }
  }
}

/** Strings for the clothesline, one per row, sagging a little between the ends. Drawn behind the cards. */
export function paintStrings(ctx: Ctx, theme: Theme, rowYs: number[], W: number, scale: number) {
  ctx.save();
  ctx.strokeStyle = theme.palette.detail;
  ctx.lineWidth = 7;
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetY = 10 * scale;
  for (const ry of rowYs) {
    const sy = ry + 30;
    ctx.beginPath();
    ctx.moveTo(-20, sy - 30);
    ctx.quadraticCurveTo(W / 2, sy + 60, W + 20, sy - 30);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhoto(ctx: Ctx, slot: PhotoSlot, r: Rect) {
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(slot.bitmap, r.x, r.y, r.w, r.h);
}

function edge(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, r);
  ctx.stroke();
}

function caption(ctx: Ctx, theme: Theme, text: string, cx: number, cy: number, maxW: number, color: string, rot: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  fitFont(ctx, theme.captionFont, text, maxW);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0, maxW);
  ctx.restore();
}

function arrow(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 1.4, y);
  ctx.lineTo(x, y + s);
  ctx.closePath();
  ctx.fill();
}

/** Loose double loop around a frame, the way a picture editor marks the keeper. */
/**
 * One quick hand-drawn loop around the pick, the way a grease pencil circles a
 * frame on a proof: slightly egg-shaped, one smooth stroke that runs past its
 * start and lands a little outside it. Stays inside its own frame's strip.
 */
function greasePencilLoop(ctx: Ctx, r: Rect, color: string, i: number) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rx = r.w / 2 - 40;
  const ry = r.h / 2 + 50;
  // Low-frequency, seeded wobble: smooth, never jagged.
  const ph1 = wobble(i, 11) * Math.PI;
  const ph2 = wobble(i, 13) * Math.PI;
  const start = -2.2 + wobble(i, 17) * 0.3;
  const turn = Math.PI * 2 + 0.45; // overshoot past the start
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  const steps = 160;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const a = start + t * turn;
    // drifts outward over the loop, so the end crosses just outside the start
    const grow = 1 - 0.035 + t * 0.06;
    const wob = 1 + Math.sin(a * 2 + ph1) * 0.018 + Math.sin(a * 3 + ph2) * 0.012;
    // egg shape: a touch wider along the top
    const egg = 1 + Math.sin(a) * -0.025;
    const px = cx + Math.cos(a) * rx * grow * wob * egg;
    const py = cy + Math.sin(a) * ry * grow * wob;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/** Orange seven-segment date, burned in like a disposable camera's. */
function dateStamp(ctx: Ctx, r: Rect, d: Date, scale: number) {
  const SEG: Record<string, string> = {
    0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  };
  const text = `'${pad2(d.getFullYear() % 100)} ${pad2(d.getMonth() + 1)} ${pad2(d.getDate())}`;
  const h = 66;
  const dw = 34;
  const t = 9;
  const advance = dw + 16;
  const width = [...text].reduce((n, ch) => n + (ch === ' ' ? 26 : ch === "'" ? 18 : advance), 0);
  let px = r.x + r.w - 56 - width;
  const py = r.y + r.h - 56 - h;
  ctx.save();
  ctx.strokeStyle = '#ffa04a';
  ctx.lineWidth = t;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,100,0,0.9)';
  ctx.shadowBlur = 16 * scale;
  ctx.globalAlpha = 0.92;
  const seg = (x0: number, y0: number, x1: number, y1: number) => {
    // slight italic, like the LCD in the camera back
    const sk = (yy: number) => (py + h - yy) * 0.12;
    ctx.moveTo(x0 + sk(y0), y0);
    ctx.lineTo(x1 + sk(y1), y1);
  };
  ctx.beginPath();
  for (const ch of text) {
    if (ch === ' ') { px += 26; continue; }
    if (ch === "'") { seg(px + 6, py, px + 2, py + 18); px += 18; continue; }
    const x0 = px;
    const x1 = px + dw;
    const ym = py + h / 2;
    const yb = py + h;
    const g = 4;
    for (const s of SEG[ch] ?? '') {
      if (s === 'a') seg(x0 + g, py, x1 - g, py);
      if (s === 'b') seg(x1, py + g, x1, ym - g);
      if (s === 'c') seg(x1, ym + g, x1, yb - g);
      if (s === 'd') seg(x0 + g, yb, x1 - g, yb);
      if (s === 'e') seg(x0, ym + g, x0, yb - g);
      if (s === 'f') seg(x0, py + g, x0, ym - g);
      if (s === 'g') seg(x0 + g, ym, x1 - g, ym);
    }
    px += advance;
  }
  ctx.stroke();
  ctx.restore();
}

/** Wooden clothes peg gripping the top edge at (cx, top). */
function peg(ctx: Ctx, cx: number, top: number, color: string, scale: number) {
  const pw = 52;
  const ph = 190;
  const x = cx - pw / 2;
  const y = top - 92;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 8 * scale;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, pw, ph, 12);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = shade(color.startsWith('#') ? color : '#c88f57', -0.25);
  ctx.fillRect(cx - 2, y + 10, 4, ph - 20);
  ctx.fillStyle = '#6d7277';
  ctx.fillRect(x - 4, y + ph * 0.42, pw + 8, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + 6, y + 8, 6, ph - 16);
}

/** Map pin with a domed head and its own shadow. */
function pin(ctx: Ctx, cx: number, cy: number, color: string, scale: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + 22, cy + 26, 34, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - 12, cy - 14, 4, cx, cy, 40);
  g.addColorStop(0, shade(color, 0.45));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.35));
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6 * scale;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(cx - 13, cy - 14, 8, 0, Math.PI * 2);
  ctx.fill();
}

/** A strip of washi tape across a corner, torn at both ends. */
function tape(ctx: Ctx, cx: number, cy: number, rot: number, color: string, stripe: string, tw = 380) {
  const th = 104;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  const teeth = 7;
  ctx.moveTo(-tw / 2, -th / 2);
  ctx.lineTo(tw / 2, -th / 2);
  for (let k = 1; k <= teeth; k++) ctx.lineTo(tw / 2 + (k % 2 ? -10 : 0), -th / 2 + (th * k) / teeth);
  ctx.lineTo(-tw / 2, th / 2);
  for (let k = teeth - 1; k >= 0; k--) ctx.lineTo(-tw / 2 + (k % 2 ? 10 : 0), -th / 2 + (th * k) / teeth);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = stripe;
  ctx.lineWidth = 10;
  ctx.beginPath();
  for (let sx = -tw; sx < tw; sx += 34) {
    ctx.moveTo(sx, -th);
    ctx.lineTo(sx + th * 1.2, th);
  }
  ctx.stroke();
  ctx.restore();
}

/** Slip-in album corner. rot 0..3 = top-left, top-right, bottom-right, bottom-left. */
function photoCorner(ctx: Ctx, cx: number, cy: number, rot: number, color: string, edgeColor: string) {
  const s = 150;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 2);
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.lineTo(s, -14);
  ctx.lineTo(-14, s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s, -14);
  ctx.lineTo(-14, s);
  ctx.stroke();
  ctx.restore();
}

/** Stamp body with half-circle perforations bitten out of every edge. */
function perforated(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  const r = 22;
  const pitch = 64;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  const nx = Math.round(w / pitch);
  const ny = Math.round(h / pitch);
  for (let k = 0; k <= nx; k++) {
    const px = x + (k * w) / nx;
    ctx.moveTo(px + r, y);
    ctx.arc(px, y, r, 0, Math.PI * 2);
    ctx.moveTo(px + r, y + h);
    ctx.arc(px, y + h, r, 0, Math.PI * 2);
  }
  for (let k = 1; k < ny; k++) {
    const py = y + (k * h) / ny;
    ctx.moveTo(x + r, py);
    ctx.arc(x, py, r, 0, Math.PI * 2);
    ctx.moveTo(x + w + r, py);
    ctx.arc(x + w, py, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = color;
  ctx.fill('evenodd');
  ctx.restore();
}

/** Round postmark with the date, plus wavy cancel lines. */
function postmark(ctx: Ctx, cx: number, cy: number, d: Date, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 118, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `400 44px ${TYPE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(monthShort(d), cx, cy - 50);
  ctx.font = `400 64px ${TYPE}`;
  ctx.fillText(String(d.getDate()), cx, cy + 4);
  ctx.font = `400 44px ${TYPE}`;
  ctx.fillText(String(d.getFullYear()), cx, cy + 56);
  ctx.lineWidth = 6;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    for (let t = 0; t <= 560; t += 10) {
      const px = cx - 170 - t;
      const py = cy + k * 30 + Math.sin(t / 34) * 12;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
