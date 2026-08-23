import type {
  AdminClientSession,
  AdminHealth,
  AdminOverview,
  AdminStoreListItem,
  AdminUserListItem,
  AuditEvent,
  Store,
} from "~/lib/types";
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
  };
}

export function useIsPlatformAdmin() {
  const { authUser } = useAuth();
  return computed(() => !!authUser.value?.is_platform_admin);
}
