"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DrawCheck, WidgetFrame, shake } from "@/components/ui/frames";
import { IconReset, IconTrophy } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { Callout, Seg } from "./_lib/ui";

type Base = "dec" | "bin" | "hex" | "oct";
const RADIX: Record<Base, number> = { dec: 10, bin: 2, hex: 16, oct: 8 };
const NAME: Record<Base, string> = { dec: "Десятичная", bin: "Двоичная", hex: "Шестнадцатеричная", oct: "Восьмеричная" };
const SHORT: Record<Base, string> = { dec: "DEC (10)", bin: "BIN (2)", hex: "HEX (16)", oct: "OCT (8)" };
const FROM_TO: Record<Base, string> = { dec: "десятичной", bin: "двоичной", hex: "шестнадцатеричной", oct: "восьмеричной" };
const ERR: Record<Base, string> = {
  dec: "Допустимы только цифры 0–9.",
  bin: "В двоичной системе бывают только 0 и 1.",
  hex: "В hex допустимы цифры 0–9 и буквы A–F.",
  oct: "В восьмеричной системе допустимы цифры 0–7.",
};
const RE: Record<Base, RegExp> = { dec: /^[0-9]+$/, bin: /^[01]+$/, hex: /^[0-9a-fA-F]+$/, oct: /^[0-7]+$/ };
const PREFIX: Record<Base, RegExp> = { dec: /^$/, bin: /^0b/i, hex: /^0x/i, oct: /^0o/i };
const ONE = BigInt(1);
const MAX = (ONE << BigInt(64)) - ONE;

type Parsed = { ok: true; value: bigint } | { ok: false; error: string };

function parse(text: string, base: Base): Parsed {
  let s = text.trim().replace(/[\s_]/g, "");
  s = s.replace(PREFIX[base], "");
  if (!s) return { ok: false, error: "" };
  if (!RE[base].test(s)) return { ok: false, error: ERR[base] };
  const v = BigInt((base === "hex" ? "0x" : base === "bin" ? "0b" : base === "oct" ? "0o" : "") + s);
  if (v > MAX) return { ok: false, error: "Число больше 64 бит — этот тренажёр работает до 18 446 744 073 709 551 615." };
  return { ok: true, value: v };
}

function fmt(v: bigint, base: Base): string {
  const s = v.toString(RADIX[base]);
  if (base === "hex") return s.toUpperCase();
  if (base === "bin") {
    const pad = s.padStart(Math.ceil(s.length / 4) * 4, "0");
    return pad.replace(/(.{4})(?=.)/g, "$1 ");
  }
  return s;
}

type Q = { n: number; from: Base; to: Base };
type Game = {
  qs: Q[];
  i: number;
  score: number;
  streak: number;
  best: number;
  feedback: null | { ok: boolean; correct: string };
  done: boolean;
};

