import type { LessonMeta, WeekMeta } from "./content-meta";

export const flatLessons = (weeks: WeekMeta[]): LessonMeta[] => weeks.flatMap((w) => w.lessons).sort((a, b) => a.n - b.n);

/** First lesson that is not completed (null when all done / no lessons). */
export function nextLesson(weeks: WeekMeta[], done: Record<string, true>): LessonMeta | null {
  return flatLessons(weeks).find((l) => !done[l.slug]) ?? null;
}
