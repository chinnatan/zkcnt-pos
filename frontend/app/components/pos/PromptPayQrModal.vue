<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('cancel')"
    >
      <div
        class="w-full max-w-sm animate-[scaleIn_0.2s_ease-out] rounded-2xl bg-white p-6 text-center shadow-2xl"
      >
        <h3 class="mb-1 text-lg font-bold text-gray-800">
          {{ t("pos.qrPaymentTitle") }}
        </h3>
        <p class="mb-4 text-2xl font-bold text-primary-600">
          {{ formatCurrency(amount) }}
        </p>

        <div
          v-if="loading"
          class="mx-auto mb-4 flex h-[280px] w-[280px] items-center justify-center rounded-xl bg-gray-50"
        >
          <svg
            class="h-8 w-8 animate-spin text-primary-600"
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
        </div>

        <img
          v-else-if="dataUrl"
          :src="dataUrl"
          :alt="t('pos.qrPaymentTitle')"
          class="mx-auto mb-4 rounded-xl border border-gray-100"
          width="280"
          height="280"
        />

        <p class="mb-6 text-sm text-gray-500">
          {{ t("pos.qrPaymentHint") }}
        </p>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            @click="$emit('cancel')"
          >
            {{ t("pos.qrPaymentCancel") }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            :disabled="loading || !dataUrl || confirming"
            @click="$emit('confirm')"
          >
            {{ confirming ? t("pos.checkingOut") : t("pos.qrPaymentConfirm") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  amount: number;
  dataUrl: string;
  loading?: boolean;
  confirming?: boolean;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useFormat();
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
