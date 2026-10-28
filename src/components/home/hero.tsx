"use client";
import Link from "next/link";
import type { WeekMeta } from "@/lib/content-meta";
import { flatLessons, nextLesson } from "@/lib/course";
import { useProgress } from "@/lib/progress";
import { useI18n } from "@/i18n/context";
import { IconArrowRight } from "@/icons";

export function Hero({ weeks }: { weeks: WeekMeta[] }) {
  const { t, locale } = useI18n();
  const p = useProgress();
  const all = flatLessons(weeks);
  const total = Math.max(all.length, 1);
  const done = all.filter((l) => p.done[l.slug]).length;
  const next = nextLesson(weeks, p.done);
  const started = done > 0 || p.xp > 0;
  const first = all[0];

  return (
    <section className="mx-auto max-w-[1120px] px-4 pb-12 pt-12 sm:px-6 md:pb-16 md:pt-20">
      <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[40px]">{t.siteName}</h1>
      <p className="mt-4 max-w-[48ch] text-[18px] leading-relaxed text-muted">{t.hero.promise}</p>
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
        {first && (
          <Link href={`/${locale}/learn/${(started && next ? next : first).slug}`} className="btn btn-primary !min-h-12 !px-6 !text-[16px]">
            {started && next ? `${t.hero.resume}: ${t.common.lesson} ${next.n}` : t.hero.start}
            <IconArrowRight size={18} />
          </Link>
        )}
        {started && !next && <span className="text-[14px] text-ok">{t.hero.allDone}</span>}
      </div>
      <p className="mt-4 text-[14px] tabular-nums text-muted">
        {done} {t.hero.lessonsOf} {total} · {p.xp} {t.common.xp}
      </p>
      <p className="mt-2 text-[14px] text-muted">{t.hero.eyebrow}</p>
    </section>
  );
}
