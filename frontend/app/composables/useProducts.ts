import { db } from "~/lib/db";
import {
  addToFileUploadQueue,
  deleteAllBlobsForRecord,
  deleteFileBlob,
  storeFileBlob,
} from "~/lib/files/blobs";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Product, Category } from "~/lib/types";

export type ProductInput = Partial<Product> & {
  imageFile?: File | null;
  removeImage?: boolean;
};

export interface BulkCreateResult {
  created: Product[];
  skipped: { index: number; sku: string; reason: string }[];
  failed: { index: number; message: string }[];
}

export class CategoryHasProductsError extends Error {
  count: number;

  constructor(count: number) {
    super("category_has_products");
    this.name = "CategoryHasProductsError";
    this.count = count;
  }
}

interface BulkCreateApiResponse {
  created: Product[];
  skipped: { index: number; sku: string; reason: string }[];
  errors: { index: number; message: string }[];
}

function buildProductBody(data: ProductInput): Record<string, unknown> | FormData {
  const { imageFile, removeImage, ...rest } = data;
  if (!imageFile && !removeImage) return rest;

  const form = new FormData();
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") {
      form.append(key, value ? "true" : "false");
    } else {
      form.append(key, String(value));
    }
  }
  if (imageFile) form.append("image", imageFile);
  else if (removeImage) form.append("image", "");
  return form;
}

async function queueOfflineImageUpload(
  storeId: string,
  recordId: string,
  imageFile: File | null | undefined,
  removeImage: boolean | undefined,
): Promise<void> {
  if (removeImage) {
    await addToFileUploadQueue({
      store: storeId,
      collection: "products",
      record_id: recordId,
      field: "image",
      blob_id: "",
      remove: true,
    });
    return;
  }

  if (!imageFile) return;

  const blobId = await storeFileBlob(
    "products",
    recordId,
    "image",
    storeId,
    imageFile,
    imageFile.type,
  );

  await addToFileUploadQueue({
    store: storeId,
    collection: "products",
    record_id: recordId,
    field: "image",
    blob_id: blobId,
    remove: false,
  });
}

