import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import {
  promotionTargets,
  promotionUsages,
  promotions,
} from "../db/schema";
import { buildChanges, logAuditEvent } from "../lib/audit";
import { generateId } from "../lib/id";
import { mapPromotion } from "../lib/mappers";
import { calculatePromotions } from "../lib/promotions/engine";
import type { PromotionInput } from "../lib/promotions/types";
import { notDeleted } from "../lib/soft-delete";
import { nowIso } from "../lib/timestamps";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  requireStoreMember,
  type StoreAccessVariables,
} from "../middleware/store-access";

type Vars = AuthVariables & StoreAccessVariables;

export const promotionRoutes = new Hono<{ Variables: Vars }>();

type TargetBody = {
  target_type: "product" | "category";
  target_id: string;
};

function parsePromotionBody(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? ""),
    type: (body.type as PromotionInput["type"]) ?? "bxgy",
    buyQuantity: Number(body.buy_quantity ?? 0),
    getQuantity: Number(body.get_quantity ?? 0),
    getDiscountPercent: Number(body.get_discount_percent ?? 100),
    poolMode:
      (body.pool_mode as PromotionInput["pool_mode"]) ?? "same_product",
    rewardMode:
      (body.reward_mode as PromotionInput["reward_mode"]) ?? "cheapest",
    value: Number(body.value ?? 0),
    minPurchase: Number(body.min_purchase ?? 0),
    couponCode: body.coupon_code
      ? String(body.coupon_code).trim()
      : null,
    couponDiscountType:
      (body.coupon_discount_type as "percent" | "fixed") ?? "fixed",
    maxUsesTotal:
      body.max_uses_total != null && body.max_uses_total !== ""
        ? Number(body.max_uses_total)
        : null,
    maxUsesPerCustomer:
      body.max_uses_per_customer != null && body.max_uses_per_customer !== ""
        ? Number(body.max_uses_per_customer)
        : null,
    stackable: body.stackable !== false,
    priority: Number(body.priority ?? 0),
    startDate: String(body.start_date ?? ""),
    endDate: String(body.end_date ?? ""),
    isActive: body.is_active !== false,
    targets: Array.isArray(body.targets)
      ? (body.targets as TargetBody[])
      : [],
  };
}

async function loadPromotionWithTargets(storeId: string, id: string) {
  const rows = await db
    .select()
    .from(promotions)
    .where(and(eq(promotions.id, id), eq(promotions.store, storeId)))
    .limit(1);

  const promo = rows[0];
  if (!promo) return null;

  const targets = await db
    .select()
    .from(promotionTargets)
    .where(
      and(eq(promotionTargets.promotion, id), notDeleted(promotionTargets.deletedAt)),
    );

  return mapPromotion({ ...promo, targets });
}

async function replaceTargets(
  promotionId: string,
  targets: TargetBody[],
  now: string,
) {
  await db
    .update(promotionTargets)
    .set({ deletedAt: now, updated: now })
    .where(
      and(
        eq(promotionTargets.promotion, promotionId),
        notDeleted(promotionTargets.deletedAt),
      ),
    );

  for (const target of targets) {
    await db.insert(promotionTargets).values({
      id: generateId(),
      promotion: promotionId,
      targetType: target.target_type,
      targetId: target.target_id,
      created: now,
      updated: now,
    });
  }
}

promotionRoutes.get(
  "/:storeId/promotions",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const rows = await db
      .select()
      .from(promotions)
      .where(and(eq(promotions.store, storeId), notDeleted(promotions.deletedAt)))
      .orderBy(asc(promotions.name));

    const result = [];
    for (const row of rows) {
      const targets = await db
        .select()
        .from(promotionTargets)
        .where(
          and(
            eq(promotionTargets.promotion, row.id),
            notDeleted(promotionTargets.deletedAt),
          ),
        );
      result.push(mapPromotion({ ...row, targets }));
    }

    return c.json(result);
  },
);

