<template>
  <UiCraftModal
    :show="show"
    variant="label"
    size="lg"
    align="top"
    z-class="z-50"
    :close-on-backdrop="false"
    @close="emit('close')"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold text-ink">{{ t('settingsPage.clearHistoryTitle') }}</h3>
        <p class="mt-1 text-sm text-ink-muted">{{ t('settingsPage.clearHistoryKeepsStock') }}</p>
      </div>
      <button
        type="button"
        class="rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-surface"
        :disabled="isPurging"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <div class="mt-4 space-y-3">
      <label
        v-for="option in modeOptions"
        :key="option.value"
        class="flex cursor-pointer items-start gap-3 rounded-lg border border-border-warm p-3 hover:bg-surface"
        :class="mode === option.value ? 'border-primary-400 bg-primary-50/40' : ''"
      >
        <input v-model="mode" type="radio" class="mt-1" :value="option.value" />
        <span>
          <span class="block text-sm font-medium text-ink">{{ option.label }}</span>
          <span class="block text-xs text-ink-muted">{{ option.hint }}</span>
        </span>
      </label>
    </div>

    <!-- Filtered mode -->
    <div v-if="mode === 'filtered'" class="mt-4 space-y-4 border-t border-border-warm pt-4">
      <p class="text-sm font-medium text-ink">{{ t('settingsPage.clearHistoryScopes') }}</p>
      <div class="space-y-2">
        <label
          v-for="scope in scopeOptions"
          :key="scope.value"
          class="flex cursor-pointer items-start gap-2"
        >
          <input
            v-model="scopes"
            type="checkbox"
            class="mt-1 rounded border-border-warm text-primary-600 focus:ring-primary-500"
            :value="scope.value"
          />
          <span class="text-sm text-ink">{{ scope.label }}</span>
        </label>
      </div>

      <label
        v-if="scopes.includes('customers')"
        class="flex cursor-pointer items-start gap-2 rounded-lg bg-surface p-3"
      >
        <input
          v-model="deleteCustomers"
          type="checkbox"
          class="mt-1 rounded border-border-warm text-primary-600 focus:ring-primary-500"
        />
        <span class="text-sm text-ink">{{ t('settingsPage.clearHistoryDeleteCustomers') }}</span>
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('settingsPage.clearHistorySince') }}</label>
          <input
            v-model="sinceLocal"
            type="datetime-local"
            class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('settingsPage.clearHistoryUntil') }}</label>
          <input
            v-model="untilLocal"
            type="datetime-local"
            class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <p v-if="scopes.includes('orders')" class="text-xs text-ink-muted">
        {{ t('settingsPage.clearHistoryPreviewOrders', { count: filteredPreviewCount }) }}
      </p>
    </div>

    <!-- Orders pick mode -->
    <div v-if="mode === 'orders'" class="mt-4 space-y-4 border-t border-border-warm pt-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('settingsPage.clearHistorySince') }}</label>
          <input
            v-model="orderSinceLocal"
            type="datetime-local"
            class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('settingsPage.clearHistoryUntil') }}</label>
          <input
            v-model="orderUntilLocal"
            type="datetime-local"
            class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <p class="text-sm text-ink-muted">
          {{ t('settingsPage.clearHistorySelectedOrders', { count: selectedOrderIds.length, total: formatCurrency(selectedTotal) }) }}
        </p>
        <button
          type="button"
          class="text-xs font-medium text-primary-600 hover:text-primary-700"
          @click="toggleSelectAllVisible"
        >
          {{ allVisibleSelected ? t('settingsPage.clearHistoryDeselectAll') : t('settingsPage.clearHistorySelectAll') }}
        </button>
      </div>

      <div v-if="ordersLoading" class="flex justify-center py-8">
        <div class="h-7 w-7 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
      <div v-else-if="visibleOrders.length === 0" class="py-8 text-center text-sm text-ink-muted">
        {{ t('ordersPage.noOrders') }}
      </div>
      <div v-else class="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border-warm">
        <label
          v-for="order in visibleOrders"
          :key="order.id"
          class="flex cursor-pointer items-center gap-3 border-b border-border-warm px-3 py-2 last:border-b-0 hover:bg-surface"
        >
          <input
            v-model="selectedOrderIds"
            type="checkbox"
            class="rounded border-border-warm text-primary-600 focus:ring-primary-500"
            :value="order.id"
          />
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-ink">{{ order.order_number }}</span>
            <span class="block text-xs text-ink-muted">{{ formatDate(order.created) }}</span>
          </span>
          <span class="text-sm font-semibold text-ink">{{ formatCurrency(order.total) }}</span>
        </label>
      </div>
    </div>

    <!-- All mode extras -->
    <div v-if="mode === 'all'" class="mt-4 space-y-3 border-t border-border-warm pt-4">
      <p class="text-sm text-ink-muted">{{ t('settingsPage.clearHistoryDescription') }}</p>
      <label class="flex cursor-pointer items-start gap-2">
        <input
          v-model="deleteCustomers"
          type="checkbox"
          class="mt-1 rounded border-border-warm text-primary-600 focus:ring-primary-500"
        />
        <span class="text-sm text-ink">{{ t('settingsPage.clearHistoryDeleteCustomers') }}</span>
      </label>
    </div>

    <div v-if="errorMessage" class="mt-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
      {{ errorMessage }}
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <button
        type="button"
        class="rounded-lg border border-border-warm px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
        :disabled="isPurging"
        @click="emit('close')"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="rounded-lg bg-danger-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-danger-600 disabled:opacity-50"
        :disabled="isPurging || !canSubmit"
        @click="handleSubmit"
      >
        {{ isPurging ? t('common.loading') : t('settingsPage.clearHistoryButton') }}
      </button>
    </div>
  </UiCraftModal>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import type { Order } from "~/lib/types";
