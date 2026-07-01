import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  created: text("created").notNull(),
  updated: text("updated").notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  ...timestamps,
});

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    user: text("user")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expires: text("expires").notNull(),
    used: integer("used").notNull().default(0),
    created: text("created").notNull(),
  },
  (t) => [
    uniqueIndex("idx_password_reset_tokens_token").on(t.token),
    index("idx_password_reset_tokens_user").on(t.user),
  ],
);

export const stores = sqliteTable(
  "stores",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    taxId: text("tax_id").notNull().default(""),
    logo: text("logo").notNull().default(""),
    settings: text("settings", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    owner: text("owner")
      .notNull()
      .references(() => users.id),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("idx_stores_slug").on(t.slug)],
);

export const storeMembers = sqliteTable(
  "store_members",
  {
    id: text("id").primaryKey(),
    store: text("store")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    user: text("user")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "manager", "cashier"] }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("idx_store_members_store_user").on(t.store, t.user)],
);

export const storeInvites = sqliteTable(
  "store_invites",
  {
    id: text("id").primaryKey(),
    store: text("store")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["manager", "cashier"] }).notNull(),
    token: text("token").notNull(),
    status: text("status", {
      enum: ["pending", "accepted", "expired", "cancelled"],
    }).notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id),
    expires: text("expires").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("idx_store_invites_token").on(t.token),
    uniqueIndex("idx_store_invites_store_email").on(t.store, t.email),
  ],
);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  store: text("store")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  deletedAt: text("deleted_at"),
  ...timestamps,
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  store: text("store")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").notNull().default(""),
  barcode: text("barcode").notNull().default(""),
  description: text("description").notNull().default(""),
  price: real("price").notNull(),
  cost: real("cost").notNull().default(0),
  category: text("category").references(() => categories.id),
  image: text("image").notNull().default(""),
  unit: text("unit").notNull().default(""),
  trackInventory: integer("track_inventory", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  deletedAt: text("deleted_at"),
  ...timestamps,
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  store: text("store")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  note: text("note").notNull().default(""),
  totalSpent: real("total_spent").notNull().default(0),
  visitCount: integer("visit_count").notNull().default(0),
  deletedAt: text("deleted_at"),
  ...timestamps,
});

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    store: text("store")
      .notNull()
      .references(() => stores.id),
    orderNumber: text("order_number").notNull(),
    clientId: text("client_id").notNull(),
    customer: text("customer").references(() => customers.id),
    cashier: text("cashier")
      .notNull()
      .references(() => users.id),
    subtotal: real("subtotal").notNull(),
    discountAmount: real("discount_amount").notNull().default(0),
    discountType: text("discount_type").notNull().default(""),
    taxAmount: real("tax_amount").notNull().default(0),
    total: real("total").notNull(),
    paymentMethod: text("payment_method", { enum: ["cash", "qr"] }).notNull(),
    paymentReceived: real("payment_received").notNull().default(0),
    changeAmount: real("change_amount").notNull().default(0),
    status: text("status", {
      enum: ["completed", "voided", "refunded"],
    }).notNull(),
    note: text("note").notNull().default(""),
    syncedAt: text("synced_at").notNull().default(""),
    couponCode: text("coupon_code").notNull().default(""),
    appliedPromotions: text("applied_promotions", { mode: "json" })
      .$type<
        Array<{
          promotion_id: string;
          name: string;
          amount: number;
          coupon_code?: string;
        }>
      >()
      .notNull()
      .default([]),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("idx_orders_store_order_number").on(t.store, t.orderNumber),
    uniqueIndex("idx_orders_client_id").on(t.clientId),
  ],
);

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  order: text("order")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  product: text("product")
    .notNull()
    .references(() => products.id),
  productName: text("product_name").notNull(),
  productPrice: real("product_price").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  discount: real("discount").notNull().default(0),
  total: real("total").notNull(),
  promotionId: text("promotion_id"),
  freeQuantity: integer("free_quantity").notNull().default(0),
  ...timestamps,
});

