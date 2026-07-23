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
        v-if="show"
        :class="[
          'craft-modal-backdrop',
          align === 'top' ? 'craft-modal-backdrop--top' : 'craft-modal-backdrop--center',
          zClass,
        ]"
        @click.self="closeOnBackdrop && emit('close')"
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
            v-if="show"
            role="dialog"
            aria-modal="true"
            :class="['craft-modal-panel', `craft-modal--${variant}`, sizeClass]"
          >
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export type CraftModalVariant =
  | "stitched"
  | "paper"
  | "tag"
  | "ticket"
  | "label"
  | "canvas";

const props = withDefaults(
  defineProps<{
    show: boolean;
    variant?: CraftModalVariant;
    size?: "sm" | "md" | "lg" | "xl";
    align?: "center" | "top";
    zClass?: string;
    closeOnBackdrop?: boolean;
  }>(),
  {
    variant: "stitched",
    size: "md",
    align: "center",
    zClass: "z-50",
    closeOnBackdrop: false,
  },
);

const emit = defineEmits<{ close: [] }>();

const sizeClass = computed(() => {
  const map = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-6xl",
  } as const;
  return map[props.size];
});
</script>
