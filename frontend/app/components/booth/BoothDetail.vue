<template>
  <UiCraftCard v-if="booth" variant="paper" padding="none" class="relative" data-testid="booth-detail">
    <!-- header -->
    <div class="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="truncate text-base font-semibold text-ink">{{ booth.name }}</h3>
          <span class="badge" data-testid="booth-status">{{ t(`boothsPage.status.${status}`) }}</span>
        </div>
        <p class="text-xs text-ink-muted">
          {{ formatDateKey(booth.start_date) || '—' }} – {{ formatDateKey(booth.end_date) || '—' }}
          <template v-if="dayCount"> · {{ t('boothsPage.days', { n: dayCount }) }}</template>
        </p>
      </div>
      <div class="flex gap-2">
        <button v-if="!booth.closed_at" type="button" class="btn-secondary" data-testid="booth-use-at-pos" @click="useAtPos">
          {{ t('boothsPage.useAtPos') }}
        </button>
        <button type="button" class="btn-secondary" data-testid="booth-duplicate-btn" @click="emit('duplicate')">
          {{ t('boothsPage.duplicate') }}
        </button>
        <button v-if="!booth.closed_at" type="button" class="btn-secondary" data-testid="booth-close-btn" @click="showClose = true">
          {{ t('boothsPage.closeBooth') }}
        </button>
        <button v-else type="button" class="btn-secondary" data-testid="booth-reopen-btn" @click="reopen">
          {{ t('boothsPage.reopen') }}
        </button>
      </div>
    </div>

    <!-- sticky summary -->
    <dl class="sticky -top-4 z-10 grid lg:-top-6 grid-cols-2 gap-3 border-y border-border-warm bg-surface px-5 py-3 text-sm sm:grid-cols-4" data-testid="booth-summary">
      <div>
        <dt class="text-xs text-ink-muted">{{ t('boothsPage.totalCost') }}</dt>
        <dd class="font-semibold text-ink">{{ formatCurrency(totalCost) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-muted">{{ t('boothsPage.totalPieces') }}</dt>
        <dd class="font-semibold text-ink">{{ totalPieces }}</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-muted">{{ t('boothsPage.costPerPiece') }}</dt>
        <dd class="font-semibold text-ink" data-testid="booth-cost-per-piece">{{ formatCurrency(perPiece) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-muted">{{ t('boothsPage.estProfit') }}</dt>
        <dd class="font-semibold" :class="estProfit < 0 ? 'text-danger-600' : 'text-success-700'">{{ formatCurrency(estProfit) }}</dd>
      </div>
    </dl>

    <!-- tabs -->
    <div class="flex border-b border-border-warm px-3" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab"
        class="px-4 py-3 text-sm font-medium transition-colors"
        :class="activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600' : 'text-ink-muted hover:text-ink'"
        :data-testid="`booth-tab-${tab}`"
        @click="activeTab = tab"
      >
        {{ t(`boothsPage.tab.${tab}`) }}
      </button>
    </div>

    <div class="p-5">
      <BoothInfoForm v-if="activeTab === 'info'" v-model="form" :booth="booth" :week-start="weekStart" />
      <BoothCostsForm v-else-if="activeTab === 'costs'" v-model="form" />
      <BoothProductPicker
        v-else
        :booth-id="boothId"
        :products="allProducts"
        :categories="categories"
        :stock="stock"
        :rows="rows"
        :per-piece="perPiece"
        @changed="reloadRows"
      />
    </div>

    <!-- unsaved changes bar -->
    <div
      v-if="dirty"
      class="sticky bottom-16 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-warning-700/30 bg-warning-50 px-5 py-3 text-sm text-warning-700 lg:bottom-0"
      data-testid="booth-dirty-bar"
    >
      <span>{{ t('boothsPage.unsaved') }}</span>
      <span class="flex gap-2">
        <button type="button" class="btn-secondary" @click="resetForm">{{ t('boothsPage.discard') }}</button>
        <button type="button" class="btn-primary" :disabled="isSaving || dateError || !form.name.trim()" data-testid="booth-save" @click="save">
          {{ isSaving ? t('common.saving') : t('common.save') }}
        </button>
      </span>
    </div>
    <p v-else-if="savedFlash" class="px-5 pb-3 text-xs text-success-700" data-testid="booth-saved">✓ {{ t('boothsPage.saved') }}</p>
    <p v-if="saveError" class="px-5 pb-3 text-xs text-danger-600">{{ saveError }}</p>
    <p v-if="dateError" class="px-5 pb-3 text-xs text-danger-600">{{ t('boothsPage.dateInvalid') }}</p>

    <BoothCloseModal
      :show="showClose"
      :booth="booth"
      :rows="rows"
      :products="allProducts"
      @close="showClose = false"
      @closed="onClosed"
    />
  </UiCraftCard>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import { boothStatus } from "~/lib/booths/calendar";
import { boothCostPerPiece, boothDayCount, estimatedProfitIfSoldOut, totalBoothCost } from "~/lib/booths/cost";
import { formFromBooth, formToPatch, isFormDirty, type BoothForm } from "~/lib/booths/form";
import { getBangkokDateKey } from "~/lib/timezone";
import type { BoothProduct, Category, Product } from "~/lib/types";

const props = defineProps<{ boothId: string }>();
const emit = defineEmits<{ duplicate: [] }>();

const { t } = useI18n();
const { confirm } = useDialog();
const { activeStoreId } = useStore();
const { formatCurrency, formatDateKey } = useFormat();
const { weekStart } = useCalendarPrefs();
const { booths, updateBooth, listBoothProducts, reopenBooth } = useBooths();
const { select: selectActiveBooth } = useActiveBooth();

const booth = computed(() => booths.value.find((b) => b.id === props.boothId));
const tabs = ["info", "costs", "products"] as const;
const activeTab = ref<(typeof tabs)[number]>("info");

const form = ref<BoothForm>({ name: "", location: "", range: { start: "", end: "" }, booth_fee: 0, extra_costs: [] });
const isSaving = ref(false);
const savedFlash = ref(false);
const saveError = ref("");
const showClose = ref(false);

const allProducts = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const stock = ref(new Map<string, number>());
const rows = ref<BoothProduct[]>([]);

const status = computed(() => (booth.value ? boothStatus(booth.value, getBangkokDateKey()) : "ongoing"));
const dayCount = computed(() => (booth.value ? boothDayCount(booth.value.start_date, booth.value.end_date) : 0));
const dateError = computed(
  () => !!form.value.range.start && !!form.value.range.end && form.value.range.end < form.value.range.start,
);
const dirty = computed(() => !!booth.value && isFormDirty(form.value, booth.value));

// summary follows the draft so the numbers move while typing
const costs = computed(() => ({ booth_fee: Number(form.value.booth_fee) || 0, extra_costs: form.value.extra_costs }));
const totalCost = computed(() => totalBoothCost(costs.value));
const totalPieces = computed(() => rows.value.reduce((s, r) => s + (r.qty_brought || 0), 0));
const perPiece = computed(() => boothCostPerPiece(costs.value, rows.value));
const estProfit = computed(() => estimatedProfitIfSoldOut(costs.value, rows.value, allProducts.value));

function resetForm() {
  if (booth.value) form.value = formFromBooth(booth.value);
  saveError.value = "";
}

let reloadSeq = 0;
async function reloadRows() {
  const seq = ++reloadSeq;
  const next = await listBoothProducts(props.boothId);
  if (seq === reloadSeq) rows.value = next; // an older, slower reload must not overwrite a newer one
}

async function load() {
  const storeId = activeStoreId.value;
  if (!storeId) return;
  const [prods, cats, inv] = await Promise.all([
    db.products.where("store").equals(storeId).toArray(),
    db.categories.where("store").equals(storeId).toArray(),
    db.inventory.where("store").equals(storeId).toArray(),
  ]);
  allProducts.value = prods.filter((p) => p.is_active && !p.deleted_at).sort((a, b) => a.name.localeCompare(b.name));
  categories.value = cats
    .filter((c) => !c.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  stock.value = new Map(inv.map((i) => [i.product, i.quantity]));
  await reloadRows();
}

watch(
  () => props.boothId,
  () => {
    resetForm();
    load();
  },
  { immediate: true },
);

async function save() {
  if (dateError.value || !form.value.name.trim()) return;
  isSaving.value = true;
  saveError.value = "";
  try {
    await updateBooth(props.boothId, formToPatch(form.value));
    resetForm();
    savedFlash.value = true;
    setTimeout(() => (savedFlash.value = false), 2500);
  } catch {
    saveError.value = t("boothsPage.saveFailed");
  } finally {
    isSaving.value = false;
  }
}

async function onClosed() {
  showClose.value = false;
  await reloadRows();
}

async function reopen() {
  if (!(await confirm(t("boothsPage.reopenConfirm")))) return;
  await reopenBooth(props.boothId);
  await reloadRows();
}

function useAtPos() {
  selectActiveBooth(props.boothId);
  navigateTo("/pos");
}

defineExpose({ dirty });

// leaving this page with unsaved edits
onBeforeRouteLeave(async () => !dirty.value || (await confirm(t("boothsPage.unsavedConfirm"))));
</script>
