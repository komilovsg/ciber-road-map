"use client";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { IconCheck } from "@/icons";

/** Shared frame for interactive blocks and widgets. */
export function BlockFrame({
  label,
  title,
  solved,
  actions,
  children,
  className = "",
  bodyClassName = "p-4 sm:p-5",
}: {
  label: string;
  title?: string;
  solved?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      aria-label={title ? `${label}: ${title}` : label}
      className={`card relative my-8 overflow-hidden ${className}`}
      style={{ maxWidth: 860 }}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: solved ? "var(--ok)" : "var(--line-color)", opacity: solved ? 1 : 0.55 }}
      />
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-3 pl-5 pr-4 sm:pr-5">
        <span className="eyebrow">{label}</span>
        {title && <h3 className="font-display text-[17px] font-semibold leading-snug">{title}</h3>}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <AnimatePresence>
            {solved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok"
              >
                <IconCheck size={14} /> Пройдено
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </header>
      <div className={`${bodyClassName} pl-5 sm:pl-6`}>{children}</div>
    </section>
  );
}

/** Frame for widgets: same chrome, label "ИНТЕРАКТИВ". */
export function WidgetFrame({
  title,
  hint,
  solved,
  children,
  actions,
}: {
  title: string;
  hint?: string;
  solved?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <BlockFrame label="Интерактив" title={title} solved={solved} actions={actions}>
      {hint && <p className="mb-4 text-[15px] text-muted">{hint}</p>}
      {children}
    </BlockFrame>
  );
}

/** Animated check mark that draws itself. */
export function DrawCheck({ size = 20, color = "var(--ok)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </svg>
  );
}

/** Shake keyframes for wrong answers: spread as `animate={wrong ? shake : undefined}`. */
export const shake = { x: [0, -8, 8, -6, 6, -3, 0], transition: { duration: 0.4 } };

/** Seeded PRNG + shuffle so server and client agree (or use inside effects). */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seededShuffle<T>(arr: T[], seed = 1): T[] {
  const rnd = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
