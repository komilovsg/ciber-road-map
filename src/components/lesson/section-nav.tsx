"use client";
import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/md-utils";
import { IconList } from "@/icons";
import { useT } from "@/i18n/context";

/** «Содержание»: button + popover list of the lesson's headings. */
export function SectionNav({ headings }: { headings: Heading[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (headings.length === 0) return null;
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconList size={16} />
        {t.lesson.toc}
      </button>
      {open && (
        <nav aria-label={t.lesson.toc} className="absolute right-0 top-full z-30 mt-1 max-h-[70dvh] w-[min(320px,calc(100vw-32px))] overflow-y-auto rounded-[12px] border border-line bg-paper p-2 shadow-lg">
          <ul>
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} onClick={() => setOpen(false)} className={`flex min-h-11 items-center rounded-[8px] py-1.5 pr-3 text-[16px] leading-snug hover:bg-ink/5 ${h.level === 3 ? "pl-6 text-muted" : "pl-3"}`}>
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
