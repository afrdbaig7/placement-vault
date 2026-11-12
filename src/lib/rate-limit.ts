import "server-only";
import { ApiError } from "@/lib/auth";
import { getRedisClient } from "@/lib/redis";

type BucketEntry = { count: number; resetAt: number };

const MAX_BUCKETS = 10_000;
const memoryBuckets = new Map<string, BucketEntry>();
let lastSweep = Date.now();

function sweepExpired(now: number) {
  if (now - lastSweep < 60_000 && memoryBuckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [k, entry] of memoryBuckets) {
    if (entry.resetAt <= now) memoryBuckets.delete(k);
  }
  while (memoryBuckets.size >= MAX_BUCKETS) {
    const oldestKey = memoryBuckets.keys().next().value;
    if (!oldestKey) break;
    memoryBuckets.delete(oldestKey);
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

/**
 * Distributed Redis rate limiter with automatic in-memory fallback.
 * Uses sliding/fixed TTL counter keys in Redis when available.
 */
export async function enforceRateLimitAsync(
  req: Request,
  opts: { bucket: string; limit: number; windowMs: number; keySuffix?: string }
): Promise<void> {
  const ip = getClientIp(req);
  const key = opts.keySuffix ? `rl:${opts.bucket}:${opts.keySuffix}:${ip}` : `rl:${opts.bucket}:${ip}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec);
      }
      if (current > opts.limit) {
        const ttl = await redis.ttl(key);
        const retryAfter = ttl > 0 ? ttl : windowSec;
        throw new ApiError(429, "Too many requests — please wait a moment before trying again", {
          "Retry-After": String(retryAfter),
        });
      }
      return;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // If redis errors out, fall back to in-memory check below
    }
  }

  // In-memory fallback
  enforceRateLimit(req, opts);
}

/**
 * Synchronous in-memory rate limiter (guaranteed zero latency).
 */
export function enforceRateLimit(
  req: Request,
  opts: { bucket: string; limit: number; windowMs: number; keySuffix?: string }
) {
  const now = Date.now();
  sweepExpired(now);

  const ip = getClientIp(req);
  const key = opts.keySuffix ? `${opts.bucket}:${opts.keySuffix}:${ip}` : `${opts.bucket}:${ip}`;
  const current = memoryBuckets.get(key);

  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + opts.windowMs });
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
