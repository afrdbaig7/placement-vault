import "server-only";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { award } from "@/lib/coins";
import { config } from "@/data/config";

type ReviewKind = "report" | "experience";

/**
 * Atomically approve or reject a pending OA report or interview experience,
 * granting the author's coin reward inside the same database transaction.
 */
export async function reviewSubmission(opts: {
  kind: ReviewKind;
  id: string;
  action: "approve" | "reject";
  modNote: string | null;
}) {
  const { kind, id, action, modNote } = opts;
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
        await award(tx, {
          userId: existing.authorId,
          amount: config.rates.reportApproved,
          reason: "REPORT_APPROVED",
          refId: existing.id,
          note: "OA report approved",
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
    }
    return { id: existing.id, status };
  });
}

