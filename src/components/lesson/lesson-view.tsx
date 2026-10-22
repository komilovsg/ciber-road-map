"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lesson, Video } from "@/content/types";
import { BlockRenderer, isInteractive } from "@/components/blocks/block-renderer";
import { Md } from "@/components/blocks/md";
import { Logo, LogoMark } from "@/components/shell/logo";
import { LangSwitch } from "@/components/shell/lang-switch";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SettingsPopover } from "@/components/shell/settings-popover";
import { PageEnter } from "@/components/shell/page-enter";
import { IconArrowLeft, IconArrowRight, IconCheck, IconMenu, IconShield, StationShape } from "@/icons";
import { fmt } from "@/i18n";
import { useI18n } from "@/i18n/context";
import { type WeekMeta } from "@/lib/content-meta";
import { flatLessons } from "@/lib/course";
import { extractHeadings } from "@/lib/md-utils";
import { isBlockSolved, markDone, useProgress } from "@/lib/progress";
import { CourseNav } from "./course-nav";
import { Drawer } from "./drawer";
import { MiniLine } from "./mini-line";
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
  const doneCount = flat.filter((l) => p.done[l.slug]).length;
  const pct = Math.round((doneCount / Math.max(flat.length, 1)) * 100);
  const closeMenu = () => setMenu(false);

  return (
    <div style={{ ["--line-color" as string]: week.color }}>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-14 max-w-[1440px] items-center gap-1 px-2 sm:gap-3 sm:px-5">
          <button type="button" className="btn btn-ghost !w-11 !px-0 lg:hidden" aria-label={t.common.menu} aria-haspopup="dialog" onClick={() => setMenu(true)}><IconMenu /></button>
          <div className="hidden sm:block"><Logo locale={locale} name={t.siteName} /></div>
          <Link href={`/${locale}`} aria-label={t.common.home} className="grid h-11 w-11 place-items-center sm:hidden"><LogoMark /></Link>
          <div className="flex min-w-0 flex-1 justify-center"><MiniLine week={week} currentSlug={lesson.slug} /></div>
          <span className="hidden font-mono text-[13px] text-muted md:inline" title={`${doneCount}/${flat.length}`}>{pct}%</span>
          <div className="hidden items-center gap-1.5 sm:flex"><LangSwitch /><ThemeToggle /></div>
          <SettingsPopover />
          <ReadingProgress />
        </div>
      </header>

      <Drawer open={menu} onClose={closeMenu} title={t.lesson.courseNav}>
        <div className="mb-3 flex items-center gap-2 px-1 sm:hidden"><LangSwitch /><ThemeToggle /></div>
        <CourseNav weeks={weeks} currentSlug={lesson.slug} onNavigate={closeMenu} />
      </Drawer>

      <div className="mx-auto grid max-w-[1440px] gap-x-10 px-4 sm:px-6 lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_220px]">
        <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] overflow-y-auto py-6 pr-2 lg:block">
          <CourseNav weeks={weeks} currentSlug={lesson.slug} />
        </aside>

        <main id="main" className="min-w-0 py-8 pb-24 sm:py-10">
          <PageEnter>
            <header className="max-w-[860px]">
              <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span>{fmt(t.lesson.eyebrow, { w: lesson.week, n: lesson.n, m: lesson.minutes })}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-0.5 normal-case tracking-normal" style={{ color: "var(--line-color)" }} title={t.typeHint[lesson.type]}>
                  <StationShape type={lesson.type} size={14} color="var(--line-color)" />
                  {t.typeLabel[lesson.type]}
                </span>
              </p>
              <h1 className="mt-3 font-display text-[clamp(30px,5vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">{lesson.title}</h1>
              <div className="card mt-6 p-5">
                <h2 className="font-display text-[17px] font-semibold">{t.lesson.goals}</h2>
                <ul className="mt-3 grid gap-2">
                  {lesson.goals.map((g, i) => (
                    <li key={i} className="flex gap-3 text-[16px] leading-snug">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white" style={{ background: "var(--line-color)" }}><IconCheck size={13} /></span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
                {interactive.length > 0 && <p className="mt-4 border-t border-line pt-3 text-[14px] text-muted">{t.lesson.tasksHint}</p>}
              </div>
            </header>

            <VideoSection videos={videos} />

            <div className="mt-8">
              {lesson.blocks.map((b, i) => (
                <BlockRenderer key={i} block={b} index={i} slug={lesson.slug} />
              ))}
            </div>

            <section className="mt-12 max-w-[860px]" aria-labelledby="hw">
              <div className="card p-5 sm:p-6" style={{ borderTop: "3px solid var(--line-color)" }}>
                <h2 id="hw" className="font-display text-[22px] font-semibold tracking-[-0.01em]">{t.lesson.homework}</h2>
                <div className="mt-2"><Md md={lesson.homework} blockIndex={9999} compact /></div>
              </div>

              <div className="mt-6 flex flex-col items-stretch gap-2">
                {interactive.length > 0 && (
                  <p className={`text-[14px] ${allSolved ? "font-medium text-ok" : "text-muted"}`} aria-live="polite">
                    {allSolved && !isDone ? t.lesson.allSolved : fmt(t.lesson.solvedOf, { a: solvedCount, b: interactive.length })}
                  </p>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  animate={allSolved && !isDone ? { boxShadow: ["0 0 0 0 rgba(25,179,125,0.5)", "0 0 0 12px rgba(25,179,125,0)"] } : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }}
                  transition={allSolved && !isDone ? { duration: 1.6, repeat: Infinity } : { duration: 0.2 }}
                  onClick={() => markDone(lesson.slug, !isDone)}
                  aria-pressed={isDone}
                  className={`btn !min-h-[60px] !rounded-[14px] !text-[17px] font-semibold ${isDone ? "btn-ok" : allSolved ? "btn-ok" : "btn-primary"}`}
                >
                  {isDone ? <><IconCheck size={22} />{t.lesson.markUndone}</> : <><IconShield size={20} />{t.lesson.markDone}</>}
                </motion.button>
              </div>

              <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="prev / next">
                {prev ? (
                  <Link href={`/${locale}/learn/${prev.slug}`} className="card flex min-h-[84px] items-center gap-3 p-4 transition-transform hover:-translate-x-0.5">
                    <IconArrowLeft className="shrink-0 text-muted" />
                    <span className="min-w-0"><span className="eyebrow block">{t.lesson.prev}</span><span className="block font-display font-semibold leading-snug">{prev.title}</span></span>
                  </Link>
                ) : <span />}
                {next ? (
                  <Link href={`/${locale}/learn/${next.slug}`} className={`card flex min-h-[84px] items-center justify-between gap-3 p-4 text-right transition-transform hover:translate-x-0.5 ${isDone ? "!border-[var(--line-color)]" : ""}`}>
                    <span className="min-w-0"><span className="eyebrow block">{t.lesson.next}</span><span className="block font-display font-semibold leading-snug">{next.title}</span></span>
                    <IconArrowRight className="shrink-0" style={{ color: "var(--line-color)" }} />
                  </Link>
                ) : (
                  <p className="card flex items-center p-4 text-muted">{t.lesson.finished}</p>
                )}
              </nav>
            </section>
          </PageEnter>
        </main>

        <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] overflow-y-auto py-10 xl:block">
          <SectionNav headings={headings} />
        </aside>
      </div>
    </div>
  );
}
