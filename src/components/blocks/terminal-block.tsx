"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Block } from "@/content/types";
import { BlockFrame, DrawCheck } from "@/components/ui/frames";
import { IconArrowDown, IconArrowUp, IconBulb, IconReset, IconSend, IconTrophy } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { Shell, lineText, type Line, type Seg, type SegClass } from "@/components/blocks/terminal/shell";

type TerminalBlockData = Extract<Block, { kind: "terminal" }>;
type Saved = { done: number[] };
interface Entry {
  prompt: Seg[];
  cmd: string;
  lines: Line[];
}

const SEG_COLOR: Record<SegClass, string> = {
  dir: "#7fa6ff",
  exe: "#5fd38d",
  err: "#ff8080",
  dim: "#8d97a8",
  hl: "#ff6b6b",
  file: "#d58cff",
  ok: "#5fd38d",
  sep: "#5fd1d1",
};
const BOLD: SegClass[] = ["dir", "exe", "hl", "ok"];
const MAX_ENTRIES = 300;

function Segs({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.c ? (
          <span key={i} style={{ color: SEG_COLOR[s.c], fontWeight: BOLD.includes(s.c) ? 600 : undefined }}>
            {s.t}
          </span>
        ) : (
          <Fragment key={i}>{s.t}</Fragment>
        ),
      )}
    </>
  );
}

/** Tiny inline markdown: **bold**, `code`; blank line = new paragraph. */
function MdLite({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="mb-3 text-[15px] leading-relaxed text-ink/90">
          {p.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, j): ReactNode => {
            if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={j}>{part.slice(2, -2)}</strong>;
            if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
              return (
                <code key={j} className="rounded bg-code px-1.5 py-0.5 font-mono text-[13px] text-[var(--code-ink)]">
                  {part.slice(1, -1)}
                </code>
              );
            return <Fragment key={j}>{part}</Fragment>;
          })}
        </p>
      ))}
    </>
  );
}

const trimSlash = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

function taskMatches(check: TerminalBlockData["tasks"][number]["check"], cmd: string, output: string, cwd: string): boolean {
  if (check.command !== undefined) {
    try {
      if (!new RegExp(check.command).test(cmd)) return false;
    } catch {
      return false;
    }
  }
  if (check.output !== undefined && !output.includes(check.output)) return false;
  if (check.cwd !== undefined && trimSlash(check.cwd) !== trimSlash(cwd)) return false;
  return true;
}

