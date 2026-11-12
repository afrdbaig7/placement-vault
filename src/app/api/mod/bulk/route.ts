import { z } from "zod";
import { db } from "@/lib/db";
import { fail, ok, requireMod, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validation";
import { reviewSubmission } from "@/lib/mod-review";

const bulkActionSchema = z.object({
  targetType: z.enum(["REPORT", "EXPERIENCE", "COMPANY"]),
  action: z.enum(["approve", "reject"]),
  ids: z.array(z.string().trim().min(1)).min(1).max(50),
  modNote: z.string().trim().max(1000).optional().nullable(),
});

/**
 * POST /api/mod/bulk
 * Perform bulk approvals or rejections on pending submissions.
 */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const mod = await requireMod();
    enforceRateLimit(req, {
      bucket: "mod-bulk-action",
      limit: 15,
      windowMs: 60_000,
      keySuffix: mod.id,
    });

    const { targetType, action, ids, modNote } = await parseBody(req, bulkActionSchema);

    let processedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    if (targetType === "COMPANY") {
      const newStatus = action === "approve" ? "VERIFIED" : "REJECTED";
      await db.$transaction(async (tx) => {
        const updated = await tx.company.updateMany({
          where: { id: { in: ids }, status: "PENDING" },
          data: { status: newStatus },
        });
        processedCount = updated.count;

        for (const id of ids) {
          await tx.moderationLog.create({
            data: {
              moderatorId: mod.id,
              targetType: "COMPANY",
              targetId: id,
              action: action === "approve" ? "APPROVE" : "REJECT",
              beforeState: "PENDING",
              afterState: newStatus,
              reason: modNote ?? `Bulk ${action}d by moderator`,
            },
          });
        }
      });
    } else {
      const kind = targetType === "REPORT" ? "report" : "experience";
      for (const id of ids) {
        try {
          await reviewSubmission({
            kind,
            id,
            action,
            modNote: modNote ?? `Bulk ${action}d by moderator`,
            moderatorId: mod.id,
          });
          processedCount++;
        } catch (err) {
          errors.push({ id, error: err instanceof Error ? err.message : "Action failed" });
        }
      }
    }

    return ok({
      processedCount,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Bulk ${action} completed: ${processedCount} succeeded, ${errors.length} failed.`,
    });
  } catch (err) {
    return fail(err);
  }
}
