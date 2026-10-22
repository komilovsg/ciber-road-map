"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "motion/react";
import type { Block } from "@/content/types";
import { BlockFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconBulb, IconCheck, IconEye, IconPlay, IconRefresh, IconReset, IconWarn } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { CodeEditor, EditorKeysHint } from "@/components/blocks/code-editor";
import { runPython, type PyPhase } from "@/components/blocks/runtime/py-runtime";

type Props = { block: Extract<Block, { kind: "python" }> };
type Seg = { stream: "out" | "err"; text: string };
type Verdict =
  | { kind: "none" }
  | { kind: "pass" }
  | { kind: "fail"; text: string }
  | { kind: "info"; text: string }
  | { kind: "timeout" }
  | { kind: "loaderror"; text: string };

const ERR_HINTS: [RegExp, string][] = [
  [/^SyntaxError|^IndentationError|^TabError/, "Синтаксическая ошибка: проверь скобки, кавычки, двоеточия и отступы."],
  [/^NameError/, "Python не знает такого имени: проверь опечатки и что переменная создана выше."],
  [/^TypeError/, "Несовместимые типы: например, строку нельзя сложить с числом без int() или str()."],
  [/^ValueError/, "Значение не подходит по формату, например int(\"abc\")."],
  [/^ZeroDivisionError/, "Деление на ноль."],
  [/^IndexError/, "Индекс выходит за границы списка или строки."],
  [/^KeyError/, "Такого ключа нет в словаре."],
  [/^EOFError/, "input() попросил больше строк, чем есть в данных задачи."],
];

function errHint(msg: string): string | null {
  const last = msg.trimEnd().split("\n").pop() ?? "";
  return ERR_HINTS.find(([re]) => re.test(last))?.[1] ?? null;
}

