# charmera collage

Turn a roll of [Kodak Charmera](https://www.kodak.com/) keychain-camera shots into one themed collage sheet, right in the browser. Live at **https://charmera.teamremco.org**.

A fan-made companion; not affiliated with Kodak. Photos never leave the browser, and there is no backend.

## What it does

- Drop up to 12 photos anywhere on the page (or tap to browse). Exact duplicates are set aside, with an "Add anyway".
- Every photo is the same size card at native Charmera resolution (1440×1080). No cropping, no resizing, no empty cells.
- Row recipes give 1–3 arrangements per photo count ("Shuffle layout"), centered or contact-sheet aligned.
- 40 procedural themes (no image assets, system fonts on the sheet), frame thickness override, and a background tint matched to your photos.
- Captions, written per photo, reserve a caption strip on framed themes.
- Export as PNG or JPG. Sheets over 16.7 MP (about 9+ photos) also offer **Phone size**, because iPhone and iPad Safari can't create larger images. If a full-size export fails there, it falls back to phone size on its own.
- Look settings (theme, frame, background, file type, size, camera body color) are remembered in this browser. Photos are not.

## Code map

| Path | What |
| --- | --- |
| `src/App.tsx` | State, file intake, page layout, export |
| `src/components/` | Dropzone, photo tray, theme picker, camera illustration, shared controls |
| `src/lib/recipes.ts` | Row recipes and card placement |
| `src/lib/render.ts` | Canvas drawing (scaled preview, offscreen export, iOS size limit) |
| `src/lib/themes.ts` | Theme definitions |
| `src/lib/harmonize.ts` | Photo-matched background colors |
| `src/lib/frame.ts` | Frame thickness override |
| `src/lib/prefs.ts` | Remembered settings, validated on load |
| `src/lib/bodies.ts` | Camera body colorways for the page accent |

## Develop

```bash
npm ci
npm run dev       # http://localhost:5173
npm test          # vitest: recipes, harmonizer, frame, prefs, size limit
npm run lint      # oxlint
npm run build     # type-check + production build into dist/
```

`scripts/shot.mjs` screenshots the running app in headless Chrome with real photos attached (and can click export), for checking layout changes without a person:

```bash
npm run preview -- --port 4789 &
node scripts/shot.mjs http://localhost:4789/ /tmp/shot.png 1400 900 ~/Pictures/charmera 6
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, test, build, then publish `dist/` to GitHub Pages (custom domain in `public/CNAME`).
