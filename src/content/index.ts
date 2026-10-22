import { week1 } from "./weeks/week1";
import { week2 } from "./weeks/week2";
import { week3 } from "./weeks/week3";
import { week4 } from "./weeks/week4";
import { week5 } from "./weeks/week5";
import { week6 } from "./weeks/week6";
import { week7 } from "./weeks/week7";
import { week8 } from "./weeks/week8";
import { week1 as tj1 } from "./weeks/tj/week1";
import { week2 as tj2 } from "./weeks/tj/week2";
import { week3 as tj3 } from "./weeks/tj/week3";
import { week4 as tj4 } from "./weeks/tj/week4";
import { week5 as tj5 } from "./weeks/tj/week5";
import { week6 as tj6 } from "./weeks/tj/week6";
import { week7 as tj7 } from "./weeks/tj/week7";
import { week8 as tj8 } from "./weeks/tj/week8";
import type { Lesson, Locale, Week } from "./types";
import { videos } from "./videos";

const byLocale: Record<Locale, Week[]> = {
  ru: [week1, week2, week3, week4, week5, week6, week7, week8],
  tj: [tj1, tj2, tj3, tj4, tj5, tj6, tj7, tj8],
};

export const getWeeks = (locale: Locale): Week[] => byLocale[locale];
export const getLessons = (locale: Locale): Lesson[] =>
  getWeeks(locale).flatMap((w) => w.lessons).sort((a, b) => a.n - b.n);
export const getLesson = (locale: Locale, slug: string) => getLessons(locale).find((l) => l.slug === slug);
export const getWeek = (locale: Locale, n: number) => getWeeks(locale).find((w) => w.week === n)!;
export const getVideos = (slug: string) => videos[slug] ?? [];
// Slugs are identical across locales (Russian is the source of truth).
export const allSlugs = () => getLessons("ru").map((l) => l.slug);
