/** Auto-grid: smallest near-square that fits n. Zero thinking for the user. */
export interface Grid {
  cols: number;
  rows: number;
}

export function autoGrid(n: number): Grid {
  if (n <= 0) return { cols: 0, rows: 0 };
  if (n === 1) return { cols: 1, rows: 1 };
  if (n === 2) return { cols: 2, rows: 1 };
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

/** Native Charmera cell — never crop, never upscale. */
export const CELL_W = 1440;
export const CELL_H = 1080;
