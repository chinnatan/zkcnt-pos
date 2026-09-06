import {
  and,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../db/client";
import {
  stores,
  supportTicketCategories,
  supportTicketMessages,
  supportTicketPriorities,
  supportTickets,
  supportTicketStatuses,
  users,
} from "../db/schema";
import { getRuntimeConfig } from "../env";
import { sendAdminAlertEmail, sendSupportTicketReplyEmail } from "../lib/email";
import { generateId } from "../lib/id";
import { sanitizeRichText } from "../lib/sanitize-html";
import { nowIso } from "../lib/timestamps";

export type SupportTicketCategory = (typeof supportTicketCategories)[number];
export type SupportTicketStatus = (typeof supportTicketStatuses)[number];
export type SupportTicketPriority = (typeof supportTicketPriorities)[number];

function mapTicket(
  row: typeof supportTickets.$inferSelect,
  reporter?: { name: string; email: string } | null,
  storeName?: string | null,
) {
  return {
    id: row.id,
    reporter: row.reporter,
    reporter_name: reporter?.name ?? null,
    reporter_email: reporter?.email ?? null,
    store: row.store,
    store_name: storeName ?? null,
    subject: row.subject,
    body_html: row.bodyHtml,
    body_text: row.bodyText,
    category: row.category,
    status: row.status,
    priority: row.priority,
    metadata: row.metadata,
    last_reply_at: row.lastReplyAt,
    last_reply_by: row.lastReplyBy,
    created: row.created,
    updated: row.updated,
  };
}

function mapMessage(
  row: typeof supportTicketMessages.$inferSelect,
  author?: { name: string; email: string } | null,
) {
  return {
    id: row.id,
    ticket: row.ticket,
    author: row.author,
    author_name: author?.name ?? null,
    author_email: author?.email ?? null,
    author_role: row.authorRole,
    body_html: row.bodyHtml,
    body_text: row.bodyText,
    created: row.created,
  };
}

async function loadUserMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { name: string; email: string }>();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));
  return new Map(rows.map((r) => [r.id, { name: r.name, email: r.email }]));
}

async function loadStoreName(storeId: string | null) {
  if (!storeId) return null;
  const row = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return row[0]?.name ?? null;
}

export async function createSupportTicket(input: {
  reporterId: string;
  subject: string;
  bodyHtml: string;
  category: SupportTicketCategory;
  store?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { bodyHtml, bodyText } = sanitizeRichText(input.bodyHtml);
  if (!input.subject.trim()) {
    throw new Error("Subject required");
  }
  if (!bodyText.trim()) {
    throw new Error("Message required");
  }

  const now = nowIso();
  const ticketId = generateId();
  const messageId = generateId();

  await db.insert(supportTickets).values({
    id: ticketId,
    reporter: input.reporterId,
    store: input.store ?? null,
    subject: input.subject.trim(),
    bodyHtml,
    bodyText,
    category: input.category,
    status: "open",
    priority: "normal",
    metadata: input.metadata ?? {},
    lastReplyAt: now,
    lastReplyBy: "user",
    created: now,
    updated: now,
  });

  await db.insert(supportTicketMessages).values({
    id: messageId,
    ticket: ticketId,
    author: input.reporterId,
    authorRole: "user",
    bodyHtml,
    bodyText,
    created: now,
  });

  const adminEmail = getRuntimeConfig().platformAdminEmail;
  if (adminEmail) {
    const reporter = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, input.reporterId))
      .limit(1);
    const reporterRow = reporter[0];
    void sendAdminAlertEmail(
      adminEmail,
      `New support ticket: ${input.subject.trim()}`,
      `<p><strong>From:</strong> ${reporterRow?.name ?? "User"} (${reporterRow?.email ?? ""})</p>
       <p><strong>Category:</strong> ${input.category}</p>
       <p>${bodyText.slice(0, 500).replace(/\n/g, "<br>")}</p>`,
    ).catch(() => {});
  }

  return getSupportTicketForUser(ticketId, input.reporterId);
}

export async function listUserSupportTickets(
  userId: string,
  params: { limit: number; offset: number },
) {
  const where = eq(supportTickets.reporter, userId);

  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(supportTickets)
      .where(where)
      .orderBy(desc(supportTickets.updated))
      .limit(params.limit)
      .offset(params.offset),
    db.select({ total: count() }).from(supportTickets).where(where),
  ]);

  return {
    items: items.map((row) => mapTicket(row)),
    totalItems: totalRows[0]?.total ?? 0,
  };
}

export async function getSupportTicketForUser(ticketId: string, userId: string) {
  const rows = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.reporter, userId)))
    .limit(1);
  const ticket = rows[0];
  if (!ticket) return null;

  const messages = await db
    .select()
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticket, ticketId))
    .orderBy(supportTicketMessages.created);

  const userIds = [...new Set([ticket.reporter, ...messages.map((m) => m.author)])];
  const userMap = await loadUserMap(userIds);
  const storeName = await loadStoreName(ticket.store);

  return {
    ticket: mapTicket(ticket, userMap.get(ticket.reporter), storeName),
    messages: messages.map((m) => mapMessage(m, userMap.get(m.author))),
  };
}

