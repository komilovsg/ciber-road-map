"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconChevronDown, IconChevronUp, IconDatabase, IconEllipsis, IconErrorCircle, IconPlayOutline, IconPython, IconTerminal } from "@/icons";
import "./vscode.css";

export function VscWindow({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`vsc ${className}`} style={style}>
      {children}
    </div>
  );
}

export type FileKind = "python" | "sql" | "terminal" | "text";
export function FileIcon({ kind, size = 16 }: { kind: FileKind; size?: number }) {
  if (kind === "python") return <IconPython size={size} />;
  if (kind === "sql") return <IconDatabase size={size} style={{ color: "#e8a735" }} />;
  return <IconTerminal size={size} />;
}

export function VscTabBar({ name, kind, children }: { name: string; kind: FileKind; children?: ReactNode }) {
  return (
    <div className="vsc-tabbar">
      <div className="vsc-tab">
        <FileIcon kind={kind} />
        <span>{name}</span>
      </div>
      {children && <div className="vsc-tab-actions">{children}</div>}
    </div>
  );
}

export function VscIconButton({ label, onClick, disabled, run, children }: { label: string; onClick: () => void; disabled?: boolean; run?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={`vsc-ibtn ${run ? "run" : ""}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function TouchIndent({ api }: { api: React.RefObject<{ indent: (outdent: boolean) => void } | null> }) {
  const keep = (e: React.SyntheticEvent) => e.preventDefault();
  return (
    <>
      {[true, false].map((out) => (
        <button key={String(out)} type="button" className="vsc-ibtn vsc-touch" aria-label={out ? "Shift+Tab" : "Tab"} onPointerDown={keep} onMouseDown={keep} onClick={() => api.current?.indent(out)}>
          {out ? "⇤" : "⇥"}
        </button>
      ))}
    </>
  );
}

export const RunIcon = () => <IconPlayOutline size={18} />;

export type MenuItem = { label: string; onSelect: () => void; disabled?: boolean };
/** The «⋯» overflow menu. */
export function VscMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    root.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
    return () => document.removeEventListener("pointerdown", down);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const els = [...(root.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [])];
      const i = els.indexOf(document.activeElement as HTMLButtonElement);
      els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
    } else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={root} onKeyDown={onKey} style={{ display: "contents" }}>
      <button ref={btn} type="button" className="vsc-ibtn" title={label} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconEllipsis size={18} />
      </button>
      {open && (
        <div role="menu" className="vsc-menu" aria-label={label}>
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                btn.current?.focus();
                it.onSelect();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type PanelTab = { id: string; label: string; badge?: number };
export function VscPanel({
  tabs,
  active,
  onTab,
  collapsed,
  onToggle,
  toggleLabel,
  height,
  className = "",
  bodyRef,
  bodyProps,
  children,
}: {
  tabs: PanelTab[];
  active: string;
  onTab: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  toggleLabel: string;
  height?: number | string;
  className?: string;
  bodyRef?: React.Ref<HTMLDivElement>;
  bodyProps?: React.HTMLAttributes<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div className="vsc-panel">
      <div className="vsc-ptabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`vsc-tab-${t.id}`}
            aria-selected={!collapsed && active === t.id}
            className="vsc-ptab"
            onClick={() => {
              onTab(t.id);
              if (collapsed) onToggle();
            }}
          >
            {t.label}
            {!!t.badge && <span className="vsc-badge">{t.badge}</span>}
          </button>
        ))}
        <button type="button" className="vsc-ibtn" title={toggleLabel} aria-label={toggleLabel} aria-expanded={!collapsed} onClick={onToggle}>
          {collapsed ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </button>
      </div>
      <div
        ref={bodyRef}
        role="tabpanel"
        aria-labelledby={`vsc-tab-${active}`}
        hidden={collapsed}
        className={`vsc-pbody ${className}`}
        style={height ? ({ "--vsc-ph": typeof height === "number" ? `${height}px` : height } as React.CSSProperties) : undefined}
        {...bodyProps}
      >
        {children}
      </div>
    </div>
  );
}

export function VscProblem({ text, src, kind = "error" }: { text: string; src: string; kind?: "error" | "info" }) {
  return (
    <div className="vsc-problem">
      <IconErrorCircle size={16} style={{ color: kind === "error" ? "#f85149" : "#3794ff" }} />
      <span className="msg">
        {text} <span className="src">{src}</span>
      </span>
    </div>
  );
}

export function VscStatusBar({ left, ln, col, spaces, lang }: { left?: string; ln: number; col: number; spaces: string; lang: string }) {
  return (
    <div className="vsc-status">
      {left && <span className="l">{left}</span>}
      <div className="r">
        <span>
          Ln {ln}, Col {col}
        </span>
        <span className="hide-sm">{spaces}</span>
        <span className="hide-sm">UTF-8</span>
        <span>{lang}</span>
      </div>
    </div>
  );
}
