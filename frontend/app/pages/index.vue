<template>
  <div>
    <div v-if="!activeStore" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-700">{{ t('dashboard.noStoreTitle') }}</h2>
        <p class="mt-2 text-gray-500">{{ t('dashboard.noStoreDesc') }}</p>
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
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">{{ t('dashboard.todaySales') }}</p>
              <p class="mt-1 text-2xl font-bold text-gray-900">{{ formatCurrency(todaySales) }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">{{ t('dashboard.ordersToday') }}</p>
              <p class="mt-1 text-2xl font-bold text-gray-900">{{ todayOrderCount }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">{{ t('nav.products') }}</p>
              <p class="mt-1 text-2xl font-bold text-gray-900">{{ productCount }}</p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <svg class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">{{ t('dashboard.syncStatus') }}</p>
              <p class="mt-1 text-2xl font-bold" :class="pendingSyncCount > 0 ? 'text-warning-500' : 'text-success-500'">
                {{ pendingSyncCount > 0 ? t('common.pending', { count: pendingSyncCount }) : t('common.synced') }}
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg" :class="isOnline ? 'bg-green-100' : 'bg-red-100'">
              <svg class="h-5 w-5" :class="isOnline ? 'text-green-600' : 'text-red-600'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl bg-white p-5 shadow-sm">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">{{ t('dashboard.quickActions') }}</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            to="/pos"
            class="flex items-center gap-3 rounded-lg border-2 border-primary-200 bg-primary-50 p-4 font-medium text-primary-700 transition hover:bg-primary-100"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {{ t('dashboard.openPos') }}
          </NuxtLink>
          <NuxtLink
            to="/products"
            class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('dashboard.addProduct') }}
          </NuxtLink>
          <NuxtLink
            to="/orders"
            class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {{ t('dashboard.viewOrders') }}
          </NuxtLink>
          <NuxtLink
            to="/reports"
            class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {{ t('dashboard.viewReports') }}
          </NuxtLink>
        </div>
      </div>

      <div class="rounded-xl bg-white p-5 shadow-sm">
        <h3 class="mb-4 text-lg font-semibold text-gray-800">{{ t('dashboard.recentOrders') }}</h3>
        <div v-if="orders.length === 0" class="py-8 text-center text-gray-400">
          {{ t('dashboard.noOrders') }}
        </div>
        <div v-else>
          <UiMobileDataList>
            <template #table>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th class="px-4 py-3">{{ t('dashboard.orderNumber') }}</th>
                      <th class="px-4 py-3">{{ t('common.total') }}</th>
                      <th class="px-4 py-3">{{ t('common.payment') }}</th>
                      <th class="px-4 py-3">{{ t('common.status') }}</th>
                      <th class="px-4 py-3">{{ t('common.time') }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="order in orders.slice(0, 10)" :key="order.id" class="hover:bg-gray-50">
                      <td class="px-4 py-3 font-medium text-gray-900">{{ order.order_number }}</td>
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
                      <td class="px-4 py-3 text-gray-500">{{ formatTime(order.created) }}</td>
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
                    <span class="text-gray-400">{{ t('common.total') }}</span>
                    <p class="font-semibold text-gray-900">{{ formatCurrency(order.total) }}</p>
                  </div>
                  <div>
                    <span class="text-gray-400">{{ t('common.payment') }}</span>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";

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
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    voided: "bg-red-100 text-red-700",
    refunded: "bg-yellow-100 text-yellow-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

function paymentBadge(method: string) {
  const map: Record<string, string> = {
    cash: "bg-green-100 text-green-700",
    qr: "bg-blue-100 text-blue-700",
  };
  return map[method] || "bg-gray-100 text-gray-700";
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
