<template>
  <div class="flex h-full flex-col">
    <!-- Mobile Tabs -->
    <div class="flex shrink-0 border-b border-gray-200 bg-white lg:hidden">
      <button
        class="flex-1 py-3 text-center text-sm font-semibold transition-colors"
        :class="
          mobileTab === 'products'
            ? 'border-b-2 border-primary-600 text-primary-600'
            : 'text-gray-500'
        "
        @click="mobileTab = 'products'"
      >
        สินค้า
      </button>
      <button
        class="flex-1 py-3 text-center text-sm font-semibold transition-colors"
        :class="
          mobileTab === 'cart'
            ? 'border-b-2 border-primary-600 text-primary-600'
            : 'text-gray-500'
        "
        @click="mobileTab = 'cart'"
      >
        ตะกร้า ({{ itemCount }})
      </button>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- LEFT: Product Grid -->
      <div
        class="flex flex-col overflow-hidden bg-white"
        :class="mobileTab === 'products' ? 'flex' : 'hidden lg:flex'"
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
              placeholder="ค้นหาสินค้า (ชื่อ, SKU, บาร์โค้ด)..."
              class="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              :class="
                selectedCategory === null
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              "
              @click="selectedCategory = null"
            >
              ทั้งหมด
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
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
        <div class="flex-1 overflow-y-auto p-4">
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
              <p class="mt-2 text-sm">กำลังโหลดสินค้า...</p>
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
              <p class="mt-2 text-sm">ไม่พบสินค้า</p>
            </div>
          </div>

          <div
            v-else
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
          >
            <button
              v-for="product in filteredProducts"
              :key="product.id"
              class="group flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all hover:border-primary-300 hover:shadow-md active:scale-[0.97]"
              @click="handleAddItem(product)"
            >
              <div
                class="mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50 text-2xl font-bold text-primary-600 transition-colors group-hover:bg-primary-100"
              >
                {{ product.name.charAt(0) }}
              </div>
              <span
                class="mb-1 line-clamp-2 w-full text-sm font-medium text-gray-800"
              >
                {{ product.name }}
              </span>
              <span class="text-sm font-bold text-primary-600">
                {{ formatCurrency(product.price) }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT: Cart -->
      <div
        class="flex flex-col border-l border-gray-200 bg-white"
        :class="mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'"
        style="flex: 1"
      >
        <!-- Cart Header -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3"
        >
          <h2 class="text-base font-bold text-gray-800">
            รายการสั่งซื้อ
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
            ล้างทั้งหมด
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
              <p class="mt-2 text-sm">ยังไม่มีสินค้าในตะกร้า</p>
              <p class="mt-1 text-xs">แตะสินค้าเพื่อเพิ่ม</p>
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
                  {{ formatCurrency(item.product.price) }} / ชิ้น
                </p>
                <div class="mt-2 flex items-center gap-2">
                  <button
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
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
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
                    @click="updateQuantity(item.product.id, item.quantity + 1)"
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
            <!-- Subtotal -->
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">ยอดรวม</span>
              <span class="font-medium">{{ formatCurrency(subtotal) }}</span>
            </div>

            <!-- Discount -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-gray-500">ส่วนลด</label>
              <div class="flex gap-2">
                <input
                  :value="cartDiscount"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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

            <!-- Discount Amount Display -->
            <div
              v-if="discountAmount > 0"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-danger-500">ส่วนลด</span>
              <span class="font-medium text-danger-500">
                -{{ formatCurrency(discountAmount) }}
              </span>
            </div>

            <!-- Total -->
            <div
              class="flex items-center justify-between border-t border-gray-300 pt-3 text-lg"
            >
              <span class="font-bold text-gray-800">ยอดสุทธิ</span>
              <span class="font-bold text-primary-600">
                {{ formatCurrency(total) }}
              </span>
            </div>

            <!-- Payment Method -->
            <div class="space-y-2">
              <label class="text-xs font-medium text-gray-500">
                ช่องทางชำระเงิน
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="method in paymentMethods"
                  :key="method.value"
                  class="rounded-lg border py-2.5 text-center text-xs font-semibold transition-colors"
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

            <!-- Payment Received (cash only) -->
            <div v-if="paymentMethod === 'cash'" class="space-y-2">
              <label class="text-xs font-medium text-gray-500">
                รับเงิน
              </label>
              <input
                :value="paymentReceived"
                type="number"
                min="0"
                placeholder="0.00"
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-right text-lg font-bold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                @input="onPaymentReceivedInput"
              />

              <!-- Quick cash buttons -->
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="amount in quickCashAmounts"
                  :key="amount"
                  class="rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
                  @click="paymentReceived = amount"
                >
                  {{ amount.toLocaleString() }}
                </button>
              </div>

              <!-- Change -->
              <div
                v-if="paymentReceived > 0"
                class="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2"
              >
                <span class="text-sm font-medium text-green-700">เงินทอน</span>
                <span class="text-lg font-bold text-green-700">
                  {{ formatCurrency(changeAmount) }}
                </span>
              </div>
            </div>

            <!-- Checkout Button -->
            <button
              class="w-full rounded-xl py-4 text-base font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              :class="
                isCheckingOut
                  ? 'bg-gray-400'
                  : 'bg-primary-600 hover:bg-primary-700'
              "
              :disabled="isCheckingOut || !canCheckout"
              @click="handleCheckout"
            >
              <span v-if="isCheckingOut">กำลังบันทึก...</span>
              <span v-else>ชำระเงิน {{ formatCurrency(total) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

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
          <h3 class="mb-1 text-xl font-bold text-gray-800">บันทึกเรียบร้อย!</h3>
          <p class="mb-2 text-sm text-gray-500">
            หมายเลขออเดอร์: {{ lastOrderNumber }}
          </p>
          <p class="mb-6 text-2xl font-bold text-primary-600">
            {{ formatCurrency(lastOrderTotal) }}
          </p>

          <div class="flex gap-3">
            <button
              class="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              @click="handlePrintReceipt"
            >
              พิมพ์ใบเสร็จ
            </button>
            <button
              class="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              @click="handleNewOrder"
            >
              ออเดอร์ใหม่
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~/lib/types";

definePageMeta({ layout: "pos", middleware: "auth" });

const { products, categories, fetchProducts, fetchCategories, isLoading } =
  useProducts();
const {
  cartItems,
  addItem,
  removeItem,
  updateQuantity,
  subtotal,
  discountAmount,
  total,
  changeAmount,
  itemCount,
  clearCart,
  cartDiscount,
  cartDiscountType,
  selectedCustomerId,
  paymentMethod,
  paymentReceived,
  cartNote,
} = useCart();
const { createOrder } = useOrders();

const mobileTab = ref<"products" | "cart">("products");
const searchQuery = ref("");
const selectedCategory = ref<string | null>(null);
const isCheckingOut = ref(false);
const showSuccessModal = ref(false);
const lastOrderNumber = ref("");
const lastOrderTotal = ref(0);

const paymentMethods = [
  { value: "cash" as const, label: "เงินสด" },
  { value: "qr" as const, label: "QR Code" },
  { value: "card" as const, label: "บัตร" },
];

const quickCashAmounts = computed(() => {
  const roundedTotal = Math.ceil(total.value);
  const amounts = [roundedTotal, 100, 500, 1000, 5000];
  return [...new Set(amounts)].sort((a, b) => a - b).filter((a) => a > 0);
});

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
  return true;
});

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
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

function handleAddItem(product: Product) {
  addItem(product);
  if (mobileTab.value === "products" && window.innerWidth < 1024) {
    // Brief visual feedback; don't auto-switch
  }
}

async function handleCheckout() {
  if (!canCheckout.value || isCheckingOut.value) return;
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
    showSuccessModal.value = true;
  } catch (err) {
    console.error("Checkout failed:", err);
    alert("ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง");
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
  mobileTab.value = "products";
}

onMounted(async () => {
  await Promise.all([fetchProducts(), fetchCategories()]);
});
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
