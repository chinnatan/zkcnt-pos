import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db/client";
import { categories, products } from "../db/schema";
import { generateId } from "../lib/id";
import { mapCategory, mapProduct } from "../lib/mappers";
import { nowIso } from "../lib/timestamps";
import { deleteUpload, saveUpload } from "../lib/uploads";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  requireStoreMember,
  type StoreAccessVariables,
} from "../middleware/store-access";

type Vars = AuthVariables & StoreAccessVariables;

const catalogRoutes = new Hono<{ Variables: Vars }>();

// Categories
catalogRoutes.get(
  "/:storeId/categories",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.store, storeId))
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return c.json(rows.map(mapCategory));
  },
);

catalogRoutes.post(
  "/:storeId/categories",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();
    const id = generateId();

    await db.insert(categories).values({
      id,
      store: storeId,
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      image: String(body.image ?? ""),
      sortOrder: Number(body.sort_order ?? 0),
      isActive: body.is_active !== false,
      created: now,
      updated: now,
    });

    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    return c.json(mapCategory(rows[0]!), 201);
  },
);

catalogRoutes.patch(
  "/:storeId/categories/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    const now = nowIso();

    const updates: Partial<typeof categories.$inferInsert> = { updated: now };
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.description !== undefined) updates.description = String(body.description);
    if (body.image !== undefined) updates.image = String(body.image);
    if (body.sort_order !== undefined) updates.sortOrder = Number(body.sort_order);
    if (body.is_active !== undefined) updates.isActive = Boolean(body.is_active);

    await db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.store, storeId)));

    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!rows[0]) throw new HTTPException(404, { message: "Not found" });
    return c.json(mapCategory(rows[0]));
  },
);

catalogRoutes.delete(
  "/:storeId/categories/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");

    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.store, storeId)));

    return c.json({ success: true });
  },
);

// Products
catalogRoutes.get(
  "/:storeId/products",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.store, storeId))
      .orderBy(asc(products.name));

    return c.json(rows.map(mapProduct));
  },
);

catalogRoutes.post(
  "/:storeId/products",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const contentType = c.req.header("content-type") ?? "";
    const now = nowIso();
    const id = generateId();

    let body: Record<string, unknown> = {};
    let imagePath = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.parseBody();
      for (const [key, value] of Object.entries(form)) {
        if (value instanceof File && value.size > 0) {
          imagePath = saveUpload("products", id, key, value);
        } else if (typeof value === "string") {
          body[key] = value === "true" ? true : value === "false" ? false : value;
        }
      }
    } else {
      body = await c.req.json<Record<string, unknown>>();
    }

    await db.insert(products).values({
      id,
      store: storeId,
      name: String(body.name ?? ""),
      sku: String(body.sku ?? ""),
      barcode: String(body.barcode ?? ""),
      description: String(body.description ?? ""),
      price: Number(body.price ?? 0),
      cost: Number(body.cost ?? 0),
      category: body.category ? String(body.category) : null,
      image: imagePath,
      unit: String(body.unit ?? ""),
      trackInventory: Boolean(body.track_inventory),
      isActive: body.is_active !== false,
      created: now,
      updated: now,
    });

    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return c.json(mapProduct(rows[0]!), 201);
  },
);

catalogRoutes.patch(
  "/:storeId/products/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const contentType = c.req.header("content-type") ?? "";
    const now = nowIso();

    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.store, storeId)))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Not found" });

    const updates: Partial<typeof products.$inferInsert> = { updated: now };
    let body: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.parseBody();
      for (const [key, value] of Object.entries(form)) {
        if (value instanceof File && value.size > 0) {
          if (existing[0].image) deleteUpload(existing[0].image);
          updates.image = saveUpload("products", id, key, value);
        } else if (key === "image" && value === "") {
          if (existing[0].image) deleteUpload(existing[0].image);
          updates.image = "";
        } else if (typeof value === "string") {
          body[key] = value === "true" ? true : value === "false" ? false : value;
        }
      }
    } else {
      body = await c.req.json<Record<string, unknown>>();
    }

    if (body.name !== undefined) updates.name = String(body.name);
    if (body.sku !== undefined) updates.sku = String(body.sku);
    if (body.barcode !== undefined) updates.barcode = String(body.barcode);
    if (body.description !== undefined) updates.description = String(body.description);
    if (body.price !== undefined) updates.price = Number(body.price);
    if (body.cost !== undefined) updates.cost = Number(body.cost);
    if (body.category !== undefined) {
      updates.category = body.category ? String(body.category) : null;
    }
    if (body.unit !== undefined) updates.unit = String(body.unit);
    if (body.track_inventory !== undefined) {
      updates.trackInventory = Boolean(body.track_inventory);
    }
    if (body.is_active !== undefined) updates.isActive = Boolean(body.is_active);

    await db
      .update(products)
      .set(updates)
      .where(and(eq(products.id, id), eq(products.store, storeId)));

    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return c.json(mapProduct(rows[0]!));
  },
);

catalogRoutes.delete(
  "/:storeId/products/:id",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");

    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.store, storeId)))
      .limit(1);

    if (existing[0]?.image) deleteUpload(existing[0].image);

    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.store, storeId)));

    return c.json({ success: true });
  },
);

catalogRoutes.post(
  "/:storeId/products/:id/image",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const id = c.req.param("id");
    const form = await c.req.parseBody();
    const file = form.image;

    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.store, storeId)))
      .limit(1);

    if (!existing[0]) throw new HTTPException(404, { message: "Not found" });

    let imagePath = "";
    if (file instanceof File && file.size > 0) {
      if (existing[0].image) deleteUpload(existing[0].image);
      imagePath = saveUpload("products", id, "image", file);
    } else if (form.remove === "true" || file === "") {
      if (existing[0].image) deleteUpload(existing[0].image);
      imagePath = "";
    }

    const now = nowIso();
    await db
      .update(products)
      .set({ image: imagePath, updated: now })
      .where(eq(products.id, id));

    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return c.json(mapProduct(rows[0]!));
  },
);

export { catalogRoutes };
