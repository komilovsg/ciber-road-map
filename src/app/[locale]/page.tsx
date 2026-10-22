import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getWeeks } from "@/content";
import { toWeekMeta } from "@/lib/content-meta";
import { getDict, isLocale } from "@/i18n";
import { SiteHeader } from "@/components/home/site-header";
import { Hero } from "@/components/home/hero";
import { MetroMap } from "@/components/home/metro-map";
import { HowItWorks } from "@/components/home/how-it-works";
import { ModuleCards } from "@/components/home/module-cards";
import { SiteFooter } from "@/components/home/site-footer";
import { PageEnter } from "@/components/shell/page-enter";

export default function Home({ params }: PageProps<"/[locale]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy />}>
      <HomeContent params={params} />
    </Suspense>
  );
}

async function HomeContent({ params }: { params: PageProps<"/[locale]">["params"] }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);
  const weeks = getWeeks(locale).map(toWeekMeta);
  return (
    <>
      <SiteHeader locale={locale} name={t.siteName} />
      <main id="main">
        <PageEnter>
          <Hero weeks={weeks} />
          <MetroMap weeks={weeks} />
          <HowItWorks />
          <ModuleCards weeks={weeks} />
        </PageEnter>
      </main>
      <SiteFooter t={t} />
    </>
  );
}
