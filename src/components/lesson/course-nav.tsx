"use client";
import Link from "next/link";
import { useState } from "react";
import type { WeekMeta } from "@/lib/content-meta";
import { useProgress } from "@/lib/progress";
import { useI18n } from "@/i18n/context";
import { fmt } from "@/i18n";
import { IconChevronDown, StationShape } from "@/icons";

export function CourseNav({ weeks, currentSlug, onNavigate }: { weeks: WeekMeta[]; currentSlug: string; onNavigate?: () => void }) {
  const { t, locale } = useI18n();
  const p = useProgress();
  const curWeek = weeks.find((w) => w.lessons.some((l) => l.slug === currentSlug))?.week;
  const [open, setOpen] = useState<number[]>(curWeek ? [curWeek] : []);
  const toggle = (n: number) => setOpen((o) => (o.includes(n) ? o.filter((x) => x !== n) : [...o, n]));

  return (
    <nav aria-label={t.lesson.courseNav}>
      <ul className="grid gap-1">
        {weeks.map((w) => {
          const isOpen = open.includes(w.week);
          const done = w.lessons.filter((l) => p.done[l.slug]).length;
          return (
            <li key={w.week}>
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(w.week)} className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-left hover:bg-ink/5">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: w.color }} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[14px] text-muted">{fmt(t.map.weekOf, { n: w.week })}</span>
                  <span className="block truncate">{w.module}</span>
                </span>
                <span className="text-[14px] tabular-nums text-muted">{done}/{w.lessons.length || 6}</span>
                <IconChevronDown size={16} className={`shrink-0 text-muted ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <ul>
                  {w.lessons.map((l) => {
                    const cur = l.slug === currentSlug;
                    return (
                      <li key={l.slug}>
                        <Link
                          href={`/${locale}/learn/${l.slug}`}
                          onClick={onNavigate}
                          aria-current={cur ? "page" : undefined}
                          className={`flex min-h-11 items-center gap-3 rounded-[12px] py-1.5 pl-5 pr-3 text-[16px] leading-snug ${cur ? "bg-ink/[0.07] font-medium" : "hover:bg-ink/5"}`}
                        >
                          <StationShape type={l.type} size={18} filled={!!p.done[l.slug]} color="var(--muted)" className="shrink-0" />
                          <span className="min-w-0 flex-1">{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {w.lessons.length === 0 && <li className="py-2 pl-5 text-muted">{t.common.soon}</li>}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
