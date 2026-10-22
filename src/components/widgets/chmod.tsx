"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { DrawCheck, WidgetFrame, shake } from "@/components/ui/frames";
import { IconCheck, IconReset, IconTrophy, IconX } from "@/icons";
import { useBlockProgress } from "@/components/blocks/block-context";
import { actions, applyCmd, CLASSES, descShort, digit, parseSym, toOct, toSym, R } from "./_lib/chmod";
import { Callout, CopyBtn, Seg } from "./_lib/ui";

type Edit = { f: "oct" | "sym"; text: string } | null;
type Q = { type: 0 | 1 | 2; mode: number; options: string[]; correct: string };
type Quiz = { qs: Q[]; i: number; score: number; picked: string | null; ok: boolean | null; done: boolean };

const POOL = [0o755, 0o644, 0o600, 0o700, 0o750, 0o640, 0o664, 0o775, 0o444, 0o555, 0o711, 0o400, 0o770, 0o660, 0o666, 0o740];
const ROUNDS = 6;
const PASS = 5;

function shuffle<T>(a: T[]): T[] {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function makeQuiz(): Quiz {
  const modes = shuffle(POOL).slice(0, ROUNDS);
  const types: (0 | 1 | 2)[] = shuffle([0, 1, 2, 0, 1, 2]);
  const qs = modes.map((mode, i): Q => {
    const type = types[i];
    if (type === 0) return { type, mode, options: [], correct: toOct(mode) };
    const fmt = type === 1 ? descShort : toSym;
    const correct = fmt(mode);
    const others = shuffle(POOL.filter((x) => fmt(x) !== correct)).slice(0, 3).map(fmt);
    return { type, mode, options: shuffle([correct, ...others]), correct };
  });
  return { qs, i: 0, score: 0, picked: null, ok: null, done: false };
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const { solved, solve } = useBlockProgress();
  const [tab, setTab] = useState<"play" | "quiz">("play");
  const [mode, setMode] = useState(0o755);
  const [kind, setKind] = useState<"-" | "d">("-");
  const [edit, setEdit] = useState<Edit>(null);
  const [cmd, setCmd] = useState("u+x,g-w");
  const [cmdMsg, setCmdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [ans, setAns] = useState("");

  const dir = kind === "d";
  const name = dir ? "project" : "script.sh";
  const sym = toSym(mode);
  const oct = toOct(mode);

  const octErr = edit?.f === "oct" && !/^[0-7]{3}$/.test(edit.text) ? "Нужно ровно 3 цифры от 0 до 7." : "";
  const symErr = edit?.f === "sym" && parseSym(edit.text) === null ? "Нужно 9 символов: r, w, x или «-», например rwxr-xr-x." : "";

  function onOct(v: string) {
    setEdit({ f: "oct", text: v });
    if (/^[0-7]{3}$/.test(v)) setMode(parseInt(v, 8));
  }
  function onSym(v: string) {
    setEdit({ f: "sym", text: v });
    const m = parseSym(v);
    if (m !== null) setMode(m);
  }
  function runCmd(e: React.FormEvent) {
    e.preventDefault();
    const m = applyCmd(mode, cmd);
    if (m === null) setCmdMsg({ ok: false, text: "Не понял команду. Формат: кому (u, g, o, a) + действие (+, −, =) + права (r, w, x), например g+w или u=rwx,o-rwx." });
    else {
      setMode(m);
      setCmdMsg({ ok: true, text: `Готово: теперь ${toOct(m)} (${toSym(m)}).` });
    }
  }

  function answer(q: Q, given: string) {
    if (!quiz || quiz.ok !== null) return;
    const ok = given.trim() === q.correct;
    setQuiz({ ...quiz, picked: given, ok, score: quiz.score + (ok ? 1 : 0) });
  }
  function next() {
    if (!quiz) return;
    if (quiz.i + 1 >= quiz.qs.length) {
      setQuiz({ ...quiz, done: true });
      if (quiz.score >= PASS && !solved) solve();
    } else {
      setQuiz({ ...quiz, i: quiz.i + 1, picked: null, ok: null });
      setAns("");
    }
  }
  const q = quiz && !quiz.done ? quiz.qs[quiz.i] : null;

  return (
    <WidgetFrame
      title="Права доступа chmod"
      hint="Для каждого файла Linux хранит три набора прав: для владельца, группы и всех остальных. Каждый набор — три бита r (4), w (2), x (1); их сумма даёт цифру в octal."
      solved={solved}
    >
      <Seg
        label="Режим"
        value={tab}
        onChange={setTab}
        options={[
          { value: "play", label: "Песочница" },
          { value: "quiz", label: "Тренажёр" },
        ]}
      />

      {tab === "play" && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Seg
              label="Тип объекта"
              value={kind}
              onChange={setKind}
              options={[
                { value: "-", label: "Файл" },
                { value: "d", label: "Каталог" },
              ]}
            />
          </div>

          <fieldset className="rounded-[14px] border border-line bg-paper p-3">
            <legend className="px-1 text-[13px] text-muted">Права</legend>
            <div className="grid grid-cols-[1fr_repeat(3,minmax(44px,60px))_28px] items-center gap-x-1 gap-y-1 text-center">
              <span />
              {["r", "w", "x"].map((l, i) => (
                <span key={l} className="mono text-[13px] font-semibold" title={["чтение", "запись", dir ? "вход" : "выполнение"][i]}>
                  {l}
                  <span className="block text-[10px] font-normal text-muted">{R[i] / R[2]}</span>
                </span>
              ))}
              <span className="text-[11px] text-muted">=</span>
              {CLASSES.map((c, ci) => (
                <div key={c.key} className="contents">
                  <span className="text-left text-[14px]">
                    {c.name} <span className="mono text-[12px] text-muted">({c.key})</span>
                  </span>
                  {[0, 1, 2].map((bi) => {
                    const bit = R[ci * 3 + bi];
                    const on = (mode & bit) !== 0;
                    return (
                      <label key={bi} className={`mx-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border transition-colors ${on ? "border-accent bg-accent/15" : "border-line bg-card"}`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() => setMode((m) => m ^ bit)}
                          aria-label={`${c.name}: ${["чтение", "запись", dir ? "вход в каталог" : "выполнение"][bi]}`}
                        />
                        <span aria-hidden className={`mono text-[16px] font-bold ${on ? "text-accent" : "text-muted/50"}`}>
                          {on ? "rwx"[bi] : "-"}
                        </span>
                      </label>
                    );
                  })}
                  <span className="mono text-[16px] font-semibold text-accent">{digit(mode, ci)}</span>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cm-oct">
                Octal
              </label>
              <input id="cm-oct" className="input mono mt-1" inputMode="numeric" maxLength={4} value={edit?.f === "oct" ? edit.text : oct} onChange={(e) => onOct(e.target.value)} onBlur={() => setEdit(null)} aria-invalid={!!octErr} autoComplete="off" />
              <p aria-live="polite" className="min-h-5 pt-1 text-[13px] text-bad">
                {octErr}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="cm-sym">
                Символьная запись
              </label>
              <input id="cm-sym" className="input mono mt-1" maxLength={9} value={edit?.f === "sym" ? edit.text : sym} onChange={(e) => onSym(e.target.value)} onBlur={() => setEdit(null)} aria-invalid={!!symErr} autoComplete="off" spellCheck={false} />
              <p aria-live="polite" className="min-h-5 pt-1 text-[13px] text-bad">
                {symErr}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="label">Как это выглядит в терминале</span>
              <CopyBtn text={`chmod ${oct} ${name}`} label="Копировать команду" />
            </div>
            <div className="scroll-x rounded-[10px] p-3 mono text-[13px] leading-relaxed" style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}>
              <div className="whitespace-pre">
                <span style={{ opacity: 0.6 }}>$ </span>chmod {oct} {name}
              </div>
              <div className="whitespace-pre">
                <span style={{ opacity: 0.6 }}>$ </span>ls -l {name}
              </div>
              <div className="whitespace-pre">
                {kind}
                {sym} {dir ? 2 : 1} student student {dir ? "4096" : "1280"} Oct 23 10:14 {name}
              </div>
            </div>
            <p className="mt-1 text-[12px] text-muted">Первый символ — тип: «-» обычный файл, «d» каталог. Затем три тройки прав: u, g, o.</p>
          </div>

          <div aria-live="polite" className="rounded-[10px] border border-line p-3">
            <h4 className="font-display text-[14px] font-semibold">Кто что может</h4>
            <ul className="mt-1 space-y-1 text-[14px]">
              {CLASSES.map((c, ci) => {
                const a = actions(digit(mode, ci), dir);
                return (
                  <li key={c.key}>
                    <b>{c.name}</b>: {a.length ? a.join(", ") : "ничего не может"}.
                  </li>
                );
              })}
            </ul>
            {(mode & 2) !== 0 && (
              <p className="mt-2 text-[13px] font-medium text-bad">Запись разрешена всем: любой пользователь системы может это изменить. Так делать нельзя.</p>
            )}
          </div>

          <form onSubmit={runCmd}>
            <label className="label" htmlFor="cm-cmd">
              Символьная команда (как в chmod u+x)
            </label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input id="cm-cmd" className="input mono" value={cmd} onChange={(e) => setCmd(e.target.value)} autoComplete="off" spellCheck={false} placeholder="u+x,g-w,o=r" />
              <button type="submit" className="btn btn-primary">
                Применить
              </button>
            </div>
            <p aria-live="polite" className={`mt-1 min-h-5 text-[13px] ${cmdMsg?.ok ? "text-ok" : "text-bad"}`}>
              {cmdMsg?.text}
            </p>
          </form>
        </div>
      )}

      {tab === "quiz" && (
        <div className="mt-4">
          {!quiz && (
            <div>
              <p className="mb-3 text-[14px] text-muted">
                {ROUNDS} вопросов: перевод между octal и символьной записью, разбор прав. Нужно {PASS} верных ответов.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => { setQuiz(makeQuiz()); setAns(""); }}>
                <IconTrophy size={16} /> Начать
              </button>
            </div>
          )}

          {quiz && q && (
            <div>
              <div className="mb-2 flex items-center justify-between text-[13px] text-muted">
                <span>
                  Вопрос {quiz.i + 1} из {ROUNDS}
                </span>
                <span>Верно: {quiz.score}</span>
              </div>
              <motion.div key={quiz.i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <p className="font-display text-[18px] font-semibold">
                  {q.type === 0 && (
                    <>
                      Дай octal для <span className="mono text-accent">{toSym(q.mode)}</span>
                    </>
                  )}
                  {q.type === 1 && (
                    <>
                      Что значит <span className="mono text-accent">{toOct(q.mode)}</span>?
                    </>
                  )}
                  {q.type === 2 && (
                    <>
                      Какие права у <span className="mono text-accent">{toOct(q.mode)}</span> в символьной записи?
                    </>
                  )}
                </p>
              </motion.div>

              {q.type === 0 ? (
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (quiz.ok === null) answer(q, ans);
                    else next();
                  }}
                >
                  <motion.div className="flex-1" animate={quiz.ok === false ? shake : undefined}>
                    <input className="input mono" aria-label="Ответ в octal" inputMode="numeric" maxLength={4} value={ans} onChange={(e) => setAns(e.target.value)} readOnly={quiz.ok !== null} autoComplete="off" autoFocus placeholder="например 644" />
                  </motion.div>
                  <button type="submit" className="btn btn-primary" disabled={quiz.ok === null && !ans.trim()}>
                    {quiz.ok === null ? "Проверить" : quiz.i + 1 >= ROUNDS ? "Итог" : "Дальше"}
                  </button>
                </form>
              ) : (
                <div className="mt-3 grid gap-2" role="group" aria-label="Варианты ответа">
                  {q.options.map((o) => {
                    const isCorrect = quiz.ok !== null && o === q.correct;
                    const isWrong = quiz.ok === false && o === quiz.picked;
                    return (
                      <button
                        key={o}
                        type="button"
                        disabled={quiz.ok !== null}
                        onClick={() => answer(q, o)}
                        className={`flex min-h-[48px] items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-[14px] transition-colors disabled:cursor-default ${
                          isCorrect ? "border-ok bg-ok/15" : isWrong ? "border-bad bg-bad/10" : "border-line bg-card hover:border-muted"
                        } ${q.type === 2 ? "mono" : ""}`}
                      >
                        <span className="min-w-0 flex-1">{o}</span>
                        {isCorrect && <IconCheck size={18} className="text-ok" />}
                        {isWrong && <IconX size={18} className="text-bad" />}
                      </button>
                    );
                  })}
                  {quiz.ok !== null && (
                    <button type="button" className="btn btn-primary" onClick={next} autoFocus>
                      {quiz.i + 1 >= ROUNDS ? "Итог" : "Дальше"}
                    </button>
                  )}
                </div>
              )}

              <div aria-live="polite" className="mt-3 min-h-6 text-[14px]">
                {quiz.ok === true && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-ok">
                    <DrawCheck size={18} /> Верно!
                  </span>
                )}
                {quiz.ok === false && (
                  <span className="text-bad">
                    Неверно. Правильный ответ: <span className="mono font-semibold">{q.correct}</span>
                  </span>
                )}
                {quiz.ok !== null && (
                  <p className="mt-1 text-muted">
                    {toOct(q.mode)} = {[0, 1, 2].map((c) => `${digit(q.mode, c)} (${toSym(q.mode).slice(c * 3, c * 3 + 3)})`).join(", ")}: по цифре на владельца, группу и остальных.
                  </p>
                )}
              </div>
            </div>
          )}

          {quiz?.done && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[14px] border border-line bg-paper p-4">
              <p className="font-display text-[20px] font-semibold">
                {quiz.score} из {ROUNDS}
              </p>
              <p className="mt-1 text-[14px] text-muted">{quiz.score >= PASS ? "Отлично, задание засчитано." : `Нужно минимум ${PASS} верных. Потренируйся в песочнице и попробуй снова.`}</p>
              <button type="button" className="btn mt-3" onClick={() => { setQuiz(makeQuiz()); setAns(""); }}>
                <IconReset size={16} /> Ещё раз
              </button>
            </motion.div>
          )}
        </div>
      )}

      <div className="mt-5">
        <Callout title="Запомни">
          <b>755</b> — скрипты и каталоги (владелец всё, остальные читают и запускают), <b>644</b> — обычные файлы,{" "}
          <b>600</b> — секреты вроде SSH-ключей. <b>777</b> почти всегда ошибка.
        </Callout>
      </div>
    </WidgetFrame>
  );
}
