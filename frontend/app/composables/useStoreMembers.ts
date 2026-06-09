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
  const { $pb } = useNuxtApp();
  const config = useRuntimeConfig();
  const { activeStore, activeStoreId, isOwner, setActiveStore } = useStore();

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
      const records = await $pb.send(`/api/stores/${id}/team-members`, {
        method: "GET",
      });
      const list = Array.isArray(records) ? records : [];
      storeMembers.value = list.map((r) =>
        toStoreMember(r as unknown as Record<string, unknown>),
      );
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
      const records = await $pb.collection("store_invites").getFullList({
        filter: `store = "${id}" && status = "pending"`,
      });
      pendingInvites.value = records.map((r) =>
        toStoreInvite(r as unknown as Record<string, unknown>),
      );
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

    const response = await $pb.send("/api/members/add-by-email", {
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

    const record = await $pb.collection("store_invites").create({
      store: activeStoreId.value,
      email,
      role,
      status: "pending",
    });

    await refreshTeamData();

    const invite = toStoreInvite(record as unknown as Record<string, unknown>);
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
    await $pb.collection("store_invites").update(id, { status: "cancelled" });
    await fetchPendingInvites();
  }

  async function removeMember(id: string) {
    await $pb.collection("store_members").delete(id);
    await fetchStoreMembers();
  }

  async function lookupInvite(token: string) {
    return await $pb.send(`/api/invites/${token}`, { method: "GET" });
  }

  async function acceptInvite(token: string) {
    return await $pb.send("/api/invites/accept", {
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

    await $pb.collection("stores").update(activeStoreId.value, { settings });

    const updated = { ...activeStore.value, settings };
    await setActiveStore(updated);
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
