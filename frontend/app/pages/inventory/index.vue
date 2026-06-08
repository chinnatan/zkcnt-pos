<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">{{ t('stock.adjustStock') }}</h2>
      <button
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="showAdjustModal = true"
      >
        {{ t('stock.adjustStock') }}
      </button>
    </div>

    <div v-if="lowStockItems.length > 0" class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-yellow-800">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        {{ t('stock.lowStockAlert', { count: lowStockItems.length }) }}
      </h3>
    </div>

    <div class="rounded-xl bg-white shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="inventoryWithProducts.length === 0" class="py-12 text-center text-gray-400">
        {{ t('stock.noData') }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">{{ t('common.product') }}</th>
              <th class="px-4 py-3">{{ t('common.sku') }}</th>
              <th class="px-4 py-3 text-right">{{ t('common.quantity') }}</th>
              <th class="px-4 py-3 text-right">{{ t('common.threshold') }}</th>
              <th class="px-4 py-3">{{ t('common.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="item in inventoryWithProducts" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ item.productName }}</td>
              <td class="px-4 py-3 text-gray-500">{{ item.productSku || '-' }}</td>
              <td class="px-4 py-3 text-right font-semibold" :class="item.quantity <= item.low_stock_threshold ? 'text-danger-500' : ''">
                {{ item.quantity }}
              </td>
              <td class="px-4 py-3 text-right text-gray-500">{{ item.low_stock_threshold }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="item.quantity <= 0 ? 'bg-red-100 text-red-700' : item.quantity <= item.low_stock_threshold ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'"
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
    </div>

    <Teleport to="body">
      <div v-if="showAdjustModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showAdjustModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold">{{ t('stock.adjustStock') }}</h3>

          <form @submit.prevent="handleAdjust" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.product') }}</label>
              <select
                v-model="adjustForm.productId"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="">{{ t('common.selectProduct') }}</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.type') }}</label>
              <select
                v-model="adjustForm.type"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="stock_in">{{ t('stock.stockIn') }}</option>
                <option value="stock_out">{{ t('stock.stockOut') }}</option>
                <option value="adjustment">{{ t('stock.adjustment') }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.quantity') }}</label>
              <input
                v-model.number="adjustForm.quantity"
                type="number"
                min="1"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.note') }}</label>
              <input
                v-model="adjustForm.note"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                :placeholder="t('common.optionalNote')"
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { stockStatusLabel } = useLabels();
const { inventoryItems, isLoading, lowStockItems, fetchInventory, adjustStock } = useInventory();
const { products, fetchProducts } = useProducts();
const { activeStoreId } = useStore();

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
    };
  });
});

function openAdjust(item: any) {
  adjustForm.productId = item.product;
  adjustForm.type = "stock_in";
  adjustForm.quantity = 1;
  adjustForm.note = "";
  showAdjustModal.value = true;
}

async function handleAdjust() {
  await adjustStock(adjustForm.productId, adjustForm.type, adjustForm.quantity, adjustForm.note);
  showAdjustModal.value = false;
}

onMounted(() => {
  fetchInventory();
  fetchProducts();
});
</script>
