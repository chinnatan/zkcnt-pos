<template>
  <div class="flex h-full flex-col">
    <div class="flex flex-1 overflow-hidden">
      <!-- LEFT: Product Grid -->
      <div
        class="flex flex-col overflow-hidden bg-white"
        style="flex: 2"
      >
        <!-- Search + Category Filters -->
        <div class="shrink-0 space-y-3 border-b border-gray-200 p-4">
          <div class="relative">
            <svg
              class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('pos.searchPlaceholder')"
              class="touch-pos w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-base outline-none transition-colors focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              class="touch-pos shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              :class="
                selectedCategory === null
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              "
              @click="selectedCategory = null"
            >
              {{ t('pos.allCategories') }}
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="touch-pos shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              :class="
                selectedCategory === cat.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              "
              @click="selectedCategory = cat.id"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>

        <!-- Product Grid -->
        <div
          class="flex-1 overflow-y-auto p-4"
          :class="itemCount > 0 ? 'pb-24 md:pb-4' : ''"
        >
          <div v-if="isLoading" class="flex h-full items-center justify-center">
            <div class="text-center text-gray-400">
              <svg
                class="mx-auto h-8 w-8 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p class="mt-2 text-sm">{{ t('pos.loadingProducts') }}</p>
            </div>
          </div>

          <div
            v-else-if="filteredProducts.length === 0"
            class="flex h-full items-center justify-center"
          >
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p class="mt-2 text-sm">{{ t('pos.noProducts') }}</p>
            </div>
          </div>

          <div
            v-else
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
          >
            <button
              v-for="product in filteredProducts"
              :key="product.id"
              class="touch-pos group flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-colors"
              :class="
                isOutOfStock(product)
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-primary-300 hover:shadow-md active:bg-primary-50 lg:active:scale-[0.97]'
              "
              :disabled="isOutOfStock(product)"
              @click="handleAddItem(product)"
            >
              <div class="mb-3">
                <ProductImage :product="product" size="lg" />
              </div>
              <span
                class="mb-1 line-clamp-2 w-full text-sm font-medium text-gray-800"
              >
                {{ product.name }}
              </span>
              <span class="text-sm font-bold text-primary-600">
                {{ formatCurrency(product.price) }}
              </span>
              <span
                v-if="product.track_inventory"
                class="mt-1 text-xs"
                :class="isOutOfStock(product) ? 'text-danger-500' : 'text-gray-500'"
              >
                {{
                  isOutOfStock(product)
                    ? t('stock.outOfStock')
                    : t('pos.stockRemaining', { count: getAvailableQty(product.id) })
                }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT: Cart (desktop sidebar) -->
      <div
        class="hidden flex-col border-l border-gray-200 bg-white md:flex"
        style="flex: 1"
      >
        <PosCartPanel
          :is-checking-out="isCheckingOut"
          @checkout="handleCheckout"
        />
      </div>
    </div>

    <!-- Mobile cart bar + bottom sheet -->
    <PosMobileCartBar @open="showMobileCart = true" />

    <PosMobileCartSheet v-model:show="showMobileCart">
      <PosCartPanel
        :is-checking-out="isCheckingOut"
        @checkout="handleCheckout"
      />
    </PosMobileCartSheet>

    <!-- Success Modal -->
    <Teleport to="body">
      <div
        v-if="showSuccessModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showSuccessModal = false"
      >
        <div
          class="w-full max-w-sm animate-[scaleIn_0.2s_ease-out] rounded-2xl bg-white p-8 text-center shadow-2xl"
        >
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
          >
            <svg
              class="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 class="mb-1 text-xl font-bold text-gray-800">{{ t('pos.successTitle') }}</h3>
          <p class="mb-2 text-sm text-gray-500">
            {{ t('pos.orderNumber', { number: lastOrderNumber }) }}
          </p>
          <p class="mb-6 text-2xl font-bold text-primary-600">
            {{ formatCurrency(lastOrderTotal) }}
          </p>

          <div class="flex gap-3">
            <button
              class="touch-pos flex-1 rounded-xl border border-gray-300 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              @click="handlePrintReceipt"
            >
              {{ t('pos.printReceipt') }}
            </button>
            <button
              class="touch-pos flex-1 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              @click="handleNewOrder"
            >
              {{ t('pos.newOrder') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <PosPromptPayQrModal
      :show="showQrModal"
      :amount="total"
      :data-url="qrDataUrl"
      :loading="isGeneratingQr"
      :confirming="isCheckingOut"
      @confirm="confirmQrPayment"
      @cancel="showQrModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~/lib/types";
import { createLogger } from "~/lib/logger";
import { InsufficientStockError } from "~/composables/useOrders";

const logger = createLogger("pos");

definePageMeta({ layout: "pos", middleware: "auth" });

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { products, categories, fetchProducts, fetchCategories, isLoading } =
  useProducts();
const {
  fetchInventory,
  getAvailableQty,
  canAddToCart,
  isOutOfStock,
  validateCartItems,
} = usePosStock();
const {
  cartItems,
  addItem,
  subtotal,
  discountAmount,
  total,
  changeAmount,
  itemCount,
  clearCart,
  cartDiscountType,
  selectedCustomerId,
  paymentMethod,
  paymentReceived,
  cartNote,
} = useCart();
const { createOrder } = useOrders();
const { alert } = useDialog();
const { activeStore, activeStoreId } = useStore();
const { generateQrDataUrl, resolvePromptPayId } = usePromptPayQr();

const showMobileCart = ref(false);
const searchQuery = ref("");
const selectedCategory = ref<string | null>(null);
const isCheckingOut = ref(false);
const showSuccessModal = ref(false);
const showQrModal = ref(false);
const qrDataUrl = ref("");
const isGeneratingQr = ref(false);
const lastOrderNumber = ref("");
const lastOrderTotal = ref(0);

const resolvedPromptPayId = computed(() =>
  resolvePromptPayId(activeStore.value),
);

const filteredProducts = computed(() => {
  let result = products.value.filter((p: Product) => p.is_active !== false);

  if (selectedCategory.value) {
    result = result.filter(
      (p: Product) => p.category === selectedCategory.value
    );
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    result = result.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }

  return result;
});

const canCheckout = computed(() => {
  if (cartItems.value.length === 0) return false;
  if (paymentMethod.value === "cash" && paymentReceived.value < total.value)
    return false;
  if (validateCartItems(cartItems.value).length > 0) return false;
  return true;
});

function getCartQty(productId: string): number {
  return cartItems.value.find((item) => item.product.id === productId)?.quantity ?? 0;
}

function showStockAlert(message: string) {
  void alert(message);
}

function stockErrorMessage(shortages: { name: string; available: number; requested: number }[]) {
  const first = shortages[0];
  if (!first) return t("errors.saveFailed");
  return t("pos.insufficientStockCheckout", {
    name: first.name,
    available: first.available,
    requested: first.requested,
  });
}

function handleAddItem(product: Product) {
  const currentQty = getCartQty(product.id);

  if (!canAddToCart(product, currentQty)) {
    if (isOutOfStock(product) && currentQty === 0) {
      showStockAlert(t("pos.cannotAddOutOfStock"));
    } else {
      showStockAlert(
        t("pos.cannotAddExceedsStock", {
          available: getAvailableQty(product.id),
        }),
      );
    }
    return;
  }

  addItem(product);
}

async function handleCheckout() {
  if (!canCheckout.value || isCheckingOut.value) return;

  const shortages = validateCartItems(cartItems.value);
  if (shortages.length > 0) {
    showStockAlert(stockErrorMessage(shortages));
    return;
  }

  if (paymentMethod.value === "qr") {
    await openQrModal();
    return;
  }

  await completeCheckout();
}

async function openQrModal() {
  const promptpayId = resolvedPromptPayId.value;
  if (!promptpayId) {
    await alert(t("pos.promptpayNotConfigured"));
    return;
  }

  showQrModal.value = true;
  isGeneratingQr.value = true;
  qrDataUrl.value = "";

  try {
    qrDataUrl.value = (await generateQrDataUrl(promptpayId, total.value)) ?? "";
    if (!qrDataUrl.value) {
      showQrModal.value = false;
      await alert(t("pos.promptpayQrFailed"));
    }
  } catch (error) {
    logger.error("openQrModal failed:", error);
    showQrModal.value = false;
    await alert(t("pos.promptpayQrFailed"));
  } finally {
    isGeneratingQr.value = false;
  }
}

async function confirmQrPayment() {
  if (isCheckingOut.value) return;
  await completeCheckout();
}

async function completeCheckout() {
  isCheckingOut.value = true;

  try {
    const orderItems = cartItems.value.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.product.price,
      quantity: item.quantity,
      unit_price: item.product.price,
      discount: item.discount,
      total: item.product.price * item.quantity - item.discount,
    }));

    const received =
      paymentMethod.value === "cash" ? paymentReceived.value : total.value;

    const order = await createOrder({
      items: orderItems,
      subtotal: subtotal.value,
      discount_amount: discountAmount.value,
      discount_type: cartDiscountType.value,
      tax_amount: 0,
      total: total.value,
      payment_method: paymentMethod.value,
      payment_received: received,
      change_amount:
        paymentMethod.value === "cash" ? changeAmount.value : 0,
      customer: selectedCustomerId.value || undefined,
      note: cartNote.value || undefined,
    });

    lastOrderNumber.value = order.order_number || order.id || "";
    lastOrderTotal.value = total.value;
    showQrModal.value = false;
    showMobileCart.value = false;
    showSuccessModal.value = true;
    await fetchInventory();
  } catch (err) {
    logger.error("Checkout failed:", err);
    if (err instanceof InsufficientStockError) {
      showStockAlert(stockErrorMessage(err.shortages));
    } else {
      await alert(t("errors.saveFailed"));
    }
  } finally {
    isCheckingOut.value = false;
  }
}

function handlePrintReceipt() {
  window.print();
}

function handleNewOrder() {
  clearCart();
  showSuccessModal.value = false;
  showMobileCart.value = false;
}

watch(
  activeStoreId,
  (id) => {
    if (id) {
      void Promise.all([fetchProducts(), fetchCategories(), fetchInventory()]);
    }
  },
  { immediate: true },
);
</script>

<style scoped>
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
