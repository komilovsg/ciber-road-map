import { IconShield } from "@/icons";
import { REPO_URL } from "@/lib/content-meta";
import type { Dict } from "@/i18n";

export function SiteFooter({ t }: { t: Dict }) {
  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-8 text-[15px] text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="flex items-start gap-2"><IconShield size={20} className="mt-0.5 shrink-0 text-ok" />{t.footer.legal}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{t.footer.free}</span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-ink">{t.footer.source}</a>
        </p>
      </div>
    </footer>
  );
}
