import type { Browser, BrowserContext } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import { getSupabaseTestEnv } from "./supabase-env";

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseTestEnv();

export { SUPABASE_ANON_KEY, SUPABASE_URL };

export function getProjectRef() {
  return new URL(SUPABASE_URL).hostname.split(".")[0];
}

export function encodeSession(session: Session) {
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;
}

export async function createSession(
  email: string,
  password: string,
  maxAttempts = 4,
): Promise<Session> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const signUpResult = await supabase.auth.signUp({ email, password });

    if (signUpResult.data.session) {
      return signUpResult.data.session;
    }

    const signUpErrorMessage = signUpResult.error?.message ?? "";
    const shouldTrySignIn =
      !signUpResult.error ||
      signUpErrorMessage.toLowerCase().includes("already") ||
      signUpErrorMessage.toLowerCase().includes("registered");

    if (shouldTrySignIn) {
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInResult.data.session) {
        return signInResult.data.session;
      }

      lastError = signInResult.error?.message ?? "sign-in did not return a session";
    } else {
      lastError = signUpErrorMessage;
    }

    const isRateLimited =
      lastError.toLowerCase().includes("rate limit") ||
      lastError.toLowerCase().includes("too many");

    if (isRateLimited && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 3_000));
      continue;
    }

    break;
  }

  throw new Error(`Failed to create Supabase test session: ${lastError}`);
}

export async function signUpUser(
  email: string,
  password: string,
  maxAttempts = 4,
): Promise<{ session: Session; token: string; userId: string }> {
  const session = await createSession(email, password, maxAttempts);

  return {
    session,
    token: session.access_token,
    userId: session.user.id,
  };
}

export function buildAuthCookie(session: Session, baseUrl: string) {
  const resolvedBaseUrl = new URL(baseUrl);

  return {
    name: `sb-${getProjectRef()}-auth-token`,
    value: encodeSession(session),
    domain: resolvedBaseUrl.hostname,
    path: "/",
    expires: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    httpOnly: false,
    secure: resolvedBaseUrl.protocol === "https:",
    sameSite: "Lax" as const,
  };
}

export function buildStorageState(session: Session, baseUrl: string) {
  return {
    cookies: [buildAuthCookie(session, baseUrl)],
    origins: [],
  };
}

export async function createAuthenticatedContext(
  browser: Browser,
  baseUrl: string,
  email: string,
  password: string,
): Promise<BrowserContext> {
  const context = await browser.newContext();
  const session = await createSession(email, password);

  await context.addCookies([buildAuthCookie(session, baseUrl)]);

  return context;
}
