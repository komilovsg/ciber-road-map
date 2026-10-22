// Pure simulated shell over an in-memory virtual file system. No React, no DOM.
import type { VfsDir } from "@/content/types";

export type SegClass = "dir" | "exe" | "err" | "dim" | "hl" | "file" | "ok" | "sep";
export interface Seg {
  t: string;
  c?: SegClass;
}
export type Line = Seg[];
export interface RunResult {
  lines: Line[];
  cwd: string;
  clear?: boolean;
}
export interface Completion {
  line: string;
  candidates: string[];
}
export interface ShellOptions {
  user?: string;
  cwd?: string;
}

interface Node {
  dir: boolean;
  mode: number;
  owner: string;
  group: string;
  content: string;
  kids: Map<string, Node>;
}

const MTIME = "Oct 23 10:00";
const FAKE_DATE = "Fri Oct 23 10:00:00 UTC 2026";
const HOST = "cyber";

const E = {
  noent: "нет такого файла или каталога",
  acc: "Permission denied (отказано в доступе)",
  isdir: "это каталог",
  notdir: "не каталог",
};

export const COMMANDS = [
  "cat", "cd", "chmod", "clear", "cp", "date", "echo", "env", "exit", "export", "false", "find", "grep", "head", "help",
  "history", "hostname", "id", "less", "ls", "man", "mkdir", "more", "mv", "printenv", "pwd", "rm", "rmdir",
  "sort", "sudo", "tail", "touch", "true", "uname", "uniq", "wc", "which", "whoami",
];

const MAN: Record<string, [string, string]> = {
  pwd: ["pwd", "показывает полный путь текущего каталога"],
  ls: ["ls [-l] [-a] [-h] [путь...]", "список файлов. -l подробно (права, владелец, размер), -a со скрытыми (.имя), -h размеры в K/M"],
  cd: ["cd [каталог]", "перейти в каталог. cd без аргумента или cd ~ — домой, cd .. — вверх, cd - — назад"],
  cat: ["cat [-n] файл...", "вывести содержимое файлов (или входных данных из пайпа)"],
  echo: ["echo [-n] [-e] текст", "вывести текст. echo текст > файл перезаписывает файл, >> дописывает в конец"],
  mkdir: ["mkdir [-p] каталог...", "создать каталог. -p создаёт и недостающие родительские"],
  touch: ["touch файл...", "создать пустой файл (если его нет)"],
  rm: ["rm [-r] [-f] путь...", "удалить файлы. -r для каталогов, -f без вопросов и ошибок. Корзины нет!"],
  rmdir: ["rmdir каталог...", "удалить пустой каталог"],
  cp: ["cp [-r] источник... цель", "копировать файл. -r копирует каталоги"],
  mv: ["mv источник... цель", "переместить или переименовать"],
  grep: ["grep [-i] [-n] [-r] [-c] [-v] [-l] шаблон [файл...]", "найти строки по шаблону. -i без учёта регистра, -n номера строк, -r рекурсивно, -c посчитать, -v инвертировать"],
  find: ["find [путь] [-name шаблон] [-type f|d]", "искать файлы и каталоги по имени и типу"],
  head: ["head [-n N] [файл...]", "первые N строк (по умолчанию 10)"],
  tail: ["tail [-n N] [файл...]", "последние N строк (по умолчанию 10)"],
  wc: ["wc [-l] [-w] [-c] [файл...]", "посчитать строки (-l), слова (-w), байты (-c)"],
  sort: ["sort [-r] [-n] [-u] [файл...]", "отсортировать строки. -r в обратном порядке, -n как числа, -u без повторов"],
  uniq: ["uniq [-c] [-d] [файл]", "убрать подряд идущие повторы. -c с количеством. Обычно после sort"],
  chmod: ["chmod РЕЖИМ файл...", "изменить права. Режим: 755, 644 или символьно u+x, go-w, a+r, u=rw"],
  whoami: ["whoami", "имя текущего пользователя"],
  id: ["id", "UID, GID и группы пользователя"],
  sudo: ["sudo команда", "выполнить команду от имени администратора (в учебном терминале пароль не нужен)"],
  clear: ["clear", "очистить экран (Ctrl+L)"],
  history: ["history", "список введённых команд"],
  help: ["help", "список доступных команд"],
  man: ["man команда", "краткая справка по команде"],
  hostname: ["hostname", "имя компьютера"],
  date: ["date", "дата и время (в учебном терминале фиксированные)"],
  uname: ["uname [-a]", "информация о системе"],
  env: ["env", "переменные окружения"],
  which: ["which команда", "где лежит программа"],
  exit: ["exit", "выйти из оболочки (в учебном терминале недоступно)"],
};

// ---------- helpers ----------
const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const bytes = (s: string) => (enc ? enc.encode(s).length : s.length);
const plain = (l: Line) => l.map((s) => s.t).join("");
const isErr = (l: Line) => l.length > 0 && l[0].c === "err";
const textLines = (s: string): string[] => {
  if (s === "") return [];
  const a = s.split("\n");
  if (a[a.length - 1] === "") a.pop();
  return a;
};
const joinText = (ls: string[]) => (ls.length ? ls.join("\n") + "\n" : "");
const collate = (a: string, b: string) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  return a === b ? 0 : a > b ? -1 : 1; // lowercase first on ties
};
const lsKey = (n: string) => n.replace(/^\.+/, "");
const lsCollate = (a: string, b: string) => collate(lsKey(a), lsKey(b)) || collate(a, b);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function modeStr(n: Node): string {
  const m = n.mode;
  const t = (sh: number, sticky = false) => {
    const r = m & (4 << sh) ? "r" : "-";
    const w = m & (2 << sh) ? "w" : "-";
    const xb = !!(m & (1 << sh));
    const x = sticky ? (xb ? "t" : "T") : xb ? "x" : "-";
    return r + w + x;
  };
  return (n.dir ? "d" : "-") + t(6) + t(3) + t(0, !!(m & 0o1000));
}

function human(n: number): string {
  if (n < 1024) return String(n);
  const units = ["K", "M", "G"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const r = v < 10 ? Math.ceil(v * 10) / 10 : Math.ceil(v);
  return String(r) + units[i];
}

/** Glob (* ? [..]) to RegExp, whole-string match. */
function globToRe(g: string, flags = ""): RegExp {
  let s = "";
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === "*") s += ".*";
    else if (ch === "?") s += ".";
    else if (ch === "[") {
      const j = g.indexOf("]", i + 2);
      if (j > 0) {
        s += "[" + g.slice(i + 1, j).replace(/^!/, "^").replace(/\\/g, "\\\\") + "]";
        i = j;
      } else s += "\\[";
    } else s += esc(ch);
  }
  return new RegExp("^" + s + "$", flags);
}

