# charmera collage

Turn a roll of [Kodak Charmera](https://www.kodak.com/) keychain-camera shots into one themed collage sheet, right in the browser. Live at **https://charmera.teamremco.org**.

A fan-made companion; not affiliated with Kodak. Photos never leave the browser, and there is no backend.

## What it does

- Drop up to 12 photos anywhere on the page (or tap to browse). Exact duplicates are set aside, with an "Add anyway". The 12-photo cap holds however photos arrive, and Clear all also cancels a batch that is still loading.
- Every photo is the same size card at native Charmera resolution (1440×1080). No cropping, no resizing, no empty cells.
- Row recipes give 1–3 arrangements per photo count ("Shuffle layout"), centered or contact-sheet aligned.
- 14 theme concepts in 31 colorways, plus Mix Your Own. Each concept is a real photo object with its own card construction: contact sheet, one-hour prints (with a date stamp from the photo's EXIF), instant, clothesline, scrapbook, stickers, slide lightbox, gallery wall, corkboard, sun print, photocopy zine, night flash, stamp album, frameless. All drawn procedurally; sheet fonts are self-hosted.
- **Mix Your Own**: one plain-print theme where you pick the exact background, border and caption colors (chips pulled from your photos, neutrals, or any color), the border width, and straight or tossed prints.
- Reorder by dragging a photo on the sheet preview or a row in the photo list, with mouse or touch (press and hold on a phone). Arrow keys move a focused row.
- Photos are drawn at native size inside each concept's border; the card grows, the photo doesn't shrink.
- Captions, written per photo, appear in the concept's own hand (marker, ballpoint, typewriter, gallery label...). Plain-surface themes can tint their background from the photos.
- Export as PNG or JPG; each choice shows an estimated file size (from encoding the preview, within about 15%). Sheets over 16.7 MP (about 9+ photos) also offer **Phone size**, because iPhone and iPad Safari can't create larger images. If a full-size export fails there, it falls back to phone size on its own.
- Look settings (theme, your Mix Your Own colors, background, file type, size, camera body color) are remembered in this browser. Photos are not.

## Code map

| Path | What |
| --- | --- |
| `src/App.tsx` | State, file intake, page layout, export |
| `src/components/` | Dropzone, photo tray, theme picker, Mix Your Own editor, camera illustration, shared controls |
| `src/lib/recipes.ts` | Row recipes and card placement |
| `src/lib/render.ts` | Sheet drawing (scaled preview, offscreen export, iOS size limit) |
| `src/lib/themes.ts` | Concepts and colorways, Mix Your Own, legacy theme-id map |
| `src/lib/types.ts` | Theme, palette and photo types |
| `src/lib/paint/surfaces.ts` | What the cards sit on (wood, cork, lightbox, wall...) |
| `src/lib/paint/cards.ts` | One painter per card kind (film, instant, stamp...) |
| `src/lib/press.ts` | Press-and-drag for mouse and touch (reordering) |
| `src/lib/estimate.ts` | Export file-size estimate |
| `src/lib/roll.ts` | The 12-photo cap, shared by every way of adding photos |
| `src/lib/dedupe.ts` | File hashing for duplicate detection |
| `src/lib/card.ts` | Card size from a theme's border and caption area |
| `src/lib/fonts.ts` | Sheet fonts, loaded before drawing |
| `src/lib/exif.ts` | Photo date from EXIF |
| `src/lib/harmonize.ts` | Photo-matched background colors and photo color chips |
| `src/lib/samples.ts` | Painted stand-in scenes for the theme tiles before any photos are added |
| `src/lib/paint/util.ts` | Shared drawing helpers (seeded randomness, shadows, fonts) |
| `src/lib/prefs.ts` | Remembered settings, validated on load |
| `src/lib/bodies.ts` | Camera body colorways for the page accent |

## Develop

```bash
npm ci
npm run dev       # http://localhost:5173
npm test          # vitest: recipes, harmonizer, prefs, size limit, roll cap, custom theme, size estimate
npm run lint      # oxlint
npm run build     # type-check + production build into dist/
```

`scripts/shot.mjs` screenshots the running app in headless Chrome with real photos attached (and can click export), for checking layout changes without a person:

```bash
npm run preview -- --port 4789 &
node scripts/shot.mjs http://localhost:4789/ /tmp/shot.png 1400 900 ~/Pictures/charmera 6
```

`scripts/theme-gallery.html` draws every theme with the same photos (dev server only): open `/scripts/theme-gallery.html`, pick photos. `?only=gallery,stamps` filters by id prefix, `?cols=3`, `?n=4`. The shot script can drive it: `node scripts/shot.mjs "http://localhost:5173/scripts/theme-gallery.html?only=instant" out.png 1700 900 ~/Pictures/charmera 6`. Keep `only=` to a few concepts per shot; all 31 at once is too heavy for headless Chrome.

`scripts/size-probe.html` (dev server only) measures encoded bytes per pixel at several scales; it is where the falloff constants in `src/lib/estimate.ts` came from.

## Privacy

Everything happens in the browser: photos are decoded, drawn and exported locally and never uploaded. The only thing stored is the look settings, in `localStorage` under `charmera-collage:prefs:v1`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, test, build, then publish `dist/` to GitHub Pages (custom domain in `public/CNAME`).
