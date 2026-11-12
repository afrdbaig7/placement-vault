import { db } from "@/lib/db";
import { getRedisClient } from "@/lib/redis";
import { ok, fail } from "@/lib/auth";

export async function GET() {
  try {
    const startTime = Date.now();

    // 1. Database check
    await db.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    // 2. Redis check
    let redisStatus = "not_configured";
    const redis = getRedisClient();
    if (redis) {
      try {
        const rStart = Date.now();
        await redis.ping();
        redisStatus = `connected (${Date.now() - rStart}ms)`;
      } catch {
        redisStatus = "unreachable";
      }
    }

    return ok({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database: `connected (${dbLatencyMs}ms)`,
        redis: redisStatus,
      },
      version: "0.2.1",
    });
  } catch (err) {
    return fail(err);
  }
}
