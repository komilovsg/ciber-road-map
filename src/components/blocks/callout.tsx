"use client";
import type { ReactNode } from "react";
import { IconBulb, IconInfo, IconShield, IconWarn } from "@/icons";
import { useT } from "@/i18n/context";
import { Md } from "./md";

const TONES: Record<string, { c: string; icon: ReactNode }> = {
  info: { c: "var(--accent)", icon: <IconInfo size={20} /> },
  tip: { c: "var(--ok)", icon: <IconBulb size={20} /> },
  warn: { c: "var(--xp)", icon: <IconWarn size={20} /> },
  legal: { c: "var(--bad)", icon: <IconShield size={20} /> },
};

export function Callout({ tone, title, md, blockIndex }: { tone: "info" | "tip" | "warn" | "legal"; title?: string; md: string; blockIndex: number }) {
  const t = useT();
  const x = TONES[tone];
  const heading = tone === "legal" ? t.blocks.callout.legal : (title ?? t.blocks.callout[tone]);
  return (
    <aside
      className="my-6 max-w-[68ch] rounded-[14px] border p-4 sm:p-5"
      style={{ borderColor: `color-mix(in srgb, ${x.c} 35%, var(--line))`, background: `color-mix(in srgb, ${x.c} ${tone === "legal" ? 9 : 7}%, var(--card))` }}
    >
      <p className="flex items-center gap-2 font-display text-[16px] font-semibold" style={{ color: x.c }}>
        {x.icon}
        {heading}
      </p>
      {tone === "legal" && title && <p className="mt-1 text-[15px] font-medium">{title}</p>}
      <div className="mt-2">
        <Md md={md} blockIndex={blockIndex} compact />
      </div>
    </aside>
  );
}
