"use client";
import { useState } from "react";
import type { Block } from "@/content/types";
import { BlockFrame } from "@/components/ui/frames";
import { IconCheck, IconExternal } from "@/icons";
import { fmt } from "@/i18n";
import { useT } from "@/i18n/context";
import { useBlockProgress } from "./block-context";
import { Md } from "./md";

export function ExternalBlock({ block, index }: { block: Extract<Block, { kind: "external" }>; index: number }) {
  const t = useT();
  const { solved, solve, data, setData } = useBlockProgress<{ c: number[] }>();
  const [local, setLocal] = useState<number[] | null>(null);
  const checked = local ?? data?.c ?? (solved ? block.steps.map((_, i) => i) : []);
  const toggle = (i: number) => {
    const next = checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i];
    setLocal(next);
    setData({ c: next });
    if (next.length === block.steps.length) solve();
  };
  return (
    <BlockFrame label={t.blocks.external} title={block.title} solved={solved}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip">{block.platform}</span>
        <a href={block.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
          {fmt(t.blocks.openPlatform, { p: block.platform })} <IconExternal size={16} />
        </a>
      </div>
      {block.md && <div className="mt-3"><Md md={block.md} blockIndex={index} compact /></div>}
      <p className="eyebrow mt-4">{t.blocks.steps} · {checked.length}/{block.steps.length}</p>
      <ul className="mt-2 grid gap-1.5">
        {block.steps.map((s, i) => {
          const on = checked.includes(i);
          return (
            <li key={i}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(i)} className="flex min-h-11 w-full items-start gap-3 rounded-[10px] px-2 py-2 text-left text-[15px] hover:bg-paper">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition-colors ${on ? "border-ok bg-ok text-white" : "border-line bg-card"}`}>{on && <IconCheck size={14} />}</span>
                <span className={on ? "text-muted line-through" : ""}>{s}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </BlockFrame>
  );
}
