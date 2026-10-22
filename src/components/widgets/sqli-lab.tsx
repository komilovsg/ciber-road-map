"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WidgetFrame, DrawCheck, shake } from "@/components/ui/frames";
import { IconWarn, IconShield, IconX, IconBulb } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { simulateSafe, simulateUnsafe, type SimResult } from "./_lib/sqli-sim";

const PRESETS: { label: string; login: string; password: string }[] = [
  { label: "' OR '1'='1", login: "admin", password: "' OR '1'='1" },
  { label: "' OR 1=1 --", login: "admin", password: "' OR 1=1 --" },
  { label: "admin'--", login: "admin'--", password: "x" },
  { label: "admin' #", login: "admin' #", password: "x" },
  { label: "' OR ''='", login: "admin", password: "' OR ''='" },
  { label: "одна кавычка '", login: "'", password: "x" },
  { label: "верные данные", login: "admin", password: "s3cret!" },
];

type Outcome =
  | { mode: "unsafe"; res: SimResult; l: string; p: string }
  | { mode: "safe"; ok: boolean; attack: boolean; l: string; p: string };

const Hl = ({ children }: { children: string }) => (
  <span className="rounded px-0.5 font-semibold" style={{ background: "rgba(251,191,36,.22)", color: "#fcd34d", outline: "1px dashed rgba(251,191,36,.6)" }}>
    {children || " "}
  </span>
);

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const { solved, solve } = useBlockProgress();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [safe, setSafe] = useState(false);
  const [out, setOut] = useState<Outcome | null>(null);
  const [broke, setBroke] = useState(false); // injection succeeded in unsafe mode
  const [tick, setTick] = useState(0);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const probe = simulateUnsafe(login, password);
    const wouldWork = probe.kind === "rows" && probe.injected;
    if (!safe) {
      setOut({ mode: "unsafe", res: probe, l: login, p: password });
      if (wouldWork) setBroke(true);
      else setTick((t) => t + 1);
    } else {
      const ok = simulateSafe(login, password) !== null;
      setOut({ mode: "safe", ok, attack: wouldWork, l: login, p: password });
      if (!ok) setTick((t) => t + 1);
      if (broke && wouldWork && !solved) solve();
    }
  };

  const preset = (p: (typeof PRESETS)[number]) => {
    setLogin(p.login);
    setPassword(p.password);
    setOut(null);
  };

  const toggle = (v: boolean) => {
    setSafe(v);
    setOut(null);
  };

  const unsafeRes = out?.mode === "unsafe" ? out.res : null;

  return (
    <WidgetFrame
      title="SQL-инъекция: учебный стенд"
      hint="Симуляция: настоящая база не используется. Ломай только учебные стенды — доступ к чужим системам незаконен."
      solved={solved}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <form onSubmit={submit} className="rounded-[14px] border border-line bg-paper p-4" aria-label="Форма входа example-shop">
          <p className="font-display text-[15px] font-semibold">example-shop</p>
          <p className="mb-3 text-xs text-muted">учебный стенд · вход для сотрудников</p>
          <label className="label" htmlFor="sqli-login">Логин</label>
          <input id="sqli-login" className="input mono mb-3 w-full" value={login} autoComplete="off" spellCheck={false} onChange={(e) => setLogin(e.target.value)} />
          <label className="label" htmlFor="sqli-pass">Пароль</label>
          <input id="sqli-pass" className="input mono mb-3 w-full" value={password} autoComplete="off" spellCheck={false} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="btn btn-primary w-full">Войти</button>
          <p className="mt-2 text-xs text-muted">Демо-данные: admin / s3cret!</p>
        </form>

        <div className="min-w-0">
          <div role="group" aria-label="Режим" className="mb-3 inline-flex rounded-[10px] border border-line p-0.5">
            <button type="button" aria-pressed={!safe} onClick={() => toggle(false)} className={`btn btn-sm border-transparent ${!safe ? "btn-primary" : "btn-ghost"}`}>
              Уязвимая версия
            </button>
            <button type="button" aria-pressed={safe} onClick={() => toggle(true)} className={`btn btn-sm border-transparent ${safe ? "btn-primary" : "btn-ghost"}`}>
              Безопасная версия
            </button>
          </div>
          <p className="label mb-1">{safe ? "Параметризованный запрос (prepared statement)" : "Запрос, собранный склейкой строк"}</p>
          <div className="scroll-x rounded-[10px] bg-code p-3 font-mono text-[13px] leading-relaxed text-code-ink" style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}>
            {safe ? (
              <>
                <div className="whitespace-pre">SELECT * FROM users WHERE login = ? AND password = ?</div>
                <div className="mt-2 whitespace-pre text-[12px] opacity-90">
                  <div>$1 = <Hl>{JSON.stringify(login)}</Hl></div>
                  <div>$2 = <Hl>{JSON.stringify(password)}</Hl></div>
                </div>
              </>
            ) : (
              <div className="whitespace-pre" aria-label="SQL-запрос">
                {"SELECT * FROM users WHERE login='"}
                <Hl>{login}</Hl>
                {"' AND password='"}
                <Hl>{password}</Hl>
                {"'"}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {safe
              ? "Запрос и данные отправляются в БД отдельно: введённое никогда не станет частью SQL-кода."
              : "Жёлтым выделено то, что контролирует пользователь — и оно попадает прямо в код запроса."}
          </p>

          <p className="label mb-1 mt-4">Готовые строки (подставляются в форму)</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className="btn btn-sm btn-ghost mono" onClick={() => preset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="mt-4">
        <AnimatePresence mode="wait">
          {out && (
            <motion.div
              key={`${tick}-${out.mode}-${out.l}-${out.p}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, ...(out.mode === "unsafe" && unsafeRes && (unsafeRes.kind === "error" || unsafeRes.rows.length === 0) ? shake : {}) }}
              className="rounded-[14px] border border-line p-4"
            >
              {out.mode === "unsafe" && unsafeRes?.kind === "error" && (
                <div className="flex gap-3">
                  <IconWarn className="mt-0.5 shrink-0 text-bad" />
                  <div className="min-w-0">
                    <p className="font-semibold text-bad">Ошибка сервера (утечка в ответе)</p>
                    <pre className="scroll-x mt-1 whitespace-pre-wrap break-words rounded-[10px] bg-bad/10 p-2 font-mono text-[12px]">{unsafeRes.message}</pre>
                    <p className="mt-2 text-sm text-muted">Сервер выдал текст ошибки БД: кавычка сломала синтаксис. Значит, ввод попадает в запрос как код — это сигнал уязвимости.</p>
                  </div>
                </div>
              )}
              {out.mode === "unsafe" && unsafeRes?.kind === "rows" && unsafeRes.rows.length === 0 && (
                <p className="flex items-center gap-2 font-semibold text-bad"><IconX /> неверный логин или пароль</p>
              )}
              {out.mode === "unsafe" && unsafeRes?.kind === "rows" && unsafeRes.rows.length > 0 && (
                <div>
                  <p className="flex items-center gap-2 font-semibold" style={{ color: unsafeRes.injected ? "var(--bad)" : "var(--ok)" }}>
                    {unsafeRes.injected ? <IconWarn /> : <DrawCheck />}
                    вход выполнен как {unsafeRes.rows[0].login}
                    {unsafeRes.injected && " — без знания пароля!"}
                  </p>
                  {unsafeRes.injected && (
                    <div className="mt-3 text-sm">
                      <p className="label mb-1">Как БД разобрала условие WHERE</p>
                      <div className="scroll-x flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
                        {unsafeRes.conds.map((c, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5">
                            <span className={`rounded-md border px-1.5 py-0.5 ${c.value ? "border-bad text-bad" : "border-line text-muted"}`}>
                              {c.text} {c.value ? "= ИСТИНА" : "= ложь"}
                            </span>
                            {unsafeRes.ops[i] && <b>{unsafeRes.ops[i]}</b>}
                          </span>
                        ))}
                      </div>
                      {unsafeRes.commented && (
                        <p className="mt-2">
                          Закомментировано (БД это не читает):{" "}
                          <code className="rounded bg-bad/10 px-1 font-mono line-through">{unsafeRes.commented}</code>
                        </p>
                      )}
                      <p className="mt-2 text-muted">
                        {unsafeRes.commented
                          ? "Проверка пароля отброшена целиком — остался только логин."
                          : "Приоритет у AND выше, чем у OR: одна всегда истинная часть через OR делает истинным всё условие."}{" "}
                        Найдено строк: {unsafeRes.rows.length}, приложение берёт первую.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {out.mode === "safe" && out.ok && (
                <p className="flex items-center gap-2 font-semibold text-ok"><DrawCheck /> вход выполнен как {out.l} (данные верны)</p>
              )}
              {out.mode === "safe" && !out.ok && (
                <div>
                  <p className="flex items-center gap-2 font-semibold text-bad"><IconX /> неверный логин или пароль</p>
                  {out.attack && (
                    <p className="mt-2 flex gap-2 text-sm">
                      <IconShield className="mt-0.5 shrink-0 text-ok" />
                      <span>Атака провалилась: введённое — просто строка. БД ищет пользователя, у которого пароль буквально равен <code className="font-mono">{JSON.stringify(out.p)}</code>, а такого нет.</span>
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {!solved && (
          <p className="mt-2 text-xs text-muted">
            Задача: {broke ? "хорошо, вход без пароля удался. Теперь включи «Безопасную версию» и повтори ту же атаку." : "войди как admin, не зная пароля — в уязвимой версии."}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-[14px] border border-line bg-paper p-4 text-sm">
        <p className="mb-1 flex items-center gap-2 font-semibold"><IconBulb className="text-accent" /> Почему это работает и как чинить</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Приложение склеивает SQL из строк, и БД не отличает код от данных: кавычка в пароле закрывает строку, дальше идёт уже «код» злоумышленника.</li>
          <li>Исправление номер один — параметризованные запросы (prepared statements): запрос и значения передаются раздельно, ввод не парсится как SQL. Экранирование вручную ненадёжно.</li>
          <li>Дополнительно: минимальные права учётной записи БД (least privilege), скрытие текстов ошибок от пользователя, хеширование паролей, WAF и логирование как последний рубеж.</li>
        </ul>
      </div>
    </WidgetFrame>
  );
}
