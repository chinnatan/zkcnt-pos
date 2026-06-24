<template>
  <Teleport to="body">
    <Transition name="cart-sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-50 md:hidden"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div
          class="pos-mobile-sheet-backdrop"
          @click="close"
        />

        <div
          ref="panelRef"
          class="pos-mobile-sheet-panel"
          style="padding-bottom: env(safe-area-inset-bottom)"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div class="relative flex shrink-0 flex-col items-center border-b border-primary-200/60 px-4 py-3" style="border-bottom-style: dashed">
            <div class="mb-1 h-1 w-10 cursor-grab rounded-full bg-primary-200 active:cursor-grabbing" />
            <button
              type="button"
              class="touch-pos absolute right-3 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface"
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

const titleId = "mobile-cart-sheet-title";
const panelRef = ref<HTMLElement | null>(null);
const touchStartY = ref(0);
const touchDeltaY = ref(0);

function close() {
  show.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && show.value) {
    close();
  }
}

function onTouchStart(e: TouchEvent) {
  touchStartY.value = e.touches[0]?.clientY ?? 0;
  touchDeltaY.value = 0;
}

function onTouchMove(e: TouchEvent) {
  const y = e.touches[0]?.clientY ?? 0;
  touchDeltaY.value = y - touchStartY.value;
  if (touchDeltaY.value > 0 && panelRef.value) {
    panelRef.value.style.transform = `translateY(${touchDeltaY.value}px)`;
  }
}

function onTouchEnd() {
  if (panelRef.value) {
    panelRef.value.style.transform = "";
  }
  if (touchDeltaY.value > 80) {
    close();
  }
  touchDeltaY.value = 0;
}

watch(show, (open) => {
  if (!import.meta.client) return;
  document.body.style.overflow = open ? "hidden" : "";
});

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  if (import.meta.client) {
    document.body.style.overflow = "";
  }
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
