import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { boothProducts, booths, products } from "../db/schema";
import { logAuditEvent } from "../lib/audit";
import { generateId } from "../lib/id";
import { mapBooth, mapBoothProduct } from "../lib/mappers";
import { notDeleted } from "../lib/soft-delete";
import { nowIso } from "../lib/timestamps";
import { deleteUpload, saveUpload } from "../lib/uploads";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import {
  requireStoreManager,
  requireStoreMember,
  type StoreAccessVariables,
} from "../middleware/store-access";

type Vars = AuthVariables & StoreAccessVariables;

export const boothRoutes = new Hono<{ Variables: Vars }>();

// Clients create records offline, so they may supply their own id.
function resolveId(body: Record<string, unknown>): string {
  const id = body.id ? String(body.id) : "";
  if (!id) return generateId();
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id) || id.startsWith("temp_")) {
    throw new HTTPException(400, { message: "invalid_id" });
  }
  return id;
}

function parseExtraCosts(value: unknown): Array<{ name: string; amount: number }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      name: String((row as { name?: unknown })?.name ?? "").trim(),
      amount: Number((row as { amount?: unknown })?.amount ?? 0),
    }))
    .filter((row) => row.name && Number.isFinite(row.amount) && row.amount >= 0);
}

function parseFee(value: unknown): number {
  const fee = Number(value ?? 0);
  if (!Number.isFinite(fee) || fee < 0) {
    throw new HTTPException(400, { message: "invalid_booth_fee" });
  }
  return fee;
}

async function findBooth(storeId: string, id: string) {
  const rows = await db
    .select()
    .from(booths)
    .where(and(eq(booths.id, id), eq(booths.store, storeId)))
    .limit(1);
  if (!rows[0]) throw new HTTPException(404, { message: "Not found" });
  return rows[0];
}

boothRoutes.get(
  "/:storeId/booths",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const rows = await db
      .select()
      .from(booths)
      .where(and(eq(booths.store, storeId), notDeleted(booths.deletedAt)))
      .orderBy(asc(booths.startDate), asc(booths.name));
    return c.json(rows.map(mapBooth));
  },
);

boothRoutes.post(
  "/:storeId/booths",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const name = String(body.name ?? "").trim();
    if (!name) throw new HTTPException(400, { message: "name_required" });

    const id = resolveId(body);
    // replayed offline create: return what is already there
    const replay = await db
      .select()
      .from(booths)
      .where(and(eq(booths.id, id), eq(booths.store, storeId)))
      .limit(1);
    if (replay[0]) return c.json(mapBooth(replay[0]));

    const now = nowIso();
    await db.insert(booths).values({
      id,
      store: storeId,
      name,
      location: String(body.location ?? ""),
      startDate: String(body.start_date ?? ""),
      endDate: String(body.end_date ?? ""),
      boothFee: parseFee(body.booth_fee),
      extraCosts: parseExtraCosts(body.extra_costs),
      image: "",
      isActive: body.is_active !== false,
      created: now,
      updated: now,
    });

    const row = await findBooth(storeId, id);
    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "booth.create",
      entityType: "booth",
      entityId: id,
      summary: `สร้างบูธ "${name}"`,
    });
    return c.json(mapBooth(row), 201);
  },
);

boothRoutes.patch(
  "/:storeId/booths/:id",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const userId = c.get("userId");
    const body = await c.req.json<Record<string, unknown>>();
    const existing = await findBooth(storeId, id);

    const updates: Partial<typeof booths.$inferInsert> = { updated: nowIso() };
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new HTTPException(400, { message: "name_required" });
      updates.name = name;
    }
    if (body.location !== undefined) updates.location = String(body.location);
    if (body.start_date !== undefined) updates.startDate = String(body.start_date);
    if (body.end_date !== undefined) updates.endDate = String(body.end_date);
    if (body.booth_fee !== undefined) updates.boothFee = parseFee(body.booth_fee);
    if (body.extra_costs !== undefined) updates.extraCosts = parseExtraCosts(body.extra_costs);
    if (body.is_active !== undefined) updates.isActive = Boolean(body.is_active);
    if (body.closed_at !== undefined) updates.closedAt = body.closed_at ? String(body.closed_at) : null;

    await db
      .update(booths)
      .set(updates)
      .where(and(eq(booths.id, id), eq(booths.store, storeId)));

    const row = await findBooth(storeId, id);
    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "booth.update",
      entityType: "booth",
      entityId: id,
      summary: `แก้ไขบูธ "${row.name}"`,
    });
    return c.json(mapBooth(row));
  },
);

