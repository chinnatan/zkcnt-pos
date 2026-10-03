<template>
  <UiCraftModal :show="show" variant="paper" size="md" align="top" :close-on-backdrop="false" @close="emit('close')">
    <form class="space-y-4 p-6" data-testid="booth-create-modal" @submit.prevent="submit">
      <h3 class="text-base font-semibold text-ink">{{ t('boothsPage.createTitle') }}</h3>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.name') }}</label>
        <input
          ref="nameInput"
          v-model="form.name"
          type="text"
          required
          class="input w-full"
          data-testid="booth-create-name"
          :placeholder="t('boothsPage.createPlaceholder')"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.dates') }}</label>
        <BoothDateRangePicker v-model="form.range" :week-start="weekStart" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.boothFee') }}</label>
        <input v-model.number="form.fee" type="number" min="0" step="any" class="input w-full" />
      </div>
      <p class="text-xs text-ink-muted">{{ t('boothsPage.createSeedHint') }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button type="submit" class="btn-primary" data-testid="booth-create-submit" :disabled="!form.name.trim() || isSaving">
          {{ isSaving ? t('common.saving') : t('boothsPage.createSubmit') }}
        </button>
      </div>
    </form>
  </UiCraftModal>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import { seedBoothProducts } from "~/lib/booths/cost";
import type { DateRange } from "~/lib/booths/calendar";

const props = defineProps<{ show: boolean; initialRange?: DateRange; weekStart: number }>();
const emit = defineEmits<{ close: []; created: [id: string] }>();

const { t } = useI18n();
const { activeStoreId } = useStore();
const { createBooth } = useBooths();

const nameInput = ref<HTMLInputElement | null>(null);
const isSaving = ref(false);
const form = reactive({ name: "", range: { start: "", end: "" } as DateRange, fee: 0 });

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    form.name = "";
    form.fee = 0;
    form.range = { start: props.initialRange?.start ?? "", end: props.initialRange?.end ?? "" };
    nextTick(() => nameInput.value?.focus());
  },
);

async function submit() {
  const storeId = activeStoreId.value;
  const name = form.name.trim();
  if (!name || !storeId) return;
  isSaving.value = true;
  try {
    const [products, inventory] = await Promise.all([
      db.products.where("store").equals(storeId).toArray(),
      db.inventory.where("store").equals(storeId).toArray(),
    ]);
    const booth = await createBooth(
      {
        name,
        start_date: form.range.start,
        end_date: form.range.end || form.range.start,
        booth_fee: Number(form.fee) || 0,
      },
      seedBoothProducts(products, inventory),
    );
    emit("created", booth.id);
  } finally {
    isSaving.value = false;
  }
}
</script>
