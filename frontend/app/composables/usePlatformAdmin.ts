import type {
  AdminClientSession,
  AdminHealth,
  AdminOverview,
  AdminStoreListItem,
  AdminUserListItem,
  AuditEvent,
  Store,
  SupportTicket,
  SupportTicketDetail,
  SupportTicketPriority,
  SupportTicketStatus,
} from "~/lib/types";
import type { PlatformAnnouncement } from "~/composables/usePlatformAnnouncement";
import { resolveApiBaseUrl } from "~/lib/api/url";

export function usePlatformAdmin() {
  const { $api } = useNuxtApp();

  function getOverview() {
    return $api.send<AdminOverview>("/admin/overview");
  }

  function listStores(params?: { limit?: number; offset?: number; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return $api.send<{ items: AdminStoreListItem[]; totalItems: number }>(
      `/admin/stores${q ? `?${q}` : ""}`,
    );
  }

  function getStore(storeId: string) {
    return $api.send<{
      store: Store;
      owner: { email: string; name: string } | null;
      members: Array<{
        id: string;
        user: string;
        role: string;
        is_active: boolean;
        name: string;
        email: string;
      }>;
      stats: { orders: number; gmv: number; products: number; customers: number };
      feature_flags: Record<string, boolean>;
      recent_audit: AuditEvent[];
    }>(`/admin/stores/${storeId}`);
  }

  function patchStore(
    storeId: string,
    body: { is_active?: boolean; feature_flags?: Record<string, boolean> },
  ) {
    return $api.send(`/admin/stores/${storeId}`, { method: "PATCH", body });
  }

  function listUsers(params?: { limit?: number; offset?: number; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return $api.send<{ items: AdminUserListItem[]; totalItems: number }>(
      `/admin/users${q ? `?${q}` : ""}`,
    );
  }

  function getUser(userId: string) {
    return $api.send<{
      user: AdminUserListItem;
      memberships: Array<{
        id: string;
        store: string;
        store_name: string;
        role: string;
        is_active: boolean;
      }>;
      auth_events: AuditEvent[];
    }>(`/admin/users/${userId}`);
  }

  function patchUser(userId: string, body: { is_active: boolean }) {
    return $api.send(`/admin/users/${userId}`, { method: "PATCH", body });
  }

  function listAudit(params?: {
    limit?: number;
    offset?: number;
    since?: string;
    until?: string;
    action?: string;
    store?: string;
    actor?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    if (params?.action) qs.set("action", params.action);
    if (params?.store) qs.set("store", params.store);
    if (params?.actor) qs.set("actor", params.actor);
    const q = qs.toString();
    return $api.send<{ items: AuditEvent[]; totalItems: number }>(
      `/admin/audit${q ? `?${q}` : ""}`,
    );
  }

  function getHealth() {
    return $api.send<AdminHealth>("/admin/health");
  }

  function listDevices(params?: { limit?: number; offset?: number; store?: string }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.store) qs.set("store", params.store);
    const q = qs.toString();
    return $api.send<{ items: AdminClientSession[]; totalItems: number }>(
      `/admin/devices${q ? `?${q}` : ""}`,
    );
  }

  function exportAuditCsv(filters: {
    since?: string;
    until?: string;
    action?: string;
    store?: string;
    actor?: string;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.since) params.set("since", filters.since);
    if (filters.until) params.set("until", filters.until);
    if (filters.action) params.set("action", filters.action);
    if (filters.store) params.set("store", filters.store);
    if (filters.actor) params.set("actor", filters.actor);

    const config = useRuntimeConfig();
    const baseUrl = resolveApiBaseUrl(config.public.apiUrl as string);
    const token = $api.token;
    if (!token) return;

    const url = `${baseUrl}/admin/audit/export.csv?${params.toString()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "platform-audit.csv";
        link.click();
        URL.revokeObjectURL(link.href);
      });
  }

  function listTickets(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
    store?: string;
    search?: string;
  }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.store) qs.set("store", params.store);
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return $api.send<{ items: SupportTicket[]; totalItems: number }>(
      `/admin/tickets${q ? `?${q}` : ""}`,
    );
  }

  function getTicket(ticketId: string) {
    return $api.send<SupportTicketDetail>(`/admin/tickets/${ticketId}`);
  }

  function patchTicket(
    ticketId: string,
    body: { status?: SupportTicketStatus; priority?: SupportTicketPriority },
  ) {
    return $api.send<SupportTicketDetail>(`/admin/tickets/${ticketId}`, {
      method: "PATCH",
      body,
    });
  }

  function replyToTicket(ticketId: string, body_html: string) {
    return $api.send<SupportTicketDetail>(`/admin/tickets/${ticketId}/messages`, {
      method: "POST",
      body: { body_html },
    });
  }

  function getAnnouncement() {
    return $api.send<PlatformAnnouncement>("/admin/announcement");
  }

  function saveAnnouncement(body: {
    active: boolean;
    severity: PlatformAnnouncement["severity"];
    message_th: string;
    message_en: string;
    expires_at: string | null;
  }) {
    return $api.send<PlatformAnnouncement>("/admin/announcement", {
      method: "PUT",
      body,
    });
  }

  function getOpsOverview() {
    return $api.send<{
      onboarding: Array<{ store_id: string; store_name: string; slug: string; issues: string[] }>;
      backup_last_run: string | null;
      sync_alerts: Array<{
        id: string;
        user: string;
        store: string;
        store_name: string;
        pending_sync_count: number;
        last_seen_at: string;
      }>;
    }>("/admin/ops");
  }

  function listPlatformConfig() {
    return $api.send<{ items: Array<{ key: string; value: string; updated: string }> }>("/admin/config");
  }

  function savePlatformConfig(key: string, value: string) {
    return $api.send(`/admin/config/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: { value },
    });
  }

  return {
    getOverview,
    listStores,
    getStore,
    patchStore,
    listUsers,
    getUser,
    patchUser,
    listAudit,
    getHealth,
    listDevices,
    exportAuditCsv,
    listTickets,
    getTicket,
    patchTicket,
    replyToTicket,
    getAnnouncement,
    saveAnnouncement,
    getOpsOverview,
    listPlatformConfig,
    savePlatformConfig,
  };
}

export function useIsPlatformAdmin() {
  const { authUser } = useAuth();
  return computed(() => !!authUser.value?.is_platform_admin);
}
