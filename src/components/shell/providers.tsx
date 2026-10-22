"use client";
import { MotionConfig } from "motion/react";
import type { Locale } from "@/content/types";
import { I18nProvider } from "@/i18n/context";
import type { Dict } from "@/i18n";
import { XpLayer } from "./xp-layer";

export function Providers({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale} dict={dict}>
      <MotionConfig reducedMotion="user">
        {children}
        <XpLayer />
      </MotionConfig>
    </I18nProvider>
  );
}
