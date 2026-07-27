import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { stores } from "../db/schema";
import { logAuditEvent } from "../lib/audit";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  requireStoreOwner,
  type StoreAccessVariables,
} from "../middleware/store-access";
import {
  purgeStoreTransactionHistory,
  type PurgeMode,
  type PurgeScope,
} from "../services/store-transaction-purge.service";

type Vars = AuthVariables & StoreAccessVariables;

const VALID_MODES: PurgeMode[] = ["all", "filtered", "orders"];
const VALID_SCOPES: PurgeScope[] = [
  "orders",
  "inventory_transactions",
  "audit_events",
  "customers",
];

export const storeActionRoutes = new Hono<{ Variables: Vars }>();

storeActionRoutes.post(
  "/:storeId/actions/clear-transaction-history",
  authMiddleware,
  requireStoreOwner,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const body = await c.req.json<{
      confirm_slug?: string;
      mode?: string;
      scopes?: string[];
      since?: string;
      until?: string;
      delete_customers?: boolean;
      order_ids?: string[];
    }>();

    const confirmSlug = body.confirm_slug?.trim();
    if (!confirmSlug) {
      throw new HTTPException(400, { message: "confirm_slug required" });
    }

    const mode = (body.mode ?? "all") as PurgeMode;
    if (!VALID_MODES.includes(mode)) {
      throw new HTTPException(400, {
        message: "mode must be all, filtered, or orders",
      });
    }

    if (mode === "filtered") {
      const scopes = body.scopes ?? [];
      if (scopes.length === 0) {
        throw new HTTPException(400, {
          message: "scopes required for filtered mode",
        });
      }
      if (scopes.some((s) => !VALID_SCOPES.includes(s as PurgeScope))) {
        throw new HTTPException(400, { message: "invalid scope" });
      }
    }

    if (mode === "orders") {
      const orderIds = body.order_ids ?? [];
      if (orderIds.length === 0) {
        throw new HTTPException(400, {
          message: "order_ids required for orders mode",
        });
      }
    }

    const storeRows = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);
    const store = storeRows[0];
    if (!store) {
      throw new HTTPException(404, { message: "Store not found" });
    }

    if (confirmSlug !== store.slug) {
      throw new HTTPException(400, {
        message: "Store slug confirmation does not match",
      });
    }

    const deleteCustomers = body.delete_customers === true;
    const scopes = (body.scopes ?? []) as PurgeScope[];

    let result;
    try {
      result = await purgeStoreTransactionHistory(storeId, {
        mode,
        scopes,
        since: body.since?.trim() || undefined,
        until: body.until?.trim() || undefined,
        deleteCustomers,
        orderIds: body.order_ids,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purge failed";
      if (message.startsWith("Order ids not found")) {
        throw new HTTPException(400, { message });
      }
      throw err;
    }

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "store.transaction_history_clear",
      entityType: "store",
      entityId: storeId,
      summary: `เคลียร์ประวัติการขาย (โหมด ${mode}, บิล ${result.orders} รายการ)`,
      metadata: {
        ...result,
        scopes,
        since: body.since ?? null,
        until: body.until ?? null,
        order_ids_count: body.order_ids?.length ?? 0,
        delete_customers: deleteCustomers,
      },
    });

    return c.json({
      success: true,
      ...result,
    });
  },
);
