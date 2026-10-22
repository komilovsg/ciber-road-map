"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WidgetFrame } from "@/components/ui/frames";
import { StepControls } from "./_lib/stepper-controls";
import { useStepper } from "./_lib/use-stepper";

type Flag = "SYN" | "ACK" | "PSH" | "FIN";
type HStep = {
  dir: "c2s" | "s2c" | null;
  label: string;
  flags: Flag[];
  client: string;
  server: string;
  title: string;
  text: string;
};

const STEPS: HStep[] = [
  {
    dir: null,
    label: "",
    flags: [],
    client: "CLOSED",
    server: "LISTEN",
    title: "Исходное состояние",
    text: "Сервер заранее открыл порт (например, 80) и ждёт подключений: состояние LISTEN. Клиент ещё ни с кем не связан: CLOSED. Нажми «Далее».",
  },
  {
    dir: "c2s",
    label: "SYN seq=x",
    flags: ["SYN"],
    client: "SYN_SENT",
    server: "SYN_RECEIVED",
    title: "1. SYN: «давай поговорим»",
    text: "Клиент выбирает случайный начальный номер последовательности x (ISN) и шлёт сегмент с флагом SYN. Данных пока нет. Сервер, получив SYN, переходит в SYN_RECEIVED.",
  },
  {
    dir: "s2c",
    label: "SYN-ACK seq=y ack=x+1",
    flags: ["SYN", "ACK"],
    client: "ESTABLISHED",
    server: "SYN_RECEIVED",
    title: "2. SYN-ACK: «слышу, давай»",
    text: "Сервер подтверждает SYN (ack = x+1: «жду от тебя байт x+1») и сам предлагает свой номер y с флагом SYN. Клиент получил ответ: для него соединение установлено.",
  },
  {
    dir: "c2s",
    label: "ACK ack=y+1",
    flags: ["ACK"],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    title: "3. ACK: «подтверждаю»",
    text: "Клиент подтверждает номер сервера (ack = y+1). Рукопожатие завершено: обе стороны ESTABLISHED, можно передавать данные. Именно поэтому его называют трёхсторонним (three-way handshake).",
  },
  {
    dir: "c2s",
    label: "GET / HTTP/1.1",
    flags: ["PSH", "ACK"],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    title: "4. Данные: HTTP-запрос",
    text: "Внутри TCP-сегмента едет прикладной протокол: HTTP-запрос «GET / HTTP/1.1». Флаг PSH просит сразу отдать данные приложению, не копя буфер. seq растёт на число отправленных байт.",
  },
  {
    dir: "s2c",
    label: "ACK ack=x+1+len",
    flags: ["ACK"],
    client: "ESTABLISHED",
    server: "ESTABLISHED",
    title: "5. ACK: данные получены",
    text: "Сервер подтверждает, что получил все байты запроса. Если ACK не пришёл, клиент отправит сегмент повторно (retransmission): так TCP обеспечивает надёжность. Следом сервер отправит HTTP-ответ.",
  },
  {
    dir: "c2s",
    label: "FIN, ACK",
    flags: ["FIN", "ACK"],
    client: "FIN_WAIT_1",
    server: "CLOSE_WAIT",
    title: "6. FIN: клиент закрывает",
    text: "Клиент закончил и шлёт FIN: «я больше ничего не отправлю». Сервер подтверждает и переходит в CLOSE_WAIT: ждёт, пока приложение дочитает и закроет сокет.",
  },
  {
    dir: "s2c",
    label: "FIN, ACK",
    flags: ["FIN", "ACK"],
    client: "TIME_WAIT",
    server: "LAST_ACK",
    title: "7. FIN от сервера",
    text: "Сервер тоже закрывает свою сторону. Здесь для краткости ACK и FIN объединены в один сегмент (часто так и бывает), поэтому FIN_WAIT_2 на схеме пропущен. Клиент уходит в TIME_WAIT.",
  },
  {
    dir: "c2s",
    label: "ACK",
    flags: ["ACK"],
    client: "TIME_WAIT",
    server: "CLOSED",
    title: "8. Последний ACK",
    text: "Клиент подтверждает FIN сервера, сервер переходит в CLOSED. Клиент ещё ~2×MSL (обычно 60 секунд) остаётся в TIME_WAIT, чтобы запоздавшие сегменты старого соединения не попали в новое.",
  },
];

