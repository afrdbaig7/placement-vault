import { describe, it, expect } from "bun:test";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

describe("Rate Limiting Engine", () => {
  it("extracts client IP correctly from X-Forwarded-For and X-Real-IP headers", () => {
    const req1 = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    expect(getClientIp(req1)).toBe("203.0.113.195");

    const req2 = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "198.51.100.42" },
    });
    expect(getClientIp(req2)).toBe("198.51.100.42");

    const req3 = new Request("http://localhost/api/test");
    expect(getClientIp(req3)).toBe("local");
  });

  it("enforces bucket limits and throws 429 when threshold exceeded", () => {
    const uniqueBucket = `test-bucket-${Date.now()}`;
    const req = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "10.0.0.1" },
    });

    const opts = { bucket: uniqueBucket, limit: 3, windowMs: 10_000 };

    // Calls 1, 2, 3 should succeed
    expect(() => enforceRateLimit(req, opts)).not.toThrow();
    expect(() => enforceRateLimit(req, opts)).not.toThrow();
    expect(() => enforceRateLimit(req, opts)).not.toThrow();

    // 4th call exceeds limit (3) and must throw 429
    expect(() => enforceRateLimit(req, opts)).toThrow();
  });
});

