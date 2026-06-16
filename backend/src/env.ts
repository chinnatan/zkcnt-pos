import { mkdirSync } from "node:fs";
import { join } from "node:path";

const dataDir = process.env.DATA_DIR ?? join(import.meta.dir, "..", "data");
const uploadsDir = join(dataDir, "uploads");

mkdirSync(uploadsDir, { recursive: true });

export const env = {
  port: Number(process.env.PORT ?? 3001),
  dataDir,
  dbPath: join(dataDir, "pos.db"),
  uploadsDir,
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
  },
};
