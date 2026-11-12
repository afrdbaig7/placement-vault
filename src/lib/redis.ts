import "server-only";
import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redis.on("error", (err) => {
      // Gracefully log without crashing process
      console.warn("[Redis] Connection warning:", err.message);
    });

    return redis;
  } catch (err) {
    console.warn("[Redis] Initialization failed:", err);
    return null;
  }
}
