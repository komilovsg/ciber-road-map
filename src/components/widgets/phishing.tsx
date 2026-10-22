"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WidgetFrame, DrawCheck } from "@/components/ui/frames";
import { IconWarn, IconCheck, IconX, IconReset, IconArrowRight, IconTrophy } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { EMAILS, emailScore, type Email, type Taps } from "./_lib/phishing-data";

type Verdict = "phish" | "safe";
type State = { taps: Taps; verdict?: Verdict };

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const { solved, solve } = useBlockProgress();
  const [idx, setIdx] = useState(0);
  const [states, setStates] = useState<State[]>(() => EMAILS.map(() => ({ taps: {} })));
  const [log, setLog] = useState<{ id: string; text: string; good: boolean }[]>([]);
  const [peek, setPeek] = useState(false);
  const [finished, setFinished] = useState(false);

  const email = EMAILS[idx];
  const st = states[idx];
  const decided = st.verdict !== undefined;

  const patch = (i: number, f: (s: State) => State) => setStates((all) => all.map((s, k) => (k === i ? f(s) : s)));

  const tap = (id: string) => {
    if (decided) return;
    const el = email.els[id];
    if (id === "link") setPeek(true);
    if (st.taps[id]) return;
    patch(idx, (s) => ({ ...s, taps: { ...s.taps, [id]: el.flag ? "hit" : "wrong" } }));
    setLog((l) => [{ id: `${idx}-${id}`, text: el.note, good: el.flag }, ...l]);
  };

  const decide = (v: Verdict) => {
    if (decided) return;
    patch(idx, (s) => ({ ...s, verdict: v }));
  };

  const goto = (i: number) => {
    setIdx(i);
    setLog([]);
    setPeek(false);
  };

  const next = () => {
    if (idx < EMAILS.length - 1) return goto(idx + 1);
    setFinished(true);
    const total = EMAILS.reduce((a, e, i) => a + emailScore(e, states[i].taps, states[i].verdict).score, 0) / EMAILS.length;
    if (total >= 0.7 && !solved) solve();
  };

  const restart = () => {
    setStates(EMAILS.map(() => ({ taps: {} })));
    setFinished(false);
    goto(0);
  };

  if (finished) {
    const per = EMAILS.map((e, i) => ({ e, ...emailScore(e, states[i].taps, states[i].verdict) }));
    const total = Math.round((per.reduce((a, r) => a + r.score, 0) / per.length) * 100);
    const pass = total >= 70;
    return (
      <WidgetFrame title="Фишинг: найди красные флаги" solved={solved}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} aria-live="polite">
          <div className="flex items-center gap-3">
            <IconTrophy size={32} className={pass ? "text-ok" : "text-muted"} />
            <div>
              <p className="font-display text-2xl font-semibold">{total}%</p>
              <p className="text-sm text-muted">{pass ? "Зачёт: ты хорошо видишь признаки фишинга." : "Нужно набрать 70%. Попробуй ещё раз, обращая внимание на адрес и ссылки."}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {per.map((r) => (
              <li key={r.e.id} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line p-2 text-sm">
                {r.verdictOk ? <IconCheck className="text-ok" /> : <IconX className="text-bad" />}
                <span className="font-semibold">{r.e.fromName}</span>
                <span className="text-muted">{r.e.phishing ? "фишинг" : "безопасное"}, флагов найдено {r.found} из {r.flags}</span>
              </li>
            ))}
          </ul>
          <p className="label mb-1 mt-4">Красные флаги, которые ты встретил</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {[...new Set(EMAILS.flatMap((e) => e.lessons))].map((l) => <li key={l}>{l}</li>)}
          </ul>
          <button type="button" className="btn mt-4" onClick={restart}><IconReset size={16} /> Пройти заново</button>
        </motion.div>
      </WidgetFrame>
    );
  }

  const link = email.els.link;
  return (
    <WidgetFrame
      title="Фишинг: найди красные флаги"
      hint="Нажимай на подозрительные части письма: адрес отправителя, тему, обращение, текст, ссылку, вложение. Потом вынеси вердикт."
      solved={solved}
    >
      <div className="mb-3 flex items-center gap-2" role="list" aria-label="Прогресс">
        {EMAILS.map((e, i) => (
          <span
            key={e.id}
            role="listitem"
            aria-label={`Письмо ${i + 1}${i === idx ? ", текущее" : states[i].verdict ? ", оценено" : ""}`}
            className="h-2.5 rounded-full transition-all"
            style={{ width: i === idx ? 28 : 10, background: states[i].verdict ? "var(--ok)" : i === idx ? "var(--accent)" : "var(--line)" }}
          />
        ))}
        <span className="ml-auto text-xs text-muted">письмо {idx + 1} из {EMAILS.length}</span>
      </div>

      <article className="overflow-hidden rounded-[14px] border border-line bg-paper" aria-label="Письмо">
        <header className="space-y-1 border-b border-line p-3 text-sm">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-muted">От:</span>
            <b>{email.fromName}</b>
            <Tap email={email} id="sender" st={st} onTap={tap} decided={decided} mono />
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-muted">Тема:</span>
            <Tap email={email} id="subject" st={st} onTap={tap} decided={decided} />
          </p>
          <p className="text-xs text-muted">{email.date}</p>
        </header>
        <div className="space-y-3 p-3 text-[15px] leading-relaxed">
          {email.paras.map((p, i) => (
            <p key={i}>
              {p.map((seg, j) =>
                seg.startsWith("@") ? (
                  <Tap key={j} email={email} id={seg.slice(1)} st={st} onTap={tap} decided={decided} onPeek={seg === "@link" ? setPeek : undefined} />
                ) : (
                  <span key={j}>{seg}</span>
                ),
              )}
            </p>
          ))}
          {email.els.attach && (
            <p>
              <Tap email={email} id="attach" st={st} onTap={tap} decided={decided} chip />
            </p>
          )}
        </div>
        {link && (
          <div className="border-t border-line bg-card px-3 py-2 font-mono text-xs" aria-live="polite">
            <span className="text-muted">Адрес ссылки: </span>
            {peek ? <span className="break-all font-semibold">{link.href}</span> : <span className="text-muted">наведи курсор или нажми на ссылку</span>}
          </div>
        )}
      </article>

      <div aria-live="polite" className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {log.slice(0, 3).map((n) => (
            <motion.p
              key={n.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 rounded-[10px] p-2.5 text-sm ${n.good ? "bg-bad/10" : "bg-ok/10"}`}
            >
              {n.good ? <IconWarn size={18} className="mt-0.5 shrink-0 text-bad" /> : <IconCheck size={18} className="mt-0.5 shrink-0 text-ok" />}
              <span><b>{n.good ? "Красный флаг. " : "Это нормально. "}</b>{n.text}</span>
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {!decided ? (
        <div className="mt-4">
          <p className="label mb-2">Твой вердикт</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => decide("phish")}><IconWarn size={16} /> Это фишинг</button>
            <button type="button" className="btn" onClick={() => decide("safe")}><IconCheck size={16} /> Это безопасно</button>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-[14px] border border-line p-3" aria-live="polite">
          {(() => {
            const r = emailScore(email, st.taps, st.verdict);
            return (
              <>
                <p className={`flex items-center gap-2 font-semibold ${r.verdictOk ? "text-ok" : "text-bad"}`}>
                  {r.verdictOk ? <DrawCheck /> : <IconX />} {r.verdictOk ? "Верно." : "Неверно."} {email.verdictNote}
                </p>
                {email.phishing && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {Object.entries(email.els).filter(([, el]) => el.flag).map(([k, el]) => (
                      <li key={k} className="flex gap-2">
                        {st.taps[k] === "hit" ? <IconCheck size={16} className="mt-0.5 shrink-0 text-ok" /> : <IconWarn size={16} className="mt-0.5 shrink-0 text-bad" />}
                        <span><b>{st.taps[k] === "hit" ? "найдено" : "пропущено"}:</b> {el.note}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="btn btn-primary mt-3" onClick={next}>
                  {idx < EMAILS.length - 1 ? "Следующее письмо" : "Показать итог"} <IconArrowRight size={16} />
                </button>
              </>
            );
          })()}
        </motion.div>
      )}
    </WidgetFrame>
  );
}

function Tap({
  email, id, st, onTap, decided, mono, chip, onPeek,
}: {
  email: Email;
  id: string;
  st: State;
  onTap: (id: string) => void;
  decided: boolean;
  mono?: boolean;
  chip?: boolean;
  onPeek?: (v: boolean) => void;
}) {
  const el = email.els[id];
  const state = st.taps[id];
  const missed = decided && el.flag && !state;
  const cls = state === "hit" || missed
    ? "border-bad bg-bad/15 text-bad"
    : state === "wrong"
      ? "border-ok bg-ok/10"
      : "border-transparent bg-accent/10 hover:bg-accent/20";
  const isLink = id === "link";
  return (
    <motion.button
      key={state ?? "none"}
      type="button"
      role="button"
      onClick={() => onTap(id)}
      onMouseEnter={onPeek ? () => onPeek(true) : undefined}
      onFocus={onPeek ? () => onPeek(true) : undefined}
      disabled={decided && !state && !missed ? true : undefined}
      aria-label={`${el.text}${state === "hit" ? " (красный флаг)" : state === "wrong" ? " (безопасно)" : missed ? " (пропущенный красный флаг)" : ""}`}
      animate={state === "wrong" ? { x: [0, -5, 5, -3, 3, 0] } : undefined}
      transition={{ duration: 0.35 }}
      className={`inline-flex min-h-[32px] max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-left align-baseline break-all ${mono ? "font-mono text-[13px]" : ""} ${chip ? "chip" : ""} ${isLink ? "underline underline-offset-2" : "underline decoration-dotted underline-offset-4"} ${cls}`}
    >
      {chip && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M20 11l-8.5 8.5a5 5 0 01-7-7L13 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L14 7" />
        </svg>
      )}
      {el.text}
      {(state === "hit" || missed) && <IconWarn size={14} className="shrink-0" />}
    </motion.button>
  );
}
