<template>
  <UiCraftModal :show="show" variant="paper" size="lg" :close-on-backdrop="false" @close="emit('close')">
    <form class="space-y-4 p-6" data-testid="booth-close-modal" @submit.prevent="confirmClose">
      <div>
        <h3 class="text-base font-semibold text-ink">{{ t('boothsPage.closeTitle') }}</h3>
        <p class="text-xs text-ink-muted">{{ t('boothsPage.closeHint') }}</p>
      </div>
      <ul class="max-h-80 space-y-2 overflow-y-auto">
        <li v-for="row in closeRows" :key="row.bp.id" class="flex items-center gap-3">
          <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ row.name }}</span>
          <span class="text-xs text-ink-muted">{{ t('boothsPage.qtyBrought') }} {{ row.bp.qty_brought }}</span>
          <input v-model="row.left" type="number" min="0" step="any" class="input w-24" :placeholder="t('boothsPage.qtyLeft')" />
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
import type { Booth, BoothProduct, Product } from "~/lib/types";

const props = defineProps<{ show: boolean; booth: Booth; rows: BoothProduct[]; products: Product[] }>();
const emit = defineEmits<{ close: []; closed: [] }>();

const { t } = useI18n();
const { updateBooth, updateBoothProduct } = useBooths();

const isSaving = ref(false);
const closeRows = ref<Array<{ bp: BoothProduct; name: string; left: string }>>([]);

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    closeRows.value = props.rows.map((bp) => ({
      bp,
      name: props.products.find((p) => p.id === bp.product)?.name ?? bp.product,
      left: bp.qty_left == null ? "" : String(bp.qty_left),
    }));
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
