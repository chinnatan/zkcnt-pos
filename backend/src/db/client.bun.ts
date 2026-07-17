import { Database } from "bun:sqlite";
import { drizzle as drizzleBun } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { initDb, type AppDb } from "./client";

let bunSqlite: Database | null = null;

export function initBunDb(dbPath: string): AppDb {
  bunSqlite = new Database(dbPath);
  bunSqlite.exec("PRAGMA journal_mode = WAL;");
  bunSqlite.exec("PRAGMA foreign_keys = ON;");
  return initDb(drizzleBun(bunSqlite, { schema }) as unknown as AppDb, "bun");
}

export { bunSqlite as sqlite };
