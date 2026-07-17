#!/usr/bin/env bun
/**
 * Upload local filesystem uploads to R2 via wrangler.
 *
 * Prerequisites:
 *   - wrangler logged in
 *   - R2 bucket zkcnt-pos-uploads exists
 *
 * Usage:
 *   bun run scripts/sync-uploads-to-r2.ts
 *   bun run scripts/sync-uploads-to-r2.ts --dry-run
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const dataDir = process.env.DATA_DIR ?? join(import.meta.dir, "..", "data");
const uploadsDir = join(dataDir, "uploads");
const bucket = process.env.R2_BUCKET ?? "zkcnt-pos-uploads";
const dryRun = process.argv.includes("--dry-run");

function walkFiles(dir: string, base = dir): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === ".DS_Store") continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkFiles(fullPath, base));
    } else {
      files.push(relative(base, fullPath));
    }
  }
  return files;
}

function main() {
  const files = walkFiles(uploadsDir);
  console.log(`Found ${files.length} files in ${uploadsDir}`);

  for (const file of files) {
    const key = file.replace(/\\/g, "/");
    const localPath = join(uploadsDir, file);
    // --remote is required; without it wrangler writes to local Miniflare R2 only.
    const command = [
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      `--file=${localPath}`,
      "--remote",
    ];

    if (dryRun) {
      console.log(`[dry-run] ${command.join(" ")}`);
      continue;
    }

    const result = spawnSync(command[0]!, command.slice(1), {
      stdio: "inherit",
      encoding: "utf8",
    });
    if (result.status !== 0) {
      throw new Error(`Failed to upload ${key}`);
    }
  }

  console.log(dryRun ? "Dry run complete" : "Upload complete");
}

main();