export function TerminalBlock({ block }: { block: TerminalBlockData }) {
  const { solved, solve, data, setData } = useBlockProgress<Saved>();
  const total = block.tasks.length;
  const makeShell = useCallback(() => new Shell(block.fs, { user: block.user, cwd: block.cwd }), [block.fs, block.user, block.cwd]);
  const [shell, setShell] = useState<Shell>(makeShell);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [localDone, setLocalDone] = useState<number[]>([]);
  const [hints, setHints] = useState<number[]>([]);
  const [, bump] = useState(0);
  const paneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hIdx = useRef(-1);
  const draft = useRef("");

  const doneSet = useMemo(() => {
    if (solved) return new Set(block.tasks.map((_, i) => i));
    return new Set([...(data?.done ?? []), ...localDone].filter((i) => i >= 0 && i < total));
  }, [solved, data, localDone, block.tasks, total]);
  const doneCount = doneSet.size;
  const allDone = doneCount === total && total > 0;

  useEffect(() => {
    const el = paneRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, input]);

  const focusInput = () => inputRef.current?.focus({ preventScroll: true });

  const push = (e: Entry) => setEntries((prev) => [...prev, e].slice(-MAX_ENTRIES));

  const submit = (raw?: string) => {
    const line = raw ?? input;
    const prompt = shell.prompt();
    setInput("");
    hIdx.current = -1;
    draft.current = "";
    if (!line.trim()) {
      push({ prompt, cmd: "", lines: [] });
      return;
    }
    const r = shell.run(line);
    if (r.clear) setEntries([]);
    else push({ prompt, cmd: line, lines: r.lines });
    bump((x) => x + 1);
    // evaluate tasks
    const output = r.lines.map(lineText).join("\n");
    const newly: number[] = [];
    block.tasks.forEach((t, i) => {
      if (!doneSet.has(i) && taskMatches(t.check, line, output, r.cwd)) newly.push(i);
    });
    if (newly.length) {
      const next = [...doneSet, ...newly].sort((a, b) => a - b);
      setLocalDone((prev) => [...new Set([...prev, ...newly])]);
      setData({ done: next });
      if (next.length === total && !solved) solve();
    }
  };

  const historyMove = (dir: -1 | 1) => {
    const h = shell.history;
    if (!h.length) return;
    if (dir === -1) {
      if (hIdx.current === -1) {
        draft.current = input;
        hIdx.current = h.length - 1;
      } else if (hIdx.current > 0) hIdx.current--;
      setInput(h[hIdx.current]);
    } else {
      if (hIdx.current === -1) return;
      if (hIdx.current < h.length - 1) {
        hIdx.current++;
        setInput(h[hIdx.current]);
      } else {
        hIdx.current = -1;
        setInput(draft.current);
      }
    }
  };

  const tab = () => {
    const r = shell.complete(input);
    if (r.line !== input) setInput(r.line);
    else if (r.candidates.length > 1) {
      push({ prompt: shell.prompt(), cmd: input, lines: [[{ t: r.candidates.join("  ") }]] });
    }
  };

  const ctrlC = () => {
    push({ prompt: shell.prompt(), cmd: input + "^C", lines: [] });
    setInput("");
    hIdx.current = -1;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      historyMove(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      historyMove(1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      tab();
    } else if (e.ctrlKey && e.key.toLowerCase() === "c" && !window.getSelection()?.toString()) {
      e.preventDefault();
      ctrlC();
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setEntries([]);
    } else if (e.ctrlKey && e.key.toLowerCase() === "u") {
      e.preventDefault();
      setInput("");
    }
  };

  const reset = () => {
    setShell(makeShell());
    setEntries([]);
    setInput("");
    setLocalDone([]);
    setHints([]);
    hIdx.current = -1;
    draft.current = "";
    focusInput();
  };

  // keep buttons from stealing focus (keeps the mobile keyboard open)
  const keep = (e: React.SyntheticEvent) => e.preventDefault();
  return (
    <BlockFrame
      label="Терминал"
      title={block.title}
      solved={solved || allDone}
      actions={
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset} aria-label="Сбросить терминал">
          <IconReset size={16} /> <span className="hidden sm:inline">Сбросить</span>
        </button>
      }
    >
      {block.intro && (
        <div className="mb-3">
          <MdLite text={block.intro} />
        </div>
      )}
      <div className="grid gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0">
          <div
            ref={paneRef}
            role="log"
            aria-live="polite"
            aria-label="Вывод терминала"
            onClick={() => {
              if (!window.getSelection()?.toString()) focusInput();
            }}
            className="max-h-[min(340px,55vh)] min-h-[200px] cursor-text overflow-auto rounded-[12px] bg-code p-3 font-mono text-[14px] leading-[1.55] text-[var(--code-ink)] focus-within:ring-2 focus-within:ring-accent/60 [@media(pointer:coarse)]:text-[16px]"
          >
            {entries.length === 0 && (
              <div className="mb-1 text-[13px]" style={{ color: SEG_COLOR.dim }}>
                Учебный терминал. Введи команду и нажми Enter. Команда help покажет список команд.
              </div>
            )}
            {entries.map((e, i) => (
              <div key={i}>
                <div className="whitespace-pre-wrap break-all">
                  <Segs segs={e.prompt} />
                  {e.cmd}
                </div>
                {e.lines.map((l, j) => (
                  <div key={j} className="min-h-[1.55em] whitespace-pre-wrap break-words">
                    <Segs segs={l} />
                  </div>
                ))}
              </div>
            ))}
            <div className="flex items-baseline">
              <span className="shrink-0 whitespace-pre">
                <Segs segs={shell.prompt()} />
              </span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  hIdx.current = -1;
                }}
                onKeyDown={onKeyDown}
                onFocus={() => {
                  window.setTimeout(() => inputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
                }}
                aria-label="Командная строка"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="send"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[14px] text-[var(--code-ink)] caret-[var(--code-ink)] outline-none [@media(pointer:coarse)]:text-[16px]"
                style={{ minHeight: 22 }}
              />
            </div>
          </div>
          <div className="mt-2 hidden flex-wrap gap-2 [@media(pointer:coarse)]:flex">
            <QuickKey aria="Дополнить по Tab" onPress={tab} after={focusInput}>Tab</QuickKey>
            <QuickKey aria="Предыдущая команда" onPress={() => historyMove(-1)} after={focusInput}><IconArrowUp size={18} /></QuickKey>
            <QuickKey aria="Следующая команда" onPress={() => historyMove(1)} after={focusInput}><IconArrowDown size={18} /></QuickKey>
            <QuickKey aria="Прервать ввод (Ctrl+C)" onPress={ctrlC} after={focusInput}>Ctrl+C</QuickKey>
            <button
              type="button"
              onPointerDown={keep}
              onMouseDown={keep}
              onClick={() => {
                submit();
                focusInput();
              }}
              className="btn btn-primary ml-auto min-h-[44px] px-5"
            >
              <IconSend size={16} /> Ввод
            </button>
          </div>
          <p className="mt-2 hidden text-[13px] text-muted [@media(pointer:fine)]:block">
            Tab — дополнить, ↑/↓ — история, Ctrl+L — очистить, Ctrl+C — отменить ввод.
          </p>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Задания</span>
            <span className="chip" aria-label={`Выполнено ${doneCount} из ${total}`}>
              {doneCount}/{total}
            </span>
          </div>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {block.tasks.map((t, i) => {
              const done = doneSet.has(i);
              const showHint = hints.includes(i) && !done;
              return (
                <li
                  key={i}
                  className={`rounded-[10px] border px-3 py-2 transition-colors duration-500 ${
                    done ? "border-ok/40 bg-ok/10" : "border-line bg-card"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                        done ? "border-ok bg-ok/15" : "border-line"
                      }`}
                    >
                      {done && (solved && doneCount === total && localDone.length === 0 ? <DrawStatic /> : <DrawCheck size={14} />)}
                    </span>
                    <span className={`text-[14.5px] leading-snug ${done ? "text-muted" : "text-ink"}`}>
                      <span className="sr-only">{done ? "Выполнено: " : "Не выполнено: "}</span>
                      {t.prompt}
                    </span>
                  </div>
                  {t.hint && !done && (
                    <div className="mt-1 pl-[32px]">
                      <button
                        type="button"
                        className="inline-flex min-h-[32px] items-center gap-1 text-[13px] font-medium text-accent [@media(pointer:coarse)]:min-h-[44px]"
                        aria-expanded={showHint}
                        onClick={() => setHints((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i]))}
                      >
                        <IconBulb size={14} /> Подсказка
                      </button>
                      <AnimatePresence initial={false}>
                        {showHint && (
                          <motion.code
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1 block overflow-hidden whitespace-pre-wrap break-words rounded-md bg-code px-2 py-1 font-mono text-[13px] text-[var(--code-ink)]"
                          >
                            {t.hint}
                          </motion.code>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div aria-live="polite">
            {allDone && (
              <motion.div
                initial={solved && localDone.length === 0 ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="mt-3 flex items-center gap-2 rounded-[10px] bg-ok/15 px-3 py-2.5 text-[14.5px] font-semibold text-ok"
              >
                <IconTrophy size={18} /> Все задания выполнены
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </BlockFrame>
  );
}

function QuickKey({ aria, onPress, after, children }: { aria: string; onPress: () => void; after: () => void; children: ReactNode }) {
  // preventDefault on press keeps focus in the input (mobile keyboard stays open)
  const keep = (e: React.SyntheticEvent) => e.preventDefault();
  return (
    <button
      type="button"
      aria-label={aria}
      onPointerDown={keep}
      onMouseDown={keep}
      onClick={() => {
        onPress();
        after();
      }}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border border-white/15 bg-white/5 px-3 font-mono text-[14px] text-[var(--code-ink)] active:bg-white/15"
    >
      {children}
    </button>
  );
}

/** Non-animated check for tasks restored from progress. */
function DrawStatic() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--ok)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
