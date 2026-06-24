import { describe, expect, test } from "bun:test";
import { jsonRequest, authHeaders } from "../setup";
import { createStore, registerUser } from "../helpers";

describe("tenant RBAC", () => {
  test("non-member cannot access another store", async () => {
    const owner = await registerUser({ email: "owner-rbac@test.com" });
    const outsider = await registerUser({ email: "outsider-rbac@test.com" });
    const store = await createStore(owner.token, { slug: "rbac-store" });

    const { res } = await jsonRequest(`/api/stores/${store.id}/orders`, {
      headers: authHeaders(outsider.token),
    });

    expect(res.status).toBe(403);
  });

  test("member can access own store orders", async () => {
    const owner = await registerUser({ email: "owner-orders@test.com" });
    const store = await createStore(owner.token, { slug: "own-store" });

    const { res, json } = await jsonRequest<{ items: unknown[] }>(
      `/api/stores/${store.id}/orders`,
      { headers: authHeaders(owner.token) },
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(json.items)).toBe(true);
  });
});

describe("member role changes", () => {
  async function addMemberByEmail(
    ownerToken: string,
    storeId: string,
    email: string,
    role: "manager" | "cashier",
  ) {
    const { res } = await jsonRequest("/api/members/add-by-email", {
      method: "POST",
      headers: authHeaders(ownerToken),
      body: JSON.stringify({ storeId, email, role }),
    });
    expect(res.status).toBe(200);
  }

  async function listTeamMembers(token: string, storeId: string) {
    const { res, json } = await jsonRequest<
      Array<{ id: string; role: string; expand?: { user?: { email?: string } } }>
    >(`/api/stores/${storeId}/team-members`, {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    return json;
  }

  test("owner can change cashier to manager", async () => {
    const owner = await registerUser({ email: "owner-role@test.com" });
    const cashier = await registerUser({ email: "cashier-role@test.com" });
    const store = await createStore(owner.token, { slug: "role-store" });

    await addMemberByEmail(owner.token, store.id, cashier.email, "cashier");
    const members = await listTeamMembers(owner.token, store.id);
    const cashierMember = members.find((m) => m.expand?.user?.email === cashier.email);
    expect(cashierMember).toBeDefined();

    const { res, json } = await jsonRequest<{ role: string }>(
      `/api/stores/${store.id}/members/${cashierMember!.id}`,
      {
        method: "PATCH",
        headers: authHeaders(owner.token),
        body: JSON.stringify({ role: "manager" }),
      },
    );

    expect(res.status).toBe(200);
    expect(json.role).toBe("manager");
  });

  test("manager cannot change member role", async () => {
    const owner = await registerUser({ email: "owner-role-mgr@test.com" });
    const manager = await registerUser({ email: "manager-role@test.com" });
    const cashier = await registerUser({ email: "cashier-role-mgr@test.com" });
    const store = await createStore(owner.token, { slug: "role-mgr-store" });

    await addMemberByEmail(owner.token, store.id, manager.email, "manager");
    await addMemberByEmail(owner.token, store.id, cashier.email, "cashier");

    const members = await listTeamMembers(owner.token, store.id);
    const cashierMember = members.find((m) => m.expand?.user?.email === cashier.email);
    expect(cashierMember).toBeDefined();

    const { res } = await jsonRequest(
      `/api/stores/${store.id}/members/${cashierMember!.id}`,
      {
        method: "PATCH",
        headers: authHeaders(manager.token),
        body: JSON.stringify({ role: "manager" }),
      },
    );

    expect(res.status).toBe(403);
  });

  test("cannot change owner role", async () => {
    const owner = await registerUser({ email: "owner-protect@test.com" });
    const store = await createStore(owner.token, { slug: "owner-protect-store" });

    const members = await listTeamMembers(owner.token, store.id);
    const ownerMember = members.find((m) => m.role === "owner");
    expect(ownerMember).toBeDefined();

    const { res } = await jsonRequest(
      `/api/stores/${store.id}/members/${ownerMember!.id}`,
      {
        method: "PATCH",
        headers: authHeaders(owner.token),
        body: JSON.stringify({ role: "manager" }),
      },
    );

    expect(res.status).toBe(400);
  });

  test("rejects invalid role", async () => {
    const owner = await registerUser({ email: "owner-invalid-role@test.com" });
    const cashier = await registerUser({ email: "cashier-invalid-role@test.com" });
    const store = await createStore(owner.token, { slug: "invalid-role-store" });

    await addMemberByEmail(owner.token, store.id, cashier.email, "cashier");
    const members = await listTeamMembers(owner.token, store.id);
    const cashierMember = members.find((m) => m.expand?.user?.email === cashier.email);
    expect(cashierMember).toBeDefined();

    const { res } = await jsonRequest(
      `/api/stores/${store.id}/members/${cashierMember!.id}`,
      {
        method: "PATCH",
        headers: authHeaders(owner.token),
        body: JSON.stringify({ role: "owner" }),
      },
    );

    expect(res.status).toBe(400);
  });
});
