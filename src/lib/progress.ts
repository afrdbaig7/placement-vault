"use client";

import { create } from "zustand";

// Per-user progress lives in the browser (the FAANGrind pattern):
// solved ticks, notes and streaks never touch the database.

const KEY = "cph_progress_v1";

export type ProblemProgress = Record<string, { solved: boolean; note: string }>; // key: `${company}:${slug}`

type ProgressState = {
  solvedMap: ProblemProgress;
  streak: number;
  hydrated: boolean;
  toggleSolved: (key: string) => void;
  setNote: (key: string, note: string) => void;
  touchStreak: () => void;
  hydrate: () => void;
};

function load(): { solvedMap: ProblemProgress; streak: number } {
  if (typeof window === "undefined") return { solvedMap: {}, streak: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { solvedMap: {}, streak: 0 };
    const parsed = JSON.parse(raw);
    return { solvedMap: parsed.solvedMap ?? {}, streak: parsed.streak ?? 0 };
  } catch {
    return { solvedMap: {}, streak: 0 };
  }
}

function persist(state: { solvedMap: ProblemProgress; streak: number }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

function bumpStreak(streak: number): number {
  const today = new Date().toDateString();
  const last = window.localStorage.getItem(KEY + "_last");
  if (last === today) return streak;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const next = last === yesterday ? streak + 1 : 1;
  window.localStorage.setItem(KEY + "_last", today);
  return next;
}

export const useProgress = create<ProgressState>((set, get) => ({
  solvedMap: {},
  streak: 0,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const { solvedMap, streak } = load();
    const today = new Date().toDateString();
    const last = window.localStorage.getItem(KEY + "_last");
    let nextStreak = streak;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      nextStreak = last === yesterday ? streak : last ? 0 : streak;
      window.localStorage.setItem(KEY + "_last", today);
      if (nextStreak === 0) nextStreak = 1;
    }
    set({ solvedMap, streak: nextStreak, hydrated: true });
    persist({ solvedMap, streak: nextStreak });
  },
  toggleSolved: (key) => {
    const { solvedMap, streak } = get();
    const current = solvedMap[key] ?? { solved: false, note: "" };
    const solvedMapNext = { ...solvedMap, [key]: { ...current, solved: !current.solved } };
    const nextStreak = !current.solved ? bumpStreak(streak) : streak;
    set({ solvedMap: solvedMapNext, streak: nextStreak });
    persist({ solvedMap: solvedMapNext, streak: nextStreak });
  },
  setNote: (key, note) => {
    const { solvedMap, streak } = get();
    const current = solvedMap[key] ?? { solved: false, note: "" };
    const solvedMapNext = { ...solvedMap, [key]: { ...current, note } };
    set({ solvedMap: solvedMapNext });
    persist({ solvedMap: solvedMapNext, streak });
  },
  touchStreak: () => {
    const { streak } = get();
    const next = bumpStreak(streak);
    set({ streak: next });
    persist({ solvedMap: get().solvedMap, streak: next });
  },
}));
