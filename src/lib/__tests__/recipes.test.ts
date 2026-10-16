import { describe, expect, it } from 'vitest';
import { RECIPES, placeRecipe, recipesFor } from '../recipes';

describe('recipes', () => {
  it('every recipe has rows that add up to its photo count', () => {
    for (const r of RECIPES) expect(r.rows.reduce((a, b) => a + b, 0), r.id).toBe(r.n);
  });

  it('ids are unique', () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });

  it('offers at least one arrangement for 1 to 12 photos, none outside that', () => {
    for (let n = 1; n <= 12; n++) expect(recipesFor(n).length, `n=${n}`).toBeGreaterThan(0);
    expect(recipesFor(0)).toEqual([]);
    expect(recipesFor(13)).toEqual([]);
  });
});

describe('placeRecipe', () => {
  const W = 100;
  const H = 80;
  const gap = 10;
  const pad = 20;

  it('places every card inside the padded sheet without overlap', () => {
    for (const r of RECIPES) {
      for (const align of ['centered', 'contact'] as const) {
        const s = placeRecipe(r, r.n, gap, pad, W, H, align, 0, 1);
        expect(s.positions).toHaveLength(r.n);
        for (const p of s.positions) {
          expect(p.x).toBeGreaterThanOrEqual(pad);
          expect(p.y).toBeGreaterThanOrEqual(pad);
          expect(p.x + W).toBeLessThanOrEqual(s.W - pad + 1e-9);
          expect(p.y + H).toBeLessThanOrEqual(s.H - pad + 1e-9);
        }
        for (let i = 0; i < s.positions.length; i++) {
          for (let j = i + 1; j < s.positions.length; j++) {
            const a = s.positions[i];
            const b = s.positions[j];
            const apart = a.x + W <= b.x || b.x + W <= a.x || a.y + H <= b.y || b.y + H <= a.y;
            expect(apart, `${r.id} cards ${i},${j}`).toBe(true);
          }
        }
      }
    }
  });

  it('sizes the sheet to the widest row and the row count', () => {
    const r = RECIPES.find((x) => x.id === 'five-dice')!; // rows [2,1,2]
    const s = placeRecipe(r, 5, gap, pad, W, H, 'centered', 0, 1);
    expect(s.W).toBe(2 * W + gap + 2 * pad);
    expect(s.H).toBe(3 * H + 2 * gap + 2 * pad);
  });

  it('centers a short row, or starts it at the left edge for a contact sheet', () => {
    const r = RECIPES.find((x) => x.id === 'three-over-two')!; // rows [3,2]
    const centered = placeRecipe(r, 5, gap, pad, W, H, 'centered', 0, 1);
    const contact = placeRecipe(r, 5, gap, pad, W, H, 'contact', 0, 1);
    expect(centered.positions[3].x).toBe(pad + (W + gap) / 2);
    expect(contact.positions[3].x).toBe(pad);
  });

  it('labels the variant only when there is a choice, wrapping the index', () => {
    const r = recipesFor(5)[0];
    expect(placeRecipe(r, 5, gap, pad, W, H, 'centered', 0, 1).label).toBe(r.name);
    expect(placeRecipe(r, 5, gap, pad, W, H, 'centered', 4, 3).label).toBe(`${r.name} (2 of 3)`);
  });
});
