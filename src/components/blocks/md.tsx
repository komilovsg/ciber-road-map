"use client";
import { Children, isValidElement, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Lang } from "@/components/ui/highlight";
import { headingId } from "@/lib/md-utils";
import { CodeView } from "./code-block";

function textOf(n: ReactNode): string {
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join("");
  if (isValidElement(n)) return textOf((n.props as { children?: ReactNode }).children);
  return "";
}

const LANGS: Record<string, Lang> = { py: "python", python: "python", bash: "bash", sh: "bash", shell: "bash", console: "bash", sql: "sql", js: "js", javascript: "js", ts: "js", html: "html", http: "http", text: "text" };

export function Md({ md, blockIndex = 0, compact = false }: { md: string; blockIndex?: number; compact?: boolean }) {
  const components: Components = {
    h2: ({ children }) => <h2 id={headingId(blockIndex, textOf(children))}>{children}</h2>,
    h3: ({ children }) => <h3 id={headingId(blockIndex, textOf(children))}>{children}</h3>,
    table: ({ children }) => (
      <div className="table-wrap" tabIndex={0} role="region" aria-label="table">
        <table>{children}</table>
      </div>
    ),
    a: ({ href, children }) => {
      const external = !!href && /^https?:/.test(href);
      return (
        <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {children}
        </a>
      );
    },
    pre: ({ children }) => {
      const child = Children.toArray(children)[0];
      if (isValidElement(child)) {
        const p = child.props as { className?: string; children?: ReactNode };
        const m = /language-(\w+)/.exec(p.className ?? "");
        return <CodeView code={textOf(p.children).replace(/\n$/, "")} lang={LANGS[m?.[1] ?? "text"] ?? "text"} />;
      }
      return <pre>{children}</pre>;
    },
  };
  return (
    <div className={`prose-kr ${compact ? "prose-compact" : ""}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {md}
      </Markdown>
    </div>
  );
}
