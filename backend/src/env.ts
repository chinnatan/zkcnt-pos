import { mkdirSync } from "node:fs";
import { join } from "node:path";

const dataDir = process.env.DATA_DIR ?? join(import.meta.dir, "..", "data");
const uploadsDir = join(dataDir, "uploads");

mkdirSync(uploadsDir, { recursive: true });

type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

function parseLogLevel(value: string | undefined): LogLevel {
  const level = value?.toLowerCase();
  if (
    level === "debug" ||
    level === "info" ||
    level === "warn" ||
    level === "error" ||
    level === "silent"
  ) {
    return level;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  logLevel: parseLogLevel(process.env.LOG_LEVEL),
  dataDir,
  dbPath: join(dataDir, "pos.db"),
  uploadsDir,
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  appUrl: (process.env.APP_URL ?? "http://localhost:4000").replace(/\/$/, ""),
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.RESEND_FROM ?? "",
  },
};
