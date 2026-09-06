export type StoreFeatureFlag =
  | "promotions_enabled"
  | "reports_enabled"
  | "offline_sync_enabled";

export function isStoreFeatureEnabled(
  settings: { feature_flags?: Record<string, boolean> } | undefined,
  flag: StoreFeatureFlag,
): boolean {
  const flags = settings?.feature_flags;
  if (!flags || !(flag in flags)) return true;
  return flags[flag] !== false;
}
