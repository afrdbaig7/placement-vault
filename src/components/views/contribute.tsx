"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, post } from "@/lib/api";
import { useApp, isModRole } from "@/lib/store";
import type { DriveView } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Coins,
  FileText,
  Gift,
  Info,
  ShieldAlert,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  Search,
  Eye,
  RotateCcw,
} from "lucide-react";
import { DifficultyBadge, Spinner } from "@/components/shared/bits";

interface CompanyOption {
  slug: string;
  name: string;
  sectors?: string[];
}

const TOPIC_OPTIONS = [
  "Arrays",
  "Strings",
  "Hashing",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Dynamic Programming",
  "Graphs",
  "BFS/DFS",
  "Trees",
  "Heaps",
  "Greedy",
  "Recursion",
  "Math",
  "Bit Manipulation",
  "Aptitude",
  "Verbal",
  "SQL",
  "OS/DBMS/OOP",
];

const PLATFORMS = [
  "HackerRank",
  "Codility",
  "TCS iON",
  "Mettl",
  "AMCAT",
  "CoCubes",
  "eLitmus",
  "HackerEarth",
  "Company's own platform",
  "Google Form",
  "Other",
];

const ROUND_TYPES = [
  { value: "TECHNICAL", label: "Technical Interview" },
  { value: "HR", label: "HR / Fitment" },
  { value: "MANAGERIAL", label: "Managerial / Project" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "GROUP_DISCUSSION", label: "Group Discussion" },
  { value: "OTHER", label: "Other" },
];

