import { and, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import {
  storeInvites,
  storeMembers,
  stores,
  users,
} from "../db/schema";
import { env } from "../env";
import { sendInviteEmail } from "../lib/email";
import { generateId, generateToken } from "../lib/id";
import {
  mapStore,
  mapStoreInvite,
  mapStoreMember,
  mapUser,
} from "../lib/mappers";
import { nowIso } from "../lib/timestamps";
import { DEFAULT_STORE_SETTINGS } from "../lib/types";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  assertStoreManagerByStoreId,
  assertStoreMemberByStoreId,
  getStoreSettings,
  requireStoreMember,
  requireStoreOwner,
  type StoreAccessVariables,
} from "../middleware/store-access";
import { createStoreWithOwner } from "../services/store.service";

export const storeRoutes = new Hono<{
  Variables: AuthVariables | StoreAccessVariables;
}>();

storeRoutes.get("/memberships", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(storeMembers)
    .where(eq(storeMembers.user, userId));

  const result = [];
  for (const m of rows) {
    const storeRows = await db
      .select()
      .from(stores)
      .where(eq(stores.id, m.store))
      .limit(1);
    const store = storeRows[0];
    result.push({
      ...mapStoreMember(m),
      expand: { store: store ? mapStore(store) : null },
    });
  }

  return c.json(result);
});

storeRoutes.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");

  const memberships = await db
    .select()
    .from(storeMembers)
    .where(and(eq(storeMembers.user, userId), eq(storeMembers.isActive, true)));

  const storeIds = memberships.map((m) => m.store);
  if (storeIds.length === 0) {
    return c.json([]);
  }

  const storeRows = await db
    .select()
    .from(stores)
    .where(and(inArray(stores.id, storeIds), eq(stores.isActive, true)));

  return c.json(storeRows.map(mapStore));
});

storeRoutes.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    name?: string;
    slug?: string;
    address?: string;
    phone?: string;
  }>();

  if (!body.name || !body.slug) {
    throw new HTTPException(400, { message: "name and slug required" });
  }

  const row = await createStoreWithOwner(
    {
      name: body.name,
      slug: body.slug,
      address: body.address,
      phone: body.phone,
    },
    userId,
  );

  return c.json(mapStore(row), 201);
});

storeRoutes.get("/:storeId", authMiddleware, requireStoreMember, async (c) => {
  const storeId = c.req.param("storeId");
  const rows = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new HTTPException(404, { message: "Store not found" });
  }
  return c.json(mapStore(row));
});

storeRoutes.patch(
  "/:storeId",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const updates: Partial<typeof stores.$inferInsert> = { updated: now };
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.address !== undefined) updates.address = String(body.address);
    if (body.phone !== undefined) updates.phone = String(body.phone);
    if (body.tax_id !== undefined) updates.taxId = String(body.tax_id);
    if (body.settings !== undefined) updates.settings = body.settings as Record<string, unknown>;

    await db.update(stores).set(updates).where(eq(stores.id, storeId));

    const rows = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    return c.json(mapStore(rows[0]!));
  },
);

storeRoutes.get(
  "/:storeId/team-members",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const members = await db
      .select()
      .from(storeMembers)
      .where(eq(storeMembers.store, storeId));

    const result = [];
    for (const m of members) {
      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.id, m.user))
        .limit(1);
      const u = userRows[0];
      result.push({
        ...mapStoreMember(m),
        expand: {
          user: u
            ? { id: u.id, name: u.name, email: u.email }
            : { id: m.user, name: "", email: "" },
        },
      });
    }

    return c.json(result);
  },
);

storeRoutes.get(
  "/:storeId/invites",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    await assertStoreManagerByStoreId(userId, storeId);

    const status = c.req.query("status") ?? "pending";
    const rows = await db
      .select()
      .from(storeInvites)
      .where(
        and(eq(storeInvites.store, storeId), eq(storeInvites.status, status as "pending")),
      );

    return c.json(rows.map(mapStoreInvite));
  },
);

storeRoutes.post(
  "/:storeId/invites",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    await assertStoreManagerByStoreId(userId, storeId);

    const settings = await getStoreSettings(storeId);
    if (settings.member_invite_mode !== "email") {
      throw new HTTPException(400, {
        message: "Store is not in email invite mode",
      });
    }

    const body = await c.req.json<{ email?: string; role?: string }>();
    const email = body.email?.trim().toLowerCase();
    const role = body.role;

    if (!email || (role !== "manager" && role !== "cashier")) {
      throw new HTTPException(400, { message: "email and valid role required" });
    }

    const pending = await db
      .select()
      .from(storeInvites)
      .where(
        and(
          eq(storeInvites.store, storeId),
          eq(storeInvites.email, email),
          eq(storeInvites.status, "pending"),
        ),
      )
      .limit(1);

    if (pending.length > 0) {
      throw new HTTPException(400, {
        message: "A pending invite already exists for this email",
      });
    }

    const now = nowIso();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const token = generateToken(48);
    const id = generateId();

    await db.insert(storeInvites).values({
      id,
      store: storeId,
      email,
      role: role as "manager" | "cashier",
      token,
      status: "pending",
      invitedBy: userId,
      expires: expires.toISOString(),
      created: now,
      updated: now,
    });

    const inviteLink = `${env.appUrl}/invite/${token}`;
    await sendInviteEmail(email, inviteLink);

    const rows = await db
      .select()
      .from(storeInvites)
      .where(eq(storeInvites.id, id))
      .limit(1);

    return c.json(mapStoreInvite(rows[0]!), 201);
  },
);

