import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { ApiError } from "@/lib/auth";
import { getSessionSecret, isSecureCookie } from "@/lib/session";

const CSRF_COOKIE = "cph_csrf";
const HEX_64_RE = /^[0-9a-f]{64}$/;
const MAX_AGE = 60 * 60 * 24 * 30;

function deriveCsrfToken(cookieSecret: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`csrf:${cookieSecret}`)
    .digest("hex");
}

export async function getOrCreateCsrfToken(): Promise<string> {
  const store = await cookies();
  let secret = store.get(CSRF_COOKIE)?.value;
  if (!secret || !HEX_64_RE.test(secret)) {
    secret = crypto.randomBytes(32).toString("hex");
    store.set(CSRF_COOKIE, secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: await isSecureCookie(),
      path: "/",
      maxAge: MAX_AGE,
    });
  }
  return deriveCsrfToken(secret);
}

function extractHost(urlHeader: string | null): string | null {
  if (!urlHeader) return null;
  try {
    return new URL(urlHeader).host.toLowerCase();
  } catch {
    return null;
  }
}

function getExpectedHosts(req: Request): Set<string> {
  const allowed = new Set<string>();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) allowed.add(host.toLowerCase());
  if (process.env.APP_URL) {
    const appHost = extractHost(process.env.APP_URL);
    if (appHost) allowed.add(appHost);
  }
  return allowed;
}

export async function assertCsrf(req: Request) {
  const expectedHosts = getExpectedHosts(req);
  const originHost = extractHost(req.headers.get("origin"));
  const refererHost = extractHost(req.headers.get("referer"));
  const requestSourceHost = originHost ?? refererHost;

  if (requestSourceHost && expectedHosts.size > 0 && !expectedHosts.has(requestSourceHost)) {
    throw new ApiError(403, "Cross-origin request rejected");
  }

  const store = await cookies();
  const cookieSecret = store.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get("x-csrf-token");

  if (!cookieSecret || !HEX_64_RE.test(cookieSecret) || !headerToken || !HEX_64_RE.test(headerToken)) {
    throw new ApiError(403, "Invalid or missing CSRF token — please refresh the page");
  }

  const expected = deriveCsrfToken(cookieSecret);
  const actualBuf = Buffer.from(headerToken, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    throw new ApiError(403, "Invalid or missing CSRF token — please refresh the page");
  }
}