export function ContributeView() {
  const { session } = useApp();
  const mod = isModRole(session?.user?.role);
  const verified = Boolean(session?.user?.rollVerified) || mod;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Student Contribution Hub</h1>
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
            2026-27 Hiring Season Active
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Real questions from real students. Fresh submissions for the Class of 2027 earn bonus coins
          and unlock peer reports for free (give-to-get).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <RateCard
          icon={FileText}
          title="OA Report"
          amount="+50 coins"
          body="Structured questions + platform details in your own words."
        />
        <RateCard
          icon={Coins}
          title="Interview Loop"
          amount="+40 coins"
          body="Round-by-round technical & HR breakdown with offer outcome."
        />
        <RateCard
          icon={Sparkles}
          title="2026-27 Bounty"
          amount="+25 extra"
          body="Awarded for the first approved 2026-27 report of any company."
        />
        <RateCard
          icon={Gift}
          title="Give-to-Get"
          amount="Free Unlocks"
          body="One approved contribution unlocks that company's OA library forever."
        />
      </div>

      {!session?.user ? (
        <Alert>
          <Info className="h-4 w-4" aria-hidden />
          <AlertDescription>Sign in with Google to contribute.</AlertDescription>
        </Alert>
      ) : !verified ? (
        <Alert>
          <ShieldAlert className="h-4 w-4" aria-hidden />
          <AlertDescription>
            A moderator must verify your roll number before you can contribute. Once verified, all
            features unlock automatically.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="oa" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="oa" className="gap-1.5">
            <FileText className="h-4 w-4" /> OA Report
          </TabsTrigger>
          <TabsTrigger value="experience" className="gap-1.5">
            <Coins className="h-4 w-4" /> Interview Loop
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Propose Company
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oa" className="mt-4">
          <OaReportMultiStepForm
            disabled={!verified}
            postsToday={session?.postsToday ?? 0}
            cap={session?.caps.dailyPosts ?? 5}
          />
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <InterviewExperienceMultiStepForm disabled={!verified} />
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <ProposeCompanyForm disabled={!verified} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RateCard({
  icon: Icon,
  title,
  amount,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  amount: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {amount}
          </Badge>
        </div>
        <p className="mt-2 font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

// ==========================================
// 1. MULTI-STEP OA REPORT BUILDER
// ==========================================

interface QuestionDraft {
  type: "CODING" | "MCQ" | "SQL" | "APTITUDE" | "SUBJECTIVE";
  title: string;
  statementMd: string;
  constraints: string;
  sampleIO: string;
  topics: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  linkedProblemId: string | null;
  marks: number | null;
}

function loadOaDraft(): Partial<{
  companySlug: string;
  role: string;
  platform: string;
  summary: string;
  topics: string[];
  questions: QuestionDraft[];
}> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem("draft_oa_v2");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function OaReportMultiStepForm({
  disabled,
  postsToday,
  cap,
}: {
  disabled: boolean;
  postsToday: number;
  cap: number;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [initialDraft] = useState(loadOaDraft);

  // Form State
  const [companySlug, setCompanySlug] = useState(initialDraft.companySlug ?? "");
  const [driveId, setDriveId] = useState("");
  const [hiringSeason, setHiringSeason] = useState("2026-27");
  const [graduatingBatch, setGraduatingBatch] = useState(2027);
  const [role, setRole] = useState(initialDraft.role ?? "Software Engineer");
  const [platform, setPlatform] = useState(initialDraft.platform ?? "");
  const [durationMin, setDurationMin] = useState(60);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [outcome, setOutcome] = useState<"Cleared" | "Not cleared" | "Did not attempt">("Cleared");
  const [summary, setSummary] = useState(initialDraft.summary ?? "");
  const [topics, setTopics] = useState<string[]>(initialDraft.topics ?? []);
  const [questions, setQuestions] = useState<QuestionDraft[]>(initialDraft.questions ?? []);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [ndaConfirmed, setNdaConfirmed] = useState(false);

  // Queries
  const { data: companiesRes } = useQuery<{ companies: CompanyOption[] }>({
    queryKey: ["companies"],
    queryFn: () => api<{ companies: CompanyOption[] }>("/api/companies"),
  });
  const companies = companiesRes?.companies ?? [];

  const { data: drivesRes } = useQuery<{ drives: DriveView[] }>({
    queryKey: ["drives"],
    queryFn: () => api<{ drives: DriveView[] }>("/api/drives"),
  });
  const openDrives = drivesRes?.drives.filter((d) => d.status === "OPEN") ?? [];

  useEffect(() => {
    try {
      localStorage.setItem(
        "draft_oa_v2",
        JSON.stringify({ companySlug, role, platform, summary, topics, questions })
      );
    } catch {
      // ignore
    }
  }, [companySlug, role, platform, summary, topics, questions]);

  function clearDraft() {
    localStorage.removeItem("draft_oa_v2");
    setCompanySlug("");
    setRole("Software Engineer");
    setPlatform("");
    setSummary("");
    setTopics([]);
    setQuestions([]);
    setStep(1);
    toast.info("Draft cleared");
  }

  const submit = useMutation({
    mutationFn: () =>
      post<{ report: { id: string }; message: string }>("/api/reports", {
        companySlug: companySlug || undefined,
        driveId: driveId || null,
        hiringSeason,
        graduatingBatch,
        role,
        platform,
        durationMin,
        difficulty,
        outcome,
        summary,
        text: summary,
        topics,
        isAnonymous,
        ndaConfirmation: ndaConfirmed,
        questions,
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      clearDraft();
      void qc.invalidateQueries({ queryKey: ["reports"] });
      void useApp.getState().refreshSession();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed"),
  });

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        type: "CODING",
        title: "",
        statementMd: "",
        constraints: "",
        sampleIO: "",
        topics: [],
        difficulty: "Medium",
        linkedProblemId: null,
        marks: null,
      },
    ]);
  }

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Submit an Online Assessment (OA) Report</CardTitle>
            <CardDescription>
              Step {step} of 3: {step === 1 ? "Exam Details" : step === 2 ? "Questions Builder" : "Preview & Submit"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Daily cap: {postsToday}/{cap}
            </Badge>
            <Button variant="ghost" size="sm" onClick={clearDraft} title="Reset form">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Select value={companySlug} onValueChange={setCompanySlug}>
                  <SelectTrigger aria-label="Target Company">
                    <SelectValue placeholder="Select target company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Hiring Season</Label>
                <Select value={hiringSeason} onValueChange={setHiringSeason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-27">2026-27 (Class of 2027) · Priority</SelectItem>
                    <SelectItem value="2025-26">2025-26 (Class of 2026)</SelectItem>
                    <SelectItem value="2024-25">2024-25 (Older)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {openDrives.length > 0 && (
              <div className="space-y-1.5">
                <Label>Campus Drive (Optional — links to placement embargo)</Label>
                <Select value={driveId} onValueChange={setDriveId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select active drive (or leave blank for off-campus)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Off-Campus / General Assessment</SelectItem>
                    {openDrives.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.company} · {d.role} (Drive on {new Date(d.driveDate).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="SDE-1 / Intern" />
              </div>

              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Testing Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Duration (Minutes)</Label>
                <Input
                  type="number"
                  min={10}
                  max={240}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Overall Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assessment Outcome</Label>
                <Select value={outcome} onValueChange={(v) => setOutcome(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cleared">Cleared (Called for Interview)</SelectItem>
                    <SelectItem value="Not cleared">Not Cleared</SelectItem>
                    <SelectItem value="Did not attempt">Did Not Attempt / Awaiting Result</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Public Overview & Vibe (min 20 chars)</Label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Time pressure, pattern, proctoring strictness, key advice for peers..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Key Algorithm / Domain Topics</Label>
              <div className="flex flex-wrap gap-1.5">
                {TOPIC_OPTIONS.map((t) => (
                  <Badge
                    key={t}
                    variant={topics.includes(t) ? "default" : "outline"}
                    className="cursor-pointer font-normal"
                    onClick={() => toggleTopic(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                disabled={!companySlug || !platform || summary.trim().length < 20}
                onClick={() => setStep(2)}
              >
                Next: Add Questions ({questions.length}) &rarr;
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Add Assessment Questions</h3>
                <p className="text-xs text-muted-foreground">
                  Describe questions in your own words. Search to link an existing LeetCode problem so it joins
                  the company's problem tags.
                </p>
              </div>
              <Button size="sm" onClick={addQuestion} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium">No questions added yet</p>
                <p className="text-xs text-muted-foreground">
                  Click &ldquo;Add Question&rdquo; to input coding questions, aptitude MCQs, or SQL challenges.
                </p>
                <Button size="sm" onClick={addQuestion} className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" /> Add Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <Card key={idx} className="relative border-muted/80 bg-muted/20">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">Question #{idx + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive"
                          onClick={() => removeQuestion(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Question Type</Label>
                          <Select
                            value={q.type}
                            onValueChange={(v) => updateQuestion(idx, { type: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CODING">Coding Problem</SelectItem>
                              <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                              <SelectItem value="SQL">SQL Query</SelectItem>
                              <SelectItem value="APTITUDE">Aptitude / Quantitative</SelectItem>
                              <SelectItem value="SUBJECTIVE">Subjective / Core CS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Difficulty</Label>
                          <Select
                            value={q.difficulty}
                            onValueChange={(v) => updateQuestion(idx, { difficulty: v as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Question Title (Optional)</Label>
                          <Input
                            value={q.title}
                            onChange={(e) => updateQuestion(idx, { title: e.target.value })}
                            placeholder="e.g. Subarray with Given Sum"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Question Statement (Own Words)</Label>
                        <Textarea
                          rows={3}
                          value={q.statementMd}
                          onChange={(e) => updateQuestion(idx, { statementMd: e.target.value })}
                          placeholder="Describe the problem, input format, and goal in your own words..."
                        />
                      </div>

                      {q.type === "CODING" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Constraints (Optional)</Label>
                            <Input
                              value={q.constraints}
                              onChange={(e) => updateQuestion(idx, { constraints: e.target.value })}
                              placeholder="e.g. 1 <= N <= 10^5, time limit 1.0s"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sample Input / Output (Optional)</Label>
                            <Input
                              value={q.sampleIO}
                              onChange={(e) => updateQuestion(idx, { sampleIO: e.target.value })}
                              placeholder="e.g. Input: [2, 7, 11, 15], Target: 9 -> Output: [0, 1]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Problem Linker */}
                      <ProblemPicker
                        linkedProblemId={q.linkedProblemId}
                        onSelect={(id) => updateQuestion(idx, { linkedProblemId: id })}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                &larr; Back
              </Button>
              <Button onClick={() => setStep(3)}>Next: Preview & Submit &rarr;</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <h4 className="font-semibold text-sm">Submission Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Company:</span>{" "}
                  <span className="font-medium">{companySlug}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Season:</span>{" "}
                  <Badge variant="outline">{hiringSeason}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Platform:</span>{" "}
                  <span className="font-medium">{platform}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>{" "}
                  <span className="font-medium">{role}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Questions:</span>{" "}
                  <span className="font-medium">{questions.length} question(s)</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Outcome:</span>{" "}
                  <span className="font-medium">{outcome}</span>
                </div>
              </div>
            </div>

            {/* Anonymous Option */}
            <div className="flex items-start gap-3 rounded-xl border p-3">
              <Checkbox
                id="oa-anonymous"
                checked={isAnonymous}
                onCheckedChange={(c) => setIsAnonymous(Boolean(c))}
              />
              <div className="space-y-1">
                <Label htmlFor="oa-anonymous" className="cursor-pointer font-medium text-sm">
                  Post anonymously
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your identity will be completely hidden from public view. Only administrators and
                  moderators retain access for trust and abuse prevention.
                </p>
              </div>
            </div>

            {/* Mandatory NDA / Compliance Notice */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <Checkbox
                id="oa-nda"
                checked={ndaConfirmed}
                onCheckedChange={(c) => setNdaConfirmed(Boolean(c))}
              />
              <div className="space-y-1">
                <Label htmlFor="oa-nda" className="cursor-pointer font-medium text-sm text-amber-900 dark:text-amber-200">
                  Non-Disclosure & Original Content Confirmation
                </Label>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  I confirm that all question descriptions are written in my own words. I have not
                  uploaded direct exam screenshots, confidential source code, or NDA-protected proprietary
                  material.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                &larr; Back
              </Button>
              <Button
                className="gap-2"
                disabled={disabled || !ndaConfirmed || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? <Spinner className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                Submit Report (+50 coins on approval)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// 2. MULTI-STEP INTERVIEW EXPERIENCE BUILDER
// ==========================================

interface RoundDraft {
  name: string;
  type: string;
  durationMin: number;
  notes: string;
  questions: Array<{ text: string; topics: string[]; difficulty: string; linkedProblemId: string | null }>;
}

function loadExpDraft(): Partial<{
  company: string;
  role: string;
  tips: string;
  text: string;
  rounds: RoundDraft[];
}> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem("draft_exp_v2");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function InterviewExperienceMultiStepForm({ disabled }: { disabled: boolean }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [initialDraft] = useState(loadExpDraft);

  const [company, setCompany] = useState(initialDraft.company ?? "");
  const [role, setRole] = useState(initialDraft.role ?? "Software Engineer Intern");
  const [hiringSeason, setHiringSeason] = useState("2026-27");
  const [graduatingBatch, setGraduatingBatch] = useState(2027);
  const [offerStatus, setOfferStatus] = useState<"OFFERED" | "REJECTED" | "WAITLISTED" | "NO_OFFER">("OFFERED");
  const [overallDifficulty, setOverallDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [platform, setPlatform] = useState("On-Campus");
  const [topics] = useState<string[]>([]);
  const [tips, setTips] = useState(initialDraft.tips ?? "");
  const [text, setText] = useState(initialDraft.text ?? "");
  const [rounds, setRounds] = useState<RoundDraft[]>(
    initialDraft.rounds && initialDraft.rounds.length > 0
      ? initialDraft.rounds
      : [
          {
            name: "Technical Round 1",
            type: "TECHNICAL",
            durationMin: 45,
            notes: "DSA, time complexity, and live coding.",
            questions: [],
          },
        ]
  );
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [ndaConfirmed, setNdaConfirmed] = useState(false);

  const { data: compData } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api<{ companies: CompanyOption[] }>("/api/companies"),
  });
  const companyList = compData?.companies ?? [];

  useEffect(() => {
    try {
      localStorage.setItem("draft_exp_v2", JSON.stringify({ company, role, tips, text, rounds }));
    } catch {
      // ignore
    }
  }, [company, role, tips, text, rounds]);

  function clearDraft() {
    localStorage.removeItem("draft_exp_v2");
    setCompany("");
    setRole("Software Engineer");
    setTips("");
    setText("");
    setRounds([]);
    setStep(1);
    toast.info("Draft reset");
  }

  const submit = useMutation({
    mutationFn: () =>
      post<{ message: string }>("/api/experiences", {
        company,
        role,
        hiringSeason,
        graduatingBatch,
        offerStatus,
        overallDifficulty,
        platform,
        difficulty: overallDifficulty,
        outcome: offerStatus === "OFFERED" ? "Offer Received" : offerStatus,
        round: `${rounds.length} Rounds`,
        topics,
        tips,
        text,
        isAnonymous,
        ndaConfirmation: ndaConfirmed,
        rounds,
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      clearDraft();
      void qc.invalidateQueries({ queryKey: ["experiences"] });
      void useApp.getState().refreshSession();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed"),
  });

  function addRound() {
    setRounds((prev) => [
      ...prev,
      {
        name: `Round ${prev.length + 1}`,
        type: "TECHNICAL",
        durationMin: 45,
        notes: "",
        questions: [],
      },
    ]);
  }

  function updateRound(index: number, patch: Partial<RoundDraft>) {
    setRounds((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeRound(index: number) {
    setRounds((prev) => prev.filter((_, i) => i !== index));
  }

  function addRoundQuestion(roundIndex: number) {
    setRounds((prev) => {
      const copy = [...prev];
      copy[roundIndex].questions.push({
        text: "",
        topics: [],
        difficulty: "Medium",
        linkedProblemId: null,
      });
      return copy;
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Share an Interview Loop Experience</CardTitle>
            <CardDescription>
              Step {step} of 3: {step === 1 ? "Role & Offer" : step === 2 ? "Rounds Loop Builder" : "Tips & Submit"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={clearDraft} title="Reset form">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger aria-label="Company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyList.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Hiring Season</Label>
                <Select value={hiringSeason} onValueChange={setHiringSeason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-27">2026-27 (Class of 2027) · Priority</SelectItem>
                    <SelectItem value="2025-26">2025-26</SelectItem>
                    <SelectItem value="2024-25">2024-25</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="SDE Intern" />
              </div>

              <div className="space-y-1.5">
                <Label>Offer Outcome</Label>
                <Select value={offerStatus} onValueChange={(v) => setOfferStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFERED">Offer Received 🎉</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
                    <SelectItem value="NO_OFFER">Declined / Withdrew</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Overall Difficulty</Label>
                <Select
                  value={overallDifficulty}
                  onValueChange={(v) => setOverallDifficulty(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button disabled={!company || !role} onClick={() => setStep(2)}>
                Next: Build Interview Rounds ({rounds.length}) &rarr;
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Interview Rounds Builder</h3>
                <p className="text-xs text-muted-foreground">
                  Record each interview stage (Technical, HR, Managerial, System Design).
                </p>
              </div>
              <Button size="sm" onClick={addRound} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Round
              </Button>
            </div>

            <div className="space-y-4">
              {rounds.map((rd, rIdx) => (
                <Card key={rIdx} className="border-muted/80 bg-muted/20">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Round #{rIdx + 1}</Badge>
                      {rounds.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive"
                          onClick={() => removeRound(rIdx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Round Name</Label>
                        <Input
                          value={rd.name}
                          onChange={(e) => updateRound(rIdx, { name: e.target.value })}
                          placeholder="e.g. Technical Round 1"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Round Type</Label>
                        <Select
                          value={rd.type}
                          onValueChange={(v) => updateRound(rIdx, { type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROUND_TYPES.map((rt) => (
                              <SelectItem key={rt.value} value={rt.value}>
                                {rt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Duration (Min)</Label>
                        <Input
                          type="number"
                          value={rd.durationMin}
                          onChange={(e) => updateRound(rIdx, { durationMin: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Round Notes & Focus</Label>
                      <Input
                        value={rd.notes}
                        onChange={(e) => updateRound(rIdx, { notes: e.target.value })}
                        placeholder="Interviewer demeanor, coding environment, resume deep-dive..."
                      />
                    </div>

                    {/* Questions in this round */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Questions Asked in this Round</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addRoundQuestion(rIdx)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Question
                        </Button>
                      </div>

                      {rd.questions.map((q, qIdx) => (
                        <div key={qIdx} className="rounded border bg-background/50 p-2 space-y-2">
                          <Input
                            value={q.text}
                            onChange={(e) => {
                              const copy = [...rounds];
                              copy[rIdx].questions[qIdx].text = e.target.value;
                              setRounds(copy);
                            }}
                            placeholder="Question statement / prompt..."
                          />
                          <ProblemPicker
                            linkedProblemId={q.linkedProblemId}
                            onSelect={(id) => {
                              const copy = [...rounds];
                              copy[rIdx].questions[qIdx].linkedProblemId = id;
                              setRounds(copy);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                &larr; Back
              </Button>
              <Button onClick={() => setStep(3)}>Next: Tips & Submit &rarr;</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Overall Interview Experience & Tips (min 30 chars)</Label>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Give future candidates your detailed perspective: preparation strategy, questions asked, behavioral tips, timeline..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Preparation Advice & Key Takeaway (Optional)</Label>
              <Input
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                placeholder="e.g. Master tree traversals and explain thought process aloud before typing code."
              />
            </div>

            {/* Anonymous */}
            <div className="flex items-start gap-3 rounded-xl border p-3">
              <Checkbox
                id="exp-anonymous"
                checked={isAnonymous}
                onCheckedChange={(c) => setIsAnonymous(Boolean(c))}
              />
              <div className="space-y-1">
                <Label htmlFor="exp-anonymous" className="cursor-pointer font-medium text-sm">
                  Post anonymously
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your identity is hidden from student views. Stored internally only for moderation.
                </p>
              </div>
            </div>

            {/* NDA checkbox */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <Checkbox
                id="exp-nda"
                checked={ndaConfirmed}
                onCheckedChange={(c) => setNdaConfirmed(Boolean(c))}
              />
              <div className="space-y-1">
                <Label htmlFor="exp-nda" className="cursor-pointer font-medium text-sm text-amber-900 dark:text-amber-200">
                  NDA & Fair Sharing Declaration
                </Label>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  I confirm that all reflections are written in my own words without disclosing proprietary
                  confidential employer documents.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                &larr; Back
              </Button>
              <Button
                className="gap-2"
                disabled={disabled || text.trim().length < 30 || !ndaConfirmed || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? <Spinner className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                Submit Experience (+40 coins)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// 3. PROPOSE COMPANY (FUZZY SEARCH FIRST)
// ==========================================

function ProposeCompanyForm({ disabled }: { disabled: boolean }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [sector, setSector] = useState("Fintech");
  const [roles, setRoles] = useState("SDE, Analyst");
  const [aliases, setAliases] = useState("");

  const { data: searchData, isFetching } = useQuery({
    queryKey: ["company-search", query],
    queryFn: () =>
      api<{
        matches: Array<{ id: string; slug: string; name: string; similarity: number; status: string }>;
        warning: string | null;
        exactMatch: boolean;
      }>(`/api/companies/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });

  const submit = useMutation({
    mutationFn: () =>
      post<{ company: { slug: string }; message: string }>("/api/companies", {
        name,
        website: website || undefined,
        sectors: sector.split(",").map((s) => s.trim()).filter(Boolean),
        hiringRoles: roles.split(",").map((r) => r.trim()).filter(Boolean),
        aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      setName("");
      setWebsite("");
      setQuery("");
      void qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Creation failed"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Propose a New Company</CardTitle>
        <CardDescription>
          Don&apos;t see your recruiting company? Check our directory first to prevent duplicate entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Search First */}
        <div className="space-y-2">
          <Label>Search Directory First</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!name) setName(e.target.value);
              }}
              placeholder="Search company name (e.g. Stripe, Razorpay, DE Shaw)..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Fuzzy match suggestions */}
        {searchData?.warning && (
          <Alert className="border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
            <Info className="h-4 w-4 text-amber-800 dark:text-amber-300" />
            <AlertTitle className="text-amber-900 dark:text-amber-200">
              Potential Duplicate Match Found
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-800/90 dark:text-amber-300/90 space-y-2">
              <p>{searchData.warning}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {searchData.matches.map((m) => (
                  <Badge key={m.slug} variant="secondary" className="gap-1">
                    {m.name} ({Math.round(m.similarity * 100)}% match)
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Propose New Company Profile</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Official legal or recruiter name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Career / Official Website (Optional)</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Industry Sectors (comma-separated)</Label>
              <Input
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Fintech, E-commerce, IT Services"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Typical Campus Roles</Label>
              <Input
                value={roles}
                onChange={(e) => setRoles(e.target.value)}
                placeholder="Software Engineer, Data Analyst"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Known Aliases / Shortforms (comma-separated)</Label>
            <Input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="e.g. FK, MSFT, AWS"
            />
          </div>

          <Button
            className="w-full gap-2"
            disabled={disabled || name.trim().length < 2 || submit.isPending || isFetching}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? <Spinner className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            Submit Company for Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// 4. LEETCODE PROBLEM PICKER COMPONENT
// ==========================================

function ProblemPicker({
  linkedProblemId,
  onSelect,
}: {
  linkedProblemId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["problems-picker", search],
    queryFn: () =>
      api<{ items: Array<{ id: string; title: string; difficulty: string; url: string | null }> }>(
        `/api/problems?search=${encodeURIComponent(search)}&limit=6`
      ),
    enabled: search.trim().length >= 2,
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
          <LinkIcon className="h-3 w-3" /> Link to LeetCode Problem (Optional)
        </Label>
        {linkedProblemId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onSelect(null)}
          >
            Unlink
          </Button>
        )}
      </div>

      <div className="relative">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          placeholder="Search problem title to link (e.g. Two Sum, Course Schedule)..."
          className="text-xs"
        />
        {open && data && data.items.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {data.items.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-left hover:bg-accent"
                onClick={() => {
                  onSelect(p.id);
                  setSearch(p.title);
                  setOpen(false);
                }}
              >
                <span className="font-medium truncate">{p.title}</span>
                <DifficultyBadge level={p.difficulty as any} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
