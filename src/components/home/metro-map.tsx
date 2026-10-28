"use client";
import { motion } from "motion/react";
import Link from "next/link";
import type { LessonMeta, WeekMeta } from "@/lib/content-meta";
import { nextLesson } from "@/lib/course";
import { useProgress } from "@/lib/progress";
import { useI18n } from "@/i18n/context";
import { fmt } from "@/i18n";
import { StationShape } from "@/icons";

const W = 1120;
const ROW_H = 168;
const Y0 = 84;
const X0 = 120;
const DX = 176;
const PER = 6;

function wrap(s: string, max = 24): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) {
    lines.length = 2;
    lines[1] = lines[1].slice(0, max - 1) + "…";
  }
  return lines;
}

type Slot = { lesson?: LessonMeta; x: number; y: number };

export function MetroMap({ weeks }: { weeks: WeekMeta[] }) {
  const { t, locale } = useI18n();
  const p = useProgress();
  const next = nextLesson(weeks, p.done);
  const rows = weeks.map((w, r) => {
    const rtl = r % 2 === 1;
    const slots: Slot[] = Array.from({ length: PER }, (_, k) => ({
      lesson: w.lessons[k],
      x: rtl ? W - (X0 + k * DX) : X0 + k * DX,
      y: Y0 + r * ROW_H,
    }));
    return { w, rtl, slots, y: Y0 + r * ROW_H };
  });
  const H = Y0 + (weeks.length - 1) * ROW_H + 84;
  const href = (l: LessonMeta) => `/${locale}/learn/${l.slug}`;

  return (
    <section id="map" className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 md:py-16" aria-labelledby="map-title">
      <h2 id="map-title" className="font-display text-[24px] font-semibold tracking-[-0.015em]">{t.map.title}</h2>
      <p className="mt-2 max-w-[60ch] text-[14px] text-muted">{t.map.lead}</p>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted" aria-hidden>
        {(["lesson", "project", "ctf", "test"] as const).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <StationShape type={k} size={18} color="var(--ink)" /> {t.map[`legend${k[0].toUpperCase()}${k.slice(1)}` as "legendLesson"]}
          </li>
        ))}
      </ul>

      {/* Desktop: snake */}
      <div className="mt-6 hidden md:block">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label={t.map.ariaMap}>
          {rows.map(({ w, rtl, slots, y }, r) => {
            const prev = rows[r - 1];
            const stationDone = (s: Slot) => !!s.lesson && !!p.done[s.lesson.slug];
            return (
              <g key={w.week}>
                {/* transfer connector from previous row */}
                {prev && (
                  <path
                    d={`M ${prev.slots[PER - 1].x} ${prev.y} C ${prev.slots[PER - 1].x + (rtl ? 78 : -78)} ${prev.y}, ${prev.slots[PER - 1].x + (rtl ? 78 : -78)} ${y}, ${slots[0].x} ${y}`}
                    fill="none"
                    stroke={w.color}
                    strokeWidth={10}
                    strokeLinecap="round"
                    opacity={stationDone(slots[0]) ? 1 : 0.3}
                  />
                )}
                {/* segments */}
                {slots.slice(1).map((s, k) => (
                  <motion.line
                    key={k}
                    x1={slots[k].x}
                    y1={y}
                    x2={s.x}
                    y2={y}
                    stroke={w.color}
                    strokeWidth={10}
                    strokeLinecap="round"
                    initial={false}
                    animate={{ opacity: stationDone(s) ? 1 : 0.3 }}
                    transition={{ duration: 0.4 }}
                  />
                ))}
                {/* row label: one line, clear of the station labels above */}
                <text x={slots[0].x + (rtl ? -26 : 26)} y={y - 62} textAnchor={rtl ? "end" : "start"} style={{ fontFamily: "var(--font-onest)", fontSize: 15 }}>
                  <tspan style={{ fill: "var(--muted)" }}>{fmt(t.map.weekOf, { n: w.week })} · </tspan>
                  <tspan style={{ fill: w.color, fontWeight: 600 }}>{w.module}</tspan>
                </text>
                {/* stations */}
                {slots.map((s, k) => {
                  const l = s.lesson;
                  const done = stationDone(s);
                  const isNext = !!l && next?.slug === l.slug;
                  const interchange = (k === 0 && r > 0) || (k === PER - 1 && r < rows.length - 1);
                  const label = l ? wrap(l.title) : [t.common.soon];
                  const body = (
                    <g>
                      {interchange && <circle cx={s.x} cy={y} r={21} fill="var(--paper)" stroke="var(--ink)" strokeWidth={3} />}
                      {isNext && <circle className="pulse-ring" cx={s.x} cy={y} r={23} fill="none" stroke={w.color} strokeWidth={3} />}
                      <g transform={`translate(${s.x - 17} ${y - 17})`} opacity={l ? 1 : 0.4}>
                        <StationShape type={l?.type ?? "lesson"} size={34} filled={done} color={w.color} />
                      </g>
                      <text x={s.x} y={y - 26} textAnchor="middle" style={{ fontFamily: "var(--font-jb)", fontSize: 10.5, fill: "var(--muted)" }}>
                        {l ? String(l.n).padStart(2, "0") : ""}
                      </text>
                      {label.map((ln, i) => (
                        <text key={i} x={s.x} y={y + 34 + i * 15} textAnchor="middle" style={{ fontFamily: "var(--font-onest)", fontSize: 12.5, fontWeight: isNext ? 600 : 500, fill: l ? "var(--ink)" : "var(--muted)" }}>
                          {ln}
                        </text>
                      ))}
                    </g>
                  );
                  return l ? (
                    <Link key={k} href={href(l)} aria-label={`${l.n}. ${l.title}${done ? ` (${t.common.done})` : isNext ? ` (${t.map.next})` : ""}`} className="outline-none [&:focus-visible_circle]:stroke-[var(--accent)] cursor-pointer hover:opacity-90">
                      <title>{`${l.n}. ${l.title} · ${l.minutes} ${t.common.min}`}</title>
                      {/* larger hit area */}
                      <rect x={s.x - 80} y={y - 34} width={160} height={92} fill="transparent" />
                      {body}
                    </Link>
                  ) : (
                    <g key={k} aria-hidden>
                      {body}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile: vertical route */}
      <div className="mt-6 md:hidden">
        {weeks.map((w, r) => {
          const slots = Array.from({ length: PER }, (_, k) => w.lessons[k]);
          const prevColor = r > 0 ? weeks[r - 1].color : w.color;
          return (
            <div key={w.week} className="relative">
              <div className="flex items-center gap-3 pb-1 pt-2">
                <div className="relative z-10 grid h-11 w-11 shrink-0 place-items-center">
                  {r > 0 && <span aria-hidden className="absolute -top-4 left-1/2 h-4 w-[6px] -translate-x-1/2" style={{ background: `linear-gradient(${prevColor}, ${w.color})` }} />}
                  <span className="grid h-8 w-8 place-items-center rounded-full border-[3px] border-ink bg-paper text-[14px] font-semibold">{w.week}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] text-muted">{fmt(t.map.weekOf, { n: w.week })}</p>
                  <p className="font-display text-[17px] font-semibold leading-tight" style={{ color: w.color }}>{w.module}</p>
                </div>
              </div>
              <ol>
                {slots.map((l, k) => {
                  const done = !!l && !!p.done[l.slug];
                  const isNext = !!l && next?.slug === l.slug;
                  const nextDone = !!slots[k + 1] && !!p.done[slots[k + 1]!.slug];
                  const inner = (
                    <>
                      <span className="relative flex w-11 shrink-0 justify-center">
                        <span aria-hidden className="absolute left-1/2 top-0 h-1/2 w-[6px] -translate-x-1/2" style={{ background: w.color, opacity: done ? 1 : 0.3 }} />
                        <span aria-hidden className="absolute bottom-0 left-1/2 top-1/2 w-[6px] -translate-x-1/2" style={{ background: w.color, opacity: k === PER - 1 ? 0 : nextDone ? 1 : 0.3 }} />
                        <span className="relative z-10 grid place-items-center self-center">
                          {isNext && <span className="pulse-ring absolute h-8 w-8 rounded-full border-[3px]" style={{ borderColor: w.color }} aria-hidden />}
                          <StationShape type={l?.type ?? "lesson"} size={30} filled={done} color={w.color} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 py-2.5 pr-2">
                        <span className="text-[14px] tabular-nums text-muted">{l ? String(l.n).padStart(2, "0") : "··"}</span>
                        <span className={`block text-[16px] leading-snug ${isNext ? "font-semibold" : ""} ${l ? "" : "text-muted"}`}>{l ? l.title : t.common.soon}</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={k}>
                      {l ? (
                        <Link href={href(l)} className="flex min-h-[52px] items-stretch rounded-lg active:bg-ink/5" aria-label={`${l.n}. ${l.title}${done ? ` (${t.common.done})` : ""}`}>
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex min-h-[52px] items-stretch opacity-60">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
