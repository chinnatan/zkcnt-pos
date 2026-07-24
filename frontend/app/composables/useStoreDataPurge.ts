import {
  applyTransactionHistoryClearFromStore,
  purgeLocalTransactionalData,
  setTxnClearAck,
} from "~/lib/sync/purge-transactional";
import { getPendingItems } from "~/lib/sync/queue";
import { db } from "~/lib/db";
import type { Store } from "~/lib/types";

export interface ClearTransactionHistoryResult {
  success: boolean;
  orders: number;
  order_items: number;
  promotion_usages: number;
  inventory_transactions: number;
  audit_events: number;
  customers_reset: number;
  customers_deleted: number;
  transaction_history_cleared_at: string;
}

export function useStoreDataPurge() {
  const { $api } = useNuxtApp();
  const { activeStore, activeStoreId, setActiveStore } = useStore();

  const isPurging = ref(false);
  const purgeError = ref<string | null>(null);

  async function clearTransactionHistory(options: {
    confirmSlug: string;
    deleteCustomers: boolean;
  }): Promise<ClearTransactionHistoryResult> {
    const storeId = activeStoreId.value;
    const store = activeStore.value;
    if (!storeId || !store) {
      throw new Error("No active store");
    }

    const pending = await getPendingItems(storeId);
    const hasTransactionalPending = pending.some((item) =>
      ["orders", "order_items", "inventory_transactions", "promotion_usages"].includes(
        item.collection,
      ),
    );
    if (hasTransactionalPending) {
      throw new Error("errors.syncPendingBeforePurge");
    }

    isPurging.value = true;
    purgeError.value = null;

    try {
      const result = await $api.clearTransactionHistory(storeId, {
        confirm_slug: options.confirmSlug,
        delete_customers: options.deleteCustomers,
      });

      await purgeLocalTransactionalData(storeId, {
        deleteCustomers: options.deleteCustomers,
      });
      setTxnClearAck(storeId, result.transaction_history_cleared_at);

      const nextStore: Store = {
        ...store,
        updated: result.transaction_history_cleared_at,
        settings: {
          ...store.settings,
          transaction_history_cleared_at: result.transaction_history_cleared_at,
        },
      };
      await db.stores.put(nextStore);
      await setActiveStore(nextStore);

      return result;
    } catch (e: unknown) {
      purgeError.value = e instanceof Error ? e.message : "errors.purgeFailed";
      throw e;
    } finally {
      isPurging.value = false;
    }
  }

  return {
    isPurging: readonly(isPurging),
    purgeError: readonly(purgeError),
    clearTransactionHistory,
  };
}

export { applyTransactionHistoryClearFromStore };
