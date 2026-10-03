<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-ink">{{ t('boothsPage.title') }}</h2>
      <p class="text-sm text-ink-muted">{{ t('boothsPage.subtitle') }}</p>
    </div>

    <div v-if="!isManager" class="rounded-xl bg-paper p-8 text-center shadow-sm">
      <p class="text-ink-muted">{{ t('boothsPage.managerOnly') }}</p>
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div class="space-y-6">
        <UiCraftCard variant="tag" padding="md">
          <form class="space-y-2" @submit.prevent="create">
            <label class="block text-sm font-medium text-ink">{{ t('boothsPage.createLabel') }}</label>
            <div class="flex gap-2">
              <input v-model="newName" type="text" class="input min-w-0 flex-1" :placeholder="t('boothsPage.createPlaceholder')" />
              <button type="submit" class="btn-primary" :disabled="!newName.trim() || isCreating" :aria-label="t('common.add')">+</button>
            </div>
          </form>
        </UiCraftCard>

        <UiCraftCard variant="paper" padding="md">
          <h3 class="mb-3 text-sm font-semibold text-ink">{{ t('boothsPage.listTitle') }}</h3>
          <p v-if="booths.length === 0" class="py-4 text-center text-sm text-ink-muted">{{ t('boothsPage.empty') }}</p>
          <ul class="space-y-2">
            <li
              v-for="b in booths"
              :key="b.id"
              class="cursor-pointer rounded-lg border p-3 transition-colors"
              :class="selectedId === b.id ? 'border-primary-500 bg-primary-50' : 'border-border-warm hover:bg-surface'"
              @click="selectedId = b.id"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium text-ink">{{ b.name }}</p>
                <button
                  type="button"
                  class="text-danger-600"
                  :aria-label="t('common.delete')"
                  @click.stop="remove(b)"
                >
                  🗑
                </button>
              </div>
              <p v-if="b.location" class="text-xs text-ink-muted">{{ b.location }}</p>
              <p class="text-xs text-ink-muted">
                {{ formatDateKey(b.start_date) || '—' }} – {{ formatDateKey(b.end_date) || '—' }}
                <template v-if="boothDayCount(b.start_date, b.end_date)">
                  · {{ t('boothsPage.days', { n: boothDayCount(b.start_date, b.end_date) }) }}
                </template>
              </p>
              <p class="mt-1 text-xs">
                <span class="text-ink-muted">{{ t('boothsPage.fee') }}</span> {{ formatCurrency(b.booth_fee) }}
                <span v-if="b.closed_at" class="badge ml-2">{{ t('boothsPage.closed') }}</span>
              </p>
            </li>
          </ul>
        </UiCraftCard>
      </div>

      <BoothDetail v-if="selectedId" :key="selectedId" :booth-id="selectedId" />
      <div v-else class="flex items-center justify-center rounded-xl border-2 border-dashed border-border-warm p-12 text-center text-sm text-ink-muted">
        {{ t('boothsPage.emptyDetail') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import { boothDayCount, seedBoothProducts } from "~/lib/booths/cost";
import type { Booth } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { activeStoreId, isManager } = useStore();
const { formatCurrency, formatDateKey } = useFormat();
const { confirm } = useDialog();
const { booths, fetchBooths, createBooth, deleteBooth } = useBooths();

const newName = ref("");
const isCreating = ref(false);
const selectedId = ref<string | null>(null);

onMounted(fetchBooths);
watch(activeStoreId, fetchBooths);

async function create() {
  const name = newName.value.trim();
  const storeId = activeStoreId.value;
  if (!name || !storeId) return;
  isCreating.value = true;
  try {
    const [products, inventory] = await Promise.all([
      db.products.where("store").equals(storeId).toArray(),
      db.inventory.where("store").equals(storeId).toArray(),
    ]);
    const booth = await createBooth({ name }, seedBoothProducts(products, inventory));
    newName.value = "";
    selectedId.value = booth.id;
  } finally {
    isCreating.value = false;
  }
}

async function remove(booth: Booth) {
  if (!(await confirm(t("boothsPage.confirmDelete", { name: booth.name })))) return;
  if (selectedId.value === booth.id) selectedId.value = null;
  await deleteBooth(booth.id);
}
</script>
