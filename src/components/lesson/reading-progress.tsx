"use client";
import { motion, useScroll, useSpring } from "motion/react";
import { useT } from "@/i18n/context";

export function ReadingProgress() {
  const t = useT();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      role="progressbar"
      aria-label={t.lesson.progressBar}
      aria-valuemin={0}
      aria-valuemax={100}
      className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-lc"
      style={{ scaleX }}
    />
  );
}
