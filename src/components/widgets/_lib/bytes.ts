const enc = new TextEncoder();

export const utf8 = (s: string) => enc.encode(s);

export function fromUtf8(b: Uint8Array, fatal = false): string {
  return new TextDecoder("utf-8", { fatal }).decode(b);
}

export const toHex = (b: Uint8Array, sep = " "): string =>
  Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(sep);

/** Parse "48 65 6c", "0x48,0x65" or "48656c" into bytes. Returns null when invalid. */
export function parseHex(s: string): Uint8Array | null {
  const clean = s.replace(/0x/gi, "").replace(/[\s,:_-]/g, "");
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export const toBin = (x: number): string => x.toString(2).padStart(8, "0");

/** Printable ASCII as-is, everything else as a dot. */
export const printable = (b: Uint8Array): string =>
  Array.from(b, (x) => (x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : ".")).join("");
