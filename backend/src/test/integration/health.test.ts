import { describe, expect, test } from "bun:test";
import { jsonRequest } from "../setup";

describe("GET /api/health", () => {
  test("returns ok", async () => {
    const { res, json } = await jsonRequest<{ status: string }>("/api/health");
    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
  });
});
