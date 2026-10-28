"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IconDownload, IconSettings, IconUpload, IconReset } from "@/icons";
import { exportProgress, importProgress, resetProgress, useProgress } from "@/lib/progress";
import { useT } from "@/i18n/context";
import { setTheme, useTheme, type Theme } from "@/lib/theme";

const THEMES: Theme[] = ["system", "light", "dark"];

export function SettingsPopover() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const p = useProgress();
  const theme = useTheme();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const download = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kiber-marshrut-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-ghost !min-h-11 !w-11 !px-0" aria-label={t.settings.open} aria-expanded={open} onClick={() => { setOpen((o) => !o); setConfirm(false); setMsg(""); }}>
        <IconSettings />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t.settings.title}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-[min(300px,calc(100vw-16px))] rounded-[12px] border border-line bg-paper p-4 shadow-lg"
          >
            <p className="font-display font-medium">{t.settings.title}</p>
            <p className="mt-1 text-[14px] text-muted">
              {Object.keys(p.done).length} · {p.xp} {t.common.xp}
            </p>
            <div role="group" aria-label={t.theme.label} className="mt-3 flex gap-1">
              {THEMES.map((k) => (
                <button key={k} type="button" aria-pressed={theme === k} onClick={() => setTheme(k)} className={`btn btn-sm flex-1 !px-2 ${theme === k ? "" : "btn-ghost text-muted"}`}>
                  {t.theme[k]}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[14px] text-muted">{t.settings.note}</p>
            <div className="mt-3 flex flex-col gap-1">
              <button type="button" className="btn btn-sm btn-ghost justify-start" onClick={download}><IconDownload size={16} />{t.settings.export}</button>
              <button type="button" className="btn btn-sm btn-ghost justify-start" onClick={() => file.current?.click()}><IconUpload size={16} />{t.settings.import}</button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setMsg(importProgress(await f.text()) ? t.settings.importOk : t.settings.importFail);
                  e.target.value = "";
                }}
              />
              {!confirm ? (
                <button type="button" className="btn btn-sm btn-ghost justify-start text-bad" onClick={() => setConfirm(true)}><IconReset size={16} />{t.settings.reset}</button>
              ) : (
                <div className="rounded-[12px] bg-bad/10 p-3 text-[14px]">
                  <p>{t.settings.resetConfirm}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn btn-sm !bg-bad !text-white" onClick={() => { resetProgress(); setConfirm(false); setMsg(""); setOpen(false); }}>{t.settings.resetYes}</button>
                    <button type="button" className="btn btn-sm" onClick={() => setConfirm(false)}>{t.settings.cancel}</button>
                  </div>
                </div>
              )}
              {msg && <p role="status" className="text-[14px] text-muted">{msg}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