export async function addUserTicketMessage(
  ticketId: string,
  userId: string,
  bodyHtml: string,
) {
  const ticket = await db
    .select()
    .from(supportTickets)
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.reporter, userId)))
    .limit(1);
  const row = ticket[0];
  if (!row) return null;
  if (row.status === "closed") {
    throw new Error("Ticket is closed");
  }

  const { bodyHtml: safeHtml, bodyText } = sanitizeRichText(bodyHtml);
  if (!bodyText.trim()) {
    throw new Error("Message required");
  }

  const now = nowIso();
  const messageId = generateId();

  await db.insert(supportTicketMessages).values({
    id: messageId,
    ticket: ticketId,
    author: userId,
    authorRole: "user",
    bodyHtml: safeHtml,
    bodyText,
    created: now,
  });

  const nextStatus: SupportTicketStatus =
    row.status === "waiting_user" ? "open" : row.status;

  await db
    .update(supportTickets)
    .set({
      status: nextStatus,
      lastReplyAt: now,
      lastReplyBy: "user",
      updated: now,
    })
    .where(eq(supportTickets.id, ticketId));

  return getSupportTicketForUser(ticketId, userId);
}

export async function listAdminSupportTickets(params: {
  limit: number;
  offset: number;
  status?: string;
  category?: string;
  store?: string;
  search?: string;
}) {
  const filters = [];
  if (params.status) {
    filters.push(eq(supportTickets.status, params.status as SupportTicketStatus));
  }
  if (params.category) {
    filters.push(eq(supportTickets.category, params.category as SupportTicketCategory));
  }
  if (params.store) filters.push(eq(supportTickets.store, params.store));
  if (params.search) {
    const q = `%${params.search}%`;
    filters.push(
      or(
        like(supportTickets.subject, q),
        like(supportTickets.bodyText, q),
      )!,
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(supportTickets)
      .where(where)
      .orderBy(desc(supportTickets.updated))
      .limit(params.limit)
      .offset(params.offset),
    db.select({ total: count() }).from(supportTickets).where(where),
  ]);

  const userIds = [...new Set(items.map((i) => i.reporter))];
  const userMap = await loadUserMap(userIds);

  const storeIds = [...new Set(items.map((i) => i.store).filter(Boolean))] as string[];
  const storeMap = new Map<string, string>();
  if (storeIds.length > 0) {
    const storeRows = await db
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(inArray(stores.id, storeIds));
    for (const s of storeRows) storeMap.set(s.id, s.name);
  }

  return {
    items: items.map((row) =>
      mapTicket(row, userMap.get(row.reporter), row.store ? storeMap.get(row.store) ?? null : null),
    ),
    totalItems: totalRows[0]?.total ?? 0,
  };
}

export async function getAdminSupportTicket(ticketId: string) {
  const rows = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  const ticket = rows[0];
  if (!ticket) return null;

  const messages = await db
    .select()
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticket, ticketId))
    .orderBy(supportTicketMessages.created);

  const userIds = [...new Set([ticket.reporter, ...messages.map((m) => m.author)])];
  const userMap = await loadUserMap(userIds);
  const storeName = await loadStoreName(ticket.store);

  return {
    ticket: mapTicket(ticket, userMap.get(ticket.reporter), storeName),
    messages: messages.map((m) => mapMessage(m, userMap.get(m.author))),
  };
}

export async function updateAdminSupportTicket(
  ticketId: string,
  input: { status?: SupportTicketStatus; priority?: SupportTicketPriority },
) {
  const rows = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  const ticket = rows[0];
  if (!ticket) return null;

  const updates: Partial<typeof supportTickets.$inferInsert> = {
    updated: nowIso(),
  };
  if (input.status) updates.status = input.status;
  if (input.priority) updates.priority = input.priority;

  await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));
  return getAdminSupportTicket(ticketId);
}

export async function addAdminTicketMessage(
  ticketId: string,
  adminUserId: string,
  bodyHtml: string,
) {
  const ticket = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  const row = ticket[0];
  if (!row) return null;

  const { bodyHtml: safeHtml, bodyText } = sanitizeRichText(bodyHtml);
  if (!bodyText.trim()) {
    throw new Error("Message required");
  }

  const now = nowIso();
  const messageId = generateId();

  await db.insert(supportTicketMessages).values({
    id: messageId,
    ticket: ticketId,
    author: adminUserId,
    authorRole: "admin",
    bodyHtml: safeHtml,
    bodyText,
    created: now,
  });

  await db
    .update(supportTickets)
    .set({
      status: row.status === "open" ? "waiting_user" : row.status,
      lastReplyAt: now,
      lastReplyBy: "admin",
      updated: now,
    })
    .where(eq(supportTickets.id, ticketId));

  const reporter = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, row.reporter))
    .limit(1);
  const reporterRow = reporter[0];
  if (reporterRow?.email) {
    const { appUrl } = getRuntimeConfig();
    void sendSupportTicketReplyEmail(
      reporterRow.email,
      reporterRow.name,
      row.subject,
      bodyText,
      `${appUrl}/support/${ticketId}`,
    ).catch(() => {});
  }

  return getAdminSupportTicket(ticketId);
}

export async function countOpenSupportTickets() {
  const rows = await db
    .select({ total: count() })
    .from(supportTickets)
    .where(
      inArray(supportTickets.status, ["open", "in_progress", "waiting_user"]),
    );
  return rows[0]?.total ?? 0;
}

export async function getStaleOpenTicketCount(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db
    .select({ total: count() })
    .from(supportTickets)
    .where(
      and(
        inArray(supportTickets.status, ["open", "in_progress"]),
        sql`${supportTickets.updated} <= ${since}`,
      ),
    );
  return rows[0]?.total ?? 0;
}

export function isValidCategory(value: string): value is SupportTicketCategory {
  return (supportTicketCategories as readonly string[]).includes(value);
}

export function isValidStatus(value: string): value is SupportTicketStatus {
  return (supportTicketStatuses as readonly string[]).includes(value);
}

export function isValidPriority(value: string): value is SupportTicketPriority {
  return (supportTicketPriorities as readonly string[]).includes(value);
}
