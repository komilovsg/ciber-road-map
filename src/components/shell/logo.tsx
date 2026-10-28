import Link from "next/link";
import type { Locale } from "@/content/types";

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <path d="M5 22h8l4-12h10" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="22" r="3.4" fill="var(--ink)" stroke="var(--xp)" strokeWidth="2.6" />
      <circle cx="27" cy="10" r="2.6" fill="var(--paper)" />
    </svg>
  );
}

export function Logo({ locale, name }: { locale: Locale; name: string }) {
  return (
    <Link href={`/${locale}`} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap px-1 font-display text-[16px] font-semibold tracking-tight">
      <LogoMark />
      <span>{name}</span>
    </Link>
  );
}
