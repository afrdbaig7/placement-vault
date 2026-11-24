"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { WalletData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Coin, EmptyState } from "@/components/shared/bits";
import { cn } from "@/lib/utils";
import { ArrowDownToLine, Coins, Gift, LockOpen, Sparkles, ThumbsUp, Wallet } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  WELCOME: "Welcome grant (roll verified)",
  REPORT_APPROVED: "OA report approved",
  EXPERIENCE_APPROVED: "Experience approved",
  ANSWER_ACCEPTED: "Answer accepted",
  UPVOTE_RECEIVED: "Upvote received",
  UNLOCK_OA: "Unlocked an OA report",
  GIVE_TO_GET: "Give-to-get unlock",
  MOD_GRANT: "Moderator grant",
};

export function WalletView() {
  const { session, setSignInOpen } = useApp();

  if (!session?.user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Coin wallet</h1>
        <EmptyState
          icon={Wallet}
          title="Sign in to see your wallet"
          hint="Coins fund OA unlocks. They're enforced server-side: every unlock writes a negative ledger row and the unlock row in one transaction."
          action={
            <Button onClick={() => setSignInOpen(true)} size="sm">
              Sign in with Google
            </Button>
          }
        />
      </div>
    );
  }

  return <WalletContent />;
}

function WalletContent() {
  const { session } = useApp();
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api<WalletData>("/api/wallet"),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const rates = session?.rates;
  const unlockCost = rates?.unlockOa ?? 25;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Coin wallet</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-amber-300/60 bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/30 dark:to-background lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center gap-1 p-6 text-center">
            <Coins className="h-8 w-8 text-coin" aria-hidden />
            <p className="text-4xl font-bold tabular-nums">{data.balance}</p>
            <p className="text-sm text-muted-foreground">coins available</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Unlocks cost {unlockCost}. A contribution always pays more than an unlock —{" "}
              {rates ? `${rates.reportApproved} for a report` : "see rates"}.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Ways to earn
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <EarnRow icon={Gift} title="Give-to-get" body="One approved report or experience for a company unlocks that company's other OAs free." />
            <EarnRow icon={Coins} title={`Approved OA report — +${rates?.reportApproved ?? 50}`} body="Structured form + own-words question text." />
            <EarnRow icon={Coins} title={`Approved experience — +${rates?.experienceApproved ?? 40}`} body="Full interview loop write-up." />
            <EarnRow icon={Coins} title={`Accepted answer — +${rates?.answerAccepted ?? 30}`} body="Accepted by the student who asked." />
            <EarnRow icon={ThumbsUp} title={`Upvotes — +${rates?.upvoteReceived ?? 2} each`} body="Distinct users only, daily cap stops farming rings." />
            <EarnRow icon={ArrowDownToLine} title={`Welcome grant — +${rates?.welcomeGrant ?? 25}`} body="When a mod verifies your roll number." />
          </CardContent>
        </Card>
      </div>

      {data.contributionCompanies.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="text-sm font-medium">Give-to-get active for:</span>
            {data.contributionCompanies.map((c) => (
              <Badge key={c} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {c}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ledger (append-only)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.ledger.length === 0 ? (
              <EmptyState icon={Coins} title="No coin activity yet" hint="Contribute to earn your first coins." />
            ) : (
              <ul className="scrollbar-thin max-h-80 space-y-1 overflow-y-auto pr-1" role="list">
                {data.ledger.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-accent/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{REASON_LABELS[l.reason] ?? l.reason}</p>
                      {l.note && <p className="truncate text-xs text-muted-foreground">{l.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-bold tabular-nums",
                        l.amount > 0 ? "text-emerald-600 dark:text-emerald-400" : l.amount < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      )}
                    >
                      {l.amount > 0 ? "+" : ""}
                      {l.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LockOpen className="h-4 w-4 text-primary" aria-hidden /> Unlocked reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.unlocks.length === 0 ? (
              <EmptyState icon={LockOpen} title="No unlocks yet" hint="Unlock a company's OA reports from its hub." />
            ) : (
              <ul className="scrollbar-thin max-h-80 space-y-2 overflow-y-auto pr-1" role="list">
                {data.unlocks.map((u) => (
                  <li key={u.id} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {u.report.company} — {u.report.driveRole}
                      </p>
                      {u.free ? (
                        <Badge variant="secondary" className="gap-1">
                          <Gift className="h-3 w-3" aria-hidden /> give-to-get
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Coin amount={unlockCost} />
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {u.report.round} · {u.report.platform} · unlocked{" "}
                      {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EarnRow({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-coin" aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
