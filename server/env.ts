import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFilePath = path.join(rootDir, ".env");

type ProcessWithEnvLoader = NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

let loaded = false;

export function ensureLocalEnvLoaded() {
  if (loaded) return;
  loaded = true;

  const runtime = process as ProcessWithEnvLoader;
  if (typeof runtime.loadEnvFile !== "function") return;
  if (!existsSync(envFilePath)) return;

  runtime.loadEnvFile(envFilePath);
}
