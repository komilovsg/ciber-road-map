import type { Locale } from "@/content/types";
import { ru, type Dict } from "./ru";
import { tj } from "./tj";

export type { Dict };
const dicts: Record<Locale, Dict> = { ru, tj };
export const getDict = (l: Locale): Dict => dicts[l];
export const isLocale = (s: string): s is Locale => s === "ru" || s === "tj";
export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