export function useProducts() {
  const { $api } = useNuxtApp();
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
        const records = await $api.send<Product[]>(
          `/stores/${activeStoreId.value}/products`,
        );
        products.value = records;
        await db.products.bulkPut(records);
      } else {
        const local = await db.products
          .where("store")
          .equals(activeStoreId.value)
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
        const records = await $api.send<Category[]>(
          `/stores/${activeStoreId.value}/categories`,
        );
        categories.value = records;
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

  async function createProduct(data: ProductInput) {
    if (!activeStoreId.value) throw new Error("No active store");

    const { imageFile, ...fields } = data;
    const productData = { ...fields, store: activeStoreId.value };
    const body = buildProductBody(data);

    if (isOnline.value) {
      const record = await $api.send<Product>(
        `/stores/${activeStoreId.value}/products`,
        { method: "POST", body },
      );
      await db.products.put(record);
      await fetchProducts();
      return record;
    }

    if (imageFile) {
      const tempId = `temp_${Date.now()}`;
      const localRecord = {
        ...productData,
        id: tempId,
        image: "",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      await db.products.put(localRecord as Product);
      await storeFileBlob(
        "products",
        tempId,
        "image",
        activeStoreId.value,
        imageFile,
        imageFile.type,
      );
      await addToSyncQueue({
        collection: "products",
        action: "create",
        record_id: tempId,
        data: productData,
        store: activeStoreId.value,
      });
      await addToFileUploadQueue({
        store: activeStoreId.value,
        collection: "products",
        record_id: tempId,
        field: "image",
        blob_id: `products/${tempId}/image`,
        remove: false,
      });
      await fetchProducts();
      return localRecord;
    }

    const tempId = `temp_${Date.now()}`;
    const localRecord = {
      ...productData,
      id: tempId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    await db.products.put(localRecord as Product);
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

  async function updateProduct(id: string, data: ProductInput) {
    const { imageFile, removeImage, ...fields } = data;
    const body = buildProductBody(data);

    if (isOnline.value) {
      const record = await $api.send<Product>(
        `/stores/${activeStoreId.value}/products/${id}`,
        { method: "PATCH", body },
      );
      await db.products.put(record);
      await fetchProducts();
      return record;
    }

    const hasImageChange = imageFile || removeImage;
    await db.products.update(id, {
      ...fields,
      ...(removeImage ? { image: "" } : {}),
      updated: new Date().toISOString(),
    });

    if (hasImageChange && activeStoreId.value) {
      if (removeImage) {
        await deleteFileBlob("products", id, "image");
      }
      await queueOfflineImageUpload(
        activeStoreId.value,
        id,
        imageFile,
        removeImage,
      );
    }

    if (!hasImageChange) {
      await addToSyncQueue({
        collection: "products",
        action: "update",
        record_id: id,
        data: fields,
        store: activeStoreId.value!,
      });
    } else {
      const { imageFile: _f, removeImage: _r, ...syncFields } = data;
      await addToSyncQueue({
        collection: "products",
        action: "update",
        record_id: id,
        data: syncFields,
        store: activeStoreId.value!,
      });
    }

    await fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (isOnline.value) {
      await $api.send(`/stores/${activeStoreId.value}/products/${id}`, {
        method: "DELETE",
      });
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
    await deleteAllBlobsForRecord("products", id);
    await fetchProducts();
  }

  async function createCategory(data: Partial<Category>) {
    if (!activeStoreId.value) throw new Error("No active store");

    const catData = { ...data, store: activeStoreId.value };

    if (isOnline.value) {
      const record = await $api.send<Category>(
        `/stores/${activeStoreId.value}/categories`,
        { method: "POST", body: catData },
      );
      await db.categories.put(record);
      await fetchCategories();
      return record;
    }

    const tempId = `temp_${Date.now()}`;
    const localRecord = {
      ...catData,
      id: tempId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    await db.categories.put(localRecord as Category);
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

  async function updateCategory(id: string, data: Partial<Category>) {
    if (isOnline.value) {
      const record = await $api.send<Category>(
        `/stores/${activeStoreId.value}/categories/${id}`,
        { method: "PATCH", body: data },
      );
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

  async function countProductsInCategory(categoryId: string): Promise<number> {
    if (!activeStoreId.value) return 0;
    return db.products
      .where("store")
      .equals(activeStoreId.value)
      .filter((p) => p.category === categoryId)
      .count();
  }

  async function deleteCategory(id: string) {
    const productCount = await countProductsInCategory(id);
    if (productCount > 0) {
      throw new CategoryHasProductsError(productCount);
    }

    if (isOnline.value) {
      try {
        await $api.send(`/stores/${activeStoreId.value}/categories/${id}`, {
          method: "DELETE",
        });
        await db.categories.delete(id);
      } catch (err) {
        if (err instanceof Error && err.message === "category_has_products") {
          const count = await countProductsInCategory(id);
          throw new CategoryHasProductsError(count || 1);
        }
        throw err;
      }
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

  async function bulkCreateProducts(items: ProductInput[]): Promise<BulkCreateResult> {
    if (!activeStoreId.value) throw new Error("No active store");
    const storeId = activeStoreId.value;

    if (isOnline.value) {
      const payload = items.map(({ imageFile: _i, removeImage: _r, ...rest }) => ({
        ...rest,
        store: storeId,
      }));

      const result = await $api.send<BulkCreateApiResponse>(
        `/stores/${storeId}/products/bulk`,
        { method: "POST", body: { items: payload } },
      );

      if (result.created.length > 0) {
        await db.products.bulkPut(result.created);
      }
      await fetchProducts();

      return {
        created: result.created,
        skipped: result.skipped,
        failed: result.errors,
      };
    }

    const created: Product[] = [];
    const skipped: BulkCreateResult["skipped"] = [];
    const failed: BulkCreateResult["failed"] = [];

    for (let index = 0; index < items.length; index++) {
      try {
        const record = await createProduct({ ...items[index]!, store: storeId });
        created.push(record as Product);
      } catch (e) {
        failed.push({
          index,
          message: e instanceof Error ? e.message : "unknown_error",
        });
      }
    }

    return { created, skipped, failed };
  }

  return {
    products: readonly(products),
    categories: readonly(categories),
    isLoading: readonly(isLoading),
    fetchProducts,
    fetchCategories,
    createProduct,
    bulkCreateProducts,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
