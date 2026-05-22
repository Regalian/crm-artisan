import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

export function loadTestEnv(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.test.local");

  if (!existsSync(envPath)) {
    return null;
  }

  loadEnvFile(envPath);
  return envPath;
}
