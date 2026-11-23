"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, post } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { DoubtView, ExperienceView, HubData, ReportView } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultyBadge, EmptyState, Spinner } from "@/components/shared/bits";
import { ReportCard } from "@/components/shared/report-card";
import { ExperienceCard } from "@/components/shared/experience-card";
import { DoubtCard, DoubtListItem } from "@/components/shared/doubt-thread";
import { FileText, Lock, MessageCircle, Plus, TrendingUp, VenetianMask } from "lucide-react";

export function CompanyHubView({ slug }: { slug: string }) {
  const { navigate } = useApp();
  const { data, isLoading } = useQuery({
    queryKey: ["hub", slug],
    queryFn: () => api<HubData>(`/api/companies/${slug}`),
  });
  const { data: reportsData } = useQuery({
    queryKey: ["reports", slug],
    queryFn: () => api<{ reports: ReportView[] }>(`/api/reports?company=${slug}`),
  });
  const { data: expData } = useQuery({
    queryKey: ["experiences", slug],
    queryFn: () => api<{ experiences: ExperienceView[] }>(`/api/experiences?company=${slug}`),
  });
  const { data: doubtsData } = useQuery({
    queryKey: ["doubts", slug],
    queryFn: () => api<{ doubts: DoubtView[] }>(`/api/doubts?company=${slug}`),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const c = data.company;
  const a = data.aggregates;
  const maxTopic = a.topicFreq[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* header */}
      <section className="rounded-2xl border bg-gradient-to-r from-muted/70 to-background p-6">
        <div className="flex flex-wrap items-start gap-4">
          <CompanyLogo company={c} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
              <Badge variant={c.type === "product" ? "default" : "secondary"}>{c.type}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
            <p className="mt-1 text-xs text-muted-foreground">Typical roles: {c.typicalRoles.join(" · ")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat value={a.approvedReports} label="OAs" />
            <MiniStat value={a.approvedExperiences} label="experiences" />
            <MiniStat value={a.doubts} label="doubts" />
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="oas" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden /> OA reports
          </TabsTrigger>
          <TabsTrigger value="experiences">Experiences</TabsTrigger>
          <TabsTrigger value="doubts" className="gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Doubts
          </TabsTrigger>
        </TabsList>

        {/* ---------- overview ---------- */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rounds & format</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {c.rounds.map((r, i) => (
                    <li key={r.name} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-sm text-muted-foreground">{r.details}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OA pattern</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Platform:</span> {c.oaPattern.platform}
                </p>
                <p>
                  <span className="font-medium">Duration:</span> {c.oaPattern.duration}
                </p>
                <p>
                  <span className="font-medium">Questions:</span> {c.oaPattern.questions}
                </p>
                <p className="text-muted-foreground">{c.oaPattern.note}</p>
                {a.platforms.length > 0 && (
                  <p className="text-xs text-muted-foreground">Seen in approved reports: {a.platforms.join(", ")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Topic frequency
                </CardTitle>
              </CardHeader>
              <CardContent>
                {a.topicFreq.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No approved contributions yet — topic frequencies appear once reports are approved and drives close.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {a.topicFreq.map((t) => (
                      <li key={t.topic} className="flex items-center gap-3 text-sm">
                        <span className="w-36 shrink-0 truncate font-medium">{t.topic}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(t.count / maxTopic) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right tabular-nums text-muted-foreground">{t.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drive history & eligibility</CardTitle>
              </CardHeader>
              <CardContent>
                {data.drives.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No drives announced yet.</p>
                ) : (
                  <ul className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto pr-1">
                    {data.drives.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{d.role}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(d.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            {d.branches !== "ALL" ? ` · ${d.branches}` : " · all branches"}
                            {d.minCgpa ? ` · CGPA ${d.minCgpa}+` : ""}
                          </p>
                        </div>
                        <Badge
                          className={
                            d.status === "OPEN"
                              ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
                              : undefined
                          }
                          variant={d.status === "OPEN" ? "default" : "secondary"}
                        >
                          {d.status === "OPEN" ? "open" : "closed"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------- OA reports ---------- */}
        <TabsContent value="oas" className="mt-4 space-y-4">
          <EmbargoNotice />
          {!reportsData ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : reportsData.reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No OA reports visible yet"
              hint="Reports appear once their drive closes and a moderator approves them. Sat an OA recently? Contribute from the Contribute tab."
              action={
                <Button size="sm" variant="outline" onClick={() => navigate({ name: "contribute" })}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden /> Submit an OA report
                </Button>
              }
            />
          ) : (
            reportsData.reports.map((r) => <ReportCard key={r.id} report={r} showCompany={false} />)
          )}
        </TabsContent>

        {/* ---------- experiences ---------- */}
        <TabsContent value="experiences" className="mt-4 space-y-4">
          {!expData ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : expData.experiences.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No experiences yet for this company"
              hint="Structured forms (round, platform, topics, difficulty, outcome) mean experiences aggregate into the hub stats."
              action={
                <Button size="sm" variant="outline" onClick={() => navigate({ name: "contribute" })}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden /> Share your experience
                </Button>
              }
            />
          ) : (
            expData.experiences.map((e) => <ExperienceCard key={e.id} experience={e} />)
          )}
        </TabsContent>

        {/* ---------- doubts ---------- */}
        <TabsContent value="doubts" className="mt-4 space-y-4">
          <AskDoubtCard company={slug} companyName={c.name} />
          {!doubtsData ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : doubtsData.doubts.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No doubts yet" hint="Ask anonymously — juniors ask freely, placed seniors' answers rank higher." />
          ) : (
            doubtsData.doubts.map((d) => <DoubtListItem key={d.id} doubt={d} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-background px-3 py-2 shadow-sm ring-1 ring-black/5">
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function EmbargoNotice() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-violet-300/60 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Embargo:</span> companies reuse an OA across slots, so reports stay hidden while a
        drive is open. They appear here only after a moderator closes the drive — no mid-drive leaks.
      </p>
    </div>
  );
}

function AskDoubtCard({ company, companyName }: { company: string; companyName: string }) {
  const { session, setSignInOpen } = useApp();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const ask = useMutation({
    mutationFn: () => post<{ message: string }>("/api/doubts", { company, title, text: body, anonymous }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Doubt posted");
      setTitle("");
      setBody("");
      setAnonymous(false);
      void qc.invalidateQueries({ queryKey: ["doubts", company] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post"),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ask a doubt about {companyName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!session?.user ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Sign in with Google to ask — anonymously if you prefer.</span>
            <Button size="sm" onClick={() => setSignInOpen(true)}>
              Sign in
            </Button>
          </div>
        ) : (
          <>
            <Input placeholder={`Question about ${companyName} (min 10 chars)`} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea
              rows={3}
              placeholder="Give context: which round, what happened, what you want to know…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch id={`anon-${company}`} checked={anonymous} onCheckedChange={setAnonymous} />
                <Label htmlFor={`anon-${company}`} className="flex items-center gap-1 text-sm">
                  <VenetianMask className="h-3.5 w-3.5" aria-hidden /> Post anonymously
                </Label>
              </div>
              <Button size="sm" disabled={title.trim().length < 10 || body.trim().length < 20 || ask.isPending} onClick={() => ask.mutate()}>
                {ask.isPending ? <Spinner className="h-4 w-4" /> : null} Post doubt
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// re-export so the doubts tab can open detail dialogs from elsewhere
export { DoubtCard, DifficultyBadge };
