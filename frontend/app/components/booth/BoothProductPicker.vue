<template>
  <section class="space-y-3">
    <div>
      <h4 class="text-sm font-semibold text-ink">{{ t('boothsPage.products') }}</h4>
      <p class="text-xs text-ink-muted">
        {{ t('boothsPage.productsHint') }} · {{ t('boothsPage.selectedCount', { n: rows.length }) }}
      </p>
    </div>
    <input v-model="search" type="search" class="input w-full" :placeholder="t('boothsPage.searchProducts')" />

    <p v-if="groups.length === 0" class="py-4 text-center text-sm text-ink-muted">{{ t('boothsPage.noProducts') }}</p>
    <div class="space-y-4">
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
          <li v-for="p in group.products" :key="p.id" class="flex items-center gap-3 px-3 py-2" :data-testid="`booth-product-${p.id}`">
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
</template>

<script setup lang="ts">
import { productEconomics } from "~/lib/booths/cost";
import type { BoothProduct, Category, Product } from "~/lib/types";

const props = defineProps<{
  boothId: string;
  products: Product[];
  categories: Category[];
  stock: Map<string, number>;
  rows: BoothProduct[];
  perPiece: number;
}>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { addBoothProduct, updateBoothProduct, removeBoothProduct } = useBooths();

const search = ref("");
const selected = computed(() => new Map(props.rows.map((r) => [r.product, r])));
const econ = (p: Product) => productEconomics(p, props.perPiece);
const defaultQty = (p: Product) => Math.max(props.stock.get(p.id) ?? 0, 1);

const groups = computed(() => {
  const q = search.value.trim().toLowerCase();
  const byCat = new Map<string, Product[]>();
  for (const p of props.products) {
    if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) continue;
    const key = p.category || "";
    byCat.set(key, [...(byCat.get(key) ?? []), p]);
  }
  const order = [...props.categories.map((c) => c.id), ""];
  return order
    .filter((id) => byCat.has(id))
    .map((id) => ({
      id,
      name: props.categories.find((c) => c.id === id)?.name ?? t("boothsPage.uncategorized"),
      products: byCat.get(id)!,
    }));
});

async function toggleProduct(p: Product, checked: boolean) {
  const existing = selected.value.get(p.id);
  if (checked && !existing) await addBoothProduct(props.boothId, p.id, defaultQty(p));
  else if (!checked && existing) await removeBoothProduct(existing.id);
  emit("changed");
}

async function toggleCategory(list: Product[], checked: boolean) {
  for (const p of list) {
    const existing = selected.value.get(p.id);
    if (checked && !existing) await addBoothProduct(props.boothId, p.id, defaultQty(p));
    else if (!checked && existing) await removeBoothProduct(existing.id);
  }
  emit("changed");
}

async function setQty(bp: BoothProduct, value: string) {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty < 0) return;
  await updateBoothProduct(bp.id, { qty_brought: qty });
  emit("changed");
}
</script>
