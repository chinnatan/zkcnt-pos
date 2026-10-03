<template>
  <UiCraftCard v-if="booth" variant="paper" padding="md" class="space-y-6">
    <div class="flex items-start justify-between gap-3">
      <h3 class="text-base font-semibold text-ink">{{ booth.name }}</h3>
      <span v-if="booth.closed_at" class="badge">{{ t('boothsPage.closed') }}</span>
    </div>

    <form class="space-y-4" @submit.prevent="saveInfo">
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.name') }}</label>
        <input v-model="form.name" required type="text" class="input w-full" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.location') }}</label>
        <input v-model="form.location" type="text" class="input w-full" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.startDate') }}</label>
          <input v-model="form.start_date" type="date" class="input w-full" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.endDate') }}</label>
          <input v-model="form.end_date" type="date" class="input w-full" />
        </div>
      </div>
      <p v-if="dateError" class="text-xs text-danger-600">{{ t('boothsPage.dateInvalid') }}</p>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.boothFee') }}</label>
        <input v-model.number="form.booth_fee" type="number" min="0" step="any" class="input w-full" />
      </div>

      <div>
        <label class="block text-sm font-medium text-ink">{{ t('boothsPage.extraCosts') }}</label>
        <p class="mb-2 text-xs text-ink-muted">{{ t('boothsPage.extraCostsHint') }}</p>
        <div v-for="(cost, i) in form.extra_costs" :key="i" class="mb-2 flex gap-2">
          <input v-model="cost.name" type="text" class="input min-w-0 flex-1" :placeholder="t('boothsPage.extraCostName')" />
          <input v-model.number="cost.amount" type="number" min="0" step="any" class="input w-28" :placeholder="t('boothsPage.extraCostAmount')" />
          <button type="button" class="text-danger-600" :aria-label="t('common.delete')" @click="form.extra_costs.splice(i, 1)">✕</button>
        </div>
        <button type="button" class="text-sm font-medium text-primary-700 hover:underline" @click="form.extra_costs.push({ name: '', amount: 0 })">
          + {{ t('boothsPage.addExtraCost') }}
        </button>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.image') }}</label>
        <div class="flex items-center gap-4">
          <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-warm bg-surface">
            <img v-if="imageUrl" :src="imageUrl" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="space-y-1">
            <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="uploadImage" />
            <div class="flex gap-2">
              <button type="button" class="btn-secondary" :disabled="!isOnline || isUploading" @click="imageInput?.click()">
                {{ t('boothsPage.uploadImage') }}
              </button>
              <button v-if="booth.image" type="button" class="btn-secondary" :disabled="!isOnline || isUploading" @click="removeImage">
                {{ t('boothsPage.removeImage') }}
              </button>
            </div>
            <p v-if="!isOnline" class="text-xs text-ink-muted">{{ t('boothsPage.imageOnline') }}</p>
          </div>
        </div>
      </div>

      <button type="submit" :disabled="isSaving || dateError" class="btn-primary">
        {{ isSaving ? t('common.saving') : t('boothsPage.saveInfo') }}
      </button>
    </form>

    <section class="space-y-3 rounded-lg bg-surface p-4">
      <h4 class="text-sm font-semibold text-ink">{{ t('boothsPage.summary') }}</h4>
      <dl class="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt class="text-xs text-ink-muted">{{ t('boothsPage.totalCost') }}</dt>
          <dd class="font-semibold text-ink">{{ formatCurrency(totalCost) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">{{ t('boothsPage.totalPieces') }}</dt>
          <dd class="font-semibold text-ink">{{ totalPieces }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">{{ t('boothsPage.costPerPiece') }}</dt>
          <dd class="font-semibold text-ink">{{ formatCurrency(perPiece) }}</dd>
        </div>
      </dl>
    </section>

    <section class="space-y-3">
      <div>
        <h4 class="text-sm font-semibold text-ink">{{ t('boothsPage.products') }}</h4>
        <p class="text-xs text-ink-muted">
          {{ t('boothsPage.productsHint') }} · {{ t('boothsPage.selectedCount', { n: rows.length }) }}
        </p>
      </div>
      <input v-model="search" type="search" class="input w-full" :placeholder="t('boothsPage.searchProducts')" />

      <p v-if="groups.length === 0" class="py-4 text-center text-sm text-ink-muted">{{ t('boothsPage.noProducts') }}</p>
      <div class="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
        <div v-for="group in groups" :key="group.id">
          <label class="mb-1 flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <input
              type="checkbox"
              :checked="group.products.every((p) => selected.has(p.id))"
              @change="toggleCategory(group.products, ($event.target as HTMLInputElement).checked)"
            />
            {{ group.name }}
          </label>
          <ul class="divide-y divide-border-warm rounded-lg border border-border-warm">
            <li v-for="p in group.products" :key="p.id" class="flex items-center gap-3 px-3 py-2">
              <input type="checkbox" :checked="selected.has(p.id)" @change="toggleProduct(p, ($event.target as HTMLInputElement).checked)" />
              <ProductImage :product="p" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-ink">{{ p.name }}</p>
                <p class="text-xs text-ink-muted">{{ formatCurrency(p.price) }}</p>
              </div>
              <template v-if="selected.get(p.id)">
                <div class="text-right text-xs text-ink-muted">
                  <p>{{ t('boothsPage.unitCost') }} {{ formatCurrency(econ(p).unitCost) }}</p>
                  <p :class="econ(p).profit < 0 ? 'text-danger-600' : 'text-success-700'">
                    {{ t('boothsPage.profit') }} {{ formatCurrency(econ(p).profit) }}
                  </p>
                </div>
                <input
                  :value="selected.get(p.id)!.qty_brought"
                  type="number"
                  min="0"
                  step="any"
                  class="input w-20"
                  :aria-label="t('boothsPage.qtyBrought')"
                  @change="setQty(selected.get(p.id)!, ($event.target as HTMLInputElement).value)"
                />
              </template>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <button v-if="!booth.closed_at" type="button" class="btn-secondary" @click="openClose">
      {{ t('boothsPage.closeBooth') }}
    </button>

    <UiCraftModal :show="showClose" variant="paper" size="lg" :close-on-backdrop="false" @close="showClose = false">
      <form class="space-y-4 p-6" @submit.prevent="confirmClose">
        <div>
          <h3 class="text-base font-semibold text-ink">{{ t('boothsPage.closeTitle') }}</h3>
          <p class="text-xs text-ink-muted">{{ t('boothsPage.closeHint') }}</p>
        </div>
        <ul class="max-h-80 space-y-2 overflow-y-auto">
          <li v-for="row in closeRows" :key="row.bp.id" class="flex items-center gap-3">
            <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ row.name }}</span>
            <span class="text-xs text-ink-muted">{{ t('boothsPage.qtyBrought') }} {{ row.bp.qty_brought }}</span>
            <input v-model="row.left" type="number" min="0" step="any" class="input w-24" :placeholder="t('boothsPage.qtyLeft')" />
          </li>
        </ul>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" @click="showClose = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn-primary" :disabled="isSaving">{{ t('boothsPage.confirmClose') }}</button>
        </div>
      </form>
    </UiCraftModal>
  </UiCraftCard>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import {
  boothCostPerPiece,
  boothDayCount,
  productEconomics,
  totalBoothCost,
} from "~/lib/booths/cost";
import type { BoothExtraCost, BoothProduct, Category, Product } from "~/lib/types";

const props = defineProps<{ boothId: string }>();

const { t } = useI18n();
const { $api } = useNuxtApp();
const { activeStoreId } = useStore();
const { isOnline } = useOnlineStatus();
const { formatCurrency } = useFormat();
const { getFileUrl } = useFileUrl();
const {
  booths,
  fetchBooths,
  updateBooth,
  listBoothProducts,
  addBoothProduct,
  updateBoothProduct,
  removeBoothProduct,
} = useBooths();

const booth = computed(() => booths.value.find((b) => b.id === props.boothId));

const form = reactive({
  name: "",
  location: "",
  start_date: "",
  end_date: "",
  booth_fee: 0,
  extra_costs: [] as BoothExtraCost[],
});
const isSaving = ref(false);
const isUploading = ref(false);
const imageInput = ref<HTMLInputElement | null>(null);

const allProducts = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const stock = ref(new Map<string, number>());
const rows = ref<BoothProduct[]>([]);
const search = ref("");

const showClose = ref(false);
const closeRows = ref<Array<{ bp: BoothProduct; name: string; left: string }>>([]);

const dateError = computed(
  () => !!form.start_date && !!form.end_date && boothDayCount(form.start_date, form.end_date) === 0,
);
const selected = computed(() => new Map(rows.value.map((r) => [r.product, r])));
const totalCost = computed(() => totalBoothCost({ booth_fee: form.booth_fee || 0, extra_costs: form.extra_costs }));
const totalPieces = computed(() => rows.value.reduce((s, r) => s + (r.qty_brought || 0), 0));
const perPiece = computed(() =>
  boothCostPerPiece({ booth_fee: form.booth_fee || 0, extra_costs: form.extra_costs }, rows.value),
);
const imageUrl = computed(() => (booth.value?.image ? getFileUrl(booth.value) : ""));

const econ = (p: Product) => productEconomics(p, perPiece.value);

const groups = computed(() => {
  const q = search.value.trim().toLowerCase();
  const byCat = new Map<string, Product[]>();
  for (const p of allProducts.value) {
    if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) continue;
    const key = p.category || "";
    byCat.set(key, [...(byCat.get(key) ?? []), p]);
  }
  const order = [...categories.value.map((c) => c.id), ""];
  return order
    .filter((id) => byCat.has(id))
    .map((id) => ({
      id,
      name: categories.value.find((c) => c.id === id)?.name ?? t("boothsPage.uncategorized"),
      products: byCat.get(id)!,
    }));
});

