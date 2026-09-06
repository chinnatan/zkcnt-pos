import type { StoreFeatureFlag } from "~/lib/feature-flags";
import { isStoreFeatureEnabled } from "~/lib/feature-flags";

export function useStoreFeatureEnabled(flag: StoreFeatureFlag) {
  const { activeStore } = useStore();
  return computed(() => isStoreFeatureEnabled(activeStore.value?.settings, flag));
}
