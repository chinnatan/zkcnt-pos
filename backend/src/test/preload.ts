import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const testDataDir = join(import.meta.dir, "..", "..", ".test-run");

rmSync(testDataDir, { recursive: true, force: true });
mkdirSync(testDataDir, { recursive: true });

process.env.DATA_DIR = testDataDir;
process.env.JWT_SECRET = "test-secret";
process.env.LOG_LEVEL = "silent";

const { runMigrate } = await import("../db/migrate");
runMigrate();

const { createApp } = await import("../app");

(globalThis as typeof globalThis & { __testApp: ReturnType<typeof createApp> }).__testApp =
  createApp();
