import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { CameraIcon } from './components/CameraIcon';
import { Dropzone } from './components/Dropzone';
import { MixEditor } from './components/MixEditor';
import { PhotoTray } from './components/PhotoTray';
import { ThemePicker } from './components/ThemePicker';
import { Collapsible, Segmented } from './components/ui';
import { BODIES, RAINBOW, bodyById } from './lib/bodies';
import { anyCaptions, cardBox } from './lib/card';
import { exifDate } from './lib/exif';
import { loadSheetFonts } from './lib/fonts';
import { estimateBytes, formatBytes } from './lib/estimate';
import { bgIsDark, harmonizeBackground, photoSwatches, samplePhotoPixels } from './lib/harmonize';
import type { WeightedPixel } from './lib/harmonize';
import { loadPrefs, savePrefs } from './lib/prefs';
import type { Prefs } from './lib/prefs';
import { placeRecipe, recipesFor } from './lib/recipes';
import { MAX_SAFE_PIXELS, drawSheet, renderSheetBlob, safeScale } from './lib/render';
import { watchPress } from './lib/press';
import { CUSTOM_ID, THEME_LIST, themeFor } from './lib/themes';
import { tiltFor } from './lib/tilt';
import type { PhotoSlot } from './lib/types';
import { hashBytes } from './lib/dedupe';

const MAX_PHOTOS = 12;
/** Longest side of the on-screen preview. Export always renders separately. */
const PREVIEW_MAX_SIDE = 1800;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function decodeFile(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    return await createImageBitmap(file);
  }
}

/** Harmonizer samples per decoded photo, so caption typing does not re-read every bitmap. */
const sampleCache = new WeakMap<ImageBitmap, WeightedPixel[]>();
function samplesFor(bitmap: ImageBitmap): WeightedPixel[] {
  let px = sampleCache.get(bitmap);
  if (!px) {
    px = samplePhotoPixels(bitmap);
    sampleCache.set(bitmap, px);
  }
  return px;
}

function release(slot: PhotoSlot) {
  URL.revokeObjectURL(slot.url);
  slot.bitmap.close();
}

const megapixels = (w: number, h: number) => (w * h) / 1_000_000;

