import { describe, expect, test } from "bun:test";
import { jsonRequest } from "../setup";
import { registerUser } from "../helpers";

describe("auth", () => {
  test("GET /api/auth/me without token returns 401", async () => {
    const { res } = await jsonRequest("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("POST /api/auth/register returns token and user", async () => {
    const { token, user } = await registerUser({ email: "auth-me@test.com" });

    const { res, json } = await jsonRequest<{ id: string; email: string }>(
      "/api/auth/me",
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(res.status).toBe(200);
    expect(json.email).toBe(user.email);
  });
});
