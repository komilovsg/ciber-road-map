"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { onXp } from "@/lib/progress";
import { useT } from "@/i18n/context";

type Chip = { id: number; amount: number; label?: string };

/** Floating "+XP" chips. Mounted once in the root. */
export function XpLayer() {
  const [chips, setChips] = useState<Chip[]>([]);
  const t = useT();
  useEffect(() => {
    let id = 0;
    return onXp((amount, label) => {
      const c = { id: ++id, amount, label };
      setChips((l) => [...l, c]);
      setTimeout(() => setChips((l) => l.filter((x) => x.id !== c.id)), 1800);
    });
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2">
      <AnimatePresence>
        {chips.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16, scale: 0.8 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="rounded-full bg-xp px-4 py-1.5 font-mono text-sm font-semibold text-[#2a1a00] shadow-lg"
          >
            +{c.amount} {t.common.xp}
            {c.label ? ` · ${c.label}` : ""}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
