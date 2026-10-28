"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { WidgetFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconX, IconShield, IconTerminal } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { ATTACKER, LOG_LINES, failedByIp } from "./_lib/auth-log";

const CHIPS = ["Failed", "Accepted", "root", "invalid user"];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Marked({ line, terms }: { line: string; terms: string[] }) {
  const ts = terms.filter(Boolean);
  if (!ts.length) return <>{line}</>;
  const parts = line.split(new RegExp(`(${ts.map(esc).join("|")})`, "i"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? <mark key={i} className="rounded-sm px-0.5" style={{ background: "#fbbf24", color: "#1c1b22" }}>{p}</mark> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const { solved, solve } = useBlockProgress();
  const [q, setQ] = useState("");
  const [ip, setIp] = useState<string | null>(null);
  const [ans, setAns] = useState("");
  const [state, setState] = useState<"idle" | "wrong" | "ok">(solved ? "ok" : "idle");
  const [tries, setTries] = useState(0);

  const stats = useMemo(() => failedByIp(LOG_LINES), []);
  const max = stats[0]?.[1] ?? 1;

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return LOG_LINES.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => (!ql || l.toLowerCase().includes(ql)) && (!ip || l.includes(ip)));
  }, [q, ip]);

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (ans.trim() === ATTACKER) {
      setState("ok");
      if (!solved) solve();
    } else {
      setState("wrong");
      setTries((t) => t + 1);
    }
  };

  return (
    <WidgetFrame
      title="Анализ auth.log: найди атакующего"
      hint="Лог SSH-сервера web01 (учебные данные, IP из зарезервированных для документации диапазонов). Фильтруй, считай неудачные входы, найди брутфорс."
      solved={solved}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="log-q" className="label">Фильтр (подстрока, без учёта регистра)</label>
          <input id="log-q" className="input mono mt-1 w-full" value={q} onChange={(e) => setQ(e.target.value)} spellCheck={false} placeholder="например Failed" />
        </div>
        {(q || ip) && <button type="button" className="btn btn-ghost" onClick={() => { setQ(""); setIp(null); }}>Сбросить</button>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Быстрые фильтры">
        {CHIPS.map((c) => (
          <button key={c} type="button" aria-pressed={q === c} className={`btn btn-sm mono ${q === c ? "btn-primary" : "btn-ghost"}`} onClick={() => setQ(q === c ? "" : c)}>
            {c}
          </button>
        ))}
      </div>

      <p className="label mb-1 mt-4 flex items-center gap-2">
        <IconTerminal size={14} /> /var/log/auth.log — показано {rows.length} из {LOG_LINES.length}
        {ip && <span className="chip">IP: {ip}</span>}
      </p>
      <div className="max-h-72 overflow-auto rounded-[10px] py-2 font-mono text-[12px] leading-[1.6]" style={{ background: "var(--code-bg)", color: "var(--code-ink)" }} tabIndex={0} role="region" aria-label="Содержимое лога">
        <div className="min-w-max">
          {rows.length === 0 && <p className="px-3 py-2 opacity-70">Ничего не найдено.</p>}
          {rows.map(({ l, n }) => (
            <div key={n} className="flex whitespace-pre px-2">
              <span className="mr-3 inline-block w-7 shrink-0 select-none text-right opacity-50">{n}</span>
              <span><Marked line={l} terms={[q.trim(), ip ?? ""]} /></span>
            </div>
          ))}
        </div>
      </div>

      <h4 className="mt-5 font-display text-[15px] font-semibold">Неудачные входы по IP</h4>
      <p className="mb-2 text-xs text-muted">Нажми на строку, чтобы отфильтровать лог по этому адресу.</p>
      <ul className="space-y-1.5">
        {stats.map(([addr, n]) => (
          <li key={addr}>
            <button
              type="button"
              onClick={() => setIp(ip === addr ? null : addr)}
              aria-pressed={ip === addr}
              className={`flex min-h-[44px] w-full items-center gap-2 rounded-[10px] border px-2 text-left ${ip === addr ? "border-accent bg-accent/10" : "border-line hover:border-muted"}`}
            >
              <span className="w-[8.5rem] shrink-0 font-mono text-[12.5px] sm:w-36">{addr}</span>
              <span className="relative h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-line/60">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${(n / max) * 100}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </span>
              <span className="w-7 shrink-0 text-right font-mono text-sm font-semibold">{n}</span>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={check} className="mt-5 rounded-[14px] border border-line bg-paper p-4">
        <label htmlFor="log-ans" className="font-semibold">Какой IP атакует?</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input id="log-ans" className="input mono min-w-[10rem] flex-1" value={ans} onChange={(e) => { setAns(e.target.value); if (state === "wrong") setState("idle"); }} placeholder="x.x.x.x" inputMode="decimal" autoComplete="off" disabled={state === "ok"} />
          <motion.button key={tries} type="submit" className="btn btn-primary" disabled={state === "ok" || !ans.trim()} animate={state === "wrong" ? shake : undefined}>
            Проверить
          </motion.button>
        </div>
        <div aria-live="polite">
          {state === "wrong" && <p className="mt-2 flex items-center gap-2 text-sm text-bad"><IconX size={16} /> Не тот адрес. Ищи IP с аномально большим числом неудачных входов подряд.</p>}
          {state === "ok" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
              <p className="flex items-center gap-2 font-semibold text-ok"><DrawCheck /> Верно: {ATTACKER} перебирает пароли для root, admin, oracle, test.</p>
              <div className="mt-3 rounded-[10px] bg-ok/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold"><IconShield size={16} className="text-ok" /> Заметки защитника</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                  <li><b>fail2ban</b>: автоматически банит IP после N неудачных попыток.</li>
                  <li>Вход только по ключам: <code className="font-mono">PasswordAuthentication no</code>, брутфорс паролей теряет смысл.</li>
                  <li>Запрет входа root: <code className="font-mono">PermitRootLogin no</code>, вход под обычным пользователем и sudo.</li>
                  <li>Ограничение частоты (rate limiting), нестандартный порт или VPN, MFA, оповещения о всплесках неудач.</li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </form>
    </WidgetFrame>
  );
}
