import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { auditEvents, storeMembers, stores, users } from "../../db/schema";
import { jsonRequest, authHeaders } from "../setup";
import { createStore, registerUser } from "../helpers";

async function promotePlatformAdmin(userId: string) {
  await db
    .update(users)
    .set({ isPlatformAdmin: true, updated: new Date().toISOString() })
    .where(eq(users.id, userId));
}

describe("platform admin", () => {
  test("non-admin cannot access admin overview", async () => {
    const user = await registerUser({ email: "regular-admin@test.com" });
    const { res } = await jsonRequest("/api/admin/overview", {
      headers: authHeaders(user.token),
    });
    expect(res.status).toBe(403);
  });

  test("platform admin can access overview and stores", async () => {
    const admin = await registerUser({ email: "platform-admin@test.com" });
    await promotePlatformAdmin(admin.user.id);
    await createStore(admin.token, { slug: "admin-overview-store" });

    const overview = await jsonRequest("/api/admin/overview", {
      headers: authHeaders(admin.token),
    });
    expect(overview.res.status).toBe(200);
    expect(overview.json).toHaveProperty("stores");

    const stores = await jsonRequest<{ items: unknown[] }>("/api/admin/stores", {
      headers: authHeaders(admin.token),
    });
    expect(stores.res.status).toBe(200);
    expect(stores.json.items.length).toBeGreaterThan(0);
  });

  test("client heartbeat records session", async () => {
    const user = await registerUser({ email: "heartbeat@test.com" });
    const store = await createStore(user.token, { slug: "heartbeat-store" });

    const { res, json } = await jsonRequest<{ ok: boolean; id: string }>(
      "/api/client/heartbeat",
      {
        method: "POST",
        headers: authHeaders(user.token),
        body: JSON.stringify({
          store: store.id,
          client_version: "1.0.0",
          client_build: "test",
          pending_sync_count: 2,
        }),
      },
    );

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);

    const admin = await registerUser({ email: "admin-devices@test.com" });
    await promotePlatformAdmin(admin.user.id);

    const devices = await jsonRequest<{ items: Array<{ pending_sync_count: number }> }>(
      "/api/admin/devices",
      { headers: authHeaders(admin.token) },
    );
    expect(devices.res.status).toBe(200);
    expect(devices.json.items.some((s) => s.pending_sync_count === 2)).toBe(true);
  });

  test("disabled user access token is rejected immediately", async () => {
    const user = await registerUser({ email: "disable-now@test.com" });
    const admin = await registerUser({ email: "disable-now-admin@test.com" });
    await promotePlatformAdmin(admin.user.id);

    const before = await jsonRequest("/api/auth/me", {
      headers: authHeaders(user.token),
    });
    expect(before.res.status).toBe(200);

    const disabled = await jsonRequest(`/api/admin/users/${user.user.id}`, {
      method: "PATCH",
      headers: authHeaders(admin.token),
      body: JSON.stringify({ is_active: false }),
    });
    expect(disabled.res.status).toBe(200);

    const after = await jsonRequest("/api/auth/me", {
      headers: authHeaders(user.token),
    });
    expect(after.res.status).toBe(401);
  });

  test("deactivated store rejects store API and heartbeat", async () => {
    const user = await registerUser({ email: "closed-store@test.com" });
    const store = await createStore(user.token, { slug: "closed-store" });
    await db
      .update(stores)
      .set({ isActive: false })
      .where(eq(stores.id, store.id));

    const api = await jsonRequest(`/api/stores/${store.id}`, {
      headers: authHeaders(user.token),
    });
    expect(api.res.status).toBe(403);

    const heartbeat = await jsonRequest("/api/client/heartbeat", {
      method: "POST",
      headers: authHeaders(user.token),
      body: JSON.stringify({ store: store.id }),
    });
    expect(heartbeat.res.status).toBe(403);
  });

  test("session revoke invalidates the target token and hides admin audit events", async () => {
    const owner = await registerUser({ email: "session-owner@test.com" });
    const target = await registerUser({ email: "session-target@test.com" });
    const store = await createStore(owner.token, { slug: "session-store" });

    const now = new Date().toISOString();
    await db.insert(storeMembers).values({
      id: crypto.randomUUID(),
      store: store.id,
      user: target.user.id,
      role: "cashier",
      isActive: true,
      created: now,
      updated: now,
    });

    const revoke = await jsonRequest(
      `/api/stores/${store.id}/members/${target.user.id}/revoke-sessions`,
      {
        method: "POST",
        headers: authHeaders(owner.token),
      },
    );
    expect(revoke.res.status).toBe(200);

    const targetAfterRevoke = await jsonRequest("/api/auth/me", {
      headers: authHeaders(target.token),
    });
    expect(targetAfterRevoke.res.status).toBe(401);

    await db.insert(auditEvents).values([
      {
        id: crypto.randomUUID(),
        store: store.id,
        actor: owner.user.id,
        action: "admin.store_deactivate",
        entityType: "store",
        entityId: store.id,
        summary: "hidden platform event",
        created: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        store: store.id,
        actor: owner.user.id,
        action: "order.create",
        entityType: "order",
        entityId: crypto.randomUUID(),
        summary: "visible store event",
        created: new Date().toISOString(),
      },
    ]);

    const audit = await jsonRequest<{ items: Array<{ action: string }> }>(
      `/api/stores/${store.id}/audit-events`,
      { headers: authHeaders(owner.token) },
    );
    expect(audit.res.status).toBe(200);
    expect(audit.json.items.some((item) => item.action.startsWith("admin."))).toBe(false);
  });
});
