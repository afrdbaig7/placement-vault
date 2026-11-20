import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fail, ok, requireMod, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { idSchema, modFlagSchema, parseBody } from "@/lib/validation";

function isRecordMissing(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

/**
 * Resolve a flag atomically. With takedown=true the content is removed:
 * reports/experiences get status REMOVED, doubts/answers are deleted.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req);
    const mod = await requireMod();
    enforceRateLimit(req, { bucket: "mod-action", limit: 40, windowMs: 60_000, keySuffix: mod.id });

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid flag ID");
    const id = parsedId.data;

    const { takedown } = await parseBody(req, modFlagSchema);

    await db.$transaction(async (tx) => {
      const flag = await tx.flag.findUnique({ where: { id } });
      if (!flag) throw new ApiError(404, "Flag not found");

      if (takedown) {
        try {
          if (flag.targetType === "REPORT") {
            await tx.oaReport.update({ where: { id: flag.targetId }, data: { status: "REMOVED" } });
          } else if (flag.targetType === "EXPERIENCE") {
            await tx.experience.update({ where: { id: flag.targetId }, data: { status: "REMOVED" } });
          } else if (flag.targetType === "DOUBT") {
            await tx.doubt.delete({ where: { id: flag.targetId } });
          } else if (flag.targetType === "ANSWER") {
            await tx.answer.delete({ where: { id: flag.targetId } });
          }
        } catch (err) {
          // Only tolerate target already removed/deleted; propagate real DB failures
          if (!isRecordMissing(err)) throw err;
        }
      }

      await tx.flag.update({ where: { id }, data: { resolved: true } });
    });

    return ok({ message: takedown ? "Content removed and flag resolved" : "Flag resolved" });
  } catch (err) {
    return fail(err);
  }
}