function Shimmer() {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden>
      <motion.div
        className="h-full w-1/3 rounded-full bg-accent"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function PythonBlock({ block }: Props) {
  const { solved, solve, data, setData } = useBlockProgress<{ code?: string }>();
  const [edited, setEdited] = useState<string | null>(null);
  const code = edited ?? data?.code ?? block.starter;
  const [busy, setBusy] = useState<null | "run" | "check">(null);
  const [phase, setPhase] = useState<PyPhase>("loading");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [ran, setRan] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>({ kind: "none" });
  const [hints, setHints] = useState(0);
  const [fails, setFails] = useState(0);
  const [confirm, setConfirm] = useState<null | "reset" | "solution">(null);
  const [showSol, setShowSol] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [justSolved, setJustSolved] = useState(false);
  const hintId = useId();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<string | null>(null);
  const buf = useRef<Seg[]>([]);
  const raf = useRef<number | null>(null);
  const solvedRef = useRef(false);
  const setDataRef = useRef(setData);
  useEffect(() => {
    setDataRef.current = setData;
  }, [setData]);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (pendingSave.current !== null) {
      setDataRef.current({ code: pendingSave.current });
      pendingSave.current = null;
    }
  }, []);
  useEffect(() => flushSave, [flushSave]);

  const onCode = (v: string) => {
    setEdited(v);
    pendingSave.current = v;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 600);
  };

  const flushOut = useCallback(() => {
    raf.current = null;
    const chunk = buf.current;
    if (!chunk.length) return;
    buf.current = [];
    setSegs((prev) => {
      const next = prev.slice();
      for (const c of chunk) {
        const last = next[next.length - 1];
        if (last && last.stream === c.stream) next[next.length - 1] = { stream: c.stream, text: last.text + c.text };
        else next.push(c);
      }
      return next;
    });
  }, []);
  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const exec = async (mode: "run" | "check") => {
    if (busy) return;
    flushSave();
    setBusy(mode);
    setConfirm(null);
    setSegs([]);
    setRan(true);
    setVerdict({ kind: "none" });
    buf.current = [];
    const res = await runPython({
      code,
      tests: mode === "check" ? block.tests : undefined,
      stdin: block.stdin ?? [],
      onPhase: setPhase,
      onOut: (stream, text) => {
        buf.current.push({ stream, text });
        if (raf.current === null) raf.current = requestAnimationFrame(flushOut);
      },
    });
    if (raf.current) cancelAnimationFrame(raf.current);
    flushOut();
    const extra: Seg[] = [];
    let v: Verdict = { kind: "none" };
    if (res.status === "error" || res.status === "testerror") {
      const hint = errHint(res.message);
      extra.push({ stream: "err", text: (res.status === "testerror" ? "Ошибка в проверке:\n" : "") + res.message });
      if (res.status === "error" && mode === "check") v = { kind: "fail", text: "Код завершился с ошибкой." + (hint ? " " + hint : "") };
      else if (res.status === "testerror") v = { kind: "fail", text: "Тест упал: " + (res.message.trimEnd().split("\n").pop() ?? "") };
      else if (hint) v = { kind: "info", text: hint };
    } else if (res.status === "fail") {
      v = { kind: "fail", text: "Не прошло: " + res.message };
    } else if (res.status === "timeout") {
      v = { kind: "timeout" };
    } else if (res.status === "loaderror") {
      v = { kind: "loaderror", text: res.message };
    } else if (mode === "check") {
      v = { kind: "pass" };
    }
    if (extra.length) setSegs((p) => [...p, ...extra]);
    setVerdict(v);
    setBusy(null);
    if (mode === "check") {
      if (v.kind === "pass") {
        setJustSolved(true);
        if (!solvedRef.current && !solved) {
          solvedRef.current = true;
          solve();
        }
      } else if (v.kind === "fail" || v.kind === "timeout") {
        setFails((n) => n + 1);
        setShakeKey((k) => k + 1);
      }
    }
  };

  const doReset = () => {
    setEdited(block.starter);
    pendingSave.current = block.starter;
    flushSave();
    setConfirm(null);
    setSegs([]);
    setRan(false);
    setVerdict({ kind: "none" });
  };
  const wantReset = () => (code === block.starter ? doReset() : setConfirm("reset"));
  const wantSolution = () => (fails >= 2 ? setShowSol(true) : setConfirm("solution"));
  const hintsArr = block.hints ?? [];

  return (
    <BlockFrame label="Python" title={block.title} solved={solved}>
      <div className="prose-kr prose-compact mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.task}</ReactMarkdown>
      </div>

      <CodeEditor
        value={code}
        onChange={onCode}
        lang="python"
        onRun={() => void exec("run")}
        ariaLabel={`Редактор Python: ${block.title}`}
        hintId={hintId}
      />
      <EditorKeysHint id={hintId} />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => void exec("run")}>
          <IconPlay size={16} /> Запустить
        </button>
        <button type="button" className="btn" disabled={!!busy} onClick={() => void exec("check")}>
          <IconCheck size={16} /> Проверить
        </button>
        <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={wantReset}>
          <IconReset size={16} /> Сбросить
        </button>
        {hintsArr.length > 0 && (
          <button type="button" className="btn btn-ghost" disabled={hints >= hintsArr.length} onClick={() => setHints((h) => h + 1)}>
            <IconBulb size={16} /> Подсказка {Math.min(hints + 1, hintsArr.length)}/{hintsArr.length}
          </button>
        )}
        <button type="button" className="btn btn-ghost" disabled={showSol} onClick={wantSolution}>
          <IconEye size={16} /> Показать решение
        </button>
      </div>

      <AnimatePresence initial={false}>
        {confirm && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div role="alertdialog" aria-label="Подтверждение" className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-paper p-3 text-[15px]">
              <span className="min-w-0 flex-1 basis-60">
                {confirm === "reset" ? "Вернуть исходный код? Твои изменения пропадут." : "Точно показать решение? Лучше сначала попробуй подсказки: так запомнится лучше."}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  if (confirm === "reset") doReset();
                  else {
                    setShowSol(true);
                    setConfirm(null);
                  }
                }}
              >
                Да
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(null)}>
                Отмена
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hints > 0 && (
        <ol className="mt-3 space-y-2" aria-label="Подсказки">
          {hintsArr.slice(0, hints).map((h, i) => (
            <li key={i} className="flex gap-2 rounded-[10px] bg-xp/15 px-3 py-2 text-[15px]">
              <IconBulb size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{h}</span>
            </li>
          ))}
        </ol>
      )}

      {busy && (
        <div className="mt-3" role="status" aria-live="polite">
          <p className="mb-2 text-[15px] text-muted">
            {phase === "loading" ? "Загружаем Python… Первый запуск скачивает около 10 МБ, дальше будет мгновенно." : "Выполняется…"}
          </p>
          <Shimmer />
        </div>
      )}

      {ran && (
        <div className="mt-3">
          <div className="eyebrow mb-1">Вывод</div>
          <pre
            className="m-0 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-white/10 px-3 py-2.5 font-mono text-[14px] leading-[1.55]"
            style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}
            tabIndex={0}
            aria-label="Вывод программы"
          >
            {segs.length === 0 && !busy ? <span style={{ opacity: 0.5 }}>(пусто)</span> : null}
            {segs.map((s, i) => (
              <span key={i} style={s.stream === "err" ? { color: "var(--bad)" } : undefined}>
                {s.text}
              </span>
            ))}
          </pre>
        </div>
      )}

      <div aria-live="polite">
        {verdict.kind === "pass" && (
          <motion.div
            initial={justSolved ? { scale: 0.92, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="mt-3 flex items-center gap-2 rounded-[10px] bg-ok/15 px-3 py-2.5 font-medium text-ok"
          >
            <DrawCheck /> Все проверки пройдены!
          </motion.div>
        )}
        {verdict.kind === "fail" && (
          <motion.div
            key={shakeKey}
            animate={shake}
            className="mt-3 flex items-start gap-2 rounded-[10px] bg-bad/10 px-3 py-2.5 text-bad"
          >
            <IconWarn size={18} className="mt-0.5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{verdict.text}</span>
          </motion.div>
        )}
        {verdict.kind === "info" && <p className="mt-3 text-[15px] text-muted">{verdict.text}</p>}
        {verdict.kind === "timeout" && (
          <motion.div key={shakeKey} animate={shake} className="mt-3 flex items-start gap-2 rounded-[10px] bg-bad/10 px-3 py-2.5 text-bad">
            <IconWarn size={18} className="mt-0.5 shrink-0" />
            <span>Похоже на бесконечный цикл (&gt;8 с). Проверь условия выхода из while/for.</span>
          </motion.div>
        )}
        {verdict.kind === "loaderror" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[10px] bg-bad/10 px-3 py-2.5 text-bad">
            <span className="min-w-0 flex-1 basis-60">
              Не удалось загрузить Python. Проверь интернет и попробуй ещё раз.
            </span>
            <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => void exec("run")}>
              <IconRefresh size={16} /> Повторить
            </button>
          </div>
        )}
        {solved && verdict.kind === "none" && !busy && (
          <p className="mt-3 text-[15px] text-ok">Это задание уже решено. Можно править код и пробовать дальше.</p>
        )}
      </div>

      {showSol && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="eyebrow">Решение</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowSol(false)}>
              Скрыть
            </button>
          </div>
          <CodeEditor value={block.solution} lang="python" readOnly ariaLabel="Решение" minLines={3} />
        </div>
      )}
    </BlockFrame>
  );
}
