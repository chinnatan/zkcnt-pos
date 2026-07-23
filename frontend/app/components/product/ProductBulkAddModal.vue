<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="craft-modal-backdrop craft-modal-backdrop--top z-50"
      >
        <div class="craft-modal-panel craft-modal--canvas max-w-6xl">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('productsPage.bulkAddTitle') }}</h2>
              <p class="mt-1 text-sm text-ink-muted">{{ t('productsPage.bulkAddDesc') }}</p>
            </div>
            <button class="rounded-lg p-1 text-ink-muted hover:bg-surface hover:text-ink-muted" @click="close">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink hover:bg-surface"
              @click="addRow"
            >
              {{ t('productsPage.addRow') }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink hover:bg-surface"
              @click="handlePaste"
            >
              {{ t('productsPage.pasteClipboard') }}
            </button>
          </div>

          <div class="mb-4 max-h-[50vh] overflow-auto rounded-xl border border-border-warm bg-paper">
            <table class="min-w-full divide-y divide-border-warm text-sm">
              <thead class="sticky top-0 bg-surface">
                <tr>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">#</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('productsPage.productName') }} *</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('common.sku') }}</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('common.barcode') }}</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('common.price') }} *</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('common.cost') }}</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('common.category') }}</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('common.unit') }}</th>
                  <th class="px-2 py-2 text-center text-xs font-semibold text-ink-muted">{{ t('common.trackStock') }}</th>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-ink-muted">{{ t('productsPage.initialStock') }}</th>
                  <th class="px-2 py-2 text-center text-xs font-semibold text-ink-muted">{{ t('common.enabled') }}</th>
                  <th class="px-2 py-2 text-center text-xs font-semibold text-ink-muted">{{ t('productsPage.rowStatus') }}</th>
                  <th class="px-2 py-2" />
                </tr>
              </thead>
              <tbody class="divide-y divide-border-warm">
                <tr v-for="(row, index) in rows" :key="index">
                  <td class="px-2 py-1 text-ink-muted">{{ index + 1 }}</td>
                  <td class="px-2 py-1">
                    <input v-model="row.name" type="text" class="w-full min-w-[120px] rounded border border-border-warm px-2 py-1 text-sm" @input="revalidate" />
                  </td>
                  <td class="px-2 py-1">
                    <input v-model="row.sku" type="text" class="w-full min-w-[80px] rounded border border-border-warm px-2 py-1 text-sm" @input="revalidate" />
                  </td>
                  <td class="px-2 py-1">
                    <input v-model="row.barcode" type="text" class="w-full min-w-[100px] rounded border border-border-warm px-2 py-1 text-sm" @input="revalidate" />
                  </td>
                  <td class="px-2 py-1">
                    <input v-model.number="row.price" type="number" min="0" step="0.01" class="w-24 rounded border border-border-warm px-2 py-1 text-sm" @input="revalidate" />
                  </td>
                  <td class="px-2 py-1">
                    <input v-model.number="row.cost" type="number" min="0" step="0.01" class="w-24 rounded border border-border-warm px-2 py-1 text-sm" @input="revalidate" />
                  </td>
                  <td class="px-2 py-1">
                    <input v-model="row.category" type="text" class="w-full min-w-[100px] rounded border border-border-warm px-2 py-1 text-sm" @input="revalidate" />
                  </td>
                  <td class="px-2 py-1">
                    <input v-model="row.unit" type="text" class="w-20 rounded border border-border-warm px-2 py-1 text-sm" @input="revalidate" />
                  </td>
                  <td class="px-2 py-1 text-center">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="row.track_inventory"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      :class="row.track_inventory ? 'bg-primary-600' : 'bg-border-warm'"
                      @click="toggleTrackInventory(index)"
                    >
                      <span
                        class="pointer-events-none inline-block h-4 w-4 rounded-full bg-paper shadow ring-0 transition duration-200 ease-in-out"
                        :class="row.track_inventory ? 'translate-x-4' : 'translate-x-0'"
                      />
                    </button>
                  </td>
                  <td class="px-2 py-1">
                    <input
                      v-model.number="row.initial_quantity"
                      type="number"
                      min="0"
                      step="1"
                      :disabled="!row.track_inventory"
                      class="w-20 rounded border border-border-warm px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted"
                      @input="revalidate"
                    />
                  </td>
                  <td class="px-2 py-1 text-center">
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="row.is_active"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      :class="row.is_active ? 'bg-primary-600' : 'bg-border-warm'"
                      @click="toggleIsActive(index)"
                    >
                      <span
                        class="pointer-events-none inline-block h-4 w-4 rounded-full bg-paper shadow ring-0 transition duration-200 ease-in-out"
                        :class="row.is_active ? 'translate-x-4' : 'translate-x-0'"
                      />
                    </button>
                  </td>
                  <td class="px-2 py-1 text-center">
                    <template v-if="validationMap[index]">
                      <ProductImportStatusBadge
                        :status="validationMap[index].status"
                        :messages="validationMap[index].messages"
                      />
                    </template>
                  </td>
                  <td class="px-2 py-1">
                    <button
                      v-if="rows.length > 1"
                      type="button"
                      class="rounded p-1 text-ink-muted hover:bg-danger-50 hover:text-danger-500"
                      @click="removeRow(index)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-if="resultSummary" class="mt-4 rounded-lg bg-success-50 px-4 py-3 text-sm text-accent-700">
            {{ resultSummary }}
          </p>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-border-warm px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface"
              @click="close"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              :disabled="isSaving || validCount === 0"
              @click="handleSave"
            >
              {{ isSaving ? t('productsPage.savingBulk') : t('productsPage.confirmImport') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  createDefaultImportRows,
  createEmptyImportRow,
  parseClipboardTsv,
  toProductInput,
  validateImportRows,
  type ProductImportRow,
  type ValidatedImportRow,
} from "~/lib/products/spreadsheet";
import type { Category, Product } from "~/lib/types";
import type { BulkCreateResult } from "~/composables/useProducts";

const props = defineProps<{
  modelValue: boolean;
  products: readonly Product[];
  categories: readonly Category[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [result: BulkCreateResult];
}>();

const { t } = useI18n();
const { alert } = useDialog();
const { bulkCreateProducts } = useProducts();
const { adjustStock } = useInventory();
const { activeStoreId } = useStore();

const rows = ref<ProductImportRow[]>(createDefaultImportRows());
const validation = ref<ReturnType<typeof validateImportRows> | null>(null);
const isSaving = ref(false);
const resultSummary = ref("");

const validationMap = computed(() => {
  const map: Record<number, ValidatedImportRow> = {};
  for (const row of validation.value?.rows ?? []) {
    map[row.index] = row;
  }
  return map;
});

const validCount = computed(() => validation.value?.validCount ?? 0);

function revalidate() {
  validation.value = validateImportRows(rows.value, props.products, props.categories);
}

function addRow() {
  rows.value.push(createEmptyImportRow());
  revalidate();
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
  revalidate();
}

function toggleTrackInventory(index: number) {
  const row = rows.value[index];
  if (!row) return;
  row.track_inventory = !row.track_inventory;
  if (!row.track_inventory) {
    row.initial_quantity = 0;
  }
  revalidate();
}

function toggleIsActive(index: number) {
  const row = rows.value[index];
  if (!row) return;
  row.is_active = !row.is_active;
  revalidate();
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = parseClipboardTsv(text);
    if (parsed.length > 0) {
      rows.value = parsed;
      revalidate();
    }
  } catch {
    // clipboard denied
  }
}

async function handleSave() {
  if (!activeStoreId.value || validCount.value === 0) return;

  const validRows = (validation.value?.rows ?? []).filter(
    (r) => r.status === "valid" || r.status === "warning",
  );
  const items = validRows.map((r) => toProductInput(r, activeStoreId.value!));
  const stockByKey = new Map<string, number>();
  for (const row of validRows) {
    const qty = row.row.initial_quantity > 0 ? row.row.initial_quantity : 0;
    if (row.row.track_inventory && qty > 0) {
      const key = (row.row.sku.trim() || row.row.name.trim()).toLowerCase();
      stockByKey.set(key, qty);
    }
  }

  isSaving.value = true;
  resultSummary.value = "";
  let stockAdjustFailed = 0;
  try {
    const result = await bulkCreateProducts(items);

    for (const product of result.created) {
      if (!product.track_inventory) continue;
      const key = (product.sku?.trim() || product.name.trim()).toLowerCase();
      const qty = stockByKey.get(key);
      if (!qty || qty <= 0) continue;
      try {
        await adjustStock(product.id, "stock_in", qty, t("productsPage.initialStockNote"));
      } catch {
        stockAdjustFailed++;
      }
    }

    resultSummary.value = t("productsPage.importSummary", {
      created: result.created.length,
      skipped: result.skipped.length + (validation.value?.skippedCount ?? 0),
      failed: result.failed.length,
    });
    emit("saved", result);
    if (stockAdjustFailed > 0) {
      await alert(t("productsPage.stockAdjustFailed"));
    }
    if (result.created.length > 0) {
      setTimeout(() => close(), 1500);
    }
  } finally {
    isSaving.value = false;
  }
}

function close() {
  emit("update:modelValue", false);
  rows.value = createDefaultImportRows();
  validation.value = null;
  resultSummary.value = "";
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) revalidate();
  },
);
</script>
