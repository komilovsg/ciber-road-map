"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WidgetFrame } from "@/components/ui/frames";
import { IconArrowDown, IconArrowUp, IconX } from "@/icons";
import { OPS, runChain, type OpId } from "./_lib/codecs";
import { Callout, CopyBtn } from "./_lib/ui";

type Step = { id: number; op: OpId };

const PRESETS: { label: string; input: string; chain: OpId[] }[] = [
  { label: "Раскодировать Base64", input: "0J/RgNC40LLQtdGCLCDQvNC40YAh", chain: ["b64d"] },
  { label: "Текст → Base64 → Hex", input: "Привет, мир!", chain: ["b64e", "hexe"] },
  { label: "Hex → Base64 → текст", input: "5a 6d 78 68 5a 33 74 6a 61 47 46 70 62 6e 30 3d", chain: ["hexd", "b64d"] },
  { label: "ROT13 дважды", input: "Hello, CTF!", chain: ["rot13", "rot13"] },
];

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const nextId = useRef(2);
  const [input, setInput] = useState("Привет, мир!");
  const [steps, setSteps] = useState<Step[]>([{ id: 1, op: "b64e" }]);

  const label = (op: OpId) => OPS.find((o) => o.id === op)!.label;
  const { results, failed, final } = runChain(
    input,
    steps.map((s) => s.op),
  );

  function add(op: OpId) {
    setSteps((s) => [...s, { id: nextId.current++, op }]);
  }
  function move(i: number, d: number) {
    setSteps((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }
  function preset(p: (typeof PRESETS)[number]) {
    setInput(p.input);
    setSteps(p.chain.map((op) => ({ id: nextId.current++, op })));
  }

  return (
    <WidgetFrame
      title="Мини-CyberChef: цепочка кодировок"
      hint="Собери цепочку операций: результат каждого шага идёт на вход следующему. Кодирование — не шифрование: любой может его обратить."
    >
      <div>
        <label className="label" htmlFor="enc-in">
          Входные данные
        </label>
        <textarea id="enc-in" className="input mono mt-1 min-h-[72px]" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Готовые примеры:</span>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn btn-sm" onClick={() => preset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-2" aria-label="Цепочка операций">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => {
            const r = results[i];
            return (
              <motion.li
                key={s.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-[10px] border p-3 ${r.err === "fail" ? "border-bad/50 bg-bad/5" : "border-line bg-paper"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="mono grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-[12px] font-semibold text-accent">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{label(s.op)}</span>
                  <button type="button" className="btn btn-sm !px-2" aria-label={`Шаг ${i + 1} выше`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <IconArrowUp size={16} />
                  </button>
                  <button type="button" className="btn btn-sm !px-2" aria-label={`Шаг ${i + 1} ниже`} disabled={i === steps.length - 1} onClick={() => move(i, 1)}>
                    <IconArrowDown size={16} />
                  </button>
                  <button type="button" className="btn btn-sm !px-2" aria-label={`Удалить шаг ${i + 1}`} onClick={() => setSteps((x) => x.filter((y) => y.id !== s.id))}>
                    <IconX size={16} />
                  </button>
                </div>
                <p aria-live="polite" className={`mono mt-2 max-h-[120px] overflow-auto whitespace-pre-wrap break-all text-[13px] ${r.err ? "text-bad" : ""}`}>
                  {r.err === "fail" ? "Не удалось декодировать: вход не подходит для этой операции." : r.err === "skipped" ? <span className="text-muted">Пропущено из-за ошибки выше.</span> : r.out || <span className="text-muted">(пусто)</span>}
                </p>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {steps.length === 0 && <li className="rounded-[10px] border border-dashed border-line p-3 text-[14px] text-muted">Цепочка пуста: добавь первую операцию ниже.</li>}
      </ol>

      <div className="mt-3">
        <span className="label">Добавить шаг</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {OPS.map((o) => (
            <button key={o.id} type="button" className="btn btn-sm" onClick={() => add(o.id)}>
              + {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="label">Итог</span>
          {final && <CopyBtn text={final} />}
        </div>
        <p aria-live="polite" className={`mono mt-1 min-h-[48px] whitespace-pre-wrap break-all rounded-[10px] border p-3 text-[14px] ${failed ? "border-bad/50 text-bad" : "border-line bg-paper"}`}>
          {failed ? "Цепочка прервана ошибкой." : final || "—"}
        </p>
      </div>

      <div className="mt-4">
        <Callout title="Как узнать кодировку на глаз">
          Base64 — буквы, цифры, <b>+ /</b> и «=» в конце. Hex — пары цифр 0–9 и a–f. URL-кодирование — куски вида{" "}
          <b>%D0%9F</b>. Binary — группы по 8 нулей и единиц. ROT13 сдвигает только латинские буквы на 13 (поэтому
          применённый дважды возвращает исходное).
        </Callout>
      </div>
    </WidgetFrame>
  );
}
