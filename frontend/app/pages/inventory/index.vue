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

    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="inventoryWithProducts.length === 0" class="py-12 text-center text-ink-muted">
        {{ t('stock.noData') }}
      </div>

      <div v-else>
        <UiMobileDataList>
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
                  <tr v-for="item in inventoryWithProducts" :key="item.id" class="hover:bg-surface">
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
              v-for="item in inventoryWithProducts"
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
    </div>

    <Teleport to="body">
      <div v-if="showAdjustModal" class="craft-modal-backdrop craft-modal-backdrop--center z-50" @click.self="showAdjustModal = false">
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

            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.quantity') }}</label>
              <input
                v-model.number="adjustForm.quantity"
                type="number"
                min="1"
                required
                class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              />
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
