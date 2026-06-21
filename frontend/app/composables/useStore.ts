import type { Store, StoreMember } from "~/lib/types";
import { db } from "~/lib/db";
import { createLogger } from "~/lib/logger";

const logger = createLogger("use-store");

const activeStore = ref<Store | null>(null);
const userStores = ref<Store[]>([]);
const userMemberships = ref<StoreMember[]>([]);
const isLoadingStores = ref(false);
const storesFetchError = ref<string | null>(null);

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
      member_invite_mode: "direct",
    },
    owner: String(record.owner ?? ""),
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
    store: String(record.store ?? ""),
    user: String(record.user ?? ""),
    role: record.role as StoreMember["role"],
    is_active: record.is_active !== false,
  };
}

async function cacheStores(stores: Store[], members: StoreMember[]) {
  try {
    await db.stores.bulkPut(stores);
    await db.storeMembers.bulkPut(members);
  } catch (e) {
    logger.warn("Failed to cache stores in Dexie:", e);
  }
}

export function useStore() {
  const { $api } = useNuxtApp();
  const { authUser, initAuth } = useAuth();

  const activeStoreId = computed(() => activeStore.value?.id ?? null);

  const currentRole = computed(() => {
    if (!activeStore.value || !authUser.value) return null;
    const membership = userMemberships.value.find(
      (m) => m.store === activeStore.value!.id && m.user === authUser.value!.id,
    );
    return membership?.role ?? null;
  });

  const isOwner = computed(() => currentRole.value === "owner");
  const isManager = computed(() => currentRole.value === "manager" || isOwner.value);

  async function applyStoreSelection() {
    if (userStores.value.length === 1 && !activeStore.value) {
      const store = userStores.value[0];
      if (store) await setActiveStore(store);
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

  async function fetchMemberships(userId: string) {
    const memberships = await $api.listMemberships();

    const members = memberships.map((m) =>
      toStoreMemberRecord(m as unknown as Record<string, unknown>),
    );
    const stores = memberships
      .map((m) => (m as { expand?: { store?: unknown } }).expand?.store)
      .filter(Boolean)
      .map((s) => toStoreRecord(s as Record<string, unknown>))
      .filter((s) => s.is_active !== false);

    await cacheStores(stores, members);

    userMemberships.value = members;
    userStores.value = stores;
  }

  async function fetchUserStores() {
    initAuth();

    if (!authUser.value) return;

    const userId = authUser.value.id;

    isLoadingStores.value = true;
    storesFetchError.value = null;

    try {
      await loadFromCache(userId);

      if (import.meta.client && !navigator.onLine) {
        if (userStores.value.length === 0) {
          storesFetchError.value = "errors.loadStoresFailed";
        }
        return;
      }

      try {
        await fetchMemberships(userId);
        await applyStoreSelection();
      } catch (e: unknown) {
        logger.warn("fetchMemberships failed, using cache:", e);
        if (userStores.value.length === 0) {
          storesFetchError.value =
            e instanceof Error ? e.message : "errors.loadStoresFailed";
        }
      }
    } catch (e: unknown) {
      logger.error("fetchUserStores failed:", e);
      if (userStores.value.length === 0) {
        storesFetchError.value =
          e instanceof Error ? e.message : "errors.loadStoresFailed";
      }
    } finally {
      isLoadingStores.value = false;
    }
  }

  async function setActiveStore(store: Store) {
    activeStore.value = store;
    localStorage.setItem("active_store_id", store.id);
  }

  async function createStore(data: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
  }) {
    if (!authUser.value) throw new Error("Not authenticated");

    const store = await $api.send<Record<string, unknown>>("/stores", {
      method: "POST",
      body: {
        ...data,
        is_active: true,
        settings: {
          currency: "THB",
          vat_rate: 7,
          receipt_header: "",
          receipt_footer: "",
          member_invite_mode: "direct",
        },
      },
    });

    await fetchUserStores();
    return toStoreRecord(store);
  }

  async function updateStore(storeId: string, data: Partial<Store>) {
    const record = await $api.send<Record<string, unknown>>(
      `/stores/${storeId}`,
      { method: "PATCH", body: data },
    );
    const updated = toStoreRecord(record);
    if (activeStore.value?.id === storeId) {
      await setActiveStore(updated);
    }
    await fetchUserStores();
    return updated;
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
    updateStore,
  };
}
