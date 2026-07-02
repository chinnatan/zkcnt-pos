<script setup lang="ts">
import type { Product } from "~/lib/types";
import { getCachedBlobUrl } from "~/lib/files/blobs";

const props = withDefaults(
  defineProps<{
    product: Product;
    size?: "sm" | "md" | "lg" | "fill";
    thumb?: string;
    square?: boolean;
  }>(),
  { size: "md", thumb: "100x100", square: false },
);

const { getFileUrl } = useFileUrl();

const sizeClass = computed(() => {
  switch (props.size) {
    case "sm":
      return "h-10 w-10 text-sm";
    case "lg":
      return "h-16 w-16 text-2xl";
    case "fill":
      return "pos-tile-image w-full text-xl md:text-2xl";
    default:
      return "h-10 w-10 text-base";
  }
});

const showFallback = ref(false);
const cachedUrl = ref<string | null>(null);

const remoteUrl = computed(() => {
  if (!props.product.image || showFallback.value) return null;
  return getFileUrl(props.product, props.product.image, { thumb: props.thumb });
});

const displayUrl = computed(() => cachedUrl.value ?? remoteUrl.value);

async function loadCachedBlob() {
  const url = await getCachedBlobUrl("products", props.product.id, "image");
  if (url) cachedUrl.value = url;
}

function onError() {
  showFallback.value = true;
}

watch(
  () =>
    [props.product.id, props.product.image, props.product.updated] as const,
  () => {
    showFallback.value = false;
    if (cachedUrl.value) {
      URL.revokeObjectURL(cachedUrl.value);
      cachedUrl.value = null;
    }
    loadCachedBlob();
  },
  { immediate: true },
);

onUnmounted(() => {
  if (cachedUrl.value) URL.revokeObjectURL(cachedUrl.value);
});
</script>

<template>
  <div
    class="flex items-center justify-center overflow-hidden bg-primary-100 font-display font-bold text-primary-700"
    :class="[sizeClass, square ? 'rounded-sm' : 'rounded-xl', size !== 'fill' ? 'flex-shrink-0' : '']"
  >
    <img
      v-if="displayUrl && !showFallback"
      :src="displayUrl"
      :alt="product.name"
      class="h-full w-full object-cover"
      loading="lazy"
      @error="onError"
    />
    <span v-else>{{ product.name.charAt(0) }}</span>
  </div>
</template>
