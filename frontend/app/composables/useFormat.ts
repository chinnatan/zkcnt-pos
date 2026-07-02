export function useFormat() {
  const { locale } = useI18n();

  const localeTag = computed(() => (locale.value === "th" ? "th-TH" : "en-US"));
  const timeZone = "Asia/Bangkok";

  function formatCurrency(amount: number): string {
    return `${amount.toLocaleString(localeTag.value, { minimumFractionDigits: 2 })}฿`;
  }

  function formatDate(date?: string | Date): string {
    if (!date) return "";
    return new Date(date).toLocaleString(localeTag.value, { timeZone });
  }

  function formatDateShort(date?: string | Date): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString(localeTag.value, { timeZone });
  }

  function formatTime(date?: string | Date): string {
    if (!date) return "";
    return new Date(date).toLocaleString(localeTag.value, {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /** Format Date for `<input type="datetime-local">` in Asia/Bangkok wall time */
  function toDatetimeLocalValue(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "00";

    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  }

  /** Parse datetime-local value (Bangkok wall time) to ISO UTC */
  function datetimeLocalToIso(local: string): string | undefined {
    if (!local) return undefined;
    const [datePart, timePart] = local.split("T");
    if (!datePart || !timePart) return undefined;
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    // Bangkok is UTC+7 with no DST
    const utcMs = Date.UTC(year, month - 1, day, hour - 7, minute);
    return new Date(utcMs).toISOString();
  }

  function formatAmount(amount: number): string {
    return amount.toLocaleString(localeTag.value, { minimumFractionDigits: 2 });
  }

  return {
    formatCurrency,
    formatDate,
    formatDateShort,
    formatTime,
    formatAmount,
    toDatetimeLocalValue,
    datetimeLocalToIso,
  };
}
