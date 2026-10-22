"use client";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Block } from "@/content/types";
import { BlockFrame, seededShuffle, shake } from "@/components/ui/frames";
import { useT } from "@/i18n/context";
import { useBlockProgress } from "./block-context";

const HUES = ["#2F4BFF", "#E5484D", "#1FA35B", "#FF8A00", "#7A5CFF", "#00A3A3", "#E0359B", "#B08400"];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

export function MatchBlock({ block }: { block: Extract<Block, { kind: "match" }> }) {
  const t = useT();
  const { solved, solve } = useBlockProgress();
  const n = block.pairs.length;
  const seed = hash(block.title) + n;
  const leftOrder = useMemo(() => seededShuffle(block.pairs.map((_, i) => i), seed), [block.pairs, seed]);
  const rightOrder = useMemo(() => seededShuffle(block.pairs.map((_, i) => i), seed * 3 + 1), [block.pairs, seed]);
  const [sel, setSel] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]); // pair indices, in order matched
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);
  const allDone = solved || matched.length === n;
  const colorOf = (pi: number) => HUES[(solved && !matched.includes(pi) ? pi : matched.indexOf(pi)) % HUES.length];
  const isMatched = (pi: number) => allDone || matched.includes(pi);

  const pickRight = (r: number) => {
    if (sel === null || isMatched(r)) return;
    if (sel === r) {
      const next = [...matched, r];
      setMatched(next);
      setSel(null);
      if (next.length === n) solve();
    } else {
      setWrong({ l: sel, r });
      setSel(null);
      setTimeout(() => setWrong(null), 450);
    }
  };

  const cell = (pi: number, side: "l" | "r") => {
    const m = isMatched(pi);
    const c = colorOf(pi);
    const isSel = side === "l" && sel === pi;
    const isWrong = wrong && (side === "l" ? wrong.l === pi : wrong.r === pi);
    return (
      <motion.button
        key={`${side}${pi}`}
        type="button"
        disabled={m}
        aria-pressed={isSel}
        onClick={() => (side === "l" ? !m && setSel(isSel ? null : pi) : pickRight(pi))}
        animate={isWrong ? shake : undefined}
        whileTap={m ? undefined : { scale: 0.98 }}
        className={`min-h-12 w-full rounded-[10px] border px-3 py-2 text-left text-[15px] leading-snug transition-colors ${isSel ? "border-accent bg-accent/10" : isWrong ? "border-bad bg-bad/10" : "border-line bg-paper"}`}
        style={m ? { borderColor: c, background: `color-mix(in srgb, ${c} 14%, var(--card))` } : undefined}
      >
        {side === "l" ? block.pairs[pi].left : block.pairs[pi].right}
      </motion.button>
    );
  };

  return (
    <BlockFrame label={t.blocks.match} title={block.title} solved={allDone}>
      <p className="mb-3 text-[14px] text-muted">{t.blocks.matchHint}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-6">
        <div className="grid content-start gap-2">{leftOrder.map((pi) => cell(pi, "l"))}</div>
        <div className="grid content-start gap-2">{rightOrder.map((pi) => cell(pi, "r"))}</div>
      </div>
    </BlockFrame>
  );
}
