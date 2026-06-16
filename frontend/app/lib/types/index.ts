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

// ─── Discount ────────────────────────────────────────────────────────────────

export interface Discount extends BaseRecord {
  store: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  min_purchase: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
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

// ─── Cart (UI-only, not stored in DB) ────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  note: string;
}
