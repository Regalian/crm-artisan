import { execFileSync } from "node:child_process";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function readLocalSupabaseStatus() {
  try {
    const stdout = execFileSync("supabase", ["status", "-o", "json"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const status = JSON.parse(stdout);
    if (!status.API_URL || !status.ANON_KEY) {
      return null;
    }

    return {
      url: status.API_URL as string,
      anonKey: status.ANON_KEY as string,
    };
  } catch {
    return null;
  }
}

export function getSupabaseTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url, anonKey };
  }

  const localStatus = readLocalSupabaseStatus();
  if (localStatus) {
    return localStatus;
  }

  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY, and could not read `supabase status -o json`. Start local Supabase or set the env vars before running database-backed tests.",
  );
}
