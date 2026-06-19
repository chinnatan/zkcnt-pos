<template>
  <Teleport to="body">
    <Transition name="cart-sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-50 lg:hidden"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="close"
        />

        <div
          class="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-2xl"
          style="padding-bottom: env(safe-area-inset-bottom)"
        >
          <div class="relative flex shrink-0 flex-col items-center border-b border-gray-200 px-4 py-3">
            <div class="mb-1 h-1 w-10 rounded-full bg-gray-300" />
            <button
              type="button"
              class="absolute right-3 top-2 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
              :aria-label="t('pos.closeCart')"
              @click="close"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-hidden">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const show = defineModel<boolean>("show", { default: false });

const { t } = useI18n();

function close() {
  show.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && show.value) {
    close();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.cart-sheet-enter-active,
.cart-sheet-leave-active {
  transition: opacity 0.2s ease;
}

.cart-sheet-enter-active > div:last-child,
.cart-sheet-leave-active > div:last-child {
  transition: transform 0.25s ease;
}

.cart-sheet-enter-from,
.cart-sheet-leave-to {
  opacity: 0;
}

.cart-sheet-enter-from > div:last-child,
.cart-sheet-leave-to > div:last-child {
  transform: translateY(100%);
}
</style>
