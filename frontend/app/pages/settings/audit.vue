<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/settings" class="text-sm text-primary-600 hover:underline">
          ← {{ t('settingsPage.title') }}
        </NuxtLink>
        <h2 class="mt-1 text-lg font-semibold text-gray-800">{{ t('auditPage.title') }}</h2>
      </div>
    </div>

    <div v-if="!isOnline" class="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
      {{ t('auditPage.offlineHint') }}
    </div>

    <div v-else class="space-y-6">
      <div class="rounded-xl bg-white p-5 shadow-sm">
        <div class="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500">{{ t('auditPage.since') }}</label>
            <input
              v-model="since"
              type="datetime-local"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500">{{ t('auditPage.until') }}</label>
            <input
              v-model="until"
              type="datetime-local"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-500">{{ t('auditPage.actionFilter') }}</label>
            <select
              v-model="actionFilter"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
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
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="handleExport"
          >
            {{ t('auditPage.exportCsv') }}
          </button>
        </div>

        <div v-if="reconciliation" class="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <h3 class="mb-3 text-sm font-semibold text-gray-800">{{ t('auditPage.reconciliation') }}</h3>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p class="text-xs text-gray-500">{{ t('auditPage.ordersCount') }}</p>
              <p class="text-sm font-semibold">
                {{ reconciliation.orders.count }} {{ t('auditPage.bills') }}
                · {{ formatCurrency(reconciliation.orders.total) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500">{{ t('auditPage.auditCount') }}</p>
              <p class="text-sm font-semibold">
                {{ reconciliation.audit_order_create.count }} {{ t('auditPage.bills') }}
                · {{ formatCurrency(reconciliation.audit_order_create.total) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500">{{ t('auditPage.voided') }}</p>
              <p class="text-sm font-semibold text-red-600">
                {{ reconciliation.voided.count }} · {{ formatCurrency(reconciliation.voided.total) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500">{{ t('auditPage.refunded') }}</p>
              <p class="text-sm font-semibold text-yellow-600">
                {{ reconciliation.refunded.count }} · {{ formatCurrency(reconciliation.refunded.total) }}
              </p>
            </div>
          </div>
          <p
            class="mt-3 text-sm font-medium"
            :class="reconciliation.match ? 'text-green-600' : 'text-red-600'"
          >
            {{ reconciliation.match ? t('auditPage.matchOk') : t('auditPage.matchFail') }}
          </p>
        </div>
      </div>

      <div class="rounded-xl bg-white shadow-sm">
        <div v-if="isLoading" class="flex justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>

        <div v-else-if="error" class="py-12 text-center text-sm text-red-600">
          {{ error === 'offline' ? t('auditPage.offlineHint') : error }}
        </div>

        <div v-else-if="events.length === 0" class="py-12 text-center text-gray-400">
          {{ t('auditPage.noEvents') }}
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th class="px-4 py-3">{{ t('common.date') }}</th>
                <th class="px-4 py-3">{{ t('auditPage.actor') }}</th>
                <th class="px-4 py-3">{{ t('auditPage.action') }}</th>
                <th class="px-4 py-3">{{ t('auditPage.summary') }}</th>
                <th class="px-4 py-3">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="event in events" :key="event.id" class="hover:bg-gray-50">
                <td class="whitespace-nowrap px-4 py-3 text-gray-500">{{ formatDate(event.created) }}</td>
                <td class="px-4 py-3">{{ event.actor_name || '—' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
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
                  <span v-else-if="Object.keys(event.changes).length > 0" class="text-xs text-gray-500">
                    {{ formatChanges(event.changes) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalItems > events.length" class="border-t border-gray-100 p-4 text-center text-sm text-gray-500">
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
