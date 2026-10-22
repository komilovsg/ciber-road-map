"use client";
import { useState, type ReactNode } from "react";
import { IconCheck, IconCopy, IconInfo, IconWarn } from "@/icons";

/** Light-themed copy button (the shared CopyButton is styled for dark code panes). */
export function CopyBtn({ text, label = "Копировать" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      aria-label={ok ? "Скопировано" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {ok ? <IconCheck size={16} className="text-ok" /> : <IconCopy size={16} />}
      <span>{ok ? "Скопировано" : label}</span>
    </button>
  );
}

/** Segmented toggle built from buttons (aria-pressed). */
export function Seg<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`btn btn-sm ${o.value === value ? "btn-primary" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "ok";
  title?: string;
  children: ReactNode;
}) {
  const cls =
    tone === "warn" ? "border-bad/40 bg-bad/10" : tone === "ok" ? "border-ok/40 bg-ok/10" : "border-line bg-paper";
  return (
    <div className={`flex gap-3 rounded-[10px] border p-3 text-[14px] leading-relaxed ${cls}`}>
      <span className={`mt-0.5 shrink-0 ${tone === "warn" ? "text-bad" : tone === "ok" ? "text-ok" : "text-accent"}`}>
        {tone === "warn" ? <IconWarn size={18} /> : <IconInfo size={18} />}
      </span>
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        <div className="text-muted [&_b]:text-ink">{children}</div>
      </div>
    </div>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
