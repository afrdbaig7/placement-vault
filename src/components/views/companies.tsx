"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import setsData from "@/data/sets.json";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyLogo } from "@/components/shared/company-logo";
import { EmptyState } from "@/components/shared/bits";
import { CalendarClock, Search } from "lucide-react";

type CompanyCard = {
  slug: string;
  name: string;
  color: string;
  region: "Global" | "Indian";
  tier: "FAANG" | "Product" | "Service" | "Finance" | "Fintech";
  tagline: string;
  topicsFocus: string[];
  problemCount: number;
  windowLabel: string;
  nextDrive: { role: string; driveDate: string } | null;
};

const FILTERS = ["All", "Global", "Indian", "FAANG", "Product", "Service"] as const;
type Filter = (typeof FILTERS)[number];

const tierBadge: Record<CompanyCard["tier"], string> = {
  FAANG: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Product: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  Service: "bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Finance: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Fintech: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
};

function matchesFilter(c: CompanyCard, f: Filter): boolean {
  switch (f) {
    case "All":
      return true;
    case "Global":
      return c.region === "Global";
    case "Indian":
      return c.region === "Indian";
    case "FAANG":
      return c.tier === "FAANG";
    case "Product":
      return c.tier === "Product";
    case "Service":
      return c.tier === "Service";
  }
}

export function CompaniesView() {
  const { navigate } = useApp();
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api<{ companies: CompanyCard[] }>("/api/companies"),
  });

  const companies = data?.companies ?? [];
  const counts = useMemo(() => {
    const map = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<Filter, number>;
    for (const c of companies) for (const f of FILTERS) if (matchesFilter(c, f)) map[f] += 1;
    return map;
  }, [companies]);
  const totalProblems = useMemo(() => companies.reduce((n, c) => n + c.problemCount, 0), [companies]);

  const visible = companies.filter(
    (c) =>
      matchesFilter(c, filter) &&
      (query.trim() === "" ||
        `${c.name} ${c.tagline}`.toLowerCase().includes(query.trim().toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Company-wise</p>
        <h1 className="mt-1.5 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Pick a <span className="italic">target</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {companies.length} companies · {totalProblems} tagged questions from the last 6 months ·{" "}
          {setsData.length} practice sets. Filter by region or tier, then open a hub to see rounds, OA pattern,
          reports and doubts.
        </p>
      </div>

      {/* filter + search bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter companies"
          className="flex flex-wrap items-center gap-1 rounded-full border bg-muted/40 p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                filter === f
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f} <span className="text-xs text-muted-foreground">{isLoading ? "·" : counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies..."
            aria-label="Search companies"
            className="rounded-full pl-9"
          />
        </div>
      </div>

      {/* grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Search} title="No companies match" hint="Try a different filter or clear the search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <Card
              key={c.slug}
              className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => navigate({ name: "hub", company: c.slug })}
            >
              <CardContent className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <CompanyLogo company={c} size="md" />
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      tierBadge[c.tier]
                    )}
                  >
                    {c.tier}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold">{c.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.region}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{c.tagline}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {c.topicsFocus.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
                {c.nextDrive && (
                  <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                    <CalendarClock className="h-3 w-3" aria-hidden />
                    {c.nextDrive.role} —{" "}
                    {new Date(c.nextDrive.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                )}
                <div className="mt-auto flex items-baseline justify-between pt-3">
                  <p className="text-sm">
                    <span className="font-semibold tabular-nums">{c.problemCount}</span>{" "}
                    <span className="text-muted-foreground">problems</span>
                  </p>
                  <span className="text-xs text-muted-foreground">{c.windowLabel}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
