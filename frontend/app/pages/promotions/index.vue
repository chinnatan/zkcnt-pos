<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink">{{ t('promotionsPage.title') }}</h2>
      <button
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="openModal()"
      >
        {{ t('promotionsPage.addPromotion') }}
      </button>
    </div>

    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="promotions.length === 0" class="py-12 text-center text-ink-muted">
        {{ t('promotionsPage.noPromotions') }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
            <tr>
              <th class="px-4 py-3">{{ t('common.name') }}</th>
              <th class="px-4 py-3">{{ t('common.type') }}</th>
              <th class="px-4 py-3">{{ t('promotionsPage.details') }}</th>
              <th class="px-4 py-3">{{ t('common.period') }}</th>
              <th class="px-4 py-3">{{ t('common.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-warm">
            <tr v-for="promo in promotions" :key="promo.id" class="hover:bg-surface">
              <td class="px-4 py-3 font-medium text-ink">{{ promo.name }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {{ typeLabel(promo.type) }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-ink-muted">{{ promoSummary(promo) }}</td>
              <td class="px-4 py-3 text-xs text-ink-muted">
                <template v-if="promo.start_date || promo.end_date">
                  {{ promo.start_date ? formatDateShort(promo.start_date) : t('common.na') }} -
                  {{ promo.end_date ? formatDateShort(promo.end_date) : t('common.na') }}
                </template>
                <template v-else>{{ t('common.always') }}</template>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="activeBadge(promo.is_active)"
                >
                  {{ promo.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button class="text-primary-600 hover:underline" @click="openModal(promo)">{{ t('common.edit') }}</button>
                  <button class="text-danger-500 hover:underline" @click="handleDelete(promo.id)">{{ t('common.delete') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="craft-modal-backdrop craft-modal-backdrop--center z-50"
        @click.self="showModal = false"
      >
        <div class="craft-modal-panel craft-modal--paper max-w-lg">
          <h3 class="mb-4 text-lg font-semibold">
            {{ editingId ? t('promotionsPage.editPromotion') : t('promotionsPage.addPromotionModal') }}
          </h3>
          <form class="space-y-4" @submit.prevent="handleSave">
            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.nameRequired') }}</label>
              <input v-model="form.name" type="text" required class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.type') }}</label>
              <select v-model="form.type" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
                <option value="bxgy">{{ t('promotionsPage.typeBxgy') }}</option>
                <option value="order_percent">{{ t('promotionsPage.typeOrderPercent') }}</option>
                <option value="order_fixed">{{ t('promotionsPage.typeOrderFixed') }}</option>
                <option value="coupon">{{ t('promotionsPage.typeCoupon') }}</option>
              </select>
            </div>

            <template v-if="form.type === 'bxgy'">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.buyQty') }}</label>
                  <input v-model.number="form.buy_quantity" type="number" min="1" required class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.getQty') }}</label>
                  <input v-model.number="form.get_quantity" type="number" min="1" required class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.getDiscountPercent') }}</label>
                <input v-model.number="form.get_discount_percent" type="number" min="1" max="100" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.poolMode') }}</label>
                  <select v-model="form.pool_mode" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm">
                    <option value="same_product">{{ t('promotionsPage.poolSameProduct') }}</option>
                    <option value="same_category">{{ t('promotionsPage.poolSameCategory') }}</option>
                    <option value="mixed">{{ t('promotionsPage.poolMixed') }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.rewardMode') }}</label>
                  <select v-model="form.reward_mode" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm">
                    <option value="cheapest">{{ t('promotionsPage.rewardCheapest') }}</option>
                    <option value="same_product">{{ t('promotionsPage.rewardSameProduct') }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.targetProducts') }}</label>
                <UiCraftMultiSelect
                  v-model="selectedProductIds"
                  :options="productOptions"
                  :search-placeholder="t('promotionsPage.searchProducts')"
                  :empty-text="t('promotionsPage.noProducts')"
                  list-max-height="9rem"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.targetCategories') }}</label>
                <UiCraftMultiSelect
                  v-model="selectedCategoryIds"
                  :options="categoryOptions"
                  :search-placeholder="t('promotionsPage.searchCategories')"
                  :empty-text="t('promotionsPage.noCategories')"
                  list-max-height="7rem"
                />
              </div>
            </template>

            <template v-if="form.type === 'order_percent' || form.type === 'order_fixed'">
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.value') }}</label>
                <input v-model.number="form.value" type="number" min="0" required class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
              </div>
            </template>

            <template v-if="form.type === 'coupon'">
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.couponCode') }}</label>
                <input v-model="form.coupon_code" type="text" required class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm uppercase" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.couponDiscountType') }}</label>
                  <select v-model="form.coupon_discount_type" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm">
                    <option value="percent">{{ t('discountsPage.percentType') }}</option>
                    <option value="fixed">{{ t('discountsPage.fixedType') }}</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.value') }}</label>
                  <input v-model.number="form.value" type="number" min="0" required class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.maxUsesTotal') }}</label>
                  <input v-model.number="form.max_uses_total" type="number" min="0" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.maxUsesPerCustomer') }}</label>
                  <input v-model.number="form.max_uses_per_customer" type="number" min="0" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
                </div>
              </div>
            </template>

            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.minPurchase') }} (฿)</label>
              <input v-model.number="form.min_purchase" type="number" min="0" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('promotionsPage.priority') }}</label>
                <input v-model.number="form.priority" type="number" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
              </div>
              <div class="flex items-end gap-4 pb-2">
                <label class="flex items-center gap-2 text-sm">
                  <input v-model="form.stackable" type="checkbox" class="h-4 w-4 rounded border-border-warm text-primary-600" />
                  {{ t('promotionsPage.stackable') }}
                </label>
                <label class="flex items-center gap-2 text-sm">
                  <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-border-warm text-primary-600" />
                  {{ t('common.active') }}
                </label>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.startDate') }}</label>
                <input v-model="form.start_date" type="date" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.endDate') }}</label>
                <input v-model="form.end_date" type="date" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm" />
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 rounded-lg border border-border-warm px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface" @click="showModal = false">{{ t('common.cancel') }}</button>
              <button type="submit" class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">{{ t('common.save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Promotion, PromotionType } from "~/lib/types";
import { activeBadge } from "~/lib/ui/statusColors";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency, formatDateShort } = useFormat();
const { products, categories, fetchProducts, fetchCategories } = useProducts();
const {
  promotions,
  isLoading,
  fetchPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} = usePromotions();
const { confirm } = useDialog();

const showModal = ref(false);
const editingId = ref<string | null>(null);
const selectedProductIds = ref<string[]>([]);
const selectedCategoryIds = ref<string[]>([]);

const productOptions = computed(() =>
  products.value.map((p) => ({ id: p.id, label: p.name })),
);

const categoryOptions = computed(() =>
  categories.value.map((c) => ({ id: c.id, label: c.name })),
);

const form = reactive({
  name: "",
  type: "bxgy" as PromotionType,
  buy_quantity: 3,
  get_quantity: 1,
  get_discount_percent: 100,
  pool_mode: "same_product" as const,
  reward_mode: "cheapest" as const,
  value: 0,
  min_purchase: 0,
  coupon_code: "",
  coupon_discount_type: "fixed" as const,
  max_uses_total: null as number | null,
  max_uses_per_customer: null as number | null,
  stackable: true,
  priority: 0,
  start_date: "",
  end_date: "",
  is_active: true,
});

function typeLabel(type: PromotionType) {
  const map: Record<PromotionType, string> = {
    bxgy: t("promotionsPage.typeBxgy"),
    order_percent: t("promotionsPage.typeOrderPercent"),
    order_fixed: t("promotionsPage.typeOrderFixed"),
    coupon: t("promotionsPage.typeCoupon"),
  };
  return map[type];
}

function promoSummary(promo: {
  type: PromotionType;
  buy_quantity: number;
  get_quantity: number;
  coupon_code: string;
  value: number;
}) {
  if (promo.type === "bxgy") {
    return t("promotionsPage.summaryBxgy", {
      buy: promo.buy_quantity,
      get: promo.get_quantity,
    });
  }
  if (promo.type === "coupon") {
    return promo.coupon_code;
  }
  if (promo.type === "order_percent") {
    return `${promo.value}%`;
  }
  return formatCurrency(promo.value);
}

function buildTargets() {
  const targets = [
    ...selectedProductIds.value.map((id) => ({
      target_type: "product" as const,
      target_id: id,
    })),
    ...selectedCategoryIds.value.map((id) => ({
      target_type: "category" as const,
      target_id: id,
    })),
  ];
  return targets;
}

function openModal(promo?: (typeof promotions.value)[number]) {
  if (promo) {
    editingId.value = promo.id;
    selectedProductIds.value =
      promo.targets?.filter((t) => t.target_type === "product").map((t) => t.target_id) ?? [];
    selectedCategoryIds.value =
      promo.targets?.filter((t) => t.target_type === "category").map((t) => t.target_id) ?? [];
    Object.assign(form, {
      name: promo.name,
      type: promo.type,
      buy_quantity: promo.buy_quantity,
      get_quantity: promo.get_quantity,
      get_discount_percent: promo.get_discount_percent,
      pool_mode: promo.pool_mode,
      reward_mode: promo.reward_mode,
      value: promo.value,
      min_purchase: promo.min_purchase,
      coupon_code: promo.coupon_code,
      coupon_discount_type: promo.coupon_discount_type,
      max_uses_total: promo.max_uses_total,
      max_uses_per_customer: promo.max_uses_per_customer,
      stackable: promo.stackable,
      priority: promo.priority,
      start_date: promo.start_date?.slice(0, 10) || "",
      end_date: promo.end_date?.slice(0, 10) || "",
      is_active: promo.is_active,
    });
  } else {
    editingId.value = null;
    selectedProductIds.value = [];
    selectedCategoryIds.value = [];
    Object.assign(form, {
      name: "",
      type: "bxgy",
      buy_quantity: 3,
      get_quantity: 1,
      get_discount_percent: 100,
      pool_mode: "same_product",
      reward_mode: "cheapest",
      value: 0,
      min_purchase: 0,
      coupon_code: "",
      coupon_discount_type: "fixed",
      max_uses_total: null,
      max_uses_per_customer: null,
      stackable: true,
      priority: 0,
      start_date: "",
      end_date: "",
      is_active: true,
    });
  }
  showModal.value = true;
}

async function handleSave() {
  const payload = {
    ...form,
    targets: form.type === "bxgy" ? buildTargets() : [],
    max_uses_total: form.max_uses_total || null,
    max_uses_per_customer: form.max_uses_per_customer || null,
  };
  if (editingId.value) {
    await updatePromotion(editingId.value, payload);
  } else {
    await createPromotion(payload);
  }
  showModal.value = false;
}

async function handleDelete(id: string) {
  if (await confirm(t("common.confirmDelete"))) {
    await deletePromotion(id);
  }
}

onMounted(() => {
  fetchPromotions();
  fetchProducts();
  fetchCategories();
});
</script>
