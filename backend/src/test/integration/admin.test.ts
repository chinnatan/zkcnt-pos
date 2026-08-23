import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
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
});
