import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logAuditEvent } from "../lib/audit";
import { generateId } from "../lib/id";
import { saveUpload } from "../lib/uploads";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import {
  addUserTicketMessage,
  createSupportTicket,
  getSupportTicketForUser,
  isValidCategory,
  listUserSupportTickets,
} from "../services/support.service";

export const supportRoutes = new Hono<{ Variables: AuthVariables }>();

supportRoutes.use("*", authMiddleware);

const SUPPORT_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

function isUploadFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

supportRoutes.post("/attachments", async (c) => {
  const userId = c.get("userId");
  const form = await c.req.parseBody();
  const file = form.image;

  if (!isUploadFile(file)) {
    throw new HTTPException(400, { message: "Image file required" });
  }
  if (!SUPPORT_IMAGE_MIMES.has(file.type)) {
    throw new HTTPException(400, { message: "Invalid image type" });
  }
  if (file.size > SUPPORT_IMAGE_MAX_SIZE) {
    throw new HTTPException(400, { message: "Image too large" });
  }

  const attachmentId = generateId();
  const path = await saveUpload(
    "support_attachments",
    `${userId}/${attachmentId}`,
    "image",
    file,
  );

  return c.json({ path }, 201);
});

supportRoutes.get("/tickets", async (c) => {
  const userId = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);
  const result = await listUserSupportTickets(userId, { limit, offset });
  return c.json(result);
});

supportRoutes.post("/tickets", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    subject: string;
    body_html: string;
    category?: string;
    store?: string | null;
    metadata?: Record<string, unknown>;
  }>();

  const category = body.category ?? "other";
  if (!isValidCategory(category)) {
    throw new HTTPException(400, { message: "Invalid category" });
  }

  try {
    const result = await createSupportTicket({
      reporterId: userId,
      subject: body.subject,
      bodyHtml: body.body_html ?? "",
      category,
      store: body.store ?? null,
      metadata: body.metadata,
    });

    if (!result) {
      throw new HTTPException(500, { message: "Failed to create ticket" });
    }

    logAuditEvent(c, {
      actor: userId,
      store: body.store ?? null,
      action: "support.ticket_create",
      entityType: "support_ticket",
      entityId: result.ticket.id,
      summary: `User created support ticket: ${result.ticket.subject}`,
    });

    return c.json(result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create ticket";
    throw new HTTPException(400, { message });
  }
});

supportRoutes.get("/tickets/:ticketId", async (c) => {
  const userId = c.get("userId");
  const result = await getSupportTicketForUser(c.req.param("ticketId"), userId);
  if (!result) {
    throw new HTTPException(404, { message: "Ticket not found" });
  }
  return c.json(result);
});

supportRoutes.post("/tickets/:ticketId/messages", async (c) => {
  const userId = c.get("userId");
  const ticketId = c.req.param("ticketId");
  const body = await c.req.json<{ body_html: string }>();

  try {
    const result = await addUserTicketMessage(ticketId, userId, body.body_html ?? "");
    if (!result) {
      throw new HTTPException(404, { message: "Ticket not found" });
    }

    logAuditEvent(c, {
      actor: userId,
      store: result.ticket.store,
      action: "support.ticket_reply",
      entityType: "support_ticket",
      entityId: ticketId,
      summary: `User replied to support ticket: ${result.ticket.subject}`,
    });

    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reply";
    if (message === "Ticket is closed") {
      throw new HTTPException(400, { message });
    }
    if (message === "Message required") {
      throw new HTTPException(400, { message });
    }
    throw new HTTPException(400, { message });
  }
});
