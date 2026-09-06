import type { MosaicTemplate } from './types';

/**
 * Curated mosaic library. 12-column grid, slots authored in reading order.
 * Every template tiles EXACTLY n photos — no placeholders, ever.
 * Tray order maps to slots in order, so drag-to-reorder is art direction.
 */
export const TEMPLATES: MosaicTemplate[] = [
  { id: 'center-stage', name: 'Center Stage', n: 1, slots: [{ c: 2, r: 0, cs: 8, rs: 6 }] },

  { id: 'side-by-side', name: 'Side by Side', n: 2, slots: [{ c: 0, r: 0, cs: 6, rs: 6 }, { c: 6, r: 0, cs: 6, rs: 6 }] },
  { id: 'letterbox', name: 'Letterbox', n: 2, slots: [{ c: 0, r: 0, cs: 12, rs: 3 }, { c: 0, r: 3, cs: 12, rs: 3 }] },

  {
    id: 'triptych', name: 'Triptych', n: 3,
    slots: [{ c: 0, r: 0, cs: 4, rs: 5 }, { c: 4, r: 0, cs: 4, rs: 5 }, { c: 8, r: 0, cs: 4, rs: 5 }],
  },
  {
    id: 'hero-two', name: 'Hero + Two', n: 3,
    slots: [{ c: 0, r: 0, cs: 8, rs: 6 }, { c: 8, r: 0, cs: 4, rs: 3 }, { c: 8, r: 3, cs: 4, rs: 3 }],
  },

  {
    id: 'four-square', name: 'Four Square', n: 4,
    slots: [
      { c: 0, r: 0, cs: 6, rs: 6 }, { c: 6, r: 0, cs: 6, rs: 6 },
      { c: 0, r: 6, cs: 6, rs: 6 }, { c: 6, r: 6, cs: 6, rs: 6 },
    ],
  },
  {
    id: 'contact-row', name: 'Contact Row', n: 4,
    slots: [
      { c: 0, r: 0, cs: 3, rs: 4 }, { c: 3, r: 0, cs: 3, rs: 4 },
      { c: 6, r: 0, cs: 3, rs: 4 }, { c: 9, r: 0, cs: 3, rs: 4 },
    ],
  },

  {
    id: 'five-dice', name: 'Five-Dice', n: 5,
    slots: [
      { c: 0, r: 0, cs: 4, rs: 3 }, { c: 8, r: 0, cs: 4, rs: 3 }, { c: 4, r: 2, cs: 4, rs: 2 },
      { c: 0, r: 3, cs: 4, rs: 3 }, { c: 8, r: 3, cs: 4, rs: 3 },
    ],
  },
  {
    id: 'gallery-wall', name: 'Gallery Wall', n: 5,
    slots: [
      { c: 0, r: 0, cs: 8, rs: 8 },
      { c: 8, r: 0, cs: 4, rs: 2 }, { c: 8, r: 2, cs: 4, rs: 2 },
      { c: 8, r: 4, cs: 4, rs: 2 }, { c: 8, r: 6, cs: 4, rs: 2 },
    ],
  },
  {
    id: 'three-over-two', name: 'Three Over Two', n: 5,
    slots: [
      { c: 0, r: 0, cs: 4, rs: 4 }, { c: 4, r: 0, cs: 4, rs: 4 }, { c: 8, r: 0, cs: 4, rs: 4 },
      { c: 0, r: 4, cs: 6, rs: 4 }, { c: 6, r: 4, cs: 6, rs: 4 },
    ],
  },

  {
    id: 'six-dice', name: 'Six-Dice', n: 6,
    slots: [
      { c: 0, r: 0, cs: 6, rs: 2 }, { c: 6, r: 0, cs: 6, rs: 2 },
      { c: 0, r: 2, cs: 6, rs: 2 }, { c: 6, r: 2, cs: 6, rs: 2 },
      { c: 0, r: 4, cs: 6, rs: 2 }, { c: 6, r: 4, cs: 6, rs: 2 },
    ],
  },
  {
    id: 'six-pack', name: 'Six Pack', n: 6,
    slots: [
      { c: 0, r: 0, cs: 4, rs: 4 }, { c: 4, r: 0, cs: 4, rs: 4 }, { c: 8, r: 0, cs: 4, rs: 4 },
      { c: 0, r: 4, cs: 4, rs: 4 }, { c: 4, r: 4, cs: 4, rs: 4 }, { c: 8, r: 4, cs: 4, rs: 4 },
    ],
  },

  {
    id: 'front-page', name: 'Front Page', n: 7,
    slots: [
      { c: 0, r: 0, cs: 8, rs: 6 }, { c: 8, r: 0, cs: 4, rs: 3 }, { c: 8, r: 3, cs: 4, rs: 3 },
      { c: 0, r: 6, cs: 3, rs: 3 }, { c: 3, r: 6, cs: 3, rs: 3 },
      { c: 6, r: 6, cs: 3, rs: 3 }, { c: 9, r: 6, cs: 3, rs: 3 },
    ],
  },
  {
    id: 'lucky-seven', name: 'Lucky Seven', n: 7,
    slots: [
      { c: 0, r: 0, cs: 6, rs: 3 }, { c: 6, r: 0, cs: 6, rs: 3 },
      { c: 0, r: 3, cs: 4, rs: 3 }, { c: 4, r: 3, cs: 4, rs: 3 }, { c: 8, r: 3, cs: 4, rs: 3 },
      { c: 0, r: 6, cs: 6, rs: 3 }, { c: 6, r: 6, cs: 6, rs: 3 },
    ],
  },

  {
    id: 'big-sky', name: 'Big Sky', n: 8,
    slots: [
      { c: 0, r: 0, cs: 12, rs: 4 },
      { c: 0, r: 4, cs: 4, rs: 3 }, { c: 4, r: 4, cs: 4, rs: 3 }, { c: 8, r: 4, cs: 4, rs: 3 },
      { c: 0, r: 7, cs: 3, rs: 3 }, { c: 3, r: 7, cs: 3, rs: 3 },
      { c: 6, r: 7, cs: 3, rs: 3 }, { c: 9, r: 7, cs: 3, rs: 3 },
    ],
  },
  {
    id: 'double-row', name: 'Double Row', n: 8,
    slots: [
      { c: 0, r: 0, cs: 3, rs: 3 }, { c: 3, r: 0, cs: 3, rs: 3 },
      { c: 6, r: 0, cs: 3, rs: 3 }, { c: 9, r: 0, cs: 3, rs: 3 },
      { c: 0, r: 3, cs: 3, rs: 3 }, { c: 3, r: 3, cs: 3, rs: 3 },
      { c: 6, r: 3, cs: 3, rs: 3 }, { c: 9, r: 3, cs: 3, rs: 3 },
    ],
  },

  {
    id: 'classic-nine', name: 'Classic Nine', n: 9,
    slots: [
      { c: 0, r: 0, cs: 4, rs: 4 }, { c: 4, r: 0, cs: 4, rs: 4 }, { c: 8, r: 0, cs: 4, rs: 4 },
      { c: 0, r: 4, cs: 4, rs: 4 }, { c: 4, r: 4, cs: 4, rs: 4 }, { c: 8, r: 4, cs: 4, rs: 4 },
      { c: 0, r: 8, cs: 4, rs: 4 }, { c: 4, r: 8, cs: 4, rs: 4 }, { c: 8, r: 8, cs: 4, rs: 4 },
    ],
  },
  {
    id: 'centerpiece', name: 'Centerpiece', n: 9,
    slots: [
      { c: 0, r: 0, cs: 4, rs: 2 }, { c: 4, r: 0, cs: 4, rs: 2 }, { c: 8, r: 0, cs: 4, rs: 2 },
      { c: 0, r: 2, cs: 4, rs: 4 }, { c: 4, r: 2, cs: 4, rs: 4 }, { c: 8, r: 2, cs: 4, rs: 4 },
      { c: 0, r: 6, cs: 4, rs: 2 }, { c: 4, r: 6, cs: 4, rs: 2 }, { c: 8, r: 6, cs: 4, rs: 2 },
    ],
  },

  {
    id: 'decade', name: 'Decade', n: 10,
    slots: [
      { c: 0, r: 0, cs: 4, rs: 4 }, { c: 4, r: 0, cs: 4, rs: 4 }, { c: 8, r: 0, cs: 4, rs: 4 },
      { c: 0, r: 4, cs: 3, rs: 3 }, { c: 3, r: 4, cs: 3, rs: 3 },
      { c: 6, r: 4, cs: 3, rs: 3 }, { c: 9, r: 4, cs: 3, rs: 3 },
      { c: 0, r: 7, cs: 4, rs: 4 }, { c: 4, r: 7, cs: 4, rs: 4 }, { c: 8, r: 7, cs: 4, rs: 4 },
    ],
  },
  {
    id: 'top-ten', name: 'Top Ten', n: 10,
    slots: [
      { c: 0, r: 0, cs: 12, rs: 4 },
      { c: 0, r: 4, cs: 4, rs: 3 }, { c: 4, r: 4, cs: 4, rs: 3 }, { c: 8, r: 4, cs: 4, rs: 3 },
      { c: 0, r: 7, cs: 4, rs: 3 }, { c: 4, r: 7, cs: 4, rs: 3 }, { c: 8, r: 7, cs: 4, rs: 3 },
      { c: 0, r: 10, cs: 4, rs: 3 }, { c: 4, r: 10, cs: 4, rs: 3 }, { c: 8, r: 10, cs: 4, rs: 3 },
    ],
  },

  {
    id: 'eleven', name: 'Eleven', n: 11,
    slots: [
      { c: 0, r: 0, cs: 12, rs: 4 },
      { c: 0, r: 4, cs: 4, rs: 4 }, { c: 4, r: 4, cs: 4, rs: 4 }, { c: 8, r: 4, cs: 4, rs: 4 },
      { c: 0, r: 8, cs: 3, rs: 3 }, { c: 3, r: 8, cs: 3, rs: 3 },
      { c: 6, r: 8, cs: 3, rs: 3 }, { c: 9, r: 8, cs: 3, rs: 3 },
      { c: 0, r: 11, cs: 4, rs: 4 }, { c: 4, r: 11, cs: 4, rs: 4 }, { c: 8, r: 11, cs: 4, rs: 4 },
    ],
  },
  {
    id: 'short-row', name: 'Short Row', n: 11,
    slots: [
      { c: 0, r: 0, cs: 3, rs: 3 }, { c: 3, r: 0, cs: 3, rs: 3 },
      { c: 6, r: 0, cs: 3, rs: 3 }, { c: 9, r: 0, cs: 3, rs: 3 },
      { c: 0, r: 3, cs: 3, rs: 3 }, { c: 3, r: 3, cs: 3, rs: 3 },
      { c: 6, r: 3, cs: 3, rs: 3 }, { c: 9, r: 3, cs: 3, rs: 3 },
      { c: 0, r: 6, cs: 3, rs: 3 }, { c: 3, r: 6, cs: 3, rs: 3 }, { c: 6, r: 6, cs: 3, rs: 3 },
    ],
  },

  {
    id: 'dozen', name: 'Dozen', n: 12,
    slots: [
      { c: 0, r: 0, cs: 3, rs: 3 }, { c: 3, r: 0, cs: 3, rs: 3 },
      { c: 6, r: 0, cs: 3, rs: 3 }, { c: 9, r: 0, cs: 3, rs: 3 },
      { c: 0, r: 3, cs: 3, rs: 3 }, { c: 3, r: 3, cs: 3, rs: 3 },
      { c: 6, r: 3, cs: 3, rs: 3 }, { c: 9, r: 3, cs: 3, rs: 3 },
      { c: 0, r: 6, cs: 3, rs: 3 }, { c: 3, r: 6, cs: 3, rs: 3 },
      { c: 6, r: 6, cs: 3, rs: 3 }, { c: 9, r: 6, cs: 3, rs: 3 },
    ],
  },
  {
    id: 'egg-carton', name: 'Egg Carton', n: 12,
    slots: [
      { c: 0, r: 0, cs: 4, rs: 3 }, { c: 4, r: 0, cs: 4, rs: 3 }, { c: 8, r: 0, cs: 4, rs: 3 },
      { c: 0, r: 3, cs: 4, rs: 3 }, { c: 4, r: 3, cs: 4, rs: 3 }, { c: 8, r: 3, cs: 4, rs: 3 },
      { c: 0, r: 6, cs: 4, rs: 3 }, { c: 4, r: 6, cs: 4, rs: 3 }, { c: 8, r: 6, cs: 4, rs: 3 },
      { c: 0, r: 9, cs: 4, rs: 3 }, { c: 4, r: 9, cs: 4, rs: 3 }, { c: 8, r: 9, cs: 4, rs: 3 },
    ],
  },
];

/** All curated variants for exactly n photos (empty if n out of 1..12). */
export function layoutsFor(n: number): MosaicTemplate[] {
  return TEMPLATES.filter((t) => t.n === n);
}
