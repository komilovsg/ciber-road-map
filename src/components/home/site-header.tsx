"use client";
import type { ReactNode } from "react";
import type { Locale } from "@/content/types";
import { Logo } from "@/components/shell/logo";
import { LangSwitch } from "@/components/shell/lang-switch";
import { SettingsPopover } from "@/components/shell/settings-popover";
import { useProgress } from "@/lib/progress";
import { IconMenu } from "@/icons";
import { useT } from "@/i18n/context";

export function SiteHeader({ locale, name, total, onMenu, children }: { locale: Locale; name: string; total: number; onMenu?: () => void; children?: ReactNode }) {
  const t = useT();
  const p = useProgress();
  const done = Object.keys(p.done).length;
  const pct = Math.round((done / Math.max(total, 1)) * 100);
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-1 px-2 sm:px-4">
        {onMenu && (
          <button type="button" className="btn btn-ghost !w-11 !px-0" aria-label={t.common.menu} aria-haspopup="dialog" onClick={onMenu}>
            <IconMenu />
          </button>
        )}
        <div className={onMenu ? "" : "pl-2"}><Logo locale={locale} name={name} /></div>
        <div className="ml-auto flex items-center gap-1">
          <span className="px-2 text-[14px] tabular-nums text-muted" title={`${done}/${total}`}>{pct}%</span>
          <LangSwitch />
          <SettingsPopover />
        </div>
      </div>
      {children}
    </header>
  );
}