// ---------- tokenizer / parser ----------
interface Piece {
  s: string;
  q: 0 | 1 | 2; // 0 bare, 1 single-quoted/escaped, 2 double-quoted
}
type Tok = { op: string } | { w: Piece[] };
interface Stage {
  words: Piece[][];
  out?: { file: Piece[]; append: boolean };
  err?: { file: Piece[]; append: boolean };
  inp?: Piece[];
  mergeErr?: boolean;
}
interface Item {
  sep: ";" | "&&" | "||";
  stages: Stage[];
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let cur: Piece[] = [];
  let bare = "";
  const flushBare = () => {
    if (bare) cur.push({ s: bare, q: 0 });
    bare = "";
  };
  const endWord = () => {
    flushBare();
    if (cur.length) toks.push({ w: cur });
    cur = [];
  };
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n") {
      endWord();
      i++;
    } else if (ch === "'") {
      flushBare();
      const j = src.indexOf("'", i + 1);
      const end = j < 0 ? n : j;
      cur.push({ s: src.slice(i + 1, end), q: 1 });
      i = end + 1;
    } else if (ch === '"') {
      flushBare();
      let s = "";
      i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === "\\" && i + 1 < n && '"\\$`'.includes(src[i + 1])) {
          // keep a marker so "\$" is not expanded: use private-use char
          s += src[i + 1] === "$" ? "\u0001" : src[i + 1];
          i += 2;
        } else s += src[i++];
      }
      i++;
      cur.push({ s, q: 2 });
    } else if (ch === "\\") {
      flushBare();
      if (i + 1 < n) cur.push({ s: src[i + 1], q: 1 });
      i += 2;
    } else if (ch === "#" && !bare && !cur.length) {
      break;
    } else if (ch === "|" || ch === ";" || ch === "&" || ch === ">" || ch === "<") {
      endWord();
      if (src.startsWith("||", i)) {
        toks.push({ op: "||" });
        i += 2;
      } else if (src.startsWith("&&", i)) {
        toks.push({ op: "&&" });
        i += 2;
      } else if (src.startsWith(">>", i)) {
        toks.push({ op: ">>" });
        i += 2;
      } else {
        toks.push({ op: ch === "&" ? ";" : ch });
        i++;
      }
    } else if (ch === "2" && !bare && !cur.length && src[i + 1] === ">") {
      if (src.startsWith("2>&1", i)) {
        toks.push({ op: "2>&1" });
        i += 4;
      } else if (src.startsWith("2>>", i)) {
        toks.push({ op: "2>>" });
        i += 3;
      } else {
        toks.push({ op: "2>" });
        i += 2;
      }
    } else {
      bare += ch;
      i++;
    }
  }
  endWord();
  return toks;
}

function parse(src: string): Item[] | string {
  const toks = tokenize(src);
  const items: Item[] = [];
  let sep: Item["sep"] = ";";
  let stage: Stage = { words: [] };
  let stages: Stage[] = [];
  const synErr = (t: string) => `bash: синтаксическая ошибка рядом с неожиданным элементом «${t}»`;
  const closeStage = () => {
    stages.push(stage);
    stage = { words: [] };
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if ("w" in t) {
      stage.words.push(t.w);
      continue;
    }
    const op = t.op;
    if (op === ">" || op === ">>" || op === "2>" || op === "2>>" || op === "<") {
      const nx = toks[++i];
      if (!nx || !("w" in nx)) return synErr(nx ? (nx as { op: string }).op : "newline");
      if (op === "<") stage.inp = nx.w;
      else if (op[0] === "2") stage.err = { file: nx.w, append: op === "2>>" };
      else stage.out = { file: nx.w, append: op === ">>" };
    } else if (op === "2>&1") {
      stage.mergeErr = true;
    } else if (op === "|") {
      if (!stage.words.length) return synErr("|");
      closeStage();
    } else {
      // ; && ||
      if (!stage.words.length && !stages.length) {
        if (op === ";" && !items.length) continue;
        return synErr(op);
      }
      if (!stage.words.length) return synErr(op);
      closeStage();
      items.push({ sep, stages });
      stages = [];
      sep = op as Item["sep"];
    }
  }
  if (stage.words.length) closeStage();
  else if (stages.length) return synErr("newline");
  if (stages.length) items.push({ sep, stages });
  return items;
}

// ---------- output builder ----------
class Out {
  lines: Line[] = [];
  code = 0;
  clear = false;
  text(s: string, c?: SegClass) {
    for (const l of textLines(s)) this.lines.push([{ t: l, c }]);
  }
  line(...segs: Seg[]) {
    this.lines.push(segs);
  }
  err(msg: string, code = 1) {
    this.lines.push([{ t: msg, c: "err" }]);
    this.code = code;
  }
}

interface Ctx {
  stdin: string | null;
  tty: boolean;
}
type Cmd = (a: string[], c: Ctx, o: Out) => void;

interface Flags {
  f: Set<string>;
  rest: string[];
}
function flagsOf(args: string[], known: string): Flags {
  const f = new Set<string>();
  const rest: string[] = [];
  let done = false;
  for (const a of args) {
    if (!done && a === "--") done = true;
    else if (!done && a.length > 1 && a[0] === "-" && !/^-\d/.test(a)) {
      if (a.startsWith("--")) f.add(a);
      else for (const ch of a.slice(1)) f.add(ch);
    } else rest.push(a);
  }
  void known;
  return { f, rest };
}

// ---------- Shell ----------
export class Shell {
  readonly user: string;
  readonly home: string;
  cwd: string;
  history: string[] = [];
  private root: Node;
  private oldpwd: string;
  private env: Record<string, string>;
  private lastCode = 0;
  private asRoot = false;
  private cmds: Record<string, Cmd>;

  constructor(vfs: VfsDir, opts: ShellOptions = {}) {
    this.user = opts.user ?? "student";
    this.home = this.user === "root" ? "/root" : `/home/${this.user}`;
    this.cwd = opts.cwd ?? this.home;
    if (!this.cwd.startsWith("/")) this.cwd = "/" + this.cwd;
    this.cwd = this.norm(this.cwd);
    this.oldpwd = this.cwd;
    this.root = this.build(vfs, "/");
    this.root.owner = "root";
    this.mkdirp(this.home, this.user === "root" ? "root" : this.user);
    this.mkdirp(this.cwd, this.user);
    this.env = {
      USER: this.user,
      LOGNAME: this.user,
      HOME: this.home,
      SHELL: "/bin/bash",
      LANG: "ru_RU.UTF-8",
      PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      HOSTNAME: HOST,
      TERM: "xterm-256color",
    };
    this.cmds = this.table();
  }

