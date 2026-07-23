<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.visible"
        class="craft-modal-backdrop craft-modal-backdrop--center z-[100]"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-if="state.visible"
            role="dialog"
            aria-modal="true"
            :class="['craft-modal-panel', dialogVariant, 'max-w-md']"
            @keydown.enter.prevent="onConfirm"
          >
            <div class="mb-4 flex items-start gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                :class="iconBgClass"
              >
                <svg class="h-5 w-5" :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    v-if="state.type === 'confirm'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                  <path
                    v-else
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 v-if="title" class="font-display text-lg font-semibold text-ink">{{ title }}</h3>
                <p class="text-sm text-ink-muted" :class="title ? 'mt-1' : ''">{{ state.message }}</p>
              </div>
            </div>

            <input
              v-if="state.type === 'prompt'"
              ref="inputRef"
              v-model="inputValue"
              type="text"
              :placeholder="state.inputPlaceholder"
              class="input mb-4"
            />

            <div class="flex justify-end gap-2">
              <button
                v-if="state.type !== 'alert'"
                type="button"
                class="btn-secondary"
                @click="onCancel"
              >
                {{ cancelLabel }}
              </button>
              <button
                type="button"
                class="btn-primary"
                :class="state.variant === 'danger' ? 'bg-danger-500 hover:bg-danger-700' : ''"
                @click="onConfirm"
              >
                {{ confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { state, onConfirm, onCancel, setInputValue } = useDialog();

const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref("");

watch(
  () => state.visible,
  async (visible) => {
    if (!visible) return;
    inputValue.value = state.inputValue;
    if (state.type === "prompt") {
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

watch(inputValue, (value) => {
  setInputValue(value);
});

const title = computed(() => state.title || defaultTitle.value);

const defaultTitle = computed(() => {
  if (state.type === "confirm") return t("common.confirmTitle");
  if (state.type === "prompt") return t("common.inputTitle");
  return t("common.noticeTitle");
});

const confirmLabel = computed(() => {
  if (state.confirmText) return state.confirmText;
  if (state.type === "alert") return t("common.ok");
  return t("common.confirm");
});

const cancelLabel = computed(() => state.cancelText || t("common.cancel"));

const dialogVariant = computed(() =>
  state.variant === "danger" ? "craft-modal--label" : "craft-modal--stitched",
);

const iconBgClass = computed(() =>
  state.variant === "danger" ? "bg-danger-100" : "bg-primary-50",
);

const iconClass = computed(() =>
  state.variant === "danger" ? "text-danger-500" : "text-primary-600",
);
</script>
