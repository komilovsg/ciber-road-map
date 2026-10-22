import { fromUtf8, parseHex, toHex, utf8 } from "./bytes";

export type OpId = "b64e" | "b64d" | "hexe" | "hexd" | "urle" | "urld" | "bine" | "bind" | "rot13";

export const OPS: { id: OpId; label: string; run: (s: string) => string }[] = [
  {
    id: "b64e",
    label: "Base64: кодировать",
    run: (s) => {
      let bin = "";
      utf8(s).forEach((b) => (bin += String.fromCharCode(b)));
      return btoa(bin);
    },
  },
  {
    id: "b64d",
    label: "Base64: декодировать",
    run: (s) => {
      let t = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t) || t.length % 4 === 1) throw new Error("bad");
      t += "=".repeat((4 - (t.length % 4)) % 4);
      const bin = atob(t);
      return fromUtf8(Uint8Array.from(bin, (c) => c.charCodeAt(0)), true);
    },
  },
  { id: "hexe", label: "Hex: кодировать", run: (s) => toHex(utf8(s)) },
  {
    id: "hexd",
    label: "Hex: декодировать",
    run: (s) => {
      const b = parseHex(s);
      if (!b) throw new Error("bad");
      return fromUtf8(b, true);
    },
  },
  { id: "urle", label: "URL: кодировать", run: (s) => encodeURIComponent(s) },
  { id: "urld", label: "URL: декодировать", run: (s) => decodeURIComponent(s.replace(/\+/g, " ")) },
  {
    id: "bine",
    label: "Binary: кодировать",
    run: (s) => Array.from(utf8(s), (b) => b.toString(2).padStart(8, "0")).join(" "),
  },
  {
    id: "bind",
    label: "Binary: декодировать",
    run: (s) => {
      const t = s.replace(/\s+/g, "");
      if (!/^[01]*$/.test(t) || t.length % 8 !== 0) throw new Error("bad");
      const bytes = new Uint8Array(t.length / 8);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(t.slice(i * 8, i * 8 + 8), 2);
      return fromUtf8(bytes, true);
    },
  },
  {
    id: "rot13",
    label: "ROT13",
    run: (s) =>
      s.replace(/[a-z]/gi, (c) => {
        const base = c <= "Z" ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
      }),
  },
];

export type StepResult = { out: string; err: null | "fail" | "skipped" };

/** Run the chain; once a step fails the rest are skipped. */
export function runChain(input: string, ops: OpId[]): { results: StepResult[]; failed: boolean; final: string } {
  let cur = input;
  let failed = false;
  const results = ops.map((op): StepResult => {
    if (failed) return { out: "", err: "skipped" };
    try {
      cur = OPS.find((o) => o.id === op)!.run(cur);
      return { out: cur, err: null };
    } catch {
      failed = true;
      return { out: "", err: "fail" };
    }
  });
  return { results, failed, final: failed ? "" : cur };
}
