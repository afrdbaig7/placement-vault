"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { post } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { ExperienceView } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultyBadge, PlacedBadge } from "@/components/shared/bits";
import { FlagDialog } from "@/components/shared/flag-dialog";
import { colorFor } from "@/components/shared/report-card";
import { ArrowUpCircle, Flag, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

export function ExperienceCard({ experience }: { experience: ExperienceView }) {
  const { session } = useApp();
  const qc = useQueryClient();
  const [flagOpen, setFlagOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showRounds, setShowRounds] = useState(false);
  const long = experience.body.length > 320;

  const toggleVote = useMutation({
    mutationFn: () => post("/api/votes", { targetType: "EXPERIENCE", targetId: experience.id }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["experiences"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Vote failed"),
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <CompanyLogo company={{ name: experience.company, color: colorFor(experience.company) }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{experience.companyName ?? experience.company}</span>
              <span className="text-muted-foreground">·</span>
              <span>{experience.role}</span>
              <span className="text-muted-foreground">·</span>
              <span>{experience.round}</span>
              {experience.hiringSeason === "2026-27" && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] px-2 py-0.5">
                  Latest (2026-27)
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>by {experience.author.name}</span>
              {experience.author.isPlaced && <PlacedBadge company={experience.author.placedCompany!} />}
              <span>{experience.platform}</span>
              <span>{new Date(experience.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DifficultyBadge level={experience.difficulty as any} />
            <Badge
              variant="outline"
              className={
                experience.offerStatus === "OFFERED" || experience.outcome.toLowerCase().includes("cleared")
                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : undefined
              }
            >
              {experience.offerStatus === "OFFERED" ? "Offer Received 🎉" : experience.outcome}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {experience.topics.map((t) => (
            <Badge key={t} variant="secondary" className="font-normal text-xs">
              {t}
            </Badge>
          ))}
        </div>

        <p className="text-sm leading-relaxed text-foreground/90">
          {expanded || !long ? experience.body : experience.body.slice(0, 320) + "…"}
        </p>
        {long && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Show less" : "Read more"}
          </Button>
        )}

        {/* Tips section */}
        {experience.tips && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50/50 p-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            <Lightbulb className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">Candidate Tip:</span> {experience.tips}
            </div>
          </div>
        )}

        {/* Rounds breakdown toggle */}
        {experience.rounds && experience.rounds.length > 0 && (
          <div className="space-y-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => setShowRounds(!showRounds)}
            >
              <span>View Round Breakdown ({experience.rounds.length} rounds)</span>
              {showRounds ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showRounds && (
              <div className="space-y-2 pt-1">
                {experience.rounds.map((rd, idx) => (
                  <div key={rd.id || idx} className="rounded-lg border bg-muted/30 p-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span>{rd.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {rd.type} · {rd.durationMin ?? 45}m
                      </Badge>
                    </div>
                    {rd.notes && <p className="text-muted-foreground">{rd.notes}</p>}
                    {rd.questions && rd.questions.length > 0 && (
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground pt-1">
                        {rd.questions.map((q, qIdx) => (
                          <li key={q.id || qIdx}>{q.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Separator />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={experience.myVote ? "text-primary" : undefined}
            disabled={!session?.user?.rollVerified}
            onClick={() => toggleVote.mutate()}
            aria-pressed={experience.myVote}
            aria-label="Upvote this experience"
          >
            <ArrowUpCircle className="h-4 w-4" aria-hidden />
            {experience.upvoteCount}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFlagOpen(true)} aria-label="Report this content">
            <Flag className="h-4 w-4" aria-hidden /> Report
          </Button>
        </div>
      </CardContent>
      <FlagDialog open={flagOpen} onOpenChange={setFlagOpen} targetType="EXPERIENCE" targetId={experience.id} />
    </Card>
  );
}
