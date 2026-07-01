<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink">{{ t('ordersPage.title') }}</h2>
      <div class="flex items-center gap-2">
        <select
          v-model="statusFilter"
          class="rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">{{ t('status.all') }}</option>
          <option value="completed">{{ t('status.completed') }}</option>
          <option value="voided">{{ t('status.voided') }}</option>
          <option value="refunded">{{ t('status.refunded') }}</option>
        </select>
      </div>
    </div>

    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="filteredOrders.length === 0" class="py-12 text-center text-ink-muted">
        {{ t('ordersPage.noOrders') }}
      </div>

      <div v-else>
        <UiMobileDataList>
          <template #table>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
                  <tr>
                    <th class="px-4 py-3">{{ t('dashboard.orderNumber') }}</th>
                    <th class="px-4 py-3">{{ t('common.date') }}</th>
                    <th class="px-4 py-3">{{ t('common.subtotal') }}</th>
                    <th class="px-4 py-3">{{ t('common.discount') }}</th>
                    <th class="px-4 py-3">{{ t('common.total') }}</th>
                    <th class="px-4 py-3">{{ t('common.payment') }}</th>
                    <th class="px-4 py-3">{{ t('common.status') }}</th>
                    <th class="px-4 py-3">{{ t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-warm">
                  <tr v-for="order in filteredOrders" :key="order.id" class="hover:bg-surface">
                    <td class="px-4 py-3 font-medium text-ink">{{ order.order_number }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ formatDate(order.created) }}</td>
                    <td class="px-4 py-3">{{ formatCurrency(order.subtotal) }}</td>
                    <td class="px-4 py-3 text-danger-500">
                      {{ order.discount_amount > 0 ? `-${formatCurrency(order.discount_amount)}` : '-' }}
                    </td>
                    <td class="px-4 py-3 font-semibold">{{ formatCurrency(order.total) }}</td>
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
                    <td class="px-4 py-3">
                      <button
                        class="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                        :data-testid="`view-order-${order.id}`"
                        @click="viewOrder(order)"
                      >
                        {{ t('common.view') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template #cards>
            <UiMobileDataCard
              v-for="order in filteredOrders"
              :key="order.id"
              :title="order.order_number"
              :subtitle="formatDate(order.created)"
            >
              <template #badge>
                <div class="flex flex-col items-end gap-1">
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(order.status)">
                    {{ statusLabel(order.status) }}
                  </span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="paymentBadge(order.payment_method)">
                    {{ paymentLabel(order.payment_method) }}
                  </span>
                </div>
              </template>
              <template #fields>
                <div>
                  <span class="text-ink-muted">{{ t('common.total') }}</span>
                  <p class="font-semibold text-ink">{{ formatCurrency(order.total) }}</p>
                </div>
                <div>
                  <span class="text-ink-muted">{{ t('common.discount') }}</span>
                  <p class="text-ink-muted">
                    {{ order.discount_amount > 0 ? `-${formatCurrency(order.discount_amount)}` : '-' }}
                  </p>
                </div>
              </template>
              <template #actions>
                <button
                  class="w-full rounded-lg bg-primary-50 px-3 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                  @click="viewOrder(order)"
                >
                  {{ t('common.view') }}
                </button>
              </template>
            </UiMobileDataCard>
          </template>
        </UiMobileDataList>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="selectedOrder" class="craft-modal-backdrop craft-modal-backdrop--center z-50" @click.self="selectedOrder = null">
        <div class="craft-modal-panel craft-modal--ticket max-w-lg" data-testid="order-detail-modal">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ t('ordersPage.orderDetail', { number: selectedOrder.order_number }) }}</h3>
            <button class="text-ink-muted hover:text-ink-muted" @click="selectedOrder = null">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.date') }}</span>
              <span>{{ formatDate(selectedOrder.created) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.status') }}</span>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadge(selectedOrder.status)">
                {{ statusLabel(selectedOrder.status) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.payment') }}</span>
              <span>{{ paymentLabel(selectedOrder.payment_method) }}</span>
            </div>

            <hr class="my-3" />

            <div v-if="orderItemsLoading" class="py-4 text-center text-ink-muted">{{ t('ordersPage.loadingItems') }}</div>
            <div v-else>
              <div v-for="item in orderItems" :key="item.id" class="flex items-center justify-between py-2">
                <div>
                  <span class="font-medium">{{ item.product_name }}</span>
                  <span class="ml-2 text-ink-muted">x{{ item.quantity }}</span>
                </div>
                <span>{{ formatCurrency(item.total) }}</span>
              </div>
            </div>

            <hr class="my-3" />

            <div class="flex justify-between">
              <span class="text-ink-muted">{{ t('common.subtotal') }}</span>
              <span>{{ formatCurrency(selectedOrder.subtotal) }}</span>
            </div>
            <div v-if="selectedOrder.discount_amount > 0" class="flex justify-between text-danger-500">
              <span>{{ t('common.discount') }}</span>
              <span>-{{ formatCurrency(selectedOrder.discount_amount) }}</span>
            </div>
            <div class="flex justify-between text-base font-bold">
              <span>{{ t('common.total') }}</span>
              <span>{{ formatCurrency(selectedOrder.total) }}</span>
            </div>

            <div
              v-if="isManager && selectedOrder.status === 'completed'"
              class="mt-4 flex gap-2 border-t border-border-warm pt-4"
            >
              <button
                data-testid="void-order-btn"
                class="flex-1 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700 hover:bg-danger-100 disabled:opacity-50"
                :disabled="isUpdatingStatus"
                @click="confirmStatusChange('voided')"
              >
                {{ t('ordersPage.voidOrder') }}
              </button>
              <button
                class="flex-1 rounded-lg border border-warning-100 bg-warning-50 px-3 py-2 text-sm font-medium text-warning-700 hover:bg-warning-100 disabled:opacity-50"
                :disabled="isUpdatingStatus"
                @click="confirmStatusChange('refunded')"
              >
                {{ t('ordersPage.refundOrder') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Order, OrderItem } from "~/lib/types";
import { orderStatusBadge, paymentMethodBadge } from "~/lib/ui/statusColors";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency, formatDate } = useFormat();
const { statusLabel, paymentLabel } = useLabels();
const { orders, isLoading, fetchOrders, getOrderItems, updateOrderStatus } = useOrders();
const { isManager } = useStore();
const { alert, prompt } = useDialog();

const statusFilter = ref("");
const selectedOrder = ref<Order | null>(null);
const orderItems = ref<OrderItem[]>([]);
const orderItemsLoading = ref(false);
const isUpdatingStatus = ref(false);

const filteredOrders = computed(() => {
  if (!statusFilter.value) return orders.value;
  return orders.value.filter((o) => o.status === statusFilter.value);
});

function statusBadge(status: string) {
  return orderStatusBadge(status);
}

function paymentBadge(method: string) {
  return paymentMethodBadge(method);
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

async function confirmStatusChange(status: "voided" | "refunded") {
  if (!selectedOrder.value) return;
  const label = status === "voided" ? t("ordersPage.voidOrder") : t("ordersPage.refundOrder");
  const reason = await prompt(t("ordersPage.reasonPrompt", { action: label }));
  if (reason === null) return;

  isUpdatingStatus.value = true;
  try {
    const updated = await updateOrderStatus(selectedOrder.value.id, status, reason);
    selectedOrder.value = updated;
    await fetchOrders(100);
  } catch {
    await alert(t("errors.updateFailed"));
  } finally {
    isUpdatingStatus.value = false;
  }
}

onMounted(async () => {
  await fetchOrders(100);
  const route = useRoute();
  const viewId = route.query.view as string | undefined;
  if (viewId) {
    const order = orders.value.find((o) => o.id === viewId);
    if (order) await viewOrder(order);
  }
});
</script>
