"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { DriveView, StatsData } from "@/lib/types";
import companies from "@/data/companies.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Coin, EmptyState } from "@/components/shared/bits";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Coins,
  FileText,
  Gift,
  MessagesSquare,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

const companyMap = new Map(companies.map((c) => [c.slug, c]));

export function HomeView() {
  const { navigate, session, setSignInOpen } = useApp();
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api<StatsData>("/api/stats"),
  });
  const { data: drivesData } = useQuery({
    queryKey: ["drives"],
    queryFn: () => api<{ drives: DriveView[] }>("/api/drives"),
  });

  const openDrives = (drivesData?.drives ?? []).filter((d) => d.status === "OPEN").slice(0, 3);
  const s = data?.stats;

  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 via-background to-amber-50 px-6 py-10 sm:px-10 dark:from-emerald-950/40 dark:via-background dark:to-amber-950/30">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-3 gap-1 border-emerald-300 bg-background/60 text-emerald-800 dark:text-emerald-300">
            <Zap className="h-3 w-3" aria-hidden /> Give-to-get platform
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Every OA question your seniors sat for,
            <span className="text-primary"> one contribution away.</span>
          </h1>
          <p className="mt-3 text-muted-foreground sm:text-lg">
            Company-wise problem lists, embargoed OA reports and interview experiences for our campus — earn coins by
            contributing, spend them to unlock what others shared.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {session?.user ? (
              <>
                <Button size="lg" onClick={() => navigate({ name: "companies" })}>
                  Explore companies <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate({ name: "contribute" })}>
                  Contribute & earn <Coin amount={session.rates.reportApproved} />
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" onClick={() => setSignInOpen(true)}>
                  Sign in with Google <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate({ name: "problems" })}>
                  Browse {s?.problemCount ?? "…"} problems — no account needed
                </Button>
              </>
            )}
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 hidden h-64 w-64 rounded-full bg-primary/10 blur-2xl lg:block" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 right-24 hidden h-48 w-48 rounded-full bg-amber-300/20 blur-2xl lg:block" />
      </section>

      {/* stats strip */}
      <section aria-label="Platform stats" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading || !s
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : (
              <>
                <StatCard icon={Users} label="Students" value={s.students} />
                <StatCard icon={BookOpen} label="Problems" value={s.problemCount} />
                <StatCard icon={FileText} label="OA reports" value={s.approvedReports} />
                <StatCard icon={Building2} label="Experiences" value={s.approvedExperiences} />
                <StatCard icon={MessagesSquare} label="Doubts asked" value={s.doubts} />
                <StatCard icon={Coins} label="Coins earned" value={s.coinsInCirculation} highlight />
              </>
            )}
      </section>

      {/* how it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How coins work</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <HowStep
            icon={Gift}
            title="Give-to-get"
            body="One approved OA report or experience for a company unlocks that company's other OAs for free. People who just sat an OA are exactly who can contribute."
          />
          <HowStep
            icon={Coins}
            title="Coins for contributions"
            body="Approved reports, experiences and accepted answers pay coins. Upvotes count only from distinct users, with a daily cap to stop farming rings."
          />
          <HowStep
            icon={ShieldCheck}
            title="Coins enforced server-side"
            body="Unlocking writes the spend and the unlock row in one transaction. A contribution is always worth more than an unlock, so contributors never run dry."
          />
        </CardContent>
      </Card>

      {/* open drives */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Drives currently open</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: "drives" })}>
            All drives <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </div>
        {openDrives.length === 0 ? (
          <EmptyState icon={Building2} title="No open drives right now" hint="Mods announce drives here — reports stay under embargo until each drive closes." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {openDrives.map((d) => {
              const c = companyMap.get(d.company);
              if (!c) return null;
              return (
                <Card
                  key={d.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate({ name: "hub", company: c.slug })}
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <CompanyLogo company={c} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{d.role}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(d.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {d.minCgpa ? ` · CGPA ${d.minCgpa}+` : ""}
                      </p>
                      <Badge className="mt-2 bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                        OA reports under embargo
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HowStep({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
