<script setup lang="ts">
import { validateProductImage } from "~/lib/files/constants";
import type { Product, Category } from "~/lib/types";
import { CategoryHasProductsError } from "~/composables/useProducts";
import { activeBadge } from "~/lib/ui/statusColors";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { alert } = useDialog();
const { products, categories, fetchProducts, fetchCategories, createProduct, updateProduct, deleteProduct, createCategory, updateCategory, deleteCategory, isLoading } = useProducts();
const { inventoryItems, fetchInventory, adjustStock } = useInventory();
const { activeStoreId } = useStore();
const { isOnline } = useOnlineStatus();
const { getFileUrl } = useFileUrl();

const searchQuery = ref("");
const selectedCategoryId = ref<string | null>(null);
const activeTab = ref<"products" | "categories">("products");

const showProductModal = ref(false);
const showBulkAddModal = ref(false);
const showImportExportModal = ref(false);
const editingProduct = ref<Product | null>(null);
const showDeleteConfirm = ref(false);
const deletingProduct = ref<Product | null>(null);

const showCategoryModal = ref(false);
const editingCategory = ref<Category | null>(null);
const showDeleteCategoryConfirm = ref(false);
const deletingCategory = ref<Category | null>(null);

const productForm = ref({
  name: "",
  sku: "",
  barcode: "",
  price: 0,
  cost: 0,
  category: "",
  unit: "",
  track_inventory: false,
  is_active: true,
  description: "",
});

const categoryForm = ref({
  name: "",
  description: "",
  sort_order: 0,
  is_active: true,
});

const imageFile = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const removeImage = ref(false);
const imageError = ref<string | null>(null);
const isSavingProduct = ref(false);
const initialQuantity = ref<number | null>(null);
const addStockQuantity = ref<number | null>(null);

const currentStockQty = computed(() => {
  if (!editingProduct.value) return 0;
  const inv = inventoryItems.value.find((i) => i.product === editingProduct.value!.id);
  return inv?.quantity ?? 0;
});

function resetStockFields() {
  initialQuantity.value = null;
  addStockQuantity.value = null;
}

function clearImageState() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = null;
  imagePreview.value = null;
  removeImage.value = false;
  imageError.value = null;
}

function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const errorKey = validateProductImage(file);
  if (errorKey) {
    imageError.value = errorKey;
    input.value = "";
    return;
  }

  imageError.value = null;
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
  removeImage.value = false;
}

function handleRemoveImage() {
  clearImageState();
  removeImage.value = true;
}

const existingImageUrl = computed(() => {
  if (!editingProduct.value?.image || removeImage.value || imagePreview.value) return null;
  return getFileUrl(editingProduct.value, editingProduct.value.image);
});

const filteredProducts = computed(() => {
  let result = products.value ?? [];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)),
    );
  }
  if (selectedCategoryId.value) {
    result = result.filter((p) => p.category === selectedCategoryId.value);
  }
  return result;
});

function getCategoryName(categoryId: string): string {
  const cat = (categories.value ?? []).find((c) => c.id === categoryId);
  return cat ? cat.name : "-";
}

function getCategoryProductCount(categoryId: string): number {
  return (products.value ?? []).filter((p) => p.category === categoryId).length;
}

function categoryDeleteBlockedMessage(category: Category, count: number): string {
  return t("productsPage.cannotDeleteCategoryDesc", { name: category.name, count });
}

function openAddProduct() {
  editingProduct.value = null;
  clearImageState();
  resetStockFields();
  productForm.value = {
    name: "",
    sku: "",
    barcode: "",
    price: 0,
    cost: 0,
    category: "",
    unit: "",
    track_inventory: false,
    is_active: true,
    description: "",
  };
  showProductModal.value = true;
}

