"use client";

import { cn } from "@/lib/utils";
import { Coins, Flame, ShieldCheck, BadgeCheck, AlertTriangle, Loader2 } from "lucide-react";

export function Coin({ className, amount }: { className?: string; amount?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold text-coin", className)}>
      <Coins className="h-4 w-4" aria-hidden />
      {amount !== undefined && <span className="tabular-nums">{amount}</span>}
      <span className="sr-only">coins</span>
    </span>
  );
}

const diffStyles: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  Hard: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function DifficultyBadge({ level, className }: { level: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        diffStyles[level] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {level}
    </span>
  );
}

export function StreakPill({ streak }: { streak: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
      <Flame className="h-3.5 w-3.5" aria-hidden />
      {streak} day streak
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      Verified
    </span>
  );
}

export function PlacedBadge({ company }: { company: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      Placed at {company}
    </span>
  );
}

export function EmbargoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      Under embargo
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

export function GoogleLogoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
