import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLesson, getLessons, getVideos, getWeeks } from "@/content";
import { locales } from "@/content/types";
import { toWeekMeta } from "@/lib/content-meta";
import { isLocale } from "@/i18n";
import { LessonView } from "@/components/lesson/lesson-view";

export function generateStaticParams() {
  const params = locales.flatMap((locale) => getLessons(locale).map((l) => ({ locale, slug: l.slug })));
  // Cache Components requires at least one param; "_" 404s (used only while content is empty).
  return params.length ? params : locales.map((locale) => ({ locale, slug: "_" }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/learn/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const lesson = getLesson(locale, slug);
  if (!lesson) return {};
  return {
    title: lesson.title,
    description: lesson.goals.slice(0, 2).join(" · "),
    alternates: { canonical: `/${locale}/learn/${slug}`, languages: { ru: `/ru/learn/${slug}`, tg: `/tj/learn/${slug}` } },
  };
}

export default function LessonPage({ params }: PageProps<"/[locale]/learn/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[860px] px-4 py-24" aria-busy><div className="h-10 w-2/3 animate-pulse rounded-[10px] bg-line" /></div>}>
      <LessonContent params={params} />
    </Suspense>
  );
}

async function LessonContent({ params }: { params: PageProps<"/[locale]/learn/[slug]">["params"] }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const lesson = getLesson(locale, slug);
  if (!lesson) notFound();
  const weeks = getWeeks(locale).map(toWeekMeta);
  return <LessonView lesson={lesson} weeks={weeks} videos={getVideos(slug)} />;
}
