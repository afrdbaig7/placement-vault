"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { post } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { Spinner } from "@/components/shared/bits";

export function FlagDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "REPORT" | "EXPERIENCE" | "DOUBT" | "ANSWER";
  targetId: string;
}) {
  const { session, setSignInOpen } = useApp();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await post("/api/flags", { targetType, targetId, reason });
      toast.success("Reported — a moderator will take a look");
      onOpenChange(false);
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this content</DialogTitle>
          <DialogDescription>
            Flag anything that breaks the rules — leaked verbatim questions, spam or harassment. Mods see it in their
            queue and can takedown.
          </DialogDescription>
        </DialogHeader>
        {!session?.user ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sign in to report content.</p>
            <Button
              onClick={() => {
                onOpenChange(false);
                setSignInOpen(true);
              }}
            >
              Sign in with Google
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Why are you reporting this?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <Button className="w-full gap-2" disabled={reason.trim().length < 5 || busy} onClick={submit}>
              {busy ? <Spinner className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
              Submit report
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
