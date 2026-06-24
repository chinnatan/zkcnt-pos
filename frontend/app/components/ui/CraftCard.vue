<template>
  <div
    :class="[
      'craft-card',
      `craft-card--${variant}`,
      paddingClass,
      { 'transition-transform duration-200': tilt !== false },
    ]"
    :style="tiltStyle"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
export type CraftCardVariant =
  | "paper"
  | "tag"
  | "polaroid"
  | "stitched"
  | "kraft"
  | "canvas"
  | "ticket"
  | "label";

const props = withDefaults(
  defineProps<{
    variant?: CraftCardVariant;
    padding?: "none" | "sm" | "md" | "lg";
    tilt?: boolean | number;
  }>(),
  {
    variant: "paper",
    padding: "md",
    tilt: false,
  },
);

const paddingClass = computed(() => {
  const map = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  } as const;
  return map[props.padding];
});

const tiltStyle = computed(() => {
  if (props.tilt === false) return undefined;
  const deg = typeof props.tilt === "number" ? props.tilt : -0.5;
  return { transform: `rotate(${deg}deg)` };
});
</script>
