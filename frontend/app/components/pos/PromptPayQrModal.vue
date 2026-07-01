<template>
  <Teleport to="body">
      <div
        v-if="show"
        data-testid="qr-payment-modal"
        class="craft-modal-backdrop craft-modal-backdrop--center z-[110]"
      @click.self="$emit('cancel')"
    >
      <div
        class="craft-modal-panel craft-modal--paper max-w-sm animate-[scaleIn_0.2s_ease-out] text-center"
      >
        <h3 class="font-display mb-1 text-lg font-bold text-ink">
          {{ t("pos.qrPaymentTitle") }}
        </h3>
        <p class="font-display mb-4 text-2xl font-bold text-primary-600">
          {{ formatCurrency(amount) }}
        </p>

        <div
          v-if="loading"
          class="mx-auto mb-4 flex aspect-square w-full max-w-[280px] items-center justify-center rounded-xl bg-surface"
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
          class="mx-auto mb-4 w-full max-w-[280px] rounded-xl border border-border-warm"
        />

        <p class="mb-6 text-sm text-ink-muted">
          {{ t("pos.qrPaymentHint") }}
        </p>

        <div class="flex gap-3">
          <button
            type="button"
            class="touch-pos btn-secondary flex-1 rounded-xl py-3.5 text-sm font-semibold"
            @click="$emit('cancel')"
          >
            {{ t("pos.qrPaymentCancel") }}
          </button>
          <button
            type="button"
            class="touch-pos flex-1 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
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
