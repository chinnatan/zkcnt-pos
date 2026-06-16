import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verifyToken } from "../lib/jwt";

export type AuthVariables = {
  userId: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Authentication required" });
    }
    try {
      const payload = await verifyToken(header.slice(7));
      if (payload.type !== "access") {
        throw new HTTPException(401, { message: "Invalid token type" });
      }
      c.set("userId", payload.sub);
      await next();
    } catch {
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
