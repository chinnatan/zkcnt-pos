import { SyncEngine } from "~/lib/sync/engine";
import { getPendingCount } from "~/lib/sync/queue";
import { createLogger } from "~/lib/logger";

const logger = createLogger("use-sync");

let syncEngine: SyncEngine | null = null;
let syncWatchesInitialized = false;
const pendingSyncCount = ref(0);
const isSyncing = ref(false);
const lastSyncAt = ref<string | null>(null);

export function useSync() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  function initSync() {
    if (!activeStoreId.value) return;

    syncEngine = new SyncEngine($api, activeStoreId.value);
    void updatePendingCount();

    if (isOnline.value) {
      performSync();
    }
  }

  async function performSync() {
    if (!syncEngine || !isOnline.value) return;
    isSyncing.value = true;
    logger.info(`sync start storeId=${activeStoreId.value ?? "none"}`);
    try {
      const since = lastSyncAt.value ?? "1970-01-01T00:00:00.000Z";
      await syncEngine.drainSyncQueue();
      await syncEngine.drainFileQueue();
      await syncEngine.pullAll(since);
      await syncEngine.prefetchProductImages();
      lastSyncAt.value = new Date().toISOString();
      logger.info(`sync complete storeId=${activeStoreId.value ?? "none"}`);
    } finally {
      isSyncing.value = false;
      await updatePendingCount();
    }
  }

  async function updatePendingCount() {
    pendingSyncCount.value = await getPendingCount(activeStoreId.value ?? undefined);
  }

  if (import.meta.client && !syncWatchesInitialized) {
    syncWatchesInitialized = true;

    watch(isOnline, (online) => {
      logger.debug(`online status changed online=${online}`);
      if (online && syncEngine) {
        performSync();
      }
    });

    watch(
      activeStoreId,
      (id) => {
        if (id) initSync();
      },
      { immediate: true },
    );
  }

  function cleanup() {
    syncEngine = null;
  }

  return {
    pendingSyncCount: readonly(pendingSyncCount),
    isSyncing: readonly(isSyncing),
    lastSyncAt: readonly(lastSyncAt),
    initSync,
    performSync,
    updatePendingCount,
    cleanup,
  };
}
