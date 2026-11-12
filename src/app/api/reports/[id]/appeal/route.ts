import { z } from "zod";
import { db } from "@/lib/db";
import { fail, ok, requireVerified, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { idSchema, parseBody } from "@/lib/validation";

const appealSchema = z.object({
  appealReason: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters explaining your appeal")
    .max(1000),
});

/**
 * POST /api/reports/[id]/appeal
 * Student submits an appeal for a rejected OA report.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, {
      bucket: "report-appeal",
      limit: 5,
      windowMs: 60_000,
      keySuffix: user.id,
    });

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid report ID");
    const id = parsedId.data;

    const report = await db.oaReport.findUnique({ where: { id } });
    if (!report) throw new ApiError(404, "Report not found");
    if (report.authorId !== user.id) {
      throw new ApiError(403, "You can only appeal your own submissions");
    }
    if (report.status !== "REJECTED") {
      throw new ApiError(400, "Only rejected reports can be appealed");
    }

    const { appealReason } = await parseBody(req, appealSchema);

    await db.$transaction(async (tx) => {
      await tx.oaReport.update({
        where: { id },
        data: {
          status: "PENDING",
          modNote: `[APPEAL SUBMITTED by author]: ${appealReason}`,
        },
      });

      await tx.moderationLog.create({
        data: {
          moderatorId: user.id,
          targetType: "REPORT",
          targetId: id,
          action: "APPEAL",
          beforeState: "REJECTED",
          afterState: "PENDING",
          reason: appealReason,
        },
      });
    });

    return ok({
      message: "Appeal submitted. A moderator will re-review your submission.",
    });
  } catch (err) {
    return fail(err);
  }
}

