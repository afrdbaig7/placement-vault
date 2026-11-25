import { fail, getCurrentUser, ok } from "@/lib/auth";
import { createWsAuthToken } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    enforceRateLimit(req, { bucket: "chat-token", limit: 30, windowMs: 60_000 });
    const user = await getCurrentUser();
    if (!user) return ok({ token: null });
    const token = createWsAuthToken({ id: user.id, name: user.name, role: user.role });
    return ok({ token });
  } catch (err) {
    return fail(err);
  }
}

