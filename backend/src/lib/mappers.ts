import type { users } from "../db/schema";
import { withMeta } from "./record";

type UserRow = typeof users.$inferSelect;

export function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    created: row.created,
    updated: row.updated,
  };
}

export function mapStore(row: {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  taxId: string;
  logo: string;
  settings: unknown;
  owner: string;
  isActive: boolean;
  created: string;
  updated: string;
}) {
  return withMeta("stores", {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    phone: row.phone,
    tax_id: row.taxId,
    logo: row.logo,
    settings: row.settings,
    owner: row.owner,
    is_active: row.isActive,
    created: row.created,
    updated: row.updated,
  });
}

export function mapStoreMember(row: {
  id: string;
  store: string;
  user: string;
  role: string;
  isActive: boolean;
  created: string;
  updated: string;
}) {
  return withMeta("store_members", {
    id: row.id,
    store: row.store,
    user: row.user,
    role: row.role,
    is_active: row.isActive,
    created: row.created,
    updated: row.updated,
  });
}

export function mapStoreInvite(row: {
  id: string;
  store: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invitedBy: string;
  expires: string;
  created: string;
  updated: string;
}) {
  return withMeta("store_invites", {
    id: row.id,
    store: row.store,
    email: row.email,
    role: row.role,
    token: row.token,
    status: row.status,
    invited_by: row.invitedBy,
    expires: row.expires,
    created: row.created,
    updated: row.updated,
  });
}

export function mapCategory(row: {
  id: string;
  store: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
  created: string;
  updated: string;
}) {
  return withMeta("categories", {
    id: row.id,
    store: row.store,
    name: row.name,
    description: row.description,
    image: row.image,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    created: row.created,
    updated: row.updated,
  });
}

export function mapProduct(row: {
  id: string;
  store: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: number;
  cost: number;
  category: string | null;
  image: string;
  unit: string;
  trackInventory: boolean;
  isActive: boolean;
  created: string;
  updated: string;
}) {
  return withMeta("products", {
    id: row.id,
    store: row.store,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    description: row.description,
    price: row.price,
    cost: row.cost,
    category: row.category ?? "",
    image: row.image,
    unit: row.unit,
    track_inventory: row.trackInventory,
    is_active: row.isActive,
    created: row.created,
    updated: row.updated,
  });
}

export function mapCustomer(row: {
  id: string;
  store: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  totalSpent: number;
  visitCount: number;
  created: string;
  updated: string;
}) {
  return withMeta("customers", {
    id: row.id,
    store: row.store,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    note: row.note,
    total_spent: row.totalSpent,
    visit_count: row.visitCount,
    created: row.created,
    updated: row.updated,
  });
}

export function mapOrder(row: {
  id: string;
  store: string;
  orderNumber: string;
  clientId: string;
  customer: string | null;
  cashier: string;
  subtotal: number;
  discountAmount: number;
  discountType: string;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  paymentReceived: number;
  changeAmount: number;
  status: string;
  note: string;
  syncedAt: string;
  created: string;
  updated: string;
}) {
  return withMeta("orders", {
    id: row.id,
    store: row.store,
    order_number: row.orderNumber,
    client_id: row.clientId,
    customer: row.customer ?? "",
    cashier: row.cashier,
    subtotal: row.subtotal,
    discount_amount: row.discountAmount,
    discount_type: row.discountType,
    tax_amount: row.taxAmount,
    total: row.total,
    payment_method: row.paymentMethod,
    payment_received: row.paymentReceived,
    change_amount: row.changeAmount,
    status: row.status,
    note: row.note,
    synced_at: row.syncedAt,
    created: row.created,
    updated: row.updated,
  });
}

export function mapOrderItem(row: {
  id: string;
  order: string;
  product: string;
  productName: string;
  productPrice: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  created: string;
  updated: string;
}) {
  return withMeta("order_items", {
    id: row.id,
    order: row.order,
    product: row.product,
    product_name: row.productName,
    product_price: row.productPrice,
    quantity: row.quantity,
    unit_price: row.unitPrice,
    discount: row.discount,
    total: row.total,
    created: row.created,
    updated: row.updated,
  });
}

export function mapInventory(row: {
  id: string;
  store: string;
  product: string;
  quantity: number;
  lowStockThreshold: number;
  created: string;
  updated: string;
}) {
  return withMeta("inventory", {
    id: row.id,
    store: row.store,
    product: row.product,
    quantity: row.quantity,
    low_stock_threshold: row.lowStockThreshold,
    created: row.created,
    updated: row.updated,
  });
}

export function mapInventoryTransaction(row: {
  id: string;
  store: string;
  product: string;
  type: string;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  reference: string;
  note: string;
  createdBy: string;
  created: string;
  updated: string;
}) {
  return withMeta("inventory_transactions", {
    id: row.id,
    store: row.store,
    product: row.product,
    type: row.type,
    quantity: row.quantity,
    before_qty: row.beforeQty,
    after_qty: row.afterQty,
    reference: row.reference,
    note: row.note,
    created_by: row.createdBy,
    created: row.created,
    updated: row.updated,
  });
}

export function mapAuditEvent(row: {
  id: string;
  store: string | null;
  actor: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
  created: string;
  actorName?: string | null;
}) {
  return {
    id: row.id,
    store: row.store,
    actor: row.actor,
    actor_name: row.actorName ?? null,
    action: row.action,
    entity_type: row.entityType,
    entity_id: row.entityId,
    summary: row.summary,
    changes: row.changes,
    metadata: row.metadata,
    created: row.created,
  };
}

export function mapDiscount(row: {
  id: string;
  store: string;
  name: string;
  type: string;
  value: number;
  minPurchase: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  created: string;
  updated: string;
}) {
  return withMeta("discounts", {
    id: row.id,
    store: row.store,
    name: row.name,
    type: row.type,
    value: row.value,
    min_purchase: row.minPurchase,
    start_date: row.startDate,
    end_date: row.endDate,
    is_active: row.isActive,
    created: row.created,
    updated: row.updated,
  });
}
