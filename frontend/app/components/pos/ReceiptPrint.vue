<template>
  <div ref="receiptRef" class="receipt-container hidden print:block">
    <div class="mx-auto max-w-[300px] p-4 font-mono text-xs">
      <div class="mb-3 text-center">
        <img
          v-if="storeLogoUrl"
          :src="storeLogoUrl"
          alt=""
          class="mx-auto mb-2 max-h-16 max-w-[80px] object-contain"
        />
        <h2 class="text-base font-bold">{{ storeName }}</h2>
        <p v-if="storeAddress">{{ storeAddress }}</p>
        <p v-if="storePhone">{{ t('receipt.tel') }} {{ storePhone }}</p>
        <p v-if="taxId">{{ t('receipt.taxId') }} {{ taxId }}</p>
      </div>

      <div class="mb-2 border-t border-dashed border-border-warm" />

      <div class="mb-2 space-y-0.5">
        <div class="flex justify-between">
          <span>{{ t('receipt.orderNumber') }}</span>
          <span>{{ order?.order_number }}</span>
        </div>
        <div class="flex justify-between">
          <span>{{ t('receipt.date') }}</span>
          <span>{{ formatDate(order?.created) }}</span>
        </div>
        <div class="flex justify-between">
          <span>{{ t('receipt.cashier') }}</span>
          <span>{{ cashierName }}</span>
        </div>
      </div>

      <div class="mb-2 border-t border-dashed border-border-warm" />

      <div class="mb-2 space-y-1">
        <div v-for="item in items" :key="item.id" class="space-y-0.5">
          <div class="flex justify-between">
            <span class="flex-1">{{ item.product_name }}</span>
          </div>
          <div class="flex justify-between pl-2">
            <span>{{ item.quantity }} x {{ formatCurrency(item.unit_price) }}</span>
            <span>{{ formatCurrency(item.total) }}</span>
          </div>
          <div v-if="item.discount > 0" class="flex justify-between pl-2 text-ink-muted">
            <span>{{ t('receipt.discount') }}</span>
            <span>-{{ formatCurrency(item.discount) }}</span>
          </div>
        </div>
      </div>

      <div class="mb-2 border-t border-dashed border-border-warm" />

      <div class="mb-2 space-y-0.5">
        <div class="flex justify-between">
          <span>{{ t('common.subtotal') }}</span>
          <span>{{ formatCurrency(order?.subtotal ?? 0) }}</span>
        </div>
        <div v-if="(order?.discount_amount ?? 0) > 0" class="flex justify-between">
          <span>{{ t('receipt.discount') }}</span>
          <span>-{{ formatCurrency(order?.discount_amount ?? 0) }}</span>
        </div>
        <div
          v-for="promo in order?.applied_promotions ?? []"
          :key="promo.promotion_id"
          class="flex justify-between text-ink-muted"
        >
          <span>{{ promo.name }}</span>
          <span>-{{ formatCurrency(promo.amount) }}</span>
        </div>
        <div v-if="(order?.tax_amount ?? 0) > 0" class="flex justify-between">
          <span>{{ t('receipt.vat') }}</span>
          <span>{{ formatCurrency(order?.tax_amount ?? 0) }}</span>
        </div>
        <div class="flex justify-between text-sm font-bold">
          <span>{{ t('receipt.total') }}</span>
          <span>{{ formatCurrency(order?.total ?? 0) }}</span>
        </div>
      </div>

      <div class="mb-2 border-t border-dashed border-border-warm" />

      <div class="mb-3 space-y-0.5">
        <div class="flex justify-between">
          <span>{{ t('receipt.payment', { method: paymentLabel(order?.payment_method ?? '') }) }}</span>
          <span>{{ formatCurrency(order?.payment_received ?? 0) }}</span>
        </div>
        <div class="flex justify-between font-bold">
          <span>{{ t('receipt.change') }}</span>
          <span>{{ formatCurrency(order?.change_amount ?? 0) }}</span>
        </div>
      </div>

      <div class="mb-3 border-t border-dashed border-border-warm" />

      <div class="text-center">
        <p>{{ t('receipt.thankYou') }}</p>
        <p v-if="receiptFooter">{{ receiptFooter }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Order, OrderItem } from "~/lib/types";

const props = defineProps<{
  order: Order | null;
  items: OrderItem[];
  storeName: string;
  storeLogoUrl?: string;
  storeAddress?: string;
  storePhone?: string;
  taxId?: string;
  cashierName?: string;
  receiptFooter?: string;
}>();

const { t } = useI18n();
const { formatDate, formatCurrency } = useFormat();
const { paymentLabel } = useLabels();

const receiptRef = ref<HTMLDivElement>();

function print() {
  if (!receiptRef.value) return;
  const printContent = receiptRef.value.innerHTML;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${t("receipt.title")}</title>
        <style>
          body { margin: 0; font-family: monospace; font-size: 12px; }
          .receipt-container { max-width: 300px; margin: 0 auto; padding: 16px; }
          .text-center { text-align: center; }
          .text-base { font-size: 14px; }
          .font-bold { font-weight: bold; }
          .text-sm { font-size: 13px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .flex-1 { flex: 1; }
          .pl-2 { padding-left: 8px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .space-y-0\\.5 > * + * { margin-top: 2px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .border-t { border-top: 1px dashed #666; }
          .text-ink-muted { color: #666; }
        </style>
      </head>
      <body>
        <div class="receipt-container">${printContent}</div>
        <script>window.print(); window.close();<\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

defineExpose({ print });
</script>
