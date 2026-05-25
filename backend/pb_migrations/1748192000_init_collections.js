/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const storeRule = '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store'
  const storeMemberRule = '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store'

  // 1. stores
  const stores = new Collection({
    type: "base",
    name: "stores",
    listRule: '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= id',
    viewRule: '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= id',
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= id',
    deleteRule: '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= id && @collection.store_members.role ?= "owner"',
    fields: [
      { name: "name", type: "text", required: true },
      { name: "slug", type: "text", required: true, pattern: "^[a-z0-9-]+$" },
      { name: "address", type: "text" },
      { name: "phone", type: "text" },
      { name: "tax_id", type: "text" },
      { name: "logo", type: "file", maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"] },
      { name: "settings", type: "json" },
      { name: "owner", type: "relation", collectionId: "users", required: true, cascadeDelete: false },
      { name: "is_active", type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_stores_slug ON stores (slug)",
    ],
  })
  app.save(stores)

  // 2. store_members
  const storeMembers = new Collection({
    type: "base",
    name: "store_members",
    listRule: storeMemberRule,
    viewRule: storeMemberRule,
    createRule: '@request.auth.id != ""',
    updateRule: '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && @collection.store_members.role ?= "owner"',
    deleteRule: '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && @collection.store_members.role ?= "owner"',
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: true },
      { name: "user", type: "relation", collectionId: "users", required: true, cascadeDelete: true },
      { name: "role", type: "select", values: ["owner", "manager", "cashier"], required: true },
      { name: "is_active", type: "bool" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_store_members_store_user ON store_members (store, user)",
    ],
  })
  app.save(storeMembers)

  // 3. categories
  const categories = new Collection({
    type: "base",
    name: "categories",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: storeRule,
    deleteRule: storeRule,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: true },
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "image", type: "file", maxSize: 2097152, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
      { name: "sort_order", type: "number" },
      { name: "is_active", type: "bool" },
    ],
  })
  app.save(categories)

  // 4. products
  const products = new Collection({
    type: "base",
    name: "products",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: storeRule,
    deleteRule: storeRule,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: true },
      { name: "name", type: "text", required: true },
      { name: "sku", type: "text" },
      { name: "barcode", type: "text" },
      { name: "description", type: "text" },
      { name: "price", type: "number", required: true, min: 0 },
      { name: "cost", type: "number", min: 0 },
      { name: "category", type: "relation", collectionId: "categories", cascadeDelete: false },
      { name: "image", type: "file", maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
      { name: "unit", type: "text" },
      { name: "track_inventory", type: "bool" },
      { name: "is_active", type: "bool" },
    ],
  })
  app.save(products)

  // 5. customers
  const customers = new Collection({
    type: "base",
    name: "customers",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: storeRule,
    deleteRule: storeRule,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: true },
      { name: "name", type: "text", required: true },
      { name: "phone", type: "text" },
      { name: "email", type: "email" },
      { name: "address", type: "text" },
      { name: "note", type: "text" },
      { name: "total_spent", type: "number" },
      { name: "visit_count", type: "number" },
    ],
  })
  app.save(customers)

  // 6. orders
  const orders = new Collection({
    type: "base",
    name: "orders",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: storeRule,
    deleteRule: null,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: false },
      { name: "order_number", type: "text", required: true },
      { name: "client_id", type: "text", required: true },
      { name: "customer", type: "relation", collectionId: "customers", cascadeDelete: false },
      { name: "cashier", type: "relation", collectionId: "users", required: true, cascadeDelete: false },
      { name: "subtotal", type: "number", required: true },
      { name: "discount_amount", type: "number" },
      { name: "discount_type", type: "select", values: ["percent", "fixed"] },
      { name: "tax_amount", type: "number" },
      { name: "total", type: "number", required: true },
      { name: "payment_method", type: "select", values: ["cash", "qr", "card"], required: true },
      { name: "payment_received", type: "number" },
      { name: "change_amount", type: "number" },
      { name: "status", type: "select", values: ["completed", "voided", "refunded"], required: true },
      { name: "note", type: "text" },
      { name: "synced_at", type: "date" },
    ],
    indexes: [
      "CREATE INDEX idx_orders_store_order_number ON orders (store, order_number)",
      "CREATE INDEX idx_orders_client_id ON orders (client_id)",
    ],
  })
  app.save(orders)

  // 7. order_items
  const orderItemsRule = '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= order.store'
  const orderItems = new Collection({
    type: "base",
    name: "order_items",
    listRule: orderItemsRule,
    viewRule: orderItemsRule,
    createRule: orderItemsRule,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "order", type: "relation", collectionId: "orders", required: true, cascadeDelete: true },
      { name: "product", type: "relation", collectionId: "products", required: true, cascadeDelete: false },
      { name: "product_name", type: "text", required: true },
      { name: "product_price", type: "number", required: true },
      { name: "quantity", type: "number", required: true, min: 1 },
      { name: "unit_price", type: "number", required: true },
      { name: "discount", type: "number" },
      { name: "total", type: "number", required: true },
    ],
  })
  app.save(orderItems)

  // 8. inventory
  const inventory = new Collection({
    type: "base",
    name: "inventory",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: storeRule,
    deleteRule: storeRule,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: true },
      { name: "product", type: "relation", collectionId: "products", required: true, cascadeDelete: true },
      { name: "quantity", type: "number" },
      { name: "low_stock_threshold", type: "number" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_inventory_store_product ON inventory (store, product)",
    ],
  })
  app.save(inventory)

  // 9. inventory_transactions
  const inventoryTransactions = new Collection({
    type: "base",
    name: "inventory_transactions",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: false },
      { name: "product", type: "relation", collectionId: "products", required: true, cascadeDelete: false },
      { name: "type", type: "select", values: ["stock_in", "stock_out", "adjustment", "sale"], required: true },
      { name: "quantity", type: "number", required: true },
      { name: "before_qty", type: "number", required: true },
      { name: "after_qty", type: "number", required: true },
      { name: "reference", type: "text" },
      { name: "note", type: "text" },
      { name: "created_by", type: "relation", collectionId: "users", required: true, cascadeDelete: false },
    ],
  })
  app.save(inventoryTransactions)

  // 10. discounts
  const discounts = new Collection({
    type: "base",
    name: "discounts",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: storeRule,
    deleteRule: storeRule,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: true },
      { name: "name", type: "text", required: true },
      { name: "type", type: "select", values: ["percent", "fixed"], required: true },
      { name: "value", type: "number", required: true, min: 0 },
      { name: "min_purchase", type: "number" },
      { name: "start_date", type: "date" },
      { name: "end_date", type: "date" },
      { name: "is_active", type: "bool" },
    ],
  })
  app.save(discounts)

}, (app) => {
  // Rollback: delete collections in reverse dependency order
  const collections = [
    "discounts",
    "inventory_transactions",
    "inventory",
    "order_items",
    "orders",
    "customers",
    "products",
    "categories",
    "store_members",
    "stores",
  ]

  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name)
    app.delete(collection)
  }
})
