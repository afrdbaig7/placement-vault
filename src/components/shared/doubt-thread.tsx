"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, post } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { AnswerView, DoubtView } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PlacedBadge, Spinner, EmptyState } from "@/components/shared/bits";
import { FlagDialog } from "@/components/shared/flag-dialog";
import { colorFor } from "@/components/shared/report-card";
import { ArrowUpCircle, BadgeCheck, CheckCircle2, Flag, MessageCircle, VenetianMask } from "lucide-react";

export function DoubtCard({
  doubt,
  open,
  onOpenChange,
}: {
  doubt: DoubtView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useApp();
  const qc = useQueryClient();
  const [answerText, setAnswerText] = useState("");
  const [flagOpen, setFlagOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["doubt", doubt.id],
    queryFn: () => api<{ doubt: DoubtView; answers: AnswerView[] }>(`/api/doubts/${doubt.id}`),
    enabled: open,
  });

  const ask = useMutation({
    mutationFn: () => post<{ message: string }>(`/api/doubts/${doubt.id}`, { text: answerText }),
    onSuccess: () => {
      toast.success("Answer posted");
      setAnswerText("");
      void qc.invalidateQueries({ queryKey: ["doubt", doubt.id] });
      void qc.invalidateQueries({ queryKey: ["doubts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post answer"),
  });

  const accept = useMutation({
    mutationFn: (answerId: string) => post<{ message: string }>(`/api/answers/${answerId}/accept`),
    onSuccess: () => {
      toast.success("Answer accepted — the author earned coins");
      void qc.invalidateQueries({ queryKey: ["doubt", doubt.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not accept"),
  });

  const vote = useMutation({
    mutationFn: ({ targetType, targetId }: { targetType: "DOUBT" | "ANSWER"; targetId: string }) =>
      post("/api/votes", { targetType, targetId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["doubt", doubt.id] });
      void qc.invalidateQueries({ queryKey: ["doubts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Vote failed"),
  });

  const canVote = Boolean(session?.user?.rollVerified);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="scrollbar-thin max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
              {doubt.title}
              {doubt.anonymous && (
                <Badge variant="outline" className="gap-1">
                  <VenetianMask className="h-3 w-3" aria-hidden /> anonymous
                </Badge>
              )}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                asked by <span className="font-medium text-foreground">{doubt.author.name}</span>
              </span>
              {doubt.author.isPlaced && <PlacedBadge company={doubt.author.placedCompany!} />}
              <span>{new Date(doubt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
          </DialogHeader>

          <p className="text-sm leading-relaxed">{doubt.body}</p>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={doubt.myVote ? "text-primary" : undefined}
              disabled={!canVote || vote.isPending}
              onClick={() => vote.mutate({ targetType: "DOUBT", targetId: doubt.id })}
              aria-pressed={doubt.myVote}
            >
              <ArrowUpCircle className="h-4 w-4" aria-hidden /> {doubt.upvoteCount}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFlagOpen(true)}>
              <Flag className="h-4 w-4" aria-hidden /> Report
            </Button>
          </div>

          <Separator />
          <h3 className="text-sm font-semibold">
            {isLoading ? "Loading answers…" : `${data?.answers.length ?? 0} answer${(data?.answers.length ?? 0) === 1 ? "" : "s"}`}
          </h3>

          {isLoading ? (
            <Spinner className="mx-auto" />
          ) : data && data.answers.length > 0 ? (
            <ul className="space-y-3">
              {data.answers.map((a) => (
                <li
                  key={a.id}
                  className={
                    a.accepted
                      ? "rounded-xl border border-emerald-300 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/20"
                      : "rounded-xl border p-3"
                  }
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {a.accepted && (
                      <Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> Accepted answer
                      </Badge>
                    )}
                    <span className="font-medium text-foreground">{a.author.name}</span>
                    {a.author.isPlaced && <PlacedBadge company={a.author.placedCompany!} />}
                    <span>{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed">{a.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={a.myVote ? "h-7 text-primary" : "h-7"}
                      disabled={!canVote || vote.isPending}
                      onClick={() => vote.mutate({ targetType: "ANSWER", targetId: a.id })}
                      aria-pressed={a.myVote}
                    >
                      <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden /> {a.upvoteCount}
                    </Button>
                    {canVote && data && data.doubt.canAccept && !a.accepted && (
                      <Button variant="outline" size="sm" className="h-7" onClick={() => accept.mutate(a.id)}>
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Accept
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={MessageCircle} title="No answers yet" hint="Placed seniors' answers rank higher — share what you know." />
          )}

          <Separator />
          {session?.user ? (
            session.user.rollVerified ? (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder={`Share your answer… (as ${session.user.name}${session.user.placedCompany ? `, placed at ${session.user.placedCompany}` : ""})`}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                />
                <Button size="sm" disabled={answerText.trim().length < 10 || ask.isPending} onClick={() => ask.mutate()}>
                  {ask.isPending ? <Spinner className="h-4 w-4" /> : null} Post answer
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">A moderator must verify your roll number before you can answer.</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Sign in with Google to answer.</p>
          )}
        </DialogContent>
      </Dialog>
      <FlagDialog open={flagOpen} onOpenChange={setFlagOpen} targetType="DOUBT" targetId={doubt.id} />
    </>
  );
}

export function DoubtListItem({ doubt }: { doubt: DoubtView }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => setOpen(true)}
        role="button"
        aria-haspopup="dialog"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{doubt.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{doubt.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {doubt.anonymous ? (
                    <>
                      <VenetianMask className="h-3 w-3" aria-hidden /> Anonymous
                    </>
                  ) : (
                    doubt.author.name
                  )}
                </span>
                {doubt.author.isPlaced && <PlacedBadge company={doubt.author.placedCompany!} />}
                <span>{new Date(doubt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden /> {doubt.upvoteCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden /> {doubt.answerCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <DoubtCard doubt={doubt} open={open} onOpenChange={setOpen} />
    </>
  );
}
