import "server-only";
import crypto from "crypto";
import { ApiError } from "@/lib/auth";
import { signToken, verifySignedToken } from "@/lib/session";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const ALLOWED_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

type GoogleJwk = {
  kid: string;
  alg?: string;
  kty: string;
  n?: string;
  e?: string;
  use?: string;
};

let jwksCache: { keys: GoogleJwk[]; expiresAt: number } | null = null;

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isGoogleClientConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new ApiError(503, "Google OAuth is not configured on the server");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new ApiError(503, "Google OAuth client secret is not configured on the server");
  return secret;
}

export function resolveRedirectUri(req: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const origin = process.env.APP_URL || new URL(req.url).origin;
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function createOAuthTransaction() {
  const state = crypto.randomBytes(32).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const payload = Buffer.from(
    JSON.stringify({ state, codeVerifier, exp: Date.now() + 10 * 60 * 1000 }),
    "utf8"
  ).toString("base64url");
  const signedCookie = signToken(`oauth:${payload}`);
  return { state, codeChallenge, signedCookie };
}

export function verifyOAuthTransaction(
  cookieVal: string | undefined,
  returnedState: string | null
): { codeVerifier: string } | null {
  const verified = verifySignedToken(cookieVal);
  if (!verified || !verified.startsWith("oauth:") || !returnedState) return null;
  try {
    const data = JSON.parse(Buffer.from(verified.slice(6), "base64url").toString("utf8")) as {
      state?: string;
      codeVerifier?: string;
      exp?: number;
    };
    if (!data.state || !data.codeVerifier || !data.exp || data.exp < Date.now()) return null;
    const expectedBuf = Buffer.from(data.state, "utf8");
    const actualBuf = Buffer.from(returnedState, "utf8");
    if (expectedBuf.length !== actualBuf.length) return null;
    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return null;
    return { codeVerifier: data.codeVerifier };
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(opts: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeGoogleCode(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<string> {
  const params = new URLSearchParams({
    code: opts.code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.codeVerifier,
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!res.ok || !data.id_token) {
    throw new ApiError(401, "Failed to verify Google authorization code");
  }
  return data.id_token;
}

async function fetchGoogleJwks(): Promise<GoogleJwk[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) {
    return jwksCache.keys;
  }
  const res = await fetch(GOOGLE_JWKS_URI);
  if (!res.ok) throw new ApiError(502, "Unable to fetch Google signing keys");
  const body = (await res.json()) as { keys?: GoogleJwk[] };
  const keys = body.keys ?? [];
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600_000;
  jwksCache = { keys, expiresAt: Date.now() + ttlMs };
  return keys;
}

export type VerifiedGoogleUser = {
  sub: string;
  email: string;
  name: string;
  image: string | null;
};

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  const clientId = getClientId();
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new ApiError(401, "Invalid Google ID token");

  const [headerB64, payloadB64, sigB64] = parts;
  let header: { kid?: string; alg?: string };
  let payload: {
    iss?: string;
    aud?: string;
    sub?: string;
    exp?: number;
    nbf?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw new ApiError(401, "Malformed Google ID token");
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new ApiError(401, "Unsupported Google token algorithm");
  }

  const keys = await fetchGoogleJwks();
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    // Force refresh in case Google rotated keys
    jwksCache = null;
    const freshKeys = await fetchGoogleJwks();
    jwk = freshKeys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new ApiError(401, "Google signing key not found");

  const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKeyInput["key"], format: "jwk" });
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
  const signature = Buffer.from(sigB64, "base64url");
  const validSig = crypto.verify("RSA-SHA256", signingInput, publicKey, signature);
  if (!validSig) throw new ApiError(401, "Invalid Google token signature");

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.iss || !ALLOWED_ISSUERS.has(payload.iss)) {
    throw new ApiError(401, "Invalid Google token issuer");
  }
  if (payload.aud !== clientId) {
    throw new ApiError(401, "Google token audience mismatch");
  }
  if (!payload.exp || payload.exp <= nowSec) {
    throw new ApiError(401, "Google token expired");
  }
  if (payload.nbf && payload.nbf > nowSec + 60) {
    throw new ApiError(401, "Google token not yet valid");
  }
  if (!payload.email || !payload.email_verified || !payload.sub) {
    throw new ApiError(401, "Google account email is not verified");
  }

  const email = payload.email.trim().toLowerCase();
  const name = (payload.name ?? email.split("@")[0] ?? "Student").trim().slice(0, 100);
  const image = typeof payload.picture === "string" && payload.picture.startsWith("https://")
    ? payload.picture.slice(0, 500)
    : null;

  return { sub: payload.sub, email, name, image };
}

