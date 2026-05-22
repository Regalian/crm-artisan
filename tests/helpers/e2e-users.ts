import type { TestCredentials } from "./test-users";

function readCredential(
  emailEnvName: string,
  passwordEnvName: string,
  fallbackEmail: string,
  fallbackPassword: string,
): TestCredentials {
  return {
    email: process.env[emailEnvName] || fallbackEmail,
    password: process.env[passwordEnvName] || fallbackPassword,
  };
}

export const SECURITY_USER_A = readCredential(
  "E2E_USER_1_EMAIL",
  "E2E_USER_1_PASSWORD",
  "testuser1@example.com",
  "playwright123!",
);

export const SECURITY_USER_B = readCredential(
  "E2E_USER_2_EMAIL",
  "E2E_USER_2_PASSWORD",
  "testuser2@example.com",
  "playwright123!",
);

if (SECURITY_USER_A.email === SECURITY_USER_B.email) {
  throw new Error("E2E_USER_1_EMAIL and E2E_USER_2_EMAIL must be different.");
}
