import { stockStatusOf } from "~/lib/stock";

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

  function permissionLabel(permissionId: string): string {
    return t(`permissions.items.${permissionId}`);
  }

  function permissionGroupLabel(group: string): string {
    return t(`permissions.groups.${group}`);
  }

  function stockStatusLabel(quantity: number, threshold: number): string {
    const status = stockStatusOf(quantity, threshold);
    if (status === "out") return t("stock.outOfStock");
    if (status === "low") return t("stock.lowStock");
    return t("stock.inStock");
  }

  return { statusLabel, paymentLabel, roleLabel, permissionLabel, permissionGroupLabel, stockStatusLabel };
}
