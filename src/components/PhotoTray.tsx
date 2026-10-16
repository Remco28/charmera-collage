import { useEffect, useRef, useState } from 'react';
import { watchPress } from '../lib/press';
import { tiltFor } from '../lib/tilt';
import type { PhotoSlot } from '../lib/types';

/** How close to the list's top or bottom edge a dragged row starts scrolling it. */
const EDGE_PX = 48;

/**
 * Tray order is sheet order. Grab a row by its photo (press and hold on a
 * phone) and slide it up or down; the sheet follows as you go. With a
 * keyboard, focus the photo and use the arrow keys.
 */
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
  const listRef = useRef<HTMLUListElement>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const pointerY = useRef(0);
  // Latest props for the drag loop, which outlives a render.
  const latest = useRef({ slots, onReorder });
  useEffect(() => {
    latest.current = { slots, onReorder };
  });

  // While dragging, slide the row under the finger and scroll the list at its edges.
  useEffect(() => {
    if (!dragId) return;
    let raf = 0;
    const tick = () => {
      const list = listRef.current;
      if (list) {
        const box = list.getBoundingClientRect();
        const y = pointerY.current;
        if (y < box.top + EDGE_PX) list.scrollTop -= Math.ceil((box.top + EDGE_PX - y) / 4);
        else if (y > box.bottom - EDGE_PX) list.scrollTop += Math.ceil((y - box.bottom + EDGE_PX) / 4);
        for (const s of latest.current.slots) {
          const r = rows.current.get(s.id)?.getBoundingClientRect();
          if (s.id !== dragId && r && y >= r.top && y < r.bottom) {
            latest.current.onReorder(dragId, s.id);
            break;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragId]);

  return (
    <ul ref={listRef} className="max-h-[28rem] space-y-2 overflow-auto p-0.5">
      {slots.map((s, i) => {
        const lifted = dragId === s.id;
        return (
          <li
            key={s.id}
            ref={(el) => {
              if (el) rows.current.set(s.id, el);
              else rows.current.delete(s.id);
            }}
            className={`flex items-center gap-2.5 rounded-2xl border-2 bg-white p-2 transition-[box-shadow,border-color,transform] ${
              lifted ? 'relative z-10 scale-[1.02] border-ink shadow-[0_8px_18px_rgba(29,26,36,0.25)]' : 'border-ink/10'
            }`}
          >
            <button
              type="button"
              onPointerDown={(e) =>
                watchPress(e, {
                  onStart: (_x, y) => {
                    pointerY.current = y;
                    setDragId(s.id);
                  },
                  onMove: (_x, y) => {
                    pointerY.current = y;
                  },
                  onDrop: () => setDragId(null),
                  onCancel: () => setDragId(null),
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' && i > 0) onMove(s.id, -1);
                else if (e.key === 'ArrowDown' && i < slots.length - 1) onMove(s.id, 1);
                else return;
                e.preventDefault();
              }}
              aria-label={`Photo ${i + 1}, ${s.file.name}. Drag, or use the arrow keys, to move it.`}
              title="Drag to move"
              className={`focus-ring flex shrink-0 items-center gap-1.5 rounded-xl py-1 pr-1 pl-0.5 select-none [-webkit-touch-callout:none] ${
                lifted ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <span className="text-lg leading-none text-muted" aria-hidden="true">
                ⠿
              </span>
              <img
                src={s.url}
                alt=""
                draggable={false}
                width={72}
                height={54}
                className="print pointer-events-none h-14 w-18 object-cover"
                style={{ transform: `rotate(${lifted ? 0 : tiltFor(i, 2.5)}deg)` }}
              />
            </button>
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
            <button
              onClick={() => onRemove(s.id)}
              aria-label={`Remove ${s.file.name}`}
              title="Remove photo"
              className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-base font-black text-cherry hover:bg-cherry hover:text-white"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
