import { Hono } from "hono";
import {
  authMiddleware,
  type AuthVariables,
} from "../middleware/auth";
import {
  requireStoreMember,
  type StoreAccessVariables,
} from "../middleware/store-access";
import { buildStoreReports, reportsDataToCsv } from "../lib/reports";

type Vars = AuthVariables & StoreAccessVariables;

export const reportRoutes = new Hono<{ Variables: Vars }>();

reportRoutes.get(
  "/:storeId/reports",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const since = c.req.query("since");
    const until = c.req.query("until") ?? new Date().toISOString();
    const period = (c.req.query("period") ?? "today") as
      | "today"
      | "week"
      | "month"
      | "custom";

    if (!since) {
      return c.json({ message: "since query parameter is required" }, 400);
    }

    const data = await buildStoreReports(storeId, { since, until }, period);
    return c.json(data);
  },
);

reportRoutes.get(
  "/:storeId/reports/export.csv",
  authMiddleware,
  requireStoreMember,
  async (c) => {
    const storeId = c.req.param("storeId");
    const since = c.req.query("since");
    const until = c.req.query("until") ?? new Date().toISOString();
    const period = (c.req.query("period") ?? "today") as
      | "today"
      | "week"
      | "month"
      | "custom";

    if (!since) {
      return c.json({ message: "since query parameter is required" }, 400);
    }

    const data = await buildStoreReports(storeId, { since, until }, period);
    const csv = reportsDataToCsv(data);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reports-export.csv"',
      },
    });
  },
);
