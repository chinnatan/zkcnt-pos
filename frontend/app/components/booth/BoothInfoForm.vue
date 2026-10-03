<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.name') }}</label>
      <input v-model="form.name" required type="text" class="input w-full" data-testid="booth-info-name" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.location') }}</label>
      <input v-model="form.location" type="text" class="input w-full" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.dates') }}</label>
      <BoothDateRangePicker v-model="form.range" :week-start="weekStart" />
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.image') }}</label>
      <div class="flex items-center gap-4">
        <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-warm bg-surface">
          <img v-if="imageUrl" :src="imageUrl" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="space-y-1">
          <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="uploadImage" />
          <div class="flex gap-2">
            <button type="button" class="btn-secondary" :disabled="!isOnline || isUploading" @click="imageInput?.click()">
              {{ t('boothsPage.uploadImage') }}
            </button>
            <button v-if="booth.image" type="button" class="btn-secondary" :disabled="!isOnline || isUploading" @click="removeImage">
              {{ t('boothsPage.removeImage') }}
            </button>
          </div>
          <p v-if="!isOnline" class="text-xs text-ink-muted">{{ t('boothsPage.imageOnline') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import type { Booth } from "~/lib/types";
import type { BoothForm } from "~/lib/booths/form";

const props = defineProps<{ booth: Booth; weekStart: number }>();
const form = defineModel<BoothForm>({ required: true });

const { t } = useI18n();
const { $api } = useNuxtApp();
const { activeStoreId } = useStore();
const { isOnline } = useOnlineStatus();
const { getFileUrl } = useFileUrl();
const { fetchBooths } = useBooths();

const imageInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const imageUrl = computed(() => (props.booth.image ? getFileUrl(props.booth) : ""));

// the image is saved immediately (not part of the draft form)
async function sendImage(data: FormData) {
  if (!activeStoreId.value) return;
  isUploading.value = true;
  try {
    const record = await $api.uploadBoothImage(activeStoreId.value, props.booth.id, data);
    await db.booths.put(record as never);
    await fetchBooths();
  } finally {
    isUploading.value = false;
  }
}

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const data = new FormData();
  data.append("image", file);
  await sendImage(data);
}

async function removeImage() {
  const data = new FormData();
  data.append("image", "");
  data.append("remove", "true");
  await sendImage(data);
}
</script>
