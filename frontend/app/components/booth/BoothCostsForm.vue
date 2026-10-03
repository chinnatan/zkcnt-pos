<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-ink">{{ t('boothsPage.boothFee') }}</label>
      <input v-model.number="form.booth_fee" type="number" min="0" step="any" class="input w-full" data-testid="booth-fee" />
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
  </div>
</template>

<script setup lang="ts">
import type { BoothForm } from "~/lib/booths/form";

const form = defineModel<BoothForm>({ required: true });
const { t } = useI18n();
</script>