promotionRoutes.post(
  "/:storeId/promotions/validate-coupon",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<{
      coupon_code?: string;
      customer_id?: string;
      lines?: Array<{
        product_id: string;
        category_id?: string;
        price: number;
        quantity: number;
      }>;
    }>();

    const promoInputs = await loadStorePromotions(storeId);
    const { usageByPromotion } = await loadPromotionUsageCounts(storeId);

    const result = calculatePromotions({
      lines: (body.lines ?? []).map((l) => ({
        product_id: l.product_id,
        category_id: l.category_id ?? "",
        price: l.price,
        quantity: l.quantity,
      })),
      promotions: promoInputs,
      coupon_code: body.coupon_code,
      customer_id: body.customer_id,
      usage_by_promotion: usageByPromotion,
    });

    return c.json({
      valid: !result.coupon_error,
      error: result.coupon_error ?? null,
      discount: result.order_discount,
      applied_promotions: result.applied_promotions,
    });
  },
);

promotionRoutes.post(
  "/:storeId/promotions",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const parsed = parsePromotionBody(body);
    const now = nowIso();
    const id = generateId();

    if (parsed.type === "coupon" && !parsed.couponCode) {
      throw new HTTPException(400, { message: "coupon_code required" });
    }

    await db.insert(promotions).values({
      id,
      store: storeId,
      name: parsed.name,
      type: parsed.type,
      buyQuantity: parsed.buyQuantity,
      getQuantity: parsed.getQuantity,
      getDiscountPercent: parsed.getDiscountPercent,
      poolMode: parsed.poolMode,
      rewardMode: parsed.rewardMode,
      value: parsed.value,
      minPurchase: parsed.minPurchase,
      couponCode: parsed.couponCode,
      couponDiscountType: parsed.couponDiscountType,
      maxUsesTotal: parsed.maxUsesTotal,
      maxUsesPerCustomer: parsed.maxUsesPerCustomer,
      stackable: parsed.stackable,
      priority: parsed.priority,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      isActive: parsed.isActive,
      created: now,
      updated: now,
    });

    await replaceTargets(id, parsed.targets, now);

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "promotion.create",
      entityType: "promotion",
      entityId: id,
      summary: `สร้างโปรโมชัน "${parsed.name}"`,
      metadata: { type: parsed.type },
    });

    const record = await loadPromotionWithTargets(storeId, id);
    return c.json(record, 201);
  },
);

promotionRoutes.patch(
  "/:storeId/promotions/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const existing = await db
      .select()
      .from(promotions)
      .where(and(eq(promotions.id, id), eq(promotions.store, storeId)))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Not found" });

    const updates: Partial<typeof promotions.$inferInsert> = { updated: now };
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.type !== undefined) {
      updates.type = body.type as PromotionInput["type"];
    }
    if (body.buy_quantity !== undefined) {
      updates.buyQuantity = Number(body.buy_quantity);
    }
    if (body.get_quantity !== undefined) {
      updates.getQuantity = Number(body.get_quantity);
    }
    if (body.get_discount_percent !== undefined) {
      updates.getDiscountPercent = Number(body.get_discount_percent);
    }
    if (body.pool_mode !== undefined) {
      updates.poolMode = body.pool_mode as PromotionInput["pool_mode"];
    }
    if (body.reward_mode !== undefined) {
      updates.rewardMode = body.reward_mode as PromotionInput["reward_mode"];
    }
    if (body.value !== undefined) updates.value = Number(body.value);
    if (body.min_purchase !== undefined) {
      updates.minPurchase = Number(body.min_purchase);
    }
    if (body.coupon_code !== undefined) {
      updates.couponCode = body.coupon_code
        ? String(body.coupon_code).trim()
        : null;
    }
    if (body.coupon_discount_type !== undefined) {
      updates.couponDiscountType = body.coupon_discount_type as
        | "percent"
        | "fixed";
    }
    if (body.max_uses_total !== undefined) {
      updates.maxUsesTotal =
        body.max_uses_total === null || body.max_uses_total === ""
          ? null
          : Number(body.max_uses_total);
    }
    if (body.max_uses_per_customer !== undefined) {
      updates.maxUsesPerCustomer =
        body.max_uses_per_customer === null ||
        body.max_uses_per_customer === ""
          ? null
          : Number(body.max_uses_per_customer);
    }
    if (body.stackable !== undefined) updates.stackable = Boolean(body.stackable);
    if (body.priority !== undefined) updates.priority = Number(body.priority);
    if (body.start_date !== undefined) {
      updates.startDate = String(body.start_date);
    }
    if (body.end_date !== undefined) updates.endDate = String(body.end_date);
    if (body.is_active !== undefined) updates.isActive = Boolean(body.is_active);

    await db
      .update(promotions)
      .set(updates)
      .where(and(eq(promotions.id, id), eq(promotions.store, storeId)));

    if (Array.isArray(body.targets)) {
      await replaceTargets(id, body.targets as TargetBody[], now);
    }

    const rows = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, id))
      .limit(1);

    const changes = buildChanges(
      existing[0] as unknown as Record<string, unknown>,
      rows[0]! as unknown as Record<string, unknown>,
      [
        "name",
        "type",
        "buyQuantity",
        "getQuantity",
        "value",
        "isActive",
        "couponCode",
      ],
    );
    if (Object.keys(changes).length > 0) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "promotion.update",
        entityType: "promotion",
        entityId: id,
        summary: `แก้ไขโปรโมชัน "${rows[0]!.name}"`,
        changes,
      });
    }

    const record = await loadPromotionWithTargets(storeId, id);
    return c.json(record);
  },
);

