export function orderStatusBadge(status: string): string {
  const map: Record<string, string> = {
    completed: "bg-accent-100 text-accent-700",
    voided: "bg-danger-100 text-danger-700",
    refunded: "bg-warning-100 text-warning-700",
    pending: "bg-warning-100 text-warning-700",
  };
  return map[status] ?? "bg-surface text-ink-muted";
}

export function paymentMethodBadge(method: string): string {
  const map: Record<string, string> = {
    cash: "bg-accent-100 text-accent-700",
    qr: "bg-primary-100 text-primary-700",
  };
  return map[method] ?? "bg-surface text-ink-muted";
}

export function activeBadge(isActive: boolean): string {
  return isActive ? "bg-accent-100 text-accent-700" : "bg-danger-50 text-danger-700";
}

export function stockQuantityBadge(quantity: number, lowStockThreshold: number): string {
  if (quantity <= 0) return "bg-danger-100 text-danger-700";
  if (quantity <= lowStockThreshold) return "bg-warning-100 text-warning-700";
  return "bg-accent-100 text-accent-700";
}

export function memberRoleBadge(role: string): string {
  const map: Record<string, string> = {
    owner: "bg-primary-100 text-primary-700",
    manager: "bg-accent-100 text-accent-700",
    staff: "bg-surface text-ink-muted",
  };
  return map[role] ?? "bg-surface text-ink-muted";
}

export function importStatusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-warning-100 text-warning-700",
    processing: "bg-primary-100 text-primary-700",
    completed: "bg-accent-100 text-accent-700",
    failed: "bg-danger-100 text-danger-700",
  };
  return map[status] ?? "bg-surface text-ink-muted";
}