export const inventory = sqliteTable(
  "inventory",
  {
    id: text("id").primaryKey(),
    store: text("store")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    product: text("product")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: real("quantity").notNull().default(0),
    lowStockThreshold: real("low_stock_threshold").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("idx_inventory_store_product").on(t.store, t.product)],
);

export const inventoryTransactions = sqliteTable("inventory_transactions", {
  id: text("id").primaryKey(),
  store: text("store")
    .notNull()
    .references(() => stores.id),
  product: text("product")
    .notNull()
    .references(() => products.id),
  type: text("type", {
    enum: ["stock_in", "stock_out", "adjustment", "sale"],
  }).notNull(),
  quantity: real("quantity").notNull(),
  beforeQty: real("before_qty").notNull(),
  afterQty: real("after_qty").notNull(),
  reference: text("reference").notNull().default(""),
  note: text("note").notNull().default(""),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  ...timestamps,
});

export const promotions = sqliteTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    store: text("store")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["bxgy", "order_percent", "order_fixed", "coupon"],
    }).notNull(),
    buyQuantity: integer("buy_quantity").notNull().default(0),
    getQuantity: integer("get_quantity").notNull().default(0),
    getDiscountPercent: real("get_discount_percent").notNull().default(100),
    poolMode: text("pool_mode", {
      enum: ["same_product", "same_category", "mixed"],
    })
      .notNull()
      .default("same_product"),
    rewardMode: text("reward_mode", {
      enum: ["cheapest", "same_product"],
    })
      .notNull()
      .default("cheapest"),
    value: real("value").notNull().default(0),
    minPurchase: real("min_purchase").notNull().default(0),
    couponCode: text("coupon_code"),
    couponDiscountType: text("coupon_discount_type", {
      enum: ["percent", "fixed"],
    })
      .notNull()
      .default("fixed"),
    maxUsesTotal: integer("max_uses_total"),
    maxUsesPerCustomer: integer("max_uses_per_customer"),
    stackable: integer("stackable", { mode: "boolean" })
      .notNull()
      .default(true),
    priority: integer("priority").notNull().default(0),
    startDate: text("start_date").notNull().default(""),
    endDate: text("end_date").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    deletedAt: text("deleted_at"),
    ...timestamps,
  },
);

export const promotionTargets = sqliteTable(
  "promotion_targets",
  {
    id: text("id").primaryKey(),
    promotion: text("promotion")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    targetType: text("target_type", {
      enum: ["product", "category"],
    }).notNull(),
    targetId: text("target_id").notNull(),
    deletedAt: text("deleted_at"),
    ...timestamps,
  },
  (t) => [
    index("idx_promotion_targets_promotion").on(t.promotion),
    index("idx_promotion_targets_target").on(t.targetType, t.targetId),
  ],
);

export const promotionUsages = sqliteTable(
  "promotion_usages",
  {
    id: text("id").primaryKey(),
    store: text("store")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    promotion: text("promotion")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    order: text("order")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customer: text("customer").references(() => customers.id),
    discountAmount: real("discount_amount").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("idx_promotion_usages_store_promotion").on(t.store, t.promotion),
    index("idx_promotion_usages_customer").on(t.store, t.customer),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    store: text("store").references(() => stores.id),
    actor: text("actor").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    summary: text("summary").notNull(),
    changes: text("changes", { mode: "json" })
      .$type<Record<string, { from: unknown; to: unknown }>>()
      .notNull()
      .default({}),
    metadata: text("metadata", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    created: text("created").notNull(),
  },
  (t) => [
    index("idx_audit_store_created").on(t.store, t.created),
    index("idx_audit_entity").on(t.store, t.entityType, t.entityId),
    index("idx_audit_actor").on(t.store, t.actor),
  ],
);

export const schema = {
  users,
  passwordResetTokens,
  stores,
  storeMembers,
  storeInvites,
  categories,
  products,
  customers,
  orders,
  orderItems,
  inventory,
  inventoryTransactions,
  promotions,
  promotionTargets,
  promotionUsages,
  auditEvents,
};
