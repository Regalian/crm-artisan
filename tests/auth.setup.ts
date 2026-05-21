import { writeFile } from "node:fs/promises";

import { expect, test as setup } from "@playwright/test";

import { buildStorageState, createSession } from "./helpers/supabase-auth";
import { makeUser } from "./helpers/test-users";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const AUTH_FILE = "tests/auth.json";
const TEST_USER = makeUser(`pw-test-${process.env.TEST_RUN_ID || Date.now()}`, "playwright123!");

setup("create authenticated Playwright session", async () => {
  const session = await createSession(TEST_USER.email, TEST_USER.password);
  const storageState = buildStorageState(session, BASE_URL);

  await writeFile(AUTH_FILE, JSON.stringify(storageState, null, 2));
  expect(storageState.cookies[0].value).toContain("base64-");
});
