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
      data: payload,
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

  /** New booth with the source's location, fees, extra costs and product list (+ quantities). */
  async function duplicateBooth(
    sourceId: string,
    overrides: { name: string; start_date: string; end_date: string },
  ) {
    const source = await db.booths.get(sourceId);
    if (!source) throw new Error("Booth not found");
    const rows = await listBoothProducts(sourceId);
    return createBooth(
      {
        name: overrides.name,
        location: source.location,
        start_date: overrides.start_date,
        end_date: overrides.end_date,
        booth_fee: source.booth_fee,
        extra_costs: source.extra_costs.map((c) => ({ ...c })),
      },
      rows.map((r) => ({ product: r.product, qty_brought: r.qty_brought })),
    );
  }

  /** Re-open a closed booth: clears `closed_at` and the leftover counts entered at close. */
  async function reopenBooth(id: string) {
    const rows = await listBoothProducts(id);
    for (const r of rows) {
      if (r.qty_left !== null) await updateBoothProduct(r.id, { qty_left: null });
    }
    await updateBooth(id, { closed_at: "" });
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
        // rows with changes still waiting to sync are newer than the server copy: keep them as-is
        await db.transaction("rw", db.boothProducts, db.syncQueue, async () => {
          const waiting = await db.syncQueue
            .where("status")
            .anyOf(["pending", "error", "in_flight"])
            .filter((i) => i.collection === "booth_products")
            .toArray();
          const waitingIds = new Set(waiting.map((i) => i.record_id));
          const stale = (await db.boothProducts.where("booth").equals(boothId).primaryKeys()).filter(
            (id) => !waitingIds.has(id),
          );
          await db.boothProducts.bulkDelete(stale);
          await db.boothProducts.bulkPut(records.filter((r) => !waitingIds.has(r.id)));
        });
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
    // removed while offline: the server still has that row, so re-adding must reuse its id
    const removedId = existing
      ? undefined
      : (
          await db.syncQueue
            .where("status")
            .anyOf(["pending", "error", "in_flight"])
            .filter(
              (i) =>
                i.collection === "booth_products" &&
                i.action === "delete" &&
                i.data?.booth === boothId &&
                i.data?.product === productId,
            )
            .last()
        )?.record_id;
    const now = new Date().toISOString();
    const record: BoothProduct = {
      id: existing?.id ?? removedId ?? newId(),
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
    if (existing) await save("booth_products", "delete", existing, { booth: existing.booth, product: existing.product });
  }

  return {
    booths,
    fetchBooths,
    createBooth,
    duplicateBooth,
    reopenBooth,
    updateBooth,
    deleteBooth,
    listBoothProducts,
    addBoothProduct,
    updateBoothProduct,
    removeBoothProduct,
  };
}
