import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { sampleLessons } from "@/content/_sample";
import { isLocale } from "@/i18n";
import { toWeekMeta } from "@/lib/content-meta";
import { getWeeks } from "@/content";
import { LessonView } from "@/components/lesson/lesson-view";

export const metadata: Metadata = { title: "Dev: блоки", robots: { index: false, follow: false } };

export default function DevPage({ params }: PageProps<"/[locale]/dev">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy />}>
      <DevContent params={params} />
    </Suspense>
  );
}

async function DevContent({ params }: { params: PageProps<"/[locale]/dev">["params"] }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const weeks = getWeeks(locale).map(toWeekMeta);
  const lesson = sampleLessons[0];
  return <LessonView lesson={lesson} weeks={weeks} videos={[{ id: "rfscVS0vtbw", title: "Learn Python (freeCodeCamp)", channel: "freeCodeCamp.org", lang: "en", minutes: 260 }]} />;
}
