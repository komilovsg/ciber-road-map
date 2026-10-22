"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DrawCheck, WidgetFrame, shake } from "@/components/ui/frames";
import { IconBulb, IconChevron, IconLock, IconWarn } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { PACKETS, PASSWORD, applyFilter, type Packet, type TreeNode } from "./_lib/capture-data";

const PROTO_COLOR: Record<string, string> = {
  ARP: "#FF8A00",
  DNS: "#00A3A3",
  TCP: "#7A5CFF",
  HTTP: "#1FA35B",
  "TLSv1.3": "#E0359B",
};

function Tree({ nodes, depth, expanded, toggle, sel, onSel, path }: { nodes: TreeNode[]; depth: number; expanded: Set<string>; toggle: (k: string) => void; sel: string | null; onSel: (k: string, n: TreeNode) => void; path: string }) {
  return (
    <ul role={depth === 0 ? "tree" : "group"} className="m-0 list-none p-0">
      {nodes.map((n, i) => {
        const key = `${path}/${i}`;
        const has = !!n.children?.length;
        const open = expanded.has(key);
        return (
          <li key={key} role="treeitem" aria-expanded={has ? open : undefined} aria-selected={sel === key}>
            <div className="flex items-start" style={{ paddingLeft: depth * 14 }}>
              {has ? (
                <button type="button" onClick={() => toggle(key)} aria-label={open ? "Свернуть" : "Развернуть"} className="grid h-7 w-6 shrink-0 place-items-center text-muted">
                  <IconChevron size={13} className={`transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => {
                  onSel(key, n);
                  if (has) toggle(key);
                }}
                className={`min-h-7 flex-1 rounded px-1 py-0.5 text-left font-mono text-[12.5px] leading-snug ${sel === key ? "bg-accent/20" : "hover:bg-paper"}`}
              >
                {n.label}
              </button>
            </div>
            {has && open && <Tree nodes={n.children!} depth={depth + 1} expanded={expanded} toggle={toggle} sel={sel} onSel={onSel} path={key} />}
          </li>
        );
      })}
    </ul>
  );
}

function Details({ pkt }: { pkt: Packet }) {
  // Remounted per packet (key), so initial state is per packet: expand the top-level layers.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([`/${pkt.tree.length - 1}`]));
  const [sel, setSel] = useState<string | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);
  const toggle = (k: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  return (
    <>
      <div className="min-w-0">
        <div className="label mb-1">Детали пакета</div>
        <div className="scroll-x rounded-[10px] border border-line bg-card p-1.5" style={{ maxHeight: 260, overflow: "auto" }} tabIndex={0} aria-label="Дерево протоколов">
          <Tree nodes={pkt.tree} depth={0} expanded={expanded} toggle={toggle} sel={sel} onSel={(k, n) => { setSel(k); setRange(n.range ?? null); }} path="" />
        </div>
      </div>
      <Hex pkt={pkt} range={range} />
    </>
  );
}

function Hex({ pkt, range }: { pkt: Packet; range: [number, number] | null }) {
  const rows = Math.ceil(pkt.bytes.length / 16);
  return (
    <div className="min-w-0">
      <div className="label mb-1">Байты (hex и ASCII)</div>
      <div className="rounded-[10px]" style={{ background: "var(--code-bg)", maxHeight: 260, overflow: "auto" }} tabIndex={0} aria-label="Дамп пакета в шестнадцатеричном виде">
        <pre className="m-0 w-max px-3 py-2 font-mono text-[12px] leading-[1.55]" style={{ color: "var(--code-ink)" }}>
          {Array.from({ length: rows }, (_, r) => {
            const slice = pkt.bytes.slice(r * 16, r * 16 + 16);
            const inR = (i: number) => range && r * 16 + i >= range[0] && r * 16 + i < range[1];
            return (
              <div key={r}>
                <span style={{ color: "#8d97a8" }}>{(r * 16).toString(16).padStart(4, "0")}</span>
                {"  "}
                {slice.map((b, i) => (
                  <span key={i} style={inR(i) ? { background: "color-mix(in srgb, #6e83ff 55%, transparent)", borderRadius: 2 } : undefined}>
                    {b.toString(16).padStart(2, "0")}
                    {i === 7 ? "  " : " "}
                  </span>
                ))}
                {slice.length < 16 ? " ".repeat((16 - slice.length) * 3 + (slice.length <= 7 ? 1 : 0)) : ""}
                {" "}
                {slice.map((b, i) => (
                  <span key={i} style={inR(i) ? { background: "color-mix(in srgb, #6e83ff 55%, transparent)", borderRadius: 2 } : undefined}>
                    {b >= 32 && b < 127 ? String.fromCharCode(b) : "."}
                  </span>
                ))}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const { solved, solve } = useBlockProgress();
  const [filter, setFilter] = useState("");
  const [selNo, setSelNo] = useState<number>(1);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState(false);

  const { list, error } = useMemo(() => applyFilter(filter), [filter]);
  const pkt = PACKETS.find((p) => p.no === selNo) ?? PACKETS[0];
  const success = done || solved;

  const check = () => {
    if (answer.trim() === PASSWORD) {
      setDone(true);
      setWrong(0);
      if (!solved) solve();
    } else {
      setWrong((w) => w + 1);
    }
  };

  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, no: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelNo(no);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const el = (e.key === "ArrowDown" ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLElement | null;
      if (el) {
        el.focus();
        const n = Number(el.dataset.no);
        if (n) setSelNo(n);
      }
    }
  };

  return (
    <WidgetFrame
      title="Анализ трафика (как в Wireshark)"
      hint="Перед тобой симуляция захвата пакетов из домашней сети: пользователь заходит в интернет-магазин. Выбирай пакеты, раскрывай протоколы и фильтруй список."
      solved={success}
    >
      <div className="mb-4 flex items-start gap-2 rounded-[10px] border border-xp/50 bg-xp/10 p-3 text-sm leading-relaxed">
        <IconWarn size={18} className="mt-0.5 shrink-0" />
        <p>Перехватывай трафик только в своей сети или в лаборатории. Чужой трафик без разрешения читать нельзя.</p>
      </div>

      <div className="rounded-[10px] border border-line bg-paper p-3">
        <label className="block">
          <span className="label">Фильтр отображения</span>
          <input
            className="input mono w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="http, tcp, dns, !tcp, ip.addr==203.0.113.80, tcp.port==80"
            spellCheck={false}
            autoCapitalize="off"
            aria-invalid={error}
            style={error ? { borderColor: "var(--bad)", background: "color-mix(in srgb, var(--bad) 10%, var(--card))" } : undefined}
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["http", "tcp", "dns", "!tcp", "ip.addr==203.0.113.80", "tcp.port==443"].map((f) => (
            <button key={f} type="button" className="btn btn-sm btn-ghost font-mono text-[12px]" onClick={() => setFilter(f)}>{f}</button>
          ))}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFilter("")}>сбросить</button>
        </div>
        <p className="mt-1 text-xs text-muted" aria-live="polite">
          {error ? "Неверное выражение фильтра: показаны все пакеты." : `Показано ${list.length} из ${PACKETS.length}. Поддерживаются and/or/!, скобки, http.request.method == "POST", frame contains "текст".`}
        </p>
      </div>

      <div className="mt-3">
        <div className="label mb-1">Список пакетов</div>
        <div className="rounded-[10px] border border-line bg-card" style={{ maxHeight: 280, overflow: "auto" }}>
          <table className="w-full min-w-[640px] border-collapse text-left font-mono text-[12px]" role="grid" aria-label="Список пакетов">
            <thead className="sticky top-0 z-10 bg-paper">
              <tr className="text-muted">
                {["No.", "Time", "Source", "Destination", "Protocol", "Length", "Info"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap border-b border-line px-2 py-1.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const on = p.no === pkt.no;
                const c = PROTO_COLOR[p.proto] ?? "var(--muted)";
                return (
                  <tr
                    key={p.no}
                    data-no={p.no}
                    tabIndex={0}
                    aria-selected={on}
                    onClick={() => setSelNo(p.no)}
                    onKeyDown={(e) => onRowKey(e, p.no)}
                    className={`cursor-pointer border-b border-line/60 ${on ? "bg-accent/20" : "hover:bg-paper"}`}
                    style={{ boxShadow: `inset 3px 0 0 ${c}` }}
                  >
                    <td className="px-2 py-1.5 pl-3">{p.no}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">{p.time}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">{p.src}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">{p.dst}</td>
                    <td className="px-2 py-1.5 font-semibold" style={{ color: c }}>{p.proto}</td>
                    <td className="px-2 py-1.5">{p.len}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">{p.info}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-muted">Нет пакетов, подходящих под фильтр.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Details key={pkt.no} pkt={pkt} />
      </div>

      <div className="mt-6 rounded-[10px] border border-line p-4">
        <h4 className="mb-1 font-display text-base font-semibold">Задание</h4>
        <p className="text-[15px] leading-relaxed">Найди пароль, который пользователь отправил на сайт. Введи его точно, с учётом регистра.</p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <motion.input
            key={wrong}
            animate={wrong ? shake : undefined}
            className="input mono flex-1"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            aria-label="Найденный пароль"
            placeholder="пароль"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={success}
          />
          <button type="submit" className="btn btn-primary" disabled={success}>Проверить</button>
          <button type="button" className="btn" onClick={() => setHint(true)} disabled={success}>
            <IconBulb size={16} /> Подсказка
          </button>
        </form>
        <div aria-live="polite">
          {wrong > 0 && !success && <p className="mt-2 text-sm text-bad">Это не тот пароль. Посмотри содержимое пакетов, в которых пользователь что-то отправляет серверу.</p>}
          {hint && !success && (
            <div className="mt-3 rounded-lg bg-accent/10 p-3 text-sm leading-relaxed">
              Пароль передаётся методом POST по обычному HTTP. Отфильтруй такие запросы:{" "}
              <code className="font-mono">http.request.method == POST</code>
              {" "}
              <button type="button" className="btn btn-sm ml-1" onClick={() => setFilter("http.request.method == POST")}>Применить фильтр</button>
              <div className="mt-1 text-muted">Запросов POST два, смотри в деталях HTTP, где форма (Form item).</div>
            </div>
          )}
        </div>
        <AnimatePresence initial={false}>
          {success && (
            <motion.div initial={solved && !done ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-[10px] border border-ok/40 bg-ok/10 p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-ok"><DrawCheck size={22} /> Верно: {PASSWORD}</div>
              <p className="text-[15px] leading-relaxed">
                Пароль лежал в открытом виде в теле HTTP-запроса. Любой, кто видит трафик (общий Wi-Fi, взломанный роутер, провайдер), прочитает его так же легко, как ты.
              </p>
              <p className="mt-2 flex items-start gap-2 text-[15px] leading-relaxed">
                <IconLock size={18} className="mt-0.5 shrink-0" />
                <span>
                  Теперь посмотри пакеты 25–31 (фильтр <code className="font-mono">tcp.port==443</code>): это HTTPS. Виден только Client Hello с именем сайта и затем Application Data, зашифрованный набор байтов. HTTPS (TLS) шифрует содержимое, поэтому пароль, куки и страницы недоступны наблюдателю. Всегда проверяй замок и адрес https:// там, где вводишь пароль.
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WidgetFrame>
  );
}
