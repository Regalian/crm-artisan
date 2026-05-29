import { spawn } from "node:child_process";
import process from "node:process";

import { getLocalSupabaseEnv } from "./local-supabase.mjs";

function hasFlag(args, longFlag, shortFlag) {
  return args.some((arg) => arg === longFlag || arg === shortFlag || arg.startsWith(`${longFlag}=`));
}

function readFlagValue(args, longFlag, shortFlag) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === longFlag || arg === shortFlag) {
      return args[index + 1] ?? null;
    }

    if (arg.startsWith(`${longFlag}=`)) {
      return arg.slice(longFlag.length + 1);
    }
  }

  return null;
}

const extraArgs = process.argv.slice(2);
const host = readFlagValue(extraArgs, "--hostname", "-H") || "127.0.0.1";
const port = readFlagValue(extraArgs, "--port", "-p") || process.env.PORT || "3000";
const args = ["dev"];

if (!hasFlag(extraArgs, "--hostname", "-H")) {
  args.push("--hostname", host);
}

if (!hasFlag(extraArgs, "--port", "-p")) {
  args.push("--port", port);
}

args.push(...extraArgs);

const env = getLocalSupabaseEnv({
  baseUrl: `http://127.0.0.1:${port}`,
});

const child = spawn("next", args, {
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