export default function App() {
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  // Arrangement choice is remembered per photo count, so a new count starts at the first one.
  const [recipePick, setRecipePick] = useState({ count: 0, idx: 0 });
  const [fileDrag, setFileDrag] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [decoding, setDecoding] = useState<{ done: number; total: number } | null>(null);
  const [pendingDupes, setPendingDupes] = useState<PhotoSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openTheme, setOpenTheme] = useState(true);
  const [openPhotos, setOpenPhotos] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  /** Encoded size of the current preview, the basis for the file-size estimate. */
  const [previewBytes, setPreviewBytes] = useState<{ png: number; jpeg: number; scale: number } | null>(null);
  /** A photo being dragged on the sheet preview: which card, where the pointer is, which card it's over. */
  const [sheetDrag, setSheetDrag] = useState<{ from: number; x: number; y: number; over: number | null } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    void loadSheetFonts().then(() => setFontsReady(true));
  }, []);

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => setPrefs((p) => ({ ...p, [key]: value }));
  useEffect(() => savePrefs(prefs), [prefs]);

  const body = bodyById(prefs.body);
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--accent', body.accent);
    root.setProperty('--accent-ink', body.accentInk);
  }, [body]);

  const theme = themeFor(prefs.themeId, prefs.custom);
  const variants = recipesFor(slots.length);
  const recipeIdx = recipePick.count === slots.length ? recipePick.idx : 0;

  // Effective theme = the theme, with its surface optionally tinted from the photos.
  // One object flows into placer + renderer, so everything stays consistent.
  const effTheme = useMemo(() => {
    if (prefs.bgMatch === 'off' || slots.length === 0 || !theme.tintable) return theme;
    const pixels = slots.flatMap((s) => samplesFor(s.bitmap));
    const stops = harmonizeBackground(pixels, 2, prefs.bgMatch, bgIsDark(theme.palette.surface));
    return stops.length > 0 ? { ...theme, palette: { ...theme.palette, surface: stops } } : theme;
  }, [slots, theme, prefs.bgMatch]);

  // Identical cards, arranged by the chosen row recipe. Photos keep native size.
  const sheet = useMemo(() => {
    const list = recipesFor(slots.length);
    const recipe = list[recipeIdx % Math.max(1, list.length)];
    if (!recipe) return null;
    const { w, h } = cardBox(effTheme, anyCaptions(slots));
    return placeRecipe(recipe, slots.length, effTheme.gap, effTheme.pad, w, h, prefs.align, recipeIdx, list.length, effTheme.rowGap);
  }, [slots, effTheme, recipeIdx, prefs.align]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    // `slots` is read once per batch, so a second batch mid-decode would see stale room and hashes.
    if (busyRef.current) {
      setError('Still developing the last batch — drop again in a moment.');
      return;
    }
    setError(null);
    setSaved(null);
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) {
      setError('Those files are not images — try JPG/PNG/WebP from the Charmera.');
      return;
    }
    const room = MAX_PHOTOS - slots.length;
    if (room <= 0) {
      setError(`The roll is full — remove a shot to add another (max ${MAX_PHOTOS}).`);
      return;
    }
    const capped = imgs.slice(0, room);
    if (imgs.length > room) setError(`Kept the first ${room} — a dozen max.`);
    busyRef.current = true;
    setDecoding({ done: 0, total: capped.length });
    const known = new Set(slots.map((s) => s.hash));
    const fresh: PhotoSlot[] = [];
    const dupes: PhotoSlot[] = [];
    for (let i = 0; i < capped.length; i++) {
      const file = capped[i];
      try {
        const buf = await file.arrayBuffer();
        const [bitmap, hash] = await Promise.all([decodeFile(file), hashBytes(buf, file)]);
        const taken = exifDate(buf) ?? new Date(file.lastModified || Date.now());
        const entry: PhotoSlot = { id: uid(), file, url: URL.createObjectURL(file), bitmap, caption: '', hash, taken };
        if (known.has(hash)) dupes.push(entry);
        else {
          known.add(hash);
          fresh.push(entry);
        }
      } catch {
        setError(`${file.name} could not be read. Skipped it.`);
      }
      setDecoding({ done: i + 1, total: capped.length });
    }
    if (fresh.length > 0) setSlots((prev) => [...prev, ...fresh]);
    setPendingDupes((prev) => [...prev, ...dupes]);
    setDecoding(null);
    busyRef.current = false;
  }, [slots]);

  // Files can be dropped anywhere on the page. Blocking the browser default also
  // stops a stray drop from opening the image and replacing the app.
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  }, [addFiles]);
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setFileDrag(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setFileDrag(false);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setFileDrag(false);
      // A tray row dragged for reordering carries no files.
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) void addFilesRef.current(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  // Live preview, drawn small and at most once per frame so typing stays smooth.
  // Once it settles, encode it both ways to estimate the export's file size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sheet || slots.length === 0 || !fontsReady) return;
    const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(sheet.W, sheet.H));
    let stale = false;
    const raf = requestAnimationFrame(() => drawSheet(canvas, slots, effTheme, sheet, scale));
    const timer = setTimeout(async () => {
      const size = (type: string, q?: number) =>
        new Promise<number>((resolve) => canvas.toBlob((b) => resolve(b?.size ?? 0), type, q));
      const png = await size('image/png');
      const jpeg = await size('image/jpeg', 0.92);
      if (!stale && png > 0 && jpeg > 0) setPreviewBytes({ png, jpeg, scale });
    }, 400);
    return () => {
      stale = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [slots, effTheme, sheet, fontsReady]);

  const photoColors = useMemo(() => photoSwatches(slots.flatMap((s) => samplesFor(s.bitmap))), [slots]);

  const removeSlot = (id: string) => {
    const found = slots.find((s) => s.id === id);
    if (found) release(found);
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const setCaption = (id: string, caption: string) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, caption } : s)));

  const reorder = (fromId: string, toId: string) =>
    setSlots((prev) => {
      const from = prev.findIndex((s) => s.id === fromId);
      const to = prev.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });

  const move = (id: string, delta: -1 | 1) =>
    setSlots((prev) => {
      const from = prev.findIndex((s) => s.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      [copy[from], copy[to]] = [copy[to], copy[from]];
      return copy;
    });

  const clearAll = () => {
    slots.forEach(release);
    pendingDupes.forEach(release);
    setSlots([]);
    setPendingDupes([]);
    setSaved(null);
  };

  const acceptDupes = () => {
    // Photos may have been added since the dupes were set aside; never go past the cap.
    const room = Math.max(0, MAX_PHOTOS - slots.length);
    const kept = pendingDupes.slice(0, room);
    pendingDupes.slice(room).forEach(release);
    if (kept.length < pendingDupes.length) setError(`Added ${kept.length} — a dozen max.`);
    setSlots((prev) => [...prev, ...kept]);
    setPendingDupes([]);
  };

  const dismissDupes = () => {
    pendingDupes.forEach(release);
    setPendingDupes([]);
  };

  const surpriseTheme = () => {
    const pool = THEME_LIST.filter((t) => t.id !== prefs.themeId && t.id !== CUSTOM_ID);
    set('themeId', pool[Math.floor(Math.random() * pool.length)].id);
  };

  const tooBigForPhone = !!sheet && sheet.W * sheet.H > MAX_SAFE_PIXELS;
  const phoneScale = sheet ? safeScale(sheet.W, sheet.H) : 1;
  const exportScale = prefs.size === 'phone' && tooBigForPhone ? phoneScale : 1;
  const sizeLabel = (kind: 'png' | 'jpeg') =>
    previewBytes && slots.length > 0
      ? ` · ${formatBytes(estimateBytes(previewBytes[kind], previewBytes.scale, exportScale, kind))}`
      : '';

  // --- Dragging a photo on the sheet preview ---
  /** Which card is under a point on screen, if any. Tilt is ignored; cards are close enough to square. */
  const cardAt = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas || !sheet) return null;
    const r = canvas.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * sheet.W;
    const sy = ((clientY - r.top) / r.height) * sheet.H;
    const { w, h } = cardBox(effTheme, anyCaptions(slots));
    const i = sheet.positions.findIndex((p) => sx >= p.x && sx < p.x + w && sy >= p.y && sy < p.y + h);
    return i >= 0 && i < slots.length ? i : null;
  };
  /** A card's box in screen coordinates, for the drag highlights. */
  const cardScreenBox = (i: number) => {
    const canvas = canvasRef.current;
    const p = sheet?.positions[i];
    if (!canvas || !sheet || !p) return null;
    const r = canvas.getBoundingClientRect();
    const k = r.width / sheet.W;
    const { w, h } = cardBox(effTheme, anyCaptions(slots));
    return { left: r.left + p.x * k, top: r.top + p.y * k, width: w * k, height: h * k };
  };
  const pressSheet = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const from = cardAt(e.clientX, e.clientY);
    if (from === null || slots.length < 2) return;
    watchPress(e, {
      onStart: (x, y) => setSheetDrag({ from, x, y, over: from }),
      onMove: (x, y) => setSheetDrag((d) => (d ? { ...d, x, y, over: cardAt(x, y) } : d)),
      onDrop: (x, y) => {
        const to = cardAt(x, y);
        if (to !== null && to !== from) reorder(slots[from].id, slots[to].id);
        setSheetDrag(null);
      },
      onCancel: () => setSheetDrag(null),
    });
  };

  const handleExport = async () => {
    if (slots.length === 0 || !sheet) return;
    setExporting(true);
    setSaved(null);
    setShaking(true);
    setFlashKey((k) => k + 1);
    setTimeout(() => setShaking(false), 650);
    try {
      await loadSheetFonts();
      const wantPhone = prefs.size === 'phone' && tooBigForPhone;
      let out = await renderSheetBlob(slots, effTheme, sheet, prefs.format, wantPhone ? phoneScale : 1);
      let fellBack = false;
      if (!out && !wantPhone && tooBigForPhone) {
        // iPhone/iPad Safari can't hold the full-size canvas; save the size it can.
        out = await renderSheetBlob(slots, effTheme, sheet, prefs.format, phoneScale);
        fellBack = true;
      }
      if (!out) throw new Error('This browser could not make the image. Try JPG, or fewer photos.');
      const small = wantPhone || fellBack;
      const ext = prefs.format === 'jpeg' ? 'jpg' : 'png';
      const url = URL.createObjectURL(out.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `charmera-${sheet.recipe.id}-${slots.length}up${small ? '-phone' : ''}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setSaved(
        `Saved ${out.width.toLocaleString()} × ${out.height.toLocaleString()} ${ext.toUpperCase()}` +
          (fellBack ? ' — this browser couldn’t make the full size, so it saved phone size.' : '.'),
      );
      confetti({ particleCount: 170, spread: 95, origin: { y: 0.75 }, colors: RAINBOW, disableForReducedMotion: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen text-ink">
      <div className="rainbow h-[15px]" aria-hidden="true" />

      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 pt-8 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <CameraIcon body={body} className="w-20 shrink-0 -rotate-6 drop-shadow-[0_4px_0_rgba(29,26,36,0.18)] sm:w-24" />
          <div className="min-w-0">
            <p className="-rotate-1 font-hand text-xl leading-none text-ink-soft">for the Kodak Charmera keychain camera</p>
            <h1 className="mt-1 font-display text-4xl leading-none font-extrabold tracking-tight sm:text-5xl">
              charmera collage
            </h1>
            <p className="mt-2 max-w-md text-ink-soft">
              Tiny camera, big sheet. Drop in a roll, pick a look, export one sheet — every shot full size, nothing cropped.
            </p>
          </div>
        </div>
        <div className="card px-3 pt-2 pb-1.5">
          <p className="px-1 font-hand text-lg leading-none text-ink-soft">pick your body</p>
          <div className="mt-1 flex gap-0.5" role="group" aria-label="Camera body color">
            {BODIES.map((b) => {
              const on = b.id === prefs.body;
              return (
                <button
                  key={b.id}
                  onClick={() => set('body', b.id)}
                  aria-pressed={on}
                  aria-label={`${b.name} body`}
                  title={b.name}
                  className={`focus-ring rounded-lg p-1 transition-transform ${on ? '-translate-y-1 bg-paper-dim' : 'hover:-translate-y-0.5'}`}
                >
                  <CameraIcon body={b} className="w-9 sm:w-10" />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Phones get one column in working order (add, see, export, then tweak); the order-* classes do that. */}
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[400px_1fr] lg:gap-6">
        <div className="contents min-w-0 lg:block lg:space-y-5">
          <div className="order-1">
            <Dropzone slots={slots} max={MAX_PHOTOS} decoding={decoding} onFiles={(f) => void addFiles(f)} />
          </div>

          {error && (
            <p className="animate-pop order-2 rounded-2xl border-2 border-cherry bg-white px-4 py-3 text-sm font-medium text-cherry" role="alert">
              {error}
            </p>
          )}

          {slots.length > 0 && (
            <div className="order-5">
            <Collapsible
              title="Photos"
              summary="in sheet order"
              open={openPhotos}
              onToggle={() => setOpenPhotos((v) => !v)}
              actions={
                <button onClick={clearAll} className="btn shrink-0 bg-white px-3 py-0.5 text-sm">
                  Clear all
                </button>
              }
            >
              <PhotoTray
                slots={slots}
                onCaption={setCaption}
                onMove={move}
                onReorder={reorder}
                onRemove={removeSlot}
              />
            </Collapsible>
            </div>
          )}

          <div className="order-6">
          <Collapsible
            title="Theme"
            summary={`${theme.conceptName} · ${theme.name}`}
            open={openTheme}
            onToggle={() => setOpenTheme((v) => !v)}
            actions={
              <button onClick={surpriseTheme} className="btn shrink-0 bg-accent px-3 py-0.5 text-sm text-accent-ink">
                🎲 Surprise me
              </button>
            }
          >
            <ThemePicker
              themeId={prefs.themeId}
              onPick={(id) => set('themeId', id)}
              slots={slots}
              fontsReady={fontsReady}
              mix={prefs.custom}
            />
            {theme.id === CUSTOM_ID && (
              <MixEditor mix={prefs.custom} photoColors={photoColors} onChange={(m) => set('custom', m)} />
            )}
          </Collapsible>
          </div>
        </div>

        <div className="contents min-w-0 lg:flex lg:flex-col lg:gap-5">
          {/* Desktop: the sheet rides along while you scroll the photos and themes, then settles
              just above the export panel at the end of the column. */}
          <div className="contents lg:block lg:flex-1">
          <section className="card order-3 p-4 sm:p-5 lg:sticky lg:top-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-extrabold">Your sheet</h2>
                <p className="truncate text-sm text-muted">
                  {sheet ? `${theme.conceptName}, ${theme.name} · ${sheet.label}` : 'Add photos to see it develop'}
                </p>
              </div>
              {variants.length > 1 && (
                <button
                  onClick={() => setRecipePick({ count: slots.length, idx: recipeIdx + 1 })}
                  title="Same cards, new positions"
                  className="btn bg-accent px-4 py-1.5 text-accent-ink"
                >
                  ⟳ Shuffle layout
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2.5 rounded-2xl bg-paper-dim/70 p-3">
              <Segmented
                label="Rows"
                value={prefs.align}
                onChange={(v) => set('align', v)}
                options={[
                  { value: 'centered', label: 'Centered', title: 'Rows centered on the sheet' },
                  { value: 'contact', label: 'Contact sheet', title: 'Rows left-aligned like a contact sheet' },
                ]}
              />
              <Segmented
                label="Background"
                value={prefs.bgMatch}
                onChange={(v) => set('bgMatch', v)}
                disabled={!theme.tintable}
                title={theme.tintable ? 'Tint the background from your photos' : `${theme.conceptName} keeps its own surface`}
                options={[
                  { value: 'off', label: 'Theme' },
                  { value: 'blend', label: 'Blend', title: 'Pick up the main color in your photos' },
                  { value: 'contrast', label: 'Contrast', title: 'Its opposite color, toned down' },
                ]}
              />
            </div>

            <div className="table-top mt-4 grid min-h-64 place-items-center overflow-hidden rounded-2xl border-2 border-ink/10 p-3 sm:p-5">
              {sheet ? (
                <canvas
                  ref={canvasRef}
                  onPointerDown={pressSheet}
                  aria-label={`Preview of your ${slots.length}-photo sheet`}
                  className={`max-h-[68vh] max-w-full lg:max-h-[max(16rem,calc(100vh-23rem))] rounded-sm object-contain shadow-[0_2px_0_rgba(29,26,36,0.2),0_14px_30px_rgba(29,26,36,0.22)] select-none [-webkit-touch-callout:none] ${
                    slots.length > 1 ? (sheetDrag ? 'cursor-grabbing' : 'cursor-grab') : ''
                  }`}
                />
              ) : (
                <div className="relative w-full max-w-md py-6">
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className="aspect-[4/3] rounded-md border-2 border-dashed border-ink/20 bg-white/60"
                        style={{ transform: `rotate(${tiltFor(i, 2.5)}deg)` }}
                      />
                    ))}
                  </div>
                  <p className="absolute inset-0 grid place-items-center">
                    <span className="-rotate-2 rounded-lg bg-paper-dim/90 px-3 font-hand text-3xl text-ink-soft">
                      your sheet develops here
                    </span>
                  </p>
                </div>
              )}
            </div>
            {slots.length > 1 && (
              <p className="mt-2 text-center font-hand text-lg leading-tight text-ink-soft">
                drag a photo onto another spot to move it · on a phone, press and hold first
              </p>
            )}
          </section>
          </div>

          <section className="card order-4 overflow-hidden">
            <div className="space-y-3 p-4 sm:p-5">
              <Segmented
                label="File type"
                value={prefs.format}
                onChange={(v) => set('format', v)}
                options={[
                  { value: 'png', label: `PNG${sizeLabel('png')}`, title: 'Lossless, bigger file' },
                  { value: 'jpeg', label: `JPG${sizeLabel('jpeg')}`, title: 'Smaller file, great for sharing' },
                ]}
              />
              {sheet && tooBigForPhone && (
                <div className="space-y-2 rounded-2xl bg-sky/70 p-3">
                  <Segmented
                    label="Size"
                    value={prefs.size}
                    onChange={(v) => set('size', v)}
                    options={[
                      { value: 'full', label: `Full · ${megapixels(sheet.W, sheet.H).toFixed(1)} MP` },
                      {
                        value: 'phone',
                        label: `Phone · ${megapixels(sheet.W * phoneScale, sheet.H * phoneScale).toFixed(1)} MP`,
                      },
                    ]}
                  />
                  <p className="text-sm text-ink-soft">
                    Big sheet! iPhones and iPads can’t save images over 16.7 MP. Phone size shrinks it just enough;
                    full size keeps every native pixel.
                  </p>
                </div>
              )}
              <button
                onClick={handleExport}
                disabled={slots.length === 0 || exporting}
                className={`btn relative w-full overflow-hidden rounded-[20px] bg-accent px-6 pt-4 pb-6 text-2xl text-accent-ink ${
                  shaking ? 'animate-shake' : ''
                }`}
              >
                {exporting ? 'Developing…' : slots.length === 0 ? 'Load the roll first' : 'Snap it — export the sheet'}
                <span className="rainbow-x absolute inset-x-0 bottom-0 h-2" aria-hidden="true" />
              </button>
              <p className="text-center text-sm text-muted" aria-live="polite">
                {saved ?? 'Saves straight to your device. Nothing is uploaded.'}
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="rainbow-x h-1.5 rounded-full opacity-80" aria-hidden="true" />
        <p className="mt-3 text-center text-xs text-muted">
          A fan-made companion for the Kodak Charmera. Not affiliated with Kodak. Your photos never leave your browser.
        </p>
      </footer>

      {pendingDupes.length > 0 && (
        <div className="card animate-pop fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-wrap items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm font-medium">
            {pendingDupes.length} duplicate{pendingDupes.length === 1 ? '' : 's'} set aside
          </span>
          <button onClick={acceptDupes} className="btn bg-accent px-3 py-0.5 text-sm text-accent-ink">
            Add anyway
          </button>
          <button onClick={dismissDupes} className="btn bg-white px-3 py-0.5 text-sm">
            Dismiss
          </button>
        </div>
      )}

      {fileDrag && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-ink/35 p-6 backdrop-blur-[2px]">
          <div className="card animate-pop rotate-[-2deg] border-dashed px-10 py-8 text-center">
            <CameraIcon body={body} className="mx-auto w-20" />
            <p className="mt-3 font-display text-3xl font-extrabold">Drop to develop</p>
            <p className="font-hand text-xl text-ink-soft">up to {MAX_PHOTOS - slots.length} more</p>
          </div>
        </div>
      )}

      {sheetDrag && <SheetDragOverlay drag={sheetDrag} slot={slots[sheetDrag.from]} boxOf={cardScreenBox} />}

      {flashKey > 0 && <div key={flashKey} className="animate-flash pointer-events-none fixed inset-0 z-[60] bg-white" />}
    </div>
  );
}

/** While a photo is dragged on the preview: its old spot dimmed, the drop spot ringed, and the photo under the finger. */
function SheetDragOverlay({
  drag,
  slot,
  boxOf,
}: {
  drag: { from: number; x: number; y: number; over: number | null };
  slot: PhotoSlot | undefined;
  boxOf: (i: number) => { left: number; top: number; width: number; height: number } | null;
}) {
  const from = boxOf(drag.from);
  const over = drag.over !== null && drag.over !== drag.from ? boxOf(drag.over) : null;
  if (!slot || !from) return null;
  const ghostW = Math.max(56, Math.min(150, from.width * 0.7));
  // Held just above the pointer, so a finger never hides the spot it's dropping on.
  const ghostTop = drag.y - ghostW * 0.75 - 14;
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      <div className="absolute rounded-md bg-paper/70" style={from} />
      {over && <div className="absolute rounded-md border-4 border-dashed border-ink bg-accent/25" style={over} />}
      <img
        src={slot.url}
        alt=""
        className="print absolute rotate-3"
        style={{ width: ghostW, left: drag.x - ghostW / 2, top: ghostTop }}
      />
    </div>
  );
}
