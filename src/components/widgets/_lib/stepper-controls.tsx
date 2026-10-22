"use client";
import { IconArrowLeft, IconArrowRight, IconPlay, IconReset } from "@/icons";

function IconPause({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1" />
    </svg>
  );
}

export function StepControls({
  step,
  last,
  playing,
  onBack,
  onNext,
  onToggle,
  onReset,
}: {
  step: number;
  last: number;
  playing: boolean;
  onBack: () => void;
  onNext: () => void;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-sm" onClick={onBack} disabled={step <= 0}>
        <IconArrowLeft size={16} /> Назад
      </button>
      <button type="button" className="btn btn-sm btn-primary" onClick={onNext} disabled={step >= last}>
        Далее <IconArrowRight size={16} />
      </button>
      <button type="button" className="btn btn-sm" onClick={onToggle} aria-pressed={playing}>
        {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        {playing ? "Пауза" : "Автоплей"}
      </button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onReset} aria-label="Сначала">
        <IconReset size={16} />
      </button>
      <span className="ml-auto font-mono text-xs text-muted" aria-live="polite">
        шаг {step + 1} / {last + 1}
      </span>
    </div>
  );
}
