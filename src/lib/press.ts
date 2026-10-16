/**
 * Press-and-drag for mouse and touch alike. The browser's own drag-and-drop
 * never fires for fingers on iPhone/iPad, so this uses pointer events instead.
 *
 * Mouse/pen: the drag starts once the pointer moves a few pixels.
 * Touch: the drag starts after holding still briefly, so a quick swipe
 * over the same spot still scrolls the page.
 */
export interface DragHandlers {
  onStart: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  /** Released while dragging. */
  onDrop: (x: number, y: number) => void;
  /** The browser took the gesture back (e.g. a system swipe). */
  onCancel: () => void;
}

const HOLD_MS = 220;
const SLOP_PX = 7;

let dragging = false;

// Registered once, up front and non-passive: iOS only lets a touchmove stop
// scrolling when a cancelable listener was already there when the touch began.
if (typeof window !== 'undefined') {
  window.addEventListener(
    'touchmove',
    (e) => {
      if (dragging && e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
}

export function watchPress(e: { pointerType: string; button: number; clientX: number; clientY: number; preventDefault: () => void }, h: DragHandlers) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const touch = e.pointerType === 'touch';
  // Mouse: no text selection or native image drag while pressing.
  if (!touch) e.preventDefault();
  const x0 = e.clientX;
  const y0 = e.clientY;
  let active = false;

  const begin = () => {
    active = true;
    dragging = true;
    if (touch) navigator.vibrate?.(8);
    h.onStart(x0, y0);
  };
  const timer = touch ? window.setTimeout(begin, HOLD_MS) : 0;

  const move = (ev: PointerEvent) => {
    if (!active) {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < SLOP_PX) return;
      if (touch) return finish(); // moved before the hold: it's a scroll
      begin();
    }
    h.onMove(ev.clientX, ev.clientY);
  };
  const up = (ev: PointerEvent) => {
    if (active) h.onDrop(ev.clientX, ev.clientY);
    finish();
  };
  const cancel = () => {
    if (active) h.onCancel();
    finish();
  };
  // A long press opens the context menu on Android; not while holding a photo.
  const menu = (ev: Event) => ev.preventDefault();

  function finish() {
    window.clearTimeout(timer);
    dragging = false;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('contextmenu', menu);
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('contextmenu', menu);
}
