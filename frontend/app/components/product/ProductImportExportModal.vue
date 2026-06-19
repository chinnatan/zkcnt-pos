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
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]"
        @click.self="close"
      >
        <div class="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ t('productsPage.importExportTitle') }}</h2>
              <p class="mt-1 text-sm text-gray-500">{{ t('productsPage.importExportDesc') }}</p>
            </div>
            <button class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" @click="close">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 class="mb-3 text-sm font-semibold text-gray-700">{{ t('productsPage.exportProducts') }}</h3>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                @click="downloadProductTemplate('csv')"
              >
                {{ t('productsPage.downloadTemplate') }} ({{ t('productsPage.formatCsv') }})
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                @click="downloadProductTemplate('xlsx')"
              >
                {{ t('productsPage.downloadTemplate') }} ({{ t('productsPage.formatXlsx') }})
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                @click="exportProductsToFile(products, categories, 'csv')"
              >
                {{ t('productsPage.exportProducts') }} ({{ t('productsPage.formatCsv') }})
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                @click="exportProductsToFile(products, categories, 'xlsx')"
              >
                {{ t('productsPage.exportProducts') }} ({{ t('productsPage.formatXlsx') }})
              </button>
            </div>
          </div>

          <div class="mb-4">
            <h3 class="mb-2 text-sm font-semibold text-gray-700">{{ t('productsPage.importFile') }}</h3>
            <p class="mb-3 text-xs text-gray-500">{{ t('productsPage.importHint') }}</p>
            <input
              ref="fileInput"
              type="file"
              accept=".csv,.xlsx,.xls"
              class="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
              @change="handleFileSelect"
            />
          </div>

          <div v-if="validation && validation.rows.length > 0" class="mb-4">
            <h3 class="mb-2 text-sm font-semibold text-gray-700">{{ t('productsPage.previewTitle') }}</h3>
            <div class="max-h-[40vh] overflow-auto rounded-xl border border-gray-200">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="sticky top-0 bg-gray-50">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">{{ t('productsPage.productName') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">{{ t('common.sku') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">{{ t('common.price') }}</th>
                    <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">{{ t('common.category') }}</th>
                    <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500">{{ t('productsPage.rowStatus') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="row in validation.rows" :key="row.index">
                    <td class="px-3 py-2 text-gray-400">{{ row.index + 1 }}</td>
                    <td class="px-3 py-2">{{ row.row.name || "-" }}</td>
                    <td class="px-3 py-2">{{ row.row.sku || "-" }}</td>
                    <td class="px-3 py-2">{{ row.row.price }}</td>
                    <td class="px-3 py-2">{{ row.row.category || "-" }}</td>
                    <td class="px-3 py-2 text-center">
                      <ProductImportStatusBadge :status="row.status" :messages="row.messages" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-xs text-gray-500">
              {{ t('productsPage.importSummary', { created: validation.validCount, skipped: validation.skippedCount, failed: validation.errorCount }) }}
            </p>
          </div>

          <p v-if="resultSummary" class="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            {{ resultSummary }}
          </p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="close"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              :disabled="isSaving || !validation || validation.validCount === 0"
              @click="handleImport"
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
  downloadProductTemplate,
  exportProductsToFile,
  parseSpreadsheetFile,
  toProductInput,
  validateImportRows,
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
const { bulkCreateProducts } = useProducts();
const { activeStoreId } = useStore();

const fileInput = ref<HTMLInputElement | null>(null);
const validation = ref<ReturnType<typeof validateImportRows> | null>(null);
const isSaving = ref(false);
const resultSummary = ref("");

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const rows = await parseSpreadsheetFile(file);
  validation.value = validateImportRows(rows, props.products, props.categories);
}

async function handleImport() {
  if (!activeStoreId.value || !validation.value || validation.value.validCount === 0) return;

  const validRows = validation.value.rows.filter(
    (r) => r.status === "valid" || r.status === "warning",
  );
  const items = validRows.map((r) => toProductInput(r, activeStoreId.value!));

  isSaving.value = true;
  resultSummary.value = "";
  try {
    const result = await bulkCreateProducts(items);
    resultSummary.value = t("productsPage.importSummary", {
      created: result.created.length,
      skipped: result.skipped.length + validation.value.skippedCount,
      failed: result.failed.length,
    });
    emit("saved", result);
    if (result.created.length > 0) {
      setTimeout(() => close(), 1500);
    }
  } finally {
    isSaving.value = false;
  }
}

function close() {
  emit("update:modelValue", false);
  validation.value = null;
  resultSummary.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      validation.value = null;
      resultSummary.value = "";
    }
  },
);
</script>
