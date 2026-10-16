import type { ReactNode } from 'react';

/** Panel with a header that folds it away, so the left column stays short. */
export function Collapsible({
  title,
  summary,
  open,
  onToggle,
  actions,
  children,
}: {
  title: string;
  summary: ReactNode;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 pr-3">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-left"
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink text-[10px] transition-transform ${open ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          <span className="font-display text-lg font-extrabold">{title}</span>
          <span className="ml-1 min-w-0 truncate text-sm text-muted">{summary}</span>
        </button>
        {actions}
      </div>
      {open && <div className="border-t-2 border-dashed border-ink/15 px-3 pt-3 pb-3">{children}</div>}
    </section>
  );
}

/** Pill row of mutually exclusive choices. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  title,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5" title={title}>
      <span className="font-display text-sm font-bold text-ink-soft">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className={`flex rounded-full border-2 border-ink bg-paper-dim p-0.5 ${disabled ? 'opacity-45' : ''}`}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={on}
              disabled={disabled}
              title={o.title}
              onClick={() => onChange(o.value)}
              className={`focus-ring rounded-full px-3 py-1 font-display text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                on ? 'bg-accent text-accent-ink shadow-[0_2px_0_var(--color-ink)]' : 'text-ink-soft hover:bg-white'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
