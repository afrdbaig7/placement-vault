import { fail, ok } from "@/lib/auth";
import { getOrCreateCsrfToken } from "@/lib/csrf";

export async function GET() {
  try {
    const csrfToken = await getOrCreateCsrfToken();
    return ok({ csrfToken });
  } catch (err) {
    return fail(err);
  }
}

