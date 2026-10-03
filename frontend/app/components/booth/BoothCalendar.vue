<template>
  <div class="space-y-3" data-testid="booth-calendar">
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex gap-1">
        <button type="button" class="btn-secondary" :aria-label="t('boothsPage.calPrev')" @click="api()?.prev()">‹</button>
        <button type="button" class="btn-secondary" @click="api()?.today()">{{ t('boothsPage.calToday') }}</button>
        <button type="button" class="btn-secondary" :aria-label="t('boothsPage.calNext')" @click="api()?.next()">›</button>
      </div>
      <h3 class="min-w-0 flex-1 text-base font-semibold text-ink" data-testid="calendar-title">{{ title }}</h3>
      <label class="flex items-center gap-2 text-xs text-ink-muted">
        {{ t('boothsPage.weekStart') }}
        <select
          :value="weekStart"
          class="input w-auto"
          data-testid="week-start"
          @change="emit('update:weekStart', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="d in 7" :key="d" :value="d - 1">{{ weekdayName(d - 1) }}</option>
        </select>
      </label>
    </div>

    <FullCalendar ref="cal" :options="options" />

    <ul class="flex flex-wrap gap-3 text-xs text-ink-muted">
      <li v-for="s in statuses" :key="s" class="flex items-center gap-1">
        <span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: BOOTH_STATUS_COLOR[s] }" />
        {{ t(`boothsPage.status.${s}`) }}
      </li>
    </ul>
    <p class="text-xs text-ink-muted">{{ t('boothsPage.calHint') }}</p>
  </div>
</template>

<script setup lang="ts">
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarApi, DatesSetArg, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { BOOTH_STATUS_COLOR, boothEvents, selectionToRange, type BoothStatus } from "~/lib/booths/calendar";
import { getBangkokDateKey } from "~/lib/timezone";
import type { Booth } from "~/lib/types";

const props = defineProps<{ booths: Booth[]; weekStart: number }>();
const emit = defineEmits<{
  "select-booth": [id: string];
  "create-range": [range: { start: string; end: string }];
  "update:weekStart": [day: number];
}>();

const { t, locale } = useI18n();
const cal = ref<InstanceType<typeof FullCalendar> | null>(null);
const title = ref("");
const statuses: BoothStatus[] = ["ongoing", "upcoming", "ended", "closed"];

const api = (): CalendarApi | undefined => cal.value?.getApi();

const weekdayName = (day: number) =>
  new Intl.DateTimeFormat(locale.value === "th" ? "th-TH" : "en-GB", {
    weekday: "long",
    timeZone: "UTC",
  }).format(Date.UTC(2026, 0, 4 + day)); // 4 Jan 2026 is a Sunday

const options = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  locale: locale.value === "th" ? "th" : "en-gb",
  firstDay: props.weekStart,
  height: "auto" as const,
  headerToolbar: false as const,
  fixedWeekCount: false,
  dayMaxEvents: 3,
  selectable: true,
  events: boothEvents(props.booths, getBangkokDateKey()),
  datesSet: (arg: DatesSetArg) => {
    title.value = arg.view.title;
  },
  eventClick: (arg: EventClickArg) => emit("select-booth", arg.event.id),
  select: (arg: DateSelectArg) => {
    emit("create-range", selectionToRange(arg.startStr, arg.endStr));
    api()?.unselect();
  },
}));
</script>
