"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { WidgetFrame, shake } from "@/components/ui/frames";
import { IconArrowDown, IconArrowUp } from "@/icons";
import { StepControls } from "./_lib/stepper-controls";
import { useStepper } from "./_lib/use-stepper";

type NodeId = "browser" | "os" | "resolver" | "root" | "tld" | "auth";
const NODE_ORDER: NodeId[] = ["browser", "os", "resolver", "root", "tld", "auth"];

type Cache = "none" | "browser" | "resolver";
type Step = { from: NodeId; to: NodeId; kind: "query" | "response" | "check"; badge: string; title: string; text: string; sub: string };

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

function hashOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}
const fakeIp = (d: string) => `203.0.113.${(hashOf(d) % 250) + 1}`; // TEST-NET-3, reserved for documentation
const fakeIp6 = (d: string) => `2001:db8::${((hashOf(d) >>> 8) % 0xfff).toString(16)}`;

function buildSteps(domain: string, cache: Cache): Step[] {
  const labels = domain.split(".");
  const tld = labels[labels.length - 1];
  const zone = labels.slice(-2).join(".");
  const ip = fakeIp(domain);
  const steps: Step[] = [];
  const browserHit = cache === "browser";
  steps.push({
    from: "browser",
    to: "browser",
    kind: "check",
    badge: browserHit ? "кеш: попадание" : "кеш: промах",
    title: "Кеш браузера",
    sub: browserHit ? `нашёл ${ip}` : "проверяю свою память",
    text: browserHit
      ? `Браузер уже недавно открывал ${domain} и помнит адрес ${ip} (пока не истёк TTL). Сеть не нужна: ответ мгновенный.`
      : `Браузер сначала смотрит в собственный DNS-кеш. Записи для ${domain} нет, идём дальше.`,
  });
  if (browserHit) {
    steps.push({ from: "browser", to: "browser", kind: "response", badge: "готово", title: "Адрес получен из кеша", sub: ip, text: `Браузер сразу открывает TCP-соединение с ${ip}. Именно поэтому повторные заходы на сайт стартуют быстрее.` });
    return steps;
  }
  steps.push({
    from: "browser",
    to: "os",
    kind: "check",
    badge: "hosts + кеш ОС: промах",
    title: "Операционная система",
    sub: "файл hosts и кеш ОС",
    text: `Браузер просит ОС (stub resolver). Она смотрит файл hosts (на Linux /etc/hosts) и свой кеш. Записи для ${domain} нет. Кстати, именно hosts проверяется первым: вредонос может подменить там адрес банка.`,
  });
  steps.push({
    from: "os",
    to: "resolver",
    kind: "query",
    badge: `A? ${domain}`,
    title: "Запрос рекурсивному резолверу",
    sub: "UDP, порт 53",
    text: `ОС отправляет запрос «${domain} IN A?» рекурсивному резолверу: это сервер провайдера или публичный (например, 8.8.8.8, 1.1.1.1). Обычно запрос идёт по UDP на порт 53.`,
  });
  if (cache === "resolver") {
    steps.push({ from: "resolver", to: "resolver", kind: "check", badge: "кеш: попадание", title: "Кеш резолвера", sub: `нашёл ${ip}`, text: `Другой клиент недавно спрашивал то же самое, и резолвер запомнил ответ на время TTL. Корневой, TLD и авторитетный серверы не тревожим: так DNS выдерживает миллиарды запросов.` });
    steps.push({ from: "resolver", to: "browser", kind: "response", badge: `A ${ip}`, title: "Ответ клиенту", sub: ip, text: `Резолвер возвращает ${ip} через ОС в браузер. ОС и браузер тоже кладут ответ в кеш на время TTL.` });
    return steps;
  }
  steps.push({
    from: "resolver",
    to: "root",
    kind: "query",
    badge: `A? ${domain}`,
    title: "Резолвер → корневой сервер (.)",
    sub: "кеш пуст, начинаем с корня",
    text: `В кеше резолвера ответа нет (cache miss). Он спрашивает один из 13 адресов корневых серверов (a.root-servers.net … m.root-servers.net, их сотни физических копий). Корень не знает ${domain}, но знает, кто отвечает за зону .${tld}.`,
  });
  steps.push({
    from: "root",
    to: "resolver",
    kind: "response",
    badge: `NS .${tld}`,
    title: "Корень отвечает: «спроси TLD»",
    sub: `адреса серверов .${tld}`,
    text: `Корневой сервер отвечает «направлением» (referral): список NS-серверов зоны .${tld} с их IP-адресами (glue). Это не ответ, а подсказка, куда идти дальше.`,
  });
  steps.push({
    from: "resolver",
    to: "tld",
    kind: "query",
    badge: `A? ${domain}`,
    title: `Резолвер → TLD-сервер .${tld}`,
    sub: `зона .${tld}`,
    text: `Тот же вопрос уходит серверу зоны верхнего уровня .${tld} (TLD, top-level domain). Он ведёт список всех доменов второго уровня и их NS-серверов, но не IP-адреса сайтов.`,
  });
  steps.push({
    from: "tld",
    to: "resolver",
    kind: "response",
    badge: `NS ${zone}`,
    title: "TLD отвечает: «спроси владельца»",
    sub: `NS для ${zone}`,
    text: `TLD-сервер отвечает: за зону ${zone} отвечает, например, ns1.${zone}, вот его адрес. Эти NS-записи владелец домена задаёт у регистратора.`,
  });
  steps.push({
    from: "resolver",
    to: "auth",
    kind: "query",
    badge: `A? ${domain}`,
    title: "Резолвер → авторитетный сервер",
    sub: `ns1.${zone}`,
    text: `Теперь вопрос задаётся серверу, который хранит записи зоны ${zone} (authoritative name server). Только он знает настоящий ответ, остальные лишь указывали дорогу.`,
  });
  steps.push({
    from: "auth",
    to: "resolver",
    kind: "response",
    badge: `A ${ip} TTL 300`,
    title: "Авторитетный ответ: A-запись",
    sub: `${ip}, TTL 300 с`,
    text: `Ответ: «${domain}. 300 IN A ${ip}». TTL = 300 секунд: столько резолвер может держать запись в кеше. (Адрес из диапазона 203.0.113.0/24, он зарезервирован для примеров и не принадлежит реальному сайту.)`,
  });
  steps.push({
    from: "resolver",
    to: "browser",
    kind: "response",
    badge: `A ${ip}`,
    title: "Ответ доходит до браузера и кешируется",
    sub: `кеш на ${300} с`,
    text: `Резолвер кеширует запись на TTL и отдаёт её клиенту. ОС и браузер тоже запоминают её. Теперь браузер знает IP и начинает TCP-рукопожатие с ${ip}:443. Весь DNS-обмен обычно занимает десятки миллисекунд.`,
  });
  return steps;
}

