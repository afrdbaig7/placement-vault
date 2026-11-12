import { ApiError, fail, ok, requireMod } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reviewSubmission } from "@/lib/mod-review";
import { idSchema, modReviewSchema, parseBody } from "@/lib/validation";

/** Approve / reject an OA report. Approval pays the coin reward atomically. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req);
    const mod = await requireMod();
    enforceRateLimit(req, { bucket: "mod-action", limit: 40, windowMs: 60_000, keySuffix: mod.id });

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid report ID");

    const { action, modNote } = await parseBody(req, modReviewSchema);
    const report = await reviewSubmission({
      kind: "report",
      id: parsedId.data,
      action,
      modNote: modNote ?? null,
      moderatorId: mod.id,
    });
    return ok({ report });
  } catch (err) {
    return fail(err);
  }
}
