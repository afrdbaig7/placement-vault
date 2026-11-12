"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, post } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { DoubtView, ExperienceView, HubData, ReportView } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultyBadge, EmptyState, Spinner } from "@/components/shared/bits";
import { ReportCard } from "@/components/shared/report-card";
import { ExperienceCard } from "@/components/shared/experience-card";
import { DoubtCard, DoubtListItem } from "@/components/shared/doubt-thread";
import {
  FileText,
  Lock,
  MessageCircle,
  Plus,
  TrendingUp,
  VenetianMask,
  Code2,
  HelpCircle,
  Search,
  Sparkles,
  ExternalLink,
  Calendar,
} from "lucide-react";

export function CompanyHubView({ slug }: { slug: string }) {
  const { navigate } = useApp();
  const [reportSeason, setReportSeason] = useState<string>("all");
  const [problemWindow, setProblemWindow] = useState<string>("6M");
  const [problemDiff, setProblemDiff] = useState<string>("all");
  const [problemSearch, setProblemSearch] = useState<string>("");
  const [questionSearch, setQuestionSearch] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["hub", slug],
    queryFn: () => api<HubData>(`/api/companies/${slug}`),
  });

  const { data: reportsData } = useQuery({
    queryKey: ["reports", slug, reportSeason],
    queryFn: () => {
      const url =
        reportSeason === "all"
          ? `/api/reports?company=${slug}`
          : `/api/reports?company=${slug}&season=${reportSeason}`;
      return api<{ reports: ReportView[] }>(url);
    },
  });

  const { data: expData } = useQuery({
    queryKey: ["experiences", slug],
    queryFn: () => api<{ experiences: ExperienceView[] }>(`/api/experiences?company=${slug}`),
  });

  const { data: doubtsData } = useQuery({
    queryKey: ["doubts", slug],
    queryFn: () => api<{ doubts: DoubtView[] }>(`/api/doubts?company=${slug}`),
  });

  const { data: problemsData, isLoading: problemsLoading } = useQuery({
    queryKey: ["company-problems", slug, problemWindow, problemDiff, problemSearch],
    queryFn: () => {
      const params = new URLSearchParams({ company: slug, limit: "50" });
      if (problemWindow !== "ALL") params.set("window", problemWindow);
      if (problemDiff !== "all") params.set("difficulty", problemDiff);
      if (problemSearch.trim()) params.set("search", problemSearch.trim());
      return api<{
        items: Array<{
          id: string;
          title: string;
          difficulty: string;
          window: string;
          frequency: number;
          topics: string[];
          url: string | null;
        }>;
        totalCount: number;
        attribution: { label: string; sourceUrl: string; disclaimer: string };
      }>(`/api/problems?${params.toString()}`);
    },
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
  const season2026Count = a.season2026Reports ?? 0;

  // Filtered reports
  const allReports = reportsData?.reports ?? [];
  const allQuestions = allReports.flatMap((r) =>
    (r.questions ?? []).map((q) => ({ ...q, reportAuthor: r.author.name, reportRole: r.driveRole }))
  );
  const filteredQuestions = questionSearch.trim()
    ? allQuestions.filter(
        (q) =>
          q.statementMd.toLowerCase().includes(questionSearch.toLowerCase()) ||
          (q.title && q.title.toLowerCase().includes(questionSearch.toLowerCase()))
      )
    : allQuestions;

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
              {season2026Count > 0 ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {season2026Count} in 2026-27 Season
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground border-dashed">
                  No 2026-27 reports yet
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Typical roles: {c.typicalRoles ? c.typicalRoles.join(" · ") : "Software Engineer"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat value={a.approvedReports} label="OAs" />
            <MiniStat value={a.approvedExperiences} label="Experiences" />
            <MiniStat value={problemsData?.totalCount ?? a.problemCount ?? 0} label="Problems" />
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="oas" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden /> OA Reports ({a.approvedReports})
          </TabsTrigger>
          <TabsTrigger value="experiences" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden /> Experiences ({a.approvedExperiences})
          </TabsTrigger>
          <TabsTrigger value="problems" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" aria-hidden /> Problem Frequency
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden /> Question Bank
          </TabsTrigger>
          <TabsTrigger value="doubts" className="gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Doubts
          </TabsTrigger>
        </TabsList>

        {/* ---------- overview ---------- */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rounds & Format</CardTitle>
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
                <CardTitle className="text-base">OA Pattern</CardTitle>
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
                  <p className="text-xs text-muted-foreground">
                    Seen in verified reports: {a.platforms.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Topic Frequency
                </CardTitle>
              </CardHeader>
              <CardContent>
                {a.topicFreq.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No approved contributions yet — topic frequencies appear once reports are approved.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {a.topicFreq.map((t) => (
                      <li key={t.topic} className="flex items-center gap-3 text-sm">
                        <span className="w-36 shrink-0 truncate font-medium">{t.topic}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(t.count / maxTopic) * 100}%` }}
                          />
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
                <CardTitle className="text-base">Placement Drives & Eligibility</CardTitle>
              </CardHeader>
              <CardContent>
                {data.drives.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No campus drives announced yet.</p>
                ) : (
                  <ul className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto pr-1">
                    {data.drives.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{d.role}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(d.driveDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
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
                          {d.status === "OPEN" ? "embargo active" : "closed"}
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

          {/* Season Gap Alert */}
          {season2026Count === 0 && (
            <Alert className="border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20">
              <Sparkles className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <AlertTitle className="text-emerald-900 dark:text-emerald-200">
                Class of 2027: Be the First Contributor!
              </AlertTitle>
              <AlertDescription className="text-xs text-emerald-800/90 dark:text-emerald-300/90 flex flex-wrap items-center justify-between gap-2 pt-1">
                <span>
                  No 2026-27 OA reports for {c.name} yet. Submit the first approved report of this season
                  to earn an extra <strong>+25 coin bounty</strong>!
                </span>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => navigate({ name: "contribute" })}
                >
                  Submit 2026-27 Report
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Season Filter Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Filter Season:</span>
              <Button
                variant={reportSeason === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setReportSeason("all")}
              >
                All Seasons ({allReports.length})
              </Button>
              <Button
                variant={reportSeason === "2026-27" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setReportSeason("2026-27")}
              >
                2026-27 Only ({season2026Count})
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate({ name: "contribute" })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Submit Report
            </Button>
          </div>

          {!reportsData ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : allReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No OA reports visible yet"
              hint="Reports appear once their drive closes and a moderator approves them. Sat an OA recently? Contribute to unlock peer reports free."
              action={
                <Button size="sm" variant="outline" onClick={() => navigate({ name: "contribute" })}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden /> Submit an OA report
                </Button>
              }
            />
          ) : (
            allReports.map((r) => <ReportCard key={r.id} report={r} showCompany={false} />)
          )}
        </TabsContent>

        {/* ---------- experiences ---------- */}
        <TabsContent value="experiences" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => navigate({ name: "contribute" })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Share Experience
            </Button>
          </div>

          {!expData ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : expData.experiences.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No interview experiences yet for this company"
              hint="Share round-by-round interview loops, topics asked, and outcome to help peers prepare."
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

        {/* ---------- problem frequency (leetcode dataset) ---------- */}
        <TabsContent value="problems" className="mt-4 space-y-4">
          {/* Mandatory Attribution Banner */}
          <div className="rounded-xl border border-muted bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                LeetCode Company-Tag Frequency · Snapshot June 1, 2025
              </span>
              <a
                href="https://github.com/liquidslr/leetcode-company-wise-problems"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Upstream Repository <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-muted-foreground">
              Historical tagging frequency metadata only. This is not confirmed Online Assessment (OA)
              questions, nor Class of 2027 live exam material.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={problemWindow} onValueChange={setProblemWindow}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Time</SelectItem>
                  <SelectItem value="6M">Last 6 Months</SelectItem>
                  <SelectItem value="90D">Last 90 Days</SelectItem>
                  <SelectItem value="30D">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={problemDiff} onValueChange={setProblemDiff}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Diff</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                placeholder="Search problem title..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {problemsLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !problemsData || problemsData.items.length === 0 ? (
            <EmptyState
              icon={Code2}
              title="No problem frequency tags found"
              hint="Try clearing search filters or changing the time window."
            />
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Difficulty</th>
                      <th className="py-2.5 px-3">Window</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Topics</th>
                      <th className="py-2.5 px-3 text-right">LeetCode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {problemsData.items.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium">{p.title}</td>
                        <td className="py-2.5 px-3">
                          <DifficultyBadge level={p.difficulty as any} />
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {p.window}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">
                          {p.frequency}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {p.topics.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {p.url && (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]"
                            >
                              Practice <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ---------- question bank ---------- */}
        <TabsContent value="questions" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">Extracted Assessment Questions</h3>
              <p className="text-xs text-muted-foreground">
                Search individual coding and aptitude questions submitted by students across verified OA reports.
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder="Search statement text..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No questions indexed yet"
              hint="When students submit structured OA questions for this company, they appear here searchable by text."
            />
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <Card key={q.id || idx}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {q.type}
                        </Badge>
                        {q.title && <span className="font-semibold text-xs">{q.title}</span>}
                        <span className="text-xs text-muted-foreground">
                          · {q.reportRole} (by {q.reportAuthor})
                        </span>
                      </div>
                      <DifficultyBadge level={q.difficulty as any} />
                    </div>

                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/90">
                      {q.statementMd}
                    </pre>

                    {q.constraints && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-medium">Constraints:</span> {q.constraints}
                      </p>
                    )}

                    {q.sampleIO && (
                      <div className="rounded bg-muted/50 p-2 font-mono text-[11px] text-muted-foreground border">
                        {q.sampleIO}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------- doubts ---------- */}
        <TabsContent value="doubts" className="mt-4 space-y-4">
          <AskDoubtCard company={slug} companyName={c.name} />
          {!doubtsData ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : doubtsData.doubts.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No doubts yet"
              hint="Ask anonymously — juniors ask freely, placed seniors' answers rank higher."
            />
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
        <span className="font-semibold">Placement Drive Embargo:</span> companies reuse an OA across test
        slots, so questions tied to an active campus drive stay cryptographically hidden until a moderator
        closes the drive — preventing live exam leaks.
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
            <Input
              placeholder={`Question about ${companyName} (min 10 chars)`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
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
              <Button
                size="sm"
                disabled={title.trim().length < 10 || body.trim().length < 20 || ask.isPending}
                onClick={() => ask.mutate()}
              >
                {ask.isPending ? <Spinner className="h-4 w-4" /> : null} Post doubt
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { DoubtCard, DifficultyBadge };
