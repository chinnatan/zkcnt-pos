import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { passwordResetTokens, users } from "../db/schema";
import { env } from "../env";
import { sendPasswordResetEmail } from "../lib/email";
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt";
import { mapUser } from "../lib/mappers";
import { hashPassword, verifyPassword } from "../lib/password";
import { generateId, generateToken } from "../lib/id";
import { createLogger } from "../lib/logger";
import { logAuditEvent } from "../lib/audit";
import { nowIso } from "../lib/timestamps";
import { authMiddleware, type AuthVariables } from "../middleware/auth";

const logger = createLogger("auth");

const RESET_MESSAGE =
  "If an account exists with that email, a password reset link has been sent.";

function isTokenExpired(expires: string): boolean {
  return new Date(expires).getTime() <= Date.now();
}

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

  logger.info(`register success userId=${id} email=${email}`);

  logAuditEvent(c, {
    actor: id,
    action: "auth.register",
    entityType: "user",
    entityId: id,
    summary: `ลงทะเบียนผู้ใช้ ${email}`,
    metadata: { email },
  });

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
    logger.warn(`login failed email=${email}`);
    logAuditEvent(c, {
      action: "auth.login_failed",
      entityType: "user",
      entityId: email,
      summary: `เข้าสู่ระบบไม่สำเร็จ ${email}`,
      metadata: { email },
    });
    throw new HTTPException(400, { message: "Invalid email or password" });
  }

  const user = mapUser(row);
  const token = await signAccessToken(row.id);
  const refreshToken = await signRefreshToken(row.id);

  logger.info(`login success userId=${row.id} email=${email}`);

  logAuditEvent(c, {
    actor: row.id,
    action: "auth.login",
    entityType: "user",
    entityId: row.id,
    summary: `เข้าสู่ระบบ ${email}`,
    metadata: { email },
  });

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

authRoutes.post("/forgot-password", async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    throw new HTTPException(400, { message: "email required" });
  }

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  if (user) {
    await db
      .update(passwordResetTokens)
      .set({ used: 1 })
      .where(
        and(eq(passwordResetTokens.user, user.id), eq(passwordResetTokens.used, 0)),
      );

    const expires = new Date();
    expires.setHours(expires.getHours() + 1);
    const token = generateToken(48);
    const id = generateId();
    const now = nowIso();

    await db.insert(passwordResetTokens).values({
      id,
      user: user.id,
      token,
      expires: expires.toISOString(),
      used: 0,
      created: now,
    });

    const resetLink = `${env.appUrl}/reset-password/${token}`;

    try {
      await sendPasswordResetEmail(email, resetLink, user.name);
    } catch (err) {
      logger.error(`forgot-password email failed email=${email}`, err);
    }

    logAuditEvent(c, {
      actor: user.id,
      action: "auth.password_reset_requested",
      entityType: "user",
      entityId: user.id,
      summary: `ขอรีเซ็ตรหัสผ่าน ${email}`,
      metadata: { email },
    });
  }

  return c.json({ message: RESET_MESSAGE });
});

authRoutes.get("/reset-password/:token", async (c) => {
  const token = c.req.param("token");
  const rows = await db
    .select({
      token: passwordResetTokens.token,
      expires: passwordResetTokens.expires,
      used: passwordResetTokens.used,
      email: users.email,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.user, users.id))
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  const row = rows[0];
  if (!row || row.used || isTokenExpired(row.expires)) {
    return c.json({ valid: false });
  }

  return c.json({ valid: true, email: row.email });
});

authRoutes.post("/reset-password", async (c) => {
  const body = await c.req.json<{ token?: string; password?: string }>();
  const token = body.token;
  const password = body.password;

  if (!token || !password) {
    throw new HTTPException(400, { message: "token and password required" });
  }

  if (password.length < 8) {
    throw new HTTPException(400, { message: "Password must be at least 8 characters" });
  }

  const rows = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.user,
      expires: passwordResetTokens.expires,
      used: passwordResetTokens.used,
      email: users.email,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.user, users.id))
    .where(eq(passwordResetTokens.token, token))
    .limit(1);

  const row = rows[0];
  if (!row || row.used) {
    throw new HTTPException(400, { message: "Invalid or expired reset token" });
  }

  if (isTokenExpired(row.expires)) {
    throw new HTTPException(400, { message: "Reset token has expired" });
  }

  const now = nowIso();
  const passwordHash = await hashPassword(password);

  await db
    .update(users)
    .set({ passwordHash, updated: now })
    .where(eq(users.id, row.userId));

  await db
    .update(passwordResetTokens)
    .set({ used: 1 })
    .where(eq(passwordResetTokens.id, row.id));

  logAuditEvent(c, {
    actor: row.userId,
    action: "auth.password_reset_completed",
    entityType: "user",
    entityId: row.userId,
    summary: `รีเซ็ตรหัสผ่านสำเร็จ ${row.email}`,
    metadata: { email: row.email },
  });

  return c.json({ message: "Password reset successfully" });
});
