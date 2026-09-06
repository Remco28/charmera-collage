import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { CELL_H, CELL_W } from './lib/layout';
import { drawSheet, exportSheet } from './lib/render';
import { placeRecipe, recipesFor } from './lib/recipes';
import type { RowAlign } from './lib/recipes';
import { THEME_CATEGORIES, THEME_LIST } from './lib/themes';
import type { PhotoSlot, ThemeId } from './lib/types';
import type { ThemeCategoryFilter } from './lib/themes';
import { hashFile } from './lib/dedupe';

const MAX_PHOTOS = 12;

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

/** Collapsible panel so Theme picker and Photo tray stop competing for space. */
function Collapsible({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-neutral-900/50">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-800/60"
      >
        <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-sm font-bold uppercase tracking-widest text-neutral-300">{title}</span>
        <span className="ml-auto min-w-0 truncate text-xs text-neutral-500">{summary}</span>
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

export default function App() {
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  const [themeId, setThemeId] = useState<ThemeId>('darkroom');
  const [catFilter, setCatFilter] = useState<ThemeCategoryFilter>('All');
  const [recipeIdx, setRecipeIdx] = useState(0);
  const [align, setAlign] = useState<RowAlign>('centered');
  const [dragging, setDragging] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [decoding, setDecoding] = useState<{ done: number; total: number } | null>(null);
  const [pendingDupes, setPendingDupes] = useState<PhotoSlot[]>([]);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [error, setError] = useState<string | null>(null);
  const [openTheme, setOpenTheme] = useState(true);
  const [openPhotos, setOpenPhotos] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const theme = THEME_LIST.find((t) => t.id === themeId) ?? THEME_LIST[0];
  const variants = recipesFor(slots.length);

  // Identical cards, arranged by the chosen row recipe. Never resized.
  const sheet = useMemo(() => {
    const list = recipesFor(slots.length);
    const recipe = list[recipeIdx % Math.max(1, list.length)];
    if (!recipe) return null;
    const capH = slots.some((s) => s.caption.trim().length > 0) ? theme.captionHeight : 0;
    return placeRecipe(recipe, slots.length, theme.gap, theme.outerPad, CELL_W, CELL_H + capH, align, recipeIdx, list.length);
  }, [slots, theme, recipeIdx, align]);

  // New photo count → back to the first arrangement.
  useEffect(() => {
    setRecipeIdx(0);
  }, [slots.length]);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) {
      setError('Those files are not images — try JPG/PNG/WebP from the Charmera.');
      return;
    }
    const room = MAX_PHOTOS - slots.length;
    if (room <= 0) {
      setError(`A dozen is plenty — remove something to add more (max ${MAX_PHOTOS}).`);
      return;
    }
    const capped = imgs.slice(0, room);
    if (imgs.length > room) setError(`Kept the first ${room} — a dozen max.`);
    setDecoding({ done: 0, total: capped.length });
    const known = new Set(slots.map((s) => s.hash));
    const fresh: PhotoSlot[] = [];
    const dupes: PhotoSlot[] = [];
    for (let i = 0; i < capped.length; i++) {
      const file = capped[i];
      try {
        const [bitmap, hash] = await Promise.all([decodeFile(file), hashFile(file)]);
        const entry: PhotoSlot = { id: uid(), file, url: URL.createObjectURL(file), bitmap, caption: '', hash };
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
  }, [slots]);

  // Live redraw whenever photos, captions, theme, or arrangement change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (slots.length === 0 || !sheet) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 1440;
        canvas.height = 900;
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        g.addColorStop(0, '#17171c');
        g.addColorStop(1, '#0c0c10');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#52525b';
        ctx.font = '600 48px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('drop photos to preview your sheet', 720, 450);
      }
      return;
    }
    drawSheet(canvas, slots, theme, sheet);
  }, [slots, theme, sheet]);

  const removeSlot = (id: string) =>
    setSlots((prev) => {
      const found = prev.find((s) => s.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((s) => s.id !== id);
    });

  const setCaption = (id: string, caption: string) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, caption } : s)));

  /** Drag reorder: tray order is the sheet order, always. */
  const dropReorder = (targetId: string) =>
    setSlots((prev) => {
      if (!dragId || dragId === targetId) return prev;
      const from = prev.findIndex((s) => s.id === dragId);
      const to = prev.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });

  const clearAll = () => {
    slots.forEach((s) => URL.revokeObjectURL(s.url));
    pendingDupes.forEach((s) => URL.revokeObjectURL(s.url));
    setSlots([]);
    setPendingDupes([]);
  };

  const acceptDupes = () => {
    setSlots((prev) => [...prev, ...pendingDupes]);
    setPendingDupes([]);
  };

  const dismissDupes = () => {
    pendingDupes.forEach((s) => URL.revokeObjectURL(s.url));
    setPendingDupes([]);
  };

  const surpriseTheme = () => {
    const others = THEME_LIST.filter((t) => t.id !== themeId);
    setThemeId(others[Math.floor(Math.random() * others.length)].id);
  };

  const handleExport = async () => {
    if (slots.length === 0 || !canvasRef.current || !sheet) return;
    setExporting(true);
    setShaking(true);
    setTimeout(() => setShaking(false), 650);
    try {
      drawSheet(canvasRef.current, slots, theme, sheet);
      const blob = await exportSheet(canvasRef.current, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `charmera-${sheet.recipe.id}-${slots.length}up.${format === 'jpeg' ? 'jpg' : 'png'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.7 }, disableForReducedMotion: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const totalMB = slots.reduce((n, s) => n + s.file.size, 0) / 1_048_576;
  const filteredThemes =
    catFilter === 'All' ? THEME_LIST : THEME_LIST.filter((t) => t.category === catFilter);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-6 pt-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Kodak Charmera companion</p>
          <h1 className="mt-1 text-4xl font-black">charmera-collage 📸</h1>
          <p className="mt-2 max-w-xl text-neutral-300">
            Drop up to a dozen tiny Charmera shots. Arrange, theme, export —
            every photo stays exactly the same size. No cropping, no empty cells, ever.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={surpriseTheme} className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-bold hover:bg-neutral-700">
            🎲 Surprise theme
          </button>
          {slots.length > 0 && (
            <button onClick={clearAll} className="rounded-full bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700">
              Clear
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        <section className="space-y-4">
          {/* Dropzone with upload status */}
          <div
            role="button"
            tabIndex={0}
            aria-live="polite"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}
            className={`cursor-pointer rounded-3xl border-4 border-dashed p-8 text-center transition ${
              dragging ? 'border-amber-300 bg-amber-300/10 scale-[1.01]' : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
            }`}
          >
            {decoding ? (
              <>
                <div className="animate-pulse text-5xl">🧪</div>
                <p className="mt-3 text-xl font-black">Developing {decoding.done}/{decoding.total}…</p>
                <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-amber-300 transition-all"
                    style={{ width: `${(decoding.done / Math.max(decoding.total, 1)) * 100}%` }}
                  />
                </div>
              </>
            ) : slots.length === 0 ? (
              <>
                <div className="text-5xl">📥</div>
                <p className="mt-3 text-xl font-black">Drop Charmera photos here</p>
                <p className="mt-1 text-sm text-neutral-400">or click to browse · JPG/PNG/WebP · up to {MAX_PHOTOS}</p>
              </>
            ) : (
              <>
                <div className="text-5xl">✅</div>
                <p className="mt-3 text-xl font-black">{slots.length} photo{slots.length === 1 ? '' : 's'} ready · {sheet?.label}</p>
                <p className="mt-1 text-sm text-neutral-400">
                  {totalMB.toFixed(1)} MB · drop more to add, or click to browse
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-1">
                  {slots.slice(0, 9).map((s) => (
                    <img key={s.id} src={s.url} alt="" className="h-10 w-12 rounded-md border border-neutral-700 object-cover" />
                  ))}
                  {slots.length > 9 && (
                    <span className="flex h-10 items-center rounded-md bg-neutral-800 px-2 text-xs font-bold">+{slots.length - 9}</span>
                  )}
                </div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {error && <p className="rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200">{error}</p>}

          {/* Theme gallery with category filter */}
          <Collapsible
            title={`Theme (${THEME_LIST.length})`}
            summary={<>{theme.name} ✓ · captions auto-match</>}
            open={openTheme}
            onToggle={() => setOpenTheme((v) => !v)}
          >
            <div className="mt-1 flex flex-wrap gap-1.5">
              {THEME_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    catFilter === c ? 'bg-amber-300 text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-2 grid max-h-80 grid-cols-1 gap-2 overflow-auto pr-1">
              {filteredThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition ${
                    t.id === themeId ? 'border-amber-300 bg-neutral-800' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                  }`}
                >
                  <span className="h-10 w-14 shrink-0 rounded-lg border border-black/30" style={{ background: t.swatch }} />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{t.name} {t.id === themeId && '✓'}</span>
                    <span className="block truncate text-xs text-neutral-400">{t.tagline} · {t.category}</span>
                  </span>
                </button>
              ))}
            </div>
          </Collapsible>

          {/* Photo tray — drag to reorder, captions per photo */}
          {slots.length > 0 && (
            <Collapsible
              title={`Photos (${slots.length})`}
              summary={<>tray order = sheet order · drag rows</>}
              open={openPhotos}
              onToggle={() => setOpenPhotos((v) => !v)}
            >
              <ul className="mt-1 max-h-96 space-y-2 overflow-auto pr-1">
                {slots.map((s, i) => (
                  <li
                    key={s.id}
                    draggable
                    onDragStart={() => setDragId(s.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { dropReorder(s.id); setDragId(null); }}
                    className={`flex items-center gap-2 rounded-2xl bg-neutral-900 p-2 ${dragId === s.id ? 'opacity-50' : ''}`}
                  >
                    <span className="cursor-grab select-none px-1 text-neutral-500" title="Drag to reorder">⠿</span>
                    <img src={s.url} alt="" className="h-14 w-18 shrink-0 rounded-lg object-cover" width={72} height={54} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-neutral-400">#{i + 1} · {s.file.name}</p>
                      <input
                        value={s.caption}
                        onChange={(e) => setCaption(s.id, e.target.value)}
                        placeholder={`Caption #${i + 1}…`}
                        maxLength={80}
                        className="mt-1 w-full rounded-lg bg-neutral-800 px-2 py-1.5 text-sm outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                    <button onClick={() => removeSlot(s.id)} aria-label={`Remove ${s.file.name}`} title="Remove photo" className="shrink-0 rounded-full px-2 py-1 text-lg font-black leading-none text-red-500 hover:bg-red-950 hover:text-red-300">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </Collapsible>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl bg-neutral-900 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-neutral-400">
                {slots.length === 0 || !sheet
                  ? 'Your sheet preview appears here'
                  : `${theme.name} · ${sheet.label} · identical cards, no crop`}
              </p>
              <div className="flex gap-2 text-sm">
                {(['png', 'jpeg'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`rounded-full px-3 py-1 font-bold uppercase ${format === f ? 'bg-amber-300 text-black' : 'bg-neutral-800 text-neutral-300'}`}
                  >
                    {f === 'jpeg' ? 'JPG' : 'PNG'}
                  </button>
                ))}
              </div>
            </div>

            {/* Arrangement: recipe shuffle + row alignment */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {variants.length > 1 && (
                <button
                  onClick={() => setRecipeIdx((i) => i + 1)}
                  title="Try the next arrangement — same cards, new positions"
                  className="rounded-full bg-neutral-800 px-4 py-1.5 text-sm font-bold text-amber-300 hover:bg-neutral-700"
                >
                  ⟳ Shuffle arrangement
                </button>
              )}
              <div className="flex overflow-hidden rounded-full bg-neutral-800 text-sm">
                {(['centered', 'contact'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAlign(a)}
                    title={a === 'centered' ? 'Rows centered on the sheet' : 'Rows left-aligned like a contact sheet'}
                    className={`px-4 py-1.5 font-bold ${align === a ? 'bg-amber-300 text-black' : 'text-neutral-300 hover:bg-neutral-700'}`}
                  >
                    {a === 'centered' ? 'Centered' : 'Contact sheet'}
                  </button>
                ))}
              </div>
            </div>

            <canvas ref={canvasRef} className="max-h-[70vh] w-full rounded-2xl object-contain" />
          </div>

          <button
            onClick={handleExport}
            disabled={slots.length === 0 || exporting}
            className={`w-full rounded-3xl px-6 py-5 text-2xl font-black transition active:scale-[0.99] ${
              slots.length === 0 ? 'cursor-not-allowed bg-neutral-800 text-neutral-500' : 'bg-amber-300 text-black hover:bg-amber-200'
            } ${shaking ? 'animate-shake' : ''}`}
          >
            {exporting ? 'Developing… 🧪' : '📸 Shake it like a Polaroid — Export!'}
          </button>
          <p className="text-center text-xs text-neutral-500">Exports full-res PNG/JPG · native pixels, never resized. Free to share anywhere.</p>
        </section>
      </main>

      {/* Duplicate toast */}
      {pendingDupes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-300/40 bg-neutral-900 px-5 py-3 shadow-2xl">
          <span className="text-sm">
            ⚠️ {pendingDupes.length} duplicate{pendingDupes.length === 1 ? '' : 's'} skipped
          </span>
          <button onClick={acceptDupes} className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-black hover:bg-amber-200">
            Add anyway
          </button>
          <button onClick={dismissDupes} className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-700">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
