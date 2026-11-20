"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type { Session } from "@/lib/types";

export type ViewName = "home" | "problems" | "companies" | "hub" | "drives" | "chat" | "contribute" | "wallet" | "mod" | "profile";

export type View =
  | { name: "home" }
  | { name: "problems" }
  | { name: "companies" }
  | { name: "hub"; company: string }
  | { name: "drives" }
  | { name: "chat" }
  | { name: "contribute" }
  | { name: "wallet" }
  | { name: "mod" }
  | { name: "profile" };

type AppState = {
  view: View;
  navigate: (v: View) => void;
  session: Session | null;
  sessionLoading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  signInOpen: boolean;
  setSignInOpen: (open: boolean) => void;
};

export const useApp = create<AppState>((set, get) => ({
  view: { name: "home" },
  navigate: (v) => {
    set({ view: v });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },
  session: null,
  sessionLoading: true,
  refreshSession: async () => {
    try {
      const session = await api<Session>("/api/auth/session");
      set({ session, sessionLoading: false });
    } catch {
      set({ sessionLoading: false });
    }
  },
  signOut: async () => {
    await api("/api/auth/logout", { method: "POST" });
    set({ session: null });
    get().navigate({ name: "home" });
  },
  signInOpen: false,
  setSignInOpen: (open) => set({ signInOpen: open }),
}));

export function isModRole(role: string | undefined | null) {
  return role === "MOD" || role === "ADMIN";
}
