/**
 * Freestyle: seeded BSP subdivision. Novel every roll, tidy every time —
 * alignment and gutters are structural, so pure-random mess is impossible.
 * Deterministic from (seed, n): same seed + same count = same geometry.
 */
export interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

const MIN_W = 560;
const MIN_H = 450;

interface Leaf extends FreeRect {
  id: number;
}

/** Split the sheet into exactly n photo boxes. Returns rects + sheet size. */
export function freestyleRects(
  n: number,
  seed: number,
  gap: number,
  pad: number,
): { rects: FreeRect[]; W: number; H: number } {
  if (n <= 0) return { rects: [], W: pad * 2, H: pad * 2 };
  const rand = mulberry32(seed);
  // Sheet area scales with n so cells stay near native resolution.
  const area = n * 1440 * 1180;
  const W0 = Math.round(Math.sqrt(area * (4 / 3)));
  const H0 = Math.round((W0 * 3) / 4);

  let nextId = 1;
  let leaves: Leaf[] = [{ id: 0, x: pad, y: pad, w: W0 - pad * 2, h: H0 - pad * 2 }];

  const canSplit = (l: Leaf, vertical: boolean, ratio: number): boolean => {
    if (vertical) {
      const w1 = Math.floor(l.w * ratio);
      return w1 >= MIN_W && l.w - w1 >= MIN_W && l.h >= MIN_H;
    }
    const h1 = Math.floor(l.h * ratio);
    return h1 >= MIN_H && l.h - h1 >= MIN_H && l.w >= MIN_W;
  };

  const doSplit = (l: Leaf, vertical: boolean, ratio: number): [Leaf, Leaf] => {
    if (vertical) {
      const w1 = Math.floor(l.w * ratio);
      return [
        { id: nextId++, x: l.x, y: l.y, w: w1, h: l.h },
        { id: nextId++, x: l.x + w1, y: l.y, w: l.w - w1, h: l.h },
      ];
    }
    const h1 = Math.floor(l.h * ratio);
    return [
      { id: nextId++, x: l.x, y: l.y, w: l.w, h: h1 },
      { id: nextId++, x: l.x, y: l.y + h1, w: l.w, h: l.h - h1 },
    ];
  };

  let guard = 0;
  while (leaves.length < n && guard++ < 500) {
    const ordered = [...leaves].sort((a, b) => b.w * b.h - a.w * a.h);
    let split = false;
    for (const leaf of ordered) {
      const longVertical = leaf.w >= leaf.h;
      const axes: boolean[] = rand() < 0.5 ? [longVertical, !longVertical] : [!longVertical, longVertical];
      for (const vertical of axes) {
        for (let t = 0; t < 6; t++) {
          const ratio = 0.36 + rand() * 0.28;
          if (canSplit(leaf, vertical, ratio)) {
            const [a, b] = doSplit(leaf, vertical, ratio);
            leaves = leaves.filter((l) => l.id !== leaf.id).concat([a, b]);
            split = true;
            break;
          }
        }
        if (split) break;
      }
      if (split) break;
    }
    if (!split) {
      // Cramped (shouldn't happen at our areas): force-split the largest leaf.
      const leaf = ordered[0];
      const vertical = leaf.w >= leaf.h;
      const [a, b] = doSplit(leaf, vertical, 0.5);
      leaves = leaves.filter((l) => l.id !== leaf.id).concat([a, b]);
    }
  }

  // Reading order (stable) + carve gutters.
  const half = gap / 2;
  const rects = leaves
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, n)
    .map((l) => ({ x: l.x + half, y: l.y + half, w: l.w - gap, h: l.h - gap }));
  return { rects, W: W0, H: H0 };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffff);
}

export function seedLabel(seed: number): string {
  return seed.toString(16).padStart(6, '0').slice(-6);
}
