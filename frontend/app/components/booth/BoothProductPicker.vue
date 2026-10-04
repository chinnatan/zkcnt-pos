<template>
  <section class="space-y-3">
    <div>
      <h4 class="text-sm font-semibold text-ink">{{ t('boothsPage.products') }}</h4>
      <p class="text-xs text-ink-muted" data-testid="booth-selected-summary">
        {{ t('boothsPage.productsHint') }} · {{ t('boothsPage.selectedCount', { n: selectedCount(products, selectedIds) }) }}
      </p>
    </div>

    <input v-model="search" type="search" class="input w-full" :placeholder="t('boothsPage.searchProducts')" />

    <div class="flex flex-wrap gap-2" role="group">
      <button
        v-for="f in filters"
        :key="f"
        type="button"
        class="rounded-full border px-3 py-1 text-xs"
        :class="filter === f ? 'border-primary-600 bg-primary-600 text-white' : 'border-border-warm text-ink-muted hover:bg-surface'"
        :data-testid="`booth-filter-${f}`"
        @click="filter = f"
      >
        {{ t(`boothsPage.filter.${f}`) }}
      </button>
    </div>

    <div class="flex flex-wrap gap-2 text-xs">
      <button type="button" class="btn-secondary" :disabled="busy !== null || !shown.length" data-testid="booth-select-shown" @click="selectShown">
        {{ t('boothsPage.selectShown') }}
      </button>
      <button type="button" class="btn-secondary" :disabled="busy !== null || !inStockToAdd.length" @click="selectShownInStock">
        {{ t('boothsPage.selectInStock') }}
      </button>
      <button type="button" class="btn-secondary" :disabled="busy !== null || !shown.length" data-testid="booth-clear-shown" @click="clearShown">
        {{ t('boothsPage.clearShown') }}
      </button>
      <button type="button" class="btn-secondary" :disabled="busy !== null || !shownSelected.length" @click="setAllQty">
        {{ t('boothsPage.setAllQty') }}
      </button>
    </div>

    <div v-if="busy" class="space-y-1" data-testid="booth-bulk-progress">
      <div class="h-1.5 overflow-hidden rounded-full bg-primary-100">
        <div class="h-full rounded-full bg-primary-500 transition-all" :style="{ width: `${(busy.done / busy.total) * 100}%` }" />
      </div>
      <p class="text-xs text-ink-muted">{{ t('boothsPage.bulkProgress', { done: busy.done, total: busy.total }) }}</p>
    </div>

    <p v-if="groups.length === 0" class="py-4 text-center text-sm text-ink-muted">{{ t('boothsPage.noProducts') }}</p>
    <div :key="renderKey" class="space-y-3">
      <div v-for="group in groups" :key="group.id">
        <div class="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <input
            type="checkbox"
            :checked="selectionState(group.products, selectedIds) === 'all'"
            :indeterminate.prop="selectionState(group.products, selectedIds) === 'some'"
            :disabled="busy !== null"
            :aria-label="group.name"
            @change="toggleCategory(group.products, ($event.target as HTMLInputElement).checked)"
          />
          <button type="button" class="flex flex-1 items-center gap-2 text-left uppercase" :aria-expanded="!collapsed.has(group.id)" @click="toggleCollapse(group.id)">
            <span aria-hidden="true">{{ collapsed.has(group.id) ? '▸' : '▾' }}</span>
            <span>{{ group.name }}</span>
            <span class="font-normal normal-case">{{ group.products.filter((p) => selectedIds.has(p.id)).length }}/{{ group.products.length }}</span>
          </button>
        </div>
        <ul v-show="!collapsed.has(group.id)" class="divide-y divide-border-warm rounded-lg border border-border-warm">
          <li v-for="p in group.products" :key="p.id" class="flex flex-wrap items-center gap-3 px-3 py-2" :data-testid="`booth-product-${p.id}`">
            <input type="checkbox" :checked="selectedIds.has(p.id)" :disabled="busy !== null" @change="toggleProduct(p, ($event.target as HTMLInputElement).checked)" />
            <ProductImage :product="p" size="sm" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink">{{ p.name }}</p>
              <p class="text-xs text-ink-muted">
                {{ formatCurrency(p.price) }} ·
                <span v-if="stockOf(p, stock) === null">{{ t('boothsPage.noStockTracking') }}</span>
                <span v-else :class="stockOf(p, stock)! <= 0 ? 'text-danger-600' : ''">{{ t('boothsPage.stockLeft', { n: stockOf(p, stock) }) }}</span>
              </p>
            </div>
            <template v-if="selected.get(p.id)">
              <div class="text-right text-xs text-ink-muted">
                <p>{{ t('boothsPage.unitCost') }} {{ formatCurrency(econ(p).unitCost) }}</p>
                <p :class="econ(p).profit < 0 ? 'text-danger-600' : 'text-success-700'">
                  {{ t('boothsPage.profit') }} {{ formatCurrency(econ(p).profit) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <input
                  :value="selected.get(p.id)!.qty_brought"
                  type="number"
                  min="0"
                  step="any"
                  class="input w-20"
                  :aria-label="t('boothsPage.qtyBrought')"
                  @change="setQty(selected.get(p.id)!, ($event.target as HTMLInputElement).value)"
                />
                <button
                  v-if="(stockOf(p, stock) ?? 0) > 0 && selected.get(p.id)!.qty_brought !== stockOf(p, stock)"
                  type="button"
                  class="text-xs text-primary-700 hover:underline"
                  @click="setQty(selected.get(p.id)!, String(stockOf(p, stock)))"
                >
                  {{ t('boothsPage.useAllStock') }}
                </button>
              </div>
              <p
                v-if="exceedsStock(selected.get(p.id)!.qty_brought, stockOf(p, stock))"
                class="w-full rounded bg-warning-50 px-2 py-1 text-xs text-warning-700"
                data-testid="booth-over-stock"
              >
                {{ t('boothsPage.overStock', { n: stockOf(p, stock) }) }}
              </p>
            </template>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { productEconomics } from "~/lib/booths/cost";
import {
  exceedsStock,
  filterProducts,
  groupByCategory,
  selectedCount,
  selectionState,
  stockOf,
  type PickerFilter,
} from "~/lib/booths/picker";
import type { BoothProduct, Category, Product } from "~/lib/types";

const props = defineProps<{
  boothId: string;
  products: Product[];
  categories: Category[];
  stock: Map<string, number>;
  rows: BoothProduct[];
  perPiece: number;
}>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { prompt, alert } = useDialog();
const { addBoothProduct, updateBoothProduct, removeBoothProduct } = useBooths();

const filters: PickerFilter[] = ["all", "selected", "unselected", "outOfStock"];
const search = ref("");
const filter = ref<PickerFilter>("all");
const collapsed = ref(new Set<string>());
// bumped after every bulk run so checkboxes are rebuilt from data, not from what the DOM toggled to
const renderKey = ref(0);
const busy = ref<{ done: number; total: number } | null>(null);

const selected = computed(() => new Map(props.rows.map((r) => [r.product, r])));
const selectedIds = computed(() => new Set(props.rows.map((r) => r.product)));
const econ = (p: Product) => productEconomics(p, props.perPiece);
const defaultQty = (p: Product) => Math.max(props.stock.get(p.id) ?? 0, 1);

const shown = computed(() =>
  filterProducts(props.products, {
    search: search.value,
    filter: filter.value,
    selected: selectedIds.value,
    stock: props.stock,
  }),
);
const shownSelected = computed(() => shown.value.filter((p) => selectedIds.value.has(p.id)));
const inStockToAdd = computed(() =>
  shown.value.filter((p) => !selectedIds.value.has(p.id) && (stockOf(p, props.stock) ?? 0) > 0),
);
const groups = computed(() => groupByCategory(shown.value, props.categories, t("boothsPage.uncategorized")));

function toggleCollapse(id: string) {
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
}

/** Runs the calls one after another with a progress bar; a failing call does not stop the rest. One refresh at the end. */
async function runBulk(jobs: Array<() => Promise<unknown>>) {
  if (!jobs.length) return;
  busy.value = { done: 0, total: jobs.length };
  let failed = 0;
  try {
    for (const job of jobs) {
      try {
        await job();
      } catch {
        failed++;
      }
      busy.value = { done: busy.value.done + 1, total: jobs.length };
    }
  } finally {
    busy.value = null;
    renderKey.value++;
    emit("changed");
  }
  if (failed) await alert(t("boothsPage.bulkFailed", { n: failed }));
}

const add = (p: Product) => () => addBoothProduct(props.boothId, p.id, defaultQty(p));
const remove = (p: Product) => () => {
  const bp = selected.value.get(p.id);
  return bp ? removeBoothProduct(bp.id) : Promise.resolve();
};

const toggleProduct = (p: Product, checked: boolean) => {
  const has = selectedIds.value.has(p.id);
  return runBulk(checked && !has ? [add(p)] : !checked && has ? [remove(p)] : []);
};
const toggleCategory = (list: Product[], checked: boolean) =>
  runBulk(
    list
      .filter((p) => selectedIds.value.has(p.id) !== checked)
      .map((p) => (checked ? add(p) : remove(p))),
  );
const selectShown = () => runBulk(shown.value.filter((p) => !selectedIds.value.has(p.id)).map(add));
const selectShownInStock = () => runBulk(inStockToAdd.value.map(add));
const clearShown = () => runBulk(shownSelected.value.map(remove));

async function setAllQty() {
  const answer = await prompt(t("boothsPage.setAllQtyPrompt"), { defaultValue: "1" });
  const qty = Number(answer);
  if (answer === null || answer.trim() === "" || !Number.isFinite(qty) || qty < 0) return;
  await runBulk(
    shownSelected.value.flatMap((p) => {
      const bp = selected.value.get(p.id);
      return bp ? [() => updateBoothProduct(bp.id, { qty_brought: qty })] : [];
    }),
  );
}

async function setQty(bp: BoothProduct, value: string) {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0) return;
  await runBulk([() => updateBoothProduct(bp.id, { qty_brought: qty })]);
}
</script>
