<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <h2 class="text-lg font-semibold text-ink">{{ t('admin.announcements.title') }}</h2>

    <UiCraftCard variant="paper" padding="md">
      <form class="space-y-4" @submit.prevent="save">
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.active" type="checkbox" class="rounded border-border-warm" />
          {{ t('admin.announcements.active') }}
        </label>

        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('admin.announcements.severity') }}</label>
          <select v-model="form.severity" class="input w-full">
            <option value="info">{{ t('admin.announcements.severities.info') }}</option>
            <option value="warning">{{ t('admin.announcements.severities.warning') }}</option>
            <option value="critical">{{ t('admin.announcements.severities.critical') }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('admin.announcements.messageTh') }}</label>
          <textarea v-model="form.message_th" rows="3" class="input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('admin.announcements.messageEn') }}</label>
          <textarea v-model="form.message_en" rows="3" class="input w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('admin.announcements.expiresAt') }}</label>
          <input v-model="form.expires_at" type="datetime-local" class="input w-full" />
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="submit" class="btn-primary" :disabled="isSaving">{{ t('admin.announcements.save') }}</button>
          <button type="button" class="btn-secondary" :disabled="isSaving" @click="clearAnnouncement">
            {{ t('admin.announcements.clear') }}
          </button>
        </div>
      </form>
    </UiCraftCard>

    <UiCraftCard v-if="previewMessage" variant="canvas" padding="md">
      <p class="mb-2 text-xs font-medium uppercase text-ink-muted">{{ t('admin.announcements.preview') }}</p>
      <p class="text-sm">{{ previewMessage }}</p>
    </UiCraftCard>
  </div>
</template>

<script setup lang="ts">
import type { PlatformAnnouncement } from "~/composables/usePlatformAnnouncement";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t, locale } = useI18n();
const { alert } = useDialog();
const { getAnnouncement, saveAnnouncement } = usePlatformAdmin();
const { fetchAnnouncement } = usePlatformAnnouncement();
const { datetimeLocalToIso, toDatetimeLocalValue } = useFormat();

const form = reactive({
  active: false,
  severity: "info" as PlatformAnnouncement["severity"],
  message_th: "",
  message_en: "",
  expires_at: "",
});
const isSaving = ref(false);

const previewMessage = computed(() =>
  locale.value === "th"
    ? form.message_th || form.message_en
    : form.message_en || form.message_th,
);

onMounted(async () => {
  const announcement = await getAnnouncement();
  form.active = announcement.active;
  form.severity = announcement.severity;
  form.message_th = announcement.message_th;
  form.message_en = announcement.message_en;
  form.expires_at = announcement.expires_at
    ? toDatetimeLocalValue(new Date(announcement.expires_at))
    : "";
});

async function save() {
  isSaving.value = true;
  try {
    await saveAnnouncement({
      active: form.active,
      severity: form.severity,
      message_th: form.message_th,
      message_en: form.message_en,
      expires_at: form.expires_at ? (datetimeLocalToIso(form.expires_at) ?? null) : null,
    });
    await fetchAnnouncement();
  } catch (err) {
    await alert(err instanceof Error ? err.message : t("common.error"));
  } finally {
    isSaving.value = false;
  }
}

async function clearAnnouncement() {
  form.active = false;
  form.message_th = "";
  form.message_en = "";
  form.expires_at = "";
  await save();
}
</script>
