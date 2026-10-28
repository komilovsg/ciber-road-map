"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { IconX } from "@/icons";
import { useT } from "@/i18n/context";

/** Left drawer (course menu), same on desktop and mobile: backdrop, Esc, scroll lock. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 flex w-full flex-col bg-paper sm:w-[420px] sm:shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="font-display text-[19px] font-medium">{title}</h2>
              <button ref={closeRef} type="button" className="btn btn-ghost !w-11 !px-0" aria-label={t.common.close} onClick={onClose}><IconX /></button>
            </div>
            <div className="min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-2 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
