import "server-only";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

export const SESSION_COOKIE_NAME = "cph_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const HEX_64_RE = /^[0-9a-f]{64}$/;

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET environment variable must be configured and at least 32 characters long"
    );
  }
  return secret;
}

function signHmac(value: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

export function signToken(value: string): string {
  return `${value}.${signHmac(value)}`;
}

export function verifySignedToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 1) return null;
  const value = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (!HEX_64_RE.test(sig)) return null;
  const expected = signHmac(value);
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  return value;
}

export async function isSecureCookie(): Promise<boolean> {
  if (process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIE === "true") {
    return true;
  }
  const h = await headers();
  return h.get("x-forwarded-proto") === "https";
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return verifySignedToken(store.get(SESSION_COOKIE_NAME)?.value);
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  const secure = await isSecureCookie();
  store.set(SESSION_COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const secure = await isSecureCookie();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

/** Issue a short-lived HMAC-signed token for authenticating with the WebSocket chat service. */
export function createWsAuthToken(user: { id: string; name: string; role: string }): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      role: user.role,
      exp: Date.now() + 5 * 60 * 1000,
    }),
    "utf8"
  ).toString("base64url");
  return signToken(`ws:${payload}`);
}
