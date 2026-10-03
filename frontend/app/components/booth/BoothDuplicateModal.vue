<template>
  <UiCraftModal :show="show" variant="paper" size="md" align="top" :close-on-backdrop="false" @close="emit('close')">
    <form class="space-y-4 p-6" data-testid="booth-duplicate-modal" @submit.prevent="submit">
      <div>
        <h3 class="text-base font-semibold text-ink">{{ t('boothsPage.duplicateTitle') }}</h3>
        <p class="text-xs text-ink-muted">{{ t('boothsPage.duplicateHint') }}</p>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.name') }}</label>
        <input v-model="form.name" type="text" required class="input w-full" data-testid="booth-duplicate-name" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.dates') }}</label>
        <BoothDateRangePicker v-model="form.range" :week-start="weekStart" />
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button type="submit" class="btn-primary" data-testid="booth-duplicate-submit" :disabled="!form.name.trim() || isSaving">
          {{ isSaving ? t('common.saving') : t('boothsPage.duplicateSubmit') }}
        </button>
      </div>
    </form>
  </UiCraftModal>
</template>

<script setup lang="ts">
import type { DateRange } from "~/lib/booths/calendar";
import type { Booth } from "~/lib/types";

const props = defineProps<{ show: boolean; source: Booth | null; weekStart: number }>();
const emit = defineEmits<{ close: []; created: [id: string] }>();

const { t } = useI18n();
const { duplicateBooth } = useBooths();

const isSaving = ref(false);
const form = reactive({ name: "", range: { start: "", end: "" } as DateRange });

watch(
  () => props.show,
  (open) => {
    if (!open || !props.source) return;
    form.name = t("boothsPage.copyName", { name: props.source.name });
    form.range = { start: "", end: "" };
  },
);

async function submit() {
  if (!props.source || !form.name.trim()) return;
  isSaving.value = true;
  try {
    const booth = await duplicateBooth(props.source.id, {
      name: form.name.trim(),
      start_date: form.range.start,
      end_date: form.range.end || form.range.start,
    });
    emit("created", booth.id);
  } finally {
    isSaving.value = false;
  }
}
</script>
