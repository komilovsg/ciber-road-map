import type { Locale } from "@/content/types";
import { Logo } from "@/components/shell/logo";
import { LangSwitch } from "@/components/shell/lang-switch";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { SettingsPopover } from "@/components/shell/settings-popover";

export function SiteHeader({ locale, name }: { locale: Locale; name: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:px-6">
        <Logo locale={locale} name={name} />
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <LangSwitch />
          <ThemeToggle />
          <SettingsPopover />
        </div>
      </div>
    </header>
  );
}
