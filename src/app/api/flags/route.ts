import { db } from "@/lib/db";
import { fail, ok, requireVerified, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { flagSchema, parseBody } from "@/lib/validation";

async function targetExists(targetType: string, targetId: string): Promise<boolean> {
  switch (targetType) {
    case "REPORT":
      return Boolean(await db.oaReport.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "EXPERIENCE":
      return Boolean(await db.experience.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "DOUBT":
      return Boolean(await db.doubt.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "ANSWER":
      return Boolean(await db.answer.findUnique({ where: { id: targetId }, select: { id: true } }));
    default:
      return false;
  }
}

/** Report/takedown button on any content piece. */
export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const user = await requireVerified();
    enforceRateLimit(req, { bucket: "flags-create", limit: 10, windowMs: 60_000, keySuffix: user.id });

    const { targetType, targetId, reason } = await parseBody(req, flagSchema);
    if (!(await targetExists(targetType, targetId))) {
      throw new ApiError(404, "Target content not found");
    }

    await db.flag.create({ data: { reporterId: user.id, targetType, targetId, reason } });
    return ok({ message: "Reported — a moderator will take a look" });
  } catch (err) {
    return fail(err);
  }
}
