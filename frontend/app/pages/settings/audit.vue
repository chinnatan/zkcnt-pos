<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/settings" class="text-sm text-primary-600 hover:underline">
          ← {{ t('settingsPage.title') }}
        </NuxtLink>
        <h2 class="mt-1 text-lg font-semibold text-ink">{{ t('auditPage.title') }}</h2>
      </div>
    </div>

    <div v-if="!isOnline" class="rounded-xl bg-warning-50 p-4 text-sm text-warning-700">
      {{ t('auditPage.offlineHint') }}
    </div>

    <div v-else class="space-y-6">
      <div class="craft-card craft-card--canvas p-5">
        <div class="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.since') }}</label>
            <input
              v-model="since"
              type="datetime-local"
              class="rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.until') }}</label>
            <input
              v-model="until"
              type="datetime-local"
              class="rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.actionFilter') }}</label>
            <select
              v-model="actionFilter"
              class="rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">{{ t('auditPage.allActions') }}</option>
              <option v-for="a in actionOptions" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <button
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            @click="loadData"
          >
            {{ t('auditPage.search') }}
          </button>
          <button
            class="rounded-lg border border-border-warm px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
            @click="handleExport"
          >
            {{ t('auditPage.exportCsv') }}
          </button>
        </div>

        <div v-if="reconciliation" class="mb-6 rounded-lg border border-border-warm bg-surface p-4">
          <h3 class="mb-3 text-sm font-semibold text-ink">{{ t('auditPage.reconciliation') }}</h3>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p class="text-xs text-ink-muted">{{ t('auditPage.ordersCount') }}</p>
              <p class="text-sm font-semibold">
                {{ reconciliation.orders.count }} {{ t('auditPage.bills') }}
                · {{ formatCurrency(reconciliation.orders.total) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-ink-muted">{{ t('auditPage.auditCount') }}</p>
              <p class="text-sm font-semibold">
                {{ reconciliation.audit_order_create.count }} {{ t('auditPage.bills') }}
                · {{ formatCurrency(reconciliation.audit_order_create.total) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-ink-muted">{{ t('auditPage.voided') }}</p>
              <p class="text-sm font-semibold text-danger-500">
                {{ reconciliation.voided.count }} · {{ formatCurrency(reconciliation.voided.total) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-ink-muted">{{ t('auditPage.refunded') }}</p>
              <p class="text-sm font-semibold text-warning-500">
                {{ reconciliation.refunded.count }} · {{ formatCurrency(reconciliation.refunded.total) }}
              </p>
            </div>
          </div>
          <p
            class="mt-3 text-sm font-medium"
            :class="reconciliation.match ? 'text-accent-600' : 'text-danger-500'"
          >
            {{ reconciliation.match ? t('auditPage.matchOk') : t('auditPage.matchFail') }}
          </p>
        </div>
      </div>

      <div class="rounded-xl bg-paper shadow-sm">
        <div v-if="isLoading" class="flex justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>

        <div v-else-if="error" class="py-12 text-center text-sm text-danger-500">
          {{ error === 'offline' ? t('auditPage.offlineHint') : error }}
        </div>

        <div v-else-if="events.length === 0" class="py-12 text-center text-ink-muted">
          {{ t('auditPage.noEvents') }}
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
              <tr>
                <th class="px-4 py-3">{{ t('common.date') }}</th>
                <th class="px-4 py-3">{{ t('auditPage.actor') }}</th>
                <th class="px-4 py-3">{{ t('auditPage.action') }}</th>
                <th class="px-4 py-3">{{ t('auditPage.summary') }}</th>
                <th class="px-4 py-3">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-warm">
              <tr v-for="event in events" :key="event.id" class="hover:bg-surface">
                <td class="whitespace-nowrap px-4 py-3 text-ink-muted">{{ formatDate(event.created) }}</td>
                <td class="px-4 py-3">{{ event.actor_name || '—' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink">
                    {{ event.action }}
                  </span>
                </td>
                <td class="max-w-xs truncate px-4 py-3" :title="event.summary">{{ event.summary }}</td>
                <td class="px-4 py-3">
                  <button
                    v-if="event.entity_type === 'order'"
                    class="text-xs text-primary-600 hover:underline"
                    @click="viewOrder(event.entity_id)"
                  >
                    {{ t('common.view') }}
                  </button>
                  <span v-else-if="Object.keys(event.changes).length > 0" class="text-xs text-ink-muted">
                    {{ formatChanges(event.changes) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalItems > events.length" class="border-t border-border-warm p-4 text-center text-sm text-ink-muted">
          {{ t('auditPage.showing', { shown: events.length, total: totalItems }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency, formatDate, toDatetimeLocalValue, datetimeLocalToIso } = useFormat();
const { isManager } = useStore();
const { isOnline } = useOnlineStatus();
const {
  events,
  totalItems,
  reconciliation,
  isLoading,
  error,
  fetchEvents,
  fetchReconciliation,
  exportCsv,
} = useAuditEvents();
const { orders, fetchOrders } = useOrders();

const since = ref("");
const until = ref("");
const actionFilter = ref("");

const actionOptions = [
  "order.create",
  "order.void",
  "order.refund",
  "product.update",
  "inventory.update",
  "inventory_transaction.create",
  "store.transaction_history_clear",
  "auth.login",
  "member.add",
  "member.remove",
];

function defaultSince(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toDatetimeLocalValue(d);
}

function defaultUntil(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 1);
  return toDatetimeLocalValue(d);
}

async function loadData() {
  const sinceIso = datetimeLocalToIso(since.value);
  const untilIso = datetimeLocalToIso(until.value);
  await Promise.all([
    fetchEvents({
      since: sinceIso,
      until: untilIso,
      action: actionFilter.value || undefined,
    }),
    fetchReconciliation(sinceIso, untilIso),
  ]);
}

function handleExport() {
  exportCsv({
    since: datetimeLocalToIso(since.value),
    until: datetimeLocalToIso(until.value),
    action: actionFilter.value || undefined,
  });
}

function formatChanges(changes: Record<string, { from: unknown; to: unknown }>): string {
  return Object.entries(changes)
    .map(([k, v]) => `${k}: ${String(v.from)} → ${String(v.to)}`)
    .join(", ");
}

async function viewOrder(orderId: string) {
  await fetchOrders(100);
  const order = orders.value.find((o) => o.id === orderId);
  if (order) {
    await navigateTo({ path: "/orders", query: { view: orderId } });
  }
}

onMounted(async () => {
  if (!isManager.value) {
    await navigateTo("/settings");
    return;
  }
  since.value = defaultSince();
  until.value = defaultUntil();
  await loadData();
});
</script>
