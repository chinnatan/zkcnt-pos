export function useFormat() {
  const { locale } = useI18n();

  const localeTag = computed(() => (locale.value === "th" ? "th-TH" : "en-US"));

  function formatCurrency(amount: number): string {
    return `฿${amount.toLocaleString(localeTag.value, { minimumFractionDigits: 2 })}`;
  }

  function formatDate(date?: string | Date): string {
    if (!date) return "";
    return new Date(date).toLocaleString(localeTag.value);
  }

  function formatDateShort(date?: string | Date): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString(localeTag.value);
  }

  function formatTime(date?: string | Date): string {
    if (!date) return "";
    return new Date(date).toLocaleString(localeTag.value, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatAmount(amount: number): string {
    return amount.toLocaleString(localeTag.value, { minimumFractionDigits: 2 });
  }

  return { formatCurrency, formatDate, formatDateShort, formatTime, formatAmount };
}
