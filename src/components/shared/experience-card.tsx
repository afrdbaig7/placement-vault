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
import { ArrowUpCircle, Flag } from "lucide-react";

export function ExperienceCard({ experience }: { experience: ExperienceView }) {
  const { session } = useApp();
  const qc = useQueryClient();
  const [flagOpen, setFlagOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
              <span className="font-semibold">{experience.company}</span>
              <span className="text-muted-foreground">·</span>
              <span>{experience.role}</span>
              <span className="text-muted-foreground">·</span>
              <span>{experience.round}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>by {experience.author.name}</span>
              {experience.author.isPlaced && <PlacedBadge company={experience.author.placedCompany!} />}
              <span>{experience.platform}</span>
              <span>{new Date(experience.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DifficultyBadge level={experience.difficulty} />
            <Badge variant="outline">{experience.outcome}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {experience.topics.map((t) => (
            <Badge key={t} variant="secondary" className="font-normal">
              {t}
            </Badge>
          ))}
        </div>

        <p className="text-sm leading-relaxed text-foreground/90">
          {expanded || !long ? experience.body : experience.body.slice(0, 320) + "…"}
        </p>
        {long && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Show less" : "Read more"}
          </Button>
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
