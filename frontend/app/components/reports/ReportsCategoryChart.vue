<template>
  <div class="mx-auto h-48 max-w-xs sm:h-56">
    <Doughnut v-if="chartData" :data="chartData" :options="options" />
  </div>
</template>

<script setup lang="ts">
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "vue-chartjs";
import type { ReportCategoryRow } from "~/lib/types/reports";

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  categories: ReportCategoryRow[];
}>();

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

const chartData = computed(() => ({
  labels: props.categories.map((c) => c.name),
  datasets: [
    {
      data: props.categories.map((c) => c.revenue),
      backgroundColor: props.categories.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 0,
    },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
    },
  },
};
</script>
