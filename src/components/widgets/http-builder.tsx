"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { WidgetFrame } from "@/components/ui/frames";
import { Highlighted } from "@/components/ui/highlight";
import { CopyButton } from "@/components/ui/copy-button";
import { IconSend, IconX, IconWarn } from "@/icons";
import { API_HOST, CODE_NOTES, respond, statusInfo, type Hdr, type Res } from "./_lib/fake-api";

type Row = Hdr & { id: number };
const METHODS = ["GET", "POST", "PUT", "DELETE", "HEAD"] as const;
const BODY_METHODS = new Set(["POST", "PUT"]);

type Preset = { label: string; method: string; path: string; headers: Hdr[]; body: string };
const EXAMPLES: Preset[] = [
  { label: "GET /users/1", method: "GET", path: "/users/1", headers: [], body: "" },
  { label: "GET /users/999", method: "GET", path: "/users/999", headers: [], body: "" },
  {
    label: "POST /users",
    method: "POST",
    path: "/users",
    headers: [{ k: "Content-Type", v: "application/json" }],
    body: '{"name": "Рустам"}',
  },
  {
    label: "POST (битый JSON)",
    method: "POST",
    path: "/users",
    headers: [{ k: "Content-Type", v: "application/json" }],
    body: '{"name": "Рустам"',
  },
  { label: "GET /admin", method: "GET", path: "/admin", headers: [], body: "" },
  { label: "GET /old", method: "GET", path: "/old", headers: [], body: "" },
  { label: "GET /crash", method: "GET", path: "/crash", headers: [], body: "" },
  { label: "DELETE /users", method: "DELETE", path: "/users", headers: [], body: "" },
];

