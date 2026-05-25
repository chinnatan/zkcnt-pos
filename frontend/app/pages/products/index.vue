<script setup lang="ts">
import type { Product, Category } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { products, categories, fetchProducts, fetchCategories, createProduct, updateProduct, deleteProduct, createCategory, updateCategory, deleteCategory, isLoading } = useProducts();
const { activeStoreId } = useStore();

const searchQuery = ref("");
const selectedCategoryId = ref<string | null>(null);
const activeTab = ref<"products" | "categories">("products");

const showProductModal = ref(false);
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

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
}

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

function openAddProduct() {
  editingProduct.value = null;
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

function openEditProduct(product: Product) {
  editingProduct.value = product;
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
  if (editingProduct.value) {
    await updateProduct(editingProduct.value.id, { ...productForm.value, store: activeStoreId.value });
  } else {
    await createProduct({ ...productForm.value, store: activeStoreId.value });
  }
  showProductModal.value = false;
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
  if (editingCategory.value) {
    await updateCategory(editingCategory.value.id, { ...categoryForm.value, store: activeStoreId.value });
  } else {
    await createCategory({ ...categoryForm.value, store: activeStoreId.value });
  }
  showCategoryModal.value = false;
}

function confirmDeleteCategory(category: Category) {
  deletingCategory.value = category;
  showDeleteCategoryConfirm.value = true;
}

async function handleDeleteCategory() {
  if (deletingCategory.value) {
    await deleteCategory(deletingCategory.value.id);
  }
  showDeleteCategoryConfirm.value = false;
  deletingCategory.value = null;
}

onMounted(() => {
  fetchProducts();
  fetchCategories();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">จัดการสินค้า</h1>
          <p class="mt-1 text-sm text-gray-500">จัดการสินค้าและหมวดหมู่ทั้งหมดของร้าน</p>
        </div>
        <button
          v-if="activeTab === 'products'"
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          @click="openAddProduct"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          เพิ่มสินค้า
        </button>
        <button
          v-else
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          @click="openAddCategory"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          เพิ่มหมวดหมู่
        </button>
      </div>

      <!-- Tabs -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex gap-6">
          <button
            class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition"
            :class="activeTab === 'products' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
            @click="activeTab = 'products'"
          >
            สินค้า
            <span class="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{{ (products ?? []).length }}</span>
          </button>
          <button
            class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition"
            :class="activeTab === 'categories' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'"
            @click="activeTab = 'categories'"
          >
            หมวดหมู่
            <span class="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{{ (categories ?? []).length }}</span>
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
            <svg class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาสินค้า (ชื่อ, SKU)..."
              class="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            v-model="selectedCategoryId"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:w-56"
          >
            <option :value="null">หมวดหมู่ทั้งหมด</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <!-- Desktop Table -->
        <div class="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สินค้า</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">SKU</th>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">หมวดหมู่</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">ราคา</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">ต้นทุน</th>
                <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="product in filteredProducts" :key="product.id" class="transition hover:bg-gray-50/80">
                <td class="whitespace-nowrap px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ product.name }}</div>
                      <div v-if="product.barcode" class="text-xs text-gray-400">{{ product.barcode }}</div>
                    </div>
                  </div>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{{ product.sku || "-" }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{{ getCategoryName(product.category) }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">{{ formatCurrency(product.price) }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">{{ formatCurrency(product.cost ?? 0) }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-center">
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="product.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
                  >
                    {{ product.is_active ? "ใช้งาน" : "ปิดใช้งาน" }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-primary-600"
                      title="แก้ไข"
                      @click="openEditProduct(product)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      title="ลบ"
                      @click="confirmDeleteProduct(product)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredProducts.length === 0">
                <td colspan="7" class="px-6 py-16 text-center">
                  <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  <p class="mt-3 text-sm font-medium text-gray-500">ไม่พบสินค้า</p>
                  <p class="mt-1 text-xs text-gray-400">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="flex flex-col gap-3 md:hidden">
          <div v-if="filteredProducts.length === 0" class="rounded-xl bg-white p-8 text-center shadow-sm">
            <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p class="mt-3 text-sm font-medium text-gray-500">ไม่พบสินค้า</p>
          </div>
          <div v-for="product in filteredProducts" :key="product.id" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ product.name }}</div>
                  <div class="text-xs text-gray-400">{{ product.sku || "ไม่มี SKU" }}</div>
                </div>
              </div>
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                :class="product.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
              >
                {{ product.is_active ? "ใช้งาน" : "ปิด" }}
              </span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-400">ราคา</span>
                <p class="font-medium text-gray-900">{{ formatCurrency(product.price) }}</p>
              </div>
              <div>
                <span class="text-gray-400">ต้นทุน</span>
                <p class="text-gray-600">{{ formatCurrency(product.cost ?? 0) }}</p>
              </div>
              <div>
                <span class="text-gray-400">หมวดหมู่</span>
                <p class="text-gray-600">{{ getCategoryName(product.category) }}</p>
              </div>
              <div>
                <span class="text-gray-400">หน่วย</span>
                <p class="text-gray-600">{{ product.unit || "-" }}</p>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                @click="openEditProduct(product)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                แก้ไข
              </button>
              <button
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                @click="confirmDeleteProduct(product)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                ลบ
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Categories Tab -->
      <template v-else>
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ชื่อหมวดหมู่</th>
                <th class="hidden px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">คำอธิบาย</th>
                <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">ลำดับ</th>
                <th class="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="cat in categories" :key="cat.id" class="transition hover:bg-gray-50/80">
                <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{{ cat.name }}</td>
                <td class="hidden max-w-xs truncate px-6 py-4 text-sm text-gray-500 sm:table-cell">{{ cat.description || "-" }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">{{ cat.sort_order ?? 0 }}</td>
                <td class="whitespace-nowrap px-6 py-4 text-center">
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    :class="cat.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
                  >
                    {{ cat.is_active ? "ใช้งาน" : "ปิดใช้งาน" }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-primary-600"
                      title="แก้ไข"
                      @click="openEditCategory(cat)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      class="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      title="ลบ"
                      @click="confirmDeleteCategory(cat)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="(categories ?? []).length === 0">
                <td colspan="5" class="px-6 py-16 text-center">
                  <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
                  <p class="mt-3 text-sm font-medium text-gray-500">ยังไม่มีหมวดหมู่</p>
                  <button class="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700" @click="openAddCategory">เพิ่มหมวดหมู่แรก</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
        <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh] sm:pt-[10vh]" @click.self="showProductModal = false">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <div v-if="showProductModal" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div class="mb-5 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">{{ editingProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่" }}</h2>
                <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showProductModal = false">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form class="space-y-4" @submit.prevent="handleSaveProduct">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">ชื่อสินค้า <span class="text-red-500">*</span></label>
                  <input v-model="productForm.name" type="text" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">SKU</label>
                    <input v-model="productForm.sku" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">บาร์โค้ด</label>
                    <input v-model="productForm.barcode" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">ราคา <span class="text-red-500">*</span></label>
                    <div class="relative">
                      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">฿</span>
                      <input v-model.number="productForm.price" type="number" step="0.01" min="0" required class="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">ต้นทุน</label>
                    <div class="relative">
                      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">฿</span>
                      <input v-model.number="productForm.cost" type="number" step="0.01" min="0" class="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">หมวดหมู่</label>
                    <select v-model="productForm.category" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                      <option value="">ไม่ระบุ</option>
                      <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">หน่วย</label>
                    <input v-model="productForm.unit" type="text" placeholder="ชิ้น, กก., ..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">คำอธิบาย</label>
                  <textarea v-model="productForm.description" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div class="flex items-center gap-6">
                  <label class="flex cursor-pointer items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="productForm.track_inventory"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      :class="productForm.track_inventory ? 'bg-primary-600' : 'bg-gray-200'"
                      @click="productForm.track_inventory = !productForm.track_inventory"
                    >
                      <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" :class="productForm.track_inventory ? 'translate-x-4' : 'translate-x-0'" />
                    </button>
                    <span class="text-sm text-gray-700">ติดตามสต็อก</span>
                  </label>
                  <label class="flex cursor-pointer items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="productForm.is_active"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      :class="productForm.is_active ? 'bg-primary-600' : 'bg-gray-200'"
                      @click="productForm.is_active = !productForm.is_active"
                    >
                      <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" :class="productForm.is_active ? 'translate-x-4' : 'translate-x-0'" />
                    </button>
                    <span class="text-sm text-gray-700">เปิดใช้งาน</span>
                  </label>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                  <button type="button" class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100" @click="showProductModal = false">ยกเลิก</button>
                  <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    {{ editingProduct ? "บันทึก" : "เพิ่มสินค้า" }}
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
        <div v-if="showCategoryModal" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[10vh]" @click.self="showCategoryModal = false">
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <div v-if="showCategoryModal" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div class="mb-5 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">{{ editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่" }}</h2>
                <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="showCategoryModal = false">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form class="space-y-4" @submit.prevent="handleSaveCategory">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">ชื่อหมวดหมู่ <span class="text-red-500">*</span></label>
                  <input v-model="categoryForm.name" type="text" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">คำอธิบาย</label>
                  <textarea v-model="categoryForm.description" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">ลำดับการแสดง</label>
                  <input v-model.number="categoryForm.sort_order" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <label class="flex cursor-pointer items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="categoryForm.is_active"
                    class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    :class="categoryForm.is_active ? 'bg-primary-600' : 'bg-gray-200'"
                    @click="categoryForm.is_active = !categoryForm.is_active"
                  >
                    <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" :class="categoryForm.is_active ? 'translate-x-4' : 'translate-x-0'" />
                  </button>
                  <span class="text-sm text-gray-700">เปิดใช้งาน</span>
                </label>
                <div class="flex items-center justify-end gap-3 pt-2">
                  <button type="button" class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100" @click="showCategoryModal = false">ยกเลิก</button>
                  <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    {{ editingCategory ? "บันทึก" : "เพิ่มหมวดหมู่" }}
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
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showDeleteConfirm = false">
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 class="text-center text-lg font-semibold text-gray-900">ยืนยันการลบสินค้า</h3>
            <p class="mt-2 text-center text-sm text-gray-500">
              คุณต้องการลบ <span class="font-medium text-gray-700">{{ deletingProduct?.name }}</span> หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            <div class="mt-5 flex items-center justify-center gap-3">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100" @click="showDeleteConfirm = false">ยกเลิก</button>
              <button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700" @click="handleDeleteProduct">ลบสินค้า</button>
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
        <div v-if="showDeleteCategoryConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showDeleteCategoryConfirm = false">
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 class="text-center text-lg font-semibold text-gray-900">ยืนยันการลบหมวดหมู่</h3>
            <p class="mt-2 text-center text-sm text-gray-500">
              คุณต้องการลบ <span class="font-medium text-gray-700">{{ deletingCategory?.name }}</span> หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            <div class="mt-5 flex items-center justify-center gap-3">
              <button class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100" @click="showDeleteCategoryConfirm = false">ยกเลิก</button>
              <button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700" @click="handleDeleteCategory">ลบหมวดหมู่</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
