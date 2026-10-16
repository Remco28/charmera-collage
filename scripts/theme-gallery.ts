import '@fontsource/permanent-marker';
import '@fontsource/special-elite';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource-variable/caveat';
import '@fontsource-variable/bricolage-grotesque';
import { cardBox } from '../src/lib/card';
import { exifDate } from '../src/lib/exif';
import { loadSheetFonts } from '../src/lib/fonts';
import { placeRecipe, recipesFor } from '../src/lib/recipes';
import { drawSheet } from '../src/lib/render';
import { THEME_LIST } from '../src/lib/themes';
import type { PhotoSlot } from '../src/lib/types';

const params = new URLSearchParams(location.search);
const only = params.get('only')?.split(',');
const n = Number(params.get('n') ?? 6);
document.documentElement.style.setProperty('--cols', params.get('cols') ?? '4');
const CAPTIONS = ['beach day!', '', 'grandma’s porch', '', 'tiny flowers', 'sunday'];

document.querySelector('input')!.addEventListener('change', async (e) => {
  const files = Array.from((e.target as HTMLInputElement).files ?? []).slice(0, n);
  await loadSheetFonts();
  const slots: PhotoSlot[] = await Promise.all(
    files.map(async (file, i) => ({
      id: String(i), file, url: '', hash: String(i),
      bitmap: await createImageBitmap(file),
      caption: CAPTIONS[i % CAPTIONS.length],
      taken: exifDate(await file.arrayBuffer()) ?? new Date(file.lastModified),
    })),
  );
  const grid = document.querySelector('#grid')!;
  const recipe = recipesFor(slots.length)[0];
  for (const theme of THEME_LIST) {
    if (only && !only.some((o) => theme.id.startsWith(o))) continue;
    const { w, h } = cardBox(theme, true);
    const sheet = placeRecipe(recipe, slots.length, theme.gap, theme.pad, w, h, 'centered', 0, 1, theme.rowGap);
    const canvas = document.createElement('canvas');
    drawSheet(canvas, slots, theme, sheet, 900 / sheet.W);
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.innerHTML = `${theme.conceptName} <span>· ${theme.name} · ${theme.id}</span>`;
    fig.append(canvas, cap);
    grid.append(fig);
  }
  document.body.dataset.ready = '1';
});
