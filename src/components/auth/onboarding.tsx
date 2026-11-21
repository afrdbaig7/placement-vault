"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { post } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner, VerifiedBadge } from "@/components/shared/bits";

/**
 * Collects the roll number at first login. A mod must verify it before the
 * account can earn or spend coins (Google OAuth lets any Gmail in).
 */
const ROLL_PATTERN = /^[A-Za-z0-9-]{4,20}$/;

export function OnboardingDialog() {
  const { session } = useApp();
  const [roll, setRoll] = useState("");
  const [busy, setBusy] = useState(false);

  const user = session?.user ?? null;
  const needsRoll = user && !user.rollVerified && !user.rollNumber;
  const trimmedRoll = roll.trim();
  const rollValid = ROLL_PATTERN.test(trimmedRoll);

  async function submit() {
    if (!rollValid) {
      toast.error("Roll number must be 4-20 alphanumeric characters or hyphens.");
      return;
    }
    setBusy(true);
    try {
      await post("/api/me", { rollNumber: trimmedRoll.toUpperCase() });
      await useApp.getState().refreshSession();
      toast.success("Roll number submitted — a moderator will verify it shortly");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit roll number");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(needsRoll)} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Almost there — verify you're a student</DialogTitle>
          <DialogDescription>
            Because any Gmail can sign up, every student submits a roll number. A moderator verifies it before
            your account can earn or spend coins.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="roll-number">Roll number</Label>
            <Input
              id="roll-number"
              placeholder="e.g. CS24B1023"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && rollValid && !busy && submit()}
              autoFocus
            />
            {trimmedRoll.length > 0 && !rollValid && (
              <p className="text-xs text-destructive">Use 4-20 alphanumeric characters or hyphens (e.g. CS24B1023).</p>
            )}
          </div>
          <Button className="w-full" disabled={!rollValid || busy} onClick={submit}>
            {busy ? (
              <>
                <Spinner className="h-4 w-4" /> Submitting…
              </>
            ) : (
              "Submit for verification"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium">{user?.email}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Persistent banner for students waiting on verification. */
export function VerificationBanner() {
  const { session } = useApp();
  const user = session?.user ?? null;
  // dismiss is tracked per-user so signing into a different account shows it again
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const dismissed = dismissedFor !== null && dismissedFor === user?.id;
  if (!user || user.rollVerified || !user.rollNumber || dismissed) return null;
  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Roll number <span className="font-semibold">{user.rollNumber}</span> is pending moderator verification —
          you can browse everything, but earning and spending coins unlocks once verified.
        </p>
        <button className="text-xs font-medium underline underline-offset-2" onClick={() => setDismissedFor(user.id)}>
          dismiss
        </button>
      </div>
    </div>
  );
}

export function VerifiedChip() {
  const { session } = useApp();
  if (!session?.user?.rollVerified) return null;
  return <VerifiedBadge />;
}
