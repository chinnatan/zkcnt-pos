import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const testDataDir = join(import.meta.dir, "..", "..", ".test-run");

rmSync(testDataDir, { recursive: true, force: true });
mkdirSync(testDataDir, { recursive: true });

process.env.DATA_DIR = testDataDir;
process.env.JWT_SECRET = "test-secret";
process.env.LOG_LEVEL = "silent";
process.env.APP_URL = "http://localhost:4000";
process.env.ALLOWED_ORIGIN = "http://localhost:4000";

const { initBunDb } = await import("../db/client.bun");
const { initRuntimeConfig } = await import("../env");
const { bunEnv } = await import("../env.bun");
const { initFilesystemUploads } = await import("../lib/uploads.bun");
const { runMigrate } = await import("../db/migrate");

initRuntimeConfig({
  jwtSecret: "test-secret",
  appUrl: "http://localhost:4000",
  logLevel: "silent",
  allowedOrigin: "http://localhost:4000",
  resend: { apiKey: "", from: "" },
  uploadsDir: bunEnv.uploadsDir,
});

initBunDb(bunEnv.dbPath);
initFilesystemUploads(bunEnv.uploadsDir);
runMigrate();

const { createApp } = await import("../app");

(globalThis as typeof globalThis & { __testApp: ReturnType<typeof createApp> }).__testApp =
  createApp();
