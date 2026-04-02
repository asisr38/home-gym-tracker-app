import { spawn } from "child_process";

const separatorIndex = process.argv.indexOf("--");
const command =
  separatorIndex >= 0 ? process.argv.slice(separatorIndex + 1) : process.argv.slice(2);

if (command.length === 0) {
  console.error("Missing command. Usage: node --import tsx script/run-with-context.ts -- <command>");
  process.exit(1);
}

const contextWatcher = spawn(
  process.execPath,
  ["--import", "tsx", "script/update-context.ts", "--watch"],
  {
    stdio: "inherit",
    env: process.env,
  },
);

const appProcess = spawn(command[0], command.slice(1), {
  stdio: "inherit",
  env: process.env,
});

let exiting = false;

const stopChild = (child: typeof contextWatcher, signal: NodeJS.Signals = "SIGTERM") => {
  if (child.exitCode === null && !child.killed) {
    child.kill(signal);
  }
};

const exitOnce = (code: number) => {
  if (exiting) return;
  exiting = true;
  process.exit(code);
};

contextWatcher.on("exit", (code) => {
  if (exiting) return;
  if (appProcess.exitCode !== null) {
    exitOnce(appProcess.exitCode ?? 0);
    return;
  }
  if ((code ?? 0) !== 0) {
    stopChild(appProcess);
    exitOnce(code ?? 1);
  }
});

appProcess.on("exit", (code, signal) => {
  stopChild(contextWatcher, signal ?? "SIGTERM");
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  exitOnce(code ?? 0);
});

process.on("SIGINT", () => {
  stopChild(appProcess, "SIGINT");
  stopChild(contextWatcher, "SIGINT");
});

process.on("SIGTERM", () => {
  stopChild(appProcess, "SIGTERM");
  stopChild(contextWatcher, "SIGTERM");
});
