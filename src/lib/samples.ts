/**
 * Four little painted scenes standing in for photos in the theme picker
 * before any are added: beach, park, party, city at dusk.
 */
let cache: Promise<ImageBitmap[]> | null = null;

export function sampleBitmaps(): Promise<ImageBitmap[]> {
  cache ??= Promise.all([beach, park, party, dusk].map(scene));
  return cache;
}

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** One scene drawn `scale` times larger (3 = native 1440×1080), mirrored if asked. Stand-in photos for scripts/about-shots.mjs. */
export function sampleCanvas(i: number, scale: number, mirror = false): HTMLCanvasElement {
  const scenes = [beach, park, party, dusk];
  const c = document.createElement('canvas');
  c.width = 480 * scale;
  c.height = 360 * scale;
  const ctx = c.getContext('2d')!;
  if (mirror) ctx.setTransform(-scale, 0, 0, scale, c.width, 0);
  else ctx.scale(scale, scale);
  scenes[i % scenes.length](ctx, 480, 360);
  return c;
}

function scene(paint: Painter): Promise<ImageBitmap> {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 360;
  const ctx = c.getContext('2d')!;
  paint(ctx, c.width, c.height);
  return createImageBitmap(c);
}

function vgrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, a: string, b: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

const beach: Painter = (ctx, w, h) => {
  ctx.fillStyle = vgrad(ctx, 0, h * 0.55, '#6fb6ec', '#cfe9f7');
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(w * 0.75, h * 0.22, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = vgrad(ctx, h * 0.52, h * 0.72, '#2f86c4', '#5fb3d9');
  ctx.fillRect(0, h * 0.52, w, h * 0.2);
  ctx.fillStyle = vgrad(ctx, h * 0.7, h, '#f2d9a6', '#e3c085');
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
  ctx.fillStyle = '#ef4130';
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.86);
  ctx.lineTo(w * 0.36, h * 0.62);
  ctx.lineTo(w * 0.5, h * 0.86);
  ctx.fill();
};

const park: Painter = (ctx, w, h) => {
  ctx.fillStyle = vgrad(ctx, 0, h * 0.6, '#9fd3f5', '#e6f5fb');
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#7cc26a';
  ctx.beginPath();
  ctx.ellipse(w * 0.3, h * 1.05, w * 0.6, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5aa94f';
  ctx.beginPath();
  ctx.ellipse(w * 0.85, h * 1.1, w * 0.55, h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4a2e';
  ctx.fillRect(w * 0.64, h * 0.38, 14, h * 0.3);
  ctx.fillStyle = '#3f8f45';
  ctx.beginPath();
  ctx.arc(w * 0.65, h * 0.34, 62, 0, Math.PI * 2);
  ctx.fill();
};

const party: Painter = (ctx, w, h) => {
  ctx.fillStyle = vgrad(ctx, 0, h, '#2a1846', '#120b20');
  ctx.fillRect(0, 0, w, h);
  const colors = ['#ff5ad9', '#ffd93d', '#4fb8ff', '#ff8f3d'];
  for (let i = 0; i < 22; i++) {
    const x = ((i * 97) % w) + 10;
    const y = ((i * 61) % (h * 0.7)) + 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30);
    g.addColorStop(0, colors[i % 4]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 30, y - 30, 60, 60);
  }
  ctx.fillStyle = '#fbe3ec';
  ctx.fillRect(w * 0.32, h * 0.62, w * 0.36, h * 0.24);
  ctx.fillStyle = '#ff5c9d';
  ctx.fillRect(w * 0.32, h * 0.62, w * 0.36, 16);
  ctx.fillStyle = '#ffd93d';
  for (let k = 0; k < 3; k++) ctx.fillRect(w * (0.4 + k * 0.1), h * 0.5, 7, h * 0.12);
};

const dusk: Painter = (ctx, w, h) => {
  ctx.fillStyle = vgrad(ctx, 0, h, '#f6a15c', '#c2508a');
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffe0a3';
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.55, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b2340';
  let x = 0;
  for (let k = 0; x < w; k++) {
    const bw = 30 + ((k * 37) % 40);
    const bh = 60 + ((k * 53) % 110);
    ctx.fillRect(x, h - bh, bw, bh);
    x += bw + 4;
  }
};
