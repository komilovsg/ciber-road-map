import type { Lesson, LessonType, Week } from "@/content/types";

/** Light-weight outline (no blocks) safe to ship to client components. */
export type LessonMeta = { n: number; slug: string; week: number; title: string; type: LessonType; minutes: number };
export type WeekMeta = { week: number; module: string; color: string; summary: string; lessons: LessonMeta[] };

export const toMeta = (l: Lesson): LessonMeta => ({ n: l.n, slug: l.slug, week: l.week, title: l.title, type: l.type, minutes: l.minutes });
export const toWeekMeta = (w: Week): WeekMeta => ({
  week: w.week,
  module: w.module,
  color: w.color,
  summary: w.summary,
  lessons: [...w.lessons].sort((a, b) => a.n - b.n).map(toMeta),
});

export const TYPE_LABEL: Record<LessonType, string> = { lesson: "Урок", project: "Проект", ctf: "CTF", test: "Тест" };
export const SITE_NAME = "Кибер-маршрут";
export const SITE_TAGLINE = "8 недель от нуля до первых CTF";
export const REPO_URL = "https://github.com/komilovsg/ciber-road-map";