storeRoutes.patch(
  "/:storeId/invites/:inviteId",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const inviteId = c.req.param("inviteId");
    const userId = c.get("userId");
    await assertStoreManagerByStoreId(userId, storeId);

    const body = await c.req.json<{ status?: string }>();
    if (!body.status) {
      throw new HTTPException(400, { message: "status required" });
    }

    await db
      .update(storeInvites)
      .set({ status: body.status as "cancelled", updated: nowIso() })
      .where(and(eq(storeInvites.id, inviteId), eq(storeInvites.store, storeId)));

    const rows = await db
      .select()
      .from(storeInvites)
      .where(eq(storeInvites.id, inviteId))
      .limit(1);

    return c.json(mapStoreInvite(rows[0]!));
  },
);

storeRoutes.delete(
  "/:storeId/members/:memberId",
  authMiddleware,
  requireStoreOwner,
  async (c) => {
    const storeId = c.req.param("storeId");
    const memberId = c.req.param("memberId");

    await db
      .delete(storeMembers)
      .where(and(eq(storeMembers.id, memberId), eq(storeMembers.store, storeId)));

    return c.json({ success: true });
  },
);

// Global member routes (outside store prefix)
export const memberRoutes = new Hono<{ Variables: AuthVariables }>();

memberRoutes.post("/add-by-email", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    storeId?: string;
    email?: string;
    role?: string;
  }>();

  const storeId = body.storeId;
  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!storeId || !email || (role !== "manager" && role !== "cashier")) {
    throw new HTTPException(400, {
      message: "storeId, email, and valid role required",
    });
  }

  await assertStoreManagerByStoreId(userId, storeId);

  const settings = await getStoreSettings(storeId);
  if (settings.member_invite_mode === "email") {
    throw new HTTPException(400, { message: "Store is not in direct add mode" });
  }

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const targetUser = userRows[0];
  if (!targetUser) {
    throw new HTTPException(400, { message: "User not registered" });
  }

  const existing = await db
    .select()
    .from(storeMembers)
    .where(and(eq(storeMembers.store, storeId), eq(storeMembers.user, targetUser.id)))
    .limit(1);

  if (existing.length > 0) {
    throw new HTTPException(400, { message: "User is already a member of this store" });
  }

  const now = nowIso();
  const memberId = generateId();
  await db.insert(storeMembers).values({
    id: memberId,
    store: storeId,
    user: targetUser.id,
    role: role as "manager" | "cashier",
    isActive: true,
    created: now,
    updated: now,
  });

  return c.json({
    member: mapStoreMember({
      id: memberId,
      store: storeId,
      user: targetUser.id,
      role,
      isActive: true,
      created: now,
      updated: now,
    }),
  });
});

export const inviteRoutes = new Hono<{ Variables: AuthVariables }>();

inviteRoutes.get("/:token", async (c) => {
  const token = c.req.param("token");
  const rows = await db
    .select()
    .from(storeInvites)
    .where(eq(storeInvites.token, token))
    .limit(1);

  const invite = rows[0];
  if (!invite) {
    throw new HTTPException(404, { message: "Invite not found" });
  }

  if (
    invite.status === "pending" &&
    invite.expires &&
    new Date(invite.expires) < new Date()
  ) {
    await db
      .update(storeInvites)
      .set({ status: "expired", updated: nowIso() })
      .where(eq(storeInvites.id, invite.id));
    invite.status = "expired";
  }

  const storeRows = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, invite.store))
    .limit(1);

  return c.json({
    storeName: storeRows[0]?.name ?? "",
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expires: invite.expires,
  });
});

inviteRoutes.post("/accept", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ token?: string }>();
  const token = body.token;

  if (!token) {
    throw new HTTPException(400, { message: "token required" });
  }

  const rows = await db
    .select()
    .from(storeInvites)
    .where(eq(storeInvites.token, token))
    .limit(1);

  const invite = rows[0];
  if (!invite) {
    throw new HTTPException(404, { message: "Invite not found" });
  }

  if (invite.status !== "pending") {
    throw new HTTPException(400, { message: "Invite is no longer valid" });
  }

  if (invite.expires && new Date(invite.expires) < new Date()) {
    await db
      .update(storeInvites)
      .set({ status: "expired", updated: nowIso() })
      .where(eq(storeInvites.id, invite.id));
    throw new HTTPException(400, { message: "Invite has expired" });
  }

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new HTTPException(403, {
      message: "Signed-in email does not match the invite",
    });
  }

  const existing = await db
    .select()
    .from(storeMembers)
    .where(
      and(eq(storeMembers.store, invite.store), eq(storeMembers.user, userId)),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new HTTPException(400, { message: "User is already a member of this store" });
  }

  const now = nowIso();
  const memberId = generateId();
  await db.insert(storeMembers).values({
    id: memberId,
    store: invite.store,
    user: userId,
    role: invite.role,
    isActive: true,
    created: now,
    updated: now,
  });

  await db
    .update(storeInvites)
    .set({ status: "accepted", updated: now })
    .where(eq(storeInvites.id, invite.id));

  return c.json({ success: true, storeId: invite.store });
});
