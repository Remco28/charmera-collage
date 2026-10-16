import type { Theme } from '../types';
import { mulberry32, roundRect, seedOf, shade } from './util';
import type { Ctx } from './util';

/**
 * The thing the cards sit on. Marks are sized for a sheet seen whole
 * (a few thousand px wide) and seeded, so preview and export match.
 */
export function paintSurface(ctx: Ctx, theme: Theme, W: number, H: number) {
  const p = theme.palette;
  const [c0, c1 = c0] = p.surface;
  const rand = mulberry32(seedOf(theme.id));
  const area = W * H;

  const diagonal = () => {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  const blobs = (count: number, rMin: number, rMax: number, color: (i: number) => string) => {
    for (let i = 0; i < count; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const r = rMin + rand() * (rMax - rMin);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color(i));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };

  ctx.save();
  switch (theme.surface) {
    case 'solid': {
      // Exactly the color that was picked, no texture.
      ctx.fillStyle = c0;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'paper': {
      diagonal();
      // faint paper fiber
      ctx.lineWidth = 2;
      ctx.strokeStyle = isDarkish(c0) ? 'rgba(255,255,255,0.025)' : 'rgba(80,60,40,0.035)';
      ctx.beginPath();
      for (let i = 0; i < area / 9000; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const a = rand() * Math.PI;
        const l = 8 + rand() * 22;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      ctx.stroke();
      break;
    }
    case 'safelight': {
      ctx.fillStyle = c0;
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W * 0.5, -H * 0.15, 0, W * 0.5, -H * 0.15, Math.max(W, H) * 1.05);
      g.addColorStop(0, c1);
      g.addColorStop(0.55, shade(c1, -0.55));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'wood': {
      // A finished tabletop: wide boards of fine, flowing grain with the odd
      // cathedral figure, tight seams, warm light across the varnish, and a
      // mug ring or two from whoever was here before.
      const board = 520;
      for (let y = 0, k = 0; y < H; y += board, k++) {
        // boards from the same tree: small shifts in tone, not stripes
        const tone = shade(c0, (rand() - 0.5) * 0.09 - (k % 2) * 0.03);
        const g = ctx.createLinearGradient(0, y, 0, y + board);
        g.addColorStop(0, shade(tone, 0.04));
        g.addColorStop(0.5, tone);
        g.addColorStop(1, shade(tone, -0.05));
        ctx.fillStyle = g;
        ctx.fillRect(0, y, W, board);

        // long grain: many fine lines, each a slow double wave
        for (let j = 0; j < 70; j++) {
          const dark = rand() < 0.8;
          ctx.strokeStyle = dark ? `rgba(70,35,12,${0.04 + rand() * 0.09})` : `rgba(255,228,190,${0.04 + rand() * 0.06})`;
          ctx.lineWidth = 1.5 + rand() * 3.5;
          const gy = y + rand() * board;
          const a1 = 4 + rand() * 14;
          const p1 = 900 + rand() * 1400;
          const a2 = 2 + rand() * 5;
          const p2 = 160 + rand() * 260;
          const ph = rand() * 10;
          ctx.beginPath();
          for (let x = -40; x <= W + 40; x += 30) {
            const yy = gy + Math.sin(x / p1 + ph) * a1 + Math.sin(x / p2 + ph * 2) * a2;
            if (x === -40) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }

        // cathedral figure: nested arches where the saw cut across a growth ring
        if (rand() < 0.75) {
          const fx = rand() * W;
          const fy = y + board * (0.55 + rand() * 0.3);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, y, W, board);
          ctx.clip();
          for (let r = 1; r <= 9; r++) {
            ctx.strokeStyle = `rgba(80,40,14,${0.05 + (r % 3 === 0 ? 0.07 : 0.03)})`;
            ctx.lineWidth = 2 + (r % 3 === 0 ? 2.5 : 0);
            ctx.beginPath();
            ctx.ellipse(fx, fy, 160 + r * 120, 22 + r * 26, 0, Math.PI, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        // seam: a dark hairline with a lit bevel under it
        ctx.fillStyle = 'rgba(45,22,8,0.5)';
        ctx.fillRect(0, y + board - 3, W, 3);
        ctx.fillStyle = 'rgba(255,230,195,0.14)';
        ctx.fillRect(0, y + board, W, 2);
      }

      // mug rings, under the photos, never quite closed
      const rings = area > 2e7 ? 2 : 1;
      for (let m = 0; m < rings; m++) {
        const mx = W * (0.15 + rand() * 0.7);
        const my = H * (0.15 + rand() * 0.7);
        const r = 300 + rand() * 40;
        const gap = rand() * Math.PI * 2;
        ctx.fillStyle = 'rgba(70,35,10,0.035)';
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        for (let pass = 0; pass < 3; pass++) {
          ctx.strokeStyle = `rgba(70,35,10,${0.1 + pass * 0.04})`;
          ctx.lineWidth = 10 - pass * 3;
          ctx.beginPath();
          ctx.arc(mx + pass * 3, my - pass * 2, r - pass * 4, gap + 0.3 + pass * 0.2, gap + Math.PI * 2 - 0.25);
          ctx.stroke();
        }
      }

      // warm light across the varnish, falling off toward the far edges
      const lx = W * 0.3;
      const ly = H * 0.2;
      const light = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.9);
      light.addColorStop(0, 'rgba(255,236,200,0.22)');
      light.addColorStop(0.5, 'rgba(255,236,200,0.04)');
      light.addColorStop(1, 'rgba(40,18,6,0.28)');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'formica': {
      diagonal();
      const flecks = ['rgba(255,255,255,0.55)', 'rgba(40,90,80,0.22)', 'rgba(228,106,90,0.35)', 'rgba(255,255,255,0.3)'];
      for (let i = 0; i < area / 7000; i++) {
        ctx.fillStyle = flecks[i % flecks.length];
        ctx.beginPath();
        ctx.ellipse(rand() * W, rand() * H, 2 + rand() * 5, 1.5 + rand() * 3, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      // a few mid-century boomerangs
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      for (let i = 0; i < area / 900_000; i++) {
        ctx.strokeStyle = i % 2 ? 'rgba(228,106,90,0.3)' : 'rgba(40,90,80,0.18)';
        const x = rand() * W;
        const y = rand() * H;
        const a = rand() * Math.PI * 2;
        const s = 50 + rand() * 40;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
        ctx.quadraticCurveTo(x, y, x + Math.cos(a + 1.9) * s, y + Math.sin(a + 1.9) * s);
        ctx.stroke();
      }
      break;
    }
    case 'sky': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // soft clouds from overlapping puffs
      for (let i = 0; i < Math.max(4, area / 2_500_000); i++) {
        const cx = rand() * W;
        const cy = rand() * H * 0.85;
        const s = 160 + rand() * 220;
        for (let k = 0; k < 6; k++) {
          const x = cx + (rand() - 0.5) * s * 2.4;
          const y = cy + (rand() - 0.5) * s * 0.5;
          const r = s * (0.6 + rand() * 0.6);
          const pg = ctx.createRadialGradient(x, y, 0, x, y, r);
          pg.addColorStop(0, 'rgba(255,255,255,0.55)');
          pg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = pg;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }
      break;
    }
    case 'kraft': {
      diagonal();
      blobs(Math.max(20, area / 400_000), 200, 600, (i) => (i % 2 ? 'rgba(90,60,30,0.08)' : 'rgba(255,240,210,0.08)'));
      ctx.lineWidth = 2;
      for (let i = 0; i < area / 3500; i++) {
        ctx.strokeStyle = i % 3 ? 'rgba(80,52,25,0.16)' : 'rgba(255,240,215,0.2)';
        const x = rand() * W;
        const y = rand() * H;
        const a = rand() * Math.PI;
        const l = 6 + rand() * 18;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
      break;
    }
    case 'graph': {
      diagonal();
      ctx.strokeStyle = 'rgba(70,130,200,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y < H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(70,130,200,0.34)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < W; x += 300) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y < H; y += 300) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      break;
    }
    case 'album': {
      diagonal();
      for (let i = 0; i < area / 2500; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.2)';
        ctx.fillRect(rand() * W, rand() * H, 2, 2);
      }
      break;
    }
    case 'sprinkles': {
      diagonal();
      const colors = ['#ff5c9d', '#ffd93d', '#4fb8ff', '#6fdc9a', '#b38cff', '#ff8f3d', '#ffffff'];
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      for (let i = 0; i < area / 60_000; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const a = rand() * Math.PI;
        const l = 16 + rand() * 18;
        ctx.strokeStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
      break;
    }
    case 'stars': {
      diagonal();
      for (let i = 0; i < area / 50_000; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const s = 6 + rand() * 18;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.5})`;
        // four-point sparkle
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.quadraticCurveTo(x, y, x + s, y);
        ctx.quadraticCurveTo(x, y, x, y + s);
        ctx.quadraticCurveTo(x, y, x - s, y);
        ctx.quadraticCurveTo(x, y, x, y - s);
        ctx.fill();
      }
      break;
    }
    case 'halftone': {
      diagonal();
      ctx.fillStyle = 'rgba(239,65,48,0.16)';
      const step = 54;
      for (let y = 0, r = 0; y < H + step; y += step, r++) {
        for (let x = (r % 2) * (step / 2); x < W + step; x += step) {
          const t = 0.5 + 0.5 * Math.sin(x * 0.0016 + y * 0.0011);
          ctx.beginPath();
          ctx.arc(x, y, 3 + 13 * t, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'lightbox': {
      ctx.fillStyle = theme.palette.detail;
      ctx.fillRect(0, 0, W, H);
      const inset = 46;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,110,140,0.06)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = inset + 240; x < W - inset; x += 240) { ctx.moveTo(x, inset); ctx.lineTo(x, H - inset); }
      for (let y = inset + 240; y < H - inset; y += 240) { ctx.moveTo(inset, y); ctx.lineTo(W - inset, y); }
      ctx.stroke();
      break;
    }
    case 'wall': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, shade(c0, 0.04));
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      blobs(Math.max(16, area / 600_000), 300, 900, (i) => (i % 2 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'));
      break;
    }
    case 'cork': {
      ctx.fillStyle = c0;
      ctx.fillRect(0, 0, W, H);
      const grains = [shade(c0, -0.28), shade(c0, 0.22), shade(c1, -0.12), shade(c0, -0.45)];
      for (let i = 0; i < area / 1800; i++) {
        ctx.fillStyle = grains[i % grains.length];
        ctx.globalAlpha = 0.35 + rand() * 0.45;
        ctx.beginPath();
        ctx.ellipse(rand() * W, rand() * H, 3 + rand() * 8, 2 + rand() * 6, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // the wooden frame around the board
      ctx.strokeStyle = theme.palette.detail;
      ctx.lineWidth = 60;
      ctx.strokeRect(30, 30, W - 60, H - 60);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 4;
      ctx.strokeRect(58, 58, W - 116, H - 116);
      break;
    }
    case 'cyan': {
      // paper, then a brushed coat of emulsion with ragged edges
      ctx.fillStyle = theme.palette.card[0];
      ctx.fillRect(0, 0, W, H);
      const m = Math.min(W, H) * 0.035;
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, c0);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(m, m, W - m * 2, H - m * 2);
      // brush strokes run along each edge with ragged ends, like a hand-coated sheet
      ctx.fillStyle = c0;
      const strokes = (W + H) / 40;
      for (let k = 0; k < strokes; k++) {
        const side = k % 4;
        const along = side < 2 ? W : H;
        const t = m + rand() * (along - 2 * m);
        const len = Math.min(120 + rand() * 420, 2 * Math.min(t - m, along - m - t) + 60);
        const depth = 6 + rand() * 34;
        const off = (rand() - 0.35) * 26;
        ctx.globalAlpha = 0.35 + rand() * 0.55;
        ctx.beginPath();
        if (side === 0) ctx.ellipse(t, m - off, len / 2, depth / 2, 0, 0, Math.PI * 2);
        if (side === 1) ctx.ellipse(t, H - m + off, len / 2, depth / 2, 0, 0, Math.PI * 2);
        if (side === 2) ctx.ellipse(m - off, t, depth / 2, len / 2, 0, 0, Math.PI * 2);
        if (side === 3) ctx.ellipse(W - m + off, t, depth / 2, len / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      blobs(Math.max(14, area / 700_000), 200, 700, (i) => (i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'));
      break;
    }
    case 'xerox': {
      ctx.fillStyle = c0;
      ctx.fillRect(0, 0, W, H);
      // toner speckle and the odd streak from the drum
      ctx.fillStyle = 'rgba(17,17,17,0.35)';
      for (let i = 0; i < area / 5000; i++) {
        const s = 1 + rand() * 3;
        ctx.fillRect(rand() * W, rand() * H, s, s);
      }
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(17,17,17,${0.015 + rand() * 0.025})`;
        ctx.fillRect(rand() * W, 0, 10 + rand() * 60, H);
      }
      break;
    }
    case 'night': {
      diagonal();
      const glow = [theme.palette.accent[0], theme.palette.detail, '#ffb347'];
      for (let i = 0; i < Math.max(14, area / 1_200_000); i++) {
        const x = rand() * W;
        const y = rand() * H;
        const r = 60 + rand() * 200;
        const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
        ctx.globalAlpha = 0.08 + rand() * 0.1;
        g.addColorStop(0, glow[i % glow.length]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'airmail': {
      ctx.fillStyle = c0;
      ctx.fillRect(0, 0, W, H);
      // the red-and-blue chevron border of an airmail envelope
      const band = 64;
      const step = 120;
      const colors = theme.palette.accent;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(band, band, W - band * 2, H - band * 2);
      ctx.clip('evenodd');
      for (let k = -H; k < W + H; k += step) {
        // red, gap, blue, gap
        const band4 = Math.round((k + H) / step) % 4;
        if (band4 === 1 || band4 === 3) continue;
        ctx.fillStyle = band4 === 0 ? colors[0] : (colors[1] ?? colors[0]);
        ctx.beginPath();
        ctx.moveTo(k, 0);
        ctx.lineTo(k + step / 2, 0);
        ctx.lineTo(k + step / 2 + H, H);
        ctx.lineTo(k + H, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

function isDarkish(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const v = parseInt(m[1], 16);
  return ((v >> 16) & 255) + ((v >> 8) & 255) + (v & 255) < 3 * 110;
}

/** Whole-sheet finishing passes. */
export function paintGrain(ctx: Ctx, theme: Theme, W: number, H: number) {
  const rand = mulberry32(seedOf(theme.id) ^ 0x9e3779b9);
  for (let i = 0; i < (W * H) / 6000; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * W, rand() * H, 3, 3);
  }
}

export function paintVignette(ctx: Ctx, W: number, H: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