  // ----- fs primitives -----
  private ownerFor(path: string): string {
    const h = this.home;
    return path === h || path.startsWith(h + "/") ? this.user : "root";
  }
  private build(v: VfsDir | string, path: string): Node {
    if (typeof v === "string") {
      let mode = 0o644;
      if (path === "/etc/shadow" || path === "/var/log/auth.log" || path === "/var/log/secure") mode = 0o640;
      const owner = this.ownerFor(path);
      return {
        dir: false,
        mode,
        owner,
        group: mode === 0o640 ? "adm" : owner,
        content: v === "" || v.endsWith("\n") ? v : v + "\n",
        kids: new Map(),
      };
    }
    let mode = 0o755;
    if (path === "/root") mode = 0o700;
    if (path === "/tmp") mode = 0o1777;
    const owner = this.ownerFor(path);
    const n: Node = { dir: true, mode, owner, group: owner, content: "", kids: new Map() };
    for (const k of Object.keys(v)) {
      if (k.startsWith("__")) continue;
      const child = v[k];
      if (typeof child !== "string" && (typeof child !== "object" || child === null)) continue;
      n.kids.set(k, this.build(child, (path === "/" ? "" : path) + "/" + k));
    }
    return n;
  }
  private mkdirp(abs: string, owner: string) {
    let cur = this.root;
    let path = "";
    for (const s of abs.split("/").filter(Boolean)) {
      path += "/" + s;
      let nx = cur.kids.get(s);
      if (!nx) {
        nx = { dir: true, mode: 0o755, owner: owner === "root" ? "root" : this.ownerFor(path), group: "", content: "", kids: new Map() };
        nx.group = nx.owner;
        cur.kids.set(s, nx);
      }
      cur = nx;
    }
  }
  norm(p: string): string {
    const base = p.startsWith("/") ? p : this.cwd + "/" + p;
    const out: string[] = [];
    for (const s of base.split("/")) {
      if (!s || s === ".") continue;
      if (s === "..") out.pop();
      else out.push(s);
    }
    return "/" + out.join("/");
  }
  private get(abs: string): Node | null {
    let cur = this.root;
    for (const s of abs.split("/").filter(Boolean)) {
      if (!cur.dir) return null;
      const nx = cur.kids.get(s);
      if (!nx) return null;
      cur = nx;
    }
    return cur;
  }
  private split(abs: string): [string, string] {
    const i = abs.lastIndexOf("/");
    return [i <= 0 ? "/" : abs.slice(0, i), abs.slice(i + 1)];
  }
  private euser() {
    return this.asRoot ? "root" : this.user;
  }
  private can(n: Node, bit: 4 | 2 | 1): boolean {
    const u = this.euser();
    if (u === "root") return bit !== 1 || n.dir || !!(n.mode & 0o111);
    const sh = n.owner === u ? 6 : n.group === u ? 3 : 0;
    return !!(n.mode & (bit << sh));
  }
  private newNode(dir: boolean): Node {
    const o = this.euser();
    return { dir, mode: dir ? 0o755 : 0o644, owner: o, group: o, content: "", kids: new Map() };
  }
  private clone(n: Node): Node {
    const c: Node = { ...n, kids: new Map() };
    c.owner = this.euser();
    c.group = c.owner;
    for (const [k, v] of n.kids) c.kids.set(k, this.clone(v));
    return c;
  }
  private writeFile(abs: string, content: string, append: boolean): string | null {
    const [pa, name] = this.split(abs);
    const parent = this.get(pa);
    if (!parent) return E.noent;
    if (!parent.dir) return E.notdir;
    const ex = parent.kids.get(name);
    if (ex) {
      if (ex.dir) return E.isdir;
      if (!this.can(ex, 2)) return E.acc;
      ex.content = append ? ex.content + content : content;
      return null;
    }
    if (!this.can(parent, 2)) return E.acc;
    const f = this.newNode(false);
    f.content = content;
    parent.kids.set(name, f);
    return null;
  }
  private sortedNames(n: Node): string[] {
    return [...n.kids.keys()].sort(lsCollate);
  }
  private name(abs: string) {
    return this.split(abs)[1];
  }

  // ----- prompt -----
  promptPath(): string {
    if (this.cwd === this.home) return "~";
    if (this.cwd.startsWith(this.home + "/")) return "~" + this.cwd.slice(this.home.length);
    return this.cwd;
  }
  prompt(): Seg[] {
    return [
      { t: `${this.user}@${HOST}`, c: "ok" },
      { t: ":", c: "dim" },
      { t: this.promptPath(), c: "dir" },
      { t: this.user === "root" ? "# " : "$ ", c: "dim" },
    ];
  }
  promptText(): string {
    return plain(this.prompt());
  }

  // ----- expansion -----
  private expandVars(s: string): string {
    return s
      .replace(/\$\{(\w+)\}|\$(\w+|\?)/g, (_m, a: string | undefined, b: string | undefined) => {
        const k = (a ?? b) as string;
        if (k === "?") return String(this.lastCode);
        if (k === "PWD") return this.cwd;
        if (k === "OLDPWD") return this.oldpwd;
        return this.env[k] ?? "";
      })
      .replace(/\u0001/g, "$");
  }
  private expandWord(w: Piece[]): string[] {
    const chars: { c: string; g: boolean }[] = [];
    w.forEach((p, idx) => {
      let s = p.q === 1 ? p.s : this.expandVars(p.s);
      if (p.q === 0 && idx === 0 && (s === "~" || s.startsWith("~/"))) s = this.home + s.slice(1);
      for (const c of s) chars.push({ c, g: p.q === 0 && (c === "*" || c === "?") });
    });
    const str = chars.map((x) => x.c).join("");
    if (!chars.some((x) => x.g)) return [str];
    const res = this.glob(chars);
    return res.length ? res : [str];
  }
  private glob(chars: { c: string; g: boolean }[]): string[] {
    const segs: { c: string; g: boolean }[][] = [[]];
    for (const x of chars) {
      if (x.c === "/") segs.push([]);
      else segs[segs.length - 1].push(x);
    }
    const absolute = segs[0].length === 0 && segs.length > 1;
    const results: string[] = [];
    const walk = (disp: string, abs: string, i: number) => {
      while (i < segs.length && segs[i].length === 0) i++;
      if (i >= segs.length) {
        results.push(disp);
        return;
      }
      const seg = segs[i];
      const node = this.get(abs);
      if (!node || !node.dir) return;
      const join = (nm: string) => (disp === "" ? nm : disp.endsWith("/") ? disp + nm : disp + "/" + nm);
      if (!seg.some((x) => x.g)) {
        const lit = seg.map((x) => x.c).join("");
        if (node.kids.has(lit) || lit === "." || lit === "..") walk(join(lit), this.norm(abs + "/" + lit), i + 1);
        return;
      }
      let re = "";
      for (const x of seg) re += x.g ? (x.c === "*" ? ".*" : ".") : esc(x.c);
      const rx = new RegExp("^" + re + "$");
      const dotOk = seg[0]?.c === "." && !seg[0].g;
      for (const nm of this.sortedNames(node)) {
        if (nm.startsWith(".") && !dotOk) continue;
        if (!rx.test(nm)) continue;
        const kid = node.kids.get(nm) as Node;
        if (i < segs.length - 1 && !kid.dir) continue;
        walk(join(nm), abs === "/" ? "/" + nm : abs + "/" + nm, i + 1);
      }
    };
    walk(absolute ? "/" : "", absolute ? "/" : this.cwd, absolute ? 1 : 0);
    return results;
  }
  private expandSimple(w: Piece[]): string {
    return this.expandWord(w.map((p) => ({ ...p, q: p.q === 0 ? 1 : p.q })) as Piece[])[0];
  }

  // ----- run -----
  run(line: string): RunResult {
    const out: Line[] = [];
    let clear = false;
    if (line.trim()) this.history.push(line);
    const parsed = parse(line);
    if (typeof parsed === "string") {
      out.push([{ t: parsed, c: "err" }]);
      this.lastCode = 2;
      return { lines: out, cwd: this.cwd };
    }
    for (const item of parsed) {
      if (item.sep === "&&" && this.lastCode !== 0) continue;
      if (item.sep === "||" && this.lastCode === 0) continue;
      const r = this.runPipeline(item.stages);
      out.push(...r.lines);
      if (r.clear) {
        clear = true;
        out.length = 0;
      }
    }
    return { lines: out, cwd: this.cwd, clear: clear || undefined };
  }

