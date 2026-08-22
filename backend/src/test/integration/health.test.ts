import { describe, expect, test } from "bun:test";
import { jsonRequest } from "../setup";

describe("GET /api/health", () => {
  test("returns ok with version info", async () => {
    const { res, json } = await jsonRequest<{ status: string; version: string; build: string }>(
      "/api/health",
    );
    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.version).toBeTruthy();
    expect(json.build).toBeTruthy();
  });
});
