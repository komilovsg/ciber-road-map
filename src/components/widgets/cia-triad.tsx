"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WidgetFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconX, IconReset, IconArrowRight, IconTrophy, IconLock, IconShield, IconRefresh } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";

type K = "C" | "I" | "A";

const PILLARS: { k: K; name: string; def: string; icon: typeof IconLock }[] = [
  { k: "C", name: "Конфиденциальность", def: "Информацию видят только те, кому положено. Защита: шифрование, права доступа, MFA.", icon: IconLock },
  { k: "I", name: "Целостность", def: "Данные не изменены без разрешения и им можно верить. Защита: хеши, подписи, контроль версий.", icon: IconShield },
  { k: "A", name: "Доступность", def: "Система и данные доступны, когда нужны. Защита: резервные копии, отказоустойчивость, защита от DDoS.", icon: IconRefresh },
];

const INCIDENTS: { text: string; accept: K[]; why: string }[] = [
  { text: "Утечка базы паролей пользователей из интернет-магазина.", accept: ["C"], why: "Секретные данные увидели те, кому их видеть нельзя: нарушена конфиденциальность." },
  { text: "DDoS-атака: сайт банка не открывается у клиентов.", accept: ["A"], why: "Данные целы и не украдены, но сервис недоступен: нарушена доступность." },
  { text: "Злоумышленник по пути изменил сумму платежа с 100 на 1000 сомони.", accept: ["I"], why: "Данные изменены без разрешения: нарушена целостность." },
  { text: "Шифровальщик заблокировал файлы компании и требует выкуп.", accept: ["A", "C"], why: "Главный удар по доступности: файлы недоступны. Современные шифровальщики ещё и крадут копию данных перед шифрованием, поэтому конфиденциальность тоже засчитывается." },
  { text: "Сотрудник отправил письмо с договором не тому адресату.", accept: ["C"], why: "Документ увидел посторонний: нарушена конфиденциальность. Это случайная утечка, а не атака." },
  { text: "Сбой диска на сервере, резервных копий нет, данные потеряны.", accept: ["A"], why: "Данные недоступны (в худшем случае навсегда): нарушена доступность. Лекарство: бэкапы по правилу 3-2-1." },
  { text: "Студент тайно исправил свою оценку в электронном журнале.", accept: ["I"], why: "Данные изменены без права на это: нарушена целостность." },
  { text: "Злоумышленник перехватывает трафик в открытой Wi-Fi-сети кафе.", accept: ["C"], why: "Подслушивание раскрывает содержимое трафика: нарушена конфиденциальность. Защита: HTTPS, VPN." },
];

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const { solved, solve } = useBlockProgress();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<K | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const inc = INCIDENTS[idx];
  const correct = picked !== null && inc.accept.includes(picked);

  const pick = (k: K) => {
    if (picked) return;
    setPicked(k);
    if (inc.accept.includes(k)) setScore((s) => s + 1);
  };
  const next = () => {
    if (idx < INCIDENTS.length - 1) {
      setIdx(idx + 1);
      setPicked(null);
      return;
    }
    setDone(true);
    if (score / INCIDENTS.length >= 0.7 && !solved) solve();
  };
  const restart = () => {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  const label = (k: K) => PILLARS.find((p) => p.k === k)!.name;

  return (
    <WidgetFrame title="Триада CIA: классифицируй инциденты" hint="Определи, какое из трёх свойств безопасности нарушено в каждом инциденте." solved={solved}>
      <div className="grid gap-2 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.k} className="rounded-[14px] border border-line bg-paper p-3">
            <p className="flex items-center gap-2 font-display font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-lc/15 text-sm font-bold text-lc" aria-hidden>{p.k}</span>
              {p.name}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-muted">{p.def}</p>
          </div>
        ))}
      </div>

      <div className="mt-5" aria-live="polite">
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[14px] border border-line p-4">
            <div className="flex items-center gap-3">
              <IconTrophy size={32} className={score / INCIDENTS.length >= 0.7 ? "text-ok" : "text-muted"} />
              <div>
                <p className="font-display text-2xl font-semibold">{score} из {INCIDENTS.length}</p>
                <p className="text-sm text-muted">
                  {score / INCIDENTS.length >= 0.7 ? "Зачёт. Ты уверенно различаешь C, I и A." : "Нужно минимум 70%. Перечитай определения и попробуй снова."}
                </p>
              </div>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Спроси себя: данные увидел чужой (C), изменил чужой (I) или ими нельзя воспользоваться (A)?</li>
              <li>Один инцидент может задевать несколько свойств: выбирай главное и умей объяснить.</li>
            </ul>
            <button type="button" className="btn mt-4" onClick={restart}><IconReset size={16} /> Пройти заново</button>
          </motion.div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted">Инцидент {idx + 1} из {INCIDENTS.length}</span>
              <span className="flex items-center gap-1">
                Счёт:
                <motion.b key={score} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="inline-block">
                  {score}
                </motion.b>
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, ...(picked && !correct ? shake : {}) }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-[14px] border border-line bg-card p-4"
              >
                <p className="text-[16px] font-medium leading-snug">{inc.text}</p>
                <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Какое свойство нарушено">
                  {PILLARS.map((p) => {
                    const isPick = picked === p.k;
                    const good = inc.accept.includes(p.k);
                    const state = !picked ? "" : good ? "border-ok bg-ok/15" : isPick ? "border-bad bg-bad/15" : "opacity-60";
                    return (
                      <button key={p.k} type="button" disabled={!!picked} onClick={() => pick(p.k)} aria-label={p.name} className={`btn flex-col gap-0.5 py-2 ${state}`} style={{ height: "auto", minHeight: 56 }}>
                        <span className="text-lg font-bold">{p.k}</span>
                        <span className="text-[11px] font-normal leading-tight sm:text-xs">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
                {picked && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                    <p className={`flex items-center gap-2 font-semibold ${correct ? "text-ok" : "text-bad"}`}>
                      {correct ? <DrawCheck /> : <IconX />}
                      {correct ? "Верно" : `Не совсем. Правильно: ${inc.accept.map(label).join(" или ")}`}
                    </p>
                    <p className="mt-1 text-sm text-muted">{inc.why}</p>
                    <button type="button" className="btn btn-primary mt-3" onClick={next}>
                      {idx < INCIDENTS.length - 1 ? "Дальше" : "Показать итог"} <IconArrowRight size={16} />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </WidgetFrame>
  );
}
