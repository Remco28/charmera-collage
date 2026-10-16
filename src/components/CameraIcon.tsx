import { useId } from 'react';
import { RAINBOW } from '../lib/bodies';
import type { Body } from '../lib/bodies';

/** A little keychain camera in the given body colorway. Drawn, not traced from any logo. */
export function CameraIcon({ body, className }: { body: Body; className?: string }) {
  const clip = useId();
  const ink = '#1d1a24';
  return (
    <svg viewBox="0 0 64 42" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x="2" y="7" width="60" height="32" rx="7" />
        </clipPath>
      </defs>
      {/* keychain loop + shutter button */}
      <circle cx="5" cy="9" r="3.2" fill="none" stroke={ink} strokeWidth="1.8" />
      <rect x="44" y="2.5" width="11" height="6" rx="2" fill={ink} />
      <rect x="2" y="7" width="60" height="32" rx="7" fill={body.shell} />
      <g clipPath={`url(#${clip})`}>
        {body.stripes &&
          RAINBOW.map((c, i) => <rect key={c} x="0" y={26 + i * 1.8} width="64" height="1.8" fill={c} />)}
        {body.id === 'pop' && (
          <>
            <rect x="7" y="25" width="9" height="9" fill="#ef4130" />
            <circle cx="52" cy="30" r="4.2" fill="#2c6fe0" />
            <rect x="15" y="28" width="7" height="6" fill="#ffc61a" />
          </>
        )}
        {body.id === 'clear' && (
          <g opacity="0.35" stroke={ink} strokeWidth="0.8" fill="none">
            <rect x="8" y="22" width="14" height="10" rx="1" />
            <path d="M40 22h14v10H40z M44 22v10 M48 22v10" />
          </g>
        )}
      </g>
      <rect x="2" y="7" width="60" height="32" rx="7" fill="none" stroke={ink} strokeWidth="2.2" />
      {/* viewfinder + flash */}
      <rect x="8" y="12" width="12" height="7" rx="1.6" fill="#2a2733" stroke={ink} strokeWidth="1.2" />
      <rect x="10" y="13.5" width="3.5" height="2" rx="0.6" fill="#ffffff" opacity="0.5" />
      <rect x="42" y="12" width="14" height="6.5" rx="1.4" fill="#f6f2e7" stroke={ink} strokeWidth="1.2" />
      {/* lens */}
      <circle cx="32" cy="25" r="10" fill={ink} />
      <circle cx="32" cy="25" r="6" fill="#3a3550" />
      <circle cx="32" cy="25" r="2.6" fill="#15131b" />
      <circle cx="29.3" cy="22.3" r="1.7" fill="#ffffff" opacity="0.75" />
    </svg>
  );
}
