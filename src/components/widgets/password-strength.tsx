"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { WidgetFrame } from "@/components/ui/frames";
import { IconEye, IconLock, IconWarn } from "@/icons";
import { analyze, humanTime, LEVELS } from "./_lib/password";
import { Callout } from "./_lib/ui";

const COLORS = ["var(--bad)", "#e8a317", "#7bb661", "var(--ok)"];
const EXAMPLES = ["password1", "Tr0ub4dor&3", "горная-река-кофе-луна-72"];

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const a = analyze(pw);
  const has = a.len > 0;
  const color = COLORS[a.level];

  return (
    <WidgetFrame
      title="Надёжность пароля"
      hint="Энтропия — это сколько бит угадывать взломщику: длина × log₂(размер алфавита). Каждый лишний бит удваивает работу."
    >
      <label className="label" htmlFor="pw-in">
        Придумай пароль для проверки
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="pw-in"
          className="input mono"
          type={show ? "text" : "password"}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Начни вводить…"
        />
        <button type="button" className="btn" aria-label={show ? "Скрыть пароль" : "Показать пароль"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
          <IconEye size={18} className={show ? "text-accent" : "text-muted"} />
        </button>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
        <IconLock size={14} /> Пароль не покидает браузер: всё считается здесь, ничего не отправляется.
      </p>

      <div className="mt-4" aria-live="polite">
        <div className="flex gap-1.5" role="img" aria-label={has ? `Надёжность: ${LEVELS[a.level]}` : "Пароль не введён"}>
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-2.5 flex-1 rounded-full"
              initial={false}
              animate={{ backgroundColor: has && i <= a.level ? color : "var(--line)", scaleY: has && i <= a.level ? 1.15 : 1 }}
              transition={{ duration: 0.25 }}
            />
          ))}
        </div>
        <p className="mt-2 font-display text-[18px] font-semibold" style={{ color: has ? color : "var(--muted)" }}>
          {has ? LEVELS[a.level] : "Пока пусто"}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Длина", has ? String(a.len) : "—"],
          ["Алфавит", has ? `${a.charset} симв.` : "—"],
          ["Энтропия", has ? `${Math.round(a.eff)} бит` : "—"],
          ["Взлом при 10¹⁰/с", has ? humanTime(a.seconds) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-line bg-paper p-3">
            <dt className="text-[12px] text-muted">{k}</dt>
            <dd className="mono mt-0.5 text-[15px] font-semibold leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
      {has && (
        <p className="mt-2 text-[13px] text-muted">
          Набор символов: {a.sets.join(", ") || "—"}. Формула: {a.len} × log₂({a.charset}) ≈ {Math.round(a.raw)} бит
          {Math.round(a.raw) !== Math.round(a.eff) ? `; с учётом шаблонов реальная стойкость ниже — около ${Math.round(a.eff)} бит.` : "."}
        </p>
      )}

      {has && a.warnings.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Предупреждения">
          {a.warnings.map((w) => (
            <li key={w} className="flex gap-2 rounded-[10px] border border-bad/30 bg-bad/10 p-3 text-[14px]">
              <IconWarn size={18} className="mt-0.5 shrink-0 text-bad" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      {has && (
        <div className="mt-3 rounded-[10px] border border-line p-3">
          <h4 className="font-display text-[14px] font-semibold">Как улучшить</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] text-muted">
            {a.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h4 className="font-display text-[15px] font-semibold">Сравни три пароля</h4>
        <div className="scroll-x mt-2 rounded-[10px] border border-line">
          <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
            <thead className="text-[12px] text-muted">
              <tr>
                {["Пароль", "Длина", "Энтропия", "Взлом", "Уровень", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map((ex) => {
                const r = analyze(ex);
                return (
                  <tr key={ex} className="border-t border-line">
                    <td className="mono px-3 py-2">{ex}</td>
                    <td className="px-3 py-2">{r.len}</td>
                    <td className="px-3 py-2">{Math.round(r.eff)} бит</td>
                    <td className="px-3 py-2">{humanTime(r.seconds)}</td>
                    <td className="px-3 py-2 font-semibold" style={{ color: COLORS[r.level] }}>
                      {LEVELS[r.level]}
                    </td>
                    <td className="px-3 py-1">
                      <button type="button" className="btn btn-sm" onClick={() => setPw(ex)}>
                        Проверить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Callout title="Длина важнее хитрости">
          Фраза из нескольких случайных слов сильнее короткого пароля со спецсимволами: энтропия растёт с каждым символом, а
          подмены вроде «a → @» взломщики знают наперёд. Оценка тут приблизительная: реальный подбор зависит от того, как
          сайт хранит пароли (см. хеши и соль).
        </Callout>
      </div>
    </WidgetFrame>
  );
}
