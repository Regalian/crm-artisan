import { writeFile } from "node:fs/promises";

import { expect, test as setup } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import { getSupabaseTestEnv } from "./helpers/supabase-env";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const AUTH_FILE = "tests/auth.json";
const TEST_EMAIL = `pw-test-${process.env.TEST_RUN_ID || Date.now()}@example.com`;
const TEST_PASSWORD = "playwright123!";
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseTestEnv();

function getProjectRef() {
  return new URL(SUPABASE_URL).hostname.split(".")[0];
}

function encodeSession(session: Session) {
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;
}

async function createSession(maxAttempts = 4): Promise<Session> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const signUpResult = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signUpResult.data.session) {
      return signUpResult.data.session;
    }

    if (!signUpResult.error) {
      const signInResult = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signInResult.data.session) {
        return signInResult.data.session;
      }

      lastError = signInResult.error?.message ?? "sign-in did not return a session";
    } else {
      lastError = signUpResult.error.message;
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

  throw new Error(`Failed to create Playwright auth session: ${lastError}`);
}

setup("create authenticated Playwright session", async () => {
  const session = await createSession();
  const baseUrl = new URL(BASE_URL);

  const storageState = {
    cookies: [
      {
        name: `sb-${getProjectRef()}-auth-token`,
        value: encodeSession(session),
        domain: baseUrl.hostname,
        path: "/",
        expires: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        httpOnly: false,
        secure: baseUrl.protocol === "https:",
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };

  await writeFile(AUTH_FILE, JSON.stringify(storageState, null, 2));
  expect(storageState.cookies[0].value).toContain("base64-");
});
