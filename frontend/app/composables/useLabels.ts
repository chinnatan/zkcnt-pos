export function useLabels() {
  const { t } = useI18n();

  function statusLabel(status: string): string {
    const map: Record<string, string> = {
      completed: t("status.completed"),
      voided: t("status.voided"),
      refunded: t("status.refunded"),
    };
    return map[status] || status;
  }

  function paymentLabel(method: string): string {
    const map: Record<string, string> = {
      cash: t("payment.cash"),
      qr: t("payment.qr"),
    };
    return map[method] || method;
  }

  function roleLabel(role: string): string {
    const map: Record<string, string> = {
      owner: t("roles.owner"),
      manager: t("roles.manager"),
      cashier: t("roles.cashier"),
    };
    return map[role] || role;
  }

  function stockStatusLabel(quantity: number, threshold: number): string {
    if (quantity <= 0) return t("stock.outOfStock");
    if (quantity <= threshold) return t("stock.lowStock");
    return t("stock.inStock");
  }

  return { statusLabel, paymentLabel, roleLabel, stockStatusLabel };
}
