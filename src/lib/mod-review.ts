import "server-only";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { award } from "@/lib/coins";
import { config } from "@/data/config";
import { sendReportApprovedEmail, sendReportRejectedEmail } from "@/lib/email";
import { observability } from "@/lib/observability";

type ReviewKind = "report" | "experience";

/**
 * Atomically approve or reject a pending OA report or interview experience,
 * granting author coin rewards and writing a moderation log.
 * First approved report for a company in 2026-27 receives a seasonal bounty bonus (+25 coins).
 */
export async function reviewSubmission(opts: {
  kind: ReviewKind;
  id: string;
  action: "approve" | "reject";
  modNote: string | null;
  moderatorId?: string;
}) {
  const { kind, id, action, modNote, moderatorId } = opts;
  const status = action === "approve" ? "APPROVED" : "REJECTED";

  const result = await db.$transaction(async (tx) => {
    if (kind === "report") {
      const existing = await tx.oaReport.findUnique({
        where: { id },
        include: { author: { select: { email: true, name: true } }, company: { select: { name: true } } },
      });
      if (!existing) throw new ApiError(404, "Report not found");
      if (existing.status !== "PENDING") {
        throw new ApiError(400, "This report was already reviewed");
      }

      const claimed = await tx.oaReport.updateMany({
        where: { id, status: "PENDING" },
        data: { status, modNote },
      });
      if (claimed.count !== 1) throw new ApiError(409, "Report review conflict — please refresh");

      let isSeasonBounty = false;
      if (action === "approve") {
        // Standard report approval reward (+50 coins)
        await award(tx, {
          userId: existing.authorId,
          amount: config.rates.reportApproved,
          reason: "REPORT_APPROVED",
          refId: existing.id,
          note: "OA report approved",
        });

        // Check for 2026-27 first contribution bounty (+25 coins)
        if (existing.hiringSeason === "2026-27") {
          const priorCount = await tx.oaReport.count({
            where: {
              companyId: existing.companyId,
              hiringSeason: "2026-27",
              status: "APPROVED",
              id: { not: existing.id },
            },
          });
          if (priorCount === 0) {
            isSeasonBounty = true;
            await award(tx, {
              userId: existing.authorId,
              amount: 25,
              reason: "FIRST_SEASON_CONTRIBUTION",
              refId: `${existing.id}:season-bounty`,
              note: "First 2026-27 OA report bounty for company",
            });
          }
        }
      }

      if (moderatorId) {
        await tx.moderationLog.create({
          data: {
            moderatorId,
            targetType: "REPORT",
            targetId: existing.id,
            action: action === "approve" ? "APPROVE" : "REJECT",
            beforeState: "PENDING",
            afterState: status,
            reason: modNote ?? (action === "approve" ? "Approved by moderator" : "Rejected by moderator"),
          },
        });
      }

      return {
        id: existing.id,
        status,
        authorEmail: existing.author.email,
        authorName: existing.author.name,
        companyName: existing.company.name,
        isSeasonBounty,
      };
    }

    const existing = await tx.experience.findUnique({
      where: { id },
      include: { author: { select: { email: true, name: true } }, companyRef: { select: { name: true } } },
    });
    if (!existing) throw new ApiError(404, "Experience not found");
    if (existing.status !== "PENDING") {
      throw new ApiError(400, "Already reviewed");
    }

    const claimed = await tx.experience.updateMany({
      where: { id, status: "PENDING" },
      data: { status, modNote },
    });
    if (claimed.count !== 1) throw new ApiError(409, "Experience review conflict — please refresh");

    let isSeasonBounty = false;
    if (action === "approve") {
      await award(tx, {
        userId: existing.authorId,
        amount: config.rates.experienceApproved,
        reason: "EXPERIENCE_APPROVED",
        refId: existing.id,
        note: "Experience approved",
      });

      // Check for 2026-27 first interview experience bounty (+25 coins)
      if (existing.hiringSeason === "2026-27") {
        const priorCount = await tx.experience.count({
          where: {
            companyId: existing.companyId,
            hiringSeason: "2026-27",
            status: "APPROVED",
            id: { not: existing.id },
          },
        });
        if (priorCount === 0) {
          isSeasonBounty = true;
          await award(tx, {
            userId: existing.authorId,
            amount: 25,
            reason: "FIRST_SEASON_CONTRIBUTION",
            refId: `${existing.id}:season-bounty`,
            note: "First 2026-27 interview experience bounty for company",
          });
        }
      }
    }

    if (moderatorId) {
      await tx.moderationLog.create({
        data: {
          moderatorId,
          targetType: "EXPERIENCE",
          targetId: existing.id,
          action: action === "approve" ? "APPROVE" : "REJECT",
          beforeState: "PENDING",
          afterState: status,
          reason: modNote ?? (action === "approve" ? "Approved by moderator" : "Rejected by moderator"),
        },
      });
    }

    return {
      id: existing.id,
      status,
      authorEmail: existing.author.email,
      authorName: existing.author.name,
      companyName: existing.companyRef.name,
      isSeasonBounty,
    };
  });

  // Track event and dispatch email notification asynchronously outside transaction
  observability.trackEvent(
    action === "approve" ? "submission_approved" : "submission_rejected",
    { kind, id: result.id, company: result.companyName, moderatorId }
  );

  if (result.authorEmail) {
    if (action === "approve") {
      const coins = (kind === "report" ? config.rates.reportApproved : config.rates.experienceApproved) +
        (result.isSeasonBounty ? 25 : 0);
      void sendReportApprovedEmail({
        to: result.authorEmail,
        userName: result.authorName ?? "Student",
        companyName: result.companyName,
        coinsAwarded: coins,
        isSeasonBounty: result.isSeasonBounty,
      });
    } else {
      void sendReportRejectedEmail({
        to: result.authorEmail,
        userName: result.authorName ?? "Student",
        companyName: result.companyName,
        reason: modNote ?? undefined,
      });
    }
  }

  return { id: result.id, status: result.status };
}
