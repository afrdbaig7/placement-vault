import { clearSessionCookie } from "@/lib/session";
import { fail, ok } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    enforceRateLimit(req, { bucket: "auth-logout", limit: 20, windowMs: 60_000 });
    await assertCsrf(req);
    await clearSessionCookie();
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
