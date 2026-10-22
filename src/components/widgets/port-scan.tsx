"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { WidgetFrame, shake } from "@/components/ui/frames";
import { IconShield, IconWarn, IconTerminal } from "@/icons";

type State = "open" | "closed" | "filtered";
type PortInfo = { state: State; service: string; version?: string };

const HOST = "10.0.0.5";
const PORTS: Record<number, PortInfo> = {
  21: { state: "closed", service: "ftp" },
  22: { state: "open", service: "ssh", version: "OpenSSH 8.9p1 Ubuntu 3ubuntu0.6 (Ubuntu Linux; protocol 2.0)" },
  23: { state: "closed", service: "telnet" },
  25: { state: "closed", service: "smtp" },
  80: { state: "open", service: "http", version: "nginx 1.18.0 (Ubuntu)" },
  135: { state: "filtered", service: "msrpc" },
  139: { state: "filtered", service: "netbios-ssn" },
  443: { state: "open", service: "ssl/http", version: "nginx 1.18.0 (Ubuntu)" },
  445: { state: "filtered", service: "microsoft-ds" },
  3306: { state: "filtered", service: "mysql" },
  3389: { state: "closed", service: "ms-wbt-server" },
  5432: { state: "closed", service: "postgresql" },
  8080: { state: "open", service: "http-proxy", version: "Squid http proxy 5.7" },
  48080: { state: "open", service: "http", version: "Node.js Express framework" },
};
const TOP1000_MAX = 10000; // ports above this (48080) are not in nmap's top 1000

type Mode = { id: string; cmd: string; ports: number[] | "top" | "all"; sv: boolean; secs: number; slow?: boolean };

const MODES: Record<string, Mode> = {
  default: { id: "default", cmd: `nmap ${HOST}`, ports: "top", sv: false, secs: 0.14 },
  sT: { id: "sT", cmd: `nmap -sT ${HOST}`, ports: "top", sv: false, secs: 0.16 },
  sV: { id: "sV", cmd: `nmap -sV ${HOST}`, ports: "top", sv: true, secs: 6.82 },
  all: { id: "all", cmd: `nmap -p- ${HOST}`, ports: "all", sv: false, secs: 14.37, slow: true },
};

function parseRange(spec: string): number[] | null {
  const out = new Set<number>();
  const parts = spec.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  for (const p of parts) {
    const m = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(p);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > 65535 || a > b) return null;
    for (let i = a; i <= b; i++) out.add(i);
  }
  return [...out].sort((x, y) => x - y);
}

const NAMES: Record<number, string> = { 20: "ftp-data", 24: "priv-mail", 53: "domain", 110: "pop3", 111: "rpcbind", 143: "imap", 8443: "https-alt" };
const infoOf = (p: number): PortInfo => PORTS[p] ?? { state: "closed", service: NAMES[p] ?? "unknown" };

type Line = { text: string; kind?: "cmd" | "dim" | "open" | "filtered" | "closed" | "head" };

