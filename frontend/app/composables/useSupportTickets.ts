import type {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketDetail,
  SupportTicketPriority,
  SupportTicketStatus,
} from "~/lib/types";

export function useSupportTickets() {
  const { $api } = useNuxtApp();
  const route = useRoute();
  const { activeStoreId } = useStore();
  const { appVersion, buildId } = useAppVersion();

  function buildMetadata() {
    return {
      app_version: appVersion.value,
      client_version: appVersion.value,
      client_build: buildId.value,
      page_url: typeof window !== "undefined" ? window.location.href : route.fullPath,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      platform: typeof navigator !== "undefined" ? navigator.platform : "",
    };
  }

  function listTickets(params?: { limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return $api.send<{ items: SupportTicket[]; totalItems: number }>(
      `/support/tickets${q ? `?${q}` : ""}`,
    );
  }

  function getTicket(ticketId: string) {
    return $api.send<SupportTicketDetail>(`/support/tickets/${ticketId}`);
  }

  function createTicket(input: {
    subject: string;
    body_html: string;
    category: SupportTicketCategory;
  }) {
    return $api.send<SupportTicketDetail>("/support/tickets", {
      method: "POST",
      body: {
        subject: input.subject,
        body_html: input.body_html,
        category: input.category,
        store: activeStoreId.value,
        metadata: buildMetadata(),
      },
    });
  }

  function replyToTicket(ticketId: string, body_html: string) {
    return $api.send<SupportTicketDetail>(`/support/tickets/${ticketId}/messages`, {
      method: "POST",
      body: { body_html },
    });
  }

  return {
    listTickets,
    getTicket,
    createTicket,
    replyToTicket,
  };
}

export function useSupportTicketLabels() {
  const { t } = useI18n();

  function categoryLabel(category: SupportTicketCategory) {
    return t(`support.categories.${category}`);
  }

  function statusLabel(status: SupportTicketStatus) {
    return t(`support.statuses.${status}`);
  }

  function priorityLabel(priority: SupportTicketPriority) {
    return t(`support.priorities.${priority}`);
  }

  return { categoryLabel, statusLabel, priorityLabel };
}
