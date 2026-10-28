"use client";
import { useState } from "react";
import type { Lang } from "@/components/ui/highlight";
import { IconCheck, IconCopy } from "@/icons";
import { useT } from "@/i18n/context";
import { FileIcon, type FileKind } from "@/components/vscode/chrome";
import { VscHighlighted } from "@/components/vscode/static-highlight";

const NAMES: Record<Lang, string> = { python: "Python", bash: "bash", sql: "SQL", html: "HTML", js: "JavaScript", http: "HTTP", text: "text" };
const KIND: Partial<Record<Lang, FileKind>> = { python: "python", sql: "sql", bash: "terminal" };

function Copy({ text }: { text: string }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  const label = ok ? t.vsc.copied : t.vsc.copy;
  return (
    <button
      type="button"
      className="vsc-copy"
      title={label}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {ok ? <IconCheck size={16} /> : <IconCopy size={16} />}
    </button>
  );
}

/** Static listing in a VS Code "Dark Modern" window: thin tab with language + copy icon. */
export function CodeView({ code, lang, caption }: { code: string; lang: Lang; caption?: string }) {
  const kind = KIND[lang];
  return (
    <figure className={`vsc vsc-static not-prose lang-${lang}`}>
      <div className="vsc-tabbar" style={{ height: 32 }}>
        <div className="vsc-tab">
          {kind ? <FileIcon kind={kind} size={14} /> : null}
          <span>{NAMES[lang]}</span>
        </div>
        <div className="vsc-tab-actions">
          <Copy text={code} />
        </div>
      </div>
      <pre tabIndex={0} className="vsc-code">
        <code>
          <VscHighlighted code={code} lang={lang} />
        </code>
      </pre>
      {caption && <figcaption className="vsc-cap">{caption}</figcaption>}
    </figure>
  );
}