function resetForm() {
  const b = booth.value;
  if (!b) return;
  form.name = b.name;
  form.location = b.location;
  form.start_date = b.start_date;
  form.end_date = b.end_date;
  form.booth_fee = b.booth_fee;
  form.extra_costs = b.extra_costs.map((c) => ({ ...c }));
}

async function load() {
  const storeId = activeStoreId.value;
  if (!storeId) return;
  const [prods, cats, inv] = await Promise.all([
    db.products.where("store").equals(storeId).toArray(),
    db.categories.where("store").equals(storeId).toArray(),
    db.inventory.where("store").equals(storeId).toArray(),
  ]);
  allProducts.value = prods
    .filter((p) => p.is_active && !p.deleted_at)
    .sort((a, b) => a.name.localeCompare(b.name));
  categories.value = cats
    .filter((c) => !c.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  stock.value = new Map(inv.map((i) => [i.product, i.quantity]));
  rows.value = await listBoothProducts(props.boothId);
}

watch(
  () => props.boothId,
  () => {
    resetForm();
    load();
  },
  { immediate: true },
);

async function saveInfo() {
  if (dateError.value) return;
  isSaving.value = true;
  try {
    await updateBooth(props.boothId, {
      name: form.name.trim(),
      location: form.location.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      booth_fee: Number(form.booth_fee) || 0,
      extra_costs: form.extra_costs
        .filter((c) => c.name.trim())
        .map((c) => ({ name: c.name.trim(), amount: Number(c.amount) || 0 })),
    });
    resetForm();
  } finally {
    isSaving.value = false;
  }
}

async function sendImage(form: FormData) {
  if (!activeStoreId.value) return;
  isUploading.value = true;
  try {
    const record = await $api.uploadBoothImage(activeStoreId.value, props.boothId, form);
    await db.booths.put(record as never);
    await fetchBooths();
  } finally {
    isUploading.value = false;
  }
}

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const data = new FormData();
  data.append("image", file);
  await sendImage(data);
}

