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
import { getRuntimeConfig } from "../env";
import { sendInviteEmail } from "../lib/email";
import { buildChanges, logAuditEvent } from "../lib/audit";
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
  requireStoreManager,
  requireStoreMember,
  requireStoreOwner,
  type StoreAccessVariables,
} from "../middleware/store-access";
import { createStoreWithOwner } from "../services/store.service";
import { deleteUpload, saveUpload } from "../lib/uploads";
import { createLogger } from "../lib/logger";

const logger = createLogger("stores");

function isUploadFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

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

  logAuditEvent(c, {
    store: row.id,
    actor: userId,
    action: "store.create",
    entityType: "store",
    entityId: row.id,
    summary: `สร้างร้าน "${row.name}"`,
  });

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
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const existing = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Store not found" });

    const updates: Partial<typeof stores.$inferInsert> = { updated: now };
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.address !== undefined) updates.address = String(body.address);
    if (body.phone !== undefined) updates.phone = String(body.phone);
    if (body.tax_id !== undefined) updates.taxId = String(body.tax_id);
    if (body.settings !== undefined) updates.settings = body.settings as Record<string, unknown>;

    await db.update(stores).set(updates).where(eq(stores.id, storeId));

    const rows = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

    const changes = buildChanges(
      existing[0] as unknown as Record<string, unknown>,
      rows[0] as unknown as Record<string, unknown>,
      ["name", "address", "phone", "taxId", "settings"],
    );
    if (Object.keys(changes).length > 0) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "store.update",
        entityType: "store",
        entityId: storeId,
        summary: `แก้ไขข้อมูลร้าน "${rows[0]!.name}"`,
        changes,
      });
    }

    return c.json(mapStore(rows[0]!));
  },
);

storeRoutes.post(
  "/:storeId/logo",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const form = await c.req.parseBody();
    const file = form.logo;

    const existing = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Store not found" });

    let logoPath = existing[0].logo;
    if (isUploadFile(file)) {
      if (existing[0].logo) deleteUpload(existing[0].logo);
      logoPath = await saveUpload("stores", storeId, "logo", file);
      logger.debug(`store.logo saved path=${logoPath} storeId=${storeId}`);
    } else if (form.remove === "true" || file === "") {
      if (existing[0].logo) deleteUpload(existing[0].logo);
      logoPath = "";
    }

    const now = nowIso();
    await db
      .update(stores)
      .set({ logo: logoPath, updated: now })
      .where(eq(stores.id, storeId));

    const rows = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

    if (existing[0].logo !== logoPath) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "store.logo_update",
        entityType: "store",
        entityId: storeId,
        summary: `อัปเดตโลโก้ร้าน "${existing[0].name}"`,
        changes: { logo: { from: existing[0].logo, to: logoPath } },
      });
    }

    return c.json(mapStore(rows[0]!));
  },
);

storeRoutes.delete(
  "/:storeId/logo",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");

    const existing = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Store not found" });

    if (existing[0].logo) deleteUpload(existing[0].logo);

    const now = nowIso();
    await db
      .update(stores)
      .set({ logo: "", updated: now })
      .where(eq(stores.id, storeId));

    const rows = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "store.logo_update",
      entityType: "store",
      entityId: storeId,
      summary: `ลบโลโก้ร้าน "${existing[0].name}"`,
      changes: { logo: { from: existing[0].logo, to: "" } },
    });

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

    const inviteLink = `${getRuntimeConfig().appUrl}/invite/${token}`;
    await sendInviteEmail(email, inviteLink);

    const rows = await db
      .select()
      .from(storeInvites)
      .where(eq(storeInvites.id, id))
      .limit(1);

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "invite.create",
      entityType: "store_invite",
      entityId: id,
      summary: `เชิญ ${email} เป็น ${role}`,
      metadata: { email, role },
    });

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

    const existing = await db
      .select()
      .from(storeInvites)
      .where(and(eq(storeInvites.id, inviteId), eq(storeInvites.store, storeId)))
      .limit(1);

    await db
      .update(storeInvites)
      .set({ status: body.status as "cancelled", updated: nowIso() })
      .where(and(eq(storeInvites.id, inviteId), eq(storeInvites.store, storeId)));

    if (existing[0] && body.status === "cancelled") {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "invite.cancel",
        entityType: "store_invite",
        entityId: inviteId,
        summary: `ยกเลิกคำเชิญ ${existing[0].email}`,
        metadata: { email: existing[0].email },
      });
    }

    const rows = await db
      .select()
      .from(storeInvites)
      .where(eq(storeInvites.id, inviteId))
      .limit(1);

    return c.json(mapStoreInvite(rows[0]!));
  },
);

