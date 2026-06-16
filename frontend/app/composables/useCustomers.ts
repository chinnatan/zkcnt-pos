import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Customer } from "~/lib/types";

export function useCustomers() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  const customers = ref<Customer[]>([]);
  const isLoading = ref(false);

  async function fetchCustomers() {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const records = await $api.send<Customer[]>(
          `/stores/${activeStoreId.value}/customers`,
        );
        customers.value = records;
        await db.customers.bulkPut(records);
      } else {
        const local = await db.customers
          .where("store")
          .equals(activeStoreId.value)
          .toArray();
        customers.value = local as Customer[];
      }
    } catch {
      const local = await db.customers
        .where("store")
        .equals(activeStoreId.value)
        .toArray();
      customers.value = local as Customer[];
    } finally {
      isLoading.value = false;
    }
  }

  async function createCustomer(data: Partial<Customer>) {
    if (!activeStoreId.value) throw new Error("No active store");

    const customerData = { ...data, store: activeStoreId.value, total_spent: 0, visit_count: 0 };

    if (isOnline.value) {
      const record = await $api.send<Customer>(
        `/stores/${activeStoreId.value}/customers`,
        { method: "POST", body: customerData },
      );
      await db.customers.put(record);
      await fetchCustomers();
      return record;
    } else {
      const tempId = `temp_${Date.now()}`;
      const now = new Date().toISOString();
      const localRecord = { ...customerData, id: tempId, created: now, updated: now };
      await db.customers.put(localRecord as Customer);
      await addToSyncQueue({
        collection: "customers",
        action: "create",
        record_id: tempId,
        data: customerData,
        store: activeStoreId.value,
      });
      await fetchCustomers();
      return localRecord;
    }
  }

  async function updateCustomer(id: string, data: Partial<Customer>) {
    if (isOnline.value) {
      const record = await $api.send<Customer>(
        `/stores/${activeStoreId.value}/customers/${id}`,
        { method: "PATCH", body: data },
      );
      await db.customers.put(record);
    } else {
      await db.customers.update(id, { ...data, updated: new Date().toISOString() });
      await addToSyncQueue({
        collection: "customers",
        action: "update",
        record_id: id,
        data,
        store: activeStoreId.value!,
      });
    }
    await fetchCustomers();
  }

  async function deleteCustomer(id: string) {
    if (isOnline.value) {
      await $api.send(`/stores/${activeStoreId.value}/customers/${id}`, {
        method: "DELETE",
      });
      await db.customers.delete(id);
    } else {
      await db.customers.delete(id);
      await addToSyncQueue({
        collection: "customers",
        action: "delete",
        record_id: id,
        data: {},
        store: activeStoreId.value!,
      });
    }
    await fetchCustomers();
  }

  return {
    customers: readonly(customers),
    isLoading: readonly(isLoading),
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
