"use client";
import Link from "next/link";
import type { WeekMeta } from "@/lib/content-meta";
import { useProgress } from "@/lib/progress";
import { useI18n } from "@/i18n/context";
import { fmt } from "@/i18n";
import { IconArrowRight } from "@/icons";

export function ModuleCards({ weeks }: { weeks: WeekMeta[] }) {
  const { t, locale } = useI18n();
  const p = useProgress();
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 md:py-14" aria-labelledby="mods-title">
      <h2 id="mods-title" className="font-display text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.025em]">{t.modules.title}</h2>
      <p className="mt-2 text-muted">{t.modules.lead}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {weeks.map((w) => {
          const done = w.lessons.filter((l) => p.done[l.slug]).length;
          const total = w.lessons.length || 6;
          const first = w.lessons[0];
          const inner = (
            <>
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: w.color }} />
              <span className="eyebrow">{fmt(t.map.weekOf, { n: w.week })}</span>
              <span className="mt-1.5 block font-display text-[19px] font-semibold leading-tight tracking-[-0.01em]">{w.module}</span>
              <span className="mt-2 block flex-1 text-[14px] leading-relaxed text-muted">{w.summary || t.modules.empty}</span>
              <span className="mt-4 flex items-center justify-between text-[14px]">
                <span className="font-mono text-muted">{fmt(t.modules.progress, { done, total })}</span>
                {first && <span className="inline-flex items-center gap-1 font-medium" style={{ color: w.color }}>{t.modules.open}<IconArrowRight size={16} /></span>}
              </span>
              <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(done / total) * 100}%`, background: w.color }} />
              </span>
            </>
          );
          const cls = "card relative flex h-full flex-col overflow-hidden p-5 pt-6 transition-transform duration-200";
          return (
            <li key={w.week}>
              {first ? (
                <Link href={`/${locale}/learn/${first.slug}`} className={`${cls} hover:-translate-y-0.5`}>{inner}</Link>
              ) : (
                <div className={`${cls} opacity-70`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
