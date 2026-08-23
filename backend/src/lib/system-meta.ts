import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { systemMeta } from "../db/schema";
import { nowIso } from "./timestamps";

export async function getSystemMeta(key: string): Promise<string | null> {
  const rows = await db
    .select({ value: systemMeta.value })
    .from(systemMeta)
    .where(eq(systemMeta.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setSystemMeta(key: string, value: string): Promise<void> {
  const now = nowIso();
  const existing = await getSystemMeta(key);
  if (existing === null) {
    await db.insert(systemMeta).values({ key, value, updated: now });
    return;
  }
  await db
    .update(systemMeta)
    .set({ value, updated: now })
    .where(eq(systemMeta.key, key));
}

export async function getSystemMetaJson<T>(key: string): Promise<T | null> {
  const raw = await getSystemMeta(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setSystemMetaJson(key: string, value: unknown): Promise<void> {
  await setSystemMeta(key, JSON.stringify(value));
}