function makeQuestions(rounds: number): Q[] {
  const bases: Base[] = ["dec", "bin", "hex"];
  const out: Q[] = [];
  for (let k = 0; k < rounds; k++) {
    const from = bases[Math.floor(Math.random() * 3)];
    let to = bases[Math.floor(Math.random() * 3)];
    while (to === from) to = bases[Math.floor(Math.random() * 3)];
    out.push({ n: 5 + Math.floor(Math.random() * 251), from, to });
  }
  return out;
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  const rounds = Math.max(1, Math.min(20, typeof props?.rounds === "number" ? Math.floor(props.rounds) : 5));
  const { solved, solve } = useBlockProgress();
  const [value, setValue] = useState<bigint>(BigInt(173));
  const [edit, setEdit] = useState<{ base: Base; text: string } | null>(null);
  const [width, setWidth] = useState<8 | 16>(8);
  const [game, setGame] = useState<Game | null>(null);
  const [answer, setAnswer] = useState("");

  const editParsed = edit ? parse(edit.text, edit.base) : null;

  function onField(base: Base, text: string) {
    setEdit({ base, text });
    const p = parse(text, base);
    if (p.ok) setValue(p.value);
  }

  const mask = (ONE << BigInt(width)) - ONE;
  const overflow = value > mask;
  const bitIdx = Array.from({ length: width }, (_, k) => width - 1 - k);
  const isSet = (i: number) => ((value >> BigInt(i)) & ONE) === ONE;
  const setBits = bitIdx.filter(isSet);
  const rows: number[][] = [];
  for (let k = 0; k < bitIdx.length; k += 8) rows.push(bitIdx.slice(k, k + 8));

  function start() {
    setGame({ qs: makeQuestions(rounds), i: 0, score: 0, streak: 0, best: 0, feedback: null, done: false });
    setAnswer("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!game || game.done) return;
    if (!game.feedback) {
      const q = game.qs[game.i];
      const p = parse(answer, q.to);
      const ok = p.ok && p.value === BigInt(q.n);
      const streak = ok ? game.streak + 1 : 0;
      setGame({
        ...game,
        score: game.score + (ok ? 1 : 0),
        streak,
        best: Math.max(game.best, streak),
        feedback: { ok, correct: fmt(BigInt(q.n), q.to) },
      });
    } else if (game.i + 1 >= game.qs.length) {
      setGame({ ...game, done: true });
      if (game.score * 100 >= rounds * 60 && !solved) solve();
    } else {
      setGame({ ...game, i: game.i + 1, feedback: null });
      setAnswer("");
    }
  }

  const q = game && !game.done ? game.qs[game.i] : null;
  const passed = game?.done && game.score * 100 >= rounds * 60;

  return (
    <WidgetFrame
      title="Конвертер систем счисления"
      hint="Компьютер хранит всё в двоичном виде. Hex — удобная сокращённая запись: одна hex-цифра ровно равна четырём битам."
      solved={solved}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(["dec", "bin", "hex", "oct"] as Base[]).map((b) => {
          const showEdit = edit?.base === b;
          const err = showEdit && editParsed && !editParsed.ok ? editParsed.error : "";
          return (
            <div key={b}>
              <label className="label" htmlFor={`bc-${b}`}>
                {NAME[b]} · {SHORT[b]}
              </label>
              <input
                id={`bc-${b}`}
                className="input mono mt-1"
                inputMode={b === "hex" ? "text" : "numeric"}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!err}
                aria-describedby={err ? `bc-${b}-err` : undefined}
                value={showEdit ? edit.text : fmt(value, b)}
                onChange={(e) => onField(b, e.target.value)}
                onBlur={() => setEdit(null)}
                style={err ? { borderColor: "var(--bad)" } : undefined}
              />
              <p id={`bc-${b}-err`} aria-live="polite" className="min-h-5 pt-1 text-[13px] text-bad">
                {err}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-2 rounded-[14px] border border-line bg-paper p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-[15px] font-semibold">Биты — нажимай, чтобы переключать</span>
          <Seg
            label="Разрядность"
            value={width}
            onChange={setWidth}
            options={[
              { value: 8, label: "8 бит" },
              { value: 16, label: "16 бит" },
            ]}
          />
        </div>
        <div className="space-y-2">
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-8 gap-1 sm:gap-1.5">
              {row.map((i) => {
                const on = isSet(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Бит ${i}, вес ${1 << i}, сейчас ${on ? 1 : 0}`}
                    onClick={() => setValue((v) => v ^ (ONE << BigInt(i)))}
                    className={`flex min-h-[56px] flex-col items-center justify-center rounded-[10px] border transition-colors ${
                      on ? "border-accent bg-accent text-[var(--accent-ink)]" : "border-line bg-card hover:border-muted"
                    }`}
                  >
                    <span className="mono text-[18px] font-semibold leading-none">{on ? 1 : 0}</span>
                    <span className={`mono mt-1 text-[10px] leading-none sm:text-[11px] ${on ? "opacity-90" : "text-muted"}`}>
                      {1 << i}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px] text-muted" aria-live="polite">
          {overflow
            ? `Число не помещается в ${width} бит — показаны только младшие биты.`
            : setBits.length
              ? `${setBits.map((i) => 1 << i).join(" + ")} = ${value.toString()}`
              : "Все биты выключены: 0."}
        </p>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <IconTrophy size={20} className="text-accent" />
          <h4 className="font-display text-[16px] font-semibold">Игра: переведи число</h4>
          {game && !game.done && (
            <span className="chip ml-auto">
              {game.i + 1}/{rounds} · верно {game.score}
              {game.streak > 1 ? ` · серия ${game.streak}` : ""}
            </span>
          )}
        </div>

        {!game && (
          <div>
            <p className="mb-3 text-[14px] text-muted">
              {rounds} {rounds === 1 ? "вопрос" : "вопросов"}: переводи числа между десятичной, двоичной и hex. Нужно
              набрать не меньше 60%.
            </p>
            <button type="button" className="btn btn-primary" onClick={start}>
              Начать игру
            </button>
          </div>
        )}

        {game && q && (
          <form onSubmit={submit}>
            <motion.div key={game.i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[15px]">
                Переведи число из {FROM_TO[q.from]} в {FROM_TO[q.to]} систему:
              </p>
              <p className="mono my-2 break-all text-[26px] font-semibold text-accent">
                {fmt(BigInt(q.n), q.from)}
                <span className="ml-2 text-[14px] font-normal text-muted">({q.from})</span>
              </p>
            </motion.div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <motion.div className="flex-1" animate={game.feedback && !game.feedback.ok ? shake : undefined}>
                <input
                  className="input mono"
                  aria-label={`Ответ в ${FROM_TO[q.to]} системе`}
                  placeholder={`Ответ (${q.to})`}
                  autoComplete="off"
                  spellCheck={false}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  readOnly={!!game.feedback}
                  autoFocus
                />
              </motion.div>
              <button type="submit" className="btn btn-primary" disabled={!game.feedback && !answer.trim()}>
                {game.feedback ? (game.i + 1 >= rounds ? "Итог" : "Дальше") : "Проверить"}
              </button>
            </div>
            <div aria-live="polite" className="mt-2 min-h-6 text-[14px]">
              {game.feedback &&
                (game.feedback.ok ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-ok">
                    <DrawCheck size={18} /> Верно!
                  </span>
                ) : (
                  <span className="font-medium text-bad">
                    Неверно. Правильно: <span className="mono">{game.feedback.correct}</span>
                  </span>
                ))}
            </div>
          </form>
        )}

        <AnimatePresence>
          {game?.done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[14px] border border-line bg-paper p-4"
            >
              <p className="font-display text-[20px] font-semibold">
                {game.score} из {rounds}
              </p>
              <p className="mt-1 text-[14px] text-muted">
                Лучшая серия верных ответов: {game.best}.{" "}
                {passed ? "Отличный результат, задание засчитано." : "Для зачёта нужно минимум 60% — попробуй ещё раз."}
              </p>
              <button type="button" className="btn mt-3" onClick={start}>
                <IconReset size={16} /> Сыграть ещё
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5">
        <Callout title="Как переводить в уме">
          Каждый бит — степень двойки: справа налево 1, 2, 4, 8, 16… Сложи веса включённых битов — получишь десятичное
          число. Чтобы получить hex, режь двоичную запись на четвёрки справа: <b>1010 1101 = AD</b>.
        </Callout>
      </div>
    </WidgetFrame>
  );
}
