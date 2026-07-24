export type StoreRole = "owner" | "manager" | "cashier";
export type PermissionTier = "member" | "manager" | "owner";
export type PermissionGroup =
  | "sales"
  | "catalog"
  | "inventory"
  | "customers"
  | "promotions"
  | "reports"
  | "store"
  | "team"
  | "system";

const TIER_RANK: Record<StoreRole, number> = {
  cashier: 0,
  manager: 1,
  owner: 2,
};

const MIN_TIER_RANK: Record<PermissionTier, number> = {
  member: 0,
  manager: 1,
  owner: 2,
};

export const STORE_ROLES: StoreRole[] = ["owner", "manager", "cashier"];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  "sales",
  "catalog",
  "inventory",
  "customers",
  "promotions",
  "reports",
  "store",
  "team",
  "system",
];

export const ROLE_PERMISSIONS = [
  { id: "pos.use", tier: "member", group: "sales" },
  { id: "orders.create", tier: "member", group: "sales" },
  { id: "orders.view", tier: "member", group: "sales" },
  { id: "orders.voidRefund", tier: "manager", group: "sales" },
  { id: "products.manage", tier: "member", group: "catalog" },
  { id: "inventory.manage", tier: "member", group: "inventory" },
  { id: "customers.manage", tier: "member", group: "customers" },
  { id: "promotions.manage", tier: "member", group: "promotions" },
  { id: "reports.view", tier: "member", group: "reports" },
  { id: "store.edit", tier: "member", group: "store" },
  { id: "store.paymentSettings", tier: "manager", group: "store" },
  { id: "store.clearHistory", tier: "owner", group: "store" },
  { id: "team.view", tier: "member", group: "team" },
  { id: "team.addInvite", tier: "manager", group: "team" },
  { id: "team.remove", tier: "owner", group: "team" },
  { id: "team.changeRole", tier: "owner", group: "team" },
  { id: "team.inviteMode", tier: "owner", group: "team" },
  { id: "audit.view", tier: "manager", group: "system" },
] as const satisfies ReadonlyArray<{
  id: string;
  tier: PermissionTier;
  group: PermissionGroup;
}>;

export type PermissionId = (typeof ROLE_PERMISSIONS)[number]["id"];

export function roleHasPermission(role: StoreRole, tier: PermissionTier): boolean {
  return TIER_RANK[role] >= MIN_TIER_RANK[tier];
}

export function permissionsByGroup(group: PermissionGroup) {
  return ROLE_PERMISSIONS.filter((permission) => permission.group === group);
}
