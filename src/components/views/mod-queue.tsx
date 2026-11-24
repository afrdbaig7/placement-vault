"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, post } from "@/lib/api";
import { useApp, isModRole } from "@/lib/store";
import type { ModQueueData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultyBadge, EmptyState, Spinner } from "@/components/shared/bits";
import { colorFor } from "@/components/shared/report-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, ChevronDown, ChevronUp, Lock, ShieldCheck, ShieldX, Trash2, UserCheck, X } from "lucide-react";

export function ModQueueView() {
  const { session, sessionLoading } = useApp();
  const mod = isModRole(session?.user?.role);

  if (sessionLoading || !session) {
    return <Skeleton className="h-64 rounded-xl" />;
  }
  if (!mod) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Moderators only"
        hint="Sign in with a moderator account to view and manage the review queue."
      />
    );
  }
  return <ModQueueContent />;
}

function ConfirmModButton({
  title,
  description,
  confirmLabel,
  variant = "default",
  disabled,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "default" | "outline" | "destructive";
  disabled?: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} className="gap-1.5" disabled={disabled}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ModQueueContent() {
  const { data, isLoading } = useQuery({
    queryKey: ["mod-queue"],
    queryFn: () => api<ModQueueData>("/api/mod/queue"),
    refetchInterval: 30_000,
  });

  const counts = data
    ? {
      reports: data.pendingReports.length,
      experiences: data.pendingExperiences.length,
      flags: data.flags.length,
      verifications: data.verifications.length,
      drives: data.openDrives.length,
    }
    : { reports: 0, experiences: 0, flags: 0, verifications: 0, drives: 0 };

  if (isLoading || !data) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Moderation queue</h1>
        <p className="text-sm text-muted-foreground">
          Approve reports and experiences (which pays the author's coins), verify roll numbers, resolve flags and close
          drives to end embargoes.
        </p>
      </div>

      <Tabs defaultValue="reports">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="reports">OA reports ({counts.reports})</TabsTrigger>
          <TabsTrigger value="experiences">Experiences ({counts.experiences})</TabsTrigger>
          <TabsTrigger value="flags">Flags ({counts.flags})</TabsTrigger>
          <TabsTrigger value="verify">Verifications ({counts.verifications})</TabsTrigger>
          <TabsTrigger value="drives">Open drives ({counts.drives})</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-4">
          {data.pendingReports.length === 0 ? (
            <EmptyState icon={Check} title="No pending reports" hint="The embargo pipeline is clean." />
          ) : (
            data.pendingReports.map((r) => <PendingReportCard key={r.id} report={r} />)
          )}
        </TabsContent>

        <TabsContent value="experiences" className="mt-4 space-y-4">
          {data.pendingExperiences.length === 0 ? (
            <EmptyState icon={Check} title="No pending experiences" />
          ) : (
            data.pendingExperiences.map((e) => <PendingExperienceCard key={e.id} exp={e} />)
          )}
        </TabsContent>

        <TabsContent value="flags" className="mt-4 space-y-4">
          {data.flags.length === 0 ? (
            <EmptyState icon={Check} title="No open flags" />
          ) : (
            data.flags.map((f) => <FlagCard key={f.id} flag={f} />)
          )}
        </TabsContent>

        <TabsContent value="verify" className="mt-4 space-y-4">
          {data.verifications.length === 0 ? (
            <EmptyState icon={UserCheck} title="No pending verifications" hint="Students submit roll numbers at first login." />
          ) : (
            data.verifications.map((v) => <VerificationCard key={v.id} user={v} />)
          )}
        </TabsContent>

        <TabsContent value="drives" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Closing a drive publishes its approved reports and lifts the embargo.</p>
          {data.openDrives.length === 0 ? (
            <EmptyState icon={Lock} title="No open drives" />
          ) : (
            data.openDrives.map((d) => <OpenDriveCard key={d.id} drive={d} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useModAction(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, body }: { path: string; body: Record<string, unknown> }) => post<{ message?: string }>(path, body),
    onSuccess: (res) => {
      if (res.message) toast.success(res.message);
      void qc.invalidateQueries({ queryKey: ["mod-queue"] });
      void qc.invalidateQueries({ queryKey: ["session"] });
      onDone?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });
}

function PendingReportCard({ report }: { report: ModQueueData["pendingReports"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const [modNote, setModNote] = useState("");
  const action = useModAction();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <CompanyLogo company={{ name: report.company, color: colorFor(report.company) }} size="sm" />
          {report.company} — {report.driveRole}
          {report.driveStatus === "OPEN" && <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">embargoed until drive closes</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>by {report.author.name}</span>
          <span>·</span>
          <span>{report.round}</span>
          <span>·</span>
          <span>{report.platform}</span>
          <DifficultyBadge level={report.difficulty} />
          <Badge variant="outline">{report.outcome}</Badge>
        </div>
        <p className="text-sm">{report.summary}</p>
        <Button variant="ghost" size="sm" className="h-7" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Hide question text" : "Review question text"}
          {expanded ? <ChevronUp className="ml-1 h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden />}
        </Button>
        {expanded && (
          <pre className="scrollbar-thin max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 font-sans text-sm">
            {report.bodyText}
          </pre>
        )}
        <Separator />
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmModButton
            title="Approve OA report?"
            description="This publishes the OA report and awards +50 coins to the author."
            confirmLabel="Approve (+50 coins)"
            disabled={action.isPending}
            onConfirm={() => action.mutate({ path: `/api/mod/reports/${report.id}`, body: { action: "approve" } })}
          >
            {action.isPending ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" aria-hidden />} Approve (+50 to author)
          </ConfirmModButton>
          <ConfirmModButton
            title="Reject OA report?"
            description="This marks the OA report as rejected and awards no coins."
            confirmLabel="Reject report"
            variant="outline"
            disabled={action.isPending}
            onConfirm={() => action.mutate({ path: `/api/mod/reports/${report.id}`, body: { action: "reject", modNote: modNote || undefined } })}
          >
            <X className="h-4 w-4" aria-hidden /> Reject
          </ConfirmModButton>
          <input
            className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
            placeholder="Note to author on rejection (optional)"
            value={modNote}
            onChange={(e) => setModNote(e.target.value)}
            aria-label="Moderator note"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PendingExperienceCard({ exp }: { exp: ModQueueData["pendingExperiences"][number] }) {
  const action = useModAction();
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyLogo company={{ name: exp.company, color: colorFor(exp.company) }} size="sm" />
          <span className="font-semibold">{exp.company}</span>
          <span className="text-sm text-muted-foreground">{exp.role} · {exp.round} · {exp.platform}</span>
          <DifficultyBadge level={exp.difficulty} />
          <Badge variant="outline">{exp.outcome}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">by {exp.author.name}</p>
        <p className="scrollbar-thin max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-sm">{exp.bodyText}</p>
        <div className="flex gap-2">
          <ConfirmModButton
            title="Approve interview experience?"
            description="This publishes the experience and awards +40 coins to the author."
            confirmLabel="Approve (+40 coins)"
            disabled={action.isPending}
            onConfirm={() => action.mutate({ path: `/api/mod/experiences/${exp.id}`, body: { action: "approve" } })}
          >
            <Check className="h-4 w-4" aria-hidden /> Approve (+40 to author)
          </ConfirmModButton>
          <ConfirmModButton
            title="Reject interview experience?"
            description="This marks the experience as rejected and awards no coins."
            confirmLabel="Reject experience"
            variant="outline"
            disabled={action.isPending}
            onConfirm={() => action.mutate({ path: `/api/mod/experiences/${exp.id}`, body: { action: "reject" } })}
          >
            <X className="h-4 w-4" aria-hidden /> Reject
          </ConfirmModButton>
        </div>
      </CardContent>
    </Card>
  );
}

function FlagCard({ flag }: { flag: ModQueueData["flags"][number] }) {
  const action = useModAction();
  const takedown = flag.targetType === "REPORT" || flag.targetType === "EXPERIENCE";
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive">{flag.targetType}</Badge>
          <span className="text-sm font-medium">reported by {flag.reporter}</span>
          <span className="text-xs text-muted-foreground">{new Date(flag.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
        </div>
        <p className="text-sm">{flag.reason}</p>
        <p className="scrollbar-thin max-h-24 overflow-y-auto rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
          {flag.targetExists ? flag.targetPreview : "(target no longer exists)"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ path: `/api/mod/flags/${flag.id}`, body: { action: "resolve" } })}>
            Resolve only
          </Button>
          {takedown && (
            <ConfirmModButton
              title="Takedown target & resolve flag?"
              description="This removes or rejects the flagged content and marks the flag resolved."
              confirmLabel="Takedown & resolve"
              variant="destructive"
              disabled={action.isPending}
              onConfirm={() => action.mutate({ path: `/api/mod/flags/${flag.id}`, body: { action: "resolve", takedown: true } })}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Takedown & resolve
            </ConfirmModButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VerificationCard({ user }: { user: ModQueueData["verifications"][number] }) {
  const action = useModAction();
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 font-mono text-sm">{user.rollNumber}</p>
        </div>
        <div className="flex gap-2">
          <ConfirmModButton
            title={`Verify roll number ${user.rollNumber ?? ""}?`}
            description="This verifies the student's campus roll number and grants +25 welcome coins."
            confirmLabel="Verify (+25 coins)"
            disabled={action.isPending}
            onConfirm={() => action.mutate({ path: `/api/mod/verify/${user.id}`, body: { action: "approve" } })}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden /> Verify (+25 welcome)
          </ConfirmModButton>
          <ConfirmModButton
            title="Reject roll number?"
            description="This clears the submitted roll number so the user can re-enter a valid one."
            confirmLabel="Reject"
            variant="outline"
            disabled={action.isPending}
            onConfirm={() => action.mutate({ path: `/api/mod/verify/${user.id}`, body: { action: "reject" } })}
          >
            <X className="h-4 w-4" aria-hidden /> Reject
          </ConfirmModButton>
        </div>
      </CardContent>
    </Card>
  );
}

function OpenDriveCard({ drive }: { drive: ModQueueData["openDrives"][number] }) {
  const action = useModAction();
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <CompanyLogo company={{ name: drive.company, color: colorFor(drive.company) }} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {drive.company} — {drive.role}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(drive.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <ConfirmModButton
          title="Close drive & lift embargo?"
          description="Closing the drive unlocks approved OA reports for students. This cannot be undone."
          confirmLabel="Close drive"
          disabled={action.isPending}
          onConfirm={() => action.mutate({ path: `/api/drives/${drive.id}`, body: { action: "close" } })}
        >
          <Lock className="h-4 w-4" aria-hidden /> Close drive (lift embargo)
        </ConfirmModButton>
      </CardContent>
    </Card>
  );
}
