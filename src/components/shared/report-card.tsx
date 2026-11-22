"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { post } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { ReportView } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultyBadge, EmbargoBadge, PlacedBadge, Spinner } from "@/components/shared/bits";
import { FlagDialog } from "@/components/shared/flag-dialog";
import { ArrowUpCircle, Coins, Flag, Lock, LockOpen, Sparkles } from "lucide-react";

export function ReportCard({ report, showCompany = true }: { report: ReportView; showCompany?: boolean }) {
  const { session, setSignInOpen } = useApp();
  const qc = useQueryClient();
  const [flagOpen, setFlagOpen] = useState(false);
  const company = session?.contributionCompanies.includes(report.company);
  const canAfford = (session?.balance ?? 0) >= report.unlockCost;

  const unlock = useMutation({
    mutationFn: () => post<{ free?: boolean; alreadyUnlocked?: boolean }>("/api/unlock", { reportId: report.id }),
    onSuccess: (res) => {
      toast.success(
        res.free
          ? "Unlocked free — your contribution earned this (give-to-get)"
          : "Unlocked! The spend and unlock were written in one transaction."
      );
      void qc.invalidateQueries({ queryKey: ["reports"] });
      void qc.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Unlock failed"),
  });

  const toggleVote = useMutation({
    mutationFn: () => post("/api/votes", { targetType: "REPORT", targetId: report.id }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["reports"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Vote failed"),
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start gap-3">
          {showCompany && <CompanyLogo company={{ name: report.company, color: colorFor(report.company) }} />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{report.driveRole}</span>
              <span className="text-muted-foreground">·</span>
              <span>{report.round}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{report.platform}</span>
              {report.underEmbargo && <EmbargoBadge />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>by {report.author.name}</span>
              {report.author.isPlaced && <PlacedBadge company={report.author.placedCompany!} />}
              <span>{new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DifficultyBadge level={report.difficulty} />
            <Badge variant="outline" className={report.outcome === "Cleared" ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : undefined}>
              {report.outcome}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {report.topics.map((t) => (
            <Badge key={t} variant="secondary" className="font-normal">
              {t}
            </Badge>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{report.summary}</p>

        {/* gated body */}
        {report.gated ? (
          <div className="rounded-xl border border-dashed border-amber-300/70 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                <Lock className="h-4 w-4" aria-hidden />
                Question text locked
              </div>
              {report.unlockCost === 0 ? (
                <Button size="sm" className="gap-1.5" onClick={() => (session?.user ? unlock.mutate() : setSignInOpen(true))}>
                  {unlock.isPending ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {company || report.freeUnlock ? "Unlock free (give-to-get)" : report.underEmbargo ? "Author & mods only" : "Unlock free"}
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5" onClick={() => (session?.user ? unlock.mutate() : setSignInOpen(true))}>
                  {unlock.isPending ? <Spinner className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                  Unlock for {report.unlockCost} coins
                </Button>
              )}
            </div>
            {!session?.user && (
              <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80">Sign in with Google to unlock.</p>
            )}
            {session?.user && !canAfford && report.unlockCost > 0 && (
              <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80">
                Not enough coins — contribute an OA report or experience for this company to unlock free (give-to-get).
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <LockOpen className="h-3.5 w-3.5" aria-hidden /> Questions (own words, no screenshots)
            </div>
            <pre className="scrollbar-thin whitespace-pre-wrap rounded-xl bg-muted/60 p-3 font-sans text-sm">{report.body}</pre>
          </div>
        )}

        <Separator />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={report.myVote ? "text-primary" : undefined}
            disabled={!session?.user?.rollVerified}
            onClick={() => toggleVote.mutate()}
            aria-pressed={report.myVote}
            aria-label="Upvote this report"
          >
            <ArrowUpCircle className="h-4 w-4" aria-hidden />
            {report.upvoteCount}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFlagOpen(true)} aria-label="Report this content">
            <Flag className="h-4 w-4" aria-hidden /> Report
          </Button>
        </div>
      </CardContent>
      <FlagDialog open={flagOpen} onOpenChange={setFlagOpen} targetType="REPORT" targetId={report.id} />
    </Card>
  );
}

// fallback color map when we only have the slug (report payloads carry company slug)
export function colorFor(slug: string): string {
  const palette: Record<string, string> = {
    amazon: "#FF9900", microsoft: "#737373", google: "#4285F4", adobe: "#FF0000",
    "goldman-sachs": "#7399C6", flipkart: "#2874F0", oracle: "#C74634", paytm: "#00BAF2",
    swiggy: "#FC8019", zoho: "#E42527", tcs: "#1B4A96", infosys: "#007CC3",
    wipro: "#44196B", accenture: "#A100FF", cognizant: "#1B4E8F", deloitte: "#86BC25",
  };
  return palette[slug] ?? "#64748b";
}
