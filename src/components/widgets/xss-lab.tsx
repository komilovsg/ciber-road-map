"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WidgetFrame } from "@/components/ui/frames";
import { IconWarn, IconShield, IconSend, IconBulb } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { commentDoc, detectXss, escapeHtml } from "./_lib/xss-detect";

type Comment = { id: number; author: string; text: string };

const SEED: Comment[] = [
  { id: 1, author: "Мария", text: "Отличный урок, спасибо! Про экранирование теперь понятно." },
  { id: 2, author: "Фаррух", text: "А <b>жирный</b> текст в комментариях разрешён?" },
];

const PRESETS = [
  { label: "<script>", text: "<script>alert(document.cookie)</script>" },
  { label: "img onerror", text: '<img src=x onerror="alert(document.cookie)">' },
  { label: "svg onload", text: "<svg onload=alert(document.cookie)>" },
  { label: "javascript:", text: '<a href="javascript:alert(document.cookie)">Нажми</a>' },
  { label: "обычный текст", text: "Всем привет!" },
];

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const { solved, solve } = useBlockProgress();
  const [comments, setComments] = useState<Comment[]>(SEED);
  const [text, setText] = useState("");
  const [safe, setSafe] = useState(false);
  const [sawXss, setSawXss] = useState(false);
  const [nextId, setNextId] = useState(3);

  const hasXss = (list: Comment[]) => list.some((c) => detectXss(c.text).length > 0);

  const checkSolve = (list: Comment[], isSafe: boolean, saw: boolean) => {
    if (isSafe && saw && hasXss(list) && !solved) solve();
  };

  const post = () => {
    const t = text.trim();
    if (!t) return;
    const list = [...comments, { id: nextId, author: "Ты", text: t }];
    setComments(list);
    setNextId(nextId + 1);
    setText("");
    const xss = detectXss(t).length > 0;
    const saw = sawXss || (!safe && xss);
    if (!safe && xss) setSawXss(true);
    checkSolve(list, safe, saw);
  };

  const setMode = (s: boolean) => {
    setSafe(s);
    if (!s && hasXss(comments)) setSawXss(true);
    checkSolve(comments, s, sawXss);
  };

  const reset = () => {
    setComments(SEED);
    setNextId(3);
    setText("");
  };

  return (
    <WidgetFrame
      title="XSS: доска комментариев"
      hint="Симуляция в песочнице: небезопасный вывод показан в iframe sandbox без скриптов, а выполнение имитируется."
      solved={solved}
    >
      <div role="group" aria-label="Режим вывода" className="mb-4 inline-flex max-w-full flex-wrap rounded-[10px] border border-line p-0.5">
        <button type="button" aria-pressed={!safe} onClick={() => setMode(false)} className={`btn btn-sm border-transparent ${!safe ? "btn-primary" : "btn-ghost"}`}>
          Небезопасный вывод
        </button>
        <button type="button" aria-pressed={safe} onClick={() => setMode(true)} className={`btn btn-sm border-transparent ${safe ? "btn-primary" : "btn-ghost"}`}>
          Безопасный вывод (экранирование)
        </button>
      </div>

      <label className="label" htmlFor="xss-text">Новый комментарий</label>
      <textarea id="xss-text" className="input mono mt-1 w-full" rows={3} value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} placeholder="Напиши комментарий или вставь пример нагрузки" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" onClick={post} disabled={!text.trim()}>
          <IconSend size={16} /> Опубликовать
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Сбросить доску</button>
      </div>
      <p className="label mb-1 mt-3">Примеры нагрузки (вставляются в поле)</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn btn-sm btn-ghost mono" onClick={() => setText(p.text)}>
            {p.label}
          </button>
        ))}
      </div>

      <ul className="mt-5 space-y-3" aria-label="Комментарии" aria-live="polite">
        <AnimatePresence initial={false}>
          {comments.map((c) => {
            const hits = detectXss(c.text);
            return (
              <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[14px] border border-line bg-paper p-3">
                <p className="mb-1 text-xs font-semibold text-muted">{c.author}</p>
                {safe ? (
                  <>
                    <p className="whitespace-pre-wrap break-words text-[15px]">{c.text}</p>
                    <p className="label mt-2">Что реально лежит в разметке:</p>
                    <code className="scroll-x mt-1 block whitespace-pre-wrap break-all rounded-[10px] p-2 font-mono text-[12px]" style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}>
                      {escapeHtml(c.text)}
                    </code>
                    {hits.length > 0 && (
                      <p className="mt-2 flex gap-2 text-sm text-ok"><IconShield className="mt-0.5 shrink-0" /> Теги показаны как текст — браузер не считает их кодом.</p>
                    )}
                  </>
                ) : (
                  <>
                    <iframe
                      title={`Комментарий ${c.author}`}
                      sandbox=""
                      srcDoc={commentDoc(c.text)}
                      className="block h-24 w-full rounded-[10px] border border-line"
                    />
                    {hits.length > 0 && (
                      <div className="mt-2 rounded-[10px] border border-bad bg-bad/10 p-3 text-sm" role="alert">
                        <p className="flex items-center gap-2 font-semibold text-bad"><IconWarn /> Обнаружена XSS-нагрузка: {hits.map((h) => h.kind).join(", ")}</p>
                        {hits.map((h, i) => (
                          <p key={i} className="mt-2">
                            в настоящем браузере здесь бы выполнился: <code className="break-all rounded bg-bad/15 px-1 font-mono">{h.js}</code>
                          </p>
                        ))}
                        <p className="mt-2 flex flex-wrap items-center gap-2">
                          Атакующий получил бы:
                          <span className="chip font-mono">session=abc123</span>
                          <span className="text-xs text-muted">вымышленный cookie. Скрипт отправил бы его на сервер злоумышленника, и тот зашёл бы под твоим именем.</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {!solved && (
        <p className="mt-3 text-xs text-muted">
          Задача: {sawXss ? "нагрузка сработала. Теперь включи «Безопасный вывод» и посмотри на тот же комментарий." : "опубликуй XSS-нагрузку в небезопасном режиме, потом переключись на безопасный."}
        </p>
      )}

      <div className="mt-4 rounded-[14px] border border-line bg-paper p-4 text-sm">
        <p className="mb-1 flex items-center gap-2 font-semibold"><IconBulb className="text-accent" /> Виды XSS и защита</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li><b>Хранимая (stored)</b>: нагрузка сохраняется на сервере, как этот комментарий, и бьёт по каждому, кто откроет страницу. <b>Отражённая (reflected)</b>: нагрузка приходит в ссылке или параметре и сразу «отражается» в ответе, жертву заманивают на такую ссылку.</li>
          <li>Исправление: экранировать данные при выводе в нужном контексте (HTML, атрибут, JS), а не при сохранении. Современные шаблонизаторы делают это по умолчанию, опасны <code className="font-mono">innerHTML</code> и аналоги.</li>
          <li>Вторая линия: заголовок Content-Security-Policy (запрет inline-скриптов), флаг <code className="font-mono">HttpOnly</code> для cookie сессии (JS не сможет её прочитать), санитайзер для разрешённого HTML.</li>
        </ul>
      </div>
    </WidgetFrame>
  );
}
