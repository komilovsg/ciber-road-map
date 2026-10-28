"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { locales } from "@/content/types";

export function LangSwitch() {
  const { locale, t } = useI18n();
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.replace(/^\/(ru|tj)(?=\/|$)/, "");
  return (
    <div role="group" aria-label={t.lang.label} className="inline-flex text-[14px]">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          hrefLang={l === "tj" ? "tg" : l}
          lang={l === "tj" ? "tg" : l}
          aria-current={l === locale ? "true" : undefined}
          className={`inline-flex min-h-11 min-w-9 items-center justify-center px-1.5 transition-colors ${l === locale ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
        >
          {t.lang[l]}
        </Link>
      ))}
    </div>
  );
}
