import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { users } from "../db/schema";
import { createLogger } from "../lib/logger";
import type { AuthVariables } from "./auth";

const logger = createLogger("platform-admin");

export type PlatformAdminVariables = AuthVariables & {
  isPlatformAdmin: true;
};

export const requirePlatformAdmin = createMiddleware<{
  Variables: PlatformAdminVariables;
}>(async (c, next) => {
  const userId = c.get("userId");
  const rows = await db
    .select({ isPlatformAdmin: users.isPlatformAdmin, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row?.isActive) {
    throw new HTTPException(403, { message: "Account disabled" });
  }
  if (!row.isPlatformAdmin) {
    logger.warn(`platform admin denied userId=${userId} ${c.req.method} ${c.req.path}`);
    throw new HTTPException(403, { message: "Platform admin access required" });
  }

  c.set("isPlatformAdmin", true);
  await next();
});
