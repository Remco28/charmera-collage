/**
 * When a JPEG was taken, from its EXIF DateTimeOriginal (or DateTime).
 * Reads only the APP1 segment; returns null for anything it doesn't
 * recognize, so callers fall back to the file's modified time.
 */
export function exifDate(buf: ArrayBuffer): Date | null {
  try {
    const v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off + 4 <= v.byteLength) {
      const marker = v.getUint16(off);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
      const len = v.getUint16(off + 2);
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return tiffDate(v, off + 10);
      off += 2 + len;
    }
  } catch {
    // truncated or malformed — no date
  }
  return null;
}

function tiffDate(v: DataView, t: number): Date | null {
  const le = v.getUint16(t) === 0x4949;
  const u16 = (o: number) => v.getUint16(o, le);
  const u32 = (o: number) => v.getUint32(o, le);
  const find = (ifd: number, tag: number) => {
    const n = u16(ifd);
    for (let k = 0; k < n; k++) {
      const e = ifd + 2 + k * 12;
      if (u16(e) === tag) return e;
    }
    return -1;
  };
  const ascii = (e: number) => {
    const count = u32(e + 4);
    const at = count > 4 ? t + u32(e + 8) : e + 8;
    let s = '';
    for (let k = 0; k < count - 1; k++) s += String.fromCharCode(v.getUint8(at + k));
    return s;
  };
  const ifd0 = t + u32(t + 4);
  let entry = -1;
  const sub = find(ifd0, 0x8769);
  if (sub >= 0) entry = find(t + u32(sub + 8), 0x9003);
  if (entry < 0) entry = find(ifd0, 0x0132);
  if (entry < 0) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(ascii(entry));
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  // Unset camera clocks write zeros or 1970; treat those as unknown.
  return Number.isNaN(d.getTime()) || +m[1] < 1995 ? null : d;
}
