"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { post } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleLogoIcon, Spinner } from "@/components/shared/bits";
import { Info } from "lucide-react";

const DEMO_ACCOUNTS = [
  { email: "vikram.singh.cse@gmail.com", name: "Vikram Singh", label: "Student (verified)", note: "give-to-get on Amazon" },
  { email: "ishita.bose.ece@gmail.com", name: "Ishita Bose", label: "Student (paid unlocks)", note: "tests coin balance" },
  { email: "rahul.kumar.it@gmail.com", name: "Rahul Kumar", label: "Student (contributor)", note: "Microsoft + TCS" },
  { email: "dev.malhotra@gmail.com", name: "Dev Malhotra", label: "Student (unverified)", note: "pending roll check" },
  { email: "sneha.iyer.2025@gmail.com", name: "Sneha Iyer", label: "Senior — Amazon", note: "verified badge" },
  { email: "rohan.verma.cph@gmail.com", name: "Rohan Verma", label: "Moderator", note: "mod queue access" },
  { email: "ananya.rao.cph@gmail.com", name: "Ananya Rao", label: "Admin", note: "full access" },
];

export function SignInDialog() {
  const { signInOpen, setSignInOpen, session, refreshSession } = useApp();
  const [busy, setBusy] = useState<"google" | "demo" | null>(null);

  const googleEnabled = session?.authConfig?.googleEnabled ?? false;
  const devDemoEnabled = session?.authConfig?.devDemoEnabled ?? false;

  function startGoogleOAuth() {
    setBusy("google");
    window.location.href = "/api/auth/google";
  }

  async function signInDemo(email: string, name: string) {
    setBusy("demo");
    try {
      await post("/api/auth/demo", { email });
      await refreshSession();
      setSignInOpen(false);
      toast.success(`Signed in as ${name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo sign-in failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm">
            <GoogleLogoIcon className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center text-xl">Sign in with Google</DialogTitle>
          <DialogDescription className="text-center">
            Authenticate with your Google account. New accounts verify their roll number once with a moderator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!googleEnabled && (
            <Alert>
              <Info className="h-4 w-4" aria-hidden />
              <AlertDescription className="text-xs">
                Google OAuth credentials (<code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code>) are not
                configured on the server yet.
              </AlertDescription>
            </Alert>
          )}
          <Button
            className="w-full gap-2"
            disabled={!googleEnabled || busy !== null}
            onClick={startGoogleOAuth}
          >
            {busy === "google" ? (
              <>
                <Spinner className="h-4 w-4" /> Redirecting to Google…
              </>
            ) : (
              <>
                <GoogleLogoIcon className="h-4 w-4" /> Continue with Google
              </>
            )}
          </Button>
        </div>

        {devDemoEnabled && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Local dev mode (<code>ENABLE_DEV_DEMO_AUTH=true</code>):
              </p>
              <div className="scrollbar-thin max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    disabled={busy !== null}
                    onClick={() => signInDemo(a.email, a.name)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <span>
                      <span className="font-medium">{a.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{a.label}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">{a.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
