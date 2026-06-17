import type { AuditEvent, AuditReconciliation } from "~/lib/types";
import { resolveApiBaseUrl } from "~/lib/api/url";

export function useAuditEvents() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  const events = ref<AuditEvent[]>([]);
  const totalItems = ref(0);
  const reconciliation = ref<AuditReconciliation | null>(null);
  const isLoading = ref(false);
  const error = ref("");

  async function fetchEvents(filters: {
    since?: string;
    until?: string;
    action?: string;
    entity_type?: string;
    entity_id?: string;
    actor?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    if (!activeStoreId.value || !isOnline.value) {
      error.value = "offline";
      return;
    }

    isLoading.value = true;
    error.value = "";
    try {
      const params = new URLSearchParams();
      if (filters.since) params.set("since", filters.since);
      if (filters.until) params.set("until", filters.until);
      if (filters.action) params.set("action", filters.action);
      if (filters.entity_type) params.set("entity_type", filters.entity_type);
      if (filters.entity_id) params.set("entity_id", filters.entity_id);
      if (filters.actor) params.set("actor", filters.actor);
      params.set("limit", String(filters.limit ?? 50));
      params.set("offset", String(filters.offset ?? 0));

      const result = await $api.send<{ items: AuditEvent[]; totalItems: number }>(
        `/stores/${activeStoreId.value}/audit-events?${params.toString()}`,
      );
      events.value = result.items;
      totalItems.value = result.totalItems;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load audit events";
      events.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchReconciliation(since?: string, until?: string) {
    if (!activeStoreId.value || !isOnline.value) return;

    const params = new URLSearchParams();
    if (since) params.set("since", since);
    if (until) params.set("until", until);

    try {
      reconciliation.value = await $api.send<AuditReconciliation>(
        `/stores/${activeStoreId.value}/audit-events/reconciliation?${params.toString()}`,
      );
    } catch {
      reconciliation.value = null;
    }
  }

  function exportCsv(filters: {
    since?: string;
    until?: string;
    action?: string;
  } = {}) {
    if (!activeStoreId.value) return;

    const params = new URLSearchParams();
    if (filters.since) params.set("since", filters.since);
    if (filters.until) params.set("until", filters.until);
    if (filters.action) params.set("action", filters.action);

    const config = useRuntimeConfig();
    const baseUrl = resolveApiBaseUrl(config.public.apiUrl as string);
    const { $api } = useNuxtApp();
    const token = $api.token;

    const url = `${baseUrl}/stores/${activeStoreId.value}/audit-events/export.csv?${params.toString()}`;
    if (!token) return;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "audit-export.csv";
        link.click();
        URL.revokeObjectURL(link.href);
      });
  }

  return {
    events: readonly(events),
    totalItems: readonly(totalItems),
    reconciliation: readonly(reconciliation),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchEvents,
    fetchReconciliation,
    exportCsv,
  };
}
