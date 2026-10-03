import type { Booth } from "~/lib/types";

export type BoothStatus = "upcoming" | "ongoing" | "ended" | "closed";

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

const toUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);
const fromUtc = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** `YYYY-MM-DD` ± n days (UTC math on date keys, so no timezone/DST shift) */
export function addDays(key: string, n: number): string {
  return fromUtc(toUtc(key) + n * DAY_MS);
}

/** closed → ปิดแล้ว, ended → พ้นวันจบงาน, upcoming → ยังไม่ถึงวันเริ่ม, otherwise ongoing */
export function boothStatus(
  booth: Pick<Booth, "closed_at" | "start_date" | "end_date">,
  today: string,
): BoothStatus {
  if (booth.closed_at) return "closed";
  if (booth.end_date && today > booth.end_date) return "ended";
  if (booth.start_date && today < booth.start_date) return "upcoming";
  return "ongoing";
}

export const BOOTH_STATUS_COLOR: Record<BoothStatus, string> = {
  ongoing: "var(--color-success-700)",
  upcoming: "var(--color-primary-600)",
  ended: "var(--color-warning-700)",
  closed: "var(--color-ink-muted)",
};

/** Booths with a start date → FullCalendar all-day events (`end` is exclusive there). */
export function boothEvents(
  booths: Array<Pick<Booth, "id" | "name" | "closed_at" | "start_date" | "end_date" | "deleted_at">>,
  today: string,
) {
  return booths
    .filter((b) => !b.deleted_at && b.start_date)
    .map((b) => {
      const last = b.end_date && b.end_date >= b.start_date ? b.end_date : b.start_date;
      const color = BOOTH_STATUS_COLOR[boothStatus(b, today)];
      return {
        id: b.id,
        title: b.name,
        start: b.start_date,
        end: addDays(last, 1),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
      };
    });
}

/** FullCalendar `select` gives an exclusive end → inclusive range */
export function selectionToRange(startStr: string, endStr: string) {
  const start = startStr.slice(0, 10);
  const end = addDays(endStr.slice(0, 10), -1);
  return { start, end: end < start ? start : end };
}

export interface DateRange {
  start: string;
  end: string;
}

/** Click flow of the range picker: start → end → (click again) restart */
export function nextRange(current: DateRange, clicked: string): DateRange {
  if (!current.start || current.end) return { start: clicked, end: "" };
  return clicked < current.start
    ? { start: clicked, end: "" }
    : { start: current.start, end: clicked };
}

export interface GridDay {
  key: string;
  inMonth: boolean;
}

/** 6×7 month grid; `weekStart` 0 = Sunday … 6 = Saturday; `month` is 1–12 */
export function buildMonthGrid(year: number, month: number, weekStart = 0): GridDay[][] {
  const first = Date.UTC(year, month - 1, 1);
  const offset = (new Date(first).getUTCDay() - weekStart + 7) % 7;
  const gridStart = first - offset * DAY_MS;
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(gridStart + (w * 7 + d) * DAY_MS);
      return { key: fromUtc(date.getTime()), inMonth: date.getUTCMonth() === month - 1 };
    }),
  );
}

/** weekday indexes (0 = Sunday) in display order */
export const weekdayOrder = (weekStart = 0) =>
  Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
