import "server-only";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { award } from "@/lib/coins";
import { config } from "@/data/config";

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

  return db.$transaction(async (tx) => {
    if (kind === "report") {
      const existing = await tx.oaReport.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, "Report not found");
      if (existing.status !== "PENDING") {
        throw new ApiError(400, "This report was already reviewed");
      }

      const claimed = await tx.oaReport.updateMany({
        where: { id, status: "PENDING" },
        data: { status, modNote },
      });
      if (claimed.count !== 1) throw new ApiError(409, "Report review conflict — please refresh");

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

      return { id: existing.id, status };
    }

    const existing = await tx.experience.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Experience not found");
    if (existing.status !== "PENDING") {
      throw new ApiError(400, "Already reviewed");
    }

    const claimed = await tx.experience.updateMany({
      where: { id, status: "PENDING" },
      data: { status, modNote },
    });
    if (claimed.count !== 1) throw new ApiError(409, "Experience review conflict — please refresh");

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

    return { id: existing.id, status };
  });
}
