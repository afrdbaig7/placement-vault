"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, post } from "@/lib/api";
import { useApp, isModRole } from "@/lib/store";
import type { DriveView } from "@/lib/types";
import companiesData from "@/data/companies.json";
import type { Company } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyLogo } from "@/components/shared/company-logo";
import { EmptyState } from "@/components/shared/bits";
import { CalendarClock, Lock, LockOpen, Package, Plus } from "lucide-react";

const companies = companiesData as Company[];
const companyMap = new Map(companies.map((c) => [c.slug, c]));

export function DrivesView() {
  const { session, navigate } = useApp();
  const qc = useQueryClient();
  const mod = isModRole(session?.user?.role);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["drives"],
    queryFn: () => api<{ drives: DriveView[] }>("/api/drives"),
  });

  const closeDrive = useMutation({
    mutationFn: (id: string) => post<{ message: string }>(`/api/drives/${id}`, { action: "close" }),
    onSuccess: (res) => {
      toast.success(res.message ?? "Drive closed");
      void qc.invalidateQueries({ queryKey: ["drives"] });
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not close drive"),
  });

  const drives = data?.drives ?? [];
  const open = drives.filter((d) => d.status === "OPEN");
  const closed = drives.filter((d) => d.status === "CLOSED");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drive calendar</h1>
          <p className="text-sm text-muted-foreground">
            Eligibility (branch, CGPA) per drive. Open drives keep their OA reports under embargo; closing a drive
            publishes its approved reports.
          </p>
        </div>
        {mod && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" aria-hidden /> Announce drive
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateDriveForm onDone={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : drives.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No drives announced yet" />
      ) : (
        <>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              Open drives
              <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">embargo active</Badge>
            </h2>
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground">None right now.</p>
            ) : (
              <div className="space-y-3">
                {open.map((d) => (
                  <DriveRow
                    key={d.id}
                    drive={d}
                    mod={mod}
                    closing={closeDrive.isPending && closeDrive.variables === d.id}
                    onClose={() => closeDrive.mutate(d.id)}
                    onOpenHub={() => navigate({ name: "hub", company: d.company })}
                  />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              Closed drives
              <LockOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
            </h2>
            <div className="space-y-3">
              {closed.map((d) => (
                <DriveRow key={d.id} drive={d} mod={false} onOpenHub={() => navigate({ name: "hub", company: d.company })} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function DriveRow({
  drive,
  mod,
  closing = false,
  onClose,
  onOpenHub,
}: {
  drive: DriveView;
  mod: boolean;
  closing?: boolean;
  onClose?: () => void;
  onOpenHub: () => void;
}) {
  const c = companyMap.get(drive.company);
  const isUpcoming = new Date(drive.driveDate) > new Date();
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        {c && <CompanyLogo company={c} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{c?.name ?? drive.company}</p>
            <span className="text-sm text-muted-foreground">{drive.role}</span>
            <Badge variant={drive.status === "OPEN" ? "default" : "secondary"} className={drive.status === "OPEN" ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" : undefined}>
              {drive.status === "OPEN" ? (
                <>
                  <Lock className="mr-1 h-3 w-3" aria-hidden /> open
                </>
              ) : (
                "closed"
              )}
            </Badge>
            {isUpcoming && drive.status === "OPEN" && (
              <Badge variant="outline" className="gap-1">
                <CalendarClock className="h-3 w-3" aria-hidden />
                {new Date(drive.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Eligibility: {drive.branches === "ALL" ? "all branches" : drive.branches.split(",").join(", ")}
            {drive.minCgpa ? ` · CGPA ≥ ${drive.minCgpa}` : ""}
            {drive.notes ? ` · ${drive.notes}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onOpenHub}>
            <Package className="h-4 w-4" aria-hidden /> Prep pack
          </Button>
          {drive.status === "OPEN" && drive.approvedReports !== undefined && (
            <Badge variant="secondary" className="gap-1">
              {drive.approvedReports} report{drive.approvedReports === 1 ? "" : "s"} waiting
            </Badge>
          )}
          {mod && drive.status === "OPEN" && onClose && (
            <Button size="sm" onClick={onClose} disabled={closing}>
              {closing ? "Closing…" : "Close drive"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateDriveForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState("");
  const [branches, setBranches] = useState("ALL");
  const [minCgpa, setMinCgpa] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await post("/api/drives", {
        company,
        role,
        driveDate: date ? new Date(date).toISOString() : null,
        branches: branches.trim() || "ALL",
        minCgpa: minCgpa ? Number(minCgpa) : null,
        notes: notes || null,
      });
      toast.success("Drive announced — OA reports for it will be embargoed until you close it");
      void qc.invalidateQueries({ queryKey: ["drives"] });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create drive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>Announce a drive</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Company</Label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            aria-label="Company"
          >
            <option value="">Select…</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="SDE-1" />
        </div>
        <div className="space-y-1.5">
          <Label>Drive date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Eligible branches</Label>
          <Input value={branches} onChange={(e) => setBranches(e.target.value)} placeholder="ALL or CSE,IT,ECE" />
        </div>
        <div className="space-y-1.5">
          <Label>Minimum CGPA</Label>
          <Input type="number" step="0.1" min="0" max="10" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} placeholder="e.g. 7.0" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" />
        </div>
      </div>
      <Button className="w-full" disabled={!company || !role || !date || busy} onClick={submit}>
        {busy ? "Announcing…" : "Announce drive"}
      </Button>
    </div>
  );
}
