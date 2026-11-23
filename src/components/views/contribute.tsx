"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, post } from "@/lib/api";
import { useApp, isModRole } from "@/lib/store";
import type { DriveView } from "@/lib/types";
import companiesData from "@/data/companies.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, FileText, Gift, Info, ShieldAlert } from "lucide-react";
import { Spinner } from "@/components/shared/bits";

const companies = companiesData as Company2[];
type Company2 = (typeof companies)[number];

const TOPIC_OPTIONS = ["Arrays", "Strings", "Hashing", "Two Pointers", "Sliding Window", "Binary Search", "Dynamic Programming", "Graphs", "BFS/DFS", "Trees", "Heaps", "Greedy", "Recursion", "Math", "Bit Manipulation", "Aptitude", "Verbal", "SQL", "OS/DBMS/OOP"];
const PLATFORMS = ["HackerRank", "Codility", "TCS iON", "AMCAT", "Cocubes", "Company's own platform", "Google Form", "Other"];
const ROUNDS = ["Round 1", "Round 2", "Technical Interview", "HR Round", "Full loop", "Other"];

export function ContributeView() {
  const { session } = useApp();
  const mod = isModRole(session?.user?.role);
  const verified = Boolean(session?.user?.rollVerified) || mod;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contribute & earn coins</h1>
        <p className="text-sm text-muted-foreground">
          A contribution is always worth more than an unlock costs — contributors never run dry.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <RateCard icon={FileText} title="OA report" amount="+50" body="Structured form + question text in your own words, no screenshots." />
        <RateCard icon={Coins} title="Experience" amount="+40" body="Full interview loop write-up with round, platform, topics, difficulty, outcome." />
        <RateCard icon={Gift} title="Give-to-get" amount="free unlocks" body="One approved contribution for a company unlocks that company's other OAs for free, forever." />
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
            A moderator must verify your roll number before you can contribute. Until then you can browse everything.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <OaReportForm disabled={!verified} postsToday={session?.postsToday ?? 0} cap={session?.caps.dailyPosts ?? 5} />
        <ExperienceForm disabled={!verified} />
      </div>
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
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">{amount}</Badge>
        </div>
        <p className="mt-2 font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function OaReportForm({ disabled, postsToday, cap }: { disabled: boolean; postsToday: number; cap: number }) {
  const qc = useQueryClient();
  const { data: drivesData } = useQuery({
    queryKey: ["drives"],
    queryFn: () => api<{ drives: DriveView[] }>("/api/drives"),
  });
  const openDrives = (drivesData?.drives ?? []).filter((d) => d.status === "OPEN");
  const closedDrives = (drivesData?.drives ?? []).filter((d) => d.status === "CLOSED");

  const [driveId, setDriveId] = useState("");
  const [round, setRound] = useState("");
  const [platform, setPlatform] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [outcome, setOutcome] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [text, setText] = useState("");

  const selectedDrive = [...openDrives, ...closedDrives].find((d) => d.id === driveId);

  const submit = useMutation({
    mutationFn: () =>
      post<{ message: string }>("/api/reports", { driveId, round, platform, difficulty, outcome, topics, summary, text }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Submitted for moderation");
      setDriveId(""); setRound(""); setPlatform(""); setDifficulty(""); setOutcome(""); setTopics([]); setSummary(""); setText("");
      void qc.invalidateQueries({ queryKey: ["reports"] });
      void useApp.getState().refreshSession();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed"),
  });

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          Submit an OA report
          <Badge variant="outline">
            {postsToday}/{cap} posts today
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-violet-300/60 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          <AlertDescription>
            Reports are tied to a drive and stay <span className="font-semibold">hidden until a moderator closes the drive</span> —
            no mid-drive leaks. Own words only, no screenshots.
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label>Which drive?</Label>
          <Select value={driveId} onValueChange={setDriveId}>
            <SelectTrigger aria-label="Drive">
              <SelectValue placeholder="Pick the drive you sat" />
            </SelectTrigger>
            <SelectContent>
              <p className="px-3 py-1.5 text-xs font-medium text-violet-700">Open (embargoed)</p>
              {openDrives.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.company} — {d.role} ({new Date(d.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                </SelectItem>
              ))}
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Past drives</p>
              {closedDrives.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.company} — {d.role} (closed)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDrive?.status === "OPEN" && (
            <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
              This drive is open — your report will be under embargo until it closes.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Round</Label>
            <Select value={round} onValueChange={setRound}>
              <SelectTrigger aria-label="Round"><SelectValue placeholder="Round" /></SelectTrigger>
              <SelectContent>{ROUNDS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger aria-label="Platform"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger aria-label="Difficulty"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger aria-label="Outcome"><SelectValue placeholder="Outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cleared">Cleared</SelectItem>
                <SelectItem value="Not cleared">Not cleared</SelectItem>
                <SelectItem value="Did not attempt">Did not attempt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Topics (structured, so they aggregate)</Label>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTopic(t)}
                aria-pressed={topics.includes(t)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${topics.includes(t) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Public summary (no question text here)</Label>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Pattern, vibe, time pressure — min 20 chars" />
        </div>
        <div className="space-y-1.5">
          <Label>Question text (own words — this is the gated part)</Label>
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe each question in your own words… (min 30 chars)" />
        </div>
        <Button
          className="w-full gap-2"
          disabled={disabled || !driveId || !round || !platform || !difficulty || !outcome || summary.length < 20 || text.length < 30 || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? <Spinner className="h-4 w-4" /> : <Coins className="h-4 w-4" />} Submit report (+50 coins on approval)
        </Button>
      </CardContent>
    </Card>
  );
}

function ExperienceForm({ disabled }: { disabled: boolean }) {
  const qc = useQueryClient();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [round, setRound] = useState("");
  const [platform, setPlatform] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [outcome, setOutcome] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [text, setText] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      post<{ message: string }>("/api/experiences", { company, role, round, platform, difficulty, outcome, topics, text }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Submitted for moderation");
      setCompany(""); setRole(""); setRound(""); setPlatform(""); setDifficulty(""); setOutcome(""); setTopics([]); setText("");
      void qc.invalidateQueries({ queryKey: ["experiences"] });
      void useApp.getState().refreshSession();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed"),
  });

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Share an interview experience</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger aria-label="Company"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="SDE Intern" />
          </div>
          <div className="space-y-1.5">
            <Label>Round(s) covered</Label>
            <Select value={round} onValueChange={setRound}>
              <SelectTrigger aria-label="Round"><SelectValue placeholder="Round" /></SelectTrigger>
              <SelectContent>{ROUNDS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Teams / Chime / on-campus…" />
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger aria-label="Difficulty"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger aria-label="Outcome"><SelectValue placeholder="Outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Selected">Selected</SelectItem>
                <SelectItem value="Not selected">Not selected</SelectItem>
                <SelectItem value="Cleared Round 1">Cleared Round 1</SelectItem>
                <SelectItem value="Did not attempt">Did not attempt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Topics</Label>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_OPTIONS.slice(0, 14).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTopic(t)}
                aria-pressed={topics.includes(t)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${topics.includes(t) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Your write-up (public once approved)</Label>
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="How each round went, what they asked, what you'd do differently… (min 50 chars)" />
        </div>
        <Separator />
        <Button
          className="w-full gap-2"
          disabled={disabled || !company || !role || !round || !platform || !difficulty || !outcome || text.length < 50 || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? <Spinner className="h-4 w-4" /> : <Coins className="h-4 w-4" />} Submit experience (+40 coins on approval)
        </Button>
      </CardContent>
    </Card>
  );
}
