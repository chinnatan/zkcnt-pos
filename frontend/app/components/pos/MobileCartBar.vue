<template>
  <button
    v-if="itemCount > 0"
    type="button"
    class="pos-mobile-cart-bar"
    style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
    @click="emit('open')"
  >
    <div class="flex items-center gap-3">
      <span
        class="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-primary-500 px-2 text-sm font-bold text-white"
        style="transform: rotate(-2deg)"
      >
        {{ itemCount }}
      </span>
      <div class="min-w-0 flex-1 text-left">
        <p class="text-xs text-ink-muted">
          {{ t('pos.cartTab', { count: itemCount }) }}
        </p>
        <p class="font-display text-lg font-bold text-primary-600">
          {{ formatCurrency(total) }}
        </p>
      </div>
      <span class="shrink-0 rounded-md border-2 border-primary-400 bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white">
        {{ t('pos.viewCart') }}
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  open: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { itemCount, total } = useCart();
</script>
