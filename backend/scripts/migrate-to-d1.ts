#!/usr/bin/env bun
/**
 * Export data from local pos.db and generate SQL for D1 import.
 *
 * Usage:
 *   bun run scripts/migrate-to-d1.ts
 *   bun run scripts/migrate-to-d1.ts --output=./d1-import.sql
 *   wrangler d1 execute zkcnt-pos --remote --file=./d1-import.sql
 */

import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TABLES_IN_ORDER = [
  "users",
  "password_reset_tokens",
  "stores",
  "store_members",
  "store_invites",
  "categories",
  "products",
  "customers",
  "orders",
  "order_items",
  "inventory",
  "inventory_transactions",
  "promotions",
  "promotion_targets",
  "promotion_usages",
  "audit_events",
] as const;

type TableName = (typeof TABLES_IN_ORDER)[number];

function escapeSql(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function getColumns(db: Database, table: TableName): string[] {
  return db
    .query<{ name: string }, []>(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);
}

/** Per-table WHERE clauses that drop rows with broken FKs (e.g. after .recover). */
const EXPORT_FILTERS: Partial<Record<TableName, string>> = {
  password_reset_tokens: "user IN (SELECT id FROM users)",
  stores: "owner IN (SELECT id FROM users)",
  store_members:
    "store IN (SELECT id FROM stores) AND user IN (SELECT id FROM users)",
  store_invites:
    "store IN (SELECT id FROM stores) AND invited_by IN (SELECT id FROM users)",
  categories: "store IN (SELECT id FROM stores)",
  products:
    "store IN (SELECT id FROM stores) AND (category IS NULL OR category IN (SELECT id FROM categories))",
  customers: "store IN (SELECT id FROM stores)",
  orders:
    "store IN (SELECT id FROM stores) AND cashier IN (SELECT id FROM users) AND (customer IS NULL OR customer IN (SELECT id FROM customers))",
  order_items:
    `"order" IN (SELECT id FROM orders) AND product IN (SELECT id FROM products)`,
  inventory:
    "store IN (SELECT id FROM stores) AND product IN (SELECT id FROM products)",
  inventory_transactions:
    "store IN (SELECT id FROM stores) AND product IN (SELECT id FROM products) AND created_by IN (SELECT id FROM users)",
  promotions: "store IN (SELECT id FROM stores)",
  promotion_targets: "promotion IN (SELECT id FROM promotions)",
  promotion_usages:
    "store IN (SELECT id FROM stores) AND promotion IN (SELECT id FROM promotions) AND \"order\" IN (SELECT id FROM orders) AND (customer IS NULL OR customer IN (SELECT id FROM customers))",
  audit_events:
    "(store IS NULL OR store IN (SELECT id FROM stores)) AND (actor IS NULL OR actor IN (SELECT id FROM users))",
};

function exportTable(db: Database, table: TableName): string[] {
  const columns = getColumns(db, table);
  if (columns.length === 0) return [];

  const quotedColumns = columns.map((col) =>
    col === "order" ? '"order"' : col,
  );
  const filter = EXPORT_FILTERS[table];
  const total =
    db
      .query<{ count: number }, []>(`SELECT COUNT(*) as count FROM ${table}`)
      .get()?.count ?? 0;
  const sql = filter
    ? `SELECT ${quotedColumns.join(", ")} FROM ${table} WHERE ${filter}`
    : `SELECT ${quotedColumns.join(", ")} FROM ${table}`;
  const rows = db.query(sql).all() as Record<string, unknown>[];

  if (total > rows.length) {
    console.warn(
      `  skip ${table}: dropped ${total - rows.length} orphan row(s)`,
    );
  }

  if (rows.length === 0) return [];

  const statements: string[] = [];
  for (const row of rows) {
    const values = columns.map((col) => escapeSql(row[col]));
    statements.push(
      `INSERT OR IGNORE INTO ${table} (${quotedColumns.join(", ")}) VALUES (${values.join(", ")});`,
    );
  }
  return statements;
}

function validate(db: Database): void {
  const counts: Record<string, number> = {};
  for (const table of TABLES_IN_ORDER) {
    const row = db
      .query<{ count: number }, []>(`SELECT COUNT(*) as count FROM ${table}`)
      .get();
    counts[table] = row?.count ?? 0;
  }

  console.log("Row counts:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }

  const orphanOrders = db
    .query<{ count: number }, []>(
      `SELECT COUNT(*) as count FROM orders o
       LEFT JOIN stores s ON s.id = o.store
       WHERE s.id IS NULL`,
    )
    .get()?.count;
  if (orphanOrders && orphanOrders > 0) {
    throw new Error(`Found ${orphanOrders} orders without store FK`);
  }
}

function main() {
  const dataDir = process.env.DATA_DIR ?? join(import.meta.dir, "..", "data");
  const dbPath = join(dataDir, "pos.db");
  const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
  const outputPath =
    outputArg?.split("=")[1] ??
    join(import.meta.dir, "..", "d1-import.sql");

  const db = new Database(dbPath, { readonly: true });
  validate(db);

  // D1 remote execute rejects BEGIN/COMMIT/SAVEPOINT — Wrangler batches atomically.
  const lines: string[] = [];

  for (const table of TABLES_IN_ORDER) {
    lines.push(...exportTable(db, table));
  }

  mkdirSync(join(outputPath, ".."), { recursive: true });
  writeFileSync(outputPath, lines.join("\n"), "utf8");

  console.log(`\nWrote ${lines.length} lines to ${outputPath}`);
  console.log("\nImport to D1:");
  console.log(`  wrangler d1 execute zkcnt-pos --remote --file=${outputPath}`);
}

main();
