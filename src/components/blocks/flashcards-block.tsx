"use client";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useState } from "react";
import type { Block } from "@/content/types";
import { BlockFrame } from "@/components/ui/frames";
import { IconArrowLeft, IconArrowRight, IconCheck, IconRefresh } from "@/icons";
import { fmt } from "@/i18n";
import { useT } from "@/i18n/context";
import { useBlockProgress } from "./block-context";
import { Md } from "./md";

export function FlashcardsBlock({ block, index }: { block: Extract<Block, { kind: "flashcards" }>; index: number }) {
  const t = useT();
  const { data, setData } = useBlockProgress<{ known: number[] }>();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState(1);
  const known = data?.known ?? [];
  const n = block.cards.length;
  if (n === 0) return null;
  const card = block.cards[i];

  const go = (d: number) => {
    setDir(d);
    setFlipped(false);
    setI((x) => (x + d + n) % n);
  };
  const mark = (k: boolean) => {
    setData({ known: k ? Array.from(new Set([...known, i])) : known.filter((x) => x !== i) });
    if (i < n - 1) go(1);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(1);
    else if (info.offset.x > 60) go(-1);
  };

  return (
    <BlockFrame label={t.blocks.flash} title={block.title}>
      <div
        className="mx-auto max-w-[520px]"
        tabIndex={0}
        role="group"
        aria-label={t.blocks.flash}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          else if (e.key === "ArrowLeft") go(-1);
          else if (e.key === " " || e.key === "Enter") {
            if (e.target === e.currentTarget) { e.preventDefault(); setFlipped((f) => !f); }
          }
        }}
      >
        <div className="mb-2 flex items-center justify-between text-[14px] text-muted">
          <span className="font-mono">{fmt(t.blocks.cardOf, { n: i + 1, m: n })}</span>
          <span>{fmt(t.blocks.known, { n: known.length })}</span>
        </div>
        <div style={{ perspective: 1200 }}>
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={i}
              custom={dir}
              initial={{ opacity: 0, x: 40 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 * dir }}
              transition={{ duration: 0.18 }}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={onDragEnd}
              style={{ touchAction: "pan-y" }}
            >
              <motion.button
                type="button"
                aria-label={t.blocks.flip}
                aria-pressed={flipped}
                onClick={() => setFlipped((f) => !f)}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="relative block min-h-[200px] w-full cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
              >
                <span className="absolute inset-0 grid place-items-center rounded-[14px] border border-line bg-paper p-6 text-center font-display text-[22px] font-semibold leading-snug" style={{ backfaceVisibility: "hidden" }}>
                  <span>{card.front}</span>
                  <span className="absolute bottom-3 text-[12px] font-normal text-muted">{t.blocks.flip}</span>
                </span>
                <span className="absolute inset-0 grid place-items-center overflow-auto rounded-[14px] border p-6 text-center text-[17px] leading-relaxed" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderColor: "var(--line-color)", background: "color-mix(in srgb, var(--line-color) 8%, var(--card))" }}>
                  <span className="[&_.prose-kr]:max-w-none"><Md md={card.back} blockIndex={index} compact /></span>
                </span>
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-4 grid grid-cols-[44px_1fr_1fr_44px] items-center gap-2">
          <button type="button" className="btn btn-sm !px-0" aria-label={t.blocks.prevCard} onClick={() => go(-1)}><IconArrowLeft size={18} /></button>
          <button type="button" className="btn btn-sm" onClick={() => mark(false)}><IconRefresh size={16} />{t.blocks.repeat}</button>
          <button type="button" className={`btn btn-sm ${known.includes(i) ? "btn-ok" : ""}`} onClick={() => mark(true)}><IconCheck size={16} />{t.blocks.know}</button>
          <button type="button" className="btn btn-sm !px-0" aria-label={t.blocks.nextCard} onClick={() => go(1)}><IconArrowRight size={18} /></button>
        </div>
      </div>
    </BlockFrame>
  );
}