import type {
  ClearHistoryMode,
  ClearHistoryScope,
  ClearTransactionHistoryResult,
} from "~/composables/useStoreDataPurge";

const props = defineProps<{
  show: boolean;
  storeSlug: string;
}>();

const emit = defineEmits<{
  close: [];
  success: [result: ClearTransactionHistoryResult];
}>();

const { t } = useI18n();
const { formatCurrency, formatDate, datetimeLocalToIso } = useFormat();
const { activeStoreId } = useStore();
const { confirm, prompt } = useDialog();
const { isPurging, clearTransactionHistory } = useStoreDataPurge();

const mode = ref<ClearHistoryMode>("all");
const scopes = ref<ClearHistoryScope[]>(["orders"]);
const deleteCustomers = ref(false);
const sinceLocal = ref("");
const untilLocal = ref("");
const orderSinceLocal = ref("");
const orderUntilLocal = ref("");
const selectedOrderIds = ref<string[]>([]);
const localOrders = ref<Order[]>([]);
const ordersLoading = ref(false);
const errorMessage = ref("");

const modeOptions = computed(() => [
  {
    value: "all" as const,
    label: t("settingsPage.clearHistoryModeAll"),
    hint: t("settingsPage.clearHistoryModeAllHint"),
  },
  {
    value: "filtered" as const,
    label: t("settingsPage.clearHistoryModeFiltered"),
    hint: t("settingsPage.clearHistoryModeFilteredHint"),
  },
  {
    value: "orders" as const,
    label: t("settingsPage.clearHistoryModeOrders"),
    hint: t("settingsPage.clearHistoryModeOrdersHint"),
  },
]);

const scopeOptions = computed(() => [
  { value: "orders" as const, label: t("settingsPage.clearHistoryScopeOrders") },
  {
    value: "inventory_transactions" as const,
    label: t("settingsPage.clearHistoryScopeInventory"),
  },
  { value: "audit_events" as const, label: t("settingsPage.clearHistoryScopeAudit") },
  { value: "customers" as const, label: t("settingsPage.clearHistoryScopeCustomers") },
]);

