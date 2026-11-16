import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isSecureCookie, setSessionCookie } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  exchangeGoogleCode,
  isGoogleOAuthConfigured,
  resolveRedirectUri,
  verifyGoogleIdToken,
  verifyOAuthTransaction,
} from "@/lib/google-oauth";
import { OAUTH_TX_COOKIE } from "@/app/api/auth/google/route";

export async function GET(req: Request) {
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const redirectWithError = (code: string) => {
    const dest = new URL("/", origin);
    dest.searchParams.set("auth_error", code);
    return NextResponse.redirect(dest);
  };

  try {
    enforceRateLimit(req, { bucket: "auth-google-callback", limit: 15, windowMs: 60_000 });
    if (!isGoogleOAuthConfigured()) return redirectWithError("oauth_not_configured");

    const url = new URL(req.url);
    const oauthError = url.searchParams.get("error");
    if (oauthError) return redirectWithError("oauth_denied");

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const store = await cookies();
    const txCookie = store.get(OAUTH_TX_COOKIE)?.value;
    store.set(OAUTH_TX_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: await isSecureCookie(),
      path: "/",
      maxAge: 0,
    });

    const tx = verifyOAuthTransaction(txCookie, state);
    if (!tx || !code) return redirectWithError("invalid_oauth_state");

    const redirectUri = resolveRedirectUri(req);
    const idToken = await exchangeGoogleCode({
      code,
      codeVerifier: tx.codeVerifier,
      redirectUri,
    });
    const verified = await verifyGoogleIdToken(idToken);

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
    return NextResponse.redirect(new URL("/", origin));
  } catch (err) {
    console.error("[oauth-callback]", err);
    return redirectWithError("oauth_failed");
  }
}

