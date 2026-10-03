CREATE TABLE IF NOT EXISTS booths (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  booth_fee REAL NOT NULL DEFAULT 0,
  extra_costs TEXT NOT NULL DEFAULT '[]',
  image TEXT NOT NULL DEFAULT '',
  closed_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booth_products (
  id TEXT PRIMARY KEY,
  booth TEXT NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  product TEXT NOT NULL REFERENCES products(id),
  qty_brought REAL NOT NULL DEFAULT 0,
  qty_left REAL,
  deleted_at TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booths_store ON booths(store);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booth_products_booth_product ON booth_products(booth, product);
CREATE INDEX IF NOT EXISTS idx_booths_store_updated ON booths(store, updated);

ALTER TABLE orders ADD COLUMN booth TEXT REFERENCES booths(id);
CREATE INDEX IF NOT EXISTS idx_orders_booth ON orders(booth);
