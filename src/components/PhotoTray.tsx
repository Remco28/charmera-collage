import { useState } from 'react';
import { tiltFor } from '../lib/tilt';
import type { PhotoSlot } from '../lib/types';

/** Tray order is sheet order. Drag rows with a mouse, or use the arrows (touch, keyboard). */
export function PhotoTray({
  slots,
  onCaption,
  onMove,
  onReorder,
  onRemove,
}: {
  slots: PhotoSlot[];
  onCaption: (id: string, caption: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onReorder: (fromId: string, toId: string) => void;
  onRemove: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const arrow =
    'focus-ring grid h-7 w-7 place-items-center rounded-full text-sm font-black text-ink-soft hover:bg-paper-dim disabled:opacity-25 disabled:hover:bg-transparent';

  return (
    <>
      <ul className="max-h-[28rem] space-y-2 overflow-auto p-0.5">
        {slots.map((s, i) => (
          <li
            key={s.id}
            draggable
            onDragStart={(e) => {
              setDragId(s.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) onReorder(dragId, s.id);
              setDragId(null);
            }}
            className={`flex items-center gap-2.5 rounded-2xl border-2 border-ink/10 bg-white p-2 transition ${
              dragId === s.id ? 'opacity-40' : ''
            }`}
          >
            <span className="cursor-grab select-none text-lg text-muted" title="Drag to reorder" aria-hidden="true">
              ⠿
            </span>
            <img
              src={s.url}
              alt=""
              width={72}
              height={54}
              className="print h-14 w-18 shrink-0 object-cover"
              style={{ transform: `rotate(${tiltFor(i, 2.5)}deg)` }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">
                <span className="font-display font-bold text-ink">#{i + 1}</span> · {s.file.name}
              </p>
              <input
                value={s.caption}
                onChange={(e) => onCaption(s.id, e.target.value)}
                placeholder="write on the back…"
                aria-label={`Caption for photo ${i + 1}`}
                maxLength={80}
                className="mt-0.5 w-full border-b-2 border-dashed border-ink/20 bg-transparent px-0.5 font-hand text-xl leading-tight outline-none placeholder:text-muted/70 focus:border-accent"
              />
            </div>
            <div className="flex shrink-0 flex-col">
              <button className={arrow} disabled={i === 0} onClick={() => onMove(s.id, -1)} aria-label={`Move photo ${i + 1} up`}>
                ↑
              </button>
              <button
                className={arrow}
                disabled={i === slots.length - 1}
                onClick={() => onMove(s.id, 1)}
                aria-label={`Move photo ${i + 1} down`}
              >
                ↓
              </button>
            </div>
            <button
              onClick={() => onRemove(s.id)}
              aria-label={`Remove ${s.file.name}`}
              title="Remove photo"
              className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-base font-black text-cherry hover:bg-cherry hover:text-white"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
