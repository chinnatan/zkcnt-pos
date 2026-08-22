import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedVersion: string | null = null;

export function readAppVersion(): string {
  const fromEnv = process.env.APP_VERSION?.trim();
  if (fromEnv) return fromEnv.replace(/^v/i, "");

  if (cachedVersion) return cachedVersion;

  try {
    const root = join(import.meta.dir, "..", "..");
    const raw = readFileSync(join(root, "VERSION"), "utf8").trim();
    cachedVersion = raw.split("\n")[0]?.trim().replace(/^v/i, "") ?? "0.0.0";
  } catch {
    cachedVersion = "0.0.0";
  }

  return cachedVersion;
}

export function readBuildId(): string {
  return process.env.BUILD_ID?.trim() || "dev";
}
