/**
 * File-size estimate from the small preview. Encoding the preview is cheap, and
 * bytes per sheet pixel fall predictably as the same sheet is drawn bigger
 * (photos get smoother, surfaces get flatter): roughly with scale^-k.
 * k was fitted in Chrome over 9 concepts and 1–12 photos (scripts/size-probe.html);
 * it lands within about 15% of the real export.
 */
const FALLOFF = { png: 0.37, jpeg: 0.54 } as const;

export function estimateBytes(
  previewBytes: number,
  previewScale: number,
  targetScale: number,
  kind: 'png' | 'jpeg',
): number {
  if (previewScale <= 0 || targetScale <= 0) return 0;
  const ratio = targetScale / previewScale;
  // Same sheet, ratio² as many pixels, each a little cheaper to store.
  return previewBytes * ratio * ratio * Math.pow(ratio, -FALLOFF[kind]);
}

/** "≈ 840 KB", "≈ 4.2 MB", "≈ 53 MB". */
export function formatBytes(bytes: number): string {
  const mb = bytes / 1_000_000;
  if (mb < 1) return `≈ ${Math.max(10, Math.round(bytes / 10_000) * 10)} KB`;
  if (mb < 10) return `≈ ${mb.toFixed(1)} MB`;
  return `≈ ${Math.round(mb)} MB`;
}
