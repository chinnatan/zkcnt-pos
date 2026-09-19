<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink">{{ t('stock.adjustStock') }}</h2>
      <button
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="showAdjustModal = true"
      >
        {{ t('stock.adjustStock') }}
      </button>
    </div>

    <div v-if="lowStockItems.length > 0" class="rounded-lg border border-warning-100 bg-warning-50 p-4">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-warning-700">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        {{ t('stock.lowStockAlert', { count: lowStockItems.length }) }}
      </h3>
    </div>

    <div v-if="isLoading" class="flex justify-center rounded-xl bg-paper shadow-sm py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <div v-else-if="inventoryWithProducts.length === 0" class="rounded-xl bg-paper shadow-sm py-12 text-center text-ink-muted">
      {{ t('stock.noData') }}
    </div>

    <template v-else>
      <div class="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div class="relative min-w-0">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('stock.searchPlaceholder')"
            class="h-10 w-full rounded-lg border border-border-warm bg-paper py-0 pl-10 pr-4 text-sm shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div class="flex h-10 overflow-hidden rounded-lg border border-border-warm bg-paper shadow-sm transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 sm:min-w-[14rem]">
          <div class="relative min-w-0 flex-1 sm:w-40 lg:w-44">
            <select
              v-model="statusFilter"
              class="h-full w-full appearance-none border-0 bg-transparent py-0 pl-3 pr-9 text-sm focus:outline-none focus:ring-0"
            >
              <option value="all">{{ t('stock.allStatuses') }}</option>
              <option value="ok">{{ t('stock.inStock') }}</option>
              <option value="low">{{ t('stock.lowStock') }}</option>
              <option value="out">{{ t('stock.outOfStock') }}</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div class="w-px self-stretch bg-border-warm" aria-hidden="true" />
          <div class="relative min-w-0 flex-1 sm:w-44 lg:w-52">
            <select
              v-model="selectedCategoryId"
              class="h-full w-full appearance-none border-0 bg-transparent py-0 pl-3 pr-9 text-sm focus:outline-none focus:ring-0"
            >
              <option :value="null">{{ t('stock.allCategories') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
            <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      <div class="rounded-xl bg-paper shadow-sm">
        <div v-if="filteredInventory.length === 0" class="py-12 text-center text-ink-muted">
          {{ t('stock.noResults') }}
        </div>

        <UiMobileDataList v-else table-from="lg">
          <template #table>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
                  <tr>
                    <th class="px-4 py-3">{{ t('common.product') }}</th>
                    <th class="px-4 py-3">{{ t('common.sku') }}</th>
                    <th class="px-4 py-3 text-right">{{ t('common.quantity') }}</th>
                    <th class="px-4 py-3 text-right">{{ t('common.threshold') }}</th>
                    <th class="px-4 py-3">{{ t('common.status') }}</th>
                    <th class="px-4 py-3">{{ t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-warm">
                  <tr v-for="item in filteredInventory" :key="item.id" class="hover:bg-surface">
                    <td class="px-4 py-3 font-medium text-ink">{{ item.productName }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ item.productSku || '-' }}</td>
                    <td class="px-4 py-3 text-right font-semibold" :class="item.quantity <= item.low_stock_threshold ? 'text-danger-500' : ''">
                      {{ item.quantity }}
                    </td>
                    <td class="px-4 py-3 text-right text-ink-muted">{{ item.low_stock_threshold }}</td>
                    <td class="px-4 py-3">
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="stockQuantityBadge(item.quantity, item.low_stock_threshold)"
                      >
                        {{ stockStatusLabel(item.quantity, item.low_stock_threshold) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <button
                        class="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                        @click="openAdjust(item)"
                      >
                        {{ t('stock.adjust') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template #cards>
            <UiMobileDataCard
              v-for="item in filteredInventory"
              :key="item.id"
              :title="item.productName"
              :subtitle="item.productSku || t('common.noSku')"
            >
              <template #badge>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="stockQuantityBadge(item.quantity, item.low_stock_threshold)"
                >
                  {{ stockStatusLabel(item.quantity, item.low_stock_threshold) }}
                </span>
              </template>
              <template #fields>
                <div>
                  <span class="text-ink-muted">{{ t('common.quantity') }}</span>
                  <p class="font-semibold" :class="item.quantity <= item.low_stock_threshold ? 'text-danger-500' : 'text-ink'">
                    {{ item.quantity }}
                  </p>
                </div>
                <div>
                  <span class="text-ink-muted">{{ t('common.threshold') }}</span>
                  <p class="text-ink-muted">{{ item.low_stock_threshold }}</p>
                </div>
              </template>
              <template #actions>
                <button
                  class="w-full rounded-lg bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                  @click="openAdjust(item)"
                >
                  {{ t('stock.adjust') }}
                </button>
              </template>
            </UiMobileDataCard>
          </template>
        </UiMobileDataList>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="showAdjustModal" class="craft-modal-backdrop craft-modal-backdrop--center z-50">
        <div class="craft-modal-panel craft-modal--stitched max-w-md">
          <h3 class="mb-4 text-lg font-semibold">{{ t('stock.adjustStock') }}</h3>

          <form @submit.prevent="handleAdjust" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.product') }}</label>
              <select
                v-model="adjustForm.productId"
                required
                class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">{{ t('common.selectProduct') }}</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.type') }}</label>
              <select
                v-model="adjustForm.type"
                required
                class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="stock_in">{{ t('stock.stockIn') }}</option>
                <option value="stock_out">{{ t('stock.stockOut') }}</option>
                <option value="adjustment">{{ t('stock.adjustment') }}</option>
              </select>
            </div>

            <div v-if="adjustForm.type === 'adjustment' && adjustForm.productId" class="rounded-lg bg-surface px-3 py-2 text-sm text-ink-muted">
              {{ t('stock.currentQuantity') }}: <span class="font-semibold text-ink">{{ selectedProductStock }}</span>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-ink">
                {{ adjustForm.type === 'adjustment' ? t('stock.targetQuantity') : t('common.quantity') }}
              </label>
              <input
                v-model.number="adjustForm.quantity"
                type="number"
                :min="adjustForm.type === 'adjustment' ? 0 : 1"
                required
                class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              />
              <p v-if="adjustForm.type === 'adjustment' && adjustForm.productId" class="mt-1 text-xs text-ink-muted">
                {{ adjustmentPreview }}
              </p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.note') }}</label>
              <input
                v-model="adjustForm.note"
                type="text"
                class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                :placeholder="t('common.optionalNote')"
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-border-warm px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface"
                @click="showAdjustModal = false"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                {{ t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { stockQuantityBadge } from "~/lib/ui/statusColors";
import { stockStatusOf, type StockStatus } from "~/lib/stock";
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { stockStatusLabel } = useLabels();
const { inventoryItems, isLoading, lowStockItems, fetchInventory, adjustStock } = useInventory();
const { products, categories, fetchProducts, fetchCategories } = useProducts();
const { activeStoreId } = useStore();

const searchQuery = ref("");
const statusFilter = ref<"all" | StockStatus>("all");
const selectedCategoryId = ref<string | null>(null);

const showAdjustModal = ref(false);
const adjustForm = reactive({
  productId: "",
  type: "stock_in" as "stock_in" | "stock_out" | "adjustment",
  quantity: 1,
  note: "",
});

const inventoryWithProducts = computed(() => {
  return inventoryItems.value.map((inv) => {
    const product = products.value.find((p) => p.id === inv.product);
    return {
      ...inv,
      productName: product?.name || t("common.unknown"),
      productSku: product?.sku || "",
      productCategory: product?.category || "",
    };
  });
});

const filteredInventory = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return inventoryWithProducts.value.filter((item) => {
    if (q && !item.productName.toLowerCase().includes(q) && !item.productSku.toLowerCase().includes(q)) return false;
    if (statusFilter.value !== "all" && stockStatusOf(item.quantity, item.low_stock_threshold) !== statusFilter.value) return false;
    if (selectedCategoryId.value && item.productCategory !== selectedCategoryId.value) return false;
    return true;
  });
});

const selectedProductStock = computed(() => {
  const item = inventoryItems.value.find((i) => i.product === adjustForm.productId);
  return item?.quantity ?? 0;
});

const adjustmentPreview = computed(() => {
  const current = selectedProductStock.value;
  const target = adjustForm.quantity;
  if (Number.isNaN(target)) return "";
  const delta = target - current;
  if (delta === 0) return t("stock.adjustmentNoChange");
  const sign = delta > 0 ? "+" : "";
  return t("stock.adjustmentPreview", { current, target, delta: `${sign}${delta}` });
});

function openAdjust(item: any) {
  adjustForm.productId = item.product;
  adjustForm.type = "adjustment";
  adjustForm.quantity = item.quantity;
  adjustForm.note = "";
  showAdjustModal.value = true;
}

async function handleAdjust() {
  await adjustStock(adjustForm.productId, adjustForm.type, adjustForm.quantity, adjustForm.note);
  showAdjustModal.value = false;
}

watch(
  () => adjustForm.type,
  (type) => {
    if (type === "adjustment" && adjustForm.productId) {
      adjustForm.quantity = selectedProductStock.value;
    } else if (type !== "adjustment") {
      adjustForm.quantity = 1;
    }
  },
);

watch(
  () => adjustForm.productId,
  (productId) => {
    if (adjustForm.type === "adjustment" && productId) {
      adjustForm.quantity = selectedProductStock.value;
    }
  },
);

onMounted(() => {
  fetchInventory();
  fetchProducts();
  fetchCategories();
});
</script>
