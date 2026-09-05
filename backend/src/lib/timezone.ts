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

export function formatBangkokDateShort(date: Date | string, locale = "en-US"): string {
  return new Date(date).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: BANGKOK_TZ,
  });
}