const CX = 56;
const SX = 304;
const Y0 = 20;
const DY = 40;
const SLOPE = 26;

function FlagChips({ flags }: { flags: Flag[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {(["SYN", "ACK", "PSH", "FIN"] as Flag[]).map((f) => {
        const on = flags.includes(f);
        return (
          <span
            key={f}
            className={`rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${
              on ? "border-accent bg-accent/15 text-accent" : "border-line text-muted opacity-60"
            }`}
            aria-label={`${f}: ${on ? "установлен" : "сброшен"}`}
          >
            {f}
          </span>
        );
      })}
    </span>
  );
}

function StateCard({ who, state }: { who: string; state: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-[10px] border border-line bg-paper px-3 py-2">
      <div className="label">{who}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="truncate font-mono text-[13px] font-semibold text-accent sm:text-sm"
        >
          {state}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Handshake() {
  const st = useStepper(STEPS.length - 1, 2600);
  const cur = STEPS[st.step];
  const rows = STEPS.slice(1);
  const H = Y0 + rows.length * DY + 16;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <StateCard who="Клиент (браузер)" state={cur.client} />
        <StateCard who="Сервер :80" state={cur.server} />
      </div>

      <div className="rounded-[10px] border border-line bg-paper p-2">
        <svg viewBox={`0 0 360 ${H}`} className="block w-full" role="img" aria-label="Диаграмма обмена TCP-сегментами между клиентом и сервером">
          <defs>
            <marker id="tcp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="context-stroke" />
            </marker>
          </defs>
          {[CX, SX].map((x) => (
            <line key={x} x1={x} x2={x} y1={4} y2={H - 4} stroke="var(--line)" strokeWidth={2} strokeDasharray="4 4" />
          ))}
          <text x={CX} y={12} textAnchor="middle" fontSize={10} fill="var(--muted)">клиент</text>
          <text x={SX} y={12} textAnchor="middle" fontSize={10} fill="var(--muted)">сервер</text>
          {rows.map((r, i) => {
            const idx = i + 1;
            if (idx > st.step) return null;
            const active = idx === st.step;
            const x1 = r.dir === "c2s" ? CX : SX;
            const x2 = r.dir === "c2s" ? SX : CX;
            const y1 = Y0 + 8 + i * DY;
            const y2 = y1 + SLOPE;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const color = active ? "var(--accent)" : "var(--muted)";
            const lbl = r.label;
            const w = lbl.length * 6.3 + 12;
            return (
              <g key={idx} opacity={active ? 1 : 0.7}>
                <motion.line
                  x1={x1}
                  y1={y1}
                  x2={x2 + (r.dir === "c2s" ? -2 : 2)}
                  y2={y2}
                  stroke={color}
                  strokeWidth={2}
                  markerEnd="url(#tcp-arrow)"
                  initial={active ? { pathLength: 0 } : false}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <motion.g
                  initial={active ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: active ? 0.4 : 0, duration: 0.25 }}
                >
                  <rect x={mx - w / 2} y={my - 18} width={w} height={16} rx={5} fill="var(--card)" stroke="var(--line)" />
                  <text x={mx} y={my - 6.5} textAnchor="middle" fontSize={10.5} fill="var(--ink)" fontFamily="var(--font-jb), monospace" fontWeight={600}>
                    {lbl}
                  </text>
                </motion.g>
                {active && (
                  <motion.circle
                    key={`dot-${st.step}`}
                    r={6}
                    fill="var(--xp)"
                    stroke="var(--card)"
                    strokeWidth={2}
                    initial={{ cx: x1, cy: y1, opacity: 1 }}
                    animate={{ cx: x2, cy: y2, opacity: [1, 1, 0] }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rounded-[10px] border border-line p-3 sm:p-4" aria-live="polite">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h4 className="font-display text-base font-semibold">{cur.title}</h4>
          <FlagChips flags={cur.flags} />
        </div>
        <p className="text-[15px] leading-relaxed text-ink">{cur.text}</p>
      </div>

      <StepControls
        step={st.step}
        last={st.last}
        playing={st.playing}
        onBack={st.back}
        onNext={st.next}
        onToggle={st.toggle}
        onReset={st.reset}
      />
    </div>
  );
}

/* ------------------------------ layers tab ------------------------------ */

type Layer = {
  key: string;
  name: string;
  pdu: string;
  color: string;
  fields: string[];
};

// outer -> inner
const LAYERS: Layer[] = [
  {
    key: "link",
    name: "Канальный (Link)",
    pdu: "кадр Ethernet",
    color: "#FF8A00",
    fields: ["MAC получателя: 8c:3b:ad:5e:10:01 (роутер)", "MAC отправителя: 3c:22:fb:11:a2:07", "EtherType 0x0800 (IPv4)", "+ FCS (контрольная сумма) в конце"],
  },
  {
    key: "internet",
    name: "Сетевой (Internet)",
    pdu: "IP-пакет",
    color: "#00A3A3",
    fields: ["IP отправителя: 192.168.1.10", "IP получателя: 203.0.113.80", "TTL 64", "protocol 6 (TCP)"],
  },
  {
    key: "transport",
    name: "Транспортный (Transport)",
    pdu: "TCP-сегмент",
    color: "#7A5CFF",
    fields: ["порт отправителя: 49152", "порт получателя: 80", "seq / ack", "флаги, окно"],
  },
  {
    key: "app",
    name: "Прикладной (Application)",
    pdu: "данные HTTP",
    color: "#1FA35B",
    fields: ["GET / HTTP/1.1", "Host: shop.example.tj"],
  },
];

type LStep = { present: number; active: number; dir: "down" | "up"; title: string; text: string };
// present = how many layers are wrapped (1 = only app data, 4 = full frame)
const LSTEPS: LStep[] = [
  { present: 1, active: 3, dir: "down", title: "Отправитель: приложение", text: "Браузер формирует данные прикладного уровня: HTTP-запрос «GET / HTTP/1.1». Он ничего не знает ни о портах, ни об IP-адресах, ни о кабелях." },
  { present: 2, active: 2, dir: "down", title: "Транспортный уровень добавляет TCP-заголовок", text: "ОС дописывает впереди заголовок TCP: порт отправителя (случайный 49152) и порт получателя (80 = HTTP), номера seq/ack и флаги. Получился сегмент. Порты отвечают на вопрос «какому приложению»." },
  { present: 3, active: 1, dir: "down", title: "Сетевой уровень добавляет IP-заголовок", text: "Добавляются IP-адреса отправителя и получателя, TTL и номер протокола (6 = TCP). Получился пакет. Адреса отвечают на вопрос «какому компьютеру» и позволяют маршрутизаторам доставить пакет через интернет." },
  { present: 4, active: 0, dir: "down", title: "Канальный уровень добавляет Ethernet-заголовок", text: "Добавляются MAC-адреса: получатель здесь не сервер, а ближайший шаг, твой роутер (MAC нужен только в пределах одной локальной сети). В конец ставится FCS. Кадр превращается в сигналы по кабелю или Wi-Fi." },
  { present: 4, active: 0, dir: "up", title: "Получатель: кадр пришёл", text: "Сетевая карта сервера принимает кадр, проверяет FCS и свой MAC. По дороге роутеры уже не раз заменяли Ethernet-заголовок на новый, а IP и TCP оставались прежними." },
  { present: 3, active: 1, dir: "up", title: "Снимается Ethernet, читается IP", text: "Ethernet-заголовок отброшен. ОС проверяет, что IP-адрес получателя её собственный, и по полю protocol (6) понимает, что внутри TCP." },
  { present: 2, active: 2, dir: "up", title: "Снимается IP, читается TCP", text: "По порту 80 ОС находит процесс веб-сервера (nginx) и по seq/ack собирает байты потока в правильном порядке." },
  { present: 1, active: 3, dir: "up", title: "Приложению отдаются данные", text: "Веб-сервер получает чистый HTTP-запрос. Каждый уровень общался только со «своим» уровнем на другой стороне и ничего не знал о чужих деталях. Это и есть идея инкапсуляции." },
];

function Nest({ present, active }: { present: number; active: number }) {
  const render = (idx: number): React.ReactNode => {
    const L = LAYERS[idx];
    const isPresent = idx >= LAYERS.length - present;
    const isActive = idx === active;
    return (
      <motion.div
        initial={false}
        animate={{ opacity: isPresent ? 1 : 0.5 }}
        transition={{ duration: 0.3 }}
        className="rounded-[10px] p-2.5"
        style={{
          border: `${isPresent ? 2 : 1.5}px ${isPresent ? "solid" : "dashed"} ${L.color}`,
          background: `color-mix(in srgb, ${L.color} ${isPresent ? 10 : 3}%, var(--card))`,
          boxShadow: isActive ? `0 0 0 3px color-mix(in srgb, ${L.color} 35%, transparent)` : "none",
          transition: "box-shadow .25s, border-color .25s",
        }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13px] font-semibold" style={{ color: L.color }}>{L.name}</span>
          <AnimatePresence initial={false}>
            {isPresent && (
              <motion.span
                key="pdu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-[11px] text-muted"
              >
                {L.pdu}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence initial={false}>
          {isPresent && (
            <motion.div
              key="fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 flex flex-wrap gap-1">
                {L.fields.map((f) => (
                  <span key={f} className="rounded-md border border-line bg-card px-1.5 py-0.5 font-mono text-[11px] leading-snug text-ink">
                    {f}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {idx < LAYERS.length - 1 && <div className="mt-2">{render(idx + 1)}</div>}
      </motion.div>
    );
  };
  return <>{render(0)}</>;
}

function Layers() {
  const st = useStepper(LSTEPS.length - 1, 2800);
  const cur = LSTEPS[st.step];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            cur.dir === "down" ? "bg-accent/15 text-accent" : "bg-ok/15 text-ok"
          }`}
        >
          {cur.dir === "down" ? "Отправитель: вниз по стеку, заголовки добавляются" : "Получатель: вверх по стеку, заголовки снимаются"}
        </span>
      </div>
      <Nest present={cur.present} active={cur.active} />
      <div className="rounded-[10px] border border-line p-3 sm:p-4" aria-live="polite">
        <h4 className="mb-2 font-display text-base font-semibold">{cur.title}</h4>
        <p className="text-[15px] leading-relaxed">{cur.text}</p>
      </div>
      <StepControls
        step={st.step}
        last={st.last}
        playing={st.playing}
        onBack={st.back}
        onNext={st.next}
        onToggle={st.toggle}
        onReset={st.reset}
      />
    </div>
  );
}

export default function Widget({ props }: { props?: Record<string, unknown> }) {
  void props;
  const [tab, setTab] = useState<"hs" | "layers">("hs");
  return (
    <WidgetFrame
      title="TCP: рукопожатие и слои"
      hint="Пройди шаги: как клиент и сервер договариваются о соединении и как данные «заворачиваются» в заголовки. Всё симуляция в браузере."
    >
      <div role="tablist" aria-label="Режим" className="mb-4 inline-flex rounded-[10px] border border-line bg-paper p-1">
        {(
          [
            ["hs", "Рукопожатие"],
            ["layers", "Слои"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-[40px] rounded-[8px] px-4 text-sm font-medium transition ${
              tab === k ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "hs" ? <Handshake /> : <Layers />}</div>
    </WidgetFrame>
  );
}
