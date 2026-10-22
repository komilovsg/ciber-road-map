export const R = [256, 128, 64, 32, 16, 8, 4, 2, 1];
export const CLASSES = [
  { key: "u", name: "Владелец", short: "владелец" },
  { key: "g", name: "Группа", short: "группа" },
  { key: "o", name: "Остальные", short: "остальные" },
] as const;

export const toSym = (m: number): string => R.map((b, i) => (m & b ? "rwx"[i % 3] : "-")).join("");
export const toOct = (m: number): string => m.toString(8).padStart(3, "0");
export const digit = (m: number, c: number): number => (m >> (6 - c * 3)) & 7;

export function parseSym(s: string): number | null {
  if (!/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(s)) return null;
  return R.reduce((m, b, i) => (s[i] !== "-" ? m | b : m), 0);
}

/** Apply "u+x,g-w,o=r" or a plain octal "644". Returns null on syntax error. */
export function applyCmd(mode: number, cmd: string): number | null {
  const t = cmd.trim().replace(/^chmod\s+/, "").split(/\s+/)[0] ?? "";
  if (!t) return null;
  if (/^[0-7]{3}$/.test(t)) return parseInt(t, 8);
  let m = mode;
  for (const clause of t.split(",")) {
    const x = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(clause);
    if (!x) return null;
    const who = x[1] === "" ? "a" : x[1];
    const op = x[2];
    const perm = (x[3].includes("r") ? 4 : 0) | (x[3].includes("w") ? 2 : 0) | (x[3].includes("x") ? 1 : 0);
    ["u", "g", "o"].forEach((c, ci) => {
      if (!who.includes("a") && !who.includes(c)) return;
      const sh = 6 - ci * 3;
      if (op === "+") m |= perm << sh;
      else if (op === "-") m &= ~(perm << sh);
      else m = (m & ~(7 << sh)) | (perm << sh);
    });
  }
  return m;
}

export function words(d: number): string {
  return (
    ["ничего", "только выполнение", "только запись", "запись и выполнение", "только чтение", "чтение и выполнение", "чтение и запись", "чтение, запись и выполнение"][d]
  );
}

export const descShort = (m: number): string => `владелец: ${words(digit(m, 0))}; группа: ${words(digit(m, 1))}; остальные: ${words(digit(m, 2))}`;

export function actions(d: number, dir: boolean): string[] {
  const out: string[] = [];
  if (d & 4) out.push(dir ? "смотреть список файлов (ls)" : "читать содержимое");
  if (d & 2) out.push(dir ? "создавать и удалять файлы внутри" : "изменять файл");
  if (d & 1) out.push(dir ? "заходить в каталог (cd)" : "запускать как программу");
  return out;
}
