import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verifyToken } from "../lib/jwt";
import { createLogger } from "../lib/logger";

const logger = createLogger("auth");

export type AuthVariables = {
  userId: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      logger.warn(`missing token ${c.req.method} ${c.req.path}`);
      throw new HTTPException(401, { message: "Authentication required" });
    }
    try {
      const payload = await verifyToken(header.slice(7));
      if (payload.type !== "access") {
        logger.warn(`invalid token type ${c.req.method} ${c.req.path}`);
        throw new HTTPException(401, { message: "Invalid token type" });
      }
      c.set("userId", payload.sub);
      logger.debug(`authenticated userId=${payload.sub} ${c.req.method} ${c.req.path}`);
      await next();
    } catch (err) {
      if (err instanceof HTTPException) throw err;
      logger.warn(`invalid or expired token ${c.req.method} ${c.req.path}`);
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }
  },
);

export const optionalAuthMiddleware = createMiddleware<{
  Variables: Partial<AuthVariables>;
}>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = await verifyToken(header.slice(7));
      if (payload.type === "access") {
        c.set("userId", payload.sub);
      }
    } catch {
      // ignore
    }
  }
  await next();
});
