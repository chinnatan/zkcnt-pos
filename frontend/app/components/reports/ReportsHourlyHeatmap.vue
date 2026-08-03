<script setup lang="ts">
import type { ReportHourlyHeatmapCell } from "~/lib/types/reports";

const props = defineProps<{
  cells: ReportHourlyHeatmapCell[];
  dayLabels: string[];
}>();

const { formatCurrency } = useFormat();

const maxTotal = computed(() =>
  props.cells.reduce((max, cell) => Math.max(max, cell.total), 0),
);

const cellMap = computed(() => {
  const map = new Map<string, ReportHourlyHeatmapCell>();
  for (const cell of props.cells) {
    map.set(`${cell.day}-${cell.hour}`, cell);
  }
  return map;
});

const hours = Array.from({ length: 24 }, (_, h) => h);

function intensity(total: number): number {
  if (maxTotal.value <= 0 || total <= 0) return 0;
  return Math.max(0.12, total / maxTotal.value);
}

function cellAt(day: number, hour: number) {
  return cellMap.value.get(`${day}-${hour}`);
}
</script>

<template>
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
          :title="
            cellAt(day, hour)
              ? `${label} ${String(hour).padStart(2, '0')}:00 — ${formatCurrency(cellAt(day, hour)!.total)} (${cellAt(day, hour)!.count})`
              : `${label} ${String(hour).padStart(2, '0')}:00`
          "
          :style="{
            backgroundColor:
              intensity(cellAt(day, hour)?.total ?? 0) > 0
                ? `color-mix(in srgb, var(--color-primary-500) ${Math.round(intensity(cellAt(day, hour)?.total ?? 0) * 100)}%, transparent)`
                : 'var(--color-surface)',
          }"
        />
      </div>
    </div>
  </div>
</template>
