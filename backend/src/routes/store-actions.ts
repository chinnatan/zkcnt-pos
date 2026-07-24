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
import { purgeStoreTransactionHistory } from "../services/store-transaction-purge.service";

type Vars = AuthVariables & StoreAccessVariables;

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
      delete_customers?: boolean;
    }>();

    const confirmSlug = body.confirm_slug?.trim();
    if (!confirmSlug) {
      throw new HTTPException(400, { message: "confirm_slug required" });
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
      throw new HTTPException(400, { message: "Store slug confirmation does not match" });
    }

    const deleteCustomers = body.delete_customers === true;
    const result = await purgeStoreTransactionHistory(storeId, {
      deleteCustomers,
    });

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "store.transaction_history_clear",
      entityType: "store",
      entityId: storeId,
      summary: `เคลียร์ประวัติการขาย (บิล ${result.orders} รายการ)`,
      metadata: {
        ...result,
        delete_customers: deleteCustomers,
      },
    });

    return c.json({
      success: true,
      ...result,
    });
  },
);
