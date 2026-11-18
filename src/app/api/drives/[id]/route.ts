import { db } from "@/lib/db";
import { fail, ok, requireMod, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { driveActionSchema, idSchema, parseBody } from "@/lib/validation";

/** Moderator closes a drive → its approved OA reports come out of embargo. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertCsrf(req);
    const mod = await requireMod();
    enforceRateLimit(req, { bucket: "drives-action", limit: 30, windowMs: 60_000, keySuffix: mod.id });

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid drive ID");
    const id = parsedId.data;

    const { action } = await parseBody(req, driveActionSchema);

    const drive = await db.drive.findUnique({ where: { id } });
    if (!drive) throw new ApiError(404, "Drive not found");

    if (action === "close") {
      if (drive.status === "CLOSED") throw new ApiError(400, "Drive is already closed");
      const updated = await db.drive.update({ where: { id }, data: { status: "CLOSED" } });
      return ok({ drive: updated, message: "Drive closed — approved reports are now visible" });
    }

    if (mod.role !== "ADMIN") throw new ApiError(403, "Only admins can reopen a drive");
    const updated = await db.drive.update({ where: { id }, data: { status: "OPEN" } });
    return ok({ drive: updated });
  } catch (err) {
    return fail(err);
  }
}
