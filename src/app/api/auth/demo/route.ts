import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { ApiError, fail, ok, publicUser } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { demoLoginSchema, parseBody } from "@/lib/validation";

const DEMO_EMAILS = new Set([
  "vikram.singh.cse@gmail.com",
  "ishita.bose.ece@gmail.com",
  "rahul.kumar.it@gmail.com",
  "dev.malhotra@gmail.com",
  "sneha.iyer.2025@gmail.com",
  "rohan.verma.cph@gmail.com",
  "ananya.rao.cph@gmail.com",
]);

/**
 * Strictly local-development-only demo switcher.
 * Disabled in production and whenever ENABLE_DEV_DEMO_AUTH !== "true".
 */
export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV !== "development" || process.env.ENABLE_DEV_DEMO_AUTH !== "true") {
      throw new ApiError(404, "Not found");
    }

    enforceRateLimit(req, { bucket: "auth-demo", limit: 15, windowMs: 60_000 });
    await assertCsrf(req);

    const { email } = await parseBody(req, demoLoginSchema);
    if (!DEMO_EMAILS.has(email)) {
      throw new ApiError(403, "Only allowlisted seeded demo accounts are permitted");
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(404, "Seeded demo account not found in database");
    }

    await setSessionCookie(user.id);
    return ok({ user: publicUser(user) });
  } catch (err) {
    return fail(err);
  }
}

