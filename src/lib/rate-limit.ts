import "server-only";
import { ApiError } from "@/lib/auth";

type BucketEntry = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, BucketEntry>();
let lastSweep = Date.now();

function sweepExpired(now: number) {
  if (now - lastSweep < 60_000 && buckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [k, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(k);
  }
  // If still oversized under heavy abuse, evict oldest entries
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "local";
}

export function enforceRateLimit(
  req: Request,
  opts: { bucket: string; limit: number; windowMs: number; keySuffix?: string }
) {
  const now = Date.now();
  sweepExpired(now);

  const ip = getClientIp(req);
  const key = opts.keySuffix ? `${opts.bucket}:${opts.keySuffix}:${ip}` : `${opts.bucket}:${ip}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  if (current.count >= opts.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new ApiError(429, "Too many requests — please wait a moment before trying again", {
      "Retry-After": String(retryAfterSec),
    });
  }

  current.count += 1;
}

