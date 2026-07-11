import { describe, expect, test } from "bun:test";
import { sqlite } from "../../db/client.bun";

describe("database migration", () => {
  test("fresh migrate creates promotions and orders tables", () => {
    expect(sqlite).not.toBeNull();
    const db = sqlite!;
    const rows = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table'")
      .all();

    const tableNames = rows.map((r) => r.name);
    expect(tableNames).toContain("promotions");
    expect(tableNames).toContain("promotion_targets");
    expect(tableNames).toContain("orders");
  });
});
