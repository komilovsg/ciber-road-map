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
    <div role="group" aria-label={t.lang.label} className="inline-flex rounded-[10px] border border-line bg-card p-0.5 text-[13px] font-semibold">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          hrefLang={l === "tj" ? "tg" : l}
          lang={l === "tj" ? "tg" : l}
          aria-current={l === locale ? "true" : undefined}
          className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-[8px] px-2 transition-colors ${
            l === locale ? "bg-ink text-paper" : "text-muted hover:text-ink"
          }`}
        >
          {t.lang[l]}
        </Link>
      ))}
    </div>
  );
}
