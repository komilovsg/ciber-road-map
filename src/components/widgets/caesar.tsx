"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { DrawCheck, WidgetFrame } from "@/components/ui/frames";
import { useBlockProgress } from "@/components/blocks/block-context";
import { ALPHABETS, caesar, guessLang, type Lang } from "./_lib/alphabets";
import { Callout, CopyBtn, Seg } from "./_lib/ui";

const SAMPLE: Record<Lang, string> = { ru: "Привет, мир!", en: "Hello, world!" };
const C = 130;

function norm(s: string) {
  return s.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function Ring({ lang, shift }: { lang: Lang; shift: number }) {
  const abc = ALPHABETS[lang];
  const n = abc.length;
  const step = 360 / n;
  return (
    <svg viewBox="0 0 260 260" role="img" aria-label={`Кольцо алфавита, сдвиг ${shift}`} className="mx-auto block w-full max-w-[300px]">
      <circle cx={C} cy={C} r={122} fill="var(--paper)" stroke="var(--line)" />
      <circle cx={C} cy={C} r={92} fill="none" stroke="var(--line)" />
      {Array.from(abc).map((ch, i) => (
        <text
          key={ch}
          x={C}
          y={C - 104}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={600}
          fill="var(--ink)"
          transform={`rotate(${i * step} ${C} ${C})`}
        >
          {ch}
        </text>
      ))}
      <motion.g
        initial={false}
        animate={{ rotate: -shift * step }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
      >
        <circle cx={C} cy={C} r={92} fill="color-mix(in srgb, var(--accent) 12%, var(--card))" stroke="var(--accent)" strokeWidth={1.5} />
        <circle cx={C} cy={C} r={58} fill="var(--card)" stroke="var(--accent)" strokeOpacity={0.4} />
        {Array.from(abc).map((ch, i) => (
          <text
            key={ch}
            x={C}
            y={C - 76}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={600}
            fill="var(--accent)"
            transform={`rotate(${i * step} ${C} ${C})`}
          >
            {ch}
          </text>
        ))}
      </motion.g>
      <path d={`M${C - 6} 2 L${C + 6} 2 L${C} 12 Z`} fill="var(--accent)" />
      <text x={C} y={C} textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight={700} fill="var(--ink)">
        +{shift}
      </text>
    </svg>
  );
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  const cipher = typeof props?.ciphertext === "string" && props.ciphertext ? props.ciphertext : null;
  const { solved, solve } = useBlockProgress();
  const [lang, setLang] = useState<Lang>(() => (cipher ? guessLang(cipher) : "ru"));
  const [shift, setShift] = useState(3);
  const [mode, setMode] = useState<"enc" | "dec">(cipher ? "dec" : "enc");
  const [text, setText] = useState(SAMPLE.ru);
  const [guess, setGuess] = useState("");

  const abc = ALPHABETS[lang];
  const n = abc.length;
  const source = cipher ?? text;
  const out = caesar(source, mode === "enc" ? shift : -shift, lang);
  const brute = useMemo(() => Array.from({ length: n }, (_, k) => ({ k, text: caesar(source, -k, lang) })), [source, n, lang]);

  const challengeOk = (g: string) => {
    if (!cipher || !norm(g)) return false;
    return (["ru", "en"] as Lang[]).some((l) =>
      Array.from({ length: ALPHABETS[l].length }, (_, k) => norm(caesar(cipher, -k, l))).includes(norm(g)),
    );
  };
  const done = !!cipher && (solved || challengeOk(guess));

  function changeLang(l: Lang) {
    setLang(l);
    setShift((s) => s % ALPHABETS[l].length);
    setText((t) => (t === SAMPLE[lang] ? SAMPLE[l] : t));
  }
  function onGuess(v: string) {
    setGuess(v);
    if (!solved && challengeOk(v)) solve();
  }
  const clampShift = (v: number) => (Number.isFinite(v) ? Math.min(n - 1, Math.max(0, Math.round(v))) : 0);

  return (
    <WidgetFrame
      title={cipher ? "Шифр Цезаря: взлом" : "Шифр Цезаря"}
      hint={
        cipher
          ? "Перехвачено сообщение, зашифрованное шифром Цезаря. Ключ неизвестен, но вариантов всего столько, сколько букв в алфавите — найди читаемый."
          : "Каждая буква заменяется на ту, что стоит на N позиций дальше по алфавиту. Покрути внутреннее кольцо."
      }
      solved={done}
    >
      <div className="grid gap-5 md:grid-cols-[300px_1fr]">
        <div>
          <Ring lang={lang} shift={shift} />
          <p className="mt-2 text-center text-[13px] text-muted">
            Буква на внешнем кольце превращается в ту, что под ней на внутреннем.
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Seg
              label="Алфавит"
              value={lang}
              onChange={changeLang}
              options={[
                { value: "ru", label: "Русский (33)" },
                { value: "en", label: "English (26)" },
              ]}
            />
            {!cipher && (
              <Seg
                label="Режим"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "enc", label: "Зашифровать" },
                  { value: "dec", label: "Расшифровать" },
                ]}
              />
            )}
          </div>

          <div>
            <label className="label" htmlFor="cz-shift">
              Сдвиг (ключ): {shift} из 0–{n - 1}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <button type="button" className="btn btn-sm" aria-label="Уменьшить сдвиг" onClick={() => setShift((s) => clampShift(s - 1))}>
                −
              </button>
              <input
                id="cz-shift"
                type="range"
                min={0}
                max={n - 1}
                value={shift}
                onChange={(e) => setShift(clampShift(+e.target.value))}
                className="h-11 min-w-0 flex-1 accent-[var(--accent)]"
              />
              <button type="button" className="btn btn-sm" aria-label="Увеличить сдвиг" onClick={() => setShift((s) => clampShift(s + 1))}>
                +
              </button>
              <input
                type="number"
                className="input mono !w-[72px] text-center"
                aria-label="Сдвиг числом"
                min={0}
                max={n - 1}
                value={shift}
                onChange={(e) => setShift(clampShift(+e.target.value))}
              />
            </div>
          </div>

          {cipher ? (
            <div>
              <span className="label">Шифртекст</span>
              <p className="mono mt-1 break-words rounded-[10px] border border-line bg-paper p-3 text-[15px]">{cipher}</p>
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="cz-text">
                {mode === "enc" ? "Исходный текст" : "Шифртекст"}
              </label>
              <textarea
                id="cz-text"
                className="input mt-1 min-h-[72px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="label">{mode === "enc" ? "Результат (шифртекст)" : "Результат (расшифровка)"}</span>
              <CopyBtn text={out} />
            </div>
            <p aria-live="polite" className="mono mt-1 min-h-[48px] break-words rounded-[10px] border border-line bg-paper p-3 text-[15px]">
              {Array.from(out).map((c, i) => {
                const orig = Array.from(source)[i];
                return c !== orig ? (
                  <span key={i} className="rounded-sm bg-accent/20 font-semibold text-accent">
                    {c}
                  </span>
                ) : (
                  <span key={i}>{c}</span>
                );
              })}
            </p>
            <p className="mt-1 text-[12px] text-muted">Подсвечены изменённые буквы. Пробелы, цифры и знаки не шифруются.</p>
          </div>
        </div>
      </div>

      {cipher && (
        <div className="mt-5 rounded-[14px] border border-line bg-paper p-3 sm:p-4">
          <label className="label" htmlFor="cz-guess">
            Впиши расшифрованный текст
          </label>
          <input
            id="cz-guess"
            className="input mt-1"
            value={guess}
            onChange={(e) => onGuess(e.target.value)}
            disabled={solved && !guess}
            placeholder={solved ? "Уже расшифровано" : "Прочитай нужную строку в таблице ниже"}
            autoComplete="off"
            spellCheck={false}
          />
          <div aria-live="polite" className="mt-2 min-h-6 text-[14px]">
            {done ? (
              <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1.5 font-semibold text-ok">
                <DrawCheck size={20} /> Сообщение расшифровано!
              </motion.span>
            ) : guess.trim() ? (
              <span className="text-muted">Пока не совпадает ни с одним из вариантов сдвига. Регистр и «ё» не важны.</span>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-5">
        <h4 className="font-display text-[15px] font-semibold">Перебор всех ключей</h4>
        <p className="mb-2 text-[13px] text-muted">
          Всего {n} вариантов — компьютер проверит их мгновенно. Нажми строку, чтобы взять этот сдвиг.
        </p>
        <div className="max-h-[260px] overflow-auto rounded-[10px] border border-line">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead className="sticky top-0 bg-card text-[12px] text-muted">
              <tr>
                <th className="w-[56px] px-3 py-2 font-medium">Сдвиг</th>
                <th className="px-3 py-2 font-medium">Расшифровка при этом ключе</th>
              </tr>
            </thead>
            <tbody>
              {brute.map((r) => (
                <tr key={r.k} className={`border-t border-line ${r.k === shift ? "bg-accent/10" : ""}`}>
                  <td colSpan={2} className="p-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShift(r.k);
                        setMode("dec");
                      }}
                      aria-label={`Взять сдвиг ${r.k}: ${r.text}`}
                      className="grid min-h-[44px] w-full grid-cols-[56px_1fr] items-center text-left hover:bg-accent/5"
                    >
                      <span className="mono px-3 font-semibold">{r.k}</span>
                      <span className="mono truncate px-3">{r.text}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Callout title="Почему шифр слабый">
          Ключей мало, и перебор делает человек глазами за минуту. Современная криптография держится на ключах, которые
          перебрать невозможно физически.
        </Callout>
      </div>
    </WidgetFrame>
  );
}
