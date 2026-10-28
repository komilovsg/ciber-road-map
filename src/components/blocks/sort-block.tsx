"use client";
import { motion } from "motion/react";
import { useState } from "react";
import type { Block } from "@/content/types";
import { BlockFrame, seededShuffle, shake } from "@/components/ui/frames";
import { IconCheck, IconX } from "@/icons";
import { useT } from "@/i18n/context";
import { useBlockProgress } from "./block-context";

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 13);

export function SortBlock({ block }: { block: Extract<Block, { kind: "sort" }> }) {
  const t = useT();
  const { solved, solve } = useBlockProgress();
  const [order] = useState(() => seededShuffle(block.items.map((_, i) => i), hash(block.title) + block.items.length));
  const [placed, setPlaced] = useState<Record<number, number>>({}); // item -> bucket
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const pool = order.filter((i) => placed[i] === undefined);
  const allPlaced = pool.length === 0;
  const allRight = block.items.every((it, i) => placed[i] === it.bucket);
  const showSolved = solved && Object.keys(placed).length === 0;

  const place = (b: number) => {
    if (sel === null) return;
    setPlaced((p) => ({ ...p, [sel]: b }));
    setSel(null);
    setChecked(false);
  };

  const chip = (i: number, state: "idle" | "ok" | "bad") => (
    <motion.button
      key={i}
      type="button"
      layout
      animate={state === "bad" ? shake : undefined}
      aria-pressed={sel === i}
      onClick={() => {
        if (placed[i] !== undefined) {
          setPlaced((p) => { const n = { ...p }; delete n[i]; return n; });
          setChecked(false);
        } else setSel(sel === i ? null : i);
      }}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-left text-[16px] ${sel === i ? "border-accent bg-accent/15" : state === "ok" ? "border-ok bg-ok/10" : state === "bad" ? "border-bad bg-bad/10" : "border-transparent bg-ink/[0.07]"}`}
    >
      {state === "ok" && <IconCheck size={15} className="text-ok" />}
      {state === "bad" && <IconX size={15} className="text-bad" />}
      {block.items[i].text}
    </motion.button>
  );

  return (
    <BlockFrame label={t.blocks.sort} title={block.title} solved={solved || (checked && allRight)}>
      <p className="mb-3 text-[14px] text-muted">{t.blocks.sortHint}</p>
      {!showSolved && (
        <div className="mb-4 flex min-h-12 flex-wrap gap-2 rounded-[12px] p-2" aria-label="items">
          {pool.map((i) => chip(i, "idle"))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2" style={{ gridTemplateColumns: block.buckets.length > 2 ? undefined : undefined }}>
        {block.buckets.map((b, bi) => {
          const inB = showSolved ? block.items.map((_, i) => i).filter((i) => block.items[i].bucket === bi) : order.filter((i) => placed[i] === bi);
          return (
            <button
              key={bi}
              type="button"
              disabled={sel === null}
              onClick={() => place(bi)}
              aria-label={b}
              className={`flex min-h-24 flex-col items-stretch rounded-[12px] border p-2.5 text-left transition-colors disabled:cursor-default ${sel !== null ? "border-accent bg-accent/5" : "border-transparent bg-paper"}`}
            >
              <span className="mb-2 font-display text-[15px] font-semibold">{b}</span>
              <span className="flex flex-wrap gap-2">
                {inB.map((i) => (
                  <span key={i} onClick={(e) => e.stopPropagation()}>
                    {showSolved ? <span className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-ok bg-ok/10 px-3 text-[15px]"><IconCheck size={15} className="text-ok" />{block.items[i].text}</span> : chip(i, checked ? (block.items[i].bucket === bi ? "ok" : "bad") : "idle")}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {!showSolved && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allPlaced}
            onClick={() => {
              setChecked(true);
              if (allRight) solve();
            }}
          >
            {t.blocks.check}
          </button>
          <p aria-live="polite" className={`text-[15px] ${checked && allRight ? "text-ok" : "text-muted"}`}>{checked ? (allRight ? t.blocks.right : t.blocks.notYet) : ""}</p>
        </div>
      )}
    </BlockFrame>
  );
}
