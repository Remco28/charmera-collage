import { useEffect, useMemo, useRef, useState } from 'react';
import { cardBox } from '../lib/card';
import { placeRecipe, recipesFor } from '../lib/recipes';
import { drawSheet } from '../lib/render';
import { sampleBitmaps } from '../lib/samples';
import { CONCEPTS, THEMES, customTheme } from '../lib/themes';
import type { CustomMix } from '../lib/themes';
import type { PhotoSlot, Theme } from '../lib/types';

const THUMB_PX = 420;
const SAMPLE_CAPTIONS = ['beach day', '', '', ''];

/** A real render of the theme with four photos, so the tile shows what you'll get. */
function Thumb({ theme, photos }: { theme: Theme; photos: PhotoSlot[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || photos.length === 0) return;
    const raf = requestAnimationFrame(() => {
      const recipe = recipesFor(photos.length)[0];
      const { w, h } = cardBox(theme, true);
      const sheet = placeRecipe(recipe, photos.length, theme.gap, theme.pad, w, h, 'centered', 0, 1, theme.rowGap);
      drawSheet(canvas, photos, theme, sheet, THUMB_PX / sheet.W);
    });
    return () => cancelAnimationFrame(raf);
  }, [theme, photos]);
  return <canvas ref={ref} className="block aspect-[5/4] w-full object-cover" aria-hidden="true" />;
}

export function ThemePicker({
  themeId,
  onPick,
  slots,
  fontsReady,
  mix,
}: {
  themeId: string;
  onPick: (id: string) => void;
  slots: PhotoSlot[];
  fontsReady: boolean;
  mix: CustomMix;
}) {
  const [samples, setSamples] = useState<ImageBitmap[]>([]);
  useEffect(() => {
    void sampleBitmaps().then(setSamples);
  }, []);

  // Thumbnails use your first four photos once there are some; captions don't affect them.
  const key = slots.slice(0, 4).map((s) => s.id).join();
  const photos = useMemo<PhotoSlot[]>(() => {
    if (!fontsReady) return [];
    const src = slots.length > 0 ? slots.slice(0, 4).map((s) => s.bitmap) : samples;
    if (src.length === 0) return [];
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => ({
      id: `thumb-${i}`,
      file: null as unknown as File,
      url: '',
      hash: '',
      bitmap: src[i % src.length],
      caption: SAMPLE_CAPTIONS[i],
      taken: slots[i % Math.max(1, slots.length)]?.taken ?? now,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, samples, fontsReady]);

  const current = THEMES[themeId];
  const mixTheme = useMemo(() => customTheme(mix), [mix]);

  return (
    <div className="grid max-h-[34rem] grid-cols-2 gap-3 overflow-auto p-0.5 sm:grid-cols-3 lg:grid-cols-2">
      {CONCEPTS.map((c) => {
        const on = current?.concept === c.id;
        const custom = c.id === 'custom';
        const shown = custom ? mixTheme : on ? current : THEMES[`${c.id}-${c.colorways[0].key}`];
        return (
          <div
            key={c.id}
            className={`overflow-hidden rounded-2xl border-2 bg-white transition ${
              on ? 'border-ink shadow-[0_3px_0_var(--color-ink)]' : 'border-ink/10 hover:border-ink/40'
            }`}
          >
            <button
              onClick={() => onPick(shown.id)}
              aria-pressed={on}
              aria-label={`${c.name}, ${shown.name}`}
              title={c.tagline}
              className="focus-ring relative block w-full text-left"
            >
              <span className="block bg-paper-dim">
                <Thumb theme={shown} photos={photos} />
              </span>
              {on && (
                <span className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-accent text-xs font-black text-accent-ink">
                  ✓
                </span>
              )}
              <span className="block px-2.5 pt-1.5">
                <span className="block truncate font-display text-sm font-extrabold">{c.name}</span>
                <span className="block truncate text-xs text-muted">{on ? shown.name : c.tagline}</span>
              </span>
            </button>
            {custom ? (
              <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-2.5">
                {[mix.surface, mix.card, mix.ink].map((hex, k) => (
                  <span
                    key={k}
                    className={`h-6 w-6 rounded-full border-2 ${k === 1 && mix.border === 'none' ? 'hidden' : ''} border-ink/20`}
                    style={{ background: hex }}
                    aria-hidden="true"
                  />
                ))}
                <span className="truncate pl-0.5 font-hand text-base leading-none text-ink-soft">{on ? 'set below' : 'yours'}</span>
              </div>
            ) : (
            <div className="flex gap-1.5 px-2.5 pt-1.5 pb-2.5" role="group" aria-label={`${c.name} colorways`}>
              {c.colorways.map((cw) => {
                const t = THEMES[`${c.id}-${cw.key}`];
                const sel = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => onPick(t.id)}
                    aria-pressed={sel}
                    aria-label={`${c.name}: ${t.name}`}
                    title={t.name}
                    className={`focus-ring h-6 w-6 rounded-full border-2 transition-transform ${
                      sel ? 'scale-110 border-ink' : 'border-ink/20 hover:scale-110'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${t.palette.surface[0]} 0 55%, ${t.palette.card[0] === 'transparent' ? t.palette.detail : t.palette.card[0]} 55%)`,
                    }}
                  />
                );
              })}
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
