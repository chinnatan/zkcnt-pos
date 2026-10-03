import { db } from "~/lib/db";
import { generateClientId } from "~/lib/sync/conflict";
import { addToSyncQueue } from "~/lib/sync/queue";
import type { Booth, BoothExtraCost, BoothProduct } from "~/lib/types";

export interface BoothInput {
  name: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  booth_fee?: number;
  extra_costs?: BoothExtraCost[];
  closed_at?: string;
}

const booths = ref<Booth[]>([]);

// Ids are generated on the client (server accepts them) so booth_products can
// reference a booth created offline without a temp_ id remap.
const newId = () => generateClientId().replace(/[^A-Za-z0-9_-]/g, "");

export function useBooths() {
  const { $api } = useNuxtApp();
  const { activeStoreId } = useStore();
  const { isOnline } = useOnlineStatus();

  const path = (suffix: string) => `/stores/${activeStoreId.value}/${suffix}`;

  async function fetchBooths() {
    if (!activeStoreId.value) return;
    const storeId = activeStoreId.value;
    if (isOnline.value) {
      try {
        const records = await $api.send<Booth[]>(path("booths"));
        await db.booths.where("store").equals(storeId).delete();
        await db.booths.bulkPut(records);
      } catch {
        // fall through to the local copy
      }
    }
    booths.value = (await db.booths.where("store").equals(storeId).toArray())
      .filter((b) => !b.deleted_at)
      .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.name.localeCompare(b.name));
  }

  /** Write-through: API first when online, otherwise Dexie + syncQueue. */
  async function save<T extends { id: string }>(
    collection: "booths" | "booth_products",
    action: "create" | "update" | "delete",
    record: T,
    payload: Record<string, unknown>,
  ) {
    const table = (collection === "booths" ? db.booths : db.boothProducts) as unknown as {
      put(r: T): Promise<unknown>;
      delete(id: string): Promise<unknown>;
    };
    const base = collection === "booths" ? "booths" : "booth-products";

    if (isOnline.value) {
      const res = await $api.send<T>(
        path(action === "create" ? base : `${base}/${record.id}`),
        {
          method: action === "create" ? "POST" : action === "update" ? "PATCH" : "DELETE",
          body: action === "delete" ? undefined : payload,
        },
      );
      if (action === "delete") await table.delete(record.id);
      else await table.put(res);
      return;
    }

    if (action === "delete") await table.delete(record.id);
    else await table.put(record);
    await addToSyncQueue({
      collection,
      action,
      record_id: record.id,
      data: action === "delete" ? {} : payload,
      store: activeStoreId.value!,
    });
  }

  async function createBooth(
    input: BoothInput,
    products: Array<{ product: string; qty_brought: number }> = [],
  ) {
    if (!activeStoreId.value) throw new Error("No active store");
    const now = new Date().toISOString();
    const record: Booth = {
      id: newId(),
      store: activeStoreId.value,
      name: input.name,
      location: input.location ?? "",
      start_date: input.start_date ?? "",
      end_date: input.end_date ?? "",
      booth_fee: input.booth_fee ?? 0,
      extra_costs: input.extra_costs ?? [],
      image: "",
      closed_at: "",
      is_active: true,
      created: now,
      updated: now,
    };
    await save("booths", "create", record, { ...record });
    for (const p of products) await addBoothProduct(record.id, p.product, p.qty_brought);
    await fetchBooths();
    return record;
  }

  async function updateBooth(id: string, patch: Partial<BoothInput>) {
    const existing = await db.booths.get(id);
    if (!existing) throw new Error("Booth not found");
    const record = { ...existing, ...patch, updated: new Date().toISOString() } as Booth;
    await save("booths", "update", record, { ...patch });
    await fetchBooths();
  }

  async function deleteBooth(id: string) {
    const existing = await db.booths.get(id);
    if (!existing) return;
    await save("booths", "delete", existing, {});
    await db.boothProducts.where("booth").equals(id).delete();
    await fetchBooths();
  }

  async function listBoothProducts(boothId: string): Promise<BoothProduct[]> {
    if (isOnline.value) {
      try {
        const records = await $api.send<BoothProduct[]>(
          path(`booth-products?booth=${encodeURIComponent(boothId)}`),
        );
        await db.boothProducts.where("booth").equals(boothId).delete();
        await db.boothProducts.bulkPut(records);
      } catch {
        // use local copy
      }
    }
    return (await db.boothProducts.where("booth").equals(boothId).toArray()).filter(
      (bp) => !bp.deleted_at,
    );
  }

  async function addBoothProduct(boothId: string, productId: string, qtyBrought: number) {
    const existing = await db.boothProducts.where("[booth+product]").equals([boothId, productId]).first();
    const now = new Date().toISOString();
    const record: BoothProduct = {
      id: existing?.id ?? newId(),
      booth: boothId,
      product: productId,
      qty_brought: qtyBrought,
      qty_left: null,
      created: existing?.created ?? now,
      updated: now,
    };
    await save("booth_products", "create", record, { ...record });
    return record;
  }

  async function updateBoothProduct(
    id: string,
    patch: { qty_brought?: number; qty_left?: number | null },
  ) {
    const existing = await db.boothProducts.get(id);
    if (!existing) throw new Error("Booth product not found");
    const record = { ...existing, ...patch, updated: new Date().toISOString() };
    await save("booth_products", "update", record, { ...patch });
  }

  async function removeBoothProduct(id: string) {
    const existing = await db.boothProducts.get(id);
    if (existing) await save("booth_products", "delete", existing, {});
  }

  return {
    booths,
    fetchBooths,
    createBooth,
    updateBooth,
    deleteBooth,
    listBoothProducts,
    addBoothProduct,
    updateBoothProduct,
    removeBoothProduct,
  };
}
