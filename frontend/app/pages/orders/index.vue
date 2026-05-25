<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Orders</h2>
      <div class="flex items-center gap-2">
        <select
          v-model="statusFilter"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="voided">Voided</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
    </div>

    <div class="rounded-xl bg-white shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="filteredOrders.length === 0" class="py-12 text-center text-gray-400">
        No orders found
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">Order #</th>
              <th class="px-4 py-3">Date</th>
              <th class="px-4 py-3">Subtotal</th>
              <th class="px-4 py-3">Discount</th>
              <th class="px-4 py-3">Total</th>
              <th class="px-4 py-3">Payment</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="order in filteredOrders" :key="order.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ order.order_number }}</td>
              <td class="px-4 py-3 text-gray-500">{{ formatDate(order.created) }}</td>
              <td class="px-4 py-3">{{ formatCurrency(order.subtotal) }}</td>
              <td class="px-4 py-3 text-danger-500">
                {{ order.discount_amount > 0 ? `-${formatCurrency(order.discount_amount)}` : '-' }}
              </td>
              <td class="px-4 py-3 font-semibold">{{ formatCurrency(order.total) }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="paymentBadge(order.payment_method)">
                  {{ order.payment_method }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(order.status)">
                  {{ order.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button
                  class="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                  @click="viewOrder(order)"
                >
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Detail Modal -->
    <Teleport to="body">
      <div v-if="selectedOrder" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="selectedOrder = null">
        <div class="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">Order {{ selectedOrder.order_number }}</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="selectedOrder = null">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Date</span>
              <span>{{ formatDate(selectedOrder.created) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Status</span>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(selectedOrder.status)">
                {{ selectedOrder.status }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Payment</span>
              <span>{{ selectedOrder.payment_method }}</span>
            </div>

            <hr class="my-3" />

            <div v-if="orderItemsLoading" class="py-4 text-center text-gray-400">Loading items...</div>
            <div v-else>
              <div v-for="item in orderItems" :key="item.id" class="flex items-center justify-between py-2">
                <div>
                  <span class="font-medium">{{ item.product_name }}</span>
                  <span class="ml-2 text-gray-500">x{{ item.quantity }}</span>
                </div>
                <span>{{ formatCurrency(item.total) }}</span>
              </div>
            </div>

            <hr class="my-3" />

            <div class="flex justify-between">
              <span class="text-gray-500">Subtotal</span>
              <span>{{ formatCurrency(selectedOrder.subtotal) }}</span>
            </div>
            <div v-if="selectedOrder.discount_amount > 0" class="flex justify-between text-danger-500">
              <span>Discount</span>
              <span>-{{ formatCurrency(selectedOrder.discount_amount) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{{ formatCurrency(selectedOrder.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Order, OrderItem } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { orders, isLoading, fetchOrders, getOrderItems } = useOrders();

const statusFilter = ref("");
const selectedOrder = ref<Order | null>(null);
const orderItems = ref<OrderItem[]>([]);
const orderItemsLoading = ref(false);

const filteredOrders = computed(() => {
  if (!statusFilter.value) return orders.value;
  return orders.value.filter((o) => o.status === statusFilter.value);
});

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("th-TH");
}

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
    card: "bg-purple-100 text-purple-700",
  };
  return map[method] || "bg-gray-100 text-gray-700";
}

async function viewOrder(order: Order) {
  selectedOrder.value = order;
  orderItemsLoading.value = true;
  try {
    orderItems.value = await getOrderItems(order.id);
  } finally {
    orderItemsLoading.value = false;
  }
}

onMounted(() => {
  fetchOrders(100);
});
</script>
