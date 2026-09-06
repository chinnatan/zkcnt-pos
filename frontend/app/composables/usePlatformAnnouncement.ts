export interface PlatformAnnouncement {
  active: boolean;
  severity: "info" | "warning" | "critical";
  message_th: string;
  message_en: string;
  expires_at: string | null;
  updated: string;
}

const announcement = ref<PlatformAnnouncement | null>(null);
let fetched = false;

export function usePlatformAnnouncement() {
  const { $api } = useNuxtApp();
  const { locale } = useI18n();

  const message = computed(() => {
    if (!announcement.value) return "";
    return locale.value === "th"
      ? announcement.value.message_th || announcement.value.message_en
      : announcement.value.message_en || announcement.value.message_th;
  });

  async function fetchAnnouncement() {
    try {
      const res = await $api.send<{ announcement: PlatformAnnouncement | null }>(
        "/platform/announcement",
        { auth: false },
      );
      announcement.value = res.announcement;
    } catch {
      announcement.value = null;
    } finally {
      fetched = true;
    }
  }

  if (import.meta.client && !fetched) {
    void fetchAnnouncement();
  }

  return {
    announcement: readonly(announcement),
    message,
    fetchAnnouncement,
  };
}
