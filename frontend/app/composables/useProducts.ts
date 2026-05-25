import { db } from "~/lib/db";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Product, Category } from "~/lib/types";

export function useProducts() {
  const { $pb } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  const products = ref<Product[]>([]);
  const categories = ref<Category[]>([]);
  const isLoading = ref(false);

  async function fetchProducts() {
    if (!activeStoreId.value) return;
    isLoading.value = true;
    try {
      if (isOnline.value) {
        const records = await $pb.collection("products").getFullList({
          filter: `store = "${activeStoreId.value}"`,
          sort: "name",
        });
        products.value = records as unknown as Product[];
        await db.products.bulkPut(records);
      } else {
        const local = await db.products
          .where("[store+is_active]")
          .equals([activeStoreId.value, 1])
          .toArray();
        products.value = local as Product[];
      }
    } catch {
      const local = await db.products
        .where("store")
        .equals(activeStoreId.value)
        .toArray();
      products.value = local as Product[];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCategories() {
    if (!activeStoreId.value) return;
    try {
      if (isOnline.value) {
        const records = await $pb.collection("categories").getFullList({
          filter: `store = "${activeStoreId.value}"`,
          sort: "sort_order,name",
        });
        categories.value = records as unknown as Category[];
        await db.categories.bulkPut(records);
      } else {
        const local = await db.categories
          .where("store")
          .equals(activeStoreId.value)
          .toArray();
        categories.value = local as Category[];
      }
    } catch {
      const local = await db.categories
        .where("store")
        .equals(activeStoreId.value)
        .toArray();
      categories.value = local as Category[];
    }
  }

  async function createProduct(data: Partial<Product>) {
    if (!activeStoreId.value) throw new Error("No active store");

    const productData = { ...data, store: activeStoreId.value };

    if (isOnline.value) {
      const record = await $pb.collection("products").create(productData);
      await db.products.put(record);
      await fetchProducts();
      return record;
    } else {
      const tempId = `temp_${Date.now()}`;
      const localRecord = { ...productData, id: tempId, created: new Date().toISOString(), updated: new Date().toISOString() };
      await db.products.put(localRecord);
      await addToSyncQueue({
        collection: "products",
        action: "create",
        record_id: tempId,
        data: productData,
        store: activeStoreId.value,
      });
      await fetchProducts();
      return localRecord;
    }
  }

  async function updateProduct(id: string, data: Partial<Product>) {
    if (isOnline.value) {
      const record = await $pb.collection("products").update(id, data);
      await db.products.put(record);
      await fetchProducts();
      return record;
    } else {
      await db.products.update(id, { ...data, updated: new Date().toISOString() });
      await addToSyncQueue({
        collection: "products",
        action: "update",
        record_id: id,
        data,
        store: activeStoreId.value!,
      });
      await fetchProducts();
    }
  }

  async function deleteProduct(id: string) {
    if (isOnline.value) {
      await $pb.collection("products").delete(id);
      await db.products.delete(id);
    } else {
      await db.products.delete(id);
      await addToSyncQueue({
        collection: "products",
        action: "delete",
        record_id: id,
        data: {},
        store: activeStoreId.value!,
      });
    }
    await fetchProducts();
  }

  async function createCategory(data: Partial<Category>) {
    if (!activeStoreId.value) throw new Error("No active store");

    const catData = { ...data, store: activeStoreId.value };

    if (isOnline.value) {
      const record = await $pb.collection("categories").create(catData);
      await db.categories.put(record);
      await fetchCategories();
      return record;
    } else {
      const tempId = `temp_${Date.now()}`;
      const localRecord = { ...catData, id: tempId, created: new Date().toISOString(), updated: new Date().toISOString() };
      await db.categories.put(localRecord);
      await addToSyncQueue({
        collection: "categories",
        action: "create",
        record_id: tempId,
        data: catData,
        store: activeStoreId.value,
      });
      await fetchCategories();
      return localRecord;
    }
  }

  async function updateCategory(id: string, data: Partial<Category>) {
    if (isOnline.value) {
      const record = await $pb.collection("categories").update(id, data);
      await db.categories.put(record);
    } else {
      await db.categories.update(id, data);
      await addToSyncQueue({
        collection: "categories",
        action: "update",
        record_id: id,
        data,
        store: activeStoreId.value!,
      });
    }
    await fetchCategories();
  }

  async function deleteCategory(id: string) {
    if (isOnline.value) {
      await $pb.collection("categories").delete(id);
      await db.categories.delete(id);
    } else {
      await db.categories.delete(id);
      await addToSyncQueue({
        collection: "categories",
        action: "delete",
        record_id: id,
        data: {},
        store: activeStoreId.value!,
      });
    }
    await fetchCategories();
  }

  return {
    products: readonly(products),
    categories: readonly(categories),
    isLoading: readonly(isLoading),
    fetchProducts,
    fetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
