import { execFileSync } from "node:child_process";
import process from "node:process";

function readLocalStatus() {
  try {
    const stdout = execFileSync("supabase", ["status", "-o", "json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const status = JSON.parse(stdout);

    if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
      return null;
    }

    return status;
  } catch {
    return null;
  }
}

export function ensureLocalSupabase() {
  const existingStatus = readLocalStatus();
  if (existingStatus) {
    return existingStatus;
  }

  console.log("Starting local Supabase...");
  execFileSync("supabase", ["start"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  const startedStatus = readLocalStatus();
  if (!startedStatus) {
    throw new Error(
      "Could not read local Supabase status after starting it. Run `supabase status -o json` to troubleshoot.",
    );
  }

  return startedStatus;
}

export function getLocalSupabaseEnv({ baseUrl }) {
  const resolvedBaseUrl = process.env.BASE_URL || baseUrl;
  const status = ensureLocalSupabase();

  return {
    ...process.env,
    BASE_URL: resolvedBaseUrl,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || resolvedBaseUrl,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  };
}
