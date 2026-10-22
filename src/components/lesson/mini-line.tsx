"use client";
import Link from "next/link";
import type { WeekMeta } from "@/lib/content-meta";
import { useProgress } from "@/lib/progress";
import { useI18n } from "@/i18n/context";
import { StationShape } from "@/icons";

/** The current week's line: 6 clickable stations, current one highlighted. */
export function MiniLine({ week, currentSlug }: { week: WeekMeta; currentSlug: string }) {
  const { locale } = useI18n();
  const p = useProgress();
  return (
    <nav aria-label={week.module} className="flex min-w-0 items-center justify-center">
      <ol className="flex items-center">
        {week.lessons.map((l, i) => {
          const cur = l.slug === currentSlug;
          const done = !!p.done[l.slug];
          return (
            <li key={l.slug} className="flex items-center">
              {i > 0 && <span aria-hidden className="h-[4px] w-3 sm:w-5" style={{ background: week.color, opacity: done || p.done[week.lessons[i - 1].slug] ? 1 : 0.3 }} />}
              <Link
                href={`/${locale}/learn/${l.slug}`}
                aria-label={`${l.n}. ${l.title}`}
                aria-current={cur ? "page" : undefined}
                title={`${l.n}. ${l.title}`}
                className="relative grid h-11 w-7 place-items-center sm:w-8"
              >
                {cur && <span aria-hidden className="absolute h-7 w-7 rounded-full border-2" style={{ borderColor: week.color }} />}
                <StationShape type={l.type} size={cur ? 20 : 17} filled={done} color={week.color} />
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
