/** Deterministic little tilt per index, so prints look scattered but never jump around. */
export function tiltFor(i: number, max = 3.5): number {
  const x = Math.sin(i * 91.7 + 12.3) * 10_000;
  return ((x - Math.floor(x)) * 2 - 1) * max;
}
