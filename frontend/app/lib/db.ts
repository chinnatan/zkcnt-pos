import Dexie, { type Table } from 'dexie';
import type {
  Store,
  StoreMember,
  Category,
  Product,
  Customer,
  Order,
  OrderItem,
  Inventory,
  Discount,
  Promotion,
  PromotionTarget,
  SyncQueueItem,
  FileBlob,
  FileUploadQueueItem,
} from './types';

export class PosDatabase extends Dexie {
  stores!: Table<Store>;
  storeMembers!: Table<StoreMember>;
  categories!: Table<Category>;
  products!: Table<Product>;
  customers!: Table<Customer>;
  orders!: Table<Order>;
  orderItems!: Table<OrderItem>;
  inventory!: Table<Inventory>;
  discounts!: Table<Discount>;
  promotions!: Table<Promotion>;
  promotionTargets!: Table<PromotionTarget>;
  syncQueue!: Table<SyncQueueItem, number>;
  fileBlobs!: Table<FileBlob>;
  fileUploadQueue!: Table<FileUploadQueueItem, number>;

  constructor() {
    super('zkcnt-pos');

    this.version(1).stores({
      stores: 'id, slug, owner',
      storeMembers: 'id, [store+user], store, user',
      categories: 'id, store, [store+is_active], name, sort_order',
      products: 'id, store, [store+is_active], [store+sku], [store+barcode], name, category',
      customers: 'id, store, [store+name], phone, email',
      orders: 'id, store, [store+status], client_id, order_number, cashier, created',
      orderItems: 'id, order, product',
      inventory: 'id, store, [store+product], product',
      syncQueue: '++id, collection, action, status, store, created_at',
    });

    this.version(2).stores({
      fileBlobs: 'id, store, [store+collection+record_id], collection, record_id, field',
      fileUploadQueue: '++id, store, collection, record_id, status, created_at',
    });

    this.version(3).stores({
      discounts: 'id, store, [store+is_active], name',
    });

    this.version(4).stores({
      promotions: 'id, store, [store+is_active], name, type, priority',
      promotionTargets: 'id, promotion, [promotion+target_type], target_id',
    });
  }
}

export const db = new PosDatabase();
