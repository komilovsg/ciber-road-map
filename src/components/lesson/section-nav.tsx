"use client";
import { useEffect, useState } from "react";
import type { Heading } from "@/lib/md-utils";
import { useT } from "@/i18n/context";

export function SectionNav({ headings }: { headings: Heading[] }) {
  const t = useT();
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-72px 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [headings]);
  if (headings.length === 0) return null;
  return (
    <nav aria-label={t.lesson.onThisPage} className="text-[14px]">
      <p className="eyebrow mb-2">{t.lesson.onThisPage}</p>
      <ul className="border-l border-line">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`-ml-px block border-l-2 py-1.5 leading-snug transition-colors ${h.level === 3 ? "pl-6" : "pl-3"} ${active === h.id ? "border-lc font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
