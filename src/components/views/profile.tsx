"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApp, isModRole } from "@/lib/store";
import type { ReportView, ExperienceView, Session } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Coin, EmptyState, PlacedBadge, VerifiedBadge } from "@/components/shared/bits";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, ShieldCheck, UserRound } from "lucide-react";

export function ProfileView() {
  const { session, setSignInOpen, navigate } = useApp();

  if (!session?.user) {
    return (
      <EmptyState
        icon={UserRound}
        title="Sign in to see your profile"
        action={
          <Button size="sm" onClick={() => setSignInOpen(true)}>
            Sign in with Google
          </Button>
        }
      />
    );
  }

  const u = session.user;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">
              {u.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{u.name}</h1>
              <Badge variant="secondary">{u.role}</Badge>
              {u.rollVerified ? <VerifiedBadge /> : <Badge variant="outline">verification pending</Badge>}
              {u.placedCompany && <PlacedBadge company={u.placedCompany} />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{u.email}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>
                Roll number: <span className="font-mono">{u.rollNumber ?? "—"}</span>
              </span>
              {u.batch && <span>Batch: {u.batch}</span>}
              <button className="inline-flex items-center gap-1 font-medium text-coin" onClick={() => navigate({ name: "wallet" })}>
                <Coin amount={session.balance} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!u.rollVerified && (
        <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <ShieldCheck className="h-5 w-5 text-amber-600" aria-hidden />
            <p className="flex-1 text-sm">
              {u.rollNumber
                ? `Your roll number ${u.rollNumber} is awaiting moderator verification. Earning and spending coins unlocks after approval.`
                : "Submit your roll number to get verified — it unlocks earning and spending."}
            </p>
          </CardContent>
        </Card>
      )}

      <MyContributions />
    </div>
  );
}

function MyContributions() {
  const { session } = useApp();
  const { data: reportsData, isLoading: rl } = useQuery({
    queryKey: ["reports", "mine"],
    queryFn: () => api<{ reports: ReportView[] }>("/api/reports?mine=1"),
  });
  const { data: expData, isLoading: el } = useQuery({
    queryKey: ["experiences", "mine"],
    queryFn: () => api<{ experiences: ExperienceView[] }>("/api/experiences?mine=1"),
  });

  if (rl || el || !reportsData || !expData) return <Skeleton className="h-40 rounded-xl" />;

  const reports = reportsData.reports;
  const experiences = expData.experiences;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" aria-hidden /> My contributions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.length === 0 && experiences.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No contributions yet"
            hint="Approved contributions pay coins and unlock that company's OAs via give-to-get."
            action={
              <Button size="sm" variant="outline" onClick={() => useApp.getState().navigate({ name: "contribute" })}>
                Contribute now
              </Button>
            }
          />
        ) : (
          <>
            {reports.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">OA reports ({reports.length})</h3>
                <ul className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto pr-1">
                  {reports.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <span className="font-medium capitalize">{r.company}</span>
                      <span className="text-muted-foreground">{r.driveRole} · {r.round}</span>
                      {r.underEmbargo && (
                        <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">under embargo</Badge>
                      )}
                      <StatusBadge status={r.status} />
                      <span className="ml-auto text-xs text-muted-foreground">▲ {r.upvoteCount}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {experiences.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Experiences ({experiences.length})</h3>
                <ul className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto pr-1">
                  {experiences.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <span className="font-medium capitalize">{e.company}</span>
                      <span className="text-muted-foreground">{e.role} · {e.round}</span>
                      <StatusBadge status={e.status} />
                      <span className="ml-auto text-xs text-muted-foreground">▲ {e.upvoteCount}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {session?.contributionCompanies.length ? (
              <p className="text-sm text-muted-foreground">
                Give-to-get unlocked for:{" "}
                <span className="font-medium text-foreground">{session.contributionCompanies.join(", ")}</span>
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">approved</Badge>;
  if (status === "PENDING") return <Badge variant="outline">pending review</Badge>;
  if (status === "REMOVED") return <Badge variant="destructive">removed</Badge>;
  return <Badge variant="destructive">{status.toLowerCase()}</Badge>;
}
