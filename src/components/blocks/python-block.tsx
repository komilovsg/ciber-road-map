"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "motion/react";
import type { Block } from "@/content/types";
import { BlockFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconCheck, IconRefresh, IconBulb, IconWarn } from "@/icons";
import { useT } from "@/i18n/context";
import { RunIcon, TouchIndent, VscIconButton, VscMenu, VscPanel, VscProblem, VscStatusBar, VscTabBar, VscWindow } from "@/components/vscode/chrome";
import { useBlockProgress } from "@/components/blocks/block-context";
import { CodeEditor, EditorKeysHint, type EditorApi } from "@/components/blocks/code-editor";
import { runPython, type PyPhase } from "@/components/blocks/runtime/py-runtime";

const PS = "PS C:\\Users\\student> ";
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

export function PythonBlock({ block }: Props) {
  const { solved, solve, data, setData } = useBlockProgress<{ code?: string; solutionSeen?: boolean }>();
  const [edited, setEdited] = useState<string | null>(null);
  const code = edited ?? data?.code ?? block.starter;
  const [busy, setBusy] = useState<null | "run" | "check">(null);
  const [phase, setPhase] = useState<PyPhase>("loading");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [ran, setRan] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>({ kind: "none" });
  const [, setSeenLocal] = useState(false);
  const seenRef = useRef(false);
  const edRef = useRef<EditorApi | null>(null);
  const [, setFails] = useState(0);
  const [confirm, setConfirm] = useState<null | "reset" | "solution">(null);
  const [showSol, setShowSol] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [justSolved, setJustSolved] = useState(false);
  const t = useT();
  const [pos, setPos] = useState({ ln: 1, col: 1 });
  const [ptab, setPtab] = useState("terminal");
  const [collapsed, setCollapsed] = useState(false);
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
      setDataRef.current({ code: pendingSave.current, solutionSeen: seenRef.current || undefined });
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
    setCollapsed(false);
    setPtab("terminal");
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
    if (mode === "check" && (v.kind === "fail" || v.kind === "timeout" || v.kind === "loaderror")) setPtab("problems");
    if (mode === "check") {
      if (v.kind === "pass") {
        setJustSolved(true);
        if (!solvedRef.current && !solved) {
          solvedRef.current = true;
          solve(seenRef.current ? 5 : 10);
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
  const wantSolution = () => (solved || showSol ? setShowSol(true) : setConfirm("solution"));
  const hintsArr = block.hints ?? [];
  useEffect(() => {
    if (data?.solutionSeen) seenRef.current = true;
  }, [data?.solutionSeen]);
  const revealSolution = () => {
    if (!solved) {
      seenRef.current = true;
      setSeenLocal(true);
      setDataRef.current({ code, solutionSeen: true });
    }
    setShowSol(true);
    setConfirm(null);
  };
  const wrapHint = (i: number) => {
    const lines: string[] = [];
    let cur = "";
    for (const w of `${t.vsc.hintWord} ${i + 1}/${hintsArr.length}: ${hintsArr[i]}`.split(/\s+/)) {
      if (cur && cur.length + 1 + w.length > 72) {
        lines.push(cur);
        cur = w;
      } else cur = cur ? cur + " " + w : w;
    }
    if (cur) lines.push(cur);
    return lines.map((l) => "# " + l);
  };
  const shownHints = hintsArr.map((_, i) => code.includes(`${t.vsc.hintWord} ${i + 1}/${hintsArr.length}:`));
  const nextHint = shownHints.indexOf(false);
  const insertHint = () => {
    if (nextHint < 0) return;
    let skip = 0;
    for (let i = 0; i < nextHint; i++) skip += wrapHint(i).length;
    edRef.current?.insertHint(wrapHint(nextHint).join("\n") + "\n", skip);
  };
  const problems: { kind: "error" | "info"; text: string }[] =
    verdict.kind === "fail"
      ? [{ kind: "error", text: verdict.text }]
      : verdict.kind === "timeout"
        ? [{ kind: "error", text: "Похоже на бесконечный цикл (>8 с). Проверь условия выхода из while/for." }]
        : verdict.kind === "loaderror"
          ? [{ kind: "error", text: "Не удалось загрузить Python. Проверь интернет и попробуй ещё раз." }]
          : verdict.kind === "info"
            ? [{ kind: "info", text: verdict.text }]
            : [];

  return (
    <BlockFrame label="Python" title={block.title} solved={solved}>
      <div className="prose-kr prose-compact mb-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.task}</ReactMarkdown>
      </div>

      <VscWindow>
        <VscTabBar name="main.py" kind="python">
          <VscIconButton label={t.vsc.runFile} run disabled={!!busy} onClick={() => void exec("run")}>
            <RunIcon />
          </VscIconButton>
          {hintsArr.length > 0 && (
            <VscIconButton label={nextHint < 0 ? t.vsc.allHints : `${t.vsc.hint} ${nextHint + 1}/${hintsArr.length}`} disabled={nextHint < 0} onClick={insertHint}>
              <IconBulb size={17} />
            </VscIconButton>
          )}
          <TouchIndent api={edRef} />
          <VscMenu
            label={t.vsc.more}
            items={[
              { label: t.vsc.resetCode, onSelect: wantReset, disabled: !!busy },
              { label: t.vsc.showSolution, onSelect: wantSolution, disabled: showSol },
            ]}
          />
        </VscTabBar>
        <CodeEditor
          value={code}
          onChange={onCode}
          onCursor={(ln, col) => setPos({ ln, col })}
          lang="python"
          onRun={() => void exec("run")}
          ariaLabel={`${t.vsc.editorLabel} Python: ${block.title}`}
          hintId={hintId}
          onReady={(api) => {
            edRef.current = api;
          }}
        />
        <VscPanel
          tabs={[
            { id: "terminal", label: t.vsc.terminal },
            { id: "problems", label: t.vsc.problems, badge: problems.filter((p) => p.kind === "error").length },
          ]}
          active={ptab}
          onTab={setPtab}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          toggleLabel={collapsed ? t.vsc.expand : t.vsc.collapse}
        >
          {busy && <div className="vsc-loading" aria-hidden style={{ margin: "-6px -14px 6px" }} />}
          {ptab === "terminal" ? (
            !ran ? (
              <div className="vsc-empty">{t.vsc.panelEmpty}</div>
            ) : (
              <pre className="vsc-term" tabIndex={0} role="log" aria-live="polite" aria-label="Terminal">
                {PS}
                {"python main.py\n"}
                {busy && phase === "loading" && <span className="dim">{t.vsc.loadingPy + "\n"}</span>}
                {segs.map((sg, i) => (
                  <span key={i} className={sg.stream === "err" ? "err" : undefined}>
                    {sg.text}
                  </span>
                ))}
                {!busy && segs.length > 0 && !segs[segs.length - 1].text.endsWith("\n") ? "\n" : ""}
                {!busy && PS}
                {!busy && <span className="vsc-cursor" />}
              </pre>
            )
          ) : problems.length === 0 ? (
            <div className="vsc-empty">{t.vsc.noProblems}</div>
          ) : (
            problems.map((p, i) => <VscProblem key={i} kind={p.kind} text={p.text} src="main.py" />)
          )}
        </VscPanel>
        <VscStatusBar left="Python 3.12 (Pyodide)" ln={pos.ln} col={pos.col} spaces={t.vsc.spaces} lang="Python" />
      </VscWindow>
      <EditorKeysHint id={hintId} />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => void exec("check")}>
          <IconCheck size={16} /> {t.vsc.check}
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
                {confirm === "reset" ? "Вернуть исходный код? Твои изменения пропадут." : t.vsc.solutionConfirm}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  if (confirm === "reset") doReset();
                  else revealSolution();
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
          <VscWindow>
            <VscTabBar name="solution.py" kind="python" />
            <CodeEditor value={block.solution} lang="python" readOnly ariaLabel={`${t.vsc.showSolution}: solution.py`} minLines={3} />
          </VscWindow>
        </div>
      )}
    </BlockFrame>
  );
}
