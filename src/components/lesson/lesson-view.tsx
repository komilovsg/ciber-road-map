"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lesson, Video } from "@/content/types";
import { BlockRenderer, isInteractive } from "@/components/blocks/block-renderer";
import { Md } from "@/components/blocks/md";
import { SiteHeader } from "@/components/home/site-header";
import { PageEnter } from "@/components/shell/page-enter";
import { IconArrowLeft, IconArrowRight, IconCheck } from "@/icons";
import { fmt } from "@/i18n";
import { useI18n } from "@/i18n/context";
import { type WeekMeta } from "@/lib/content-meta";
import { flatLessons } from "@/lib/course";
import { extractHeadings } from "@/lib/md-utils";
import { isBlockSolved, markDone, useProgress } from "@/lib/progress";
import { CourseNav } from "./course-nav";
import { Drawer } from "./drawer";
import { ReadingProgress } from "./reading-progress";
import { SectionNav } from "./section-nav";
import { VideoSection } from "./video-section";

export function LessonView({ lesson, weeks, videos }: { lesson: Lesson; weeks: WeekMeta[]; videos: Video[] }) {
  const { t, locale } = useI18n();
  const p = useProgress();
  const [menu, setMenu] = useState(false);
  const week = weeks.find((w) => w.week === lesson.week) ?? weeks[0];
  const flat = useMemo(() => flatLessons(weeks), [weeks]);
  const idx = flat.findIndex((l) => l.slug === lesson.slug);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  const isDone = !!p.done[lesson.slug];
  const headings = useMemo(() => lesson.blocks.flatMap((b, i) => (b.kind === "md" ? extractHeadings(b.md, i) : [])), [lesson.blocks]);
  const interactive = lesson.blocks.map((b, i) => (isInteractive(b) ? i : -1)).filter((i) => i >= 0);
  const solvedCount = interactive.filter((i) => isBlockSolved(p, `${lesson.slug}#${i}`)).length;
  const allSolved = interactive.length > 0 && solvedCount === interactive.length;
  const closeMenu = () => setMenu(false);

  return (
    <div style={{ ["--line-color" as string]: week.color }}>
      <SiteHeader locale={locale} name={t.siteName} total={flat.length} onMenu={() => setMenu(true)}>
        <ReadingProgress />
      </SiteHeader>

      <Drawer open={menu} onClose={closeMenu} title={t.lesson.courseNav}>
        <CourseNav weeks={weeks} currentSlug={lesson.slug} onNavigate={closeMenu} />
      </Drawer>

      <main id="main" className="mx-auto min-w-0 max-w-[720px] px-4 pb-24 pt-8 sm:pt-12">
        <PageEnter>
          <header>
            <div className="flex items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2 text-[14px] text-muted">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: week.color }} />
                <span>
                  {fmt(t.lesson.meta, { w: lesson.week, n: lesson.n, m: lesson.minutes })}
                  {lesson.type !== "lesson" && ` · ${t.typeLabel[lesson.type]}`}
                </span>
              </p>
              <SectionNav headings={headings} />
            </div>
            <h1 className="mt-3 font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[40px]">{lesson.title}</h1>
            <h2 className="mt-8 text-[17px] font-medium">{t.lesson.goals}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-muted">
              {lesson.goals.map((g, i) => (
                <li key={i} className="leading-snug">{g}</li>
              ))}
            </ul>
            {interactive.length > 0 && <p className="mt-4 text-[14px] text-muted">{t.lesson.tasksHint}</p>}
          </header>

          <VideoSection videos={videos} />

          <div className="mt-10">
            {lesson.blocks.map((b, i) => (
              <BlockRenderer key={i} block={b} index={i} slug={lesson.slug} />
            ))}
          </div>

          <section className="mt-16" aria-labelledby="hw">
            <h2 id="hw" className="font-display text-[24px] font-semibold tracking-[-0.015em]">{t.lesson.homework}</h2>
            <div className="mt-3"><Md md={lesson.homework} blockIndex={9999} compact /></div>

            <div className="mt-8 flex flex-col items-stretch gap-2">
              {interactive.length > 0 && (
                <p className={`text-[14px] ${allSolved ? "text-ok" : "text-muted"}`} aria-live="polite">
                  {allSolved && !isDone ? t.lesson.allSolved : fmt(t.lesson.solvedOf, { a: solvedCount, b: interactive.length })}
                </p>
              )}
              <button
                type="button"
                onClick={() => markDone(lesson.slug, !isDone)}
                aria-pressed={isDone}
                className={`btn !min-h-[52px] !text-[16px] ${isDone ? "btn-ok" : "btn-primary"}`}
              >
                {isDone ? <><IconCheck size={20} />{t.lesson.markUndone}</> : t.lesson.markDone}
              </button>
            </div>

            <nav className="mt-12 grid gap-2 sm:grid-cols-2" aria-label="prev / next">
              {prev ? (
                <Link href={`/${locale}/learn/${prev.slug}`} className="flex min-h-[72px] items-center gap-3 rounded-[12px] p-4 hover:bg-card">
                  <IconArrowLeft className="shrink-0 text-muted" />
                  <span className="min-w-0"><span className="block text-[14px] text-muted">{t.lesson.prev}</span><span className="block leading-snug">{prev.title}</span></span>
                </Link>
              ) : <span />}
              {next ? (
                <Link href={`/${locale}/learn/${next.slug}`} className="flex min-h-[72px] items-center justify-between gap-3 rounded-[12px] p-4 text-right hover:bg-card">
                  <span className="min-w-0"><span className="block text-[14px] text-muted">{t.lesson.next}</span><span className="block leading-snug">{next.title}</span></span>
                  <IconArrowRight className="shrink-0 text-muted" />
                </Link>
              ) : (
                <p className="flex items-center p-4 text-muted">{t.lesson.finished}</p>
              )}
            </nav>
          </section>
        </PageEnter>
      </main>
    </div>
  );
}
