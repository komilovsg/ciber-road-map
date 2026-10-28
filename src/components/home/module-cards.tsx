"use client";
import Link from "next/link";
import type { WeekMeta } from "@/lib/content-meta";
import { useProgress } from "@/lib/progress";
import { useI18n } from "@/i18n/context";
import { fmt } from "@/i18n";

export function ModuleCards({ weeks }: { weeks: WeekMeta[] }) {
  const { t, locale } = useI18n();
  const p = useProgress();
  return (
    <section className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 md:py-16" aria-labelledby="mods-title">
      <h2 id="mods-title" className="font-display text-[24px] font-semibold tracking-[-0.015em]">{t.modules.title}</h2>
      <ul className="mt-4">
        {weeks.map((w) => {
          const done = w.lessons.filter((l) => p.done[l.slug]).length;
          const total = w.lessons.length || 6;
          const first = w.lessons[0];
          const inner = (
            <>
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: w.color }} />
              <span className="w-[5.5rem] shrink-0 text-[14px] text-muted">{fmt(t.map.weekOf, { n: w.week })}</span>
              <span className="min-w-0 flex-1 leading-snug">{w.module}</span>
              <span className="text-[14px] tabular-nums text-muted">{first ? `${done}/${total}` : t.modules.empty}</span>
            </>
          );
          const cls = "flex min-h-12 items-center gap-3 rounded-[12px] px-3 py-2";
          return (
            <li key={w.week}>
              {first ? <Link href={`/${locale}/learn/${first.slug}`} className={`${cls} hover:bg-card`}>{inner}</Link> : <div className={`${cls} opacity-60`}>{inner}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
