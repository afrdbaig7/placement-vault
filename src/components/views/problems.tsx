"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, NotebookPen, ChevronDown, ChevronUp, CheckSquare, Square, BookMarked } from "lucide-react";
import companiesData from "@/data/companies.json";
import problemsData from "@/data/problems.json";
import setsData from "@/data/sets.json";
import type { Company, Problem, PracticeSet } from "@/lib/types";
import { useProgress } from "@/lib/progress";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultyBadge, StreakPill, EmptyState } from "@/components/shared/bits";
import { cn } from "@/lib/utils";

const companies = companiesData as Company[];
const problems = problemsData as Record<string, Problem[]>;
const sets = setsData as PracticeSet[];
const companyMap = new Map(companies.map((c) => [c.slug, c]));

export function ProblemsView() {
  const { navigate } = useApp();
  const { solvedMap, streak, hydrate, toggleSolved, setNote, touchStreak } = useProgress();
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [windowFilter, setWindowFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    hydrate();
    touchStreak();
  }, [hydrate, touchStreak]);

  const rows = useMemo(() => {
    const source: { company: Company; problem: Problem }[] = [];
    const slugs = companyFilter === "all" ? Object.keys(problems) : [companyFilter];
    for (const slug of slugs) {
      const c = companyMap.get(slug);
      if (!c) continue;
      for (const p of problems[slug] ?? []) source.push({ company: c, problem: p });
    }
    return source.filter(({ problem }) => {
      if (difficulty !== "all" && problem.difficulty !== difficulty) return false;
      if (windowFilter !== "all" && problem.window !== windowFilter) return false;
      if (query && !problem.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [companyFilter, difficulty, windowFilter, query]);

  const solvedCount = rows.filter(({ company, problem }) => solvedMap[`${company.slug}:${problem.slug}`]?.solved).length;
  const progressPct = rows.length ? Math.round((solvedCount / rows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company-wise problems</h1>
          <p className="text-sm text-muted-foreground">
            Static lists updated through pull requests. Progress and notes live in your browser — solve on LeetCode.
          </p>
        </div>
        {streak > 0 && <StreakPill streak={streak} />}
      </div>

      {/* filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger aria-label="Filter by company">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger aria-label="Filter by difficulty">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any difficulty</SelectItem>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Select value={windowFilter} onValueChange={setWindowFilter}>
            <SelectTrigger aria-label="Filter by recency window">
              <SelectValue placeholder="Recency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any recency</SelectItem>
              <SelectItem value="6mo">Last 6 months</SelectItem>
              <SelectItem value="older">Older</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              className="pl-8"
              placeholder="Search problem title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search problems"
            />
          </div>
        </CardContent>
      </Card>

      {/* progress */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="min-w-48 flex-1">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">
                {solvedCount} / {rows.length} solved
              </span>
              <span className="text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} aria-label="Problems solved progress" />
          </div>
          <p className="text-xs text-muted-foreground">
            Stored in your browser only — the database stays free for reports, experiences and doubts.
          </p>
        </CardContent>
      </Card>

      {/* list */}
      {rows.length === 0 ? (
        <EmptyState icon={Search} title="No problems match those filters" hint="Try widening the difficulty or recency window." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="scrollbar-thin max-h-[32rem] divide-y overflow-y-auto" role="list">
              {rows.map(({ company, problem }) => {
                const key = `${company.slug}:${problem.slug}`;
                const solved = solvedMap[key]?.solved;
                const note = solvedMap[key]?.note ?? "";
                return (
                  <li key={key} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
                    <button
                      className="mt-0.5 shrink-0 text-primary"
                      onClick={() => toggleSolved(key)}
                      aria-label={solved ? `Mark ${problem.title} unsolved` : `Mark ${problem.title} solved`}
                      aria-pressed={solved}
                    >
                      {solved ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://leetcode.com/problems/${problem.slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "inline-flex items-center gap-1 font-medium hover:text-primary hover:underline",
                            solved && "text-muted-foreground line-through decoration-primary/40"
                          )}
                        >
                          {problem.title}
                          <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                        </a>
                        <DifficultyBadge level={problem.difficulty} />
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {problem.window}
                        </Badge>
                        <button
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                          onClick={() => setNotesOpen((s) => ({ ...s, [key]: !s[key] }))}
                          aria-expanded={notesOpen[key]}
                        >
                          <NotebookPen className="h-3.5 w-3.5" aria-hidden />
                          {note ? "note ✓" : "note"}
                          {notesOpen[key] ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
                        </button>
                      </div>
                      <button
                        className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => navigate({ name: "hub", company: company.slug })}
                      >
                        <CompanyLogo company={company} size="sm" className="h-4 w-4 rounded" />
                        {company.name}
                      </button>
                      {notesOpen[key] && (
                        <Textarea
                          className="mt-2 text-sm"
                          rows={2}
                          placeholder="Your approach, gotchas, what the interviewer asked… (saved in browser)"
                          value={note}
                          onChange={(e) => setNote(key, e.target.value)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* practice sets */}
      <section aria-label="Practice sets">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Aptitude, verbal, CS-core & SQL sets</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Service companies test these harder than LeetCode — practice them before TCS, Infosys, Wipro and friends.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((s) => (
            <Card key={s.slug}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookMarked className="h-4 w-4 text-primary" aria-hidden />
                  {s.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{s.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.topics.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      Sample questions <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="scrollbar-thin mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3 text-sm">
                      {s.sampleQuestions.map((q, i) => (
                        <li key={i}>
                          <p className="font-medium">{q.q}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{q.answer}</p>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
                <div className="flex flex-wrap gap-2">
                  {s.resources.map((r) => (
                    <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                      {r.name} ↗
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
