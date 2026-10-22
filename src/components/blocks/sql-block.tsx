"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import type { Database, SqlJsStatic } from "sql.js";
import type { Block } from "@/content/types";
import { BlockFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconBulb, IconCheck, IconChevronDown, IconPlay, IconRefresh, IconWarn } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { CodeEditor, EditorKeysHint } from "@/components/blocks/code-editor";
import {
  compareResults,
  hasOrderBy,
  loadSqlJs,
  readSchema,
  runQuery,
  type QueryResult,
  type TableInfo,
} from "@/components/blocks/runtime/sql-runtime";

type Props = { block: Extract<Block, { kind: "sql" }> };
type Status = "loading" | "ready" | "error";
type Verdict = { kind: "none" } | { kind: "pass" } | { kind: "fail"; text: string };
const MAX_ROWS = 200;

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function Md({ text }: { text: string }) {
  return (
    <div className="prose-kr prose-compact">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function ResultTable({ res }: { res: QueryResult }) {
  if (res.columns.length === 0) return <p className="text-[15px] text-muted">Запрос выполнен, строк для показа нет.</p>;
  const rows = res.rows.slice(0, MAX_ROWS);
  return (
    <div>
      <div className="max-h-72 overflow-auto rounded-[10px] border border-line" tabIndex={0} aria-label="Результат запроса">
        <table className="min-w-full border-collapse font-mono text-[13px]">
          <thead>
            <tr>
              {res.columns.map((c, i) => (
                <th key={i} className="sticky top-0 whitespace-nowrap border-b border-line bg-card px-3 py-2 text-left font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-ink/[0.03]">
                {r.map((v, j) => (
                  <td key={j} className="whitespace-nowrap border-b border-line px-3 py-1.5">
                    {v === null ? <span className="italic text-muted/70">NULL</span> : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted">
        Строк: {res.rows.length}
        {res.rows.length > MAX_ROWS && ` (показаны первые ${MAX_ROWS})`}
      </p>
    </div>
  );
}

export function SqlBlock({ block }: Props) {
  const { solved, solve, data, setData } = useBlockProgress<{ done?: number[] }>();
  const total = block.tasks.length;
  const [doneLocal, setDoneLocal] = useState<number[] | null>(null);
  const done = solved ? block.tasks.map((_, i) => i) : (doneLocal ?? data?.done ?? []);
  const [cur, setCur] = useState(0);
  const [sql, setSql] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [preview, setPreview] = useState<{ table: string; res: QueryResult } | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict>({ kind: "none" });
  const [hints, setHints] = useState<number[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const sqlRef = useRef<SqlJsStatic | null>(null);
  const dbRef = useRef<Database | null>(null);
  const lastRun = useRef<{ sql: string; res: QueryResult } | null>(null);
  const edRef = useRef<HTMLTextAreaElement | null>(null);
  const hintId = useId();
  const listId = useId();

  const fresh = useCallback(() => {
    const SQL = sqlRef.current;
    if (!SQL) return;
    dbRef.current?.close();
    const db = new SQL.Database();
    db.run(block.setup);
    dbRef.current = db;
    lastRun.current = null;
    setSchema(readSchema(db));
    setPreview(null);
  }, [block.setup]);

  useEffect(() => {
    let off = false;
    loadSqlJs()
      .then((SQL) => {
        if (off) return;
        sqlRef.current = SQL;
        fresh();
        setStatus("ready");
      })
      .catch(() => {
        if (!off) setStatus("error");
      });
    return () => {
      off = true;
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, [attempt, fresh]);

  const execute = (q: string): QueryResult => {
    const db = dbRef.current;
    if (!db) throw new Error("база не готова");
    const res = runQuery(db, q);
    setSchema(readSchema(db));
    return res;
  };

  const run = () => {
    if (status !== "ready" || !sql.trim()) return;
    setVerdict({ kind: "none" });
    try {
      const res = execute(sql);
      lastRun.current = { sql, res };
      setResult(res);
      setError(null);
    } catch (e) {
      setError("Ошибка SQL: " + errText(e));
      setResult(null);
    }
  };

  const check = () => {
    const task = block.tasks[cur];
    if (status !== "ready" || !task || !sql.trim()) return;
    let got: QueryResult;
    try {
      got = lastRun.current && lastRun.current.sql === sql ? lastRun.current.res : execute(sql);
      lastRun.current = { sql, res: got };
      setResult(got);
      setError(null);
    } catch (e) {
      setError("Ошибка SQL: " + errText(e));
      setResult(null);
      setVerdict({ kind: "fail", text: "Запрос не выполнился." });
      setShakeKey((k) => k + 1);
      return;
    }
    let reason: string | null;
    try {
      reason = compareResults(got, runQuery(dbRef.current!, task.expected), hasOrderBy(task.expected));
    } catch (e) {
      reason = "ошибка в эталонном запросе: " + errText(e);
    }
    if (reason) {
      setVerdict({ kind: "fail", text: "Не совпадает: " + reason });
      setShakeKey((k) => k + 1);
      return;
    }
    setVerdict({ kind: "pass" });
    if (done.includes(cur)) return;
    const next = [...done, cur].sort((a, b) => a - b);
    setDoneLocal(next);
    setData({ done: next });
    if (next.length >= total) {
      solve();
      return;
    }
    const nxt = block.tasks.findIndex((_, i) => i > cur && !next.includes(i));
    const target = nxt >= 0 ? nxt : block.tasks.findIndex((_, i) => !next.includes(i));
    setTimeout(() => {
      setCur(target);
      setSql("");
      setResult(null);
      setError(null);
      setVerdict({ kind: "none" });
      edRef.current?.focus();
    }, 700);
  };

  const pick = (i: number) => {
    setCur(i);
    setVerdict({ kind: "none" });
  };

  const showPreview = (name: string) => {
    if (preview?.table === name) return setPreview(null);
    try {
      setPreview({ table: name, res: runQuery(dbRef.current!, `SELECT * FROM "${name.replace(/"/g, '""')}" LIMIT 5`) });
    } catch {
      setPreview(null);
    }
  };

  const resetDb = () => {
    fresh();
    setResult(null);
    setError(null);
    setVerdict({ kind: "none" });
  };

  const task = block.tasks[cur];
  const allDone = done.length >= total;

  return (
    <BlockFrame
      label="SQL"
      title={block.title}
      solved={solved}
      actions={
        <span className="chip" aria-label={`Выполнено заданий: ${done.length} из ${total}`}>
          {done.length}/{total}
        </span>
      }
    >
      {status === "loading" && (
        <div role="status" className="mb-4 text-[15px] text-muted">
          Загружаем SQL-движок…
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <motion.div className="h-full w-1/3 rounded-full bg-accent" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }} />
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] bg-bad/10 px-3 py-2.5 text-bad">
          <span className="min-w-0 flex-1 basis-60">Не удалось загрузить SQL-движок. Попробуй ещё раз.</span>
          <button type="button" className="btn btn-sm" onClick={() => { setStatus("loading"); setAttempt((a) => a + 1); }}>
            <IconRefresh size={16} /> Повторить
          </button>
        </div>
      )}

      <div className="mb-4 rounded-[10px] border border-line">
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-[15px] font-medium"
          aria-expanded={schemaOpen}
          onClick={() => setSchemaOpen((o) => !o)}
        >
          <IconChevronDown size={18} className={`transition-transform ${schemaOpen ? "" : "-rotate-90"}`} />
          Схема базы
          <span className="text-muted">({schema.length > 0 ? schema.map((t) => t.name).join(", ") : "…"})</span>
        </button>
        {schemaOpen && (
          <div className="space-y-3 border-t border-line px-3 py-3">
            {schema.map((t) => (
              <div key={t.name}>
                <button type="button" className="font-mono text-[14px] font-semibold underline decoration-dotted underline-offset-4" onClick={() => showPreview(t.name)} aria-expanded={preview?.table === t.name}>
                  {t.name}
                </button>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {t.columns.map((c) => (
                    <li key={c.name} className="rounded-md bg-ink/[0.06] px-2 py-0.5 font-mono text-[13px]">
                      {c.name} <span className="text-muted">{c.type.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
                {preview?.table === t.name && (
                  <div className="mt-2">
                    <ResultTable res={preview.res} />
                  </div>
                )}
              </div>
            ))}
            <p className="text-xs text-muted">Нажми на имя таблицы, чтобы увидеть первые строки.</p>
          </div>
        )}
      </div>

      <ol id={listId} className="mb-4 space-y-1.5" aria-label="Задания">
        {block.tasks.map((t, i) => {
          const isDone = done.includes(i);
          const active = i === cur;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(i)}
                aria-current={active ? "step" : undefined}
                className={`flex min-h-11 w-full items-start gap-3 rounded-[10px] border px-3 py-2 text-left ${active ? "border-accent bg-accent/5" : "border-line"}`}
              >
                <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isDone ? "bg-ok/15 text-ok" : "bg-ink/10"}`}>
                  {isDone ? <IconCheck size={14} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 text-[15px] [&_p]:m-0 [overflow-wrap:anywhere]">
                  <Md text={t.prompt} />
                </span>
              </button>
              {active && t.hint && (
                <div className="ml-9 mt-1.5">
                  {hints.includes(i) ? (
                    <p className="flex gap-2 rounded-[10px] bg-xp/15 px-3 py-2 text-[15px]">
                      <IconBulb size={18} className="mt-0.5 shrink-0" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{t.hint}</span>
                    </p>
                  ) : (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setHints((h) => [...h, i])}>
                      <IconBulb size={16} /> Подсказка
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <CodeEditor
        value={sql}
        onChange={setSql}
        lang="sql"
        onRun={run}
        ariaLabel={`SQL-запрос, задание ${cur + 1}`}
        textareaRef={edRef}
        hintId={hintId}
        minLines={4}
      />
      <EditorKeysHint id={hintId} />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={status !== "ready" || !sql.trim()} onClick={run}>
          <IconPlay size={16} /> Выполнить
        </button>
        <button type="button" className="btn" disabled={status !== "ready" || !sql.trim() || !task} onClick={check}>
          <IconCheck size={16} /> Проверить
        </button>
        <button type="button" className="btn btn-ghost" disabled={status !== "ready"} onClick={resetDb}>
          <IconRefresh size={16} /> Сбросить базу
        </button>
      </div>

      <div aria-live="polite">
        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-bad/10 px-3 py-2.5 font-mono text-[13px] text-bad [overflow-wrap:anywhere]">
            <IconWarn size={18} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        {verdict.kind === "pass" && (
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="mt-3 flex items-center gap-2 rounded-[10px] bg-ok/15 px-3 py-2.5 font-medium text-ok"
          >
            <DrawCheck /> {allDone ? "Все задания выполнены!" : "Верно! Переходим к следующему."}
          </motion.div>
        )}
        {verdict.kind === "fail" && (
          <motion.p key={shakeKey} animate={shake} className="mt-3 flex items-start gap-2 rounded-[10px] bg-bad/10 px-3 py-2.5 text-bad">
            <IconWarn size={18} className="mt-0.5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{verdict.text}</span>
          </motion.p>
        )}
      </div>

      {result && (
        <div className="mt-3">
          <div className="eyebrow mb-1">Результат</div>
          <ResultTable res={result} />
        </div>
      )}
    </BlockFrame>
  );
}
