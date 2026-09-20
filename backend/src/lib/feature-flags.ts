import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { getStoreSettings } from "../middleware/store-access";

export const STORE_FEATURE_FLAGS = [
  { key: "promotions_enabled", default: true, message: "Promotions are disabled for this store" },
  { key: "reports_enabled", default: true, message: "Reports are disabled for this store" },
  { key: "offline_sync_enabled", default: true, message: "Offline sync is disabled for this store" },
  { key: "customers_enabled", default: false, message: "Customers are disabled for this store" },
] as const;

export type StoreFeatureFlag = (typeof STORE_FEATURE_FLAGS)[number]["key"];

function getFlag(flag: StoreFeatureFlag) {
  return STORE_FEATURE_FLAGS.find((item) => item.key === flag)!;
}

export function isStoreFeatureEnabled(
  settings: Record<string, unknown>,
  flag: StoreFeatureFlag,
): boolean {
  const flags = settings.feature_flags as Record<string, boolean> | undefined;
  return flags?.[flag] ?? getFlag(flag).default;
}

export async function assertStoreFeatureEnabled(
  storeId: string,
  flag: StoreFeatureFlag,
): Promise<void> {
  const settings = await getStoreSettings(storeId);
  if (!isStoreFeatureEnabled(settings, flag)) {
    throw new HTTPException(403, { message: getFlag(flag).message });
  }
}

export function requireStoreFeature(flag: StoreFeatureFlag) {
  return createMiddleware(async (c, next) => {
    const storeId = c.req.param("storeId");
    if (!storeId) {
      throw new HTTPException(400, { message: "storeId required" });
    }
    await assertStoreFeatureEnabled(storeId, flag);
    await next();
  });
}
