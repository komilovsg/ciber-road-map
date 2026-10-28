"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import type { Database, SqlJsStatic } from "sql.js";
import type { Block } from "@/content/types";
import { BlockFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconBulb, IconCheck, IconChevronDown, IconRefresh, IconWarn } from "@/icons";
import { useT } from "@/i18n/context";
import { RunIcon, TouchIndent, VscIconButton, VscMenu, VscPanel, VscProblem, VscStatusBar, VscTabBar, VscWindow } from "@/components/vscode/chrome";
import { useBlockProgress } from "@/components/blocks/block-context";
import { CodeEditor, EditorKeysHint, type EditorApi } from "@/components/blocks/code-editor";
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

function ResultTable({ res, rowsLabel }: { res: QueryResult; rowsLabel: string }) {
  if (res.columns.length === 0) return <p className="vsc-empty" style={{ margin: 0 }}>Запрос выполнен, строк для показа нет.</p>;
  const rows = res.rows.slice(0, MAX_ROWS);
  return (
    <div className="vsc">
      <div className="max-h-72 overflow-auto" tabIndex={0} role="region" aria-label="Результат запроса">
        <table className="vsc-grid">
          <thead>
            <tr>
              {res.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} className={typeof v === "number" ? "num" : undefined}>
                    {v === null ? <span className="null">NULL</span> : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="vsc-gridnote" style={{ padding: "0 10px 6px" }}>
        {rowsLabel}: {res.rows.length}
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
  const [shakeKey, setShakeKey] = useState(0);
  const sqlRef = useRef<SqlJsStatic | null>(null);
  const dbRef = useRef<Database | null>(null);
  const lastRun = useRef<{ sql: string; res: QueryResult } | null>(null);
  const edRef = useRef<EditorApi | null>(null);
  const t = useT();
  const [pos, setPos] = useState({ ln: 1, col: 1 });
  const [ptab, setPtab] = useState("result");
  const [collapsed, setCollapsed] = useState(false);
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
    setCollapsed(false);
    try {
      const res = execute(sql);
      lastRun.current = { sql, res };
      setResult(res);
      setError(null);
      setPtab("result");
    } catch (e) {
      setError("Ошибка SQL: " + errText(e));
      setResult(null);
      setPtab("problems");
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
      setCollapsed(false);
      setPtab("problems");
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
      setCollapsed(false);
      setPtab("problems");
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
      setPtab("result");
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
  const rowsLabel = t.vsc.rows;
  const hintLines = (task?.hint ? `${t.vsc.hintWord}: ${task.hint}` : "").split(/\s+/).reduce<string[]>((acc, w) => {
    const last = acc[acc.length - 1];
    if (last !== undefined && last.length + 1 + w.length <= 72) acc[acc.length - 1] = last + " " + w;
    else acc.push(w);
    return acc;
  }, []);
  const hintShown = !!task?.hint && sql.includes(hintLines[0] ?? "\0");
  const insertHint = () => {
    if (!task?.hint || hintShown) return;
    edRef.current?.insertHint(hintLines.map((l) => "-- " + l).join("\n") + "\n", 0);
  };
  const problems: string[] = [error, verdict.kind === "fail" ? verdict.text : null].filter((x): x is string => !!x);

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
                    <ResultTable res={preview.res} rowsLabel={rowsLabel} />
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
            </li>
          );
        })}
      </ol>

      <VscWindow>
        <VscTabBar name="query.sql" kind="sql">
          <VscIconButton label={t.vsc.runSql} run disabled={status !== "ready" || !sql.trim()} onClick={run}>
            <RunIcon />
          </VscIconButton>
          {task?.hint && (
            <VscIconButton label={hintShown ? t.vsc.allHints : t.vsc.hint} disabled={hintShown} onClick={insertHint}>
              <IconBulb size={17} />
            </VscIconButton>
          )}
          <TouchIndent api={edRef} />
          <VscMenu label={t.vsc.more} items={[{ label: t.vsc.resetDb, onSelect: resetDb, disabled: status !== "ready" }]} />
        </VscTabBar>
        <CodeEditor
          value={sql}
          onChange={setSql}
          onCursor={(ln, col) => setPos({ ln, col })}
          lang="sql"
          onRun={run}
          ariaLabel={`${t.vsc.editorLabel} SQL, ${cur + 1}`}
          onReady={(api) => {
            edRef.current = api;
          }}
          hintId={hintId}
          minLines={4}
        />
        <VscPanel
          tabs={[
            { id: "result", label: t.vsc.result },
            { id: "problems", label: t.vsc.problems, badge: problems.length },
          ]}
          active={ptab}
          onTab={setPtab}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          toggleLabel={collapsed ? t.vsc.expand : t.vsc.collapse}
          height={190}
        >
          {ptab === "result" ? (
            result ? (
              <ResultTable res={result} rowsLabel={t.vsc.rows} />
            ) : (
              <div className="vsc-empty">{t.vsc.resultEmpty}</div>
            )
          ) : problems.length === 0 ? (
            <div className="vsc-empty">{t.vsc.noProblems}</div>
          ) : (
            problems.map((p, i) => <VscProblem key={i} text={p} src="query.sql" />)
          )}
        </VscPanel>
        <VscStatusBar left="SQLite (sql.js)" ln={pos.ln} col={pos.col} spaces={t.vsc.spaces} lang="SQL" />
      </VscWindow>
      <EditorKeysHint id={hintId} />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={status !== "ready" || !sql.trim() || !task} onClick={check}>
          <IconCheck size={16} /> {t.vsc.check}
        </button>
      </div>

      <div aria-live="polite">
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

    </BlockFrame>
  );
}
