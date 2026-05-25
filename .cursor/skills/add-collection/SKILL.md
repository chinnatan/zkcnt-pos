---
name: add-collection
description: >-
  Add a new PocketBase collection to the POS system. Use when creating a new
  data entity/collection, adding a new database table, or extending the schema.
---

# Add New PocketBase Collection

Follow these steps when adding a new collection to the POS system. Every step is required.

## Step 1: Create PocketBase Migration

Create a new migration file in `backend/pb_migrations/` with the next timestamp.

```javascript
// backend/pb_migrations/{timestamp}_{collection_name}.js
migrate((app) => {
  const storeRule = '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store'

  const collection = new Collection({
    type: "base",
    name: "your_collection",
    listRule: storeRule,
    viewRule: storeRule,
    createRule: storeRule,
    updateRule: storeRule,
    deleteRule: storeRule,
    fields: [
      { name: "store", type: "relation", collectionId: "stores", required: true, cascadeDelete: true },
      // Add your fields here
    ],
  })
  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("your_collection")
  app.delete(collection)
})
```

## Step 2: Add TypeScript Interface

Add a new interface to `frontend/app/lib/types/index.ts`:

```typescript
export interface YourCollection extends BaseRecord {
  store: string;
  // Add your fields here
}
```

## Step 3: Add Dexie Table

Update `frontend/app/lib/db.ts`:

1. Add `import type { YourCollection }` to imports
2. Add `yourCollection!: Table<YourCollection>;` to the class
3. Add index definition in `this.version(N).stores({})` — bump version number
4. Include `store` and `[store+field]` compound indexes

## Step 4: Register in Sync Engine

Update `frontend/app/lib/sync/engine.ts`:

1. Add the collection name to `pullAll()` collections array
2. Add to `subscribeAll()` collections array
3. Add to `getTable()` map: `your_collection: db.yourCollection`

## Step 5: Create Composable

Create `frontend/app/composables/useYourCollection.ts` following the pattern:

1. Import `db` and `addToSyncQueue`
2. Create `fetch`, `create`, `update`, `delete` functions
3. Each function checks `isOnline` and falls back to Dexie
4. All mutations add to syncQueue when offline
5. Always scope queries by `activeStoreId`

## Step 6: Create Page (optional)

Create `frontend/app/pages/your-collection/index.vue` with:
- Table/list view with search
- Add/Edit modal
- Delete confirmation
- Call `fetch` on mount