function buildScript(mode: Mode, list: number[] | null, cmdText: string): { t: number; line?: Line; progress?: number }[] {
  const total = mode.ports === "all" ? 65535 : mode.ports === "top" ? 1000 : list!.length;
  const scanned: number[] =
    mode.ports === "all"
      ? Object.keys(PORTS).map(Number)
      : mode.ports === "top"
        ? Object.keys(PORTS).map(Number).filter((p) => p <= TOP1000_MAX)
        : list!.filter((p) => p in PORTS);
  const rows = scanned.sort((a, b) => a - b).map((p) => ({ p, ...infoOf(p) }));
  const showAll = mode.ports !== "all" && mode.ports !== "top" && total <= 25;
  const noteworthy = showAll
    ? (mode.ports as number[]).map((p) => ({ p, ...infoOf(p) }))
    : rows.filter((r) => r.state !== "closed");
  const hidden = total - noteworthy.length;
  const hiddenClosed = showAll ? 0 : hidden;

  const wPort = Math.max(4, ...noteworthy.map((r) => `${r.p}/tcp`.length)) + 1;
  const wState = Math.max(5, ...noteworthy.map((r) => r.state.length)) + 1;
  const wSvc = Math.max(7, ...noteworthy.map((r) => r.service.length)) + 1;
  const hdr = "PORT".padEnd(wPort) + "STATE".padEnd(wState) + (mode.sv ? "SERVICE".padEnd(wSvc) + "VERSION" : "SERVICE");

  const lines: Line[] = [
    { text: "Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-23 10:00 +05", kind: "dim" },
    { text: `Nmap scan report for lab-vm.local (${HOST})` },
    { text: "Host is up (0.00042s latency)." },
  ];
  if (hiddenClosed > 0) lines.push({ text: `Not shown: ${hiddenClosed} closed tcp ports (conn-refused)`, kind: "dim" });
  if (noteworthy.length) {
    lines.push({ text: hdr, kind: "head" });
    for (const r of noteworthy) {
      const base = `${r.p}/tcp`.padEnd(wPort) + r.state.padEnd(wState);
      lines.push({
        text: mode.sv ? base + r.service.padEnd(wSvc) + (r.state === "open" ? (r.version ?? "") : "") : base + r.service,
        kind: r.state,
      });
    }
  } else {
    lines.push({ text: "All scanned ports are closed (conn-refused)", kind: "dim" });
  }
  if (mode.sv) {
    lines.push({ text: "" });
    lines.push({ text: "Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .", kind: "dim" });
    lines.push({ text: "Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel", kind: "dim" });
  }
  const secs = mode.secs + (mode.ports !== "all" && mode.ports !== "top" ? total * 0.0001 : 0);
  lines.push({ text: "" });
  lines.push({ text: `Nmap done: 1 IP address (1 host up) scanned in ${secs.toFixed(2)} seconds`, kind: "dim" });

  const script: { t: number; line?: Line; progress?: number }[] = [{ t: 0, line: { text: `$ ${cmdText}`, kind: "cmd" } }];
  let t = 350;
  const slowHead = mode.slow ? 3 : 3;
  lines.forEach((l, i) => {
    if (i === slowHead && mode.ports === "all") {
      for (let k = 1; k <= 20; k++) script.push({ t: t + k * 140, progress: k * 5 });
      t += 20 * 140 + 200;
    } else if (i === slowHead && mode.sv) {
      for (let k = 1; k <= 8; k++) script.push({ t: t + k * 120, progress: k * 12.5 });
      t += 8 * 120 + 150;
    }
    script.push({ t, line: l });
    t += l.kind === "open" || l.kind === "filtered" || l.kind === "closed" ? 260 : 220;
  });
  script.push({ t: t + 60 });
  return script;
}

