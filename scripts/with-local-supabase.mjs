import { execFileSync, spawn } from "node:child_process";
import process from "node:process";

function readLocalStatus() {
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

    return status;
  } catch {
    return null;
  }
}

function ensureLocalSupabase() {
  const existingStatus = readLocalStatus();
  if (existingStatus) {
    return existingStatus;
  }

  console.log("Starting local Supabase for database-backed tests...");
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

const [command, ...args] = process.argv.slice(2);

if (!command) {
  throw new Error("Usage: node scripts/with-local-supabase.mjs <command> [...args]");
}

const status = ensureLocalSupabase();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3001";
const env = {
  ...process.env,
  BASE_URL: baseUrl,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || baseUrl,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_TEST_MODE: "local",
};

const child = spawn(command, args, {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
