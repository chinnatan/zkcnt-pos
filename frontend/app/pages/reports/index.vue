<template>
  <div class="space-y-6">
    <UiCraftCard v-if="!reportsEnabled" variant="ticket" padding="md">
      <p class="text-sm text-ink-muted">{{ t('admin.featureFlags.disabled') }}</p>
    </UiCraftCard>

    <template v-else>
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <h2 class="text-lg font-semibold text-ink">{{ t('reportsPage.title') }}</h2>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <select
          v-model="period"
          class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none sm:w-auto"
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
            class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none sm:w-auto"
          />
          <input
            v-model="customUntil"
            type="datetime-local"
            class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none sm:w-auto"
          />
        </template>
        <button
          type="button"
          class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface sm:w-auto"
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

    <div v-else-if="error" class="rounded-xl bg-danger-50 p-6 text-center text-danger-500">
      {{ error }}
    </div>

    <template v-else-if="data">
      <!-- KPI Row 1 -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="craft-card craft-card--tag p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.totalSales') }}</p>
          <p class="mt-1 text-2xl font-bold text-ink">{{ formatCurrency(data.summary.totalSales) }}</p>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{ t('reportsPage.salesFromOrders', { count: data.summary.totalOrders }) }}
          </p>
          <p
            v-if="data.summary.salesChangePct !== null"
            class="mt-1 text-xs"
            :class="data.summary.salesChangePct >= 0 ? 'text-accent-600' : 'text-danger-500'"
          >
            {{ formatChangePct(data.summary.salesChangePct) }}
          </p>
        </div>
        <div class="craft-card craft-card--stitched p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.totalOrders') }}</p>
          <p class="mt-1 text-2xl font-bold text-ink">{{ data.summary.totalOrders }}</p>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{ t('reportsPage.ordersWithSales', { amount: formatCurrency(data.summary.totalSales) }) }}
          </p>
          <p class="text-xs text-ink-muted">
            {{ t('reportsPage.ordersAvgPerBill', { amount: formatCurrency(data.summary.averageOrder) }) }}
          </p>
          <p
            v-if="data.summary.ordersChangePct !== null"
            class="mt-1 text-xs"
            :class="data.summary.ordersChangePct >= 0 ? 'text-accent-600' : 'text-danger-500'"
          >
            {{ formatChangePct(data.summary.ordersChangePct) }}
          </p>
        </div>
        <div class="craft-card craft-card--polaroid p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.averageOrder') }}</p>
          <p class="mt-1 text-2xl font-bold text-ink">{{ formatCurrency(data.summary.averageOrder) }}</p>
        </div>
        <div class="craft-card craft-card--kraft p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.grossProfit') }}</p>
          <p class="mt-1 text-2xl font-bold text-ink">{{ formatCurrency(data.summary.grossProfit) }}</p>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{
              data.summary.grossMarginPct !== null
                ? t('reportsPage.grossMarginPct', { pct: data.summary.grossMarginPct.toFixed(1) })
                : t('reportsPage.costNote')
            }}
          </p>
          <p
            v-if="data.summary.grossProfitChangePct !== null"
            class="mt-1 text-xs"
            :class="data.summary.grossProfitChangePct >= 0 ? 'text-accent-600' : 'text-danger-500'"
          >
            {{ formatChangePct(data.summary.grossProfitChangePct) }}
          </p>
        </div>
      </div>

      <!-- Sales breakdown waterfall -->
      <div class="craft-card craft-card--paper p-5">
        <h3 class="mb-4 text-base font-semibold text-ink">{{ t('reportsPage.salesBreakdown') }}</h3>
        <div class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-4">
            <span class="text-ink-muted">{{ t('reportsPage.subtotalBeforeDiscount') }}</span>
            <span class="font-semibold text-ink">{{ formatCurrency(data.summary.totalSubtotal) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4 text-danger-500">
            <span>− {{ t('reportsPage.totalDiscount') }}</span>
            <span class="font-semibold">{{ formatCurrency(data.summary.totalDiscount) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-ink-muted">+ {{ t('reportsPage.totalTax') }}</span>
            <span class="font-semibold text-ink">{{ formatCurrency(data.summary.totalTax) }}</span>
          </div>
          <hr class="border-border-warm" />
          <div class="flex items-center justify-between gap-4 text-base font-bold">
            <span class="text-ink">{{ t('reportsPage.totalSales') }}</span>
            <span class="text-ink">{{ formatCurrency(data.summary.totalSales) }}</span>
          </div>
        </div>
      </div>

      <!-- KPI Row 2: Finance -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="craft-card craft-card--canvas p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.netSales') }}</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ formatCurrency(data.summary.netSales) }}</p>
        </div>
        <div class="craft-card craft-card--ticket p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.totalTax') }}</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ formatCurrency(data.summary.totalTax) }}</p>
        </div>
        <div class="craft-card craft-card--label p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.totalDiscount') }}</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ formatCurrency(data.summary.totalDiscount) }}</p>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{ t('reportsPage.discountOrders', { count: data.summary.discountOrderCount }) }}
          </p>
        </div>
        <div class="craft-card craft-card--paper p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.peakHour') }}</p>
          <p class="mt-1 text-xl font-bold text-ink">
            {{ data.summary.peakHourLabel ?? t('reportsPage.noData') }}
          </p>
        </div>
      </div>

      <!-- Void / Refund separate + Compare period -->
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="craft-card craft-card--stitched p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.voided') }}</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ data.summary.voidedCount }}</p>
          <p class="mt-0.5 text-xs text-danger-500">{{ formatCurrency(data.summary.voidedTotal) }}</p>
        </div>
        <div class="craft-card craft-card--label p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.refunded') }}</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ data.summary.refundedCount }}</p>
          <p class="mt-0.5 text-xs text-danger-500">{{ formatCurrency(data.summary.refundedTotal) }}</p>
        </div>
        <div v-if="data.previousSummary" class="craft-card craft-card--kraft p-5">
          <h3 class="mb-2 text-sm font-semibold text-ink">{{ t('reportsPage.comparePeriod') }}</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p class="text-ink-muted">{{ t('reportsPage.previousSales') }}</p>
              <p class="font-semibold">{{ formatCurrency(data.previousSummary.totalSales) }}</p>
            </div>
            <div>
              <p class="text-ink-muted">{{ t('reportsPage.previousOrders') }}</p>
              <p class="font-semibold">{{ data.previousSummary.totalOrders }}</p>
            </div>
            <div>
              <p class="text-ink-muted">{{ t('reportsPage.previousAov') }}</p>
              <p class="font-semibold">{{ formatCurrency(data.previousSummary.averageOrder) }}</p>
            </div>
            <div>
              <p class="text-ink-muted">{{ t('reportsPage.previousProfit') }}</p>
              <p class="font-semibold">{{ formatCurrency(data.previousSummary.grossProfit) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts + Payment -->
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="craft-card craft-card--tag p-5">
          <h3 class="mb-4 text-base font-semibold text-ink">{{ t('reportsPage.salesTrend') }}</h3>
          <ReportsSalesChart
            v-if="data.timeSeries.length > 0"
            :points="data.timeSeries"
            :sales-label="t('reportsPage.chartSales')"
            :orders-label="t('reportsPage.chartOrders')"
          />
          <p v-else class="py-8 text-center text-ink-muted">{{ t('reportsPage.noData') }}</p>
        </div>

        <div class="craft-card craft-card--stitched p-5">
          <h3 class="mb-4 text-base font-semibold text-ink">{{ t('reportsPage.paymentMethods') }}</h3>
          <div class="space-y-3">
            <div v-for="pm in data.paymentBreakdown" :key="pm.method" class="flex items-center gap-3">
              <span class="w-16 text-sm font-medium text-ink-muted capitalize">{{ paymentLabel(pm.method) }}</span>
              <div class="flex-1">
                <div class="h-6 overflow-hidden rounded-full bg-surface">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="pm.method === 'cash' ? 'bg-accent-500' : 'bg-primary-500'"
                    :style="{ width: `${pm.percentage}%` }"
                  />
                </div>
              </div>
              <span class="w-24 text-right text-sm font-medium">{{ formatCurrency(pm.total) }}</span>
              <span class="w-12 text-right text-xs text-ink-muted">{{ pm.count }}x</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Day of week + Heatmap -->
      <div v-if="data.dayOfWeekBreakdown?.length" class="grid gap-4 lg:grid-cols-2">
        <div class="craft-card craft-card--canvas p-5">
          <h3 class="mb-4 text-base font-semibold text-ink">{{ t('reportsPage.dayOfWeek') }}</h3>
          <div class="space-y-2">
            <div
              v-for="dow in data.dayOfWeekBreakdown"
              :key="dow.day"
              class="flex items-center gap-3"
            >
              <span class="w-10 text-sm text-ink-muted">{{ dayLabels[dow.day] ?? dow.label }}</span>
              <div class="flex-1">
                <div class="h-4 overflow-hidden rounded-full bg-surface">
                  <div
                    class="h-full rounded-full bg-primary-500"
                    :style="{ width: `${dayOfWeekPct(dow.total)}%` }"
                  />
                </div>
              </div>
              <span class="w-24 text-right text-sm">{{ formatCurrency(dow.total) }}</span>
              <span class="w-16 text-right text-xs text-ink-muted">
                {{ t('reportsPage.dayOrderCount', { count: dow.count }) }}
              </span>
            </div>
          </div>
        </div>
        <div class="craft-card craft-card--paper p-5">
          <h3 class="mb-4 text-base font-semibold text-ink">{{ t('reportsPage.hourlyHeatmap') }}</h3>
          <ReportsHourlyHeatmap
            v-if="data.hourlyHeatmap?.length"
            :cells="data.hourlyHeatmap"
            :day-labels="dayLabels"
            :sales-mode-label="t('reportsPage.heatmapModeSales')"
            :orders-mode-label="t('reportsPage.heatmapModeOrders')"
            :mode-label="t('reportsPage.heatmapModeLabel')"
          />
          <p v-else class="py-8 text-center text-ink-muted">{{ t('reportsPage.noData') }}</p>
        </div>
      </div>

      <!-- Sales mix + cash drawer -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <template v-if="customersEnabled">
          <div class="craft-card craft-card--polaroid p-5">
            <p class="text-sm text-ink-muted">{{ t('reportsPage.walkIn') }}</p>
            <p class="mt-1 text-xl font-bold">{{ data.summary.walkInCount }}</p>
          </div>
          <div class="craft-card craft-card--kraft p-5">
            <p class="text-sm text-ink-muted">{{ t('reportsPage.newCustomers') }}</p>
            <p class="mt-1 text-xl font-bold">{{ data.summary.newCustomerCount }}</p>
            <p class="mt-0.5 text-xs text-ink-muted">
              {{ t('reportsPage.returningCustomers') }}: {{ data.summary.returningCustomerCount }}
            </p>
          </div>
        </template>
        <div class="craft-card craft-card--canvas p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.totalItemsSold') }}</p>
          <p class="mt-1 text-xl font-bold">{{ data.summary.totalItemsSold }}</p>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{ t('reportsPage.uniqueProductsSold') }}: {{ data.summary.uniqueProductsSold }}
          </p>
        </div>
        <div class="craft-card craft-card--ticket p-5">
          <p class="text-sm text-ink-muted">{{ t('reportsPage.avgItemsPerOrder') }}</p>
          <p class="mt-1 text-xl font-bold">{{ data.summary.avgItemsPerOrder.toFixed(1) }}</p>
        </div>
        <div class="craft-card craft-card--label p-5">
          <h3 class="mb-2 text-sm font-semibold text-ink">{{ t('reportsPage.cashDrawer') }}</h3>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between gap-2">
              <span class="text-ink-muted">{{ t('reportsPage.cashSales') }}</span>
              <span class="font-medium">{{ formatCurrency(data.summary.cashSales) }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-ink-muted">{{ t('reportsPage.cashReceived') }}</span>
              <span class="font-medium">{{ formatCurrency(data.summary.cashReceived) }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-ink-muted">{{ t('reportsPage.changeGiven') }}</span>
              <span class="font-medium">{{ formatCurrency(data.summary.totalChange) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="rounded-xl bg-paper shadow-sm">
        <div class="flex flex-wrap border-b border-border-warm">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="px-4 py-3 text-sm font-medium transition-colors"
            :class="activeTab === tab.id ? 'border-b-2 border-primary-600 text-primary-600' : 'text-ink-muted hover:text-ink'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="p-5">
          <!-- Products tab -->
          <div v-if="activeTab === 'products'">
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="sort in productSortOptions"
                  :key="sort.id"
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-xs font-medium"
                  :class="productSort === sort.id ? 'bg-primary-100 text-primary-700' : 'bg-surface text-ink-muted'"
                  @click="productSort = sort.id"
                >
                  {{ sort.label }}
                </button>
              </div>
              <input
                v-model="productSearch"
                type="search"
                :placeholder="t('reportsPage.searchProducts')"
                class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none sm:w-64"
              />
            </div>
            <div v-if="filteredProducts.length === 0" class="py-6 text-center text-ink-muted">
              {{ t('reportsPage.noData') }}
            </div>
            <UiMobileDataList v-else>
              <template #table>
                <div class="max-h-96 overflow-auto">
                  <table class="w-full text-sm">
                    <thead class="sticky top-0 bg-paper">
                      <tr class="border-b text-left text-ink-muted">
                        <th class="pb-2 pr-3">#</th>
                        <th class="pb-2 pr-3">{{ t('reportsPage.product') }}</th>
                        <th class="pb-2 pr-3">{{ t('reportsPage.sku') }}</th>
                        <th class="pb-2 pr-3 text-right">{{ t('reportsPage.qty') }}</th>
                        <th class="pb-2 pr-3 text-right">{{ t('reportsPage.revenue') }}</th>
                        <th class="pb-2 text-right">{{ t('reportsPage.margin') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(tp, i) in filteredProducts"
                        :key="tp.productId"
                        class="border-b border-surface"
                      >
                        <td class="py-2 pr-3 text-ink-muted">{{ i + 1 }}</td>
                        <td class="py-2 pr-3 font-medium">{{ tp.name }}</td>
                        <td class="py-2 pr-3 text-ink-muted">{{ tp.sku || '—' }}</td>
                        <td class="py-2 pr-3 text-right">{{ tp.qty }}</td>
                        <td class="py-2 pr-3 text-right">{{ formatCurrency(tp.revenue) }}</td>
                        <td class="py-2 text-right text-accent-600">{{ formatCurrency(tp.margin) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
              <template #cards>
                <UiMobileDataCard
                  v-for="(tp, i) in filteredProducts"
                  :key="tp.productId"
                  :title="tp.name"
                  :subtitle="`#${i + 1}${tp.sku ? ` · ${tp.sku}` : ''}`"
                >
                  <template #fields>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.qty') }}</span>
                      <p class="font-medium text-ink">{{ tp.qty }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.revenue') }}</span>
                      <p class="font-semibold text-ink">{{ formatCurrency(tp.revenue) }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.margin') }}</span>
                      <p class="text-accent-600">{{ formatCurrency(tp.margin) }}</p>
                    </div>
                  </template>
                </UiMobileDataCard>
              </template>
            </UiMobileDataList>
          </div>

          <!-- Dead stock tab -->
          <div v-else-if="activeTab === 'deadStock'">
            <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-ink-muted">{{ t('reportsPage.deadStockHint') }}</p>
              <input
                v-model="deadStockSearch"
                type="search"
                :placeholder="t('reportsPage.searchProducts')"
                class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none sm:w-64"
              />
            </div>
            <div v-if="filteredDeadStock.length === 0" class="py-6 text-center text-ink-muted">
              {{ t('reportsPage.noDeadStock') }}
            </div>
            <div v-else class="max-h-96 space-y-2 overflow-y-auto">
              <div
                v-for="item in filteredDeadStock"
                :key="item.productId"
                class="flex flex-wrap items-center gap-2 rounded-lg p-2 hover:bg-surface sm:flex-nowrap sm:gap-3"
              >
                <span class="min-w-0 flex-1 text-sm font-medium">{{ item.name }}</span>
                <span class="text-xs text-ink-muted">{{ item.categoryName }}</span>
                <span class="text-sm text-ink-muted">{{ t('reportsPage.stockQty', { qty: item.quantity }) }}</span>
                <span class="text-sm font-semibold">{{ formatCurrency(item.price) }}</span>
              </div>
            </div>
          </div>

          <!-- Categories tab with drill-down -->
          <div v-else-if="activeTab === 'categories'">
            <div v-if="data.categoryBreakdown.length === 0" class="py-6 text-center text-ink-muted">
              {{ t('reportsPage.noData') }}
            </div>
            <div v-else class="grid gap-6 lg:grid-cols-2">
              <ReportsCategoryChart :categories="data.categoryBreakdown" />
              <div class="space-y-2">
                <p class="mb-2 text-xs text-ink-muted">{{ t('reportsPage.categoryDrillHint') }}</p>
                <div
                  v-for="cat in data.categoryBreakdown"
                  :key="cat.categoryId"
                  class="rounded-lg border border-transparent"
                  :class="expandedCategoryId === cat.categoryId ? 'border-border-warm bg-surface/60' : ''"
                >
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface"
                    @click="toggleCategory(cat.categoryId)"
                  >
                    <span class="flex-1 text-sm font-medium">{{ cat.name }}</span>
                    <span class="text-xs text-accent-600">{{ formatCurrency(cat.margin) }}</span>
                    <div class="w-24">
                      <div class="h-2 overflow-hidden rounded-full bg-surface">
                        <div class="h-full rounded-full bg-primary-500" :style="{ width: `${cat.percentage}%` }" />
                      </div>
                    </div>
                    <span class="w-20 text-right text-sm">{{ formatCurrency(cat.revenue) }}</span>
                    <span class="text-ink-muted">{{ expandedCategoryId === cat.categoryId ? '▾' : '▸' }}</span>
                  </button>
                  <div
                    v-if="expandedCategoryId === cat.categoryId"
                    class="space-y-1 border-t border-border-warm px-2 pb-2 pt-1"
                  >
                    <div
                      v-if="!cat.products?.length"
                      class="py-2 text-center text-xs text-ink-muted"
                    >
                      {{ t('reportsPage.noData') }}
                    </div>
                    <div
                      v-for="(prod, i) in cat.products"
                      :key="prod.productId"
                      class="flex items-center gap-2 rounded px-1 py-1.5 text-sm"
                    >
                      <span class="w-5 text-xs text-ink-muted">{{ i + 1 }}</span>
                      <span class="min-w-0 flex-1 truncate font-medium">{{ prod.name }}</span>
                      <span class="text-xs text-ink-muted">{{ t('common.sold', { qty: prod.qty }) }}</span>
                      <span class="font-semibold">{{ formatCurrency(prod.revenue) }}</span>
                      <span class="text-xs text-accent-600">{{ formatCurrency(prod.margin) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Customers tab -->
          <div v-else-if="customersEnabled && activeTab === 'customers'">
            <div class="mb-6">
              <h4 class="mb-3 text-sm font-semibold text-ink">{{ t('reportsPage.topCustomers') }}</h4>
              <div v-if="data.topCustomers.length === 0" class="py-4 text-center text-ink-muted">
                {{ t('reportsPage.noData') }}
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="(c, i) in data.topCustomers"
                  :key="c.customerId"
                  class="flex items-center gap-3 rounded-lg p-2 hover:bg-surface"
                >
                  <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                    {{ i + 1 }}
                  </span>
                  <span class="flex-1 text-sm font-medium">{{ c.name }}</span>
                  <span class="text-sm text-ink-muted">{{ t('reportsPage.orderCount', { count: c.orderCount }) }}</span>
                  <span class="text-sm font-semibold">{{ formatCurrency(c.total) }}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 class="mb-2 text-sm font-semibold text-ink">{{ t('reportsPage.lapsedCustomers') }}</h4>
              <p class="mb-3 text-xs text-ink-muted">{{ t('reportsPage.lapsedHint') }}</p>
              <div v-if="!data.lapsedCustomers?.length" class="py-4 text-center text-ink-muted">
                {{ t('reportsPage.noLapsedCustomers') }}
              </div>
              <div v-else class="max-h-64 space-y-2 overflow-y-auto">
                <div
                  v-for="c in data.lapsedCustomers"
                  :key="c.customerId"
                  class="flex flex-wrap items-center gap-2 rounded-lg p-2 hover:bg-surface sm:gap-3"
                >
                  <span class="min-w-0 flex-1 text-sm font-medium">{{ c.name }}</span>
                  <span class="text-xs text-ink-muted">
                    {{ t('reportsPage.lastOrder', { date: formatDateShort(c.lastOrderAt) }) }}
                  </span>
                  <span class="text-sm text-ink-muted">{{ t('reportsPage.visitCount', { count: c.visitCount }) }}</span>
                  <span class="text-sm font-semibold">{{ formatCurrency(c.totalSpent) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Cashiers tab -->
          <div v-else-if="activeTab === 'cashiers'">
            <div v-if="data.cashierLeaderboard.length === 0" class="py-6 text-center text-ink-muted">
              {{ t('reportsPage.noData') }}
            </div>
            <UiMobileDataList v-else>
              <template #table>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b text-left text-ink-muted">
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
                        class="border-b border-surface"
                      >
                        <td class="py-2 pr-4 font-medium">{{ i + 1 }}</td>
                        <td class="py-2 pr-4">{{ c.name }}</td>
                        <td class="py-2 pr-4 text-right">{{ c.orderCount }}</td>
                        <td class="py-2 pr-4 text-right">{{ formatCurrency(c.total) }}</td>
                        <td class="py-2 pr-4 text-right">{{ formatCurrency(c.avgOrder) }}</td>
                        <td class="py-2 text-right text-danger-500">{{ c.voidCount }} ({{ formatCurrency(c.voidTotal) }})</td>
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
                      <span class="text-ink-muted">{{ t('reportsPage.totalOrders') }}</span>
                      <p class="font-medium text-ink">{{ c.orderCount }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.totalSales') }}</span>
                      <p class="font-semibold text-ink">{{ formatCurrency(c.total) }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.averageOrder') }}</span>
                      <p class="text-ink-muted">{{ formatCurrency(c.avgOrder) }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.voidRefund') }}</span>
                      <p class="text-danger-500">{{ c.voidCount }} ({{ formatCurrency(c.voidTotal) }})</p>
                    </div>
                  </template>
                </UiMobileDataCard>
              </template>
            </UiMobileDataList>
          </div>

          <!-- Orders tab -->
          <div v-else-if="activeTab === 'orders'">
            <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-ink-muted">{{ t('reportsPage.ordersInPeriod') }}</p>
              <select
                v-model="orderStatusFilter"
                class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none sm:w-auto"
              >
                <option value="">{{ t('status.all') }}</option>
                <option value="completed">{{ t('status.completed') }}</option>
                <option value="voided">{{ t('status.voided') }}</option>
                <option value="refunded">{{ t('status.refunded') }}</option>
              </select>
            </div>
            <div v-if="filteredPeriodOrders.length === 0" class="py-6 text-center text-ink-muted">
              {{ t('reportsPage.noData') }}
            </div>
            <UiMobileDataList v-else>
              <template #table>
                <div class="max-h-96 overflow-auto">
                  <table class="w-full text-sm">
                    <thead class="sticky top-0 bg-paper">
                      <tr class="border-b text-left text-ink-muted">
                        <th class="pb-2 pr-3">{{ t('dashboard.orderNumber') }}</th>
                        <th class="pb-2 pr-3">{{ t('common.date') }}</th>
                        <th v-if="customersEnabled" class="pb-2 pr-3">{{ t('reportsPage.tabCustomers') }}</th>
                        <th class="pb-2 pr-3 text-right">{{ t('reportsPage.qty') }}</th>
                        <th class="pb-2 pr-3 text-right">{{ t('common.total') }}</th>
                        <th class="pb-2 pr-3">{{ t('common.payment') }}</th>
                        <th class="pb-2 pr-3">{{ t('common.status') }}</th>
                        <th class="pb-2">{{ t('common.actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="order in filteredPeriodOrders"
                        :key="order.orderId"
                        class="border-b border-surface"
                      >
                        <td class="py-2 pr-3 font-medium">{{ order.orderNumber }}</td>
                        <td class="py-2 pr-3 text-ink-muted">{{ formatDateShort(order.created) }}</td>
                        <td v-if="customersEnabled" class="py-2 pr-3 text-ink-muted">
                          {{ order.customerName ?? t('reportsPage.walkIn') }}
                        </td>
                        <td class="py-2 pr-3 text-right">{{ order.itemCount }}</td>
                        <td class="py-2 pr-3 text-right font-semibold">{{ formatCurrency(order.total) }}</td>
                        <td class="py-2 pr-3 capitalize text-ink-muted">{{ paymentLabel(order.paymentMethod) }}</td>
                        <td class="py-2 pr-3">
                          <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(order.status)">
                            {{ statusLabel(order.status) }}
                          </span>
                        </td>
                        <td class="py-2">
                          <button
                            type="button"
                            class="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                            @click="selectedReportOrder = order"
                          >
                            {{ t('common.view') }}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="border-t-2 border-border-warm bg-surface font-semibold text-ink">
                        <td :colspan="customersEnabled ? 3 : 2" class="py-2.5 pr-3">
                          {{ t('reportsPage.ordersTableTotal') }}
                          <span class="ml-1 text-xs font-normal text-ink-muted">
                            ({{ t('reportsPage.salesFromOrders', { count: filteredPeriodOrders.length }) }})
                          </span>
                        </td>
                        <td class="py-2.5 pr-3 text-right">{{ periodOrdersTotals.itemCount }}</td>
                        <td class="py-2.5 pr-3 text-right">{{ formatCurrency(periodOrdersTotals.total) }}</td>
                        <td colspan="3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </template>
              <template #cards>
                <UiMobileDataCard
                  v-for="order in filteredPeriodOrders"
                  :key="order.orderId"
                  :title="order.orderNumber"
                  :subtitle="formatDateShort(order.created)"
                >
                  <template #badge>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(order.status)">
                      {{ statusLabel(order.status) }}
                    </span>
                  </template>
                  <template #fields>
                    <div v-if="customersEnabled">
                      <span class="text-ink-muted">{{ t('reportsPage.tabCustomers') }}</span>
                      <p class="font-medium text-ink">{{ order.customerName ?? t('reportsPage.walkIn') }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.itemsInOrder', { count: order.itemCount }) }}</span>
                      <p class="font-medium text-ink">{{ formatCurrency(order.total) }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('common.payment') }}</span>
                      <p class="text-ink-muted capitalize">{{ paymentLabel(order.paymentMethod) }}</p>
                    </div>
                  </template>
                  <template #actions>
                    <button
                      type="button"
                      class="w-full rounded-lg bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                      @click="selectedReportOrder = order"
                    >
                      {{ t('common.view') }}
                    </button>
                  </template>
                </UiMobileDataCard>
                <div class="mt-3 rounded-lg bg-surface px-4 py-3 text-sm">
                  <div class="flex items-center justify-between font-semibold text-ink">
                    <span>{{ t('reportsPage.ordersTotalQty') }}</span>
                    <span>{{ periodOrdersTotals.itemCount }}</span>
                  </div>
                  <div class="mt-1 flex items-center justify-between text-ink-muted">
                    <span>{{ t('common.total') }}</span>
                    <span class="font-semibold text-ink">{{ formatCurrency(periodOrdersTotals.total) }}</span>
                  </div>
                </div>
              </template>
            </UiMobileDataList>
          </div>

          <!-- Promotions tab -->
          <div v-else-if="activeTab === 'promotions'">
            <div v-if="!data.promotions?.length" class="py-6 text-center text-ink-muted">
              {{ t('reportsPage.noPromotions') }}
            </div>
            <UiMobileDataList v-else>
              <template #table>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b text-left text-ink-muted">
                        <th class="pb-2 pr-4">{{ t('reportsPage.promotion') }}</th>
                        <th class="pb-2 pr-4">{{ t('reportsPage.promoType') }}</th>
                        <th class="pb-2 pr-4 text-right">{{ t('reportsPage.promoUses') }}</th>
                        <th class="pb-2 text-right">{{ t('reportsPage.promoDiscount') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="promo in data.promotions"
                        :key="promo.promotionId"
                        class="border-b border-surface"
                      >
                        <td class="py-2 pr-4">
                          <p class="font-medium">{{ promo.name }}</p>
                          <p v-if="promo.couponCode" class="text-xs text-ink-muted">{{ promo.couponCode }}</p>
                        </td>
                        <td class="py-2 pr-4 capitalize text-ink-muted">{{ promo.type }}</td>
                        <td class="py-2 pr-4 text-right">{{ promo.useCount }}</td>
                        <td class="py-2 text-right font-semibold">{{ formatCurrency(promo.discountTotal) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
              <template #cards>
                <UiMobileDataCard
                  v-for="promo in data.promotions"
                  :key="promo.promotionId"
                  :title="promo.name"
                  :subtitle="promo.couponCode || promo.type"
                >
                  <template #fields>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.promoType') }}</span>
                      <p class="font-medium capitalize text-ink">{{ promo.type }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.promoUses') }}</span>
                      <p class="font-medium text-ink">{{ promo.useCount }}</p>
                    </div>
                    <div>
                      <span class="text-ink-muted">{{ t('reportsPage.promoDiscount') }}</span>
                      <p class="font-semibold text-ink">{{ formatCurrency(promo.discountTotal) }}</p>
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
        <div class="craft-card craft-card--ticket p-5">
          <h3 class="mb-2 text-base font-semibold text-ink">{{ t('reportsPage.stockValue') }}</h3>
          <p class="text-2xl font-bold text-ink">{{ formatCurrency(data.stockValue) }}</p>
          <p v-if="data.stockValueRetail != null" class="mt-1 text-sm text-ink-muted">
            {{ t('reportsPage.stockValueRetail') }}: {{ formatCurrency(data.stockValueRetail) }}
          </p>
          <div v-if="data.inventoryMovements" class="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div v-for="(val, key) in data.inventoryMovements" :key="key" class="rounded-lg bg-surface p-2">
              <p class="text-ink-muted">{{ t(`reportsPage.invTx.${key}`) }}</p>
              <p class="font-semibold">{{ val }}</p>
            </div>
          </div>
        </div>

        <div class="craft-card craft-card--label p-5">
          <h3 class="mb-4 text-base font-semibold text-ink">{{ t('reportsPage.lowStock') }}</h3>
          <div v-if="data.lowStock.length === 0" class="py-4 text-center text-ink-muted">
            {{ t('reportsPage.noLowStock') }}
          </div>
          <div v-else class="max-h-40 space-y-2 overflow-y-auto">
            <div
              v-for="item in data.lowStock"
              :key="item.productId"
              class="flex items-center justify-between rounded-lg bg-warning-500/10 px-3 py-2 text-sm"
            >
              <span class="font-medium">{{ item.name }}</span>
              <span class="text-warning-500">{{ item.quantity }} / {{ item.threshold }}</span>
            </div>
          </div>
          <template v-if="data.lowStockFastMovers?.length">
            <h4 class="mb-2 mt-4 text-sm font-semibold text-ink">{{ t('reportsPage.fastMoversLowStock') }}</h4>
            <div class="max-h-32 space-y-2 overflow-y-auto">
              <div
                v-for="item in data.lowStockFastMovers"
                :key="`fast-${item.productId}`"
                class="flex items-center justify-between rounded-lg bg-danger-50 px-3 py-2 text-sm"
              >
                <span class="font-medium">{{ item.name }}</span>
                <span class="text-danger-500">
                  {{ t('reportsPage.soldAndStock', { sold: item.qtySold, stock: item.quantity }) }}
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Reconciliation -->
      <div v-if="data.reconciliation" class="craft-card craft-card--paper p-5">
        <h3 class="mb-2 text-base font-semibold text-ink">{{ t('reportsPage.reconciliation') }}</h3>
        <div class="flex items-center gap-3">
          <span
            class="rounded-full px-3 py-1 text-xs font-medium"
            :class="data.reconciliation.match ? 'bg-accent-100 text-accent-700' : 'bg-danger-100 text-danger-700'"
          >
            {{ data.reconciliation.match ? t('reportsPage.reconciliationMatch') : t('reportsPage.reconciliationMismatch') }}
          </span>
          <span class="text-sm text-ink-muted">
            {{ t('reportsPage.reconciliationDetail', {
              orders: data.reconciliation.ordersCount,
              audit: data.reconciliation.auditCount,
            }) }}
          </span>
        </div>
      </div>
    </template>

    <div v-else class="rounded-xl bg-paper p-12 text-center text-ink-muted shadow-sm">
      {{ t('reportsPage.noData') }}
    </div>

    <Teleport to="body">
      <div
        v-if="selectedReportOrder"
        class="craft-modal-backdrop craft-modal-backdrop--center z-50"
      >
        <div class="craft-modal-panel craft-modal--ticket max-w-lg">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ t('reportsPage.orderDetail', { number: selectedReportOrder.orderNumber }) }}
            </h3>
            <button
              type="button"
              class="text-ink-muted hover:text-ink"
              @click="selectedReportOrder = null"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.date') }}</span>
              <span>{{ formatDateShort(selectedReportOrder.created) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.status') }}</span>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(selectedReportOrder.status)">
                {{ statusLabel(selectedReportOrder.status) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.payment') }}</span>
              <span>{{ paymentLabel(selectedReportOrder.paymentMethod) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('reportsPage.cashier') }}</span>
              <span>{{ selectedReportOrder.cashierName }}</span>
            </div>
            <div v-if="customersEnabled && selectedReportOrder.customerName" class="flex justify-between">
              <span class="text-ink-muted">{{ t('reportsPage.tabCustomers') }}</span>
              <span>{{ selectedReportOrder.customerName }}</span>
            </div>
            <hr class="my-3" />
            <div
              v-for="(item, idx) in selectedReportOrder.items"
              :key="idx"
              class="flex items-center justify-between py-2"
            >
              <div>
                <span class="font-medium">{{ item.productName }}</span>
                <span class="ml-2 text-ink-muted">×{{ item.quantity }}</span>
              </div>
              <span>{{ formatCurrency(item.total) }}</span>
            </div>
            <hr class="my-3" />
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.subtotal') }}</span>
              <span>{{ formatCurrency(selectedReportOrder.subtotal) }}</span>
            </div>
            <div v-if="selectedReportOrder.discountAmount > 0" class="flex justify-between text-danger-500">
              <span>{{ t('common.discount') }}</span>
              <span>-{{ formatCurrency(selectedReportOrder.discountAmount) }}</span>
            </div>
            <div v-if="selectedReportOrder.taxAmount > 0" class="flex justify-between">
              <span class="text-ink-muted">{{ t('reportsPage.totalTax') }}</span>
              <span>{{ formatCurrency(selectedReportOrder.taxAmount) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold">
              <span>{{ t('common.total') }}</span>
              <span>{{ formatCurrency(selectedReportOrder.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CUSTOMERS_ENABLED } from "~/lib/features";
import { orderStatusBadge } from "~/lib/ui/statusColors";

definePageMeta({ middleware: "auth" });

const { t, locale } = useI18n();
const reportsEnabled = useStoreFeatureEnabled("reports_enabled");
const { formatCurrency, formatDateShort, toDatetimeLocalValue } = useFormat();
const { paymentLabel, statusLabel } = useLabels();
const {
  period,
  customSince,
  customUntil,
  data,
  isLoading,
  error,
  activeTab,
  productSort,
  productSearch,
  deadStockSearch,
  expandedCategoryId,
  orderStatusFilter,
  selectedReportOrder,
  filteredProducts,
  filteredDeadStock,
  filteredPeriodOrders,
  loadReports,
  exportCsv,
  formatChangePct,
  toggleCategory,
} = useReports();

function statusBadge(status: string) {
  return orderStatusBadge(status);
}

const customersEnabled = CUSTOMERS_ENABLED;

const periodOrdersTotals = computed(() => {
  const orders = filteredPeriodOrders.value;
  return {
    itemCount: orders.reduce((sum, order) => sum + order.itemCount, 0),
    total: orders.reduce((sum, order) => sum + order.total, 0),
  };
});

const tabs = computed(() =>
  [
    { id: "products" as const, label: t("reportsPage.tabProducts") },
    { id: "orders" as const, label: t("reportsPage.tabOrders") },
    { id: "deadStock" as const, label: t("reportsPage.tabDeadStock") },
    { id: "categories" as const, label: t("reportsPage.tabCategories") },
    { id: "customers" as const, label: t("reportsPage.tabCustomers") },
    { id: "cashiers" as const, label: t("reportsPage.tabCashiers") },
    { id: "promotions" as const, label: t("reportsPage.tabPromotions") },
  ].filter((tab) => customersEnabled || tab.id !== "customers"),
);

const productSortOptions = computed(() => [
  { id: "revenue" as const, label: t("reportsPage.byRevenue") },
  { id: "qty" as const, label: t("reportsPage.byQuantity") },
  { id: "margin" as const, label: t("reportsPage.byMargin") },
]);

const dayLabels = computed(() =>
  locale.value === "th"
    ? ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
);

const maxDayTotal = computed(() =>
  (data.value?.dayOfWeekBreakdown ?? []).reduce((max, d) => Math.max(max, d.total), 0),
);

function dayOfWeekPct(total: number): number {
  if (maxDayTotal.value <= 0) return 0;
  return (total / maxDayTotal.value) * 100;
}

onMounted(async () => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  customSince.value = toDatetimeLocalValue(weekAgo);
  customUntil.value = toDatetimeLocalValue(now);
  await loadReports();
});
</script>
