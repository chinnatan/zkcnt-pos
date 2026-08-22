import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Read semver from repo root VERSION file (single line, no v prefix). */
export function readVersionFromRoot(rootDir?: string): string {
  const root = rootDir ?? join(import.meta.dirname, "..");
  const raw = readFileSync(join(root, "VERSION"), "utf8").trim();
  const line = raw.split("\n")[0]?.trim() ?? "";
  if (!line) {
    throw new Error("VERSION file is empty");
  }
  return line.replace(/^v/i, "");
}
