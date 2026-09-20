export const STORE_FEATURE_FLAGS = [
  { key: "promotions_enabled", default: true, labelKey: "admin.featureFlags.promotions" },
  { key: "reports_enabled", default: true, labelKey: "admin.featureFlags.reports" },
  { key: "offline_sync_enabled", default: true, labelKey: "admin.featureFlags.offlineSync" },
  { key: "customers_enabled", default: false, labelKey: "admin.featureFlags.customers" },
] as const;

export type StoreFeatureFlag = (typeof STORE_FEATURE_FLAGS)[number]["key"];

function getFlag(flag: StoreFeatureFlag) {
  return STORE_FEATURE_FLAGS.find((item) => item.key === flag)!;
}

export function isStoreFeatureEnabled(
  settings: { feature_flags?: Record<string, boolean> } | undefined,
  flag: StoreFeatureFlag,
): boolean {
  const flags = settings?.feature_flags;
  return flags?.[flag] ?? getFlag(flag).default;
}
