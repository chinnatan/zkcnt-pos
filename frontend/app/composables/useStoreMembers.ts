import type { MemberInviteMode, StoreInvite, StoreMember } from "~/lib/types";

function toStoreMember(record: Record<string, unknown>): StoreMember {
  return {
    id: String(record.id),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
    collectionId: String(record.collectionId ?? ""),
    collectionName: String(record.collectionName ?? "store_members"),
    store: String(record.store ?? ""),
    user: String(record.user ?? ""),
    role: record.role as StoreMember["role"],
    is_active: record.is_active !== false,
    expand: record.expand as StoreMember["expand"],
  };
}

function toStoreInvite(record: Record<string, unknown>): StoreInvite {
  return {
    id: String(record.id),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
    collectionId: String(record.collectionId ?? ""),
    collectionName: String(record.collectionName ?? "store_invites"),
    store: String(record.store ?? ""),
    email: String(record.email ?? ""),
    role: record.role as StoreInvite["role"],
    token: String(record.token ?? ""),
    status: record.status as StoreInvite["status"],
    invited_by: String(record.invited_by ?? ""),
    expires: String(record.expires ?? ""),
  };
}

export function useStoreMembers() {
  const { $api } = useNuxtApp();
  const config = useRuntimeConfig();
  const { activeStore, activeStoreId, isOwner, setActiveStore, updateStore } = useStore();

  const storeMembers = ref<StoreMember[]>([]);
  const pendingInvites = ref<StoreInvite[]>([]);
  const isLoadingMembers = ref(false);
  const membersError = ref<string | null>(null);

  const memberInviteMode = computed<MemberInviteMode>(
    () => activeStore.value?.settings?.member_invite_mode ?? "direct",
  );

  const appUrl = computed(
    () => (config.public.appUrl as string) || "http://localhost:3000",
  );

  async function fetchStoreMembers(storeId?: string) {
    const id = storeId ?? activeStoreId.value;
    if (!id) return;

    isLoadingMembers.value = true;
    membersError.value = null;

    try {
      const records = await $api.send<Record<string, unknown>[]>(
        `/stores/${id}/team-members`,
      );
      storeMembers.value = records.map((r) => toStoreMember(r));
    } catch (e: unknown) {
      membersError.value =
        e instanceof Error ? e.message : "errors.loadMembersFailed";
      storeMembers.value = [];
    } finally {
      isLoadingMembers.value = false;
    }
  }

  async function fetchPendingInvites(storeId?: string) {
    const id = storeId ?? activeStoreId.value;
    if (!id) return;

    try {
      const records = await $api.send<Record<string, unknown>[]>(
        `/stores/${id}/invites?status=pending`,
      );
      pendingInvites.value = records.map((r) => toStoreInvite(r));
    } catch {
      pendingInvites.value = [];
    }
  }

  async function refreshTeamData(storeId?: string) {
    await fetchStoreMembers(storeId);
    if (memberInviteMode.value === "email") {
      await fetchPendingInvites(storeId);
    } else {
      pendingInvites.value = [];
    }
  }

  async function addMemberDirect(email: string, role: "manager" | "cashier") {
    if (!activeStoreId.value) throw new Error("No active store");

    const response = await $api.send("/members/add-by-email", {
      method: "POST",
      body: {
        storeId: activeStoreId.value,
        email,
        role,
      },
    });

    await refreshTeamData();
    return response;
  }

  async function sendInvite(email: string, role: "manager" | "cashier") {
    if (!activeStoreId.value) throw new Error("No active store");

    const record = await $api.send<Record<string, unknown>>(
      `/stores/${activeStoreId.value}/invites`,
      {
        method: "POST",
        body: { email, role, status: "pending" },
      },
    );

    await refreshTeamData();

    const invite = toStoreInvite(record);
    return {
      invite,
      inviteLink: `${appUrl.value.replace(/\/$/, "")}/invite/${invite.token}`,
    };
  }

  async function addOrInvite(email: string, role: "manager" | "cashier") {
    if (memberInviteMode.value === "email") {
      return sendInvite(email, role);
    }
    return addMemberDirect(email, role);
  }

  async function cancelInvite(id: string) {
    if (!activeStoreId.value) return;
    await $api.send(`/stores/${activeStoreId.value}/invites/${id}`, {
      method: "PATCH",
      body: { status: "cancelled" },
    });
    await fetchPendingInvites();
  }

  async function removeMember(id: string) {
    if (!activeStoreId.value) return;
    await $api.send(`/stores/${activeStoreId.value}/members/${id}`, {
      method: "DELETE",
    });
    await fetchStoreMembers();
  }

  async function lookupInvite(token: string): Promise<{
    storeName: string;
    email: string;
    role: "manager" | "cashier";
    status: string;
    expires: string;
  }> {
    return await $api.send(`/invites/${token}`, { auth: false });
  }

  async function acceptInvite(token: string) {
    return await $api.send("/invites/accept", {
      method: "POST",
      body: { token },
    });
  }

  async function updateInviteMode(mode: MemberInviteMode) {
    if (!activeStore.value || !activeStoreId.value) throw new Error("No active store");
    if (!isOwner.value) throw new Error("Only owners can change invite mode");

    const settings = {
      ...activeStore.value.settings,
      member_invite_mode: mode,
    };

    await updateStore(activeStoreId.value, { settings } as never);
    await refreshTeamData();
  }

  return {
    storeMembers: readonly(storeMembers),
    pendingInvites: readonly(pendingInvites),
    isLoadingMembers: readonly(isLoadingMembers),
    membersError: readonly(membersError),
    memberInviteMode,
    appUrl,
    fetchStoreMembers,
    fetchPendingInvites,
    refreshTeamData,
    addMemberDirect,
    sendInvite,
    addOrInvite,
    cancelInvite,
    removeMember,
    lookupInvite,
    acceptInvite,
    updateInviteMode,
  };
}