  private runPipeline(stages: Stage[]): { lines: Line[]; clear: boolean } {
    const display: Line[] = [];
    let stdin: string | null = null;
    let clear = false;
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      const last = i === stages.length - 1;
      let sin = stdin;
      if (st.inp) {
        const f = this.expandSimple(st.inp);
        const nd = this.get(this.norm(f));
        if (!nd) {
          display.push([{ t: `bash: ${f}: ${E.noent}`, c: "err" }]);
          this.lastCode = 1;
          stdin = "";
          continue;
        }
        sin = nd.content;
      }
      const o = new Out();
      this.execStage(st, { stdin: sin, tty: last && !st.out }, o);
      if (o.clear) clear = true;
      let lines = o.lines;
      if (st.mergeErr) lines = lines.map((l) => (isErr(l) ? l.map((s) => ({ t: s.t })) : l));
      const errs = lines.filter(isErr);
      const outs = lines.filter((l) => !isErr(l));
      let shownErr = errs;
      if (st.err) {
        const f = this.expandSimple(st.err.file);
        if (f !== "/dev/null") {
          const e = this.writeFile(this.norm(f), joinText(errs.map(plain)), st.err.append);
          if (e) display.push([{ t: `bash: ${f}: ${e}`, c: "err" }]);
        }
        shownErr = [];
      }
      display.push(...shownErr);
      this.lastCode = o.code;
      if (st.out) {
        const f = this.expandSimple(st.out.file);
        if (f !== "/dev/null") {
          const e = this.writeFile(this.norm(f), joinText(outs.map(plain)), st.out.append);
          if (e) {
            display.push([{ t: `bash: ${f}: ${e}`, c: "err" }]);
            this.lastCode = 1;
          }
        }
        stdin = "";
      } else if (last) display.push(...outs);
      else stdin = joinText(outs.map(plain));
    }
    return { lines: display, clear };
  }

  private execStage(st: Stage, c: Ctx, o: Out) {
    const argv: string[] = [];
    for (const w of st.words) argv.push(...this.expandWord(w));
    // assignments only
    let k = 0;
    while (k < argv.length && /^[A-Za-z_]\w*=/.test(argv[k]) && st.words[k].length && st.words[k][0].q === 0) {
      const eq = argv[k].indexOf("=");
      this.env[argv[k].slice(0, eq)] = argv[k].slice(eq + 1);
      k++;
    }
    const rest = argv.slice(k);
    if (!rest.length) return;
    this.exec(rest, c, o);
  }

  private exec(argv: string[], c: Ctx, o: Out) {
    let [name, ...args] = argv;
    if (name === "ll") {
      name = "ls";
      args = ["-la", ...args];
    }
    if (name.includes("/")) return this.execFile(name, args, o);
    const fn = this.cmds[name];
    if (!fn) {
      o.err(`bash: ${name}: команда не найдена`, 127);
      return;
    }
    fn(args, c, o);
  }

  private execFile(path: string, args: string[], o: Out) {
    void args;
    const abs = this.norm(path);
    const n = this.get(abs);
    if (!n) return o.err(`bash: ${path}: ${E.noent}`, 127);
    if (n.dir) return o.err(`bash: ${path}: ${E.isdir}`, 126);
    if (!(n.mode & 0o111) || !this.can(n, 1)) return o.err(`bash: ${path}: ${E.acc}`, 126);
    o.text("(скрипт выполнен — в учебном терминале запуск не поддерживается)", "dim");
  }

  // ----- tab completion -----
  complete(line: string): Completion {
    const m = /(\S*)$/.exec(line);
    const word = m ? m[1] : "";
    const head = line.slice(0, line.length - word.length);
    const isCmd = head.trim() === "" || /[|;&]\s*$/.test(head) || /^\s*sudo\s+$/.test(head);
    if (isCmd && !word.includes("/")) {
      const c = COMMANDS.filter((x) => x.startsWith(word));
      if (c.length === 0) return { line, candidates: [] };
      if (c.length === 1) return { line: head + c[0] + " ", candidates: [] };
      const p = commonPrefix(c);
      return { line: head + p, candidates: c };
    }
    const slash = word.lastIndexOf("/");
    const dirPart = word.slice(0, slash + 1);
    const base = word.slice(slash + 1);
    const dirAbs = this.norm(dirPart === "" ? "." : dirPart.startsWith("~") ? this.home + dirPart.slice(1) : dirPart);
    const d = this.get(dirAbs);
    if (!d || !d.dir) return { line, candidates: [] };
    const names = this.sortedNames(d).filter((x) => x.startsWith(base) && (base.startsWith(".") || !x.startsWith(".")));
    if (names.length === 0) return { line, candidates: [] };
    const show = (x: string) => x + ((d.kids.get(x) as Node).dir ? "/" : "");
    if (names.length === 1) {
      const nd = d.kids.get(names[0]) as Node;
      return { line: head + dirPart + names[0] + (nd.dir ? "/" : " "), candidates: [] };
    }
    return { line: head + dirPart + commonPrefix(names), candidates: names.map(show) };
  }

  // ----- commands -----
  private table(): Record<string, Cmd> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const sh = this;
    const readInputs = (files: string[], c: Ctx, o: Out, cmd: string): { name: string; text: string }[] => {
      if (files.length === 0) return c.stdin !== null ? [{ name: "-", text: c.stdin }] : [];
      const res: { name: string; text: string }[] = [];
      for (const f of files) {
        if (f === "-") {
          res.push({ name: "-", text: c.stdin ?? "" });
          continue;
        }
        const n = sh.get(sh.norm(f));
        if (!n) o.err(`${cmd}: ${f}: ${E.noent}`);
        else if (n.dir) o.err(`${cmd}: ${f}: ${E.isdir}`);
        else if (!sh.can(n, 4)) o.err(`${cmd}: ${f}: ${E.acc}`);
        else res.push({ name: f, text: n.content });
      }
      return res;
    };

    const cmds: Record<string, Cmd> = {
      pwd: (_a, _c, o) => o.text(sh.cwd),
      true: () => undefined,
      false: (_a, _c, o) => {
        o.code = 1;
      },
      whoami: (_a, _c, o) => o.text(sh.euser()),
      hostname: (_a, _c, o) => o.text(HOST),
      date: (_a, _c, o) => o.text(FAKE_DATE),
      id: (_a, _c, o) =>
        o.text(
          sh.euser() === "root"
            ? "uid=0(root) gid=0(root) groups=0(root)"
            : `uid=1000(${sh.user}) gid=1000(${sh.user}) groups=1000(${sh.user}),27(sudo)`,
        ),
      uname: (a, _c, o) => {
        const f = flagsOf(a, "").f;
        if (f.has("a")) o.text("Linux cyber 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux");
        else if (f.has("r")) o.text("6.8.0-45-generic");
        else o.text("Linux");
      },
      env: (_a, _c, o) => {
        const e: Record<string, string> = { ...sh.env, PWD: sh.cwd, OLDPWD: sh.oldpwd };
        o.text(Object.keys(e).map((k) => `${k}=${e[k]}`).join("\n"));
      },
      printenv: (a, _c, o) => {
        const e: Record<string, string> = { ...sh.env, PWD: sh.cwd, OLDPWD: sh.oldpwd };
        if (!a.length) return cmds.env([], { stdin: null, tty: true }, o);
        for (const k of a) {
          if (k in e) o.text(e[k]);
          else o.code = 1;
        }
      },
      export: (a, _c, o) => {
        for (const x of a) {
          const eq = x.indexOf("=");
          if (eq > 0) sh.env[x.slice(0, eq)] = x.slice(eq + 1);
        }
        void o;
      },
      clear: (_a, _c, o) => {
        o.clear = true;
      },
      exit: (_a, _c, o) => o.text("нельзя выйти из учебного терминала", "dim"),
      history: (_a, _c, o) => {
        const w = String(sh.history.length).length;
        sh.history.forEach((h, i) => o.text(`${" ".repeat(Math.max(1, w + 1 - String(i + 1).length))}${i + 1}  ${h}`));
      },
      help: (_a, _c, o) => {
        o.text("Доступные команды (man <команда> — подробнее):", "dim");
        for (const k of Object.keys(MAN)) o.line({ t: "  " + k.padEnd(9), c: "ok" }, { t: MAN[k][1] });
      },
      man: (a, _c, o) => {
        if (!a.length) return o.err("Какую справочную страницу показать? Например: man ls");
        const m = MAN[a[0]];
        if (!m) return o.err(`Нет справочной страницы для ${a[0]}`);
        o.line({ t: "ИМЯ", c: "ok" });
        o.line({ t: `    ${a[0]}` });
        o.line({ t: "ИСПОЛЬЗОВАНИЕ", c: "ok" });
        o.line({ t: `    ${m[0]}` });
        o.line({ t: "ОПИСАНИЕ", c: "ok" });
        o.line({ t: `    ${m[1]}` });
      },
      which: (a, _c, o) => {
        for (const x of a) {
          if (["cd", "history", "exit", "export"].includes(x)) o.code = 1;
          else if (COMMANDS.includes(x)) o.text(`/usr/bin/${x}`);
          else o.code = 1;
        }
      },
      sudo: (a, c, o) => {
        const args = a.filter((x, i) => !(x === "-E" && i === 0));
        if (!args.length) return o.err("использование: sudo команда");
        if (args[0] === "-i" || args[0] === "-s" || args[0] === "su") {
          return o.err("sudo: интерактивная оболочка root недоступна в учебном терминале; используй sudo <команда>");
        }
        const prev = sh.asRoot;
        sh.asRoot = true;
        try {
          sh.exec(args, c, o);
        } finally {
          sh.asRoot = prev;
        }
      },
      cd: (a, _c, o) => {
        if (a.length > 1) return o.err("cd: слишком много аргументов");
        let target: string;
        let printIt = false;
        if (a.length === 0 || a[0] === "~") target = sh.home;
        else if (a[0] === "-") {
          target = sh.oldpwd;
          printIt = true;
        } else target = a[0].startsWith("~/") ? sh.home + a[0].slice(1) : a[0];
        const abs = sh.norm(target);
        const n = sh.get(abs);
        if (!n) return o.err(`cd: ${E.noent}: ${a[0] ?? target}`);
        if (!n.dir) return o.err(`cd: ${E.notdir}: ${a[0]}`);
        if (!sh.can(n, 1)) return o.err(`cd: ${E.acc}: ${a[0]}`);
        sh.oldpwd = sh.cwd;
        sh.cwd = abs;
        if (printIt) o.text(abs);
      },
      ls: (a, c, o) => sh.ls(a, c, o),
      cat: (a, c, o) => {
        const { f, rest } = flagsOf(a, "n");
        const inputs = readInputs(rest, c, o, "cat");
        let n = 0;
        for (const inp of inputs) {
          for (const l of textLines(inp.text)) {
            if (f.has("n")) o.text(`${String(++n).padStart(6)}  ${l}`);
            else o.lines.push([{ t: l }]);
          }
        }
      },
      echo: (a, _c, o) => {
        let nl = true;
        let esc2 = false;
        let i = 0;
        for (; i < a.length && /^-[neE]+$/.test(a[i]); i++) {
          if (a[i].includes("n")) nl = false;
          if (a[i].includes("e")) esc2 = true;
        }
        let s = a.slice(i).join(" ");
        if (esc2) s = s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
        void nl;
        for (const l of s.split("\n")) o.lines.push([{ t: l }]);
      },
      mkdir: (a, _c, o) => {
        const { f, rest } = flagsOf(a, "p");
        if (!rest.length) return o.err("mkdir: пропущен операнд");
        for (const p of rest) {
          const abs = sh.norm(p);
          if (f.has("p")) {
            let cur = sh.root;
            let ok = true;
            for (const s of abs.split("/").filter(Boolean)) {
              let nx = cur.kids.get(s);
              if (!nx) {
                if (!sh.can(cur, 2)) {
                  o.err(`mkdir: невозможно создать каталог '${p}': ${E.acc}`);
                  ok = false;
                  break;
                }
                nx = sh.newNode(true);
                cur.kids.set(s, nx);
              } else if (!nx.dir) {
                o.err(`mkdir: невозможно создать каталог '${p}': ${E.notdir}`);
                ok = false;
                break;
              }
              cur = nx;
            }
            void ok;
            continue;
          }
          const [pa, nm] = sh.split(abs);
          const parent = sh.get(pa);
          if (sh.get(abs)) o.err(`mkdir: невозможно создать каталог '${p}': файл существует`);
          else if (!parent || !parent.dir) o.err(`mkdir: невозможно создать каталог '${p}': ${E.noent}`);
          else if (!sh.can(parent, 2)) o.err(`mkdir: невозможно создать каталог '${p}': ${E.acc}`);
          else parent.kids.set(nm, sh.newNode(true));
        }
      },
      touch: (a, _c, o) => {
        const { rest } = flagsOf(a, "");
        if (!rest.length) return o.err("touch: пропущен операнд-файл");
        for (const p of rest) {
          const abs = sh.norm(p);
          if (sh.get(abs)) continue;
          const [pa, nm] = sh.split(abs);
          const parent = sh.get(pa);
          if (!parent || !parent.dir) o.err(`touch: невозможно выполнить touch для '${p}': ${E.noent}`);
          else if (!sh.can(parent, 2)) o.err(`touch: невозможно выполнить touch для '${p}': ${E.acc}`);
          else parent.kids.set(nm, sh.newNode(false));
        }
      },
      rm: (a, _c, o) => {
        const { f, rest } = flagsOf(a, "rRf");
        const rec = f.has("r") || f.has("R");
        if (!rest.length) return f.has("f") ? undefined : o.err("rm: пропущен операнд");
        for (const p of rest) {
          const abs = sh.norm(p);
          const n = sh.get(abs);
          const base = p.replace(/\/+$/, "").split("/").pop();
          if (base === "." || base === "..") {
            o.err(`rm: невозможно удалить '${p}': недопустимый аргумент`);
            continue;
          }
          if (abs === "/") {
            o.err("rm: опасно рекурсивно удалять «/»");
            continue;
          }
          if (!n) {
            if (!f.has("f")) o.err(`rm: невозможно удалить '${p}': ${E.noent}`);
            continue;
          }
          if (n.dir && !rec) {
            o.err(`rm: невозможно удалить '${p}': ${E.isdir}`);
            continue;
          }
          const [pa, nm] = sh.split(abs);
          const parent = sh.get(pa) as Node;
          if (!sh.can(parent, 2)) {
            o.err(`rm: невозможно удалить '${p}': ${E.acc}`);
            continue;
          }
          parent.kids.delete(nm);
        }
      },
      rmdir: (a, _c, o) => {
        if (!a.length) return o.err("rmdir: пропущен операнд");
        for (const p of a) {
          const abs = sh.norm(p);
          const n = sh.get(abs);
          if (!n) o.err(`rmdir: не удалось удалить '${p}': ${E.noent}`);
          else if (!n.dir) o.err(`rmdir: не удалось удалить '${p}': ${E.notdir}`);
          else if (n.kids.size) o.err(`rmdir: не удалось удалить '${p}': каталог не пуст`);
          else (sh.get(sh.split(abs)[0]) as Node).kids.delete(sh.name(abs));
        }
      },
      cp: (a, _c, o) => sh.cpmv(a, o, false),
      mv: (a, _c, o) => sh.cpmv(a, o, true),
      grep: (a, c, o) => sh.grep(a, c, o),
      find: (a, _c, o) => sh.find(a, o),
      head: (a, c, o) => sh.headTail(a, c, o, true),
      tail: (a, c, o) => sh.headTail(a, c, o, false),
      wc: (a, c, o) => {
        const { f, rest } = flagsOf(a, "lwc");
        const inputs = readInputs(rest, c, o, "wc");
        let showL = f.has("l");
        let showW = f.has("w");
        let showC = f.has("c") || f.has("m");
        if (!showL && !showW && !showC) showL = showW = showC = true;
        const rows = inputs.map((i) => ({
          name: i.name === "-" ? "" : i.name,
          v: [textLines(i.text).length, i.text.split(/\s+/).filter(Boolean).length, bytes(i.text)],
        }));
        if (rows.length > 1) rows.push({ name: "total", v: [0, 1, 2].map((k) => rows.reduce((s, r) => s + r.v[k], 0)) });
        const sel = [showL, showW, showC];
        const width = rows.length === 1 && sel.filter(Boolean).length === 1 ? 0 : Math.max(1, ...rows.flatMap((r) => r.v.map((x) => String(x).length)));
        for (const r of rows) {
          const nums = r.v.filter((_, i) => sel[i]).map((x) => String(x).padStart(width));
          o.text(nums.join(" ") + (r.name ? " " + r.name : ""));
        }
      },
      sort: (a, c, o) => {
        const { f, rest } = flagsOf(a, "rnu");
        const lines = readInputs(rest, c, o, "sort").flatMap((i) => textLines(i.text));
        const num = (s: string) => {
          const m = /^\s*(-?\d+(?:\.\d+)?)/.exec(s);
          return m ? parseFloat(m[1]) : 0;
        };
        lines.sort((x, y) => (f.has("n") ? num(x) - num(y) || collate(x, y) : collate(x, y)));
        if (f.has("r")) lines.reverse();
        let res = lines;
        if (f.has("u")) res = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
        for (const l of res) o.lines.push([{ t: l }]);
      },
      uniq: (a, c, o) => {
        const { f, rest } = flagsOf(a, "cdu");
        const lines = readInputs(rest.slice(0, 1), c, o, "uniq").flatMap((i) => textLines(i.text));
        const groups: [string, number][] = [];
        for (const l of lines) {
          const g = groups[groups.length - 1];
          if (g && g[0] === l) g[1]++;
          else groups.push([l, 1]);
        }
        for (const [l, n] of groups) {
          if (f.has("d") && n < 2) continue;
          if (f.has("u") && n > 1) continue;
          o.text(f.has("c") ? `${String(n).padStart(7)} ${l}` : l);
        }
      },
      chmod: (a, _c, o) => sh.chmod(a, o),
    };
    cmds.less = cmds.cat;
    cmds.more = cmds.cat;
    cmds.bash = (a, _c, o) => {
      if (!a.length) return o.err("bash: интерактивная оболочка недоступна в учебном терминале");
      const n = sh.get(sh.norm(a[0]));
      if (!n) return o.err(`bash: ${a[0]}: ${E.noent}`, 127);
      if (n.dir) return o.err(`bash: ${a[0]}: ${E.isdir}`, 126);
      if (!sh.can(n, 4)) return o.err(`bash: ${a[0]}: ${E.acc}`, 126);
      o.text("(скрипт выполнен — в учебном терминале запуск не поддерживается)", "dim");
    };
    cmds.sh = cmds.bash;
    return cmds;
  }

  // ----- ls -----
  private ls(args: string[], c: Ctx, o: Out) {
    const { f, rest } = flagsOf(args, "lahA1dr");
    const long = f.has("l");
    const all = f.has("a");
    const almost = f.has("A");
    const hum = f.has("h");
    const paths = rest.length ? rest : ["."];
    type Ent = { name: string; node: Node };
    const fmtLong = (ents: Ent[]): Line[] => {
      const rows = ents.map((e) => ({
        e,
        links: String(e.node.dir ? 2 + [...e.node.kids.values()].filter((k) => k.dir).length : 1),
        size: hum ? human(e.node.dir ? 4096 : bytes(e.node.content)) : String(e.node.dir ? 4096 : bytes(e.node.content)),
      }));
      const wl = Math.max(1, ...rows.map((r) => r.links.length));
      const wo = Math.max(1, ...rows.map((r) => r.e.node.owner.length));
      const wg = Math.max(1, ...rows.map((r) => r.e.node.group.length));
      const ws = Math.max(1, ...rows.map((r) => r.size.length));
      return rows.map((r) => {
        const n = r.e.node;
        return [
          { t: `${modeStr(n)} ${r.links.padStart(wl)} ${n.owner.padEnd(wo)} ${n.group.padEnd(wg)} ${r.size.padStart(ws)} ${MTIME} ` },
          nameSeg(r.e.name, n),
        ];
      });
    };
    const nameSeg = (name: string, n: Node): Seg => ({ t: name, c: n.dir ? "dir" : n.mode & 0o111 ? "exe" : undefined });
    const emit = (ents: Ent[]) => {
      if (long) {
        const blocks = ents.reduce((s, e) => s + (e.node.dir ? 4 : Math.max(4, Math.ceil(bytes(e.node.content) / 4096) * 4)), 0);
        return { total: blocks, lines: fmtLong(ents) };
      }
      return { total: 0, lines: [] as Line[] };
    };
    const short = (ents: Ent[]) => {
      if (!ents.length) return;
      if (c.tty) {
        const segs: Seg[] = [];
        ents.forEach((e, i) => {
          if (i) segs.push({ t: "  " });
          segs.push(nameSeg(e.name, e.node));
        });
        o.line(...segs);
      } else for (const e of ents) o.line(nameSeg(e.name, e.node));
    };
    const files: Ent[] = [];
    const dirs: { disp: string; node: Node; abs: string }[] = [];
    for (const p of paths) {
      const abs = this.norm(p);
      const n = this.get(abs);
      if (!n) {
        o.err(`ls: невозможно получить доступ к '${p}': ${E.noent}`, 2);
        continue;
      }
      if (n.dir && !f.has("d")) dirs.push({ disp: p, node: n, abs });
      else files.push({ name: p, node: n });
    }
    files.sort((x, y) => lsCollate(x.name, y.name));
    if (long) o.lines.push(...fmtLong(files));
    else short(files);
    const header = paths.length > 1;
    dirs.sort((x, y) => lsCollate(x.disp, y.disp));
    dirs.forEach((d, idx) => {
      if (header) {
        if (idx > 0 || files.length) o.line({ t: "" });
        o.line({ t: d.disp + ":" });
      }
      if (!this.can(d.node, 4)) return o.err(`ls: невозможно открыть каталог '${d.disp}': ${E.acc}`, 2);
      let names = this.sortedNames(d.node);
      if (!all && !almost) names = names.filter((x) => !x.startsWith("."));
      else if (almost && !all) names = names.filter((x) => x !== "." && x !== "..");
      let ents: Ent[] = names.map((nm) => ({ name: nm, node: d.node.kids.get(nm) as Node }));
      if (all) {
        const parent = this.get(this.split(d.abs)[0]) as Node;
        ents = [{ name: ".", node: d.node }, { name: "..", node: d.abs === "/" ? d.node : parent }, ...ents];
      }
      if (f.has("r")) ents.reverse();
      if (long) {
        const r = emit(ents);
        o.text(`total ${r.total}`);
        o.lines.push(...r.lines);
      } else short(ents);
    });
  }

  // ----- cp / mv -----
  private cpmv(args: string[], o: Out, move: boolean) {
    const cmd = move ? "mv" : "cp";
    const { f, rest } = flagsOf(args, "rRfa");
    const rec = f.has("r") || f.has("R") || f.has("a");
    if (rest.length < 2) return o.err(rest.length ? `${cmd}: пропущен операнд назначения после '${rest[0]}'` : `${cmd}: пропущен операнд`);
    const dst = rest[rest.length - 1];
    const srcs = rest.slice(0, -1);
    const dAbs = this.norm(dst);
    const dNode = this.get(dAbs);
    if (srcs.length > 1 && (!dNode || !dNode.dir)) return o.err(`${cmd}: целевой объект '${dst}' не является каталогом`);
    for (const s of srcs) {
      const sAbs = this.norm(s);
      const sNode = this.get(sAbs);
      if (!sNode) {
        o.err(`${cmd}: не удалось выполнить stat для '${s}': ${E.noent}`);
        continue;
      }
      if (!move && !this.can(sNode, 4)) {
        o.err(`${cmd}: не удалось открыть '${s}' для чтения: ${E.acc}`);
        continue;
      }
      if (sNode.dir && !move && !rec) {
        o.err(`${cmd}: -r не указан; пропускаю каталог '${s}'`);
        continue;
      }
      let target = dAbs;
      if (dNode && dNode.dir) target = (dAbs === "/" ? "" : dAbs) + "/" + this.name(sAbs);
      if (target === sAbs) {
        o.err(`${cmd}: '${s}' и '${dst}' — один и тот же файл`);
        continue;
      }
      if (sNode.dir && (target + "/").startsWith(sAbs + "/")) {
        o.err(`${cmd}: невозможно ${move ? "переместить" : "скопировать"} '${s}' в свой подкаталог '${dst}'`);
        continue;
      }
      const [tp, tn] = this.split(target);
      const parent = this.get(tp);
      if (!parent || !parent.dir) {
        o.err(`${cmd}: не удалось выполнить stat для '${dst}': ${E.noent}`);
        continue;
      }
      if (!this.can(parent, 2)) {
        o.err(`${cmd}: невозможно создать '${dst}': ${E.acc}`);
        continue;
      }
      const ex = parent.kids.get(tn);
      if (ex && ex.dir && !sNode.dir) {
        o.err(`${cmd}: невозможно перезаписать каталог '${dst}' не каталогом`);
        continue;
      }
      if (ex && !ex.dir && sNode.dir) {
        o.err(`${cmd}: невозможно перезаписать не каталог '${dst}' каталогом '${s}'`);
        continue;
      }
      if (move) {
        (this.get(this.split(sAbs)[0]) as Node).kids.delete(this.name(sAbs));
        parent.kids.set(tn, sNode);
      } else parent.kids.set(tn, this.clone(sNode));
    }
  }

  // ----- grep -----
  private grep(args: string[], c: Ctx, o: Out) {
    let pat: string | null = null;
    const f = new Set<string>();
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "--") {
        files.push(...args.slice(i + 1).filter((_, j) => pat !== null || j > 0));
        if (pat === null && args[i + 1] !== undefined) pat = args[i + 1];
        break;
      }
      if (a === "-e" && i + 1 < args.length) pat = args[++i];
      else if (a.startsWith("--")) {
        if (a === "--recursive") f.add("r");
        else if (a === "--ignore-case") f.add("i");
        else if (a === "--line-number") f.add("n");
        else if (a === "--count") f.add("c");
        else if (a === "--invert-match") f.add("v");
      } else if (a.length > 1 && a[0] === "-" && !/^-\d/.test(a)) for (const ch of a.slice(1)) f.add(ch);
      else if (pat === null) pat = a;
      else files.push(a);
    }
    if (pat === null) return o.err("Использование: grep [ПАРАМЕТР]... ШАБЛОНЫ [ФАЙЛ]...", 2);
    let src: string;
    if (f.has("F")) src = esc(pat);
    else if (f.has("E")) src = pat.replace(/\\</g, "\\b").replace(/\\>/g, "\\b");
    else src = breToJs(pat);
    if (f.has("w")) src = `\\b(?:${src})\\b`;
    let re: RegExp;
    const fl = f.has("i") ? "i" : "";
    try {
      re = new RegExp(src, fl);
    } catch {
      re = new RegExp(esc(pat), fl);
    }
    const reG = new RegExp(re.source, fl + "g");
    const rec = f.has("r") || f.has("R");
    type T = { disp: string; text: string };
    const targets: T[] = [];
    let anyDir = false;
    const addDir = (disp: string, node: Node, abs: string) => {
      for (const nm of this.sortedNames(node)) {
        const k = node.kids.get(nm) as Node;
        const d = disp === "" ? nm : disp.endsWith("/") ? disp + nm : disp + "/" + nm;
        const a = abs === "/" ? "/" + nm : abs + "/" + nm;
        if (k.dir) addDir(d, k, a);
        else if (!this.can(k, 4)) o.err(`grep: ${d}: ${E.acc}`, 2);
        else targets.push({ disp: d, text: k.content });
      }
    };
    if (files.length === 0) {
      if (rec) {
        anyDir = true;
        addDir("", this.get(this.cwd) as Node, this.cwd);
      } else if (c.stdin !== null) targets.push({ disp: "(стандартный ввод)", text: c.stdin });
    } else {
      for (const p of files) {
        const abs = this.norm(p);
        const n = this.get(abs);
        if (!n) o.err(`grep: ${p}: ${E.noent}`, 2);
        else if (n.dir) {
          if (rec) {
            anyDir = true;
            addDir(p, n, abs);
          } else o.err(`grep: ${p}: ${E.isdir}`, 2);
        } else if (!this.can(n, 4)) o.err(`grep: ${p}: ${E.acc}`, 2);
        else targets.push({ disp: p, text: n.content });
      }
    }
    const showName = !f.has("h") && (f.has("H") || targets.length > 1 || anyDir);
    let matched = 0;
    for (const t of targets) {
      const lines = textLines(t.text);
      let cnt = 0;
      const outLines: Line[] = [];
      lines.forEach((l, idx) => {
        const hit = re.test(l);
        if (hit === f.has("v")) return;
        cnt++;
        if (f.has("c") || f.has("l") || f.has("q")) return;
        const segs: Seg[] = [];
        if (showName) segs.push({ t: t.disp, c: "file" }, { t: ":", c: "sep" });
        if (f.has("n")) segs.push({ t: String(idx + 1), c: "ok" }, { t: ":", c: "sep" });
        if (f.has("v")) segs.push({ t: l });
        else {
          let last = 0;
          reG.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = reG.exec(l))) {
            if (m[0] === "") {
              reG.lastIndex++;
              continue;
            }
            if (m.index > last) segs.push({ t: l.slice(last, m.index) });
            segs.push({ t: m[0], c: "hl" });
            last = m.index + m[0].length;
          }
          if (last < l.length) segs.push({ t: l.slice(last) });
          if (!segs.length || (last === 0 && !segs.some((s) => s.c === "hl") && segs.length === 0)) segs.push({ t: l });
        }
        outLines.push(segs);
      });
      matched += cnt;
      if (f.has("q")) continue;
      if (f.has("c")) o.line(...(showName ? [{ t: t.disp, c: "file" as const }, { t: ":", c: "sep" as const }] : []), { t: String(cnt) });
      else if (f.has("l")) {
        if (cnt) o.line({ t: t.disp, c: "file" });
      } else o.lines.push(...outLines);
    }
    if (o.code === 0 && matched === 0) o.code = 1;
  }

  // ----- find -----
  private find(args: string[], o: Out) {
    const paths: string[] = [];
    let i = 0;
    while (i < args.length && !args[i].startsWith("-") && args[i] !== "(" && args[i] !== "!") paths.push(args[i++]);
    if (!paths.length) paths.push(".");
    let nameRe: RegExp | null = null;
    let type: string | null = null;
    let maxd = Infinity;
    let mind = 0;
    for (; i < args.length; i++) {
      const a = args[i];
      if (a === "-name" || a === "-iname") nameRe = globToRe(args[++i] ?? "", a === "-iname" ? "i" : "");
      else if (a === "-type") type = args[++i] ?? null;
      else if (a === "-maxdepth") maxd = parseInt(args[++i] ?? "", 10);
      else if (a === "-mindepth") mind = parseInt(args[++i] ?? "", 10);
      else if (a === "-print") continue;
      else if (a === "-exec" || a === "-delete") return o.err(`find: действие '${a}' недоступно в учебном терминале`);
      else return o.err(`find: неизвестный предикат '${a}'`);
    }
    const visit = (disp: string, n: Node, depth: number, abs: string) => {
      if (depth >= mind) {
        const nm = depth === 0 ? disp.replace(/\/+$/, "").split("/").pop() || disp : disp.split("/").pop() || "";
        const okName = !nameRe || nameRe.test(nm);
        const okType = !type || (type === "d" ? n.dir : type === "f" ? !n.dir : true);
        if (okName && okType) o.text(disp);
      }
      if (!n.dir || depth >= maxd) return;
      if (!this.can(n, 4)) return o.err(`find: '${disp}': ${E.acc}`);
      for (const nm of this.sortedNames(n)) {
        visit(disp.endsWith("/") ? disp + nm : disp + "/" + nm, n.kids.get(nm) as Node, depth + 1, abs === "/" ? "/" + nm : abs + "/" + nm);
      }
    };
    for (const p of paths) {
      const abs = this.norm(p);
      const n = this.get(abs);
      if (!n) o.err(`find: '${p}': ${E.noent}`);
      else visit(p, n, 0, abs);
    }
  }

  // ----- head / tail -----
  private headTail(args: string[], c: Ctx, o: Out, head: boolean) {
    let n = 10;
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "-n" && i + 1 < args.length) n = parseInt(args[++i], 10);
      else if (/^-n\d+$/.test(a)) n = parseInt(a.slice(2), 10);
      else if (/^-\d+$/.test(a)) n = parseInt(a.slice(1), 10);
      else if (a.startsWith("-") && a.length > 1) continue;
      else files.push(a);
    }
    if (!Number.isFinite(n) || n < 0) return o.err(`${head ? "head" : "tail"}: неверное число строк`);
    const inputs: { name: string; text: string }[] = [];
    if (!files.length) {
      if (c.stdin !== null) inputs.push({ name: "", text: c.stdin });
    } else {
      for (const f of files) {
        const nd = this.get(this.norm(f));
        if (!nd) o.err(`${head ? "head" : "tail"}: невозможно открыть '${f}' для чтения: ${E.noent}`);
        else if (nd.dir) o.err(`${head ? "head" : "tail"}: ошибка чтения '${f}': ${E.isdir}`);
        else if (!this.can(nd, 4)) o.err(`${head ? "head" : "tail"}: невозможно открыть '${f}' для чтения: ${E.acc}`);
        else inputs.push({ name: f, text: nd.content });
      }
    }
    inputs.forEach((inp, idx) => {
      if (files.length > 1) {
        if (idx) o.line({ t: "" });
        o.line({ t: `==> ${inp.name} <==`, c: "dim" });
      }
      const ls = textLines(inp.text);
      const sel = head ? ls.slice(0, n) : n === 0 ? [] : ls.slice(-n);
      for (const l of sel) o.lines.push([{ t: l }]);
    });
  }

  // ----- chmod -----
  private chmod(args: string[], o: Out) {
    const rec = args.includes("-R");
    const rest = args.filter((a) => a !== "-R");
    if (rest.length < 2) return o.err(rest.length ? `chmod: пропущен операнд после '${rest[0]}'` : "chmod: пропущен операнд");
    const spec = rest[0];
    const apply = (n: Node): boolean => {
      if (/^[0-7]{1,4}$/.test(spec)) {
        n.mode = parseInt(spec, 8) & 0o7777;
        return true;
      }
      const clauses = spec.split(",");
      let mode = n.mode;
      for (const cl of clauses) {
        const m = /^([ugoa]*)([-+=])([rwxXst]*)$/.exec(cl);
        if (!m) return false;
        const who = m[1] === "" || m[1].includes("a") ? "ugo" : m[1];
        let bits = 0;
        for (const ch of m[3]) {
          if (ch === "r") bits |= 4;
          else if (ch === "w") bits |= 2;
          else if (ch === "x") bits |= 1;
          else if (ch === "X" && (n.dir || mode & 0o111)) bits |= 1;
        }
        for (const w of who) {
          const sh = w === "u" ? 6 : w === "g" ? 3 : 0;
          const mask = 7 << sh;
          if (m[2] === "+") mode |= bits << sh;
          else if (m[2] === "-") mode &= ~(bits << sh);
          else mode = (mode & ~mask) | (bits << sh);
        }
      }
      n.mode = mode;
      return true;
    };
    if (!/^[0-7]{1,4}$/.test(spec) && !spec.split(",").every((x) => /^[ugoa]*[-+=][rwxXst]*$/.test(x))) {
      return o.err(`chmod: неверный режим: '${spec}'`);
    }
    const walk = (n: Node) => {
      apply(n);
      if (rec) for (const k of n.kids.values()) walk(k);
    };
    for (const p of rest.slice(1)) {
      const n = this.get(this.norm(p));
      if (!n) o.err(`chmod: невозможно получить доступ к '${p}': ${E.noent}`);
      else if (this.euser() !== "root" && n.owner !== this.euser()) o.err(`chmod: изменение прав '${p}': Operation not permitted (операция не разрешена; нужен sudo)`);
      else walk(n);
    }
  }
}

function commonPrefix(xs: string[]): string {
  let p = xs[0];
  for (const x of xs) while (!x.startsWith(p)) p = p.slice(0, -1);
  return p;
}

/** Convert a POSIX basic regex (grep default) to a JS regex source. */
function breToJs(p: string): string {
  let s = "";
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === "\\" && i + 1 < p.length) {
      const nx = p[++i];
      if ("|(){}+?".includes(nx)) s += nx;
      else if (nx === "<" || nx === ">") s += "\\b";
      else s += "\\" + nx;
    } else if ("|(){}+?".includes(ch)) s += "\\" + ch;
    else s += ch;
  }
  return s;
}

export const lineText = plain;
