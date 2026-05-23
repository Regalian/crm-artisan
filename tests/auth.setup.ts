import { writeFile } from "node:fs/promises";

import { expect, test as setup } from "@playwright/test";

import { buildStorageState, createSession } from "./helpers/supabase-auth";
import { makeUser } from "./helpers/test-users";

// Playwright setup task, not a product test.
//
// This project exists only to create an authenticated storageState file that
// the browser-based specs can reuse. It intentionally appears as a setup step
// in Playwright's project dependency graph rather than as a normal app-behavior
// test case.
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const AUTH_FILE = "tests/auth.json";
const TEST_USER = makeUser(`pw-test-${process.env.TEST_RUN_ID || Date.now()}`, "playwright123!");

setup("setup: create authenticated storage state for dependent Playwright projects", async () => {
  const session = await createSession(TEST_USER.email, TEST_USER.password);
  const storageState = buildStorageState(session, BASE_URL);

  await writeFile(AUTH_FILE, JSON.stringify(storageState, null, 2));
  // Sanity-check the generated auth payload so dependent projects fail early
  // if the storage state format changes unexpectedly.
  expect(storageState.cookies[0].value).toContain("base64-");
});
