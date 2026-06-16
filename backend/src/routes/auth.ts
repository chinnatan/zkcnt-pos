import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { users } from "../db/schema";
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt";
import { mapUser } from "../lib/mappers";
import { hashPassword, verifyPassword } from "../lib/password";
import { generateId } from "../lib/id";
import { nowIso } from "../lib/timestamps";
import { authMiddleware, type AuthVariables } from "../middleware/auth";

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

authRoutes.post("/register", async (c) => {
  const body = await c.req.json<{
    email?: string;
    password?: string;
    name?: string;
  }>();

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim();

  if (!email || !password || !name) {
    throw new HTTPException(400, { message: "email, password, and name required" });
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new HTTPException(400, { message: "Email already registered" });
  }

  const now = nowIso();
  const id = generateId();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    name,
    created: now,
    updated: now,
  });

  const user = mapUser({
    id,
    email,
    passwordHash,
    name,
    created: now,
    updated: now,
  });

  const token = await signAccessToken(id);
  const refreshToken = await signRefreshToken(id);

  return c.json({ token, refreshToken, user });
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    throw new HTTPException(400, { message: "email and password required" });
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const row = rows[0];
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    throw new HTTPException(400, { message: "Invalid email or password" });
  }

  const user = mapUser(row);
  const token = await signAccessToken(row.id);
  const refreshToken = await signRefreshToken(row.id);

  return c.json({ token, refreshToken, user });
});

authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>();
  if (!body.refreshToken) {
    throw new HTTPException(400, { message: "refreshToken required" });
  }

  const payload = await verifyToken(body.refreshToken);
  if (payload.type !== "refresh") {
    throw new HTTPException(401, { message: "Invalid refresh token" });
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new HTTPException(401, { message: "User not found" });
  }

  const user = mapUser(row);
  const token = await signAccessToken(row.id);
  const refreshToken = await signRefreshToken(row.id);

  return c.json({ token, refreshToken, user });
});

authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new HTTPException(404, { message: "User not found" });
  }
  return c.json(mapUser(row));
});