async function openEditProduct(product: Product) {
  editingProduct.value = product;
  clearImageState();
  resetStockFields();
  if (product.track_inventory) {
    await fetchInventory();
  }
  productForm.value = {
    name: product.name,
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    price: product.price,
    cost: product.cost ?? 0,
    category: product.category ?? "",
    unit: product.unit ?? "",
    track_inventory: product.track_inventory ?? false,
    is_active: product.is_active ?? true,
    description: product.description ?? "",
  };
  showProductModal.value = true;
}

async function handleSaveProduct() {
  if (imageError.value || !activeStoreId.value) return;

  isSavingProduct.value = true;
  let stockAdjustFailed = false;
  try {
    const storeId = activeStoreId.value;
    const payload = {
      ...productForm.value,
      store: storeId,
      imageFile: imageFile.value,
      removeImage: removeImage.value,
    };

    let productId: string;
    if (editingProduct.value) {
      productId = editingProduct.value.id;
      await updateProduct(productId, payload);
    } else {
      const created = await createProduct(payload);
      productId = created.id;
    }

    const qty = editingProduct.value
      ? (addStockQuantity.value && addStockQuantity.value > 0 ? addStockQuantity.value : 0)
      : (initialQuantity.value && initialQuantity.value > 0 ? initialQuantity.value : 0);

    if (productForm.value.track_inventory && qty > 0) {
      try {
        await adjustStock(productId, "stock_in", qty, t("productsPage.initialStockNote"));
      } catch {
        stockAdjustFailed = true;
      }
    }

    showProductModal.value = false;
    clearImageState();
    resetStockFields();

    if (stockAdjustFailed) {
      await alert(t("productsPage.stockAdjustFailed"));
    }
  } finally {
    isSavingProduct.value = false;
  }
}

function confirmDeleteProduct(product: Product) {
  deletingProduct.value = product;
  showDeleteConfirm.value = true;
}

async function handleDeleteProduct() {
  if (deletingProduct.value) {
    await deleteProduct(deletingProduct.value.id);
  }
  showDeleteConfirm.value = false;
  deletingProduct.value = null;
}

function openAddCategory() {
  editingCategory.value = null;
  categoryForm.value = { name: "", description: "", sort_order: 0, is_active: true };
  showCategoryModal.value = true;
}

function openEditCategory(category: Category) {
  editingCategory.value = category;
  categoryForm.value = {
    name: category.name,
    description: category.description ?? "",
    sort_order: category.sort_order ?? 0,
    is_active: category.is_active ?? true,
  };
  showCategoryModal.value = true;
}

async function handleSaveCategory() {
  if (!activeStoreId.value) return;
  const storeId = activeStoreId.value;
  if (editingCategory.value) {
    await updateCategory(editingCategory.value.id, { ...categoryForm.value, store: storeId });
  } else {
    await createCategory({ ...categoryForm.value, store: storeId });
  }
  showCategoryModal.value = false;
}

async function confirmDeleteCategory(category: Category) {
  const count = getCategoryProductCount(category.id);
  if (count > 0) {
    await alert(categoryDeleteBlockedMessage(category, count), {
      title: t("productsPage.cannotDeleteCategory"),
    });
    return;
  }
  deletingCategory.value = category;
  showDeleteCategoryConfirm.value = true;
}

async function handleDeleteCategory() {
  if (!deletingCategory.value) return;
  const category = deletingCategory.value;
  try {
    await deleteCategory(category.id);
    showDeleteCategoryConfirm.value = false;
    deletingCategory.value = null;
  } catch (err) {
    showDeleteCategoryConfirm.value = false;
    const count = err instanceof CategoryHasProductsError
      ? err.count
      : getCategoryProductCount(category.id);
    await alert(categoryDeleteBlockedMessage(category, count), {
      title: t("productsPage.cannotDeleteCategory"),
    });
    deletingCategory.value = null;
  }
}

