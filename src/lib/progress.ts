"use client";
import { useSyncExternalStore } from "react";

export type ProgressState = {
  done: Record<string, true>;
  blocks: Record<string, unknown>;
  xp: number;
};

export const XP_BLOCK = 10;
export const XP_LESSON = 50;
const KEY = "kr:v1";
const EMPTY: ProgressState = { done: {}, blocks: {}, xp: 0 };

let state: ProgressState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
const xpListeners = new Set<(amount: number, label?: string) => void>();

function sanitize(raw: unknown): ProgressState {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Partial<ProgressState>;
  return {
    done: r.done && typeof r.done === "object" ? (r.done as Record<string, true>) : {},
    blocks: r.blocks && typeof r.blocks === "object" ? (r.blocks as Record<string, unknown>) : {},
    xp: typeof r.xp === "number" && r.xp >= 0 ? r.xp : 0,
  };
}

function load(): ProgressState {
  try {
    const s = window.localStorage.getItem(KEY);
    return s ? sanitize(JSON.parse(s)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: progress lives in memory only */
  }
}

function commit(next: ProgressState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    state = load();
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        state = load();
        listeners.forEach((l) => l());
      }
    });
  }
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getSnapshot = () => {
  ensureLoaded();
  return state;
};
const getServerSnapshot = () => EMPTY;

/** Reactive progress state (SSR snapshot is empty). */
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Subscribe to XP awards (used by the floating "+XP" chip). */
export function onXp(cb: (amount: number, label?: string) => void) {
  xpListeners.add(cb);
  return () => {
    xpListeners.delete(cb);
  };
}
const emitXp = (n: number, label?: string) => xpListeners.forEach((l) => l(n, label));

export function markDone(slug: string, value: boolean) {
  ensureLoaded();
  const has = !!state.done[slug];
  if (value === has) return;
  const done = { ...state.done };
  if (value) done[slug] = true;
  else delete done[slug];
  const xp = Math.max(0, state.xp + (value ? XP_LESSON : -XP_LESSON));
  commit({ ...state, done, xp });
  if (value) emitXp(XP_LESSON, "урок пройден");
}

export function setBlock(key: string, value: unknown) {
  ensureLoaded();
  commit({ ...state, blocks: { ...state.blocks, [key]: value } });
}

export function getBlock(key: string): unknown {
  ensureLoaded();
  return state.blocks[key];
}

export type BlockRecord = { solved?: boolean; data?: unknown };

/** Mark an interactive block as solved (once). Awards XP the first time. */
export function solveBlock(key: string) {
  ensureLoaded();
  const rec = (state.blocks[key] ?? {}) as BlockRecord;
  if (rec.solved) return;
  commit({
    ...state,
    xp: state.xp + XP_BLOCK,
    blocks: { ...state.blocks, [key]: { ...rec, solved: true } },
  });
  emitXp(XP_BLOCK);
}

export function saveBlockData(key: string, data: unknown) {
  ensureLoaded();
  const rec = (state.blocks[key] ?? {}) as BlockRecord;
  commit({ ...state, blocks: { ...state.blocks, [key]: { ...rec, data } } });
}

export function exportProgress(): string {
  ensureLoaded();
  return JSON.stringify(state, null, 2);
}

export function importProgress(json: string): boolean {
  try {
    const parsed = sanitize(JSON.parse(json));
    ensureLoaded();
    commit(parsed);
    return true;
  } catch {
    return false;
  }
}

export function resetProgress() {
  ensureLoaded();
  commit(EMPTY);
}

export const isBlockSolved = (s: ProgressState, key: string) => !!(s.blocks[key] as BlockRecord | undefined)?.solved;
