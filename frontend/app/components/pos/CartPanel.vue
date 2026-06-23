<template>
  <div class="flex h-full flex-col">
    <!-- Cart Header -->
    <div
      class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3"
    >
      <h2 class="text-base font-bold text-gray-800">
        {{ t('pos.orderItems') }}
        <span
          v-if="itemCount > 0"
          class="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-bold text-white"
        >
          {{ itemCount }}
        </span>
      </h2>
      <button
        v-if="cartItems.length > 0"
        class="rounded-lg px-3 py-1.5 text-xs font-medium text-danger-500 transition-colors hover:bg-red-50"
        @click="clearCart"
      >
        {{ t('pos.clearAll') }}
      </button>
    </div>

    <!-- Cart Items -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="cartItems.length === 0" class="flex h-full items-center justify-center p-8">
        <div class="text-center text-gray-400">
          <svg
            class="mx-auto h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
            />
          </svg>
          <p class="mt-2 text-sm">{{ t('pos.emptyCart') }}</p>
          <p class="mt-1 text-xs">{{ t('pos.tapToAdd') }}</p>
        </div>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="item in cartItems"
          :key="item.product.id"
          class="flex items-start gap-3 px-4 py-3"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-800">
              {{ item.product.name }}
            </p>
            <p class="mt-0.5 text-xs text-gray-500">
              {{ formatCurrency(item.product.price) }} {{ t('common.perPiece') }}
              <span
                v-if="item.free_quantity > 0"
                class="ml-1 text-success-600"
              >
                ({{ t('pos.freeQty', { qty: item.free_quantity }) }})
              </span>
            </p>
            <div class="mt-2 flex items-center gap-2">
              <button
                class="touch-pos flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
                @click="updateQuantity(item.product.id, item.quantity - 1)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
              <span class="w-8 text-center text-sm font-semibold">
                {{ item.quantity }}
              </span>
              <button
                class="touch-pos flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!canIncreaseQty(item.product, item.quantity)"
                @click="handleUpdateQuantity(item.product.id, item.quantity + 1)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="text-sm font-bold text-gray-800">
              {{ formatCurrency(item.product.price * item.quantity - item.discount) }}
            </span>
            <button
              class="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-danger-500"
              @click="removeItem(item.product.id)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cart Footer -->
    <div
      v-if="cartItems.length > 0"
      class="shrink-0 border-t border-gray-200 bg-gray-50"
    >
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">{{ t('pos.subtotal') }}</span>
          <span class="font-medium">{{ formatCurrency(subtotal) }}</span>
        </div>

        <div
          v-if="appliedPromotions.length > 0"
          class="space-y-1 rounded-lg bg-primary-50 px-3 py-2"
        >
          <p class="text-xs font-medium text-primary-700">{{ t('pos.appliedPromotions') }}</p>
          <div
            v-for="promo in appliedPromotions"
            :key="promo.promotion_id"
            class="flex items-center justify-between text-xs text-primary-800"
          >
            <span>{{ promo.name }}</span>
            <span>-{{ formatCurrency(promo.amount) }}</span>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium text-gray-500">{{ t('pos.couponCode') }}</label>
          <div class="flex gap-2">
            <input
              v-model="couponCode"
              type="text"
              :placeholder="t('pos.couponPlaceholder')"
              class="touch-pos w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="button"
              class="shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
              @click="applyCoupon"
            >
              {{ t('pos.applyCoupon') }}
            </button>
          </div>
          <p v-if="couponError" class="text-xs text-danger-500">{{ couponError }}</p>
          <button
            v-if="appliedCouponCode"
            type="button"
            class="text-xs text-gray-500 underline"
            @click="clearCoupon"
          >
            {{ t('pos.removeCoupon') }}
          </button>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium text-gray-500">{{ t('pos.manualDiscountLabel') }}</label>
          <div class="flex gap-2">
            <input
              :value="cartDiscount"
              type="number"
              min="0"
              placeholder="0"
              class="touch-pos w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 lg:text-sm"
              @input="onDiscountInput"
            />
            <select
              :value="cartDiscountType"
              class="shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              @change="onDiscountTypeChange"
            >
              <option value="fixed">฿</option>
              <option value="percent">%</option>
            </select>
          </div>
        </div>

        <div
          v-if="discountAmount > 0"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-danger-500">{{ t('pos.totalDiscount') }}</span>
          <span class="font-medium text-danger-500">
            -{{ formatCurrency(discountAmount) }}
          </span>
        </div>

        <div
          class="flex items-center justify-between border-t border-gray-300 pt-3 text-lg"
        >
          <span class="font-bold text-gray-800">{{ t('pos.netTotal') }}</span>
          <span class="font-bold text-primary-600">
            {{ formatCurrency(total) }}
          </span>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium text-gray-500">
            {{ t('pos.paymentMethod') }}
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="method in paymentMethods"
              :key="method.value"
              class="touch-pos rounded-lg border py-2.5 text-center text-xs font-semibold transition-colors"
              :class="
                paymentMethod === method.value
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              "
              @click="paymentMethod = method.value"
            >
              {{ method.label }}
            </button>
          </div>
        </div>

        <div v-if="paymentMethod === 'cash'" class="space-y-2">
          <label class="text-xs font-medium text-gray-500">
            {{ t('pos.paymentReceived') }}
          </label>
          <input
            :value="paymentReceived"
            type="number"
            min="0"
            placeholder="0.00"
            class="touch-pos w-full rounded-lg border border-gray-300 px-3 py-2.5 text-right text-lg font-bold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            @input="onPaymentReceivedInput"
          />

          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="amount in quickCashAmounts"
              :key="amount"
                  class="touch-pos rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
              @click="paymentReceived = amount"
            >
              {{ amount.toLocaleString() }}
            </button>
          </div>

          <div
            v-if="paymentReceived > 0"
            class="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2"
          >
            <span class="text-sm font-medium text-green-700">{{ t('pos.change') }}</span>
            <span class="text-lg font-bold text-green-700">
              {{ formatCurrency(changeAmount) }}
            </span>
          </div>
        </div>

        <p
          v-if="paymentMethod === 'qr' && !hasPromptPayId"
          class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"
        >
          {{ t('pos.promptpayNotConfigured') }}
        </p>

        <button
          class="touch-pos w-full rounded-xl py-4 text-base font-bold text-white shadow-lg transition-colors active:bg-primary-800 disabled:opacity-50 disabled:shadow-none lg:active:scale-[0.98]"
          :class="
            isCheckingOut
              ? 'bg-gray-400'
              : 'bg-primary-600 hover:bg-primary-700'
          "
          :disabled="isCheckingOut || !canCheckout"
          @click="emit('checkout')"
        >
          <span v-if="isCheckingOut">{{ t('pos.checkingOut') }}</span>
          <span v-else>{{ t('pos.payAmount', { amount: formatCurrency(total) }) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~/lib/types";

defineProps<{
  isCheckingOut?: boolean;
}>();

const emit = defineEmits<{
  checkout: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { alert } = useDialog();
const { activeStore } = useStore();
const { resolvePromptPayId } = usePromptPayQr();
const {
  getAvailableQty,
  maxCartQty,
  validateCartItems,
} = usePosStock();
const {
  cartItems,
  removeItem,
  updateQuantity,
  subtotal,
  discountAmount,
  appliedPromotions,
  total,
  changeAmount,
  itemCount,
  clearCart,
  cartDiscount,
  cartDiscountType,
  couponCode,
  appliedCouponCode,
  couponError,
  applyCoupon,
  clearCoupon,
  paymentMethod,
  paymentReceived,
} = useCart();

const resolvedPromptPayId = computed(() =>
  resolvePromptPayId(activeStore.value),
);

const hasPromptPayId = computed(() => Boolean(resolvedPromptPayId.value));

const paymentMethods = computed(() => [
  { value: "cash" as const, label: t("payment.cash") },
  { value: "qr" as const, label: t("payment.qr") },
]);

const quickCashAmounts = computed(() => {
  const roundedTotal = Math.ceil(total.value);
  const amounts = [roundedTotal, 100, 500, 1000, 5000];
  return [...new Set(amounts)].sort((a, b) => a - b).filter((a) => a > 0);
});

const canCheckout = computed(() => {
  if (cartItems.value.length === 0) return false;
  if (paymentMethod.value === "cash" && paymentReceived.value < total.value)
    return false;
  if (validateCartItems(cartItems.value).length > 0) return false;
  return true;
});

function canIncreaseQty(product: Product, currentQty: number): boolean {
  if (!product.track_inventory) return true;
  return currentQty < maxCartQty(product);
}

function onDiscountInput(e: Event) {
  cartDiscount.value = Number((e.target as HTMLInputElement).value);
}

function onDiscountTypeChange(e: Event) {
  cartDiscountType.value = (e.target as HTMLSelectElement).value as "percent" | "fixed";
}

function onPaymentReceivedInput(e: Event) {
  paymentReceived.value = Number((e.target as HTMLInputElement).value);
}

function handleUpdateQuantity(productId: string, quantity: number) {
  const item = cartItems.value.find((i) => i.product.id === productId);
  if (!item) return;

  const capped = Math.min(quantity, maxCartQty(item.product));
  if (quantity > capped && item.product.track_inventory) {
    void alert(
      t("pos.cannotAddExceedsStock", {
        available: getAvailableQty(productId),
      }),
    );
  }
  updateQuantity(productId, capped);
}
</script>