watch(
  activeStoreId,
  (id) => {
    if (id) {
      fetchProducts();
      fetchCategories();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
});
</script>

<template>
  <div class="min-h-screen bg-surface">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-ink">{{ t('productsPage.title') }}</h1>
          <p class="mt-1 text-sm text-ink-muted">{{ t('productsPage.subtitle') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="activeTab === 'products'"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            @click="openAddProduct"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            {{ t('productsPage.addProduct') }}
          </button>
          <button
            v-if="activeTab === 'products'"
            class="inline-flex items-center gap-2 rounded-lg border border-border-warm bg-paper px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            @click="showBulkAddModal = true"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            {{ t('productsPage.bulkAdd') }}
          </button>
          <button
            v-if="activeTab === 'products'"
            class="inline-flex items-center gap-2 rounded-lg border border-border-warm bg-paper px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            @click="showImportExportModal = true"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {{ t('productsPage.importExport') }}
          </button>
          <button
            v-else
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            @click="openAddCategory"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            {{ t('productsPage.addCategory') }}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-6 border-b border-border-warm">
        <nav class="-mb-px flex gap-6">
          <button
            class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition"
            :class="activeTab === 'products' ? 'border-primary-600 text-primary-600' : 'border-transparent text-ink-muted hover:border-border-warm hover:text-ink'"
            @click="activeTab = 'products'"
          >
            {{ t('nav.products') }}
            <span class="ml-2 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">{{ (products ?? []).length }}</span>
          </button>
          <button
            class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition"
            :class="activeTab === 'categories' ? 'border-primary-600 text-primary-600' : 'border-transparent text-ink-muted hover:border-border-warm hover:text-ink'"
            @click="activeTab = 'categories'"
          >
            {{ t('productsPage.categories') }}
            <span class="ml-2 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">{{ (categories ?? []).length }}</span>
          </button>
        </nav>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <!-- Products Tab -->
      <template v-else-if="activeTab === 'products'">
        <!-- Search & Filter -->
        <div class="mb-4 flex flex-col gap-3 sm:flex-row">
          <div class="relative flex-1">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('productsPage.searchPlaceholder')"
              class="w-full rounded-lg border border-border-warm bg-paper py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            v-model="selectedCategoryId"
            class="rounded-lg border border-border-warm bg-paper px-4 py-2.5 text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-56"
          >
            <option :value="null">{{ t('productsPage.allCategories') }}</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <!-- Desktop Table -->
        <div class="hidden overflow-hidden rounded-xl border border-border-warm bg-paper shadow-sm md:block">
          <table class="min-w-full divide-y divide-border-warm">
            <thead class="bg-surface">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('productsPage.productCol') }}</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('common.sku') }}</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('common.category') }}</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('common.price') }}</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('common.cost') }}</th>
                <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('common.status') }}</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('productsPage.manage') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-warm">
              <tr v-for="product in filteredProducts" :key="product.id" class="transition hover:bg-surface/80">
                <td class="whitespace-nowrap px-6 py-4">
                  <div class="flex items-center gap-3">
                    <ProductImage :product="product" size="sm" />
                    <div>
                      <div class="text-sm font-medium text-ink">{{ product.name }}</div>
                      <div v-if="product.barcode" class="text-xs text-ink-muted">{{ product.barcode }}</div>
                    </div>
                  </div>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-ink-muted">{{ product.sku || "-" }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-ink-muted">{{ getCategoryName(product.category) }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-ink">{{ formatCurrency(product.price) }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-right text-sm text-ink-muted">{{ formatCurrency(product.cost ?? 0) }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-center">
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="activeBadge(product.is_active)"
                  >
                    {{ product.is_active ? t('common.enabledShort') : t('common.disabledShort') }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface hover:text-primary-600"
                      :title="t('common.edit')"
                      @click="openEditProduct(product)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-ink-muted transition hover:bg-danger-50 hover:text-danger-500"
                      :title="t('common.delete')"
                      @click="confirmDeleteProduct(product)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredProducts.length === 0">
                <td colspan="7" class="px-6 py-16 text-center">
                  <svg class="mx-auto h-12 w-12 text-border-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  <p class="mt-3 text-sm font-medium text-ink-muted">{{ t('productsPage.noProducts') }}</p>
                  <p class="mt-1 text-xs text-ink-muted">{{ t('productsPage.noProductsHint') }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="flex flex-col gap-3 md:hidden">
          <div v-if="filteredProducts.length === 0" class="rounded-xl bg-paper p-8 text-center shadow-sm">
            <svg class="mx-auto h-12 w-12 text-border-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p class="mt-3 text-sm font-medium text-ink-muted">{{ t('productsPage.noProducts') }}</p>
          </div>
          <div v-for="product in filteredProducts" :key="product.id" class="rounded-xl border border-border-warm bg-paper p-4 shadow-sm">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <ProductImage :product="product" size="sm" />
                <div>
                  <div class="text-sm font-medium text-ink">{{ product.name }}</div>
                  <div class="text-xs text-ink-muted">{{ product.sku || t('common.noSku') }}</div>
                </div>
              </div>
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                :class="activeBadge(product.is_active)"
              >
                {{ product.is_active ? t('common.enabledShort') : t('common.disabledShort') }}
              </span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-ink-muted">{{ t('common.price') }}</span>
                <p class="font-medium text-ink">{{ formatCurrency(product.price) }}</p>
              </div>
              <div>
                <span class="text-ink-muted">{{ t('common.cost') }}</span>
                <p class="text-ink-muted">{{ formatCurrency(product.cost ?? 0) }}</p>
              </div>
              <div>
                <span class="text-ink-muted">{{ t('common.category') }}</span>
                <p class="text-ink-muted">{{ getCategoryName(product.category) }}</p>
              </div>
              <div>
                <span class="text-ink-muted">{{ t('common.unit') }}</span>
                <p class="text-ink-muted">{{ product.unit || "-" }}</p>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-end gap-2 border-t border-border-warm pt-3">
              <button
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-surface"
                @click="openEditProduct(product)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {{ t('common.edit') }}
              </button>
              <button
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-danger-500 transition hover:bg-danger-50"
                @click="confirmDeleteProduct(product)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Categories Tab -->
      <template v-else>
        <UiMobileDataList>
          <template #table>
            <div class="overflow-hidden rounded-xl border border-border-warm bg-paper shadow-sm">
              <table class="min-w-full divide-y divide-border-warm">
                <thead class="bg-surface">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('productsPage.categoryName') }}</th>
                    <th class="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted sm:table-cell">{{ t('common.description') }}</th>
                    <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('common.sortOrder') }}</th>
                    <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('productsPage.categoryProductCount') }}</th>
                    <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('common.status') }}</th>
                    <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">{{ t('productsPage.manage') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-warm">
                  <tr v-for="cat in categories" :key="cat.id" class="transition hover:bg-surface/80">
                    <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-ink">{{ cat.name }}</td>
                    <td class="hidden max-w-xs truncate px-6 py-4 text-sm text-ink-muted sm:table-cell">{{ cat.description || "-" }}</td>
                    <td class="whitespace-nowrap px-6 py-4 text-center text-sm text-ink-muted">{{ cat.sort_order ?? 0 }}</td>
                    <td class="whitespace-nowrap px-6 py-4 text-center text-sm text-ink-muted">{{ getCategoryProductCount(cat.id) }}</td>
                    <td class="whitespace-nowrap px-6 py-4 text-center">
                      <span
                        class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                        :class="activeBadge(cat.is_active)"
                      >
                        {{ cat.is_active ? t('common.active') : t('common.inactive') }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          class="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface hover:text-primary-600"
                          :title="t('common.edit')"
                          @click="openEditCategory(cat)"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          class="rounded-lg p-1.5 text-ink-muted transition hover:bg-danger-50 hover:text-danger-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
                          :disabled="getCategoryProductCount(cat.id) > 0"
                          :title="getCategoryProductCount(cat.id) > 0 ? t('productsPage.deleteCategoryDisabled') : t('common.delete')"
                          @click="confirmDeleteCategory(cat)"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="(categories ?? []).length === 0">
                    <td colspan="6" class="px-6 py-16 text-center">
                      <svg class="mx-auto h-12 w-12 text-border-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
                      <p class="mt-3 text-sm font-medium text-ink-muted">{{ t('productsPage.noCategories') }}</p>
                      <button class="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700" @click="openAddCategory">{{ t('productsPage.addFirstCategory') }}</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template #cards>
            <div v-if="(categories ?? []).length === 0" class="rounded-xl bg-paper p-8 text-center shadow-sm">
              <svg class="mx-auto h-12 w-12 text-border-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
              <p class="mt-3 text-sm font-medium text-ink-muted">{{ t('productsPage.noCategories') }}</p>
              <button class="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700" @click="openAddCategory">{{ t('productsPage.addFirstCategory') }}</button>
            </div>
            <UiMobileDataCard
              v-for="cat in categories"
              :key="cat.id"
              :title="cat.name"
              :subtitle="cat.description || '-'"
            >
              <template #badge>
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="activeBadge(cat.is_active)"
                >
                  {{ cat.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </template>
              <template #fields>
                <div>
                  <span class="text-ink-muted">{{ t('common.sortOrder') }}</span>
                  <p class="text-ink-muted">{{ cat.sort_order ?? 0 }}</p>
                </div>
                <div>
                  <span class="text-ink-muted">{{ t('productsPage.categoryProductCount') }}</span>
                  <p class="text-ink-muted">{{ getCategoryProductCount(cat.id) }}</p>
                </div>
              </template>
              <template #actions>
                <button
                  class="rounded-lg px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50"
                  @click="openEditCategory(cat)"
                >
                  {{ t('common.edit') }}
                </button>
                <button
                  class="rounded-lg px-3 py-2 text-xs font-medium text-danger-500 hover:bg-danger-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  :disabled="getCategoryProductCount(cat.id) > 0"
                  :title="getCategoryProductCount(cat.id) > 0 ? t('productsPage.deleteCategoryDisabled') : undefined"
                  @click="confirmDeleteCategory(cat)"
                >
                  {{ t('common.delete') }}
                </button>
              </template>
            </UiMobileDataCard>
          </template>
        </UiMobileDataList>
      </template>
    </div>

    <!-- Product Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showProductModal" class="craft-modal-backdrop craft-modal-backdrop--top z-50" @click.self="showProductModal = false">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <div v-if="showProductModal" class="craft-modal-panel craft-modal--paper max-w-lg">
              <div class="mb-5 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-ink">{{ editingProduct ? t('productsPage.editProduct') : t('productsPage.addNewProduct') }}</h2>
                <button class="rounded-lg p-1 text-ink-muted hover:bg-surface hover:text-ink-muted" @click="showProductModal = false">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form class="space-y-4" @submit.prevent="handleSaveProduct">
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('productsPage.productName') }} <span class="text-danger-500">*</span></label>
                  <input v-model="productForm.name" type="text" required class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('productsPage.image') }}</label>
                  <div class="flex items-start gap-4">
                    <div class="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-warm bg-surface">
                      <img
                        v-if="imagePreview"
                        :src="imagePreview"
                        alt=""
                        class="h-full w-full object-cover"
                      />
                      <img
                        v-else-if="existingImageUrl"
                        :src="existingImageUrl"
                        alt=""
                        class="h-full w-full object-cover"
                      />
                      <svg v-else class="h-8 w-8 text-border-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div class="flex flex-col gap-2">
                      <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface">
                        <svg class="h-4 w-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        {{ t('productsPage.uploadImage') }}
                        <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleImageSelect" />
                      </label>
                      <button
                        v-if="imagePreview || existingImageUrl"
                        type="button"
                        class="text-left text-sm text-danger-500 hover:text-danger-700"
                        @click="handleRemoveImage"
                      >
                        {{ t('productsPage.removeImage') }}
                      </button>
                      <p v-if="imageError" class="text-xs text-danger-500">{{ t(imageError) }}</p>
                      <p v-if="!isOnline && imageFile" class="text-xs text-warning-500">{{ t('productsPage.imageRequiresOnline') }}</p>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.sku') }}</label>
                    <input v-model="productForm.sku" type="text" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.barcode') }}</label>
                    <input v-model="productForm.barcode" type="text" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.price') }} <span class="text-danger-500">*</span></label>
                    <div class="relative">
                      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">฿</span>
                      <input v-model.number="productForm.price" type="number" step="0.01" min="0" required class="w-full rounded-lg border border-border-warm py-2 pl-3 pr-8 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.cost') }}</label>
                    <div class="relative">
                      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">฿</span>
                      <input v-model.number="productForm.cost" type="number" step="0.01" min="0" class="w-full rounded-lg border border-border-warm py-2 pl-3 pr-8 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.category') }}</label>
                    <select v-model="productForm.category" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                      <option value="">{{ t('common.unspecified') }}</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.unit') }}</label>
                    <input v-model="productForm.unit" type="text" :placeholder="t('productsPage.unitPlaceholder')" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.description') }}</label>
                  <textarea v-model="productForm.description" rows="2" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div class="flex items-center gap-6">
                  <label class="flex cursor-pointer items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="productForm.track_inventory"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      :class="productForm.track_inventory ? 'bg-primary-600' : 'bg-border-warm'"
                      @click="productForm.track_inventory = !productForm.track_inventory"
                    >
                      <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-paper shadow ring-0 transition duration-200 ease-in-out" :class="productForm.track_inventory ? 'translate-x-4' : 'translate-x-0'" />
                    </button>
                    <span class="text-sm text-ink">{{ t('common.trackStock') }}</span>
                  </label>
                  <label class="flex cursor-pointer items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="productForm.is_active"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      :class="productForm.is_active ? 'bg-primary-600' : 'bg-border-warm'"
                      @click="productForm.is_active = !productForm.is_active"
                    >
                      <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-paper shadow ring-0 transition duration-200 ease-in-out" :class="productForm.is_active ? 'translate-x-4' : 'translate-x-0'" />
                    </button>
                    <span class="text-sm text-ink">{{ t('common.enabled') }}</span>
                  </label>
                </div>
                <div v-if="productForm.track_inventory" class="rounded-lg border border-border-warm bg-surface/50 p-4 space-y-3">
                  <template v-if="editingProduct">
                    <p class="text-sm font-medium text-ink">
                      {{ t('productsPage.currentStock', { count: currentStockQty }) }}
                    </p>
                    <div>
                      <label class="mb-1 block text-sm font-medium text-ink">{{ t('productsPage.addStock') }}</label>
                      <input
                        v-model.number="addStockQuantity"
                        type="number"
                        min="0"
                        step="1"
                        class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  </template>
                  <template v-else>
                    <div>
                      <label class="mb-1 block text-sm font-medium text-ink">{{ t('productsPage.initialStock') }}</label>
                      <input
                        v-model.number="initialQuantity"
                        type="number"
                        min="0"
                        step="1"
                        class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                      <p class="mt-1 text-xs text-ink-muted">{{ t('productsPage.initialStockHint') }}</p>
                    </div>
                  </template>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                  <button type="button" class="rounded-lg px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface" @click="showProductModal = false">{{ t('common.cancel') }}</button>
                  <button type="submit" :disabled="isSavingProduct" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50">
                    {{ editingProduct ? t('common.save') : t('productsPage.addProduct') }}
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Category Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showCategoryModal" class="craft-modal-backdrop craft-modal-backdrop--top z-50" @click.self="showCategoryModal = false">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <div v-if="showCategoryModal" class="craft-modal-panel craft-modal--stitched max-w-md">
              <div class="mb-5 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-ink">{{ editingCategory ? t('productsPage.editCategory') : t('productsPage.addNewCategory') }}</h2>
                <button class="rounded-lg p-1 text-ink-muted hover:bg-surface hover:text-ink-muted" @click="showCategoryModal = false">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form class="space-y-4" @submit.prevent="handleSaveCategory">
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('productsPage.categoryName') }} <span class="text-danger-500">*</span></label>
                  <input v-model="categoryForm.name" type="text" required class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.description') }}</label>
                  <textarea v-model="categoryForm.description" rows="2" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('productsPage.displayOrder') }}</label>
                  <input v-model.number="categoryForm.sort_order" type="number" min="0" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <label class="flex cursor-pointer items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="categoryForm.is_active"
                    class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    :class="categoryForm.is_active ? 'bg-primary-600' : 'bg-border-warm'"
                    @click="categoryForm.is_active = !categoryForm.is_active"
                  >
                    <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-paper shadow ring-0 transition duration-200 ease-in-out" :class="categoryForm.is_active ? 'translate-x-4' : 'translate-x-0'" />
                  </button>
                  <span class="text-sm text-ink">{{ t('common.enabled') }}</span>
                </label>
                <div class="flex items-center justify-end gap-3 pt-2">
                  <button type="button" class="rounded-lg px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface" @click="showCategoryModal = false">{{ t('common.cancel') }}</button>
                  <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    {{ editingCategory ? t('common.save') : t('productsPage.addCategory') }}
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Product Confirm -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showDeleteConfirm" class="craft-modal-backdrop craft-modal-backdrop--center z-50" @click.self="showDeleteConfirm = false">
          <div class="craft-modal-panel craft-modal--label max-w-sm text-center">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-100">
              <svg class="h-6 w-6 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 class="text-center text-lg font-semibold text-ink">{{ t('productsPage.confirmDeleteProduct') }}</h3>
            <p class="mt-2 text-center text-sm text-ink-muted">
              {{ t('productsPage.confirmDeleteProductDesc', { name: deletingProduct?.name }) }}
            </p>
            <div class="mt-5 flex items-center justify-center gap-3">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface" @click="showDeleteConfirm = false">{{ t('common.cancel') }}</button>
              <button class="rounded-lg bg-danger-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-danger-700" @click="handleDeleteProduct">{{ t('productsPage.deleteProduct') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Category Confirm -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showDeleteCategoryConfirm" class="craft-modal-backdrop craft-modal-backdrop--center z-50" @click.self="showDeleteCategoryConfirm = false">
          <div class="craft-modal-panel craft-modal--label max-w-sm text-center">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-100">
              <svg class="h-6 w-6 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 class="text-center text-lg font-semibold text-ink">{{ t('productsPage.confirmDeleteCategory') }}</h3>
            <p class="mt-2 text-center text-sm text-ink-muted">
              {{ t('productsPage.confirmDeleteCategoryDesc', { name: deletingCategory?.name }) }}
            </p>
            <div class="mt-5 flex items-center justify-center gap-3">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface" @click="showDeleteCategoryConfirm = false">{{ t('common.cancel') }}</button>
              <button class="rounded-lg bg-danger-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-danger-700" @click="handleDeleteCategory">{{ t('productsPage.deleteCategory') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ProductBulkAddModal
      v-model="showBulkAddModal"
      :products="products ?? []"
      :categories="categories ?? []"
      @saved="fetchProducts"
    />

    <ProductImportExportModal
      v-model="showImportExportModal"
      :products="products ?? []"
      :categories="categories ?? []"
      @saved="fetchProducts"
    />
  </div>
</template>
