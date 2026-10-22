"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Block } from "@/content/types";
import { BlockFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconBulb } from "@/icons";
import { useT } from "@/i18n/context";
import { useBlockProgress } from "./block-context";
import { Md } from "./md";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function AnswerBlock({ block, index }: { block: Extract<Block, { kind: "answer" }>; index: number }) {
  const t = useT();
  const { solved, solve } = useBlockProgress();
  const [v, setV] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "bad">("idle");
  const [hint, setHint] = useState(false);
  const ok = solved || state === "ok";
  const accepted = block.accept.map(norm);

  return (
    <BlockFrame label={t.blocks.answer} title={block.title} solved={solved}>
      <div className="text-[16px]"><Md md={block.prompt} blockIndex={index} compact /></div>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          if (accepted.includes(norm(v))) {
            setState("ok");
            solve();
          } else setState("bad");
        }}
      >
        <motion.div className="min-w-0 flex-1" animate={state === "bad" ? shake : undefined}>
        <input
          className="input mono"
          value={ok && !v ? norm(block.accept[0]) : v}
          readOnly={ok}
          placeholder={t.blocks.answerPh}
          aria-label={block.title}
          aria-invalid={state === "bad"}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setV(e.target.value); setState("idle"); }}
        />
        </motion.div>
        <button type="submit" className="btn btn-primary shrink-0" disabled={ok}>{t.blocks.check}</button>
        {block.hint && !ok && (
          <button type="button" className="btn shrink-0" onClick={() => setHint((h) => !h)} aria-expanded={hint}><IconBulb size={16} />{t.blocks.hint}</button>
        )}
      </form>
      <div aria-live="polite">
        {state === "bad" && <p className="mt-2 text-[15px] text-bad">{t.blocks.notYet}</p>}
        <AnimatePresence initial={false}>
          {hint && block.hint && !ok && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 overflow-hidden rounded-[10px] bg-paper px-3 py-2 text-[15px] text-muted">
              {block.hint}
            </motion.p>
          )}
          {ok && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex gap-2 text-[15px]">
              <span className="mt-0.5 shrink-0"><DrawCheck size={20} /></span>
              <div className="min-w-0">
                <p className="font-semibold text-ok">{t.blocks.right}</p>
                {block.explain && <Md md={block.explain} blockIndex={index} compact />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BlockFrame>
  );
}
