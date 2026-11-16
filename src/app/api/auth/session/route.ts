import { getCurrentUser, fail, ok, publicUser } from "@/lib/auth";
import { balanceOf, contributionCompanies, postsToday } from "@/lib/coins";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";
import { config } from "@/data/config";

export async function GET() {
  try {
    const [user, csrfToken] = await Promise.all([getCurrentUser(), getOrCreateCsrfToken()]);
    const authConfig = {
      googleEnabled: isGoogleOAuthConfigured(),
      devDemoEnabled:
        process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_DEMO_AUTH === "true",
    };

    if (!user) {
      return ok({
        user: null,
        balance: 0,
        contributionCompanies: [],
        postsToday: 0,
        rates: config.rates,
        caps: config.caps,
        csrfToken,
        authConfig,
      });
    }

    const [balance, contribs, posts] = await Promise.all([
      balanceOf(user.id),
      contributionCompanies(user.id),
      postsToday(user.id),
    ]);
    return ok({
      user: publicUser(user),
      balance,
      contributionCompanies: contribs,
      postsToday: posts,
      rates: config.rates,
      caps: config.caps,
      csrfToken,
      authConfig,
    });
  } catch (err) {
    return fail(err);
  }
}
