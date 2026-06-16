import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { storeMembers, stores } from "../db/schema";
import { generateId } from "../lib/id";
import { DEFAULT_STORE_SETTINGS } from "../lib/types";
import { nowIso } from "../lib/timestamps";

export async function createStoreWithOwner(
  data: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
  },
  ownerId: string,
) {
  const now = nowIso();
  const storeId = generateId();
  const memberId = generateId();

  await db.insert(stores).values({
    id: storeId,
    name: data.name,
    slug: data.slug,
    address: data.address ?? "",
    phone: data.phone ?? "",
    taxId: "",
    logo: "",
    settings: { ...DEFAULT_STORE_SETTINGS },
    owner: ownerId,
    isActive: true,
    created: now,
    updated: now,
  });

  await db.insert(storeMembers).values({
    id: memberId,
    store: storeId,
    user: ownerId,
    role: "owner",
    isActive: true,
    created: now,
    updated: now,
  });

  const row = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  return row[0]!;
}
