<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <h2 class="text-lg font-semibold text-gray-800">{{ t('reportsPage.title') }}</h2>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <select
          v-model="period"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none sm:w-auto"
        >
          <option value="today">{{ t('reportsPage.today') }}</option>
          <option value="week">{{ t('reportsPage.thisWeek') }}</option>
          <option value="month">{{ t('reportsPage.thisMonth') }}</option>
          <option value="custom">{{ t('reportsPage.customRange') }}</option>
        </select>
        <template v-if="period === 'custom'">
          <input
            v-model="customSince"
            type="datetime-local"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none sm:w-auto"
          />
          <input
            v-model="customUntil"
            type="datetime-local"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none sm:w-auto"
          />
        </template>
        <button
          type="button"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          :disabled="!data || isLoading"
          @click="exportCsv"
        >
          {{ t('reportsPage.exportCsv') }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <div v-else-if="error" class="rounded-xl bg-red-50 p-6 text-center text-red-600">
      {{ error }}
    </div>

    <template v-else-if="data">
      <!-- KPI Row 1 -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.totalSales') }}</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ formatCurrency(data.summary.totalSales) }}</p>
          <p
            v-if="data.summary.salesChangePct !== null"
            class="mt-1 text-xs"
            :class="data.summary.salesChangePct >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            {{ formatChangePct(data.summary.salesChangePct) }}
          </p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.totalOrders') }}</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ data.summary.totalOrders }}</p>
          <p
            v-if="data.summary.ordersChangePct !== null"
            class="mt-1 text-xs"
            :class="data.summary.ordersChangePct >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            {{ formatChangePct(data.summary.ordersChangePct) }}
          </p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.averageOrder') }}</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ formatCurrency(data.summary.averageOrder) }}</p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.netSales') }}</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ formatCurrency(data.summary.netSales) }}</p>
        </div>
      </div>

      <!-- KPI Row 2: Finance -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.totalTax') }}</p>
          <p class="mt-1 text-xl font-bold text-gray-900">{{ formatCurrency(data.summary.totalTax) }}</p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.totalDiscount') }}</p>
          <p class="mt-1 text-xl font-bold text-gray-900">{{ formatCurrency(data.summary.totalDiscount) }}</p>
          <p class="mt-0.5 text-xs text-gray-400">
            {{ t('reportsPage.discountOrders', { count: data.summary.discountOrderCount }) }}
          </p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.voidRefund') }}</p>
          <p class="mt-1 text-xl font-bold text-gray-900">
            {{ data.summary.voidedCount + data.summary.refundedCount }}
          </p>
          <p class="mt-0.5 text-xs text-gray-400">
            {{ formatCurrency(data.summary.voidedTotal + data.summary.refundedTotal) }}
          </p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.peakHour') }}</p>
          <p class="mt-1 text-xl font-bold text-gray-900">
            {{ data.summary.peakHourLabel ?? t('reportsPage.noData') }}
          </p>
        </div>
      </div>

      <!-- Charts + Payment -->
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <h3 class="mb-4 text-base font-semibold text-gray-800">{{ t('reportsPage.salesTrend') }}</h3>
          <ReportsSalesChart
            v-if="data.timeSeries.length > 0"
            :points="data.timeSeries"
            :label="t('reportsPage.totalSales')"
          />
          <p v-else class="py-8 text-center text-gray-400">{{ t('reportsPage.noData') }}</p>
        </div>

        <div class="rounded-xl bg-white p-5 shadow-sm">
          <h3 class="mb-4 text-base font-semibold text-gray-800">{{ t('reportsPage.paymentMethods') }}</h3>
          <div class="space-y-3">
            <div v-for="pm in data.paymentBreakdown" :key="pm.method" class="flex items-center gap-3">
              <span class="w-16 text-sm font-medium text-gray-600 capitalize">{{ paymentLabel(pm.method) }}</span>
              <div class="flex-1">
                <div class="h-6 overflow-hidden rounded-full bg-gray-100">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="pm.method === 'cash' ? 'bg-green-500' : 'bg-blue-500'"
                    :style="{ width: `${pm.percentage}%` }"
                  />
                </div>
              </div>
              <span class="w-24 text-right text-sm font-medium">{{ formatCurrency(pm.total) }}</span>
              <span class="w-12 text-right text-xs text-gray-500">{{ pm.count }}x</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer mix -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.walkIn') }}</p>
          <p class="mt-1 text-xl font-bold">{{ data.summary.walkInCount }}</p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.registeredCustomers') }}</p>
          <p class="mt-1 text-xl font-bold">{{ data.summary.registeredCustomerCount }}</p>
        </div>
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">{{ t('reportsPage.avgItemsPerOrder') }}</p>
          <p class="mt-1 text-xl font-bold">{{ data.summary.avgItemsPerOrder.toFixed(1) }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="rounded-xl bg-white shadow-sm">
        <div class="flex flex-wrap border-b border-gray-100">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="px-4 py-3 text-sm font-medium transition-colors"
            :class="activeTab === tab.id ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="p-5">
          <!-- Products tab -->
          <div v-if="activeTab === 'products'">
            <div class="mb-4 flex gap-2">
              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-medium"
                :class="productSort === 'revenue' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'"
                @click="productSort = 'revenue'"
              >
                {{ t('reportsPage.byRevenue') }}
              </button>
              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-medium"
                :class="productSort === 'qty' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'"
                @click="productSort = 'qty'"
              >
                {{ t('reportsPage.byQuantity') }}
              </button>
            </div>
            <div v-if="topProducts.length === 0" class="py-6 text-center text-gray-400">
              {{ t('reportsPage.noData') }}
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(tp, i) in topProducts"
                :key="tp.productId"
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
              >
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                  {{ i + 1 }}
                </span>
                <span class="flex-1 text-sm font-medium">{{ tp.name }}</span>
                <span class="text-sm text-gray-500">{{ t('common.sold', { qty: tp.qty }) }}</span>
                <span class="text-sm font-semibold">{{ formatCurrency(tp.revenue) }}</span>
                <span class="text-xs text-green-600">{{ formatCurrency(tp.margin) }}</span>
              </div>
            </div>
          </div>

          <!-- Categories tab -->
          <div v-else-if="activeTab === 'categories'">
            <div v-if="data.categoryBreakdown.length === 0" class="py-6 text-center text-gray-400">
              {{ t('reportsPage.noData') }}
            </div>
            <div v-else class="grid gap-6 lg:grid-cols-2">
              <ReportsCategoryChart :categories="data.categoryBreakdown" />
              <div class="space-y-2">
                <div
                  v-for="cat in data.categoryBreakdown"
                  :key="cat.categoryId"
                  class="flex items-center gap-3"
                >
                  <span class="flex-1 text-sm font-medium">{{ cat.name }}</span>
                  <div class="w-32">
                    <div class="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div class="h-full rounded-full bg-primary-500" :style="{ width: `${cat.percentage}%` }" />
                    </div>
                  </div>
                  <span class="w-20 text-right text-sm">{{ formatCurrency(cat.revenue) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Customers tab -->
          <div v-else-if="activeTab === 'customers'">
            <div v-if="data.topCustomers.length === 0" class="py-6 text-center text-gray-400">
              {{ t('reportsPage.noData') }}
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(c, i) in data.topCustomers"
                :key="c.customerId"
                class="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
              >
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {{ i + 1 }}
                </span>
                <span class="flex-1 text-sm font-medium">{{ c.name }}</span>
                <span class="text-sm text-gray-500">{{ t('reportsPage.orderCount', { count: c.orderCount }) }}</span>
                <span class="text-sm font-semibold">{{ formatCurrency(c.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Cashiers tab -->
          <div v-else-if="activeTab === 'cashiers'">
            <div v-if="data.cashierLeaderboard.length === 0" class="py-6 text-center text-gray-400">
              {{ t('reportsPage.noData') }}
            </div>
            <UiMobileDataList v-else>
              <template #table>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b text-left text-gray-500">
                        <th class="pb-2 pr-4">#</th>
                        <th class="pb-2 pr-4">{{ t('reportsPage.cashier') }}</th>
                        <th class="pb-2 pr-4 text-right">{{ t('reportsPage.totalOrders') }}</th>
                        <th class="pb-2 pr-4 text-right">{{ t('reportsPage.totalSales') }}</th>
                        <th class="pb-2 pr-4 text-right">{{ t('reportsPage.averageOrder') }}</th>
                        <th class="pb-2 text-right">{{ t('reportsPage.voidRefund') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(c, i) in data.cashierLeaderboard"
                        :key="c.cashierId"
                        class="border-b border-gray-50"
                      >
                        <td class="py-2 pr-4 font-medium">{{ i + 1 }}</td>
                        <td class="py-2 pr-4">{{ c.name }}</td>
                        <td class="py-2 pr-4 text-right">{{ c.orderCount }}</td>
                        <td class="py-2 pr-4 text-right">{{ formatCurrency(c.total) }}</td>
                        <td class="py-2 pr-4 text-right">{{ formatCurrency(c.avgOrder) }}</td>
                        <td class="py-2 text-right text-red-600">{{ c.voidCount }} ({{ formatCurrency(c.voidTotal) }})</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
              <template #cards>
                <UiMobileDataCard
                  v-for="(c, i) in data.cashierLeaderboard"
                  :key="c.cashierId"
                  :title="c.name"
                  :subtitle="`#${i + 1}`"
                >
                  <template #fields>
                    <div>
                      <span class="text-gray-400">{{ t('reportsPage.totalOrders') }}</span>
                      <p class="font-medium text-gray-900">{{ c.orderCount }}</p>
                    </div>
                    <div>
                      <span class="text-gray-400">{{ t('reportsPage.totalSales') }}</span>
                      <p class="font-semibold text-gray-900">{{ formatCurrency(c.total) }}</p>
                    </div>
                    <div>
                      <span class="text-gray-400">{{ t('reportsPage.averageOrder') }}</span>
                      <p class="text-gray-600">{{ formatCurrency(c.avgOrder) }}</p>
                    </div>
                    <div>
                      <span class="text-gray-400">{{ t('reportsPage.voidRefund') }}</span>
                      <p class="text-red-600">{{ c.voidCount }} ({{ formatCurrency(c.voidTotal) }})</p>
                    </div>
                  </template>
                </UiMobileDataCard>
              </template>
            </UiMobileDataList>
          </div>
        </div>
      </div>

      <!-- Inventory -->
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl bg-white p-5 shadow-sm">
          <h3 class="mb-2 text-base font-semibold text-gray-800">{{ t('reportsPage.stockValue') }}</h3>
          <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(data.stockValue) }}</p>
          <div v-if="data.inventoryMovements" class="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div v-for="(val, key) in data.inventoryMovements" :key="key" class="rounded-lg bg-gray-50 p-2">
              <p class="text-gray-500">{{ t(`reportsPage.invTx.${key}`) }}</p>
              <p class="font-semibold">{{ val }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-white p-5 shadow-sm">
          <h3 class="mb-4 text-base font-semibold text-gray-800">{{ t('reportsPage.lowStock') }}</h3>
          <div v-if="data.lowStock.length === 0" class="py-4 text-center text-gray-400">
            {{ t('reportsPage.noLowStock') }}
          </div>
          <div v-else class="max-h-48 space-y-2 overflow-y-auto">
            <div
              v-for="item in data.lowStock"
              :key="item.productId"
              class="flex items-center justify-between rounded-lg bg-warning-500/10 px-3 py-2 text-sm"
            >
              <span class="font-medium">{{ item.name }}</span>
              <span class="text-warning-500">{{ item.quantity }} / {{ item.threshold }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Reconciliation -->
      <div v-if="data.reconciliation" class="rounded-xl bg-white p-5 shadow-sm">
        <h3 class="mb-2 text-base font-semibold text-gray-800">{{ t('reportsPage.reconciliation') }}</h3>
        <div class="flex items-center gap-3">
          <span
            class="rounded-full px-3 py-1 text-xs font-medium"
            :class="data.reconciliation.match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ data.reconciliation.match ? t('reportsPage.reconciliationMatch') : t('reportsPage.reconciliationMismatch') }}
          </span>
          <span class="text-sm text-gray-500">
            {{ t('reportsPage.reconciliationDetail', {
              orders: data.reconciliation.ordersCount,
              audit: data.reconciliation.auditCount,
            }) }}
          </span>
        </div>
      </div>
    </template>

    <div v-else class="rounded-xl bg-white p-12 text-center text-gray-400 shadow-sm">
      {{ t('reportsPage.noData') }}
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency, toDatetimeLocalValue } = useFormat();
const { paymentLabel } = useLabels();
const {
  period,
  customSince,
  customUntil,
  data,
  isLoading,
  error,
  activeTab,
  productSort,
  topProducts,
  loadReports,
  exportCsv,
  formatChangePct,
} = useReports();

const tabs = computed(() => [
  { id: "products" as const, label: t("reportsPage.tabProducts") },
  { id: "categories" as const, label: t("reportsPage.tabCategories") },
  { id: "customers" as const, label: t("reportsPage.tabCustomers") },
  { id: "cashiers" as const, label: t("reportsPage.tabCashiers") },
]);

onMounted(async () => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  customSince.value = toDatetimeLocalValue(weekAgo);
  customUntil.value = toDatetimeLocalValue(now);
  await loadReports();
});
</script>
