import { db } from "~/lib/db";
import { getBangkokStartOfDay } from "~/lib/timezone";
import type { Order } from "~/lib/types";

export interface TodayStats {
  sales: number;
  count: number;
}

export async function getTodayStats(
  storeId: string,
  now: Date = new Date(),
): Promise<TodayStats> {
  const since = getBangkokStartOfDay(now);
  const until = new Date(since.getTime() + 86_400_000);
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();

  const rows = (await db.orders
    .where("[store+status]")
    .equals([storeId, "completed"])
    .toArray()) as Order[];

  let sales = 0;
  let count = 0;
  for (const o of rows) {
    if (o.created >= sinceIso && o.created < untilIso) {
      sales += o.total;
      count += 1;
    }
  }
  return { sales, count };
}
