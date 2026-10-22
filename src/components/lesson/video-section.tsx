"use client";
import { useState } from "react";
import type { Video } from "@/content/types";
import { IconExternal, IconPlay } from "@/icons";
import { useT } from "@/i18n/context";

function LiteEmbed({ v }: { v: Video }) {
  const t = useT();
  const [on, setOn] = useState(false);
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-video w-full bg-black">
        {on ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
            title={v.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button type="button" onClick={() => setOn(true)} aria-label={`${t.lesson.play}: ${v.title}`} className="group absolute inset-0 block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-[#12161f] shadow-xl transition-transform group-hover:scale-105"><IconPlay size={26} /></span>
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{v.title}</p>
          <p className="text-[13px] text-muted">{v.channel}{v.minutes ? ` · ${v.minutes} ${t.common.min}` : ""} · {v.lang.toUpperCase()}</p>
        </div>
        <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm shrink-0">{t.lesson.watchOnYt}<IconExternal size={15} /></a>
      </div>
    </div>
  );
}

export function VideoSection({ videos }: { videos: Video[] }) {
  const t = useT();
  if (videos.length === 0) return null;
  return (
    <section aria-labelledby="videos-h" className="my-10 max-w-[860px]">
      <h2 id="videos-h" className="font-display text-[22px] font-semibold tracking-[-0.01em]">{t.lesson.videos}</h2>
      <p className="mb-4 mt-1 text-[15px] text-muted">{t.lesson.videosLead}</p>
      <div className={`grid gap-4 ${videos.length > 1 ? "md:grid-cols-2" : ""}`}>
        {videos.map((v) => <LiteEmbed key={v.id} v={v} />)}
      </div>
    </section>
  );
}
