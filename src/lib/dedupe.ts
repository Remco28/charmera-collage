/** Content hashing for duplicate detection. Falls back to file metadata. */
export async function hashBytes(buf: ArrayBuffer, file: File): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `sha:${hex}`;
  } catch {
    return `meta:${file.name}:${file.size}:${file.lastModified}`;
  }
}