async function removeImage() {
  const data = new FormData();
  data.append("image", "");
  data.append("remove", "true");
  await sendImage(data);
}

const defaultQty = (p: Product) => Math.max(stock.value.get(p.id) ?? 0, 1);

async function toggleProduct(p: Product, checked: boolean) {
  const existing = selected.value.get(p.id);
  if (checked && !existing) await addBoothProduct(props.boothId, p.id, defaultQty(p));
  else if (!checked && existing) await removeBoothProduct(existing.id);
  rows.value = await listBoothProducts(props.boothId);
}

async function toggleCategory(list: Product[], checked: boolean) {
  for (const p of list) {
    const existing = selected.value.get(p.id);
    if (checked && !existing) await addBoothProduct(props.boothId, p.id, defaultQty(p));
    else if (!checked && existing) await removeBoothProduct(existing.id);
  }
  rows.value = await listBoothProducts(props.boothId);
}

async function setQty(bp: BoothProduct, value: string) {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0) return;
  await updateBoothProduct(bp.id, { qty_brought: qty });
  rows.value = await listBoothProducts(props.boothId);
}

function openClose() {
  closeRows.value = rows.value.map((bp) => ({
    bp,
    name: allProducts.value.find((p) => p.id === bp.product)?.name ?? bp.product,
    left: bp.qty_left == null ? "" : String(bp.qty_left),
  }));
  showClose.value = true;
}

async function confirmClose() {
  isSaving.value = true;
  try {
    for (const row of closeRows.value) {
      if (row.left === "") continue;
      const left = Number(row.left);
      if (Number.isFinite(left) && left >= 0) await updateBoothProduct(row.bp.id, { qty_left: left });
    }
    await updateBooth(props.boothId, { closed_at: new Date().toISOString() });
    showClose.value = false;
    rows.value = await listBoothProducts(props.boothId);
  } finally {
    isSaving.value = false;
  }
}
</script>
