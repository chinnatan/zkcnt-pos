---
name: add-page
description: >-
  Add a new page and composable to the POS system. Use when creating a new
  feature page, adding a new route, or building a new UI section.
---

# Add New Page to POS System

Follow these steps to add a new page with the standard POS patterns.

## Step 1: Create the Page File

Create `frontend/app/pages/{feature}/index.vue` (or `{feature}.vue` for single pages):

```vue
<template>
  <div class="space-y-4">
    <!-- Header with title and action button -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Feature Name</h2>
      <button class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
        Add New
      </button>
    </div>

    <!-- Content: table or grid -->
    <div class="rounded-xl bg-white shadow-sm">
      <!-- Loading / Empty / Data states -->
    </div>

    <!-- Modal for create/edit -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <!-- Modal content -->
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

// Use composables
// Fetch data on mount
onMounted(() => {
  // fetchData();
});
</script>
```

## Step 2: Page Requirements

Every page MUST:
1. Use `definePageMeta({ middleware: "auth" })` for authenticated pages
2. Use the `default` layout (automatic) or specify `definePageMeta({ layout: "pos" })` for POS terminal
3. Handle loading state with spinner: `<div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />`
4. Handle empty state with message
5. Use Tailwind CSS utility classes exclusively (no custom CSS)
6. Format currency with `฿` prefix and Thai locale

## Step 3: Add Navigation Link

Add a menu item to `frontend/app/components/layout/Sidebar.vue` in the `menuItems` array:

```typescript
{
  to: "/your-feature",
  label: "Feature Name",
  icon: '<svg ...>...</svg>',
}
```

## Step 4: Create Composable (if needed)

If the page needs data management, create `frontend/app/composables/useFeature.ts` following the offline-first pattern:
1. Check `isOnline` from `useOnlineStatus()`
2. Online: PocketBase SDK → cache in Dexie
3. Offline/error: read from Dexie
4. Mutations: online → PB first, offline → Dexie + syncQueue
5. Always scope by `activeStoreId` from `useStore()`
