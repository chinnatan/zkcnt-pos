import type { AppDb } from "./client";

/** Drizzle session used for reads/writes (real tx on Bun, db proxy on D1). */
export type DbExecutor = AppDb;

export type DbRuntime = "d1" | "bun";

let dbRuntime: DbRuntime = "bun";

export function setDbRuntime(runtime: DbRuntime): void {
  dbRuntime = runtime;
}

export function isD1Runtime(): boolean {
  return dbRuntime === "d1";
}

/** D1 rejects SQL BEGIN — run callback directly; Bun uses a real transaction. */
export async function withTransaction<T>(
  db: AppDb,
  fn: (tx: DbExecutor) => Promise<T>,
): Promise<T> {
  if (isD1Runtime()) {
    return fn(db);
  }
  return db.transaction(fn);
}

/** Atomic multi-write on D1 via native batch API (no SQL BEGIN). */
export async function runBatch(
  db: AppDb,
  statements: Parameters<AppDb["batch"]>[0],
): Promise<void> {
  await db.batch(statements);
}
