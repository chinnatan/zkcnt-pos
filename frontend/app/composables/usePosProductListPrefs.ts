import {
  isPosProductSort,
  type PosProductSort,
} from "~/lib/pos/productSort";

const STORAGE_KEY = "pos_product_list_prefs";

interface StorePrefs {
  sort: PosProductSort;
  stockFirst: boolean;
}

type PrefsMap = Record<string, StorePrefs>;

const DEFAULT_PREFS: StorePrefs = {
  sort: "default",
  stockFirst: false,
};

function readMap(): PrefsMap {
  if (!import.meta.client) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as PrefsMap;
  } catch {
    return {};
  }
}

function writeMap(map: PrefsMap): void {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode errors
  }
}

function normalizePrefs(value: unknown): StorePrefs {
  if (!value || typeof value !== "object") return { ...DEFAULT_PREFS };
  const raw = value as Partial<StorePrefs>;
  return {
    sort: isPosProductSort(raw.sort) ? raw.sort : DEFAULT_PREFS.sort,
    stockFirst:
      typeof raw.stockFirst === "boolean"
        ? raw.stockFirst
        : DEFAULT_PREFS.stockFirst,
  };
}

export function usePosProductListPrefs() {
  const { activeStoreId } = useStore();

  const productSort = ref<PosProductSort>(DEFAULT_PREFS.sort);
  const stockFirst = ref(DEFAULT_PREFS.stockFirst);
  let applyingPrefs = false;

  function loadPrefs(storeId: string | null | undefined) {
    applyingPrefs = true;
    if (!storeId) {
      productSort.value = DEFAULT_PREFS.sort;
      stockFirst.value = DEFAULT_PREFS.stockFirst;
      applyingPrefs = false;
      return;
    }
    const prefs = normalizePrefs(readMap()[storeId]);
    productSort.value = prefs.sort;
    stockFirst.value = prefs.stockFirst;
    applyingPrefs = false;
  }

  function savePrefs() {
    if (applyingPrefs || !import.meta.client) return;
    const storeId = activeStoreId.value;
    if (!storeId) return;
    const map = readMap();
    map[storeId] = {
      sort: productSort.value,
      stockFirst: stockFirst.value,
    };
    writeMap(map);
  }

  watch(activeStoreId, (id) => loadPrefs(id), { immediate: true });
  watch([productSort, stockFirst], () => savePrefs());

  return {
    productSort,
    stockFirst,
  };
}
