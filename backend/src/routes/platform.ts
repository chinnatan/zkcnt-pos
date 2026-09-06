import { Hono } from "hono";
import {
  getPlatformAnnouncement,
  resolveActiveAnnouncement,
} from "../services/announcements.service";

export const platformRoutes = new Hono();

platformRoutes.get("/announcement", async (c) => {
  const announcement = await getPlatformAnnouncement();
  const active = resolveActiveAnnouncement(announcement);
  return c.json({ announcement: active });
});
