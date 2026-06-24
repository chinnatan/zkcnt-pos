<template>
  <div>
    <div v-if="!activeStore" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-ink">{{ t('dashboard.noStoreTitle') }}</h2>
        <p class="mt-2 text-ink-muted">{{ t('dashboard.noStoreDesc') }}</p>
        <NuxtLink
          to="/stores"
          class="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {{ t('dashboard.selectStore') }}
        </NuxtLink>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCraftCard variant="tag" padding="md">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-ink-muted">{{ t('dashboard.todaySales') }}</p>
              <p class="mt-1 font-display text-2xl font-bold text-ink">{{ formatCurrency(todaySales) }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <svg class="h-5 w-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </UiCraftCard>

        <UiCraftCard variant="stitched" padding="md">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-ink-muted">{{ t('dashboard.ordersToday') }}</p>
              <p class="mt-1 font-display text-2xl font-bold text-ink">{{ todayOrderCount }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <svg class="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </UiCraftCard>

        <UiCraftCard variant="polaroid" padding="sm" :tilt="-0.4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-ink-muted">{{ t('nav.products') }}</p>
              <p class="mt-1 font-display text-2xl font-bold text-ink">{{ productCount }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <svg class="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </UiCraftCard>

        <UiCraftCard variant="kraft" padding="md">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-ink-muted">{{ t('dashboard.syncStatus') }}</p>
              <p
                data-testid="sync-pending-count"
                class="mt-1 font-display text-2xl font-bold" :class="pendingSyncCount > 0 ? 'text-warning-500' : 'text-success-500'"
              >
                {{ pendingSyncCount > 0 ? t('common.pending', { count: pendingSyncCount }) : t('common.synced') }}
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-paper/80" :class="isOnline ? 'ring-1 ring-accent-200' : 'ring-1 ring-danger-100'">
              <svg class="h-5 w-5" :class="isOnline ? 'text-accent-500' : 'text-danger-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
              </svg>
            </div>
          </div>
        </UiCraftCard>
      </div>

      <UiCraftCard variant="canvas" padding="md">
        <h3 class="mb-4 text-lg font-semibold text-ink">{{ t('dashboard.quickActions') }}</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink to="/pos" class="craft-action-primary">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {{ t('dashboard.openPos') }}
          </NuxtLink>
          <NuxtLink to="/products" class="craft-action">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('dashboard.addProduct') }}
          </NuxtLink>
          <NuxtLink to="/orders" class="craft-action">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {{ t('dashboard.viewOrders') }}
          </NuxtLink>
          <NuxtLink to="/reports" class="craft-action">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {{ t('dashboard.viewReports') }}
          </NuxtLink>
        </div>
      </UiCraftCard>

      <UiCraftCard variant="ticket" padding="md">
        <h3 class="mb-4 font-display text-lg font-semibold text-ink">{{ t('dashboard.recentOrders') }}</h3>
        <div v-if="orders.length === 0" class="py-8 text-center text-ink-muted">
          {{ t('dashboard.noOrders') }}
        </div>
        <div v-else>
          <UiMobileDataList>
            <template #table>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-border-warm text-xs uppercase text-ink-muted">
                    <tr>
                      <th class="px-4 py-3">{{ t('dashboard.orderNumber') }}</th>
                      <th class="px-4 py-3">{{ t('common.total') }}</th>
                      <th class="px-4 py-3">{{ t('common.payment') }}</th>
                      <th class="px-4 py-3">{{ t('common.status') }}</th>
                      <th class="px-4 py-3">{{ t('common.time') }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border-warm">
                    <tr v-for="order in orders.slice(0, 10)" :key="order.id" class="hover:bg-surface">
                      <td class="px-4 py-3 font-medium text-ink">{{ order.order_number }}</td>
                      <td class="px-4 py-3">{{ formatCurrency(order.total) }}</td>
                      <td class="px-4 py-3">
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="paymentBadge(order.payment_method)">
                          {{ paymentLabel(order.payment_method) }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(order.status)">
                          {{ statusLabel(order.status) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-ink-muted">{{ formatTime(order.created) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <template #cards>
              <UiMobileDataCard
                v-for="order in orders.slice(0, 10)"
                :key="order.id"
                :title="order.order_number"
                :subtitle="formatTime(order.created)"
              >
                <template #badge>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(order.status)">
                    {{ statusLabel(order.status) }}
                  </span>
                </template>
                <template #fields>
                  <div>
                    <span class="text-ink-muted">{{ t('common.total') }}</span>
                    <p class="font-semibold text-ink">{{ formatCurrency(order.total) }}</p>
                  </div>
                  <div>
                    <span class="text-ink-muted">{{ t('common.payment') }}</span>
                    <p>
                      <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="paymentBadge(order.payment_method)">
                        {{ paymentLabel(order.payment_method) }}
                      </span>
                    </p>
                  </div>
                </template>
              </UiMobileDataCard>
            </template>
          </UiMobileDataList>
        </div>
      </UiCraftCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import { orderStatusBadge, paymentMethodBadge } from "~/lib/ui/statusColors";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency, formatTime } = useFormat();
const { statusLabel, paymentLabel } = useLabels();
const { activeStore, activeStoreId } = useStore();
const { isOnline } = useOnlineStatus();
const { pendingSyncCount } = useSync();
const { orders, fetchOrders } = useOrders();

const todaySales = ref(0);
const todayOrderCount = ref(0);
const productCount = ref(0);

function statusBadge(status: string) {
  return orderStatusBadge(status);
}

function paymentBadge(method: string) {
  return paymentMethodBadge(method);
}

async function loadDashboardData() {
  if (!activeStoreId.value) return;

  await fetchOrders(10);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.value.filter(
    (o) => o.created.startsWith(today) && o.status === "completed",
  );
  todaySales.value = todayOrders.reduce((sum, o) => sum + o.total, 0);
  todayOrderCount.value = todayOrders.length;

  productCount.value = await db.products.where("store").equals(activeStoreId.value).count();
}

onMounted(() => {
  if (activeStoreId.value) {
    loadDashboardData();
  }
});

watch(activeStoreId, () => {
  if (activeStoreId.value) {
    loadDashboardData();
  }
});
</script>
