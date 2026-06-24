<template>
  <div class="h-48 sm:h-64">
    <Bar v-if="chartData" :data="chartData" :options="options" />
  </div>
</template>

<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "vue-chartjs";
import type { ReportTimeSeriesPoint } from "~/lib/types/reports";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  points: ReportTimeSeriesPoint[];
  label: string;
}>();

const chartData = computed(() => ({
  labels: props.points.map((p) => p.label),
  datasets: [
    {
      label: props.label,
      data: props.points.map((p) => p.total),
      backgroundColor: "rgba(107, 158, 184, 0.55)",
      borderRadius: 4,
    },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { maxTicksLimit: 6 },
    },
  },
};
</script>
