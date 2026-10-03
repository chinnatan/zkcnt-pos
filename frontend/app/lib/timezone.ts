export const BANGKOK_TZ = "Asia/Bangkok";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface BangkokParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
}

export function getBangkokParts(date: Date | string): BangkokParts {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(d);

  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";

  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
    minute: num("minute"),
    dayOfWeek: WEEKDAY_MAP[weekday] ?? 0,
  };
}

export function getBangkokDateKey(date?: Date | string): string {
  const p = getBangkokParts(date ?? new Date());
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function bangkokWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
}

export function getBangkokStartOfDay(date?: Date | string): Date {
  const p = getBangkokParts(date ?? new Date());
  return bangkokWallTimeToUtc(p.year, p.month, p.day);
}

export function getBangkokStartOfWeek(date?: Date | string): Date {
  const p = getBangkokParts(date ?? new Date());
  const diff = p.dayOfWeek === 0 ? 6 : p.dayOfWeek - 1;
  const todayStart = getBangkokStartOfDay(date);
  return new Date(todayStart.getTime() - diff * 86_400_000);
}

export function getBangkokStartOfMonth(date?: Date | string): Date {
  const p = getBangkokParts(date ?? new Date());
  return bangkokWallTimeToUtc(p.year, p.month, 1);
}

export function formatBangkokDateShort(date: Date | string, locale: string): string {
  return new Date(date).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: BANGKOK_TZ,
  });
}

/**
 * App-wide display format: dd/MM/yyyy in Asia/Bangkok.
 * Thai (`th`) shows the Buddhist-era year (พ.ศ.); every other locale shows the Gregorian year.
 */
export function formatBangkokDate(date: Date | string, locale = "en"): string {
  const p = new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: BANGKOK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    p.find((x) => x.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

/** dd/MM/yyyy HH:mm:ss (24h, Asia/Bangkok); year per locale as in `formatBangkokDate` */
export function formatBangkokDateTime(date: Date | string, locale = "en"): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));
  return `${formatBangkokDate(date, locale)} ${time}`;
}

/** "YYYY-MM-DD" (date-only value, e.g. `<input type="date">`) → dd/MM/yyyy; no timezone shift. */
export function formatDateKey(key?: string | null, locale = "en"): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key ?? "");
  if (!m) return "";
  const year = locale === "th" ? Number(m[1]) + 543 : m[1];
  return `${m[3]}/${m[2]}/${year}`;
}
