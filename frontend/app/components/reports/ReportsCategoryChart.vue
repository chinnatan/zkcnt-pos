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
  "#6b9eb8",
  "#6ba8a0",
  "#8fc5e3",
  "#5a8da8",
  "#b8dcef",
  "#5a9690",
  "#d4898a",
  "#c4b07a",
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
