import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { getRuntimeConfig } from "../env";
import { nowIso } from "./timestamps";

export async function maybePromotePlatformAdmin(
  userId: string,
  email: string,
): Promise<void> {
  const adminEmail = getRuntimeConfig().platformAdminEmail;
  if (!adminEmail || email.toLowerCase() !== adminEmail) {
    return;
  }

  await db
    .update(users)
    .set({ isPlatformAdmin: true, updated: nowIso() })
    .where(eq(users.id, userId));
}

export async function loadUserById(userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}
