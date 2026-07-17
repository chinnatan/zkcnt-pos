import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";
import { setDbRuntime, type DbRuntime } from "./executor";

export type AppDb = ReturnType<typeof drizzleD1<typeof schema>>;

let activeDb: AppDb | null = null;

export function createDbFromD1(d1: D1Database): AppDb {
  return drizzleD1(d1, { schema });
}

export function initDb(db: AppDb, runtime: DbRuntime = "bun"): AppDb {
  activeDb = db;
  setDbRuntime(runtime);
  return db;
}

export function getDb(): AppDb {
  if (!activeDb) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return activeDb;
}

/** @deprecated Prefer getDb() — kept for gradual migration of route imports */
export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
