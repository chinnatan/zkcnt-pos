// ─── Base Record ───────────────────────────────────────────────────────────────

export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
  collectionId?: string;
  collectionName?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_platform_admin?: boolean;
  is_active?: boolean;
  created: string;
  updated: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type MemberInviteMode = 'direct' | 'email';

export interface StoreSettings {
  currency: string;   // default 'THB'
  vat_rate: number;   // default 7
  receipt_header: string;
  receipt_footer: string;
  member_invite_mode?: MemberInviteMode;
  promptpay_id?: string;
  transaction_history_cleared_at?: string;
  feature_flags?: Record<string, boolean>;
}

export interface Store extends BaseRecord {
  name: string;
  slug: string;
  address: string;
  phone: string;
  tax_id: string;
  logo: string;
  settings: StoreSettings;
  owner: string;
  is_active: boolean;
}

export interface StoreMember extends BaseRecord {
  store: string;
  user: string;
  role: 'owner' | 'manager' | 'cashier';
  is_active: boolean;
  expand?: {
    user?: {
      id: string;
      name?: string;
      email?: string;
    };
  };
}

export interface StoreInvite extends BaseRecord {
  store: string;
  email: string;
  role: 'manager' | 'cashier';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: string;
  expires: string;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface Category extends BaseRecord {
  store: string;
  name: string;
  description: string;
  image: string;
  sort_order: number;
  is_active: boolean;
  deleted_at?: string | null;
}

export interface Product extends BaseRecord {
  store: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  image: string;
  unit: string;
  track_inventory: boolean;
  is_active: boolean;
  deleted_at?: string | null;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface Customer extends BaseRecord {
  store: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  total_spent: number;
  visit_count: number;
  deleted_at?: string | null;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface Order extends BaseRecord {
  store: string;
  order_number: string;
  client_id: string;
  customer: string;
  cashier: string;
  subtotal: number;
  discount_amount: number;
  discount_type: 'percent' | 'fixed' | '';
  tax_amount: number;
  total: number;
  payment_method: 'cash' | 'qr';
  payment_received: number;
  change_amount: number;
  status: 'completed' | 'voided' | 'refunded';
  note: string;
  synced_at: string;
  coupon_code: string;
  applied_promotions?: readonly AppliedPromotionSnapshot[];
}

export interface OrderItem extends BaseRecord {
  order: string;
  product: string;
  product_name: string;
  product_price: number;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  promotion_id: string;
  free_quantity: number;
  note: string;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface Inventory extends BaseRecord {
  store: string;
  product: string;
  quantity: number;
  low_stock_threshold: number;
}

export interface InventoryTransaction extends BaseRecord {
  store: string;
  product: string;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'sale';
  quantity: number;
  before_qty: number;
  after_qty: number;
  reference: string;
  note: string;
  created_by: string;
}

// ─── Promotion ───────────────────────────────────────────────────────────────

export type PromotionType =
  | 'bxgy'
  | 'qty_fixed'
  | 'order_percent'
  | 'order_fixed'
  | 'coupon';

export type PoolMode = 'same_product' | 'same_category' | 'mixed';
export type RewardMode = 'cheapest' | 'same_product';

export interface PromotionTarget extends BaseRecord {
  promotion: string;
  target_type: 'product' | 'category';
  target_id: string;
  deleted_at?: string | null;
}

export interface AppliedPromotionSnapshot {
  promotion_id: string;
  name: string;
  amount: number;
  coupon_code?: string;
}

export interface Promotion extends BaseRecord {
  store: string;
  name: string;
  type: PromotionType;
  buy_quantity: number;
  get_quantity: number;
  get_discount_percent: number;
  get_discount_type: 'percent' | 'fixed';
  pool_mode: PoolMode;
  reward_mode: RewardMode;
  value: number;
  min_purchase: number;
  coupon_code: string;
  coupon_discount_type: 'percent' | 'fixed';
  max_uses_total: number | null;
  max_uses_per_customer: number | null;
  stackable: boolean;
  priority: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  targets?: PromotionTarget[];
  deleted_at?: string | null;
}

export interface PromotionUsage extends BaseRecord {
  store: string;
  promotion: string;
  order: string;
  customer: string;
  discount_amount: number;
}

// ─── File Blobs (IndexedDB only) ────────────────────────────────────────────

export interface FileBlob {
  id: string;
  store: string;
  collection: string;
  record_id: string;
  field: string;
  blob: Blob;
  mime_type: string;
  created_at: string;
}

export interface FileUploadQueueItem {
  id: number;
  store: string;
  collection: string;
  record_id: string;
  field: string;
  blob_id: string;
  remove: boolean;
  status: "pending" | "in_flight" | "synced" | "error";
  retry_count: number;
  created_at: string;
  error_message: string;
}

// ─── Sync Queue (IndexedDB only) ────────────────────────────────────────────

export interface SyncQueueItem {
  id: number;
  collection: string;
  action: 'create' | 'update' | 'delete';
  record_id: string;
  data: any;
  status: 'pending' | 'in_flight' | 'synced' | 'error';
  retry_count: number;
  created_at: string;
  error_message: string;
  store: string;
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  store: string | null;
  actor: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
  created: string;
}

export interface AuditReconciliation {
  period: { since: string; until: string };
  orders: { count: number; total: number };
  audit_order_create: { count: number; total: number };
  match: boolean;
  voided: { count: number; total: number };
  refunded: { count: number; total: number };
}

// ─── Platform Admin ───────────────────────────────────────────────────────────

export interface AdminOverview {
  stores: { total: number; active: number; new_7d: number };
  users: { total: number; new_7d: number };
  orders_today: { count: number; gmv: number };
  orders_7d: { count: number; gmv: number };
  inactive_stores_7d: number;
  alerts: Array<{ type: string; message: string; severity: 'warning' | 'info' }>;
}

export interface AdminStoreListItem {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  member_count: number;
  last_order_at: string | null;
  is_active: boolean;
  created: string;
}

export interface AdminUserListItem extends AuthUser {
  store_count: number;
}

export interface AdminClientSession {
  id: string;
  user: string;
  user_name: string;
  user_email: string;
  store: string;
  store_name: string;
  client_version: string;
  client_build: string;
  pending_sync_count: number;
  last_sync_at: string | null;
  last_seen_at: string;
  user_agent: string;
  platform: string;
}

export interface AdminHealth {
  status: string;
  version: string;
  build: string;
  db: {
    connected: boolean;
    latency_ms: number;
    row_counts: Record<string, number>;
  };
  r2: { available: boolean };
  cron: {
    backup_last_run: string | null;
    health_warmup_last_run: string | null;
  };
  metrics: {
    recorded_at: string;
    period_hours: number;
    login_failed: number;
    login_success: number;
    registrations: number;
  } | null;
  alerts: { login_failed_last_sent: string | null };
}

// ─── Cart (UI-only, not stored in DB) ────────────────────────────────────────

export interface CartItem {
  line_id: string;
  product: Product;
  quantity: number;
  discount: number;
  free_quantity: number;
  promotion_id: string;
  note: string;
}
