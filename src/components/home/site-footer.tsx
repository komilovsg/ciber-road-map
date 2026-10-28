import { REPO_URL } from "@/lib/content-meta";
import type { Dict } from "@/i18n";

export function SiteFooter({ t }: { t: Dict }) {
  return (
    <footer className="mx-auto max-w-[1120px] px-4 pb-10 pt-4 text-[14px] text-muted sm:px-6">
      <p className="flex flex-wrap items-center gap-x-2">
        <span>{t.footer.legal}</span>
        <span aria-hidden>·</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-ink">{t.footer.source}</a>
      </p>
    </footer>
  );
}
