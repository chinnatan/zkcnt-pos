import { SyncEngine } from "~/lib/sync/engine";
import { getPendingCount } from "~/lib/sync/queue";

let syncEngine: SyncEngine | null = null;
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

    if (isOnline.value) {
      performSync();
    }
  }

  async function performSync() {
    if (!syncEngine || !isOnline.value) return;
    isSyncing.value = true;
    try {
      const since = lastSyncAt.value ?? "1970-01-01T00:00:00.000Z";
      await syncEngine.drainSyncQueue();
      await syncEngine.drainFileQueue();
      await syncEngine.pullAll(since);
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

  watch(isOnline, (online) => {
    if (online && syncEngine) {
      performSync();
    }
  });

  watch(activeStoreId, () => {
    initSync();
  });

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
