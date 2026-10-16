// Dev tool behind src/lib/estimate.ts: encodes sheets at preview, half, phone and full scale and prints
// bytes per sheet pixel. Run `npm run dev`, open /scripts/size-probe.html, pick 12 photos, wait for the table.
// Columns: n, theme, preview scale, phone scale, then PNG and JPG at each of those four scales.
import { cardBox } from '../src/lib/card';
import { loadSheetFonts } from '../src/lib/fonts';
import { placeRecipe, recipesFor } from '../src/lib/recipes';
import { renderSheetBlob, safeScale } from '../src/lib/render';
import { THEMES } from '../src/lib/themes';
import type { PhotoSlot } from '../src/lib/types';

const IDS = ['prints-kitchen', 'contact-darkroom', 'gallery-white', 'float-paper', 'stickers-party', 'zine-xerox', 'cyanotype-cyan', 'corkboard-cork', 'instant-classic'];
document.querySelector('input')!.addEventListener('change', async (e) => {
  const files = Array.from((e.target as HTMLInputElement).files ?? []);
  await loadSheetFonts();
  const all: PhotoSlot[] = await Promise.all(files.map(async (file, i) => ({
    id: String(i), file, url: '', hash: String(i), bitmap: await createImageBitmap(file), caption: i % 3 ? '' : 'beach day', taken: new Date(),
  })));
  const rows: string[] = [];
  for (const n of [1, 4, 7, 12]) {
    const slots = all.slice(0, n);
    for (const id of IDS) {
      const theme = THEMES[id];
      const { w, h } = cardBox(theme, true);
      const sheet = placeRecipe(recipesFor(n)[0], n, theme.gap, theme.pad, w, h, 'centered', 0, 1, theme.rowGap);
      const prev = Math.min(1, 1800 / Math.max(sheet.W, sheet.H));
      const sizes: number[] = [];
      for (const kind of ['png', 'jpeg'] as const) {
        for (const s of [prev, 0.5, safeScale(sheet.W, sheet.H), 1]) {
          const r = await renderSheetBlob(slots, theme, sheet, kind, s);
          sizes.push(r ? r.blob.size / (sheet.W * sheet.H * s * s) : -1);
        }
      }
      rows.push([n, id, prev.toFixed(3), safeScale(sheet.W, sheet.H).toFixed(3), ...sizes.map((v) => v.toFixed(3))].join('\t'));
      document.querySelector('#out')!.textContent = rows.join('\n');
    }
  }
  document.body.dataset.ready = '1';
});
