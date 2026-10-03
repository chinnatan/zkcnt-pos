<template>
  <div ref="root" class="relative">
    <button
      ref="trigger"
      type="button"
      class="input flex w-full items-center justify-between gap-2 text-left"
      data-testid="date-range-trigger"
      :aria-expanded="open"
      @click="toggle"
    >
      <span :class="modelValue.start ? 'text-ink' : 'text-ink-muted'">{{ label }}</span>
      <span aria-hidden="true">📅</span>
    </button>

    <!-- teleported + fixed so modals/overflow containers never clip it -->
    <Teleport to="body">
    <div
      v-if="open"
      ref="popover"
      class="fixed z-[70] w-72 rounded-lg border border-border-warm bg-paper p-3 shadow-lg"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
      role="dialog"
      data-testid="date-range-popover"
      @keydown.esc.stop="open = false"
      @keydown="onGridKey"
    >
      <div class="mb-2 flex items-center justify-between">
        <button type="button" class="btn-secondary" :aria-label="t('boothsPage.calPrev')" @click="shiftMonth(-1)">‹</button>
        <span class="text-sm font-semibold text-ink">{{ monthTitle }}</span>
        <button type="button" class="btn-secondary" :aria-label="t('boothsPage.calNext')" @click="shiftMonth(1)">›</button>
      </div>
      <div class="grid grid-cols-7 text-center text-xs text-ink-muted">
        <span v-for="d in weekdayOrder(weekStart)" :key="d" class="py-1">{{ weekdayShort(d) }}</span>
      </div>
      <div v-for="(week, wi) in grid" :key="wi" class="grid grid-cols-7">
        <button
          v-for="day in week"
          :key="day.key"
          type="button"
          :data-day="day.key"
          class="h-9 text-sm"
          :class="dayClass(day)"
          @click="pick(day.key)"
        >
          {{ Number(day.key.slice(8)) }}
        </button>
      </div>
      <div class="mt-2 flex justify-between">
        <button type="button" class="text-xs text-danger-600 hover:underline" @click="clear">{{ t('boothsPage.pickerClear') }}</button>
        <button type="button" class="btn-primary" @click="open = false">{{ t('boothsPage.pickerDone') }}</button>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { addDays, buildMonthGrid, nextRange, weekdayOrder, type DateRange } from "~/lib/booths/calendar";
import { getBangkokDateKey } from "~/lib/timezone";

const props = defineProps<{ modelValue: DateRange; weekStart?: number }>();
const emit = defineEmits<{ "update:modelValue": [value: DateRange] }>();

const { t, locale } = useI18n();
const { formatDateKey } = useFormat();

const weekStart = computed(() => props.weekStart ?? 0);
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLElement | null>(null);
const popover = ref<HTMLElement | null>(null);
const pos = reactive({ top: 0, left: 0 });
const view = reactive({ year: 0, month: 0 });
const today = getBangkokDateKey();

const label = computed(() => {
  const { start, end } = props.modelValue;
  if (!start) return t("boothsPage.pickerPlaceholder");
  return `${formatDateKey(start)} – ${end ? formatDateKey(end) : "…"}`;
});

const grid = computed(() => buildMonthGrid(view.year, view.month, weekStart.value));

// Thai shows the Buddhist-era year (พ.ศ.), other locales the Gregorian year
const intlLocale = computed(() => (locale.value === "th" ? "th-TH-u-ca-buddhist" : "en-GB"));
const monthTitle = computed(() =>
  new Intl.DateTimeFormat(intlLocale.value, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(view.year, view.month - 1, 1),
  ),
);
const weekdayShort = (day: number) =>
  new Intl.DateTimeFormat(locale.value === "th" ? "th-TH" : "en-GB", {
    weekday: "short",
    timeZone: "UTC",
  }).format(Date.UTC(2026, 0, 4 + day));

function syncView(key: string) {
  const [y, m] = (key || today).split("-").map(Number);
  view.year = y!;
  view.month = m!;
}

const POPOVER_W = 288; // w-72
const POPOVER_H = 380;

function place() {
  const rect = trigger.value?.getBoundingClientRect();
  if (!rect) return;
  const below = rect.bottom + 4;
  const fitsBelow = below + POPOVER_H <= window.innerHeight;
  pos.top = Math.max(8, fitsBelow ? below : rect.top - POPOVER_H - 4);
  pos.left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_W - 8));
}

function toggle() {
  if (!open.value) {
    syncView(props.modelValue.start);
    place();
  }
  open.value = !open.value;
}

function shiftMonth(delta: number) {
  const d = new Date(Date.UTC(view.year, view.month - 1 + delta, 1));
  view.year = d.getUTCFullYear();
  view.month = d.getUTCMonth() + 1;
}

function pick(key: string) {
  emit("update:modelValue", nextRange(props.modelValue, key));
  const [y, m] = key.split("-").map(Number);
  if (y !== view.year || m !== view.month) syncView(key);
}

function clear() {
  emit("update:modelValue", { start: "", end: "" });
}

function dayClass(day: { key: string; inMonth: boolean }) {
  const { start, end } = props.modelValue;
  const last = end || start;
  const isEdge = day.key === start || day.key === last;
  const inRange = !!start && day.key >= start && day.key <= last;
  return [
    isEdge ? "rounded-md bg-primary-600 font-semibold text-white" : inRange ? "bg-primary-100 text-ink" : "hover:bg-surface",
    !day.inMonth && !isEdge && !inRange ? "text-ink-muted/50" : "",
    day.key === today && !isEdge ? "font-bold underline" : "",
  ];
}

// arrow keys move focus by day / week inside the grid
function onGridKey(event: KeyboardEvent) {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
  const current = (event.target as HTMLElement | null)?.dataset?.day;
  if (!step || !current) return;
  event.preventDefault();
  const target = addDays(current, step);
  const [y, m] = target.split("-").map(Number);
  if (y !== view.year || m !== view.month) syncView(target);
  nextTick(() => popover.value?.querySelector<HTMLElement>(`[data-day="${target}"]`)?.focus());
}

function onOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (open.value && !root.value?.contains(target) && !popover.value?.contains(target)) open.value = false;
}

const close = () => (open.value = false);

onMounted(() => {
  document.addEventListener("mousedown", onOutside);
  window.addEventListener("resize", close);
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onOutside);
  window.removeEventListener("resize", close);
});
</script>
