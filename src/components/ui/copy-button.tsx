"use client";
import { useState } from "react";
import { IconCheck, IconCopy } from "@/icons";

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label={ok ? "Скопировано" : "Скопировать код"}
      className={`inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs text-[#9aa6bd] transition hover:bg-white/10 hover:text-white ${className}`}
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
      {ok ? <IconCheck size={16} /> : <IconCopy size={16} />}
      <span className="hidden sm:inline">{ok ? "Готово" : "Копировать"}</span>
    </button>
  );
}
