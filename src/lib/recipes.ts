/**
 * Row recipes: identical cards, varied arrangements. Every photo keeps its
 * exact native size — only positions change. Rows are centered by default,
 * or left-aligned contact-sheet style. No placeholders: rows simply end.
 */
export type RowAlign = 'centered' | 'contact';

export interface Recipe {
  id: string; // stable id, e.g. 'five-dice'
  name: string; // human name shown in UI, e.g. 'Five-Dice'
  n: number; // exact photo count (rows sum to n)
  rows: number[]; // cards per row, top to bottom
}

export const RECIPES: Recipe[] = [
  { id: 'center-stage', name: 'Center Stage', n: 1, rows: [1] },

  { id: 'side-by-side', name: 'Side by Side', n: 2, rows: [2] },
  { id: 'stacked', name: 'Stacked', n: 2, rows: [1, 1] },

  { id: 'triptych', name: 'Triptych', n: 3, rows: [3] },
  { id: 'film-strip', name: 'Film Strip', n: 3, rows: [1, 1, 1] },

  { id: 'four-square', name: 'Four Square', n: 4, rows: [2, 2] },
  { id: 'contact-row', name: 'Contact Row', n: 4, rows: [4] },
  { id: 'totem', name: 'Totem', n: 4, rows: [1, 1, 1, 1] },

  { id: 'three-over-two', name: 'Three Over Two', n: 5, rows: [3, 2] },
  { id: 'five-dice', name: 'Five-Dice', n: 5, rows: [2, 1, 2] },
  { id: 'two-over-three', name: 'Two Over Three', n: 5, rows: [2, 3] },

  { id: 'six-pack', name: 'Six Pack', n: 6, rows: [3, 3] },
  { id: 'six-dice', name: 'Six-Dice', n: 6, rows: [2, 2, 2] },
  { id: 'four-and-two', name: 'Four and Two', n: 6, rows: [4, 2] },

  { id: 'four-over-three', name: 'Four Over Three', n: 7, rows: [4, 3] },
  { id: 'lucky-seven', name: 'Lucky Seven', n: 7, rows: [3, 2, 2] },
  { id: 'diamond-seven', name: 'Diamond Seven', n: 7, rows: [2, 3, 2] },

  { id: 'eight-ragged', name: 'Eight Ragged', n: 8, rows: [3, 3, 2] },
  { id: 'double-row', name: 'Double Row', n: 8, rows: [4, 4] },
  { id: 'river', name: 'River', n: 8, rows: [2, 4, 2] },

  { id: 'classic-nine', name: 'Classic Nine', n: 9, rows: [3, 3, 3] },
  { id: 'nine-remix', name: 'Nine Remix', n: 9, rows: [4, 3, 2] },

  { id: 'ten-spot', name: 'Ten Spot', n: 10, rows: [4, 3, 3] },
  { id: 'center-four', name: 'Center Four', n: 10, rows: [3, 4, 3] },
  { id: 'double-five', name: 'Double Five', n: 10, rows: [5, 5] },

  { id: 'eleven', name: 'Eleven', n: 11, rows: [4, 4, 3] },
  { id: 'long-eleven', name: 'Long Eleven', n: 11, rows: [3, 3, 3, 2] },

  { id: 'dozen', name: 'Dozen', n: 12, rows: [4, 4, 4] },
  { id: 'egg-carton', name: 'Egg Carton', n: 12, rows: [3, 3, 3, 3] },
  { id: 'wide-six', name: 'Wide Six', n: 12, rows: [6, 3, 3] },
];

/** All recipes for exactly n photos (empty if n out of 1..12). */
export function recipesFor(n: number): Recipe[] {
  return RECIPES.filter((r) => r.n === n);
}

export interface CardPos {
  x: number;
  y: number;
}

export interface PlacedSheet {
  positions: CardPos[]; // length === n, tray order
  W: number;
  H: number;
  label: string; // e.g. 'Five-Dice (2 of 3)'
  recipe: Recipe;
}

/**
 * Position identical cards (cardW x cardFullH each) in recipe rows.
 * Ragged rows are centered, or left-aligned contact-sheet style.
 */
export function placeRecipe(
  recipe: Recipe,
  n: number,
  gap: number,
  pad: number,
  cardW: number,
  cardFullH: number,
  align: RowAlign,
  variantIdx: number,
  variantCount: number,
): PlacedSheet {
  const rowWidth = (len: number) => len * cardW + (len - 1) * gap;
  const sheetW = Math.max(...recipe.rows.map(rowWidth)) + pad * 2;
  const positions: CardPos[] = [];
  recipe.rows.forEach((len, ri) => {
    const w = rowWidth(len);
    const x0 = align === 'centered' ? pad + (sheetW - pad * 2 - w) / 2 : pad;
    const y = pad + ri * (cardFullH + gap);
    for (let k = 0; k < len && positions.length < n; k++) {
      positions.push({ x: x0 + k * (cardW + gap), y });
    }
  });
  const H = pad + recipe.rows.length * cardFullH + (recipe.rows.length - 1) * gap + pad;
  const label =
    variantCount > 1
      ? `${recipe.name} (${(variantIdx % variantCount) + 1} of ${variantCount})`
      : recipe.name;
  return { positions, W: sheetW, H, label, recipe };
}
