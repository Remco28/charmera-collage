import { useRef } from 'react';
import { tiltFor } from '../lib/tilt';
import type { PhotoSlot } from '../lib/types';

/** Exposure-counter window, like the one on a disposable: shots left on the roll. */
function FilmCounter({ left }: { left: number }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl border-2 border-ink bg-ink px-2.5 pt-1 pb-1.5 text-center shadow-[0_3px_0_rgba(29,26,36,0.35)]"
      aria-label={`${left} shots left`}
    >
      <span className="text-[9px] font-bold tracking-[0.25em] text-white/55">EXP</span>
      <span className="font-mono text-2xl leading-none font-bold text-tangerine tabular-nums">
        {String(left).padStart(2, '0')}
      </span>
      <span className="mt-0.5 text-[9px] font-bold tracking-[0.2em] text-white/55">LEFT</span>
    </div>
  );
}

export function Dropzone({
  slots,
  max,
  decoding,
  onFiles,
}: {
  slots: PhotoSlot[];
  max: number;
  decoding: { done: number; total: number } | null;
  onFiles: (files: FileList) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const totalMB = slots.reduce((n, s) => n + s.file.size, 0) / 1_048_576;
  const browse = () => fileRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-live="polite"
      aria-label="Add photos"
      onClick={browse}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          browse();
        }
      }}
      className="card focus-ring group relative cursor-pointer overflow-hidden"
    >
      <div className="rainbow-x h-2" />
      <div className="flex items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          {decoding ? (
            <>
              <p className="font-display text-2xl font-extrabold">
                Developing {decoding.done}/{decoding.total}…
              </p>
              <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-dim">
                <div
                  className="rainbow-x h-full transition-all"
                  style={{ width: `${(decoding.done / Math.max(decoding.total, 1)) * 100}%` }}
                />
              </div>
            </>
          ) : slots.length === 0 ? (
            <>
              <p className="font-display text-2xl leading-tight font-extrabold">Dump the roll here</p>
              <p className="mt-1 text-sm text-ink-soft">
                Drop up to {max} Charmera shots anywhere on the page, or{' '}
                <span className="font-bold text-ink underline decoration-accent decoration-[3px] underline-offset-2">
                  tap to browse
                </span>
                .
              </p>
              <p className="mt-2 font-hand text-lg leading-none text-muted">JPG · PNG · WebP — nothing leaves your browser</p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl leading-tight font-extrabold">
                {slots.length} shot{slots.length === 1 ? '' : 's'} on the table
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {totalMB.toFixed(1)} MB ·{' '}
                {slots.length < max ? 'drop more or tap to add' : 'roll’s full — remove one to swap'}
              </p>
            </>
          )}
        </div>
        <FilmCounter left={max - slots.length} />
      </div>

      {slots.length > 0 && !decoding && (
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {slots.map((s, i) => (
            <img
              key={s.id}
              src={s.url}
              alt=""
              className="print h-11 w-14 object-cover"
              style={{ transform: `rotate(${tiltFor(i)}deg)` }}
            />
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
