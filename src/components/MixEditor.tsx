import type { CustomMix } from '../lib/themes';
import { Segmented } from './ui';

/** Always-there choices next to the colors pulled from the photos. */
const NEUTRALS = ['#ffffff', '#f6f1e7', '#e7e3dc', '#b9b4ac', '#5b5660', '#2a2730', '#111014'];

function SwatchRow({
  label,
  value,
  photoColors,
  onChange,
}: {
  label: string;
  value: string;
  photoColors: string[];
  onChange: (hex: string) => void;
}) {
  const v = value.toLowerCase();
  const swatch = (hex: string, fromPhotos: boolean) => {
    const on = hex.toLowerCase() === v;
    return (
      <button
        key={`${fromPhotos ? 'p' : 'n'}${hex}`}
        type="button"
        onClick={() => onChange(hex)}
        aria-pressed={on}
        aria-label={`${label}: ${hex}${fromPhotos ? ', from your photos' : ''}`}
        title={hex}
        className={`focus-ring h-7 w-7 shrink-0 rounded-full border-2 transition-transform ${
          on ? 'scale-110 border-ink shadow-[0_2px_0_var(--color-ink)]' : 'border-ink/20 hover:scale-110'
        }`}
        style={{ background: hex }}
      />
    );
  };
  const known = [...photoColors, ...NEUTRALS].some((c) => c.toLowerCase() === v);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-sm font-bold text-ink-soft">{label}</span>
        <span className="font-mono text-xs text-muted">{v}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {photoColors.map((c) => swatch(c, true))}
        {photoColors.length > 0 && <span className="mx-0.5 h-5 w-0.5 rounded-full bg-ink/15" aria-hidden="true" />}
        {NEUTRALS.map((c) => swatch(c, false))}
        {/* Any exact color: the native picker, dressed as a rainbow chip. */}
        <label
          title="Any color"
          className={`focus-within:outline-cobalt relative h-7 w-7 shrink-0 cursor-pointer rounded-full border-2 focus-within:outline-3 focus-within:outline-offset-2 ${
            known ? 'border-ink/20' : 'scale-110 border-ink shadow-[0_2px_0_var(--color-ink)]'
          }`}
          style={{
            background: known
              ? 'conic-gradient(#e8402f, #f68a1e, #ffc61a, #3fb950, #2c6fe0, #8a3fd1, #e8402f)'
              : `radial-gradient(circle, ${v} 0 45%, transparent 47%), conic-gradient(#e8402f, #f68a1e, #ffc61a, #3fb950, #2c6fe0, #8a3fd1, #e8402f)`,
          }}
        >
          <input
            type="color"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label}: pick any color`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Settings for Mix Your Own: exact colors (from the photos, neutrals, or any
 * color at all), how wide the border is, and whether prints sit straight.
 */
export function MixEditor({
  mix,
  photoColors,
  onChange,
}: {
  mix: CustomMix;
  photoColors: string[];
  onChange: (mix: CustomMix) => void;
}) {
  const set = <K extends keyof CustomMix>(k: K, value: CustomMix[K]) => onChange({ ...mix, [k]: value });
  return (
    <div className="mt-3 space-y-3 rounded-2xl border-2 border-ink/10 bg-paper-dim/70 p-3">
      <p className="font-hand text-lg leading-tight text-ink-soft">
        {photoColors.length > 0
          ? 'the first chips come from your photos'
          : 'add photos to get chips in their colors'}
      </p>
      <SwatchRow label="Background" value={mix.surface} photoColors={photoColors} onChange={(c) => set('surface', c)} />
      {mix.border !== 'none' && (
        <SwatchRow label="Border" value={mix.card} photoColors={photoColors} onChange={(c) => set('card', c)} />
      )}
      <SwatchRow label="Captions" value={mix.ink} photoColors={photoColors} onChange={(c) => set('ink', c)} />
      <Segmented
        label="Border width"
        value={mix.border}
        onChange={(v) => set('border', v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'thin', label: 'Thin' },
          { value: 'classic', label: 'Classic' },
          { value: 'wide', label: 'Wide' },
        ]}
      />
      <Segmented
        label="Prints"
        value={mix.scatter ? 'tossed' : 'straight'}
        onChange={(v) => set('scatter', v === 'tossed')}
        options={[
          { value: 'straight', label: 'Straight' },
          { value: 'tossed', label: 'Tossed', title: 'A slight tilt, like prints dropped on a table' },
        ]}
      />
    </div>
  );
}
