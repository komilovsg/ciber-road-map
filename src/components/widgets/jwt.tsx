"use client";
import { useEffect, useMemo, useState } from "react";
import { WidgetFrame, DrawCheck } from "@/components/ui/frames";
import { IconWarn, IconX, IconLock, IconBulb } from "@/icons";
import { b64urlEncode, hmacSign, hmacVerify, parseJwt } from "./_lib/jwt-utils";

const SAMPLE_HEADER = '{"alg":"HS256","typ":"JWT"}';
const SAMPLE_PAYLOAD = '{"sub":"1042","name":"Алиса","role":"user","iat":1700000000}';
const SAMPLE_SECRET = "secret123";

type Verdict = { kind: "valid" } | { kind: "invalid"; why: string } | null;

const PART = {
  header: { label: "HEADER", color: "#e5484d", deco: "underline" as const },
  payload: { label: "PAYLOAD", color: "#a371f7", deco: "underline dotted" as const },
  sig: { label: "SIGNATURE", color: "#4c8dff", deco: "underline dashed" as const },
};

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState(SAMPLE_SECRET);
  const [draft, setDraft] = useState(""); // editable payload text
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [none, setNone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => parseJwt(token), [token]);
  const draftErr = useMemo(() => {
    if (!draft) return null;
    try {
      const o = JSON.parse(draft);
      return typeof o === "object" && o && !Array.isArray(o) ? null : "Payload должен быть JSON-объектом.";
    } catch {
      return "Невалидный JSON: токен не обновлён.";
    }
  }, [draft]);

  const verify = async (tok: string, sec: string) => {
    const p = parseJwt(tok);
    if (!p.ok) return setVerdict({ kind: "invalid", why: p.error });
    if (p.header.alg !== "HS256") return setVerdict({ kind: "invalid", why: `Алгоритм «${String(p.header.alg)}» не принимается: сервер ожидает только HS256.` });
    const ok = await hmacVerify(`${p.h}.${p.p}`, p.s, sec);
    setVerdict(ok ? { kind: "valid" } : { kind: "invalid", why: "HMAC от header.payload с этим секретом не совпадает с подписью в токене." });
  };

  // Build the sample token once on mount via WebCrypto.
  useEffect(() => {
    let alive = true;
    (async () => {
      const hp = `${b64urlEncode(SAMPLE_HEADER)}.${b64urlEncode(SAMPLE_PAYLOAD)}`;
      const sig = await hmacSign(hp, SAMPLE_SECRET);
      if (!alive) return;
      setToken(`${hp}.${sig}`);
      setDraft(JSON.stringify(JSON.parse(SAMPLE_PAYLOAD), null, 2));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onToken = (v: string) => {
    setToken(v);
    setVerdict(null);
    setNone(null);
    const p = parseJwt(v);
    if (p.ok) setDraft(JSON.stringify(p.payload, null, 2));
  };

  /** Replace payload with new JSON text, keep header and OLD signature. */
  const applyPayload = (text: string) => {
    setDraft(text);
    setNone(null);
    if (!parsed.ok) return;
    let obj: unknown;
    try {
      obj = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof obj !== "object" || !obj || Array.isArray(obj)) return;
    const next = `${parsed.h}.${b64urlEncode(JSON.stringify(obj))}.${parsed.s}`;
    setToken(next);
    void verify(next, secret);
  };

  const tamper = () => {
    if (!parsed.ok) return;
    applyPayload(JSON.stringify({ ...parsed.payload, role: "admin" }, null, 2));
  };

  const resign = async () => {
    if (!parsed.ok) return;
    setBusy(true);
    const hp = `${parsed.h}.${parsed.p}`;
    const sig = await hmacSign(hp, secret);
    const next = `${hp}.${sig}`;
    setToken(next);
    setNone(null);
    await verify(next, secret);
    setBusy(false);
  };

  const noneAttack = () => {
    if (!parsed.ok) return;
    const h = b64urlEncode(JSON.stringify({ ...parsed.header, alg: "none" }));
    setNone(`${h}.${parsed.p}.`);
  };

  const reset = async () => {
    const hp = `${b64urlEncode(SAMPLE_HEADER)}.${b64urlEncode(SAMPLE_PAYLOAD)}`;
    const next = `${hp}.${await hmacSign(hp, SAMPLE_SECRET)}`;
    setSecret(SAMPLE_SECRET);
    onToken(next);
  };

  const parts = parsed.ok ? ([["header", parsed.h], ["payload", parsed.p], ["sig", parsed.s]] as const) : null;

  return (
    <WidgetFrame
      title="JWT: токен, подпись, подделка"
      hint="Всё считается в браузере через WebCrypto. Секрет учебный, ничего никуда не отправляется."
    >
      <label className="label" htmlFor="jwt-token">Токен</label>
      <textarea id="jwt-token" className="input mono mt-1 w-full break-all" rows={4} spellCheck={false} value={token} onChange={(e) => onToken(e.target.value)} placeholder={token ? "" : "Считаю подпись образца…"} />

      {parts ? (
        <div className="mt-3">
          <p className="label mb-1">Три части токена (цвет + подпись + стиль линии)</p>
          <p className="break-all font-mono text-[13px] leading-loose" aria-label="Токен по частям">
            {parts.map(([k, v], i) => (
              <span key={k}>
                <span className="inline-block">
                  <span className="mr-1 rounded px-1 text-[10px] font-bold text-white" style={{ background: PART[k].color }}>{PART[k].label}</span>
                  <span style={{ color: PART[k].color, textDecoration: PART[k].deco, textUnderlineOffset: 3 }}>{v || "(пусто)"}</span>
                </span>
                {i < 2 && <span className="mx-0.5 font-bold text-muted">.</span>}
              </span>
            ))}
          </p>
        </div>
      ) : draft === "" ? (
        <p className="mt-3 text-sm text-muted">Считаю подпись образца…</p>
      ) : (
        <p role="alert" className="mt-3 flex gap-2 rounded-[10px] border border-bad bg-bad/10 p-3 text-sm text-bad">
          <IconWarn className="mt-0.5 shrink-0" /> {parsed.ok ? "" : parsed.error}
        </p>
      )}

      {parsed.ok && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="min-w-0">
            <p className="label mb-1" style={{ color: PART.header.color }}>Header (декодирован)</p>
            <pre className="scroll-x rounded-[10px] p-3 font-mono text-[12.5px]" style={{ background: "var(--code-bg)", color: "var(--code-ink)" }}>{JSON.stringify(parsed.header, null, 2)}</pre>
          </div>
          <div className="min-w-0">
            <label className="label mb-1 block" htmlFor="jwt-payload" style={{ color: PART.payload.color }}>Payload (можно править)</label>
            <textarea id="jwt-payload" className="input mono w-full text-[12.5px]" rows={7} spellCheck={false} value={draft} onChange={(e) => applyPayload(e.target.value)} aria-invalid={!!draftErr} />
            {draftErr && <p role="alert" className="mt-1 text-xs text-bad">{draftErr}</p>}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1">
          <label className="label" htmlFor="jwt-secret">Секрет сервера</label>
          <input id="jwt-secret" className="input mono mt-1 w-full" value={secret} spellCheck={false} onChange={(e) => { setSecret(e.target.value); setVerdict(null); }} />
        </div>
        <button type="button" className="btn btn-primary" disabled={!parsed.ok} onClick={() => void verify(token, secret)}>
          <IconLock size={16} /> Проверить подпись
        </button>
        <button type="button" className="btn" disabled={!parsed.ok || busy} onClick={() => void resign()}>
          Подписать заново с секретом
        </button>
      </div>

      <div aria-live="polite" className="mt-3 min-h-[2.5rem]">
        {verdict?.kind === "valid" && (
          <p className="flex items-center gap-2 rounded-[10px] bg-ok/15 p-3 font-semibold text-ok"><DrawCheck /> подпись действительна: токен выпущен владельцем секрета и не менялся</p>
        )}
        {verdict?.kind === "invalid" && (
          <div className="rounded-[10px] bg-bad/10 p-3">
            <p className="flex items-center gap-2 font-semibold text-bad"><IconX /> подпись недействительна</p>
            <p className="mt-1 text-sm text-muted">{verdict.why}</p>
          </div>
        )}
      </div>

      <p className="label mb-1 mt-3">Атаки на токен</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-ghost" disabled={!parsed.ok} onClick={tamper}>
          Подделать: role = admin
        </button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={!parsed.ok} onClick={noneAttack}>
          Попробовать alg: none
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void reset()}>Вернуть образец</button>
      </div>
      {none && (
        <div className="mt-3 rounded-[10px] border border-line p-3 text-sm">
          <p className="label mb-1">Токен без подписи (alg: none)</p>
          <code className="scroll-x block whitespace-pre-wrap break-all font-mono text-[12px]">{none}</code>
          <p className="mt-2 flex items-center gap-2 font-semibold text-ok"><IconX className="text-bad" /> сервер: отклонён</p>
          <p className="mt-1 text-muted">
            Идея атаки: заменить алгоритм на «none» и убрать подпись в надежде, что сервер поверит. Правильный сервер не берёт алгоритм из токена, а жёстко ждёт свой (например, HS256), и пустую подпись не принимает.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-[14px] border border-line bg-paper p-4 text-sm">
        <p className="mb-1 flex items-center gap-2 font-semibold"><IconBulb className="text-accent" /> Главное про JWT</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>JWT подписан, но не зашифрован: payload — это просто base64url, его прочтёт кто угодно. Секретов (паролей) внутри быть не должно.</li>
          <li>Подпись защищает от изменения: правка payload ломает HMAC, а пересчитать его без секрета нельзя.</li>
          <li>Секрет должен быть длинным и случайным (слабый секрет подбирают перебором), алгоритм фиксируется на сервере, у токена есть срок жизни <code className="font-mono">exp</code>.</li>
        </ul>
      </div>
    </WidgetFrame>
  );
}
