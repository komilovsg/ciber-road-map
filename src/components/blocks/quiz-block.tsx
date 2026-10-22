"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Block, QuizQuestion } from "@/content/types";
import { BlockFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconX } from "@/icons";
import { fmt } from "@/i18n";
import { useT } from "@/i18n/context";
import { useBlockProgress } from "./block-context";
import { Md } from "./md";

type Ans = number[] | null;
const asArr = (a: number | number[]) => (Array.isArray(a) ? a : [a]);
const same = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

function Question({ q, idx, total, answered, onAnswer, blockIndex }: { q: QuizQuestion; idx: number; total: number; answered: Ans; onAnswer: (a: number[]) => void; blockIndex: number }) {
  const t = useT();
  const correct = asArr(q.answer);
  const multi = q.multi || correct.length > 1;
  const [sel, setSel] = useState<number[]>([]);
  const done = answered !== null;
  const ok = done && same(answered!, correct);
  const picked = done ? answered! : sel;

  return (
    <div className="border-t border-line pt-5 first:border-0 first:pt-0">
      <p className="eyebrow">{fmt(t.blocks.question, { n: idx + 1, m: total })}</p>
      <div className="mt-1.5 text-[17px] font-medium leading-snug"><Md md={q.q} blockIndex={blockIndex} compact /></div>
      {multi && !done && <p className="mt-1 text-[14px] text-muted">{t.blocks.multiHint}</p>}
      <ul className="mt-3 grid gap-2" role={multi ? "group" : "radiogroup"}>
        {q.options.map((o, i) => {
          const isSel = picked.includes(i);
          const isRight = done && correct.includes(i);
          const isWrongPick = done && isSel && !correct.includes(i);
          return (
            <li key={i}>
              <motion.button
                type="button"
                disabled={done}
                role={multi ? "checkbox" : "radio"}
                aria-checked={isSel}
                animate={isWrongPick ? shake : undefined}
                whileTap={done ? undefined : { scale: 0.99 }}
                onClick={() => {
                  if (multi) setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
                  else onAnswer([i]);
                }}
                className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-left text-[16px] transition-colors ${
                  isRight ? "border-ok bg-ok/10" : isWrongPick ? "border-bad bg-bad/10" : isSel ? "border-accent bg-accent/10" : "border-line bg-paper hover:border-[color-mix(in_srgb,var(--ink)_35%,var(--line))]"
                } ${done && !isRight && !isWrongPick ? "opacity-60" : ""}`}
              >
                <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center border text-[12px] font-mono ${multi ? "rounded-[6px]" : "rounded-full"} ${isRight ? "border-ok" : isWrongPick ? "border-bad" : isSel ? "border-accent bg-accent text-[var(--accent-ink)]" : "border-line"}`}>
                  {isRight ? <DrawCheck size={16} /> : isWrongPick ? <IconX size={14} className="text-bad" /> : isSel ? "✓" : String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1 [&_.prose-kr]:max-w-none"><Md md={o} blockIndex={blockIndex} compact /></span>
              </motion.button>
            </li>
          );
        })}
      </ul>
      {multi && !done && (
        <button type="button" className="btn btn-primary mt-3" disabled={sel.length === 0} onClick={() => onAnswer(sel)}>{t.blocks.check}</button>
      )}
      <AnimatePresence initial={false}>
        {done && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden" aria-live="polite">
            <div className={`mt-3 rounded-[10px] border-l-[3px] bg-paper px-4 py-3 ${ok ? "border-ok" : "border-bad"}`}>
              <p className={`font-semibold ${ok ? "text-ok" : "text-bad"}`}>{ok ? t.blocks.right : t.blocks.wrong}</p>
              <div className="mt-1 text-[15px]"><Md md={q.explain} blockIndex={blockIndex} compact /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QuizBlock({ block, index }: { block: Extract<Block, { kind: "quiz" }>; index: number }) {
  const t = useT();
  const { solved, solve, data, setData } = useBlockProgress<{ a: Ans[] }>();
  const [local, setLocal] = useState<Ans[] | null>(null);
  const [round, setRound] = useState(0);
  const answers: Ans[] = local ?? data?.a ?? block.questions.map(() => null);
  const norm = answers.length === block.questions.length ? answers : block.questions.map(() => null);
  const answeredAll = norm.every((a) => a !== null);
  const score = norm.filter((a, i) => a && same(a, asArr(block.questions[i].answer))).length;

  const onAnswer = (i: number, a: number[]) => {
    const next = norm.map((x, j) => (j === i ? a : x));
    setLocal(next);
    setData({ a: next });
    if (next.every((x) => x !== null)) solve();
  };

  return (
    <BlockFrame label={t.blocks.quiz} title={block.title} solved={solved}>
      <div key={round} className="grid gap-5">
        {block.questions.map((q, i) => (
          <Question key={i} q={q} idx={i} total={block.questions.length} answered={norm[i]} onAnswer={(a) => onAnswer(i, a)} blockIndex={index} />
        ))}
      </div>
      {answeredAll && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <p className="font-display text-lg font-semibold">{fmt(t.blocks.score, { a: score, b: block.questions.length })}</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              const empty = block.questions.map(() => null);
              setLocal(empty);
              setData({ a: empty });
              setRound((r) => r + 1);
            }}
          >
            {t.blocks.retry}
          </button>
        </motion.div>
      )}
    </BlockFrame>
  );
}
