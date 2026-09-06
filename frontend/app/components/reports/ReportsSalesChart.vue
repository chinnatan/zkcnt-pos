<template>
  <div class="h-48 sm:h-64">
    <Chart v-if="chartData" type="bar" :data="chartData" :options="options" />
  </div>
</template>

<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Chart } from "vue-chartjs";
import type { ReportTimeSeriesPoint } from "~/lib/types/reports";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  Title,
  Tooltip,
  Legend,
);

const props = defineProps<{
  points: ReportTimeSeriesPoint[];
  salesLabel: string;
  ordersLabel: string;
}>();

const chartData = computed(() => ({
  labels: props.points.map((p) => p.label),
  datasets: [
    {
      type: "bar" as const,
      label: props.salesLabel,
      data: props.points.map((p) => p.total),
      backgroundColor: "rgba(107, 158, 184, 0.55)",
      borderRadius: 4,
      yAxisID: "y",
    },
    {
      type: "line" as const,
      label: props.ordersLabel,
      data: props.points.map((p) => p.count),
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgb(16, 185, 129)",
      pointRadius: 3,
      yAxisID: "y1",
      tension: 0.3,
    },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: { display: true, position: "top" as const },
  },
  scales: {
    y: {
      beginAtZero: true,
      position: "left" as const,
      ticks: { maxTicksLimit: 6 },
    },
    y1: {
      beginAtZero: true,
      position: "right" as const,
      grid: { drawOnChartArea: false },
      ticks: { maxTicksLimit: 6, stepSize: 1 },
    },
  },
};
</script>
