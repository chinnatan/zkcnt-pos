import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getRuntimeConfig } from "./env";
import { authRoutes } from "./routes/auth";
import { catalogRoutes } from "./routes/catalog";
import { customerRoutes } from "./routes/customers";
import { promotionRoutes } from "./routes/promotions";
import { inventoryRoutes } from "./routes/inventory";
import {
  inviteRoutes,
  memberRoutes,
  storeRoutes,
} from "./routes/stores";
import { orderRoutes } from "./routes/orders";
import { syncRoutes } from "./routes/sync";
import { auditRoutes } from "./routes/audit";
import { reportRoutes } from "./routes/reports";
import { storeActionRoutes } from "./routes/store-actions";
import { getUpload } from "./lib/uploads";
import { log } from "./lib/logger";

const SKIP_REQUEST_LOG = ["/api/health"];

function getAllowedOrigin(): string {
  return getRuntimeConfig().allowedOrigin.replace(/\/$/, "");
}

function applyCorsHeaders(c: Parameters<Parameters<Hono["use"]>[1]>[0], origin: string) {
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  c.header("Vary", "Origin");
}

export function createApp() {
  const app = new Hono();

  app.use("*", async (c, next) => {
    c.set("requestId" as never, crypto.randomUUID());
    await next();
  });

  app.use("*", async (c, next) => {
    const allowedOrigin = getAllowedOrigin();
    const requestOrigin = c.req.header("Origin");
    const corsOrigin =
      requestOrigin && requestOrigin === allowedOrigin
        ? requestOrigin
        : allowedOrigin;

    if (c.req.method === "OPTIONS") {
      applyCorsHeaders(c, corsOrigin);
      return c.body(null, 204);
    }

    await next();
    applyCorsHeaders(c, corsOrigin);
  });

  app.use("*", async (c, next) => {
    const path = c.req.path;
    if (SKIP_REQUEST_LOG.includes(path) || path.startsWith("/uploads/")) {
      await next();
      return;
    }

    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    const parts = [
      `${c.req.method} ${path}`,
      `→ ${c.res.status}`,
      `${duration}ms`,
    ];

    try {
      const userId = c.get("userId" as never) as string | undefined;
      const storeId = c.get("storeId" as never) as string | undefined;
      const requestId = c.get("requestId" as never) as string | undefined;
      if (userId) parts.push(`userId=${userId}`);
      if (storeId) parts.push(`storeId=${storeId}`);
      if (requestId) parts.push(`requestId=${requestId}`);
    } catch {
      // context keys not set on this route
    }

    log.debug(parts.join(" "));
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ message: err.message }, err.status);
    }
    log.error(`${c.req.method} ${c.req.path}`, err);
    return c.json({ message: "Internal server error" }, 500);
  });

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.get("/uploads/*", async (c) => {
    const relative = c.req.path.replace(/^\/uploads\//, "");
    const response = await getUpload(relative);
    if (!response) return c.notFound();
    return response;
  });

  app.route("/api/auth", authRoutes);
  app.route("/api/stores", storeRoutes);
  app.route("/api/members", memberRoutes);
  app.route("/api/invites", inviteRoutes);
  app.route("/api/stores", catalogRoutes);
  app.route("/api/stores", customerRoutes);
  app.route("/api/stores", promotionRoutes);
  app.route("/api/stores", inventoryRoutes);
  app.route("/api/stores", orderRoutes);
  app.route("/api/stores", syncRoutes);
  app.route("/api/stores", auditRoutes);
  app.route("/api/stores", reportRoutes);
  app.route("/api/stores", storeActionRoutes);

  return app;
}
