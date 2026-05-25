import type { Store, StoreMember } from "~/lib/types";
import { db } from "~/lib/db";

const activeStore = ref<Store | null>(null);
const userStores = ref<Store[]>([]);
const userMemberships = ref<StoreMember[]>([]);
const isLoadingStores = ref(false);

export function useStore() {
  const { $pb } = useNuxtApp();
  const { authUser } = useAuth();

  const activeStoreId = computed(() => activeStore.value?.id ?? null);

  const currentRole = computed(() => {
    if (!activeStore.value || !authUser.value) return null;
    const membership = userMemberships.value.find(
      (m) => m.store === activeStore.value!.id && m.user === authUser.value!.id
    );
    return membership?.role ?? null;
  });

  const isOwner = computed(() => currentRole.value === "owner");
  const isManager = computed(() => currentRole.value === "manager" || isOwner.value);

  async function fetchUserStores() {
    if (!authUser.value) return;
    isLoadingStores.value = true;
    try {
      const memberships = await $pb.collection("store_members").getFullList({
        filter: `user = "${authUser.value.id}" && is_active = true`,
        expand: "store",
      });

      userMemberships.value = memberships as unknown as StoreMember[];
      userStores.value = memberships
        .map((m) => m.expand?.store as unknown as Store)
        .filter(Boolean);

      // Cache in Dexie
      await db.stores.bulkPut(userStores.value);
      await db.storeMembers.bulkPut(
        memberships.map((m) => ({ ...m, expand: undefined }))
      );

      // Auto-select if only one store
      if (userStores.value.length === 1 && !activeStore.value) {
        await setActiveStore(userStores.value[0]);
      }

      // Restore previous selection
      const savedId = localStorage.getItem("active_store_id");
      if (savedId && !activeStore.value) {
        const found = userStores.value.find((s) => s.id === savedId);
        if (found) await setActiveStore(found);
      }
    } catch {
      // Fallback to Dexie when offline
      const cachedMembers = await db.storeMembers
        .where("user")
        .equals(authUser.value.id)
        .toArray();
      userMemberships.value = cachedMembers as StoreMember[];

      const storeIds = cachedMembers.map((m) => m.store);
      const cachedStores = await db.stores.where("id").anyOf(storeIds).toArray();
      userStores.value = cachedStores as Store[];

      const savedId = localStorage.getItem("active_store_id");
      if (savedId && !activeStore.value) {
        const found = userStores.value.find((s) => s.id === savedId);
        if (found) await setActiveStore(found);
      }
    } finally {
      isLoadingStores.value = false;
    }
  }

  async function setActiveStore(store: Store) {
    activeStore.value = store;
    localStorage.setItem("active_store_id", store.id);
  }

  async function createStore(data: { name: string; slug: string; address?: string; phone?: string }) {
    if (!authUser.value) throw new Error("Not authenticated");

    const store = await $pb.collection("stores").create({
      ...data,
      owner: authUser.value.id,
      is_active: true,
      settings: { currency: "THB", vat_rate: 7, receipt_header: "", receipt_footer: "" },
    });

    await $pb.collection("store_members").create({
      store: store.id,
      user: authUser.value.id,
      role: "owner",
      is_active: true,
    });

    await fetchUserStores();
    return store;
  }

  async function inviteMember(email: string, role: "manager" | "cashier") {
    if (!activeStore.value) throw new Error("No active store");

    const users = await $pb.collection("users").getFullList({
      filter: `email = "${email}"`,
    });

    if (users.length === 0) throw new Error("User not found");

    return await $pb.collection("store_members").create({
      store: activeStore.value.id,
      user: users[0].id,
      role,
      is_active: true,
    });
  }

  return {
    activeStore: readonly(activeStore),
    activeStoreId,
    userStores: readonly(userStores),
    userMemberships: readonly(userMemberships),
    isLoadingStores: readonly(isLoadingStores),
    currentRole,
    isOwner,
    isManager,
    fetchUserStores,
    setActiveStore,
    createStore,
    inviteMember,
  };
}
