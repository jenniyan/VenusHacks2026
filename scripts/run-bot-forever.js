import { spawn } from "node:child_process";

let child = null;
let stopping = false;
let restartCount = 0;

function timestamp() {
  return new Date().toLocaleTimeString();
}

function startBot() {
  console.log(`[${timestamp()}] Starting Lumin Slack bot...`);
  child = spawn(process.execPath, ["src/app.js"], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    child = null;
    if (stopping) return;

    restartCount += 1;
    const delayMs = Math.min(30000, 2000 + restartCount * 1000);
    console.log(
      `[${timestamp()}] Lumin bot stopped` +
        ` (${signal || `exit ${code}`}). Restarting in ${Math.round(delayMs / 1000)}s...`,
    );
    setTimeout(startBot, delayMs);
  });
}

function stopBot(signal) {
  stopping = true;
  console.log(`[${timestamp()}] Stopping Lumin Slack bot...`);
  if (child) child.kill(signal);
  process.exit(0);
}

process.on("SIGINT", () => stopBot("SIGINT"));
process.on("SIGTERM", () => stopBot("SIGTERM"));

startBot();
