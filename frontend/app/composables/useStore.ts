import type { Store, StoreMember } from "~/lib/types";
import { db } from "~/lib/db";

const activeStore = ref<Store | null>(null);
const userStores = ref<Store[]>([]);
const userMemberships = ref<StoreMember[]>([]);
const isLoadingStores = ref(false);
const storesFetchError = ref<string | null>(null);

function relationId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: string }).id);
  }
  return "";
}

function toStoreRecord(record: Record<string, unknown>): Store {
  return {
    id: String(record.id),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
    collectionId: String(record.collectionId ?? ""),
    collectionName: String(record.collectionName ?? "stores"),
    name: String(record.name ?? ""),
    slug: String(record.slug ?? ""),
    address: String(record.address ?? ""),
    phone: String(record.phone ?? ""),
    tax_id: String(record.tax_id ?? ""),
    logo: String(record.logo ?? ""),
    settings: (record.settings as Store["settings"]) ?? {
      currency: "THB",
      vat_rate: 7,
      receipt_header: "",
      receipt_footer: "",
    },
    owner: relationId(record.owner),
    is_active: record.is_active !== false,
  };
}

function toStoreMemberRecord(record: Record<string, unknown>): StoreMember {
  return {
    id: String(record.id),
    created: String(record.created ?? ""),
    updated: String(record.updated ?? ""),
    collectionId: String(record.collectionId ?? ""),
    collectionName: String(record.collectionName ?? "store_members"),
    store: relationId(record.store),
    user: relationId(record.user),
    role: record.role as StoreMember["role"],
    is_active: record.is_active !== false,
  };
}

async function cacheStores(stores: Store[], members: StoreMember[]) {
  try {
    await db.stores.bulkPut(stores);
    await db.storeMembers.bulkPut(members);
  } catch (e) {
    console.warn("Failed to cache stores in Dexie:", e);
  }
}

export function useStore() {
  const { $pb } = useNuxtApp();
  const { authUser, initAuth } = useAuth();

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

  async function applyStoreSelection() {
    if (userStores.value.length === 1 && !activeStore.value) {
      await setActiveStore(userStores.value[0]);
    }

    const savedId = localStorage.getItem("active_store_id");
    if (savedId && !activeStore.value) {
      const found = userStores.value.find((s) => s.id === savedId);
      if (found) await setActiveStore(found);
    }
  }

  async function loadFromCache(userId: string) {
    const cachedMembers = await db.storeMembers
      .where("user")
      .equals(userId)
      .toArray();
    userMemberships.value = cachedMembers as StoreMember[];

    const storeIds = cachedMembers.map((m) => m.store);
    const cachedStores = await db.stores.where("id").anyOf(storeIds).toArray();
    userStores.value = cachedStores as Store[];

    await applyStoreSelection();
  }

  async function backfillOwnedStores(userId: string) {
    const ownedStores = await $pb.collection("stores").getFullList({
      filter: `owner = "${userId}"`,
    });

    for (const store of ownedStores) {
      try {
        await $pb.collection("store_members").create({
          store: store.id,
          user: userId,
          role: "owner",
          is_active: true,
        });
      } catch {
        // membership may already exist
      }
    }

    return ownedStores.length > 0;
  }

  async function fetchMemberships(userId: string) {
    const memberships = await $pb.collection("store_members").getFullList({
      filter: `user = "${userId}"`,
      expand: "store",
    });

    const members = memberships.map((m) =>
      toStoreMemberRecord(m as unknown as Record<string, unknown>)
    );
    const stores = memberships
      .map((m) => m.expand?.store)
      .filter(Boolean)
      .map((s) => toStoreRecord(s as unknown as Record<string, unknown>))
      .filter((s) => s.is_active !== false);

    await cacheStores(stores, members);

    userMemberships.value = members;
    userStores.value = stores;
  }

  async function fetchUserStores() {
    initAuth();

    if (!authUser.value) return;

    isLoadingStores.value = true;
    storesFetchError.value = null;

    try {
      await fetchMemberships(authUser.value.id);

      if (userStores.value.length === 0) {
        const hasOwned = await backfillOwnedStores(authUser.value.id);
        if (hasOwned) {
          await fetchMemberships(authUser.value.id);
        }
      }

      await applyStoreSelection();
    } catch (e: unknown) {
      console.error("fetchUserStores failed:", e);
      storesFetchError.value =
        e instanceof Error ? e.message : "Failed to load stores";

      try {
        await loadFromCache(authUser.value.id);
        if (userStores.value.length > 0) {
          storesFetchError.value = null;
        }
      } catch {
        // cache load failed too
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
    storesFetchError: readonly(storesFetchError),
    currentRole,
    isOwner,
    isManager,
    fetchUserStores,
    setActiveStore,
    createStore,
    inviteMember,
  };
}
