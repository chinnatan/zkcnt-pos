import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  getRuntimeConfig,
  initRuntimeConfig,
  parseLogLevel,
  type RuntimeConfig,
} from "./env";

const dataDir = process.env.DATA_DIR ?? join(import.meta.dir, "..", "data");
const uploadsDir = join(dataDir, "uploads");

mkdirSync(uploadsDir, { recursive: true });

export const bunEnv = {
  port: Number(process.env.PORT ?? 3001),
  dataDir,
  dbPath: join(dataDir, "pos.db"),
  uploadsDir,
};

export function createBunRuntimeConfig(): RuntimeConfig {
  return {
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    appUrl: (process.env.APP_URL ?? "http://localhost:4000").replace(/\/$/, ""),
    logLevel: parseLogLevel(process.env.LOG_LEVEL),
    allowedOrigin:
      process.env.ALLOWED_ORIGIN ??
      process.env.APP_URL ??
      "http://localhost:4000",
    resend: {
      apiKey: process.env.RESEND_API_KEY ?? "",
      from: process.env.RESEND_FROM ?? "",
    },
    uploadsDir,
  };
}

function ensureBunRuntimeConfig(): RuntimeConfig {
  try {
    return getRuntimeConfig();
  } catch {
    return initRuntimeConfig(createBunRuntimeConfig());
  }
}

/** @deprecated Use getRuntimeConfig() — kept for Bun local entry */
export const env = {
  get port() {
    return bunEnv.port;
  },
  get logLevel() {
    return ensureBunRuntimeConfig().logLevel;
  },
  get dataDir() {
    return bunEnv.dataDir;
  },
  get dbPath() {
    return bunEnv.dbPath;
  },
  get uploadsDir() {
    return bunEnv.uploadsDir;
  },
  get jwtSecret() {
    return ensureBunRuntimeConfig().jwtSecret;
  },
  get appUrl() {
    return ensureBunRuntimeConfig().appUrl;
  },
  get resend() {
    return ensureBunRuntimeConfig().resend;
  },
};
