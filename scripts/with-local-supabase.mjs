import { spawn } from "node:child_process";
import process from "node:process";

import { loadTestEnv } from "./load-test-env.mjs";
import { getLocalSupabaseEnv } from "./local-supabase.mjs";

loadTestEnv();

const [command, ...args] = process.argv.slice(2);

if (!command) {
  throw new Error("Usage: node scripts/with-local-supabase.mjs <command> [...args]");
}

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3001";
const env = {
  ...getLocalSupabaseEnv({ baseUrl }),
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