const LINE_COLOR: Record<string, string> = {
  cmd: "var(--code-ink)",
  dim: "#8d97a8",
  head: "#9db0ff",
  open: "#4ee0a8",
  filtered: "#ffc24d",
  closed: "#ff8087",
};

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [custom, setCustom] = useState("20-25,80");
  const [customSv, setCustomSv] = useState(false);
  const [err, setErr] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const el = paneRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const start = (mode: Mode, list: number[] | null, cmdText: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLines([]);
    setRunning(true);
    setProgress(null);
    const script = buildScript(mode, list, cmdText);
    const last = script[script.length - 1].t;
    for (const s of script) {
      timers.current.push(
        setTimeout(() => {
          if (s.line) setLines((l) => [...l, s.line!]);
          if (s.progress !== undefined) setProgress(s.progress);
          if (s.t === last) {
            setRunning(false);
            setProgress(null);
          }
        }, s.t),
      );
    }
  };

  const runCustom = () => {
    const list = parseRange(custom);
    if (!list) {
      setErr(true);
      return;
    }
    setErr(false);
    const spec = custom.replace(/\s+/g, "");
    start({ id: "custom", cmd: "", ports: list, sv: customSv, secs: customSv ? 6.5 : 0.03 }, list, `nmap ${customSv ? "-sV " : ""}-p ${spec} ${HOST}`);
  };

  return (
    <WidgetFrame
      title="Сканирование портов (nmap)"
      hint="Выбери тип сканирования и посмотри, как выглядит вывод nmap. Это симуляция: никакие пакеты не отправляются."
    >
      <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-xp/50 bg-xp/10 p-3 text-sm leading-relaxed">
        <IconWarn size={18} className="mt-0.5 shrink-0" />
        <p>
          <strong>Сканируй только свои машины и лабораторные стенды, где это разрешено.</strong> Сканирование чужих хостов без разрешения может быть нарушением закона.
        </p>
      </div>

      <div className="rounded-[10px] border border-line bg-paper p-3">
        <div className="flex items-center gap-2 text-sm">
          <IconTerminal size={16} />
          <span className="font-mono font-semibold">{HOST}</span>
          <span className="text-muted">лабораторная VM, не настоящий хост</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {Object.values(MODES).map((m) => (
          <button key={m.id} type="button" className="btn btn-sm font-mono" disabled={running} onClick={() => start(m, null, m.cmd)}>
            {m.cmd.replace(` ${HOST}`, "")}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (!running) runCustom();
        }}
      >
        <label className="block flex-1">
          <span className="label">Свой диапазон портов (-p), например 1-1024 или 22,80,443</span>
          <motion.input
            animate={err ? shake : undefined}
            className="input mono w-full"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setErr(false);
            }}
            aria-invalid={err}
            spellCheck={false}
            style={err ? { borderColor: "var(--bad)" } : undefined}
          />
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" checked={customSv} onChange={(e) => setCustomSv(e.target.checked)} className="h-4 w-4" /> -sV
        </label>
        <button type="submit" className="btn btn-primary" disabled={running}>Сканировать</button>
      </form>
      <p className="mt-1 min-h-5 text-sm text-bad" aria-live="polite">{err ? "Формат: числа 1-65535, через запятую, диапазон через дефис (20-25,80)." : ""}</p>

      <div className="overflow-hidden rounded-[10px]" style={{ background: "var(--code-bg)" }}>
        <div className="flex items-center justify-between px-3 py-1.5 font-mono text-xs" style={{ color: "#8d97a8" }}>
          <span>терминал (симуляция)</span>
          {running && <span aria-live="polite">сканирую…</span>}
        </div>
        <div
          ref={paneRef}
          role="log"
          aria-label="Вывод nmap"
          tabIndex={0}
          className="scroll-x px-3 pb-3 font-mono text-[12.5px] leading-relaxed sm:text-[13px]"
          style={{ minHeight: 160, maxHeight: 320, overflow: "auto", color: "var(--code-ink)" }}
        >
          {lines.length === 0 && <div style={{ color: "#8d97a8" }}>Нажми кнопку сканирования, например «nmap», и вывод появится здесь.</div>}
          {lines.map((l, i) => (
            <pre key={i} className="m-0 whitespace-pre font-[inherit]" style={{ color: l.kind ? LINE_COLOR[l.kind] : "var(--code-ink)", minHeight: "1.5em", fontWeight: l.kind === "head" ? 600 : 400 }}>
              {l.text}
            </pre>
          ))}
          {progress !== null && (
            <div className="mt-2 flex items-center gap-2" style={{ color: "#8d97a8" }}>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "#262d3a" }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#6e83ff", transition: "width .14s linear" }} />
              </div>
              <span className="w-10 text-right text-xs">{Math.round(progress)}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Легенда состояний">
        <div className="rounded-[10px] border border-ok/40 bg-ok/10 p-3">
          <div className="text-sm font-semibold text-ok">open: открыт</div>
          <p className="mt-1 text-sm leading-relaxed">Программа слушает порт и ответила (SYN-ACK). Это поверхность атаки.</p>
        </div>
        <div className="rounded-[10px] border border-bad/40 bg-bad/10 p-3">
          <div className="text-sm font-semibold text-bad">closed: закрыт</div>
          <p className="mt-1 text-sm leading-relaxed">Хост отвечает, но на порту никто не слушает (RST). Значит, хост жив.</p>
        </div>
        <div className="rounded-[10px] border border-xp/50 bg-xp/10 p-3">
          <div className="text-sm font-semibold">filtered: фильтруется</div>
          <p className="mt-1 text-sm leading-relaxed">Ответа нет: пакеты отбрасывает файрвол. Неясно, есть ли за ним сервис.</p>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border border-line p-4">
        <h4 className="mb-1 flex items-center gap-2 font-display text-base font-semibold"><IconShield size={18} /> Что означает для защитника</h4>
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed">
          <li>Каждый open-порт это сервис, который нужно обновлять и настраивать. Лишний сервис нужно отключить.</li>
          <li>Баннер и версия (-sV, например nginx 1.18.0) позволяют атакующему искать известные уязвимости именно этой версии.</li>
          <li>3306/tcp (MySQL) в состоянии filtered: правильно, база не должна быть видна из сети.</li>
          <li>Порт 48080 есть только в скане <code className="font-mono">-p-</code>: стандартный скан смотрит лишь 1000 популярных портов, а забытые сервисы живут на нестандартных.</li>
          <li>Сканируй собственную инфраструктуру регулярно: найди то, что видит атакующий, раньше него.</li>
        </ul>
      </div>
    </WidgetFrame>
  );
}
