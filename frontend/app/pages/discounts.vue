<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">{{ t('discountsPage.title') }}</h2>
      <button
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="openModal()"
      >
        {{ t('discountsPage.addDiscount') }}
      </button>
    </div>

    <div class="rounded-xl bg-white shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="discounts.length === 0" class="py-12 text-center text-gray-400">
        {{ t('discountsPage.noDiscounts') }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">{{ t('common.name') }}</th>
              <th class="px-4 py-3">{{ t('common.type') }}</th>
              <th class="px-4 py-3">{{ t('common.value') }}</th>
              <th class="px-4 py-3">{{ t('common.minPurchase') }}</th>
              <th class="px-4 py-3">{{ t('common.period') }}</th>
              <th class="px-4 py-3">{{ t('common.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="discount in discounts" :key="discount.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ discount.name }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {{ discount.type }}
                </span>
              </td>
              <td class="px-4 py-3">
                {{ discount.type === 'percent' ? `${discount.value}%` : formatCurrency(discount.value) }}
              </td>
              <td class="px-4 py-3">{{ formatCurrency(discount.min_purchase) }}</td>
              <td class="px-4 py-3 text-xs text-gray-500">
                <template v-if="discount.start_date || discount.end_date">
                  {{ discount.start_date ? formatDateShort(discount.start_date) : t('common.na') }} -
                  {{ discount.end_date ? formatDateShort(discount.end_date) : t('common.na') }}
                </template>
                <template v-else>{{ t('common.always') }}</template>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="discount.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ discount.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <button class="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50" @click="openModal(discount)">{{ t('common.edit') }}</button>
                  <button class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="handleDelete(discount.id)">{{ t('common.delete') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold">{{ editingId ? t('discountsPage.editDiscount') : t('discountsPage.addDiscountModal') }}</h3>
          <form @submit.prevent="handleSave" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.nameRequired') }}</label>
              <input v-model="form.name" type="text" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.type') }}</label>
                <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
                  <option value="percent">{{ t('discountsPage.percentType') }}</option>
                  <option value="fixed">{{ t('discountsPage.fixedType') }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.value') }} *</label>
                <input v-model.number="form.value" type="number" min="0" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.minPurchase') }} (฿)</label>
              <input v-model.number="form.min_purchase" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.startDate') }}</label>
                <input v-model="form.start_date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.endDate') }}</label>
                <input v-model="form.end_date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input v-model="form.is_active" type="checkbox" id="is_active" class="h-4 w-4 rounded border-gray-300 text-primary-600" />
              <label for="is_active" class="text-sm font-medium text-gray-700">{{ t('common.active') }}</label>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showModal = false">{{ t('common.cancel') }}</button>
              <button type="submit" class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">{{ t('common.save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Discount } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency, formatDateShort } = useFormat();
const { discounts, isLoading, fetchDiscounts, createDiscount, updateDiscount, deleteDiscount } = useDiscounts();
const { confirm } = useDialog();

const showModal = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  name: "",
  type: "percent" as "percent" | "fixed",
  value: 0,
  min_purchase: 0,
  start_date: "",
  end_date: "",
  is_active: true,
});

function openModal(discount?: Discount) {
  if (discount) {
    editingId.value = discount.id;
    Object.assign(form, {
      name: discount.name,
      type: discount.type,
      value: discount.value,
      min_purchase: discount.min_purchase,
      start_date: discount.start_date?.slice(0, 10) || "",
      end_date: discount.end_date?.slice(0, 10) || "",
      is_active: discount.is_active,
    });
  } else {
    editingId.value = null;
    Object.assign(form, { name: "", type: "percent", value: 0, min_purchase: 0, start_date: "", end_date: "", is_active: true });
  }
  showModal.value = true;
}

async function handleSave() {
  if (editingId.value) {
    await updateDiscount(editingId.value, { ...form });
  } else {
    await createDiscount({ ...form });
  }
  showModal.value = false;
}

async function handleDelete(id: string) {
  if (await confirm(t("common.confirmDelete"))) {
    await deleteDiscount(id);
  }
}

onMounted(() => {
  fetchDiscounts();
});
</script>
