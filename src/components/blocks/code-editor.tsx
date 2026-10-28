"use client";
import { lazy, Suspense, useMemo, useSyncExternalStore, type CSSProperties } from "react";
import { Highlighted } from "@/components/ui/highlight";
import { useT } from "@/i18n/context";
import "@/components/vscode/vscode.css";
import type { EditorApi } from "@/components/vscode/cm-editor";

export type { EditorApi };

const Cm = lazy(() => import("@/components/vscode/cm-editor"));
const noop = () => () => {};

type Props = {
  value: string;
  onChange?: (v: string) => void;
  onCursor?: (line: number, col: number) => void;
  lang: "python" | "sql";
  onRun?: () => void;
  ariaLabel: string;
  readOnly?: boolean;
  onReady?: (api: EditorApi) => void;
  minLines?: number;
  hintId?: string;
};

function Skeleton({ value, lang, lines }: { value: string; lang: "python" | "sql"; lines: number }) {
  const gut = useMemo(() => Array.from({ length: lines }, (_, i) => i + 1).join("\n"), [lines]);
  return (
    <div className="vsc-ed-sk" aria-hidden>
      <div className="gut">{gut}</div>
      <pre>
        <Highlighted code={value} lang={lang} />
      </pre>
    </div>
  );
}

/** CodeMirror 6 in VS Code "Dark Modern" look. Loaded lazily; a same-size static skeleton shows meanwhile. */
export function CodeEditor({ value, onChange, onCursor, lang, onRun, ariaLabel, readOnly, onReady, minLines = 5, hintId }: Props) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const lines = Math.max(value.split("\n").length, minLines);
  const sk = <Skeleton value={value} lang={lang} lines={lines} />;
  return (
    <div className="vsc-ed" style={{ "--vsc-lines": lines } as CSSProperties}>
      {client ? (
        <Suspense fallback={sk}>
          <Cm value={value} onChange={onChange} onCursor={onCursor} onRun={onRun} lang={lang} ariaLabel={ariaLabel} describedBy={hintId} readOnly={readOnly} onReady={onReady} />
        </Suspense>
      ) : (
        sk
      )}
    </div>
  );
}

export function EditorKeysHint({ id, run = true }: { id: string; run?: boolean }) {
  const t = useT();
  return (
    <p id={id} className="vsc-keys">
      {run ? t.vsc.keysHint : t.vsc.keysHintNoRun}
    </p>
  );
}
