"use client";
import { Highlighted, type Lang } from "@/components/ui/highlight";
import { CopyButton } from "@/components/ui/copy-button";

const NAMES: Record<Lang, string> = { python: "Python", bash: "bash", sql: "SQL", html: "HTML", js: "JavaScript", http: "HTTP", text: "text" };

/** Dark code pane with language label + copy button. */
export function CodeView({ code, lang, caption }: { code: string; lang: Lang; caption?: string }) {
  return (
    <figure className="not-prose my-6 max-w-[860px] overflow-hidden rounded-[14px] border border-line bg-code" style={{ color: "var(--code-ink)" }}>
      <div className="flex items-center justify-between border-b border-white/10 pl-4 pr-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#7f8aa3]">{NAMES[lang]}</span>
        <CopyButton text={code} />
      </div>
      <pre tabIndex={0} className="scroll-x m-0 px-4 py-3.5 font-mono text-[14px] leading-[1.65]" style={{ tabSize: 4 }}>
        <code>
          <Highlighted code={code} lang={lang} />
        </code>
      </pre>
      {caption && <figcaption className="border-t border-white/10 px-4 py-2 text-[13px] text-[#8d97a8]">{caption}</figcaption>}
    </figure>
  );
}
