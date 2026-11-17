import { ok } from "@/lib/auth";

export async function GET() {
  return ok({ ok: true, service: "campus-placement-hub" });
}
