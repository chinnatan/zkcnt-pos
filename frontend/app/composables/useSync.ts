import { SyncEngine } from "~/lib/sync/engine";
import { getPendingCount } from "~/lib/sync/queue";

let syncEngine: SyncEngine | null = null;
const pendingSyncCount = ref(0);
const isSyncing = ref(false);
const lastSyncAt = ref<string | null>(null);

export function useSync() {
  const { $pb } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  function initSync() {
    if (!activeStoreId.value) return;

    // Clean up previous instance
    if (syncEngine) {
      syncEngine.unsubscribeAll();
    }

    syncEngine = new SyncEngine($pb, activeStoreId.value);

    if (isOnline.value) {
      syncEngine.subscribeAll();
      performSync();
    }
  }

  async function performSync() {
    if (!syncEngine || !isOnline.value) return;
    isSyncing.value = true;
    try {
      // Push local changes first
      await syncEngine.drainSyncQueue();
      await syncEngine.drainFileQueue();
      // Then pull remote changes
      await syncEngine.pullAll();
      await syncEngine.prefetchProductImages();
      lastSyncAt.value = new Date().toISOString();
    } finally {
      isSyncing.value = false;
      await updatePendingCount();
    }
  }

  async function updatePendingCount() {
    pendingSyncCount.value = await getPendingCount(activeStoreId.value ?? undefined);
  }

  // Watch online status to trigger sync
  watch(isOnline, (online) => {
    if (online && syncEngine) {
      syncEngine.subscribeAll();
      performSync();
    } else if (!online && syncEngine) {
      syncEngine.unsubscribeAll();
    }
  });

  // Watch store change
  watch(activeStoreId, () => {
    initSync();
  });

  function cleanup() {
    if (syncEngine) {
      syncEngine.unsubscribeAll();
      syncEngine = null;
    }
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
