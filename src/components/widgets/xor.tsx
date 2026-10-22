"use client";
import { useMemo, useState } from "react";
import { WidgetFrame } from "@/components/ui/frames";
import { fromUtf8, parseHex, printable, toBin, toHex, utf8 } from "./_lib/bytes";
import { Callout, CopyBtn, Seg } from "./_lib/ui";

type Mode = "text" | "hex";
const MAX_ROWS = 8;

function toBytes(s: string, mode: Mode): Uint8Array | null {
  return mode === "text" ? utf8(s) : parseHex(s);
}

function Bits({ value, other, hi, tone }: { value: number; other?: number; hi?: boolean; tone: string }) {
  return (
    <span className="inline-flex gap-[2px]" aria-hidden>
      {toBin(value)
        .split("")
        .map((b, i) => {
          const marked = hi && b === "1";
          const diff = other !== undefined && b !== toBin(other)[i];
          return (
            <span
              key={i}
              className={`mono inline-flex h-[22px] w-[15px] items-center justify-center rounded-[4px] text-[12px] sm:h-[24px] sm:w-[17px] ${
                marked ? "bg-accent font-bold text-[var(--accent-ink)]" : `${tone} ${b === "1" ? "font-semibold" : "text-muted"}`
              } ${diff && !hi ? "ring-1 ring-accent/60" : ""}`}
            >
              {b}
            </span>
          );
        })}
    </span>
  );
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [mode, setMode] = useState<Mode>("text");
  const [data, setData] = useState("Hello");
  const [key, setKey] = useState("K");
  const [demo, setDemo] = useState(false);

  const d = useMemo(() => toBytes(data, mode), [data, mode]);
  const k = useMemo(() => toBytes(key, mode), [key, mode]);

  const result = useMemo(() => {
    if (!d || !k || k.length === 0) return null;
    return d.map((x, i) => x ^ k[i % k.length]);
  }, [d, k]);
  const back = useMemo(() => (result && k ? result.map((x, i) => x ^ k[i % k.length]) : null), [result, k]);

  function switchMode(m: Mode) {
    if (m === mode) return;
    const conv = (s: string) => {
      if (m === "hex") return toHex(utf8(s));
      const b = parseHex(s);
      if (!b) return s;
      try {
        return fromUtf8(b, true);
      } catch {
        return s;
      }
    };
    setData(conv(data));
    setKey(conv(key));
    setMode(m);
  }

  const err = (v: Uint8Array | null, what: string) =>
    v === null ? `${what}: ожидаются пары hex-цифр, например 48 65 6c.` : null;
  const dataErr = err(d, "Данные");
  const keyErr = err(k, "Ключ") ?? (k && k.length === 0 ? "Ключ не должен быть пустым." : null);
  const rows = result && d && k ? Array.from({ length: Math.min(MAX_ROWS, d.length) }, (_, i) => i) : [];

  return (
    <WidgetFrame
      title="XOR: побитовое «исключающее ИЛИ»"
      hint="XOR выдаёт 1, когда два бита различаются, и 0, когда совпадают. Применишь один и тот же ключ дважды — получишь исходные данные."
    >
      <Seg
        label="Формат ввода"
        value={mode}
        onChange={switchMode}
        options={[
          { value: "text", label: "Текст" },
          { value: "hex", label: "Hex-байты" },
        ]}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="xor-data">
            Данные
          </label>
          <input id="xor-data" className="input mono mt-1" value={data} onChange={(e) => setData(e.target.value)} spellCheck={false} autoComplete="off" aria-invalid={!!dataErr} />
          <p aria-live="polite" className="min-h-5 pt-1 text-[13px] text-bad">
            {dataErr}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="xor-key">
            Ключ (повторяется по кругу)
          </label>
          <input id="xor-key" className="input mono mt-1" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} autoComplete="off" aria-invalid={!!keyErr} />
          <p aria-live="polite" className="min-h-5 pt-1 text-[13px] text-bad">
            {keyErr}
          </p>
        </div>
      </div>

      {result && d && k && (
        <>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
            <span>
              <span className="mono mr-1 rounded bg-card px-1 text-ink ring-1 ring-line">D</span>данные
            </span>
            <span>
              <span className="mono mr-1 rounded bg-card px-1 text-ink ring-1 ring-line">K</span>ключ
            </span>
            <span>
              <span className="mono mr-1 rounded bg-accent px-1 text-[var(--accent-ink)]">1</span>= биты различались
            </span>
          </div>
          <div className="mt-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(176px,1fr))]">
            {rows.map((i) => {
              const dv = d[i];
              const kv = k[i % k.length];
              const rv = result[i];
              return (
                <div key={i} className="rounded-[10px] border border-line bg-paper p-2" role="group" aria-label={`Байт ${i + 1}: ${toBin(dv)} xor ${toBin(kv)} = ${toBin(rv)}`}>
                  <div className="mono mb-1 flex justify-between text-[11px] text-muted">
                    <span>байт {i + 1}</span>
                    <span>
                      {dv.toString(16).padStart(2, "0")} ⊕ {kv.toString(16).padStart(2, "0")} = {rv.toString(16).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="space-y-[3px]">
                    <div className="flex items-center gap-1.5">
                      <span className="mono w-3 text-[11px] text-muted">D</span>
                      <Bits value={dv} other={kv} tone="bg-card" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="mono w-3 text-[11px] text-muted">K</span>
                      <Bits value={kv} other={dv} tone="bg-card" />
                    </div>
                    <div className="flex items-center gap-1.5 border-t border-line pt-[3px]">
                      <span className="mono w-3 text-[11px] text-muted">=</span>
                      <Bits value={rv} hi tone="bg-card" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {d.length > MAX_ROWS && <p className="mt-2 text-[13px] text-muted">…ещё {d.length - MAX_ROWS} байт (в таблице показаны первые {MAX_ROWS}).</p>}

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="label">Результат, hex</span>
                <CopyBtn text={toHex(result)} />
              </div>
              <p aria-live="polite" className="mono scroll-x mt-1 whitespace-pre rounded-[10px] border border-line bg-paper p-3 text-[14px]">
                {toHex(result) || "—"}
              </p>
            </div>
            <div>
              <span className="label">Результат, текст (непечатные байты — точки)</span>
              <p className="mono scroll-x mt-1 whitespace-pre rounded-[10px] border border-line bg-paper p-3 text-[14px]">{printable(result) || "—"}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[14px] border border-line p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-display text-[15px] font-semibold">Демо: A ⊕ K ⊕ K = A</h4>
              <button type="button" className="btn btn-sm" aria-expanded={demo} onClick={() => setDemo((v) => !v)}>
                {demo ? "Скрыть" : "Применить ключ ещё раз"}
              </button>
            </div>
            {demo && back && (
              <div aria-live="polite" className="mt-3 space-y-1 text-[14px]">
                <p>
                  Результат ⊕ ключ → <span className="mono break-all">{toHex(back)}</span>
                </p>
                <p>
                  Как текст: <span className="mono break-all font-semibold">{fromUtf8(back) || "—"}</span>
                </p>
                <p className={back.length === d.length && back.every((x, i) => x === d[i]) ? "font-medium text-ok" : "text-bad"}>
                  {back.every((x, i) => x === d[i]) ? "Совпадает с исходными данными: XOR обратим тем же ключом." : "Не совпало с исходными данными."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-4">
        <Callout title="Где это встречается">
          XOR лежит в основе потоковых шифров и одноразового блокнота. Если ключ короткий и повторяется, как здесь, шифр
          ломается: зная часть открытого текста, получаешь ключ — <b>K = результат ⊕ данные</b>. А вот случайный ключ длиной
          с сообщение, использованный один раз, взломать нельзя.
        </Callout>
      </div>
    </WidgetFrame>
  );
}
