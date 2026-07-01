import { eq, isNull, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export function notDeleted(column: SQLiteColumn): SQL {
  return or(isNull(column), eq(column, ""))!;
}

export function deletedAtValue(now: string): string {
  return now;
}
