"use client";
import { useEffect, useRef } from "react";
import { Annotation, EditorState, Prec, RangeSetBuilder, type Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentLess, indentMore, indentWithTab } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { python } from "@codemirror/lang-python";
import { SQLite, sql } from "@codemirror/lang-sql";
import { tags as t } from "@lezer/highlight";

export type EditorApi = { focus: () => void; insertHint: (text: string, after: number) => void; indent: (outdent: boolean) => void };
export type CmProps = {
  value: string;
  onChange?: (v: string) => void;
  onCursor?: (line: number, col: number) => void;
  onRun?: () => void;
  lang: "python" | "sql";
  ariaLabel: string;
  describedBy?: string;
  readOnly?: boolean;
  onReady?: (api: EditorApi) => void;
};

/** VS Code "Dark Modern" / Dark+ token colors. */
const dark = HighlightStyle.define([
  { tag: [t.keyword, t.definitionKeyword, t.operatorKeyword, t.modifier, t.bool, t.null], color: "#569CD6" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "#C586C0" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "#CE9178" },
  { tag: t.escape, color: "#D7BA7D" },
  { tag: t.number, color: "#B5CEA8" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#6A9955" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.definition(t.variableName)), t.standard(t.name), t.meta], color: "#DCDCAA" },
  { tag: [t.className, t.typeName, t.definition(t.className)], color: "#4EC9B0" },
  { tag: [t.variableName, t.propertyName, t.definition(t.variableName), t.name, t.self], color: "#9CDCFE" },
  { tag: [t.operator, t.punctuation, t.paren, t.squareBracket, t.brace, t.separator], color: "#D4D4D4" },
]);

const theme = EditorView.theme(
  {
    "&": { color: "#CCCCCC", backgroundColor: "#1F1F1F", height: "100%", fontSize: "var(--vsc-fs)" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--vsc-mono)", lineHeight: "var(--vsc-lh)", overflow: "auto" },
    ".cm-content": { padding: "8px 0", caretColor: "#AEAFAD" },
    ".cm-line": { padding: "0 12px 0 10px" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#AEAFAD", borderLeftWidth: "2px" },
    ".cm-selectionBackground": { backgroundColor: "#3A3D41" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": { backgroundColor: "#264F78" },
    ".cm-content ::selection": { backgroundColor: "#264F78" },
    ".cm-activeLine": { backgroundColor: "transparent", boxShadow: "inset 0 1px 0 #2A2D2E, inset 0 -1px 0 #2A2D2E" },
    ".cm-gutters": { backgroundColor: "#1F1F1F", color: "#6E7681", border: "none" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 14px 0 18px", minWidth: "44px" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#CCCCCC", boxShadow: "inset 0 1px 0 #2A2D2E, inset 0 -1px 0 #2A2D2E" },
    "&.cm-focused .cm-matchingBracket, .cm-matchingBracket": { backgroundColor: "#0064001A", outline: "1px solid #888888" },
    "&.cm-focused .cm-nonmatchingBracket, .cm-nonmatchingBracket": { backgroundColor: "#F851491A", outline: "1px solid #F85149" },
    ".vsc-b0": { color: "#FFD700 !important" },
    ".vsc-b1": { color: "#DA70D6 !important" },
    ".vsc-b2": { color: "#179FFF !important" },
  },
  { dark: true },
);

const OPEN = new Set(["(", "[", "{"]);
const CLOSE = new Set([")", "]", "}"]);
const marks = [0, 1, 2].map((i) => Decoration.mark({ class: `vsc-b${i}` }));

/** Bracket pair colorization (on by default in VS Code). */
const bracketColors = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
    }
    build(view: EditorView): DecorationSet {
      const b = new RangeSetBuilder<Decoration>();
      let depth = 0;
      syntaxTree(view.state).iterate({
        enter: (n) => {
          if (OPEN.has(n.name)) b.add(n.from, n.to, marks[depth++ % 3]);
          else if (CLOSE.has(n.name)) {
            depth = Math.max(0, depth - 1);
            b.add(n.from, n.to, marks[depth % 3]);
          }
        },
      });
      return b.finish();
    }
  },
  { decorations: (v) => v.decorations },
);

const External = Annotation.define<boolean>();

export function CmEditor({ value, onChange, onCursor, onRun, lang, ariaLabel, describedBy, readOnly, onReady }: CmProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cb = useRef({ onChange, onCursor, onRun });
  useEffect(() => {
    cb.current = { onChange, onCursor, onRun };
  });
  const initial = useRef(value);

  useEffect(() => {
    if (!host.current) return;
    const unit = "    ";
    const attrs: Record<string, string> = {
      "aria-label": ariaLabel,
      autocapitalize: "off",
      autocorrect: "off",
      spellcheck: "false",
      enterkeyhint: "enter",
    };
    if (describedBy) attrs["aria-describedby"] = describedBy;
    const ext: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      indentUnit.of(unit),
      EditorState.tabSize.of(unit.length),
      lang === "python" ? python() : sql({ dialect: SQLite }),
      syntaxHighlighting(dark),
      bracketColors,
      theme,
      EditorView.contentAttributes.of(attrs),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              cb.current.onRun?.();
              return true;
            },
          },
          {
            key: "Escape",
            run: (v) => {
              v.contentDOM.blur();
              return true;
            },
          },
        ]),
      ),
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && !u.transactions.some((tr) => tr.annotation(External))) cb.current.onChange?.(u.state.doc.toString());
        if (u.docChanged || u.selectionSet) {
          const head = u.state.selection.main.head;
          const ln = u.state.doc.lineAt(head);
          cb.current.onCursor?.(ln.number, head - ln.from + 1);
        }
      }),
    ];
    if (readOnly) ext.push(EditorState.readOnly.of(true));
    const view = new EditorView({ state: EditorState.create({ doc: initial.current, extensions: ext }), parent: host.current });
    viewRef.current = view;
    onReady?.({
      focus: () => view.focus(),
      // Insert hint comment lines right after the first `after` lines (the hint block at the top).
      insertHint: (text, after) => {
        const doc = view.state.doc;
        const n = Math.min(after, doc.lines);
        const at = n === 0 ? 0 : doc.line(n).to + 1 <= doc.length ? doc.line(n).to + 1 : doc.length;
        const ins = n > 0 && at === doc.length && doc.sliceString(at - 1, at) !== "\n" ? "\n" + text : text;
        const ch = view.state.changes({ from: at, insert: ins });
        view.dispatch({ changes: ch, selection: view.state.selection.map(ch, 1), scrollIntoView: true });
      },
      indent: (out) => {
        (out ? indentLess : indentMore)(view);
        view.focus();
      },
    });
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // editor is created once per mount; lang/readOnly/labels are static per instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = viewRef.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value }, annotations: External.of(true) });
    }
  }, [value]);

  return <div ref={host} className="vsc-cm" />;
}

export default CmEditor;
