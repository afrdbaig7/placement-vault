import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isSecureCookie, setSessionCookie } from "@/lib/session";
import { fail, ok, publicUser } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseBody, googleCredentialSchema } from "@/lib/validation";
import {
  buildGoogleAuthUrl,
  createOAuthTransaction,
  isGoogleOAuthConfigured,
  resolveRedirectUri,
  verifyGoogleIdToken,
} from "@/lib/google-oauth";

export const OAUTH_TX_COOKIE = "cph_oauth_tx";

/**
 * GET /api/auth/google
 * Starts the Google OAuth 2.0 Authorization Code + PKCE flow.
 */
export async function GET(req: Request) {
  try {
    enforceRateLimit(req, { bucket: "auth-google-get", limit: 15, windowMs: 60_000 });

    if (!isGoogleOAuthConfigured()) {
      const origin = process.env.APP_URL || new URL(req.url).origin;
      const errUrl = new URL("/", origin);
      errUrl.searchParams.set("auth_error", "oauth_not_configured");
      return NextResponse.redirect(errUrl);
    }

    const { state, codeChallenge, signedCookie } = createOAuthTransaction();
    const redirectUri = resolveRedirectUri(req);
    const authUrl = buildGoogleAuthUrl({ redirectUri, state, codeChallenge });

    const store = await cookies();
    store.set(OAUTH_TX_COOKIE, signedCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: await isSecureCookie(),
      path: "/",
      maxAge: 600,
    });

    return NextResponse.redirect(authUrl);
  } catch (err) {
    return fail(err);
  }
}

/**
 * POST /api/auth/google
 * Verifies a Google Identity Services ID token (JWT) against Google's JWKS.
 */
export async function POST(req: Request) {
  try {
    enforceRateLimit(req, { bucket: "auth-google-post", limit: 10, windowMs: 60_000 });
    await assertCsrf(req);

    const { credential } = await parseBody(req, googleCredentialSchema);
    const verified = await verifyGoogleIdToken(credential);

    let user = await db.user.findUnique({ where: { email: verified.email } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: verified.email,
          name: verified.name,
          image: verified.image,
          role: "STUDENT",
          rollVerified: false,
        },
      });
    } else if (verified.image && user.image !== verified.image) {
      user = await db.user.update({
        where: { id: user.id },
        data: { image: verified.image },
      });
    }

    await setSessionCookie(user.id);
    return ok({ user: publicUser(user) });
  } catch (err) {
    return fail(err);
  }
}
