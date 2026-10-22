"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useT } from "@/i18n/context";
import { DrawCheck, shake } from "@/components/ui/frames";

function BitsDemo() {
  const t = useT();
  const [bits, setBits] = useState([0, 1, 0, 0, 1, 0, 1, 1]);
  const value = bits.reduce((a, b) => a * 2 + b, 0);
  return (
    <div>
      <p className="label mb-2">{t.how.s2bits}</p>
      <div className="flex gap-1.5">
        {bits.map((b, i) => (
          <motion.button
            key={i}
            type="button"
            whileTap={{ scale: 0.9 }}
            aria-pressed={b === 1}
            aria-label={`${t.how.s2bits} ${i + 1}: ${b}`}
            onClick={() => setBits((x) => x.map((v, j) => (j === i ? 1 - v : v)))}
            className={`grid h-11 min-w-0 flex-1 place-items-center rounded-[10px] border font-mono text-[17px] font-semibold transition-colors ${b ? "border-accent bg-accent text-[var(--accent-ink)]" : "border-line bg-paper text-muted"}`}
          >
            {b}
          </motion.button>
        ))}
      </div>
      <p className="mt-3 text-[15px] text-muted">
        {t.how.s2value}: <span className="font-mono text-[22px] font-semibold text-ink tabular-nums">{value}</span>
      </p>
    </div>
  );
}

function FlagDemo() {
  const t = useT();
  const [v, setV] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "bad">("idle");
  return (
    <div>
      <p className="text-[15px] text-muted">{t.how.s3ex}</p>
      <code className="mt-2 block break-all rounded-[10px] bg-code px-3 py-2 font-mono text-[14px] text-[var(--code-ink)]">ZmxhZ3t3ZWxjb21lfQ==</code>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setState(v.trim().toLowerCase() === "flag{welcome}" ? "ok" : "bad");
        }}
      >
        <motion.div className="min-w-0 flex-1" animate={state === "bad" ? shake : undefined}>
        <input
          className="input mono"
          value={v}
          placeholder={t.how.s3ph}
          aria-label="flag"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => { setV(e.target.value); setState("idle"); }}
        />
        </motion.div>
        <button type="submit" className="btn btn-primary shrink-0">{t.how.s3check}</button>
      </form>
      <div aria-live="polite" className="mt-2 min-h-6 text-[14px]">
        <AnimatePresence mode="wait">
          {state === "ok" && (
            <motion.p key="ok" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-ok">
              <DrawCheck size={18} /> {t.how.s3ok}
            </motion.p>
          )}
          {state === "bad" && (
            <motion.p key="bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted">{t.how.s3bad}</motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const t = useT();
  const steps = [
    { n: "01", h: t.how.s1, d: t.how.s1d, body: <p className="rounded-[10px] border-l-[3px] border-accent bg-paper px-4 py-3 text-[16px] leading-relaxed">{t.how.s1ex}</p> },
    { n: "02", h: t.how.s2, d: t.how.s2d, body: <><p className="mb-3 text-[15px] text-muted">{t.how.s2ex}</p><BitsDemo /></> },
    { n: "03", h: t.how.s3, d: t.how.s3d, body: <FlagDemo /> },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 md:py-14" aria-labelledby="how-title">
      <h2 id="how-title" className="font-display text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.025em]">{t.how.title}</h2>
      <p className="mt-2 text-muted">{t.how.lead}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="card flex flex-col p-5">
            <span className="eyebrow">{s.n}</span>
            <h3 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.01em]">{s.h}</h3>
            <p className="mb-4 mt-1.5 text-[15px] text-muted">{s.d}</p>
            <div className="mt-auto">{s.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
