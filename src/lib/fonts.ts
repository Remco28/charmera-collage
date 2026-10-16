/**
 * Sheet fonts. Self-hosted (see index.css), so export never depends on the
 * network. The canvas silently falls back if a face isn't loaded yet, so the
 * app awaits loadSheetFonts() before drawing.
 */
export const HAND = '"Caveat Variable", "Segoe Print", cursive';
export const MARKER = '"Permanent Marker", "Caveat Variable", cursive';
export const TYPE = '"Special Elite", "Courier New", monospace';
export const SERIF = '"Fraunces Variable", Georgia, serif';
export const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif';

const FACES = [
  `700 80px ${HAND}`,
  `400 80px ${MARKER}`,
  `400 80px ${TYPE}`,
  `600 80px ${SERIF}`,
  `italic 400 80px ${SERIF}`,
  `800 80px ${DISPLAY}`,
];

let ready: Promise<void> | null = null;

export function loadSheetFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  ready ??= Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => []))).then(() => undefined);
  return ready;
}