type Hist = { n: number; req: Preset & { host: string }; status: number | null };

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/users");
  const [host, setHost] = useState(API_HOST);
  const [rows, setRows] = useState<Row[]>([{ id: 1, k: "Accept", v: "application/json" }]);
  const [nextId, setNextId] = useState(2);
  const [body, setBody] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [netErr, setNetErr] = useState<string | null>(null);
  const [hist, setHist] = useState<Hist[]>([]);
  const [counter, setCounter] = useState(1);
  const [flash, setFlash] = useState(0);

  const hasBody = BODY_METHODS.has(method);
  const cleanPath = path.trim().startsWith("/") ? path.trim() : "/" + path.trim();
  const sendBody = hasBody ? body : "";

  const allHeaders: Hdr[] = [
    { k: "Host", v: host.trim() },
    { k: "User-Agent", v: "lab-client/1.0" },
    ...rows.filter((r) => r.k.trim()).map(({ k, v }) => ({ k: k.trim(), v: v.trim() })),
  ];
  if (sendBody && !allHeaders.some((h) => h.k.toLowerCase() === "content-length")) {
    allHeaders.push({ k: "Content-Length", v: String(new TextEncoder().encode(sendBody).length) });
  }
  const rawReq =
    `${method} ${cleanPath} HTTP/1.1\n` + allHeaders.map((h) => `${h.k}: ${h.v}`).join("\n") + "\n\n" + sendBody;

  const addRow = (k = "", v = "") => {
    setRows((r) => [...r, { id: nextId, k, v }]);
    setNextId((n) => n + 1);
  };
  const upd = (id: number, patch: Partial<Hdr>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const load = (p: Preset, h = API_HOST) => {
    setMethod(p.method);
    setPath(p.path);
    setHost(h);
    setBody(p.body);
    setRows(p.headers.map((x, i) => ({ id: nextId + i, ...x })));
    setNextId((n) => n + p.headers.length + 1);
  };

  const send = () => {
    let status: number | null = null;
    if (host.trim().toLowerCase() !== API_HOST) {
      setNetErr(`Не удалось разрешить имя «${host.trim() || "(пусто)"}». В этой лаборатории существует только ${API_HOST}.`);
      setRes(null);
    } else {
      const r = respond({ method, path: cleanPath, host, headers: allHeaders, body: sendBody });
      setNetErr(null);
      setRes(r);
      status = r.status;
    }
    setFlash((f) => f + 1);
    setHist((h) =>
      [
        {
          n: counter,
          req: { label: "", method, path: cleanPath, headers: rows.filter((r) => r.k.trim()).map(({ k, v }) => ({ k, v })), body: sendBody, host },
          status,
        },
        ...h,
      ].slice(0, 6),
    );
    setCounter((c) => c + 1);
  };

  const rawRes = res
    ? `HTTP/1.1 ${res.status} ${res.reason}\n` + res.headers.map((h) => `${h.k}: ${h.v}`).join("\n") + "\n\n" + res.body
    : "";
  const info = res ? statusInfo(res.status) : null;

  return (
    <WidgetFrame
      title="Конструктор HTTP-запросов"
      hint={`Собери запрос и отправь его на учебный сервер ${API_HOST}. Это симуляция: сеть не используется.`}
    >
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Готовые примеры">
        <span className="label w-full">Примеры</span>
        {EXAMPLES.map((e) => (
          <button key={e.label} type="button" className="btn btn-sm btn-ghost font-mono text-[13px]" onClick={() => load(e)}>
            {e.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* editor */}
        <div className="min-w-0 space-y-3">
          <div role="radiogroup" aria-label="Метод" className="flex flex-wrap gap-1.5">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className={`btn btn-sm font-mono ${method === m ? "btn-primary" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Путь</span>
              <input className="input mono w-full" value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} autoCapitalize="off" />
            </label>
            <label className="block">
              <span className="label">Host</span>
              <input className="input mono w-full" value={host} onChange={(e) => setHost(e.target.value)} spellCheck={false} autoCapitalize="off" />
            </label>
          </div>

          <fieldset className="min-w-0">
            <legend className="label mb-1">Заголовки</legend>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={r.id} className="flex gap-2">
                  <input aria-label={`Имя заголовка ${i + 1}`} className="input mono min-w-0 flex-1" style={{ flexBasis: "38%" }} placeholder="Имя" value={r.k} onChange={(e) => upd(r.id, { k: e.target.value })} spellCheck={false} />
                  <input aria-label={`Значение заголовка ${i + 1}`} className="input mono min-w-0 flex-1" style={{ flexBasis: "52%" }} placeholder="Значение" value={r.v} onChange={(e) => upd(r.id, { v: e.target.value })} spellCheck={false} />
                  <button type="button" className="btn btn-ghost shrink-0 !px-3" aria-label={`Удалить заголовок ${i + 1}`} onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}>
                    <IconX size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm" onClick={() => addRow()}>+ Заголовок</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => addRow("Content-Type", "application/json")}>Content-Type: JSON</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => addRow("Authorization", "Bearer demo-token-123")}>Authorization</button>
            </div>
            <p className="mt-2 text-xs text-muted">Host, User-Agent и Content-Length добавляются автоматически.</p>
          </fieldset>

          <label className="block">
            <span className="label">Тело запроса {hasBody ? "" : "(только для POST и PUT)"}</span>
            <textarea
              className="input mono w-full"
              style={{ minHeight: 84, paddingTop: 10, paddingBottom: 10 }}
              rows={3}
              disabled={!hasBody}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={hasBody ? '{"name": "Рустам"}' : "—"}
              spellCheck={false}
            />
          </label>
        </div>

        {/* raw request */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-[10px]" style={{ background: "var(--code-bg)" }}>
            <div className="flex items-center justify-between px-3 pt-1">
              <span className="font-mono text-xs" style={{ color: "#8d97a8" }}>запрос</span>
              <CopyButton text={rawReq} />
            </div>
            <pre className="scroll-x m-0 px-3 pb-3 font-mono text-[13px] leading-relaxed" style={{ color: "var(--code-ink)", maxHeight: 280, overflow: "auto" }} aria-label="Сырой HTTP-запрос">
              <code><Highlighted code={rawReq} lang="http" /></code>
            </pre>
          </div>
          <button type="button" className="btn btn-primary mt-3 w-full sm:w-auto" onClick={send}>
            <IconSend size={16} /> Отправить
          </button>
        </div>
      </div>

      {/* response */}
      <div className="mt-5" aria-live="polite">
        {netErr && (
          <div className="flex items-start gap-2 rounded-[10px] border border-bad/40 bg-bad/10 p-3 text-sm">
            <IconWarn size={18} className="mt-0.5 shrink-0 text-bad" /> <span>{netErr}</span>
          </div>
        )}
        {res && info && (
          <motion.div key={flash} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-[10px]" style={{ background: "var(--code-bg)" }}>
              <div className="px-3 pt-2 font-mono text-xs" style={{ color: "#8d97a8" }}>ответ</div>
              <pre className="m-0 px-3 pb-3 font-mono text-[13px] leading-relaxed" style={{ color: "var(--code-ink)", maxHeight: 300, overflow: "auto" }} aria-label="Сырой HTTP-ответ">
                <code><Highlighted code={rawRes} lang="http" /></code>
              </pre>
            </div>
            <div className="rounded-[10px] border p-4" style={{ borderColor: info.color, background: `color-mix(in srgb, ${info.color} 8%, var(--card))` }}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-bold" style={{ color: info.color }}>{res.status}</span>
                <div>
                  <div className="font-display font-semibold">{res.reason}</div>
                  <div className="text-sm text-muted">Класс {info.cls}: {info.name}</div>
                </div>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed">{CODE_NOTES[res.status] ?? info.meaning}</p>
              <p className="mt-2 text-sm text-muted">Класс {info.cls}: {info.meaning}</p>
              {res.status === 301 && <p className="mt-2 text-sm text-muted">Браузер автоматически отправил бы новый запрос на адрес из Location.</p>}
            </div>
          </motion.div>
        )}
        {!res && !netErr && <p className="text-sm text-muted">Нажми «Отправить», чтобы увидеть ответ сервера.</p>}
      </div>

      {hist.length > 0 && (
        <div className="mt-5">
          <div className="label mb-1">История (нажми, чтобы вернуть запрос)</div>
          <ul className="flex flex-col gap-1.5">
            {hist.map((h) => {
              const c = h.status ? statusInfo(h.status) : null;
              return (
                <li key={h.n}>
                  <button type="button" className="btn btn-ghost btn-sm w-full justify-start gap-2 overflow-hidden font-mono text-[13px]" onClick={() => load(h.req, h.req.host)}>
                    <span className="font-semibold">{h.req.method}</span>
                    <span className="truncate">{h.req.path}</span>
                    <span className="ml-auto shrink-0 font-semibold" style={{ color: c?.color ?? "var(--bad)" }}>{h.status ?? "ошибка сети"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </WidgetFrame>
  );
}
