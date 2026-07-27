import {
  applyTransactionHistoryClearFromStore,
  purgeLocalTransactionalData,
  setTxnClearAck,
} from "~/lib/sync/purge-transactional";
import { getPendingItems } from "~/lib/sync/queue";
import { db } from "~/lib/db";
import type { Store } from "~/lib/types";

export type ClearHistoryMode = "all" | "filtered" | "orders";
export type ClearHistoryScope =
  | "orders"
  | "inventory_transactions"
  | "audit_events"
  | "customers";

export interface ClearTransactionHistoryResult {
  success: boolean;
  mode: ClearHistoryMode;
  orders: number;
  order_items: number;
  promotion_usages: number;
  inventory_transactions: number;
  audit_events: number;
  customers_reset: number;
  customers_deleted: number;
  transaction_history_cleared_at: string;
}

export interface ClearTransactionHistoryOptions {
  confirmSlug: string;
  mode: ClearHistoryMode;
  scopes?: ClearHistoryScope[];
  since?: string;
  until?: string;
  deleteCustomers?: boolean;
  orderIds?: string[];
}

export function useStoreDataPurge() {
  const { $api } = useNuxtApp();
  const { activeStore, activeStoreId, setActiveStore } = useStore();
  const { performSync, resetLastSyncAt } = useSync();

  const isPurging = ref(false);
  const purgeError = ref<string | null>(null);

  async function clearTransactionHistory(
    options: ClearTransactionHistoryOptions,
  ): Promise<ClearTransactionHistoryResult> {
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
        mode: options.mode,
        scopes: options.scopes,
        since: options.since,
        until: options.until,
        delete_customers: options.deleteCustomers,
        order_ids: options.orderIds,
      });

      await purgeLocalTransactionalData(storeId, {
        deleteCustomers: result.customers_deleted > 0,
        resetCustomerStats: result.customers_reset > 0,
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

      resetLastSyncAt();
      await performSync({ forceFullPull: true });

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