function inRange(created: string, since: string, until: string): boolean {
  const sinceIso = since ? datetimeLocalToIso(since) : undefined;
  const untilIso = until ? datetimeLocalToIso(until) : undefined;
  if (sinceIso && created < sinceIso) return false;
  if (untilIso && created > untilIso) return false;
  return true;
}

const filteredPreviewCount = computed(() =>
  localOrders.value.filter((o) => inRange(o.created, sinceLocal.value, untilLocal.value)).length,
);

const visibleOrders = computed(() =>
  localOrders.value.filter((o) =>
    inRange(o.created, orderSinceLocal.value, orderUntilLocal.value),
  ),
);

const selectedTotal = computed(() => {
  const selected = new Set(selectedOrderIds.value);
  return localOrders.value
    .filter((o) => selected.has(o.id))
    .reduce((sum, o) => sum + (o.total ?? 0), 0);
});

const allVisibleSelected = computed(() => {
  if (visibleOrders.value.length === 0) return false;
  const selected = new Set(selectedOrderIds.value);
  return visibleOrders.value.every((o) => selected.has(o.id));
});

const canSubmit = computed(() => {
  if (mode.value === "filtered") return scopes.value.length > 0;
  if (mode.value === "orders") return selectedOrderIds.value.length > 0;
  return true;
});

async function loadLocalOrders() {
  if (!activeStoreId.value) return;
  ordersLoading.value = true;
  try {
    const rows = await db.orders
      .where("store")
      .equals(activeStoreId.value)
      .reverse()
      .sortBy("created");
    localOrders.value = rows as Order[];
  } finally {
    ordersLoading.value = false;
  }
}

function toggleSelectAllVisible() {
  if (allVisibleSelected.value) {
    const visible = new Set(visibleOrders.value.map((o) => o.id));
    selectedOrderIds.value = selectedOrderIds.value.filter((id) => !visible.has(id));
    return;
  }
  const next = new Set(selectedOrderIds.value);
  for (const order of visibleOrders.value) next.add(order.id);
  selectedOrderIds.value = [...next];
}

watch(
  () => props.show,
  async (open) => {
    if (!open) return;
    mode.value = "all";
    scopes.value = ["orders"];
    deleteCustomers.value = false;
    sinceLocal.value = "";
    untilLocal.value = "";
    orderSinceLocal.value = "";
    orderUntilLocal.value = "";
    selectedOrderIds.value = [];
    errorMessage.value = "";
    await loadLocalOrders();
  },
);

async function handleSubmit() {
  errorMessage.value = "";

  if (!(await confirm(t("settingsPage.clearHistoryConfirm"), { variant: "danger" }))) {
    return;
  }

  const slug = props.storeSlug;
  const typed = await prompt(t("settingsPage.clearHistorySlugPrompt", { slug }), {
    title: t("settingsPage.clearHistoryTitle"),
  });
  if (typed === null) return;
  if (typed.trim() !== slug) {
    errorMessage.value = t("errors.purgeFailed");
    return;
  }

  try {
    let result: ClearTransactionHistoryResult;
    if (mode.value === "all") {
      result = await clearTransactionHistory({
        confirmSlug: slug,
        mode: "all",
        deleteCustomers: deleteCustomers.value,
      });
    } else if (mode.value === "filtered") {
      result = await clearTransactionHistory({
        confirmSlug: slug,
        mode: "filtered",
        scopes: scopes.value,
        since: datetimeLocalToIso(sinceLocal.value),
        until: datetimeLocalToIso(untilLocal.value),
        deleteCustomers: deleteCustomers.value,
      });
    } else {
      result = await clearTransactionHistory({
        confirmSlug: slug,
        mode: "orders",
        orderIds: selectedOrderIds.value,
      });
    }
    emit("success", result);
    emit("close");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message === "errors.syncPendingBeforePurge") {
      errorMessage.value = t("settingsPage.clearHistorySyncHint");
    } else if (message.startsWith("errors.")) {
      errorMessage.value = t(message);
    } else {
      errorMessage.value = message || t("errors.purgeFailed");
    }
  }
}
</script>
