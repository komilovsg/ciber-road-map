// Content contract. Engine renders these blocks; week files only produce data.
// All user-facing strings are Russian.

export type LessonType = "lesson" | "project" | "ctf" | "test";

export type Lesson = {
  n: number; // 1..48, global order
  slug: string; // kebab-case latin, unique, e.g. "binary-and-hex"
  week: number; // 1..8
  title: string; // short title (<= 60 chars)
  type: LessonType;
  minutes: number; // estimated time
  goals: string[]; // 3-5 "после урока ты сможешь…" items
  homework: string; // practice/HW from the plan, expanded
  blocks: Block[];
};

export type Week = {
  week: number;
  module: string; // module name from the plan
  color: string; // metro line color, hex
  summary: string; // 1-2 sentences
  lessons: Lesson[];
};

export type Block =
  // Theory. GitHub-flavoured markdown (tables, lists, `code`, fenced code, **bold**).
  | { kind: "md"; md: string }
  // Highlighted aside.
  | { kind: "callout"; tone: "info" | "tip" | "warn" | "legal"; title?: string; md: string }
  // Static code listing with optional caption.
  | { kind: "code"; lang: "python" | "bash" | "sql" | "html" | "js" | "http" | "text"; code: string; caption?: string }
  // Quiz. answer = index(es) into options. multi=true → checkboxes.
  | { kind: "quiz"; title?: string; questions: QuizQuestion[] }
  // Runnable Python (Pyodide in browser). Student edits starter, presses "Проверить".
  // `tests` is Python appended after student code; any AssertionError → fail with its message.
  // Use assert ..., "сообщение на русском". stdin is not available: never call input() in tests;
  // if the task teaches input(), provide `stdin` lines which input() will return in order.
  | { kind: "python"; title: string; task: string; starter: string; tests?: string; solution: string; hints?: string[]; stdin?: string[] }
  // Simulated Linux terminal over a virtual FS. Tasks complete when `check` matches.
  | { kind: "terminal"; title: string; intro?: string; fs: VfsDir; cwd?: string; user?: string; tasks: TerminalTask[] }
  // SQLite in browser (sql.js). `setup` SQL runs first. Each task compares result rows to expected query rows.
  | { kind: "sql"; title: string; setup: string; tasks: { prompt: string; expected: string; hint?: string }[] }
  // Flip cards: term → definition.
  | { kind: "flashcards"; title?: string; cards: { front: string; back: string }[] }
  // Drag/tap to match left items to right items (pairs given in correct order; UI shuffles).
  | { kind: "match"; title: string; pairs: { left: string; right: string }[] }
  // Put steps in correct order (given in correct order; UI shuffles).
  | { kind: "order"; title: string; items: string[] }
  // Sort items into buckets.
  | { kind: "sort"; title: string; buckets: string[]; items: { text: string; bucket: number }[] }
  // Free-text answer checked against accepted values (trimmed, case-insensitive). Good for flags, decoded strings, numbers.
  | { kind: "answer"; title: string; prompt: string; accept: string[]; hint?: string; explain?: string }
  // Built-in interactive widgets (implemented by the engine).
  | { kind: "widget"; widget: WidgetName; props?: Record<string, unknown> }
  // Off-site practice (CTF platforms etc.). Steps are a checklist saved in progress.
  | { kind: "external"; title: string; url: string; platform: string; steps: string[]; md?: string };

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number | number[];
  multi?: boolean;
  explain: string; // shown after answering
};

export type TerminalTask = {
  prompt: string; // what to do, Russian
  // Completed when the entered command line matches regex `command` (if set)
  // AND/OR printed output contains `output` (if set) AND/OR cwd equals `cwd` (if set). All set fields must hold.
  check: { command?: string; output?: string; cwd?: string };
  hint?: string;
};

// Virtual FS: directory = object, file = string content. Mode/owner via "__meta" optional.
export type VfsDir = { [name: string]: VfsDir | string };

export type WidgetName =
  | "base-converter" // bin/dec/hex converter + "переведи число" game. props: { rounds?: number }
  | "caesar" // Caesar wheel: shift slider, encrypt/decrypt, brute-force table. props: { ciphertext?: string }
  | "vigenere" // Vigenère encrypt/decrypt playground
  | "xor" // XOR bit-by-bit visualizer of two bytes / text with key
  | "hash" // live SHA-256/SHA-1/MD5-like demo via WebCrypto (SHA-1/256/512), salt toggle, avalanche effect
  | "password-strength" // entropy meter + estimated crack time, never sends anything
  | "encoder" // mini-CyberChef: Base64, hex, URL, binary encode/decode chain
  | "tcp-handshake" // animated SYN / SYN-ACK / ACK + packet journey through TCP/IP layers
  | "http-builder" // compose method/path/headers → see raw request and simulated response with status code
  | "dns-resolver" // animated DNS resolution steps (browser → resolver → root → TLD → authoritative)
  | "port-scan" // simulated nmap scan of a fictional lab host; shows open/closed/filtered
  | "packet-capture" // fake Wireshark table of a captured HTTP login; find the password
  | "sqli-lab" // vulnerable login form simulation: shows the built SQL query live, then toggles parameterized fix
  | "xss-lab" // comment form sandbox: shows unsafe innerHTML vs escaped output (sandboxed, no real script exec)
  | "jwt" // decode a JWT (header/payload/signature), tamper and see signature fail
  | "phishing" // spot-the-red-flags game on fake emails (tap suspicious parts)
  | "cia-triad" // classify incidents into Confidentiality/Integrity/Availability
  | "chmod" // rwx permission grid ↔ octal (755) ↔ symbolic
  | "log-analyzer"; // auth.log viewer: filter, count failed logins per IP, spot brute force

export type Locale = "ru" | "tj";
export const locales: Locale[] = ["ru", "tj"];

// YouTube video attached to a lesson (curated in content/videos.ts, keyed by lesson slug).
export type Video = { id: string; title: string; channel: string; lang: "ru" | "tj" | "en"; minutes?: number };
