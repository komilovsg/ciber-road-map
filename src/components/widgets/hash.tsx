"use client";
import { useEffect, useState } from "react";
import { WidgetFrame } from "@/components/ui/frames";
import { toHex, utf8 } from "./_lib/bytes";
import { Callout, CopyBtn } from "./_lib/ui";

const ALGOS = ["SHA-1", "SHA-256", "SHA-512"] as const;
type Algo = (typeof ALGOS)[number];
type Snap = { input: string; h: Record<Algo, string> };
type State = { prev: Snap | null; cur: Snap | null };

const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
function diffBits(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += POP[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  return n;
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [text, setText] = useState("hello");
  const [salt, setSalt] = useState("x7Qp");
  const [useSalt, setUseSalt] = useState(false);
  const [state, setState] = useState<State>({ prev: null, cur: null });
  const [error, setError] = useState("");

  const input = useSalt ? salt + text : text;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      try {
        const data = utf8(input);
        const res = await Promise.all(ALGOS.map((a) => crypto.subtle.digest(a, data)));
        if (cancelled) return;
        const h = {} as Record<Algo, string>;
        ALGOS.forEach((a, i) => (h[a] = toHex(new Uint8Array(res[i]), "")));
        setError("");
        setState((s) => (s.cur?.input === input ? s : { prev: s.cur, cur: { input, h } }));
      } catch {
        if (!cancelled) setError("WebCrypto недоступен: открой страницу по HTTPS или с localhost.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input]);

  const { prev, cur } = state;
  const compare = prev && cur && prev.input !== cur.input ? prev : null;

  return (
    <WidgetFrame
      title="Хеш-функции"
      hint="Хеш — «отпечаток» данных фиксированной длины. Обратно текст не восстановить, а малейшее изменение входа меняет отпечаток до неузнаваемости."
    >
      <div className="grid gap-3">
        <div>
          <label className="label" htmlFor="h-text">
            Текст
          </label>
          <input id="h-text" className="input mono mt-1" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} autoComplete="off" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Примеры для лавинного эффекта:</span>
            {["hello", "hellp", "Hello"].map((s) => (
              <button key={s} type="button" className="btn btn-sm mono" onClick={() => setText(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[10px] border border-line bg-paper p-3">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={useSalt} onChange={(e) => setUseSalt(e.target.checked)} />
            Добавить соль: хешируем «соль + текст»
          </label>
          {useSalt && (
            <div className="mt-2">
              <label className="label" htmlFor="h-salt">
                Соль
              </label>
              <input id="h-salt" className="input mono mt-1" value={salt} onChange={(e) => setSalt(e.target.value)} spellCheck={false} autoComplete="off" />
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-[14px] text-bad">{error}</p>}

      <div className="mt-4 space-y-3" aria-live="polite">
        {ALGOS.map((a) => {
          const hv = cur?.h[a] ?? "";
          const pv = compare?.h[a];
          const nb = pv && hv ? diffBits(hv, pv) : 0;
          const total = hv.length * 4;
          return (
            <div key={a} className="rounded-[10px] border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-[14px] font-semibold">
                  {a} <span className="text-[12px] font-normal text-muted">· {a === "SHA-1" ? 160 : a === "SHA-256" ? 256 : 512} бит</span>
                </span>
                <CopyBtn text={hv} />
              </div>
              <p className="mono mt-1 break-all text-[13px] leading-relaxed">
                {hv
                  ? Array.from(hv).map((c, i) =>
                      pv && pv[i] !== c ? (
                        <span key={i} className="rounded-sm bg-accent/25 font-bold text-accent underline decoration-accent/60">
                          {c}
                        </span>
                      ) : (
                        <span key={i}>{c}</span>
                      ),
                    )
                  : "вычисляю…"}
              </p>
              {pv && hv && (
                <p className="mt-1 text-[12px] text-muted">
                  Отличается {nb} из {total} бит — <b className="text-ink">{Math.round((nb / total) * 100)}%</b> (у хорошей функции около 50%).
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[13px] text-muted" aria-live="polite">
        {compare && cur ? (
          <>
            Сравнение: <span className="mono">«{compare.input}»</span> → <span className="mono">«{cur.input}»</span>. Выделены символы, которые изменились.
          </>
        ) : (
          "Измени текст — под хешем появится сравнение с предыдущим значением."
        )}
      </p>

      <div className="mt-4 grid gap-3">
        <Callout tone="warn" title="MD5 и SHA-1 сломаны">
          Для них научились строить <b>коллизии</b> — два разных файла с одинаковым хешем. Поэтому ими нельзя подписывать
          документы и сертификаты. SHA-1 оставлен тут для сравнения: используй SHA-256 и выше.
        </Callout>
        <Callout title="Зачем соль">
          Одинаковые пароли дают одинаковые хеши, и по готовой таблице («радужной») их находят мгновенно. Случайная соль
          у каждого пользователя делает хеши разными и заставляет перебирать каждый пароль отдельно. Для паролей, впрочем,
          нужны специальные медленные функции: bcrypt, scrypt, Argon2.
        </Callout>
      </div>
    </WidgetFrame>
  );
}
