import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { getStoreSettings } from "../middleware/store-access";

export type StoreFeatureFlag =
  | "promotions_enabled"
  | "reports_enabled"
  | "offline_sync_enabled";

const FLAG_MESSAGES: Record<StoreFeatureFlag, string> = {
  promotions_enabled: "Promotions are disabled for this store",
  reports_enabled: "Reports are disabled for this store",
  offline_sync_enabled: "Offline sync is disabled for this store",
};

export function isStoreFeatureEnabled(
  settings: Record<string, unknown>,
  flag: StoreFeatureFlag,
): boolean {
  const flags = settings.feature_flags as Record<string, boolean> | undefined;
  if (!flags || !(flag in flags)) return true;
  return flags[flag] !== false;
}

export async function assertStoreFeatureEnabled(
  storeId: string,
  flag: StoreFeatureFlag,
): Promise<void> {
  const settings = await getStoreSettings(storeId);
  if (!isStoreFeatureEnabled(settings, flag)) {
    throw new HTTPException(403, { message: FLAG_MESSAGES[flag] });
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
