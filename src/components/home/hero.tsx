"use client";
import { motion } from "motion/react";
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
  const pct = Math.round((done / total) * 100);
  const R = 52;
  const C = 2 * Math.PI * R;
  const first = all[0];

  return (
    <section className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-10 pt-10 sm:px-6 md:grid-cols-[1fr_300px] md:items-center md:pb-16 md:pt-16">
      <div>
        <p className="eyebrow">{t.hero.eyebrow}</p>
        <h1 className="mt-4 font-display font-extrabold leading-[1.02] tracking-[-0.03em]" style={{ fontSize: "clamp(40px, 8vw, 72px)" }}>
          {t.siteName}
        </h1>
        <p className="mt-3 font-display text-[clamp(18px,2.6vw,24px)] font-semibold text-accent">{t.tagline}</p>
        <p className="mt-5 max-w-[52ch] text-[18px] leading-relaxed text-muted">{t.hero.promise}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {first && (
            <Link href={`/${locale}/learn/${(started && next ? next : first).slug}`} className="btn btn-primary !min-h-[52px] !px-6 !text-[16px]">
              {started && next ? (
                <span>
                  {t.hero.resume}: {t.common.lesson} {next.n}
                </span>
              ) : (
                t.hero.start
              )}
              <IconArrowRight size={18} />
            </Link>
          )}
          {started && next && <span className="max-w-[28ch] text-[15px] text-muted">{next.title}</span>}
          {started && !next && <span className="text-[15px] text-ok">{t.hero.allDone}</span>}
        </div>
        <p className="mt-5 text-[15px] text-muted">{t.hero.noPrior}</p>
      </div>

      <div
        className="card flex items-center gap-5 p-5 md:flex-col md:gap-3 md:p-6"
      >
        <div className="relative h-[124px] w-[124px] shrink-0">
          <svg viewBox="0 0 124 124" className="h-full w-full -rotate-90" role="img" aria-label={`${t.hero.progress}: ${pct}%`}>
            <circle cx="62" cy="62" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
            <motion.circle
              cx="62"
              cy="62"
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={false}
              animate={{ strokeDashoffset: C * (1 - done / total) }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-[28px] font-bold leading-none">{pct}%</div>
            </div>
          </div>
        </div>
        <div className="md:text-center">
          <p className="font-display text-lg font-semibold">
            {done} <span className="text-muted">{t.hero.lessonsOf} {total}</span>
          </p>
          <p className="mt-1 font-mono text-[15px]">
            <span className="rounded-md bg-xp/20 px-2 py-0.5 font-semibold">{p.xp}</span> <span className="text-muted">{t.hero.xpLabel}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
