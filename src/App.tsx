import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { autoGrid } from './lib/layout';
import { drawSheet, exportSheet } from './lib/render';
import { THEME_CATEGORIES, THEME_LIST } from './lib/themes';
import type { PhotoSlot, ThemeCategory, ThemeId } from './lib/types';
import type { ThemeCategoryFilter } from './lib/themes';

const MAX_PHOTOS = 25;

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

export default function App() {
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  const [themeId, setThemeId] = useState<ThemeId>('darkroom');
  const [catFilter, setCatFilter] = useState<ThemeCategoryFilter>('All');
  const [dragging, setDragging] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [decoding, setDecoding] = useState<{ done: number; total: number } | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const theme = THEME_LIST.find((t) => t.id === themeId) ?? THEME_LIST[0];
  const grid = autoGrid(Math.max(slots.length, 1));
  const totalMB = slots.reduce((n, s) => n + s.file.size, 0) / 1_048_576;
  const filteredThemes =
    catFilter === 'All' ? THEME_LIST : THEME_LIST.filter((t) => t.category === (catFilter as ThemeCategory));

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) {
      setError('Those files are not images — try JPG/PNG/WebP from the Charmera.');
      return;
    }
    if (slots.length + imgs.length > MAX_PHOTOS) {
      setError(`Whoa, keep it to ${MAX_PHOTOS} photos per sheet for now.`);
      return;
    }
    setDecoding({ done: 0, total: imgs.length });
    const next: PhotoSlot[] = [];
    for (let i = 0; i < imgs.length; i++) {
      const file = imgs[i];
      try {
        const bitmap = await decodeFile(file);
        next.push({ id: uid(), file, url: URL.createObjectURL(file), bitmap, caption: '' });
      } catch {
        setError(`${file.name} could not be read. Skipped it.`);
      }
      setDecoding({ done: i + 1, total: imgs.length });
    }
    setSlots((prev) => [...prev, ...next]);
    setDecoding(null);
  }, [slots.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (slots.length === 0) {
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
    drawSheet(canvas, slots, theme);
  }, [slots, theme]);

  const removeSlot = (id: string) =>
    setSlots((prev) => {
      const found = prev.find((s) => s.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((s) => s.id !== id);
    });

  const setCaption = (id: string, caption: string) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, caption } : s)));

  /** Simple reorder: move slot left/right in sheet order. Preview redraws automatically. */
  const moveSlot = (id: string, dir: -1 | 1) =>
    setSlots((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

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
    setSlots([]);
  };

  const surpriseTheme = () => {
    const others = THEME_LIST.filter((t) => t.id !== themeId);
    setThemeId(others[Math.floor(Math.random() * others.length)].id);
  };

  const handleExport = async () => {
    if (slots.length === 0 || !canvasRef.current) return;
    setExporting(true);
    setShaking(true);
    setTimeout(() => setShaking(false), 650);
    try {
      drawSheet(canvasRef.current, slots, theme);
      const blob = await exportSheet(canvasRef.current, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `charmera-party-${grid.cols}x${grid.rows}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.7 }, disableForReducedMotion: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-6 pt-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Kodak Charmera companion</p>
          <h1 className="mt-1 text-4xl font-black">charmera-collage 📸</h1>
          <p className="mt-2 max-w-xl text-neutral-300">
            Drop a pile of tiny 1440×1080 Charmera shots. We auto-build a <span className="font-bold text-white">{grid.cols}×{grid.rows}</span> sheet
            — no cropping, ever — with a theme that makes it look intentional.
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
                <p className="mt-3 text-xl font-black">{slots.length} photo{slots.length === 1 ? '' : 's'} ready · {grid.cols}×{grid.rows}</p>
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
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
              Theme ({THEME_LIST.length}) · captions match automatically
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
          </div>

          {/* Photo tray with simple reorder */}
          {slots.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
                Photos ({slots.length}) · drag or ← → to reorder sheet
              </h2>
              <ul className="mt-2 max-h-96 space-y-2 overflow-auto pr-1">
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
                    <div className="flex shrink-0 flex-col gap-1">
                      <div className="flex gap-1">
                        <button onClick={() => moveSlot(s.id, -1)} disabled={i === 0} aria-label="Move earlier" className="rounded-md bg-neutral-800 px-1.5 text-xs disabled:opacity-30 hover:bg-neutral-700">←</button>
                        <button onClick={() => moveSlot(s.id, 1)} disabled={i === slots.length - 1} aria-label="Move later" className="rounded-md bg-neutral-800 px-1.5 text-xs disabled:opacity-30 hover:bg-neutral-700">→</button>
                      </div>
                      <button onClick={() => removeSlot(s.id)} aria-label={`Remove ${s.file.name}`} className="rounded-md bg-neutral-800 px-1.5 text-xs text-neutral-400 hover:bg-red-900 hover:text-white">
                        ✕ remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl bg-neutral-900 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-neutral-400">
                {slots.length === 0
                  ? 'Your sheet preview appears here'
                  : `${theme.name} · auto ${grid.cols}×${grid.rows} · native pixels, no crop`}
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
          <p className="text-center text-xs text-neutral-500">Exports full-res PNG/JPG · 3×3 of Charmera ≈ 4320px wide + theme padding. Free to share anywhere.</p>
        </section>
      </main>
    </div>
  );
}
