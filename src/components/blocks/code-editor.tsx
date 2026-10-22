"use client";
import { useCallback, useMemo, type KeyboardEvent, type Ref } from "react";
import { Highlighted } from "@/components/ui/highlight";

type Props = {
  value: string;
  onChange?: (v: string) => void;
  lang: "python" | "sql";
  onRun?: () => void;
  ariaLabel: string;
  readOnly?: boolean;
  disabled?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  minLines?: number;
  hintId?: string;
};

const FONT = { fontFamily: "var(--font-jb), ui-monospace, monospace", fontSize: "var(--fs)", lineHeight: "var(--lh)" } as const;

/** Textarea over a syntax-highlighted <pre>. Sizes come from the <pre> (in flow); the textarea fills it. */
export function CodeEditor({ value, onChange, lang, onRun, ariaLabel, readOnly, disabled, textareaRef, minLines = 5, hintId }: Props) {
  const unit = lang === "python" ? 4 : 2;
  const pad = " ".repeat(unit);
  const lineCount = useMemo(() => value.split("\n").length, [value]);
  const gutter = useMemo(() => Array.from({ length: Math.max(lineCount, minLines) }, (_, i) => i + 1).join("\n"), [lineCount, minLines]);

  const apply = useCallback(
    (ta: HTMLTextAreaElement, next: string, selStart: number, selEnd: number) => {
      onChange?.(next);
      requestAnimationFrame(() => ta.setSelectionRange(selStart, selEnd));
    },
    [onChange],
  );

  // insertText keeps the native undo stack; falls back to a manual value change.
  const insert = useCallback(
    (ta: HTMLTextAreaElement, text: string) => {
      ta.focus();
      if (document.execCommand("insertText", false, text)) return;
      const { selectionStart: s, selectionEnd: e, value: v } = ta;
      apply(ta, v.slice(0, s) + text + v.slice(e), s + text.length, s + text.length);
    },
    [apply],
  );

  const onKeyDown = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = ev.currentTarget;
    if (ev.key === "Escape") {
      ta.blur();
      return;
    }
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      onRun?.();
      return;
    }
    if (ev.nativeEvent.isComposing) return;
    const { selectionStart: s, selectionEnd: e, value: v } = ta;
    if (ev.key === "Tab") {
      ev.preventDefault();
      const multi = v.slice(s, e).includes("\n");
      if (!ev.shiftKey && !multi) {
        insert(ta, pad);
        return;
      }
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      let le = v.indexOf("\n", e);
      if (le === -1) le = v.length;
      const lines = v.slice(ls, le).split("\n");
      const out = lines.map((l) => {
        if (!ev.shiftKey) return pad + l;
        const m = /^ {1,4}/.exec(l);
        return m ? l.slice(Math.min(m[0].length, unit)) : l;
      });
      const block = out.join("\n");
      const delta0 = out[0].length - lines[0].length;
      apply(ta, v.slice(0, ls) + block + v.slice(le), Math.max(ls, s + delta0), e + block.length - (le - ls));
      return;
    }
    if (ev.key === "Enter" && !ev.shiftKey && s === e) {
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      const before = v.slice(ls, s);
      let indent = /^[ \t]*/.exec(before)?.[0] ?? "";
      if (lang === "python" && before.trimEnd().endsWith(":")) indent += pad;
      ev.preventDefault();
      insert(ta, "\n" + indent);
    }
  };

  return (
    <div
      className="scroll-x relative overflow-auto rounded-[10px] border border-white/10 [--fs:14px] [--lh:22px] [@media(pointer:coarse)]:[--fs:16px] [@media(pointer:coarse)]:[--lh:24px] focus-within:border-accent focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
      style={{ background: "var(--code-bg)", color: "var(--code-ink)", maxHeight: "calc(var(--lh) * 16 + 24px)" }}
    >
      <div className="flex min-w-full" style={{ ...FONT, width: "max-content" }}>
        <div
          aria-hidden
          className="sticky left-0 z-10 select-none whitespace-pre py-3 pl-3 pr-3 text-right"
          style={{ background: "var(--code-bg)", color: "color-mix(in srgb, var(--code-ink) 38%, transparent)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
        >
          {gutter}
        </div>
        <div className="relative min-w-0 flex-1">
          <pre aria-hidden={!readOnly} className="m-0 whitespace-pre px-3 py-3" style={{ ...FONT, minHeight: `calc(var(--lh) * ${minLines} + 24px)`, tabSize: unit }}>
            <Highlighted code={value} lang={lang} />
            {"\u200b\n"}
          </pre>
          {!readOnly && (
            <textarea
              ref={textareaRef}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label={ariaLabel}
              aria-describedby={hintId}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              wrap="off"
              className="absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre border-0 bg-transparent px-3 py-3 text-transparent outline-none"
              style={{ ...FONT, caretColor: "var(--code-ink)", tabSize: unit }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function EditorKeysHint({ id, run = true }: { id: string; run?: boolean }) {
  return (
    <p id={id} className="mt-1.5 text-xs text-muted">
      Tab — отступ, Esc — выйти из поля{run ? ", Ctrl+Enter — запустить" : ""}
    </p>
  );
}