boothRoutes.delete(
  "/:storeId/booths/:id",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const userId = c.get("userId");
    const existing = await findBooth(storeId, id);

    const now = nowIso();
    await db
      .update(booths)
      .set({ deletedAt: now, updated: now })
      .where(eq(booths.id, id));
    await db
      .update(boothProducts)
      .set({ deletedAt: now, updated: now })
      .where(eq(boothProducts.booth, id));

    logAuditEvent(c, {
      store: storeId,
      actor: userId,
      action: "booth.delete",
      entityType: "booth",
      entityId: id,
      summary: `ลบบูธ "${existing.name}"`,
    });
    return c.json({ success: true });
  },
);

boothRoutes.post(
  "/:storeId/booths/:id/image",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const existing = await findBooth(storeId, id);
    const form = await c.req.parseBody();
    const file = form.image;

    let imagePath = existing.image;
    if (file instanceof File && file.size > 0) {
      if (existing.image) deleteUpload(existing.image);
      imagePath = await saveUpload("booths", id, "image", file);
    } else if (form.remove === "true" || file === "") {
      if (existing.image) deleteUpload(existing.image);
      imagePath = "";
    }

    await db
      .update(booths)
      .set({ image: imagePath, updated: nowIso() })
      .where(eq(booths.id, id));
    return c.json(mapBooth(await findBooth(storeId, id)));
  },
);

// ─── booth products ──────────────────────────────────────────────────────────

async function findBoothProduct(storeId: string, id: string) {
  const rows = await db
    .select({ row: boothProducts })
    .from(boothProducts)
    .innerJoin(booths, eq(booths.id, boothProducts.booth))
    .where(and(eq(boothProducts.id, id), eq(booths.store, storeId)))
    .limit(1);
  if (!rows[0]) throw new HTTPException(404, { message: "Not found" });
  return rows[0].row;
}

function parseQty(value: unknown, field: string): number {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0) {
    throw new HTTPException(400, { message: `invalid_${field}` });
  }
  return qty;
}

boothRoutes.get(
  "/:storeId/booth-products",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const boothId = c.req.query("booth");
    const rows = await db
      .select({ row: boothProducts })
      .from(boothProducts)
      .innerJoin(booths, eq(booths.id, boothProducts.booth))
      .where(
        and(
          eq(booths.store, storeId),
          notDeleted(boothProducts.deletedAt),
          boothId ? eq(boothProducts.booth, boothId) : undefined,
        ),
      );
    return c.json(rows.map((r) => mapBoothProduct(r.row)));
  },
);

// Adding a product that was previously removed from the booth revives its row
// (unique index on booth+product).
boothRoutes.post(
  "/:storeId/booth-products",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<Record<string, unknown>>();
    const boothId = String(body.booth ?? "");
    const productId = String(body.product ?? "");
    await findBooth(storeId, boothId);

    const productRows = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.store, storeId)))
      .limit(1);
    if (!productRows[0]) {
      throw new HTTPException(400, { message: "invalid_product" });
    }

    const qtyBrought = parseQty(body.qty_brought ?? 0, "qty_brought");
    const now = nowIso();

    const existing = await db
      .select()
      .from(boothProducts)
      .where(
        and(eq(boothProducts.booth, boothId), eq(boothProducts.product, productId)),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(boothProducts)
        .set({ qtyBrought, qtyLeft: null, deletedAt: null, updated: now })
        .where(eq(boothProducts.id, existing[0].id));
      return c.json(mapBoothProduct(await findBoothProduct(storeId, existing[0].id)));
    }

    const id = resolveId(body);
    await db.insert(boothProducts).values({
      id,
      booth: boothId,
      product: productId,
      qtyBrought,
      created: now,
      updated: now,
    });
    return c.json(mapBoothProduct(await findBoothProduct(storeId, id)), 201);
  },
);

boothRoutes.patch(
  "/:storeId/booth-products/:id",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    await findBoothProduct(storeId, id);

    const updates: Partial<typeof boothProducts.$inferInsert> = { updated: nowIso() };
    if (body.qty_brought !== undefined) {
      updates.qtyBrought = parseQty(body.qty_brought, "qty_brought");
    }
    if (body.qty_left !== undefined) {
      updates.qtyLeft =
        body.qty_left === null || body.qty_left === ""
          ? null
          : parseQty(body.qty_left, "qty_left");
    }

    await db.update(boothProducts).set(updates).where(eq(boothProducts.id, id));
    return c.json(mapBoothProduct(await findBoothProduct(storeId, id)));
  },
);

boothRoutes.delete(
  "/:storeId/booth-products/:id",
  authMiddleware,
  requireStoreManager,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    await findBoothProduct(storeId, id);
    const now = nowIso();
    await db
      .update(boothProducts)
      .set({ deletedAt: now, updated: now })
      .where(eq(boothProducts.id, id));
    return c.json({ success: true });
  },
);
