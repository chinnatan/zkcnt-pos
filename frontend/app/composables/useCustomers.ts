import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Customer } from "~/lib/types";

export function useCustomers() {
  const { $pb } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  const customers = ref<Customer[]>([]);
  const isLoading = ref(false);

  async function fetchCustomers() {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const records = await $pb.collection("customers").getFullList({
          filter: `store = "${activeStoreId.value}"`,
          sort: "name",
        });
        customers.value = records as unknown as Customer[];
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
      const record = await $pb.collection("customers").create(customerData);
      await db.customers.put(record);
      await fetchCustomers();
      return record;
    } else {
      const tempId = `temp_${Date.now()}`;
      const now = new Date().toISOString();
      const localRecord = { ...customerData, id: tempId, created: now, updated: now };
      await db.customers.put(localRecord);
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
      const record = await $pb.collection("customers").update(id, data);
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
      await $pb.collection("customers").delete(id);
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
