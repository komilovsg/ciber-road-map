"use client";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useRef } from "react";
import { IconX } from "@/icons";
import { useT } from "@/i18n/context";

/** Bottom sheet (mobile course menu): backdrop, Esc, swipe-down to dismiss, scroll lock. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  const controls = useDragControls();
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragControls={controls}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[20px] border border-line bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-3" style={{ touchAction: "none" }} onPointerDown={(e) => controls.start(e)}>
              <span className="mx-auto h-1.5 w-10 rounded-full bg-line" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <button ref={closeRef} type="button" className="btn btn-ghost !w-11 !px-0" aria-label={t.common.close} onClick={onClose}><IconX /></button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-3 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
