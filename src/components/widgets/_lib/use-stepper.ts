"use client";
import { useCallback, useEffect, useState } from "react";

/** Step index + auto-play. `last` is the final step index. */
export function useStepper(last: number, ms = 2200) {
  const [raw, setRaw] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = Math.min(raw, last);
  const isPlaying = playing && step < last;

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setRaw((x) => Math.min(x + 1, last)), ms);
    return () => clearInterval(id);
  }, [isPlaying, last, ms]);

  const next = useCallback(() => {
    setPlaying(false);
    setRaw((x) => Math.min(x + 1, last));
  }, [last]);
  const back = useCallback(() => {
    setPlaying(false);
    setRaw((x) => Math.max(Math.min(x, last) - 1, 0));
  }, [last]);
  const goto = useCallback((i: number) => {
    setPlaying(false);
    setRaw(i);
  }, []);
  const reset = useCallback(() => {
    setPlaying(false);
    setRaw(0);
  }, []);
  const toggle = useCallback(() => {
    if (isPlaying) {
      setPlaying(false);
    } else {
      if (step >= last) setRaw(0);
      setPlaying(true);
    }
  }, [isPlaying, step, last]);

  return { step, last, playing: isPlaying, next, back, goto, reset, toggle };
}
