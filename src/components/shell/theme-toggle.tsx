"use client";
import { IconMonitor, IconMoon, IconSun } from "@/icons";
import { setTheme, useTheme, type Theme } from "@/lib/theme";
import { useT } from "@/i18n/context";

const order: Theme[] = ["system", "light", "dark"];

export function ThemeToggle() {
  const theme = useTheme();
  const t = useT();
  const next = order[(order.indexOf(theme) + 1) % order.length];
  const label = `${t.theme.label}: ${t.theme[theme]}`;
  return (
    <button type="button" className="btn btn-ghost !min-h-11 !w-11 !px-0" aria-label={`${label}. ${t.theme[next]}`} title={label} onClick={() => setTheme(next)}>
      {theme === "light" ? <IconSun /> : theme === "dark" ? <IconMoon /> : <IconMonitor />}
    </button>
  );
}
