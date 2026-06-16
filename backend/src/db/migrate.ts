import { mkdirSync } from "node:fs";
import { env } from "../env";
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
`;

export function runMigrate() {
  mkdirSync(env.dataDir, { recursive: true });
  sqlite.exec(DDL);
}

if (import.meta.main) {
  runMigrate();
  console.log("Database migrated at", env.dbPath);
}
