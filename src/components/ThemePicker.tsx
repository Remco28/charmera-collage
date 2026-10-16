import { THEME_CATEGORIES } from '../lib/themes';
import type { ThemeCategoryFilter } from '../lib/themes';
import type { Theme, ThemeId } from '../lib/types';

/** Swatch tiles: the theme's backdrop with a mini card in its frame colors. */
export function ThemePicker({
  themes,
  themeId,
  catFilter,
  onFilter,
  onPick,
}: {
  themes: Theme[];
  themeId: ThemeId;
  catFilter: ThemeCategoryFilter;
  onFilter: (c: ThemeCategoryFilter) => void;
  onPick: (id: ThemeId) => void;
}) {
  const shown = catFilter === 'All' ? themes : themes.filter((t) => t.category === catFilter);
  return (
    <>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Theme category">
        {THEME_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => onFilter(c)}
            aria-pressed={catFilter === c}
            className={`focus-ring rounded-full border-2 px-3 py-0.5 font-display text-sm font-bold transition-colors ${
              catFilter === c ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink-soft hover:border-ink/40'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-3 grid max-h-[22rem] grid-cols-2 gap-2.5 overflow-auto p-0.5 sm:grid-cols-3 lg:grid-cols-2">
        {shown.map((t) => {
          const on = t.id === themeId;
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              aria-pressed={on}
              title={t.tagline}
              className={`focus-ring group relative overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
                on ? 'border-ink shadow-[0_3px_0_var(--color-ink)]' : 'border-ink/10 hover:-translate-y-0.5 hover:border-ink/40'
              }`}
            >
              <span className="relative grid h-16 place-items-center" style={{ background: t.swatch }}>
                <span
                  className="block h-8 w-11"
                  style={{
                    background: t.framed ? t.cellBg : 'rgba(255,255,255,0.85)',
                    border: t.framed && t.borderColor ? `2px solid ${t.borderColor}` : undefined,
                    borderRadius: Math.min(t.radius / 4, 6),
                    boxShadow: t.shadow || !t.framed ? '0 3px 6px rgba(0,0,0,0.25)' : undefined,
                    transform: t.jitterDeg ? 'rotate(-4deg)' : undefined,
                  }}
                />
                {on && (
                  <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-ink bg-accent text-[11px] font-black text-accent-ink">
                    ✓
                  </span>
                )}
              </span>
              <span className="block px-2.5 pt-1.5 pb-2">
                <span className="block truncate font-display text-sm font-extrabold">{t.name}</span>
                <span className="block truncate text-xs text-muted">
                  {t.framed ? t.category : 'Frameless'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
