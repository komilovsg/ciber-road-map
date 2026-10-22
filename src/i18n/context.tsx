"use client";
import { createContext, useContext } from "react";
import type { Locale } from "@/content/types";
import type { Dict } from "./ru";

const Ctx = createContext<{ locale: Locale; t: Dict } | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t: dict }}>{children}</Ctx.Provider>;
}
export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("I18nProvider missing");
  return v;
}
export const useT = () => useI18n().t;
export const useLocale = () => useI18n().locale;
