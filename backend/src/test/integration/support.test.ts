import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { supportTicketMessages, supportTickets, users } from "../../db/schema";
import { jsonRequest, authHeaders } from "../setup";
import { createStore, registerUser } from "../helpers";

async function promotePlatformAdmin(userId: string) {
  await db
    .update(users)
    .set({ isPlatformAdmin: true, updated: new Date().toISOString() })
    .where(eq(users.id, userId));
}

describe("support tickets", () => {
  test("user can create and view own ticket; XSS stripped", async () => {
    const user = await registerUser({ email: "support-user@test.com" });
    await createStore(user.token, { slug: "support-user-store" });

    const malicious = '<p>Help</p><script>alert("x")</script><img src=x onerror=alert(1)>';
    const { res, json } = await jsonRequest<{ ticket: { id: string }; messages: Array<{ body_html: string }> }>(
      "/api/support/tickets",
      {
        method: "POST",
        headers: authHeaders(user.token),
        body: JSON.stringify({
          subject: "Checkout broken",
          body_html: malicious,
          category: "bug",
        }),
      },
    );

    expect(res.status).toBe(201);
    expect(json.ticket.id).toBeTruthy();
    expect(json.messages[0]?.body_html).not.toContain("<script");
    expect(json.messages[0]?.body_html).not.toContain("onerror");

    const withImage = await jsonRequest<{ ticket: { id: string } }>(
      "/api/support/tickets",
      {
        method: "POST",
        headers: authHeaders(user.token),
        body: JSON.stringify({
          subject: "Screenshot issue",
          body_html:
            '<p>Broken UI</p><img src="support_attachments/user/abc/image.webp" alt="shot">',
          category: "bug",
        }),
      },
    );
    expect(withImage.res.status).toBe(201);
    expect(withImage.json.ticket.body_html).toContain("support_attachments/user/abc/image.webp");

    const other = await registerUser({ email: "support-other@test.com" });
    const forbidden = await jsonRequest(`/api/support/tickets/${json.ticket.id}`, {
      headers: authHeaders(other.token),
    });
    expect(forbidden.res.status).toBe(404);

    const own = await jsonRequest(`/api/support/tickets/${json.ticket.id}`, {
      headers: authHeaders(user.token),
    });
    expect(own.res.status).toBe(200);
  });

  test("admin can list tickets and reply", async () => {
    const user = await registerUser({ email: "support-reporter@test.com" });
    const admin = await registerUser({ email: "support-admin@test.com" });
    await promotePlatformAdmin(admin.user.id);

    const created = await jsonRequest<{ ticket: { id: string } }>("/api/support/tickets", {
      method: "POST",
      headers: authHeaders(user.token),
      body: JSON.stringify({
        subject: "Need help",
        body_html: "<p>Question</p>",
        category: "question",
      }),
    });
    expect(created.res.status).toBe(201);

    const list = await jsonRequest<{ items: unknown[] }>("/api/admin/tickets", {
      headers: authHeaders(admin.token),
    });
    expect(list.res.status).toBe(200);
    expect(list.json.items.length).toBeGreaterThan(0);

    const reply = await jsonRequest<{ messages: Array<{ author_role: string }> }>(
      `/api/admin/tickets/${created.json.ticket.id}/messages`,
      {
        method: "POST",
        headers: authHeaders(admin.token),
        body: JSON.stringify({ body_html: "<p>We are looking into it</p>" }),
      },
    );
    expect(reply.res.status).toBe(200);
    expect(reply.json.messages.some((m) => m.author_role === "admin")).toBe(true);

    const nonAdmin = await jsonRequest("/api/admin/tickets", {
      headers: authHeaders(user.token),
    });
    expect(nonAdmin.res.status).toBe(403);
  });

  test("cleanup support tables", async () => {
    await db.delete(supportTicketMessages);
    await db.delete(supportTickets);
  });
});
