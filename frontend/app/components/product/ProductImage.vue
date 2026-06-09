<script setup lang="ts">
import type { Product } from "~/lib/types";
import { getCachedBlobUrl } from "~/lib/files/blobs";

const props = withDefaults(
  defineProps<{
    product: Product;
    size?: "sm" | "md" | "lg";
    thumb?: string;
  }>(),
  { size: "md", thumb: "100x100" },
);

const { getFileUrl } = useFileUrl();

const sizeClass = computed(() => {
  switch (props.size) {
    case "sm":
      return "h-10 w-10 text-sm";
    case "lg":
      return "h-16 w-16 text-2xl";
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
  () => props.product.id,
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
    class="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-50 font-bold text-primary-600"
    :class="sizeClass"
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