const NODE_META: Record<NodeId, { name: string; sub: string }> = {
  browser: { name: "Браузер", sub: "свой DNS-кеш" },
  os: { name: "ОС (stub resolver)", sub: "hosts и кеш ОС" },
  resolver: { name: "Рекурсивный резолвер", sub: "провайдер / 8.8.8.8" },
  root: { name: "Корневой сервер .", sub: "13 адресов, сотни копий" },
  tld: { name: "TLD-сервер", sub: "зона верхнего уровня" },
  auth: { name: "Авторитетный NS", sub: "хранит записи домена" },
};

const ROW = 56; // card height 48 + gap 8
const CARD = 48;

function parseDomain(raw: string): string | null {
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  return DOMAIN_RE.test(d) ? d : null;
}

function recordExamples(domain: string) {
  const labels = domain.split(".");
  const zone = labels.slice(-2).join(".");
  const www = domain.startsWith("www.") ? domain : `www.${zone}`;
  return [
    { t: "A", rec: `${domain}.  300  IN  A  ${fakeIp(domain)}`, d: "A: адрес IPv4. Главная запись: имя → IP." },
    { t: "AAAA", rec: `${domain}.  300  IN  AAAA  ${fakeIp6(domain)}`, d: "AAAA: адрес IPv6 (128 бит). 2001:db8::/32 зарезервирован для примеров." },
    { t: "MX", rec: `${zone}.  3600  IN  MX  10 mail.${zone}.`, d: "MX: почтовый сервер домена; число (10) — приоритет, меньше = важнее." },
    { t: "NS", rec: `${zone}.  86400  IN  NS  ns1.${zone}.`, d: "NS: какие серверы авторитетны для зоны. Именно эти записи отдаёт TLD." },
    { t: "CNAME", rec: `${www}.  3600  IN  CNAME  ${zone}.`, d: "CNAME: псевдоним. Имя указывает на другое имя, а не на IP. На корне зоны CNAME ставить нельзя." },
    { t: "TXT", rec: `${zone}.  3600  IN  TXT  "v=spf1 mx -all"`, d: "TXT: произвольный текст; в нём живут SPF, DKIM, DMARC и проверки владения доменом." },
  ];
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [input, setInput] = useState("www.example.tj");
  const [active, setActive] = useState<string | null>(null);
  const [cache, setCache] = useState<Cache>("none");
  const [error, setError] = useState(false);
  const [rec, setRec] = useState("A");

  const steps = useMemo(() => (active ? buildSteps(active, cache) : []), [active, cache]);
  const st = useStepper(Math.max(steps.length - 1, 0), 2600);
  const cur = active ? steps[st.step] : null;

  const run = () => {
    const d = parseDomain(input);
    if (!d) {
      setError(true);
      return;
    }
    setError(false);
    setActive(d);
    st.reset();
  };
  const pickCache = (c: Cache) => {
    setCache(c);
    st.reset();
  };

  const shown = parseDomain(input) ?? active ?? "www.example.tj";
  const tld = shown.split(".").pop();
  const examples = recordExamples(shown);
  const ex = examples.find((e) => e.t === rec) ?? examples[0];

  const visited = new Set<NodeId>();
  if (cur) {
    for (let i = 0; i <= st.step; i++) {
      visited.add(steps[i].from);
      visited.add(steps[i].to);
    }
  }
  const done = !!cur && st.step === steps.length - 1;
  const fromIdx = cur ? NODE_ORDER.indexOf(cur.from) : 0;
  const toIdx = cur ? NODE_ORDER.indexOf(cur.to) : 0;
  const goesDown = toIdx > fromIdx;

  return (
    <WidgetFrame
      title="Как работает DNS"
      hint="DNS превращает имя сайта в IP-адрес. Введи домен и пройди весь путь запроса. Всё симуляция: адреса вымышленные."
    >
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <label className="block flex-1">
          <span className="label">Доменное имя</span>
          <motion.input
            animate={error ? shake : undefined}
            className="input mono w-full"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            aria-invalid={error}
            aria-describedby="dns-err"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={error ? { borderColor: "var(--bad)" } : undefined}
          />
        </label>
        <button type="submit" className="btn btn-primary">Разрешить</button>
      </form>
      <p id="dns-err" className="mt-1 min-h-5 text-sm text-bad" aria-live="polite">
        {error ? "Нужен корректный домен вида name.tld: буквы, цифры, дефис, минимум одна точка." : ""}
      </p>

      <div role="radiogroup" aria-label="Ответ уже в кеше" className="mb-4 flex flex-wrap items-center gap-2">
        <span className="label">Ответ уже в кеше:</span>
        {(
          [
            ["none", "нет"],
            ["browser", "в браузере"],
            ["resolver", "у резолвера"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={cache === k} className={`btn btn-sm ${cache === k ? "btn-primary" : ""}`} onClick={() => pickCache(k)}>
            {l}
          </button>
        ))}
      </div>

      {!cur && <div className="rounded-[10px] border border-dashed border-line p-4 text-[15px] text-muted">Нажми «Разрешить»: увидишь, кого и о чём спрашивает браузер, пока не получит IP-адрес для {shown}.</div>}

      {cur && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* diagram */}
          <div className="relative" style={{ height: NODE_ORDER.length * ROW - 8 }} aria-hidden={false}>
            <div className="absolute inset-y-0 right-8 w-0.5 rounded bg-line" aria-hidden />
            {NODE_ORDER.map((n, i) => {
              const isActive = cur.from === n || cur.to === n;
              const seen = visited.has(n);
              const meta = NODE_META[n];
              const name = n === "tld" ? `TLD-сервер .${tld}` : meta.name;
              return (
                <div
                  key={n}
                  className="absolute left-0 right-[4.5rem] flex flex-col justify-center rounded-[10px] border px-3 transition-colors duration-300"
                  style={{
                    top: i * ROW,
                    height: CARD,
                    borderColor: isActive ? "var(--accent)" : seen ? "color-mix(in srgb, var(--accent) 45%, var(--line))" : "var(--line)",
                    background: isActive ? "color-mix(in srgb, var(--accent) 14%, var(--card))" : "var(--card)",
                    boxShadow: isActive ? "0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)" : "none",
                  }}
                >
                  <div className="truncate text-[14px] font-semibold leading-tight">{name}</div>
                  <div className="truncate font-mono text-[11px] leading-tight text-muted">{cur.to === n || cur.from === n ? cur.sub && (cur.kind === "check" || cur.to === n ? cur.sub : meta.sub) : meta.sub}</div>
                </div>
              );
            })}
            {/* packet */}
            <motion.div
              key={`${st.step}-${active}`}
              className="absolute right-1 flex h-7 min-w-[3.6rem] max-w-[5.6rem] items-center justify-center gap-1 rounded-full px-2 font-mono text-[10px] font-bold text-white shadow"
              style={{ background: cur.kind === "response" ? "var(--ok)" : cur.kind === "query" ? "var(--accent)" : "var(--muted)" }}
              initial={{ top: fromIdx * ROW + (CARD - 28) / 2 }}
              animate={{ top: toIdx * ROW + (CARD - 28) / 2 }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            >
              {cur.from !== cur.to && (goesDown ? <IconArrowDown size={11} /> : <IconArrowUp size={11} />)}
              <span className="truncate">{cur.kind === "query" ? "запрос" : cur.kind === "response" ? "ответ" : "кеш"}</span>
            </motion.div>
          </div>

          {/* explanation + steps */}
          <div className="min-w-0 space-y-3">
            <div className="rounded-[10px] border border-line p-3 sm:p-4" aria-live="polite">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h4 className="font-display text-base font-semibold">{cur.title}</h4>
                <span className="chip font-mono">{cur.badge}</span>
              </div>
              <p className="text-[15px] leading-relaxed">{cur.text}</p>
              {done && (
                <p className="mt-3 rounded-lg bg-ok/15 px-3 py-2 text-sm font-medium text-ok">
                  Итог: {active} → {fakeIp(active!)}
                </p>
              )}
            </div>
            <ol className="space-y-1" aria-label="Шаги разрешения">
              {steps.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => st.goto(i)}
                    aria-current={i === st.step ? "step" : undefined}
                    className={`flex min-h-[36px] w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition ${i === st.step ? "bg-accent/15 font-semibold text-ink" : i < st.step ? "text-ink" : "text-muted"} hover:bg-paper`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[11px] ${i <= st.step ? "bg-accent text-white" : "border border-line"}`}>{i + 1}</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {cur && (
        <div className="mt-4">
          <StepControls step={st.step} last={st.last} playing={st.playing} onBack={st.back} onNext={st.next} onToggle={st.toggle} onReset={st.reset} />
        </div>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <div className="label mb-2">Типы записей для {shown}</div>
        <div role="radiogroup" aria-label="Тип DNS-записи" className="flex flex-wrap gap-1.5">
          {examples.map((e) => (
            <button key={e.t} type="button" role="radio" aria-checked={rec === e.t} onClick={() => setRec(e.t)} className={`btn btn-sm font-mono ${rec === e.t ? "btn-primary" : ""}`}>
              {e.t}
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-[10px]" style={{ background: "var(--code-bg)" }}>
          <pre className="scroll-x m-0 px-3 py-3 font-mono text-[13px]" style={{ color: "var(--code-ink)" }}><code>{ex.rec}</code></pre>
        </div>
        <p className="mt-2 text-sm text-muted" aria-live="polite">{ex.d}</p>
      </div>
    </WidgetFrame>
  );
}
