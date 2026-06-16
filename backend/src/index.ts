import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { join } from "node:path";
import { env } from "./env";
import { runMigrate } from "./db/migrate";

runMigrate();
import { authRoutes } from "./routes/auth";
import { catalogRoutes } from "./routes/catalog";
import { customerRoutes } from "./routes/customers";
import { discountRoutes } from "./routes/discounts";
import { inventoryRoutes } from "./routes/inventory";
import {
  inviteRoutes,
  memberRoutes,
  storeRoutes,
} from "./routes/stores";
import { orderRoutes } from "./routes/orders";
import { syncRoutes } from "./routes/sync";

const app = new Hono();

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    });
  }
  await next();
  c.header("Access-Control-Allow-Origin", "*");
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ message: err.message }, err.status);
  }
  console.error(err);
  return c.json({ message: "Internal server error" }, 500);
});

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/uploads/*", async (c) => {
  const relative = c.req.path.replace(/^\/uploads\//, "");
  const file = Bun.file(join(env.uploadsDir, relative));
  if (!(await file.exists())) return c.notFound();
  return new Response(file);
});

app.route("/api/auth", authRoutes);
app.route("/api/stores", storeRoutes);
app.route("/api/members", memberRoutes);
app.route("/api/invites", inviteRoutes);
app.route("/api/stores", catalogRoutes);
app.route("/api/stores", customerRoutes);
app.route("/api/stores", discountRoutes);
app.route("/api/stores", inventoryRoutes);
app.route("/api/stores", orderRoutes);
app.route("/api/stores", syncRoutes);

console.log(`API listening on http://0.0.0.0:${env.port}`);

export default {
  port: env.port,
  fetch: app.fetch,
};
