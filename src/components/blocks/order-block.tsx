"use client";
import { Reorder, useDragControls } from "motion/react";
import { useState } from "react";
import type { Block } from "@/content/types";
import { BlockFrame, seededShuffle } from "@/components/ui/frames";
import { IconArrowDown, IconArrowUp, IconCheck, IconX } from "@/icons";
import { useT } from "@/i18n/context";
import { useBlockProgress } from "./block-context";

type Item = { id: number; text: string };
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 11);

function Row({ item, pos, total, state, onMove }: { item: Item; pos: number; total: number; state: "idle" | "ok" | "bad"; onMove: (d: number) => void }) {
  const t = useT();
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className={`flex min-h-12 items-center gap-2 rounded-[10px] border bg-card py-1.5 pl-2 pr-1.5 ${state === "ok" ? "border-ok bg-ok/10" : state === "bad" ? "border-bad bg-bad/10" : "border-line"}`}
      whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px -10px rgba(0,0,0,.35)", zIndex: 5 }}
      layout="position"
    >
      <span
        aria-hidden
        onPointerDown={(e) => controls.start(e)}
        className="grid h-10 w-8 shrink-0 cursor-grab place-items-center text-muted active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor"><circle cx="4" cy="4" r="1.6" /><circle cx="10" cy="4" r="1.6" /><circle cx="4" cy="9" r="1.6" /><circle cx="10" cy="9" r="1.6" /><circle cx="4" cy="14" r="1.6" /><circle cx="10" cy="14" r="1.6" /></svg>
      </span>
      <span className="font-mono text-[12px] text-muted">{pos + 1}</span>
      <span className="min-w-0 flex-1 text-[15px] leading-snug">{item.text}</span>
      {state === "ok" && <IconCheck size={18} className="text-ok" />}
      {state === "bad" && <IconX size={18} className="text-bad" />}
      <button type="button" className="btn btn-sm !px-0 !w-9 !min-h-9 border-transparent" aria-label={t.blocks.up} disabled={pos === 0} onClick={() => onMove(-1)}><IconArrowUp size={16} /></button>
      <button type="button" className="btn btn-sm !px-0 !w-9 !min-h-9 border-transparent" aria-label={t.blocks.down} disabled={pos === total - 1} onClick={() => onMove(1)}><IconArrowDown size={16} /></button>
    </Reorder.Item>
  );
}

export function OrderBlock({ block }: { block: Extract<Block, { kind: "order" }> }) {
  const t = useT();
  const { solved, solve } = useBlockProgress();
  const [items, setItems] = useState<Item[]>(() => {
    const base = block.items.map((text, id) => ({ id, text }));
    let s = seededShuffle(base, hash(block.title) + base.length);
    if (s.every((x, i) => x.id === i) && s.length > 1) s = [...s.slice(1), s[0]];
    return s;
  });
  const [checked, setChecked] = useState(false);
  const correctNow = items.every((x, i) => x.id === i);
  const done = solved || (checked && correctNow);

  const move = (i: number, d: number) => {
    setChecked(false);
    setItems((arr) => {
      const a = [...arr];
      const j = i + d;
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  };
  const display = solved && !checked ? block.items.map((text, id) => ({ id, text })) : items;

  return (
    <BlockFrame label={t.blocks.order} title={block.title} solved={done}>
      <p className="mb-3 text-[14px] text-muted">{t.blocks.orderHint}</p>
      <Reorder.Group axis="y" values={display} onReorder={(v) => { setChecked(false); setItems(v); }} className="grid gap-2">
        {display.map((it, i) => (
          <Row key={it.id} item={it} pos={i} total={display.length} state={checked || solved ? (it.id === i ? "ok" : "bad") : "idle"} onMove={(d) => move(i, d)} />
        ))}
      </Reorder.Group>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setChecked(true);
            if (correctNow) solve();
          }}
        >
          {t.blocks.check}
        </button>
        <p aria-live="polite" className={`text-[15px] ${correctNow && checked ? "text-ok" : "text-muted"}`}>
          {checked ? (correctNow ? t.blocks.right : t.blocks.notYet) : ""}
        </p>
      </div>
    </BlockFrame>
  );
}
