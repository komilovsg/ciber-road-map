"use client";
import { createContext, useCallback, useContext } from "react";
import { saveBlockData, solveBlock, useProgress, type BlockRecord } from "@/lib/progress";

/** Key "slug#blockIndex" of the block currently rendered (provided by BlockRenderer). */
export const BlockKeyContext = createContext<string>("anon#0");

/**
 * Per-block persisted progress.
 *  - `solved` / `solve()`: call solve() once when the task is completed (awards XP once, persists).
 *  - `data` / `setData(v)`: optional persisted JSON-serialisable state (checklists, flashcard marks…).
 */
export function useBlockProgress<T = unknown>() {
  const key = useContext(BlockKeyContext);
  const p = useProgress();
  const rec = (p.blocks[key] ?? {}) as BlockRecord;
  const solve = useCallback(() => solveBlock(key), [key]);
  const setData = useCallback((v: T) => saveBlockData(key, v), [key]);
  return { key, solved: !!rec.solved, data: rec.data as T | undefined, solve, setData };
}
