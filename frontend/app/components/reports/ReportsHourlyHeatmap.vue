<script setup lang="ts">
import type { ReportHourlyHeatmapCell } from "~/lib/types/reports";

const props = defineProps<{
  cells: ReportHourlyHeatmapCell[];
  dayLabels: string[];
  salesModeLabel: string;
  ordersModeLabel: string;
  modeLabel: string;
}>();

const { t } = useI18n();
const { formatCurrency } = useFormat();

type HeatmapMode = "sales" | "orders";
const mode = ref<HeatmapMode>("sales");

const maxValue = computed(() => {
  const field = mode.value === "sales" ? "total" : "count";
  return props.cells.reduce((max, cell) => Math.max(max, cell[field]), 0);
});

const cellMap = computed(() => {
  const map = new Map<string, ReportHourlyHeatmapCell>();
  for (const cell of props.cells) {
    map.set(`${cell.day}-${cell.hour}`, cell);
  }
  return map;
});

const hours = Array.from({ length: 24 }, (_, h) => h);

function cellValue(cell: ReportHourlyHeatmapCell | undefined): number {
  if (!cell) return 0;
  return mode.value === "sales" ? cell.total : cell.count;
}

function intensity(value: number): number {
  if (maxValue.value <= 0 || value <= 0) return 0;
  return Math.max(0.12, value / maxValue.value);
}

function cellAt(day: number, hour: number) {
  return cellMap.value.get(`${day}-${hour}`);
}

function cellTitle(day: number, hour: number, label: string): string {
  const cell = cellAt(day, hour);
  if (!cell) return `${label} ${String(hour).padStart(2, "0")}:00`;
  return `${label} ${String(hour).padStart(2, "0")}:00 — ${formatCurrency(cell.total)} (${t("reportsPage.dayOrderCount", { count: cell.count })})`;
}
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <span class="text-xs text-ink-muted">{{ modeLabel }}</span>
      <button
        type="button"
        class="rounded-lg px-2.5 py-1 text-xs font-medium"
        :class="mode === 'sales' ? 'bg-primary-100 text-primary-700' : 'bg-surface text-ink-muted'"
        @click="mode = 'sales'"
      >
        {{ salesModeLabel }}
      </button>
      <button
        type="button"
        class="rounded-lg px-2.5 py-1 text-xs font-medium"
        :class="mode === 'orders' ? 'bg-primary-100 text-primary-700' : 'bg-surface text-ink-muted'"
        @click="mode = 'orders'"
      >
        {{ ordersModeLabel }}
      </button>
    </div>
    <div class="overflow-x-auto">
      <div class="inline-block min-w-full">
        <div class="mb-1 flex gap-0.5 pl-10">
          <span
            v-for="hour in hours"
            :key="hour"
            class="w-4 text-center text-[9px] text-ink-muted"
          >
            {{ hour % 3 === 0 ? hour : "" }}
          </span>
        </div>
        <div
          v-for="(label, day) in dayLabels"
          :key="day"
          class="mb-0.5 flex items-center gap-0.5"
        >
          <span class="w-9 shrink-0 text-xs text-ink-muted">{{ label }}</span>
          <div
            v-for="hour in hours"
            :key="`${day}-${hour}`"
            class="h-4 w-4 rounded-sm"
            :title="cellTitle(day, hour, label)"
            :style="{
              backgroundColor:
                intensity(cellValue(cellAt(day, hour))) > 0
                  ? `color-mix(in srgb, var(--color-primary-500) ${Math.round(intensity(cellValue(cellAt(day, hour))) * 100)}%, transparent)`
                  : 'var(--color-surface)',
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