storeRoutes.patch(
  "/:storeId/members/:memberId",
  authMiddleware,
  requireStoreOwner,
  async (c) => {
    const storeId = c.req.param("storeId");
    const memberId = c.req.param("memberId");
    const userId = c.get("userId");

    const body = await c.req.json<{ role?: string }>();
    const role = body.role;

    if (role !== "manager" && role !== "cashier") {
      throw new HTTPException(400, { message: "valid role required" });
    }

    const existing = await db
      .select()
      .from(storeMembers)
      .where(and(eq(storeMembers.id, memberId), eq(storeMembers.store, storeId)))
      .limit(1);

    const member = existing[0];
    if (!member) {
      throw new HTTPException(404, { message: "Member not found" });
    }

    if (member.role === "owner") {
      throw new HTTPException(400, { message: "Cannot change owner role" });
    }

    if (member.role === role) {
      throw new HTTPException(400, { message: "Role unchanged" });
    }

    const previousRole = member.role;
    const updatedAt = nowIso();

    await db
      .update(storeMembers)
      .set({ role: role as "manager" | "cashier", updated: updatedAt })
      .where(and(eq(storeMembers.id, memberId), eq(storeMembers.store, storeId)));

    const userRows = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, member.user))
      .limit(1);
    const memberUser = userRows[0];
    const displayName = memberUser?.name || memberUser?.email || member.user;

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "member.role_change",
      entityType: "store_member",
      entityId: memberId,
      summary: `เปลี่ยนบทบาท ${displayName} จาก ${previousRole} เป็น ${role}`,
      changes: buildChanges({ role: previousRole }, { role }, ["role"]),
      metadata: { user_id: member.user, from: previousRole, to: role },
    });

    const rows = await db
      .select()
      .from(storeMembers)
      .where(eq(storeMembers.id, memberId))
      .limit(1);

    const mapped = mapStoreMember(rows[0]!);
    const expandUser = memberUser
      ? { id: member.user, name: memberUser.name ?? undefined, email: memberUser.email }
      : undefined;

    return c.json({ ...mapped, expand: expandUser ? { user: expandUser } : undefined });
  },
);

storeRoutes.delete(
  "/:storeId/members/:memberId",
  authMiddleware,
  requireStoreOwner,
  async (c) => {
    const storeId = c.req.param("storeId");
    const memberId = c.req.param("memberId");
    const userId = c.get("userId");

    const existing = await db
      .select()
      .from(storeMembers)
      .where(and(eq(storeMembers.id, memberId), eq(storeMembers.store, storeId)))
      .limit(1);

    await db
      .delete(storeMembers)
      .where(and(eq(storeMembers.id, memberId), eq(storeMembers.store, storeId)));

    if (existing[0]) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "member.remove",
        entityType: "store_member",
        entityId: memberId,
        summary: `ลบสมาชิก (user: ${existing[0].user})`,
        metadata: { user_id: existing[0].user, role: existing[0].role },
      });
    }

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

  logAuditEvent(c, {
    store: storeId,
    actor: userId,
    action: "member.add",
    entityType: "store_member",
    entityId: memberId,
    summary: `เพิ่มสมาชิก ${email} เป็น ${role}`,
    metadata: { email, role, user_id: targetUser.id },
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

  logAuditEvent(c, {
    store: invite.store,
    actor: userId,
    action: "invite.accept",
    entityType: "store_invite",
    entityId: invite.id,
    summary: `${user.email} ยอมรับคำเชิญเป็น ${invite.role}`,
    metadata: { email: user.email, role: invite.role },
  });

  return c.json({ success: true, storeId: invite.store });
});
