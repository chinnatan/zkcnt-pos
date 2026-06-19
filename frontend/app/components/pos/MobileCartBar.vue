<template>
  <button
    v-if="itemCount > 0"
    type="button"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 py-3 shadow-lg lg:hidden"
    style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
    @click="emit('open')"
  >
    <div class="flex items-center gap-3">
      <span
        class="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary-600 px-2 text-sm font-bold text-white"
      >
        {{ itemCount }}
      </span>
      <div class="min-w-0 flex-1 text-left">
        <p class="text-xs text-gray-500">
          {{ t('pos.cartTab', { count: itemCount }) }}
        </p>
        <p class="text-lg font-bold text-primary-600">
          {{ formatCurrency(total) }}
        </p>
      </div>
      <span class="shrink-0 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">
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
