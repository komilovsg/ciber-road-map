"use client";
import { useState } from "react";
import { WidgetFrame } from "@/components/ui/frames";
import { ALPHABETS, type Lang } from "./_lib/alphabets";
import { Callout, CopyBtn, Seg } from "./_lib/ui";

const SAMPLE: Record<Lang, { text: string; key: string }> = {
  ru: { text: "Атака на рассвете", key: "ЛИМОН" },
  en: { text: "Attack at dawn", key: "LEMON" },
};
const MAX_COLS = 36;

type Cell = { ch: string; letter: boolean; key: string; shift: number | null; out: string };

function run(text: string, keyRaw: string, lang: Lang, dir: 1 | -1): { cells: Cell[]; key: string } {
  const abc = ALPHABETS[lang];
  const n = abc.length;
  const key = Array.from(keyRaw.toUpperCase()).filter((c) => abc.includes(c)).join("");
  let ki = 0;
  const cells = Array.from(text).map((ch): Cell => {
    const up = ch.toUpperCase();
    const idx = ch.length === 1 ? abc.indexOf(up) : -1;
    if (idx < 0 || !key) return { ch, letter: false, key: "", shift: null, out: ch };
    const kc = key[ki % key.length];
    ki++;
    const s = abc.indexOf(kc);
    const o = abc[(((idx + dir * s) % n) + n) % n];
    return { ch, letter: true, key: kc, shift: s, out: ch === up ? o : o.toLowerCase() };
  });
  return { cells, key };
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [lang, setLang] = useState<Lang>("ru");
  const [mode, setMode] = useState<"enc" | "dec">("enc");
  const [text, setText] = useState(SAMPLE.ru.text);
  const [key, setKey] = useState(SAMPLE.ru.key);

  const { cells, key: cleanKey } = run(text, key, lang, mode === "enc" ? 1 : -1);
  const out = cells.map((c) => c.out).join("");
  const shown = cells.slice(0, MAX_COLS);
  const keyIgnored = key.length > 0 && cleanKey.length < Array.from(key).length;

  function changeLang(l: Lang) {
    if (text === SAMPLE[lang].text) setText(SAMPLE[l].text);
    if (key === SAMPLE[lang].key) setKey(SAMPLE[l].key);
    setLang(l);
  }

  return (
    <WidgetFrame
      title="Шифр Виженера"
      hint="Это Цезарь с меняющимся сдвигом: каждая буква ключа задаёт свой сдвиг (А = 0, Б = 1, В = 2…). Ключ повторяется по кругу."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Seg
          label="Алфавит"
          value={lang}
          onChange={changeLang}
          options={[
            { value: "ru", label: "Русский" },
            { value: "en", label: "English" },
          ]}
        />
        <Seg
          label="Режим"
          value={mode}
          onChange={setMode}
          options={[
            { value: "enc", label: "Зашифровать" },
            { value: "dec", label: "Расшифровать" },
          ]}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <label className="label" htmlFor="vg-text">
            {mode === "enc" ? "Исходный текст" : "Шифртекст"}
          </label>
          <textarea id="vg-text" className="input mt-1 min-h-[72px]" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        </div>
        <div>
          <label className="label" htmlFor="vg-key">
            Ключ
          </label>
          <input id="vg-key" className="input mono mt-1" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} />
          <p aria-live="polite" className="mt-1 text-[12px] text-muted">
            {!cleanKey
              ? "Введи ключ из букв выбранного алфавита."
              : keyIgnored
                ? `Используется только букв: ${cleanKey.length} (остальное отброшено).`
                : `Длина ключа: ${cleanKey.length}.`}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="label">Результат</span>
          <CopyBtn text={out} />
        </div>
        <p aria-live="polite" className="mono mt-1 min-h-[48px] break-words rounded-[10px] border border-line bg-paper p-3 text-[15px]">
          {out || "—"}
        </p>
      </div>

      <div className="mt-4">
        <h4 className="font-display text-[15px] font-semibold">Как это посчитано, буква за буквой</h4>
        <div className="scroll-x mt-2 rounded-[10px] border border-line">
          <table className="mono w-max min-w-full border-collapse text-center text-[14px]">
            <tbody>
              {(
                [
                  ["Буква", (c: Cell) => (c.ch === " " ? "␣" : c.ch)],
                  ["Ключ", (c: Cell) => (c.letter ? c.key : "·")],
                  ["Сдвиг", (c: Cell) => (c.letter ? `${mode === "enc" ? "+" : "−"}${c.shift}` : "·")],
                  ["Итог", (c: Cell) => (c.ch === " " ? "␣" : c.out)],
                ] as [string, (c: Cell) => string][]
              ).map(([label, f], r) => (
                <tr key={label} className={`border-t border-line first:border-t-0 ${r === 3 ? "bg-accent/10 font-semibold text-accent" : ""}`}>
                  <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-sans text-[12px] font-medium text-muted">
                    {label}
                  </th>
                  {shown.map((c, i) => (
                    <td key={i} className={`min-w-[34px] px-1.5 py-2 ${!c.letter && r !== 0 ? "text-muted/60" : ""}`}>
                      {f(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {cells.length > MAX_COLS ? `Показаны первые ${MAX_COLS} символов из ${cells.length}. ` : ""}
          Пробелы, цифры и знаки проходят как есть и ключ не «съедают».
        </p>
      </div>

      <div className="mt-4">
        <Callout title="Почему Виженер сильнее Цезаря, но тоже взломан">
          Одна и та же буква открытого текста даёт разные буквы шифртекста, поэтому простой частотный анализ не
          работает. Но ключ повторяется: определив его длину (метод Касиски), шифр разбивают на несколько Цезарей.
          Безвозвратно защищает только ключ длиной с сообщение и без повторов (одноразовый блокнот).
        </Callout>
      </div>
    </WidgetFrame>
  );
}
