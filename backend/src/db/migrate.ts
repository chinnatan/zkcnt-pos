import { mkdirSync } from "node:fs";
import { env } from "../env";
import { generateId } from "../lib/id";
import { sqlite } from "./client";

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  tax_id TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  settings TEXT NOT NULL DEFAULT '{}',
  owner TEXT NOT NULL REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_members (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  UNIQUE(store, user)
);

CREATE TABLE IF NOT EXISTS store_invites (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  invited_by TEXT NOT NULL REFERENCES users(id),
  expires TEXT NOT NULL,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_store_invites_store_email ON store_invites(store, email);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  barcode TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  category TEXT REFERENCES categories(id),
  image TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  track_inventory INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  total_spent REAL NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id),
  order_number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  customer TEXT REFERENCES customers(id),
  cashier TEXT NOT NULL REFERENCES users(id),
  subtotal REAL NOT NULL,
  discount_amount REAL NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT '',
  tax_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_received REAL NOT NULL DEFAULT 0,
  change_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  synced_at TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  UNIQUE(store, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  "order" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity REAL NOT NULL DEFAULT 0,
  low_stock_threshold REAL NOT NULL DEFAULT 0,
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  UNIQUE(store, product)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id),
  product TEXT NOT NULL REFERENCES products(id),
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  before_qty REAL NOT NULL,
  after_qty REAL NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  min_purchase REAL NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  store TEXT REFERENCES stores(id),
  actor TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  changes TEXT NOT NULL DEFAULT '{}',
  metadata TEXT NOT NULL DEFAULT '{}',
  created TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_store_created ON audit_events(store, created);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(store, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(store, actor);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  buy_quantity INTEGER NOT NULL DEFAULT 0,
  get_quantity INTEGER NOT NULL DEFAULT 0,
  get_discount_percent REAL NOT NULL DEFAULT 100,
  pool_mode TEXT NOT NULL DEFAULT 'same_product',
  reward_mode TEXT NOT NULL DEFAULT 'cheapest',
  value REAL NOT NULL DEFAULT 0,
  min_purchase REAL NOT NULL DEFAULT 0,
  coupon_code TEXT,
  coupon_discount_type TEXT NOT NULL DEFAULT 'fixed',
  max_uses_total INTEGER,
  max_uses_per_customer INTEGER,
  stackable INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_targets (
  id TEXT PRIMARY KEY,
  promotion TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_promotion_targets_promotion ON promotion_targets(promotion);
CREATE INDEX IF NOT EXISTS idx_promotion_targets_target ON promotion_targets(target_type, target_id);

CREATE TABLE IF NOT EXISTS promotion_usages (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  promotion TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  "order" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer TEXT REFERENCES customers(id),
  discount_amount REAL NOT NULL DEFAULT 0,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_promotion_usages_store_promotion ON promotion_usages(store, promotion);
CREATE INDEX IF NOT EXISTS idx_promotion_usages_customer ON promotion_usages(store, customer);
`;

export function runMigrate() {
  mkdirSync(env.dataDir, { recursive: true });
  sqlite.exec(DDL);
  migrateOrderPromotionColumns();
  migrateDiscountsToPromotions();
  backfillOrderAuditEvents();
}

function migrateOrderPromotionColumns() {
  const orderCols = sqlite
    .query<{ name: string }, []>("PRAGMA table_info(orders)")
    .all()
    .map((c) => c.name);

  if (!orderCols.includes("coupon_code")) {
    sqlite.exec(
      `ALTER TABLE orders ADD COLUMN coupon_code TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!orderCols.includes("applied_promotions")) {
    sqlite.exec(
      `ALTER TABLE orders ADD COLUMN applied_promotions TEXT NOT NULL DEFAULT '[]'`,
    );
  }

  const itemCols = sqlite
    .query<{ name: string }, []>("PRAGMA table_info(order_items)")
    .all()
    .map((c) => c.name);

  if (!itemCols.includes("promotion_id")) {
    sqlite.exec(`ALTER TABLE order_items ADD COLUMN promotion_id TEXT`);
  }
  if (!itemCols.includes("free_quantity")) {
    sqlite.exec(
      `ALTER TABLE order_items ADD COLUMN free_quantity INTEGER NOT NULL DEFAULT 0`,
    );
  }
}

function migrateDiscountsToPromotions() {
  const legacyDiscounts = sqlite
    .query<
      {
        id: string;
        store: string;
        name: string;
        type: string;
        value: number;
        min_purchase: number;
        start_date: string;
        end_date: string;
        is_active: number;
        created: string;
        updated: string;
      },
      []
    >(
      `SELECT id, store, name, type, value, min_purchase, start_date, end_date, is_active, created, updated
       FROM discounts`,
    )
    .all();

  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO promotions (
      id, store, name, type, buy_quantity, get_quantity, get_discount_percent,
      pool_mode, reward_mode, value, min_purchase, coupon_code, coupon_discount_type,
      max_uses_total, max_uses_per_customer, stackable, priority,
      start_date, end_date, is_active, created, updated
    ) VALUES (?, ?, ?, ?, 0, 0, 100, 'same_product', 'cheapest', ?, ?, NULL, 'fixed',
      NULL, NULL, 1, 0, ?, ?, ?, ?, ?)`,
  );

  for (const d of legacyDiscounts) {
    const promoType = d.type === "percent" ? "order_percent" : "order_fixed";
    insert.run(
      d.id,
      d.store,
      d.name,
      promoType,
      d.value,
      d.min_purchase,
      d.start_date,
      d.end_date,
      d.is_active,
      d.created,
      d.updated,
    );
  }
}

function backfillOrderAuditEvents() {
  const orders = sqlite
    .query<
      {
        id: string;
        store: string;
        cashier: string;
        order_number: string;
        total: number;
        payment_method: string;
        client_id: string;
        created: string;
      },
      []
    >(
      `SELECT o.id, o.store, o.cashier, o.order_number, o.total, o.payment_method, o.client_id, o.created
       FROM orders o
       WHERE NOT EXISTS (
         SELECT 1 FROM audit_events a
         WHERE a.entity_id = o.id AND a.action = 'order.create'
       )`,
    )
    .all();

  const insert = sqlite.prepare(
    `INSERT INTO audit_events (id, store, actor, action, entity_type, entity_id, summary, changes, metadata, created)
     VALUES (?, ?, ?, 'order.create', 'order', ?, ?, '{}', ?, ?)`,
  );

  for (const order of orders) {
    const metadata = JSON.stringify({
      client_id: order.client_id,
      order_number: order.order_number,
      payment_method: order.payment_method,
      total: order.total,
      backfilled: true,
    });
    const summary = `สร้างบิล #${order.order_number} ฿${order.total.toFixed(2)} (backfill)`;
    insert.run(
      generateId(),
      order.store,
      order.cashier,
      order.id,
      summary,
      metadata,
      order.created,
    );
  }
}

if (import.meta.main) {
  runMigrate();
  console.log("Database migrated at", env.dbPath);
}