promotionRoutes.delete(
  "/:storeId/promotions/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const userId = c.get("userId");

    const existing = await db
      .select()
      .from(promotions)
      .where(and(eq(promotions.id, id), eq(promotions.store, storeId)))
      .limit(1);

    const now = nowIso();
    await db
      .update(promotions)
      .set({ deletedAt: now, updated: now, isActive: false })
      .where(and(eq(promotions.id, id), eq(promotions.store, storeId)));

    await db
      .update(promotionTargets)
      .set({ deletedAt: now, updated: now })
      .where(eq(promotionTargets.promotion, id));

    if (existing[0]) {
      logAuditEvent(c, {
        store: storeId,
        actor: userId,
        action: "promotion.delete",
        entityType: "promotion",
        entityId: id,
        summary: `ลบโปรโมชัน "${existing[0].name}"`,
      });
    }

    return c.json({ success: true });
  },
);

export async function loadStorePromotions(
  storeId: string,
): Promise<PromotionInput[]> {
  const promoRows = await db
    .select()
    .from(promotions)
    .where(and(eq(promotions.store, storeId), notDeleted(promotions.deletedAt)));

  const result: PromotionInput[] = [];
  for (const row of promoRows) {
    const targets = await db
      .select()
      .from(promotionTargets)
      .where(
        and(
          eq(promotionTargets.promotion, row.id),
          notDeleted(promotionTargets.deletedAt),
        ),
      );
    result.push({
      id: row.id,
      name: row.name,
      type: row.type as PromotionInput["type"],
      buy_quantity: row.buyQuantity,
      get_quantity: row.getQuantity,
      get_discount_percent: row.getDiscountPercent,
      pool_mode: row.poolMode as PromotionInput["pool_mode"],
      reward_mode: row.rewardMode as PromotionInput["reward_mode"],
      value: row.value,
      min_purchase: row.minPurchase,
      coupon_code: row.couponCode,
      coupon_discount_type: row.couponDiscountType as "percent" | "fixed",
      max_uses_total: row.maxUsesTotal,
      max_uses_per_customer: row.maxUsesPerCustomer,
      stackable: row.stackable,
      priority: row.priority,
      start_date: row.startDate,
      end_date: row.endDate,
      is_active: row.isActive,
      targets: targets.map((t) => ({
        target_type: t.targetType as "product" | "category",
        target_id: t.targetId,
      })),
    });
  }
  return result;
}

export async function loadPromotionUsageCounts(storeId: string) {
  const usageRows = await db
    .select({
      promotion: promotionUsages.promotion,
      customer: promotionUsages.customer,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(promotionUsages)
    .where(eq(promotionUsages.store, storeId))
    .groupBy(promotionUsages.promotion, promotionUsages.customer);

  const usageByPromotion: Record<string, number> = {};
  const usageByPromotionCustomer: Record<string, number> = {};

  for (const row of usageRows) {
    usageByPromotion[row.promotion] =
      (usageByPromotion[row.promotion] ?? 0) + row.count;
    if (row.customer) {
      const key = `${row.promotion}:${row.customer}`;
      usageByPromotionCustomer[key] = row.count;
    }
  }

  return { usageByPromotion, usageByPromotionCustomer };
}
