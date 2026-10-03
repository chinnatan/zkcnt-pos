<template>
  <UiCraftModal :show="show" variant="paper" size="lg" :close-on-backdrop="false" @close="emit('close')">
    <form class="space-y-4 p-6" data-testid="booth-close-modal" @submit.prevent="confirmClose">
      <div>
        <h3 class="text-base font-semibold text-ink">{{ t('boothsPage.closeTitle') }}</h3>
        <p class="text-xs text-ink-muted">{{ t('boothsPage.closeHint') }}</p>
      </div>
      <dl class="grid grid-cols-2 gap-3 rounded-lg bg-surface p-3 text-sm sm:grid-cols-4" data-testid="booth-close-preview">
        <div>
          <dt class="text-xs text-ink-muted">{{ t('boothsPage.previewSold') }}</dt>
          <dd class="font-semibold text-ink">{{ preview?.sold ?? 0 }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">{{ t('reportsPage.totalSales') }}</dt>
          <dd class="font-semibold text-ink">{{ formatCurrency(preview?.revenue ?? 0) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">{{ t('reportsPage.boothCosts') }}</dt>
          <dd class="font-semibold text-ink">{{ formatCurrency((preview?.cogs ?? 0) + (preview?.fixedCost ?? 0)) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">{{ t('reportsPage.boothProfit') }}</dt>
          <dd class="font-semibold" :class="(preview?.profit ?? 0) < 0 ? 'text-danger-600' : 'text-success-700'">
            {{ formatCurrency(preview?.profit ?? 0) }}
          </dd>
        </div>
      </dl>
      <ul class="max-h-80 space-y-2 overflow-y-auto">
        <li v-for="row in closeRows" :key="row.bp.id" class="flex items-center gap-3">
          <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ row.name }}</span>
          <span class="text-xs text-ink-muted">{{ t('boothsPage.qtyBrought') }} {{ row.bp.qty_brought }}</span>
          <input v-model="row.left" type="number" min="0" :max="row.bp.qty_brought" step="any" class="input w-24" :placeholder="t('boothsPage.qtyLeft')" />
        </li>
      </ul>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button type="submit" class="btn-primary" data-testid="booth-close-confirm" :disabled="isSaving">
          {{ t('boothsPage.confirmClose') }}
        </button>
      </div>
    </form>
  </UiCraftModal>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import { buildBoothReport } from "~/lib/reports/booth";
import type { Booth, BoothProduct, Product } from "~/lib/types";

const props = defineProps<{ show: boolean; booth: Booth; rows: BoothProduct[]; products: Product[] }>();
const emit = defineEmits<{ close: []; closed: [] }>();

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { updateBooth, updateBoothProduct } = useBooths();

const isSaving = ref(false);
const closeRows = ref<Array<{ bp: BoothProduct; name: string; left: string }>>([]);
const preview = ref<{ sold: number; revenue: number; cogs: number; fixedCost: number; profit: number } | null>(null);

watch(
  () => props.show,
  async (open) => {
    if (!open) return;
    preview.value = null;
    closeRows.value = props.rows.map((bp) => ({
      bp,
      name: props.products.find((p) => p.id === bp.product)?.name ?? bp.product,
      left: bp.qty_left == null ? "" : String(bp.qty_left),
    }));
    // result so far, from the orders already tagged with this booth
    const orders = await db.orders.where("booth").equals(props.booth.id).toArray();
    const items = orders.length
      ? await db.orderItems.where("order").anyOf(orders.map((o) => o.id)).toArray()
      : [];
    const row = buildBoothReport({
      booths: [props.booth],
      boothProducts: props.rows,
      orders,
      orderItems: items,
      products: props.products,
      categories: [],
      uncategorizedLabel: "",
    }).booths[0];
    if (row) {
      preview.value = {
        sold: row.products.reduce((s, p) => s + p.sold, 0),
        revenue: row.revenue,
        cogs: row.cogs,
        fixedCost: row.fixedCost,
        profit: row.profit,
      };
    }
  },
);

async function confirmClose() {
  isSaving.value = true;
  try {
    for (const row of closeRows.value) {
      if (row.left === "") continue;
      const left = Number(row.left);
      if (Number.isFinite(left) && left >= 0) await updateBoothProduct(row.bp.id, { qty_left: left });
    }
    await updateBooth(props.booth.id, { closed_at: new Date().toISOString() });
    emit("closed");
  } finally {
    isSaving.value = false;
  }
}
</script>
