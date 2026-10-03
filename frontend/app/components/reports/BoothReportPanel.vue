<template>
  <div class="space-y-8">
    <p v-if="report.booths.length === 0" class="py-8 text-center text-sm text-ink-muted">
      {{ t('reportsPage.boothEmpty') }}
    </p>

    <template v-else>
      <section>
        <h3 class="mb-1 text-sm font-semibold text-ink">{{ t('reportsPage.boothCompare') }}</h3>
        <p class="mb-3 text-xs text-ink-muted">{{ t('reportsPage.boothCompareHint') }}</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-ink-muted">
                <th class="pb-2 pr-4">{{ t('reportsPage.boothName') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothDays') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.totalSales') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothCosts') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothProfit') }}</th>
                <th class="pb-2 text-right">{{ t('reportsPage.boothPerDay') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in report.booths"
                :key="b.boothId"
                class="cursor-pointer border-b border-surface hover:bg-surface"
                :class="selected?.boothId === b.boothId ? 'bg-primary-50' : ''"
                @click="selectedId = b.boothId"
              >
                <td class="py-2 pr-4">
                  <p class="font-medium">{{ b.name }}</p>
                  <p class="text-xs text-ink-muted">
                    {{ formatDateKey(b.startDate) || '—' }} – {{ formatDateKey(b.endDate) || '—' }}
                  </p>
                </td>
                <td class="py-2 pr-4 text-right">{{ b.days || '—' }}</td>
                <td class="py-2 pr-4 text-right">{{ formatCurrency(b.revenue) }}</td>
                <td class="py-2 pr-4 text-right">{{ formatCurrency(b.cogs + b.fixedCost) }}</td>
                <td class="py-2 pr-4 text-right font-semibold" :class="b.profit < 0 ? 'text-danger-600' : 'text-success-700'">
                  {{ formatCurrency(b.profit) }}
                </td>
                <td class="py-2 text-right">{{ b.revenuePerDay === null ? '—' : formatCurrency(b.revenuePerDay) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="selected">
        <h3 class="mb-1 text-sm font-semibold text-ink">
          {{ t('reportsPage.boothProducts', { name: selected.name }) }}
        </h3>
        <p class="mb-3 text-xs text-ink-muted">{{ t('reportsPage.boothSellThroughHint') }}</p>
        <p v-if="selected.products.length === 0" class="py-4 text-center text-sm text-ink-muted">
          {{ t('reportsPage.boothNoProducts') }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-ink-muted">
                <th class="pb-2 pr-4">{{ t('reportsPage.product') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothBrought') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothSold') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothLeft') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothSellThrough') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothProfit') }}</th>
                <th class="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in selected.products" :key="p.productId" class="border-b border-surface">
                <td class="py-2 pr-4 font-medium">{{ p.name }}</td>
                <td class="py-2 pr-4 text-right">{{ p.brought }}</td>
                <td class="py-2 pr-4 text-right">{{ p.sold }}</td>
                <td class="py-2 pr-4 text-right">{{ p.left ?? '—' }}</td>
                <td class="py-2 pr-4 text-right">{{ pct(p.sellThrough) }}</td>
                <td class="py-2 pr-4 text-right" :class="p.profit < 0 ? 'text-danger-600' : ''">{{ formatCurrency(p.profit) }}</td>
                <td class="py-2"><span v-if="p.advice" class="badge" :class="adviceClass(p.advice)">{{ t(`reportsPage.boothAdvice.${p.advice}`) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 class="mb-1 text-sm font-semibold text-ink">{{ t('reportsPage.boothCategories') }}</h3>
        <p class="mb-3 text-xs text-ink-muted">{{ t('reportsPage.boothCategoriesHint') }}</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-ink-muted">
                <th class="pb-2 pr-4">{{ t('reportsPage.tabCategories') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothBrought') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothSold') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.boothSellThrough') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('reportsPage.totalSales') }}</th>
                <th class="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in report.categories" :key="c.categoryId" class="border-b border-surface">
                <td class="py-2 pr-4 font-medium">{{ c.name }}</td>
                <td class="py-2 pr-4 text-right">{{ c.brought }}</td>
                <td class="py-2 pr-4 text-right">{{ c.sold }}</td>
                <td class="py-2 pr-4 text-right">{{ pct(c.sellThrough) }}</td>
                <td class="py-2 pr-4 text-right">{{ formatCurrency(c.revenue) }}</td>
                <td class="py-2"><span v-if="c.advice" class="badge" :class="adviceClass(c.advice)">{{ t(`reportsPage.boothAdvice.${c.advice}`) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import { buildBoothReport, type BoothAdvice } from "~/lib/reports/booth";

const { t } = useI18n();
const { formatCurrency, formatDateKey } = useFormat();
const { activeStoreId } = useStore();
const { booths, fetchBooths } = useBooths();

const report = ref<ReturnType<typeof buildBoothReport>>({ booths: [], categories: [] });
const selectedId = ref("");
const selected = computed(
  () => report.value.booths.find((b) => b.boothId === selectedId.value) ?? report.value.booths[0] ?? null,
);

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const adviceClass = (a: Exclude<BoothAdvice, null>) =>
  a === "produceMore" ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700";

async function load() {
  const storeId = activeStoreId.value;
  if (!storeId) return;
  await fetchBooths();
  const ids = booths.value.map((b) => b.id);
  const [boothProducts, orders, products, categories] = await Promise.all([
    db.boothProducts.where("booth").anyOf(ids).toArray(),
    db.orders.where("store").equals(storeId).filter((o) => !!o.booth).toArray(),
    db.products.where("store").equals(storeId).toArray(),
    db.categories.where("store").equals(storeId).toArray(),
  ]);
  const orderIds = orders.map((o) => o.id);
  const orderItems = orderIds.length ? await db.orderItems.where("order").anyOf(orderIds).toArray() : [];
  report.value = buildBoothReport({
    booths: booths.value,
    boothProducts,
    orders,
    orderItems,
    products,
    categories,
    uncategorizedLabel: t("reportsPage.uncategorized"),
  });
}

onMounted(load);
watch(activeStoreId, load);
</script>
