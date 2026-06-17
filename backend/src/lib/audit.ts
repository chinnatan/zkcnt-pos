import type { Context } from "hono";
import { db } from "../db/client";
import { auditEvents } from "../db/schema";
import { generateId } from "./id";
import { createLogger, redact } from "./logger";
import { nowIso } from "./timestamps";

const logger = createLogger("audit");

export type AuditAction =
  | "order.create"
  | "order.void"
  | "order.refund"
  | "order_item.create"
  | "inventory.create"
  | "inventory.update"
  | "inventory_transaction.create"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "customer.create"
  | "customer.update"
  | "customer.delete"
  | "discount.create"
  | "discount.update"
  | "discount.delete"
  | "store.create"
  | "store.update"
  | "member.add"
  | "member.remove"
  | "invite.create"
  | "invite.cancel"
  | "invite.accept"
  | "auth.register"
  | "auth.login"
  | "auth.login_failed";

export interface AuditEventInput {
  store?: string | null;
  actor?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

const FIELD_MAP: Record<string, string> = {
  name: "name",
  price: "price",
  cost: "cost",
  quantity: "quantity",
  lowStockThreshold: "low_stock_threshold",
  status: "status",
  role: "role",
  email: "email",
  isActive: "is_active",
  trackInventory: "track_inventory",
  value: "value",
  type: "type",
  address: "address",
  phone: "phone",
  taxId: "tax_id",
  settings: "settings",
  minPurchase: "min_purchase",
  startDate: "start_date",
  endDate: "end_date",
  sortOrder: "sort_order",
  sku: "sku",
  barcode: "barcode",
};

function getContextMeta(c?: Context): Record<string, unknown> {
  if (!c) return {};
  const meta: Record<string, unknown> = {};
  try {
    const requestId = c.get("requestId" as never) as string | undefined;
    if (requestId) meta.request_id = requestId;
  } catch {
    // not set
  }
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip");
  if (ip) meta.ip = ip;
  const ua = c.req.header("user-agent");
  if (ua) meta.user_agent = ua;
  return meta;
}

export function buildChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of fields) {
    const beforeVal = before[field];
    const afterVal = after[field];
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      const key = FIELD_MAP[field] ?? field;
      changes[key] = { from: beforeVal, to: afterVal };
    }
  }
  return changes;
}

export function logAuditEvent(c: Context | undefined, input: AuditEventInput): void {
  const now = nowIso();
  const metadata = redact({
    ...getContextMeta(c),
    ...(input.metadata ?? {}),
  }) as Record<string, unknown>;

  void db
    .insert(auditEvents)
    .values({
      id: generateId(),
      store: input.store ?? null,
      actor: input.actor ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      changes: input.changes ?? {},
      metadata,
      created: now,
    })
    .catch((err) => {
      logger.warn(`failed to write audit event action=${input.action}`, err);
    });
}
