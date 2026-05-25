<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Reports</h2>
      <div class="flex items-center gap-2">
        <select
          v-model="period"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">Total Sales</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ formatCurrency(totalSales) }}</p>
      </div>
      <div class="rounded-xl bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">Total Orders</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ totalOrders }}</p>
      </div>
      <div class="rounded-xl bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">Average Order</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ formatCurrency(averageOrder) }}</p>
      </div>
    </div>

    <!-- Payment Method Breakdown -->
    <div class="rounded-xl bg-white p-5 shadow-sm">
      <h3 class="mb-4 text-base font-semibold text-gray-800">Payment Methods</h3>
      <div class="space-y-3">
        <div v-for="pm in paymentBreakdown" :key="pm.method" class="flex items-center gap-3">
          <span class="w-16 text-sm font-medium text-gray-600 capitalize">{{ pm.method }}</span>
          <div class="flex-1">
            <div class="h-6 overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full rounded-full transition-all"
                :class="pm.method === 'cash' ? 'bg-green-500' : pm.method === 'qr' ? 'bg-blue-500' : 'bg-purple-500'"
                :style="{ width: `${pm.percentage}%` }"
              />
            </div>
          </div>
          <span class="w-24 text-right text-sm font-medium">{{ formatCurrency(pm.total) }}</span>
          <span class="w-12 text-right text-xs text-gray-500">{{ pm.count }}x</span>
        </div>
      </div>
    </div>

    <!-- Top Products -->
    <div class="rounded-xl bg-white p-5 shadow-sm">
      <h3 class="mb-4 text-base font-semibold text-gray-800">Top Selling Products</h3>
      <div v-if="topProducts.length === 0" class="py-6 text-center text-gray-400">
        No data available
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="(tp, i) in topProducts"
          :key="tp.name"
          class="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
        >
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            {{ i + 1 }}
          </span>
          <span class="flex-1 text-sm font-medium">{{ tp.name }}</span>
          <span class="text-sm text-gray-500">{{ tp.qty }} sold</span>
          <span class="text-sm font-semibold">{{ formatCurrency(tp.revenue) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";

definePageMeta({ middleware: "auth" });

const { activeStoreId } = useStore();
const { orders, fetchOrders } = useOrders();

const period = ref("today");

const filteredOrders = computed(() => {
  const now = new Date();
  let start: Date;

  switch (period.value) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return orders.value.filter(
    (o) => o.status === "completed" && new Date(o.created) >= start
  );
});

const totalSales = computed(() => filteredOrders.value.reduce((sum, o) => sum + o.total, 0));
const totalOrders = computed(() => filteredOrders.value.length);
const averageOrder = computed(() => (totalOrders.value > 0 ? totalSales.value / totalOrders.value : 0));

const paymentBreakdown = computed(() => {
  const methods = ["cash", "qr", "card"];
  return methods.map((method) => {
    const methodOrders = filteredOrders.value.filter((o) => o.payment_method === method);
    const total = methodOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      method,
      count: methodOrders.length,
      total,
      percentage: totalSales.value > 0 ? (total / totalSales.value) * 100 : 0,
    };
  });
});

const topProducts = ref<Array<{ name: string; qty: number; revenue: number }>>([]);

async function loadTopProducts() {
  if (!activeStoreId.value) return;
  const allItems = await db.orderItems.toArray();
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();

  for (const item of allItems) {
    const existing = productMap.get(item.product_name) || { name: item.product_name, qty: 0, revenue: 0 };
    existing.qty += item.quantity;
    existing.revenue += item.total;
    productMap.set(item.product_name, existing);
  }

  topProducts.value = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
}

onMounted(async () => {
  await fetchOrders(500);
  await loadTopProducts();
});

watch(period, () => {
  loadTopProducts();
});
</script>
