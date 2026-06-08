/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const storeMemberSelfRule =
    '@request.auth.id != "" && user = @request.auth.id'

  const storeMemberOwnerRule =
    '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && @collection.store_members.role ?= "owner"'

  const storeListViewUpdateRule =
    '@request.auth.id != "" && (owner = @request.auth.id || (@collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= id))'

  const storeDeleteRule =
    storeListViewUpdateRule + ' && @collection.store_members.role ?= "owner"'

  const storeMembers = app.findCollectionByNameOrId("store_members")
  storeMembers.listRule = storeMemberSelfRule
  storeMembers.viewRule = storeMemberSelfRule
  storeMembers.updateRule = storeMemberOwnerRule
  storeMembers.deleteRule = storeMemberOwnerRule
  app.save(storeMembers)

  const stores = app.findCollectionByNameOrId("stores")
  stores.listRule = storeListViewUpdateRule
  stores.viewRule = storeListViewUpdateRule
  stores.updateRule = storeListViewUpdateRule
  stores.deleteRule = storeDeleteRule
  app.save(stores)

  const allStores = app.findRecordsByFilter("stores", "id != ''", "", 0, 0)
  const membersCollection = app.findCollectionByNameOrId("store_members")

  for (const store of allStores) {
    const ownerId = store.get("owner")
    if (!ownerId) continue

    const existing = app.findRecordsByFilter(
      "store_members",
      `store = "${store.id}" && user = "${ownerId}"`,
      "",
      1,
      0
    )
    if (existing.length > 0) continue

    const member = new Record(membersCollection, {
      store: store.id,
      user: ownerId,
      role: "owner",
      is_active: true,
    })
    app.save(member)
  }
}, (app) => {
  const storeMemberRule =
    '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store'

  const storeMemberOwnerRule =
    storeMemberRule + ' && @collection.store_members.role ?= "owner"'

  const storeListViewUpdateRule =
    '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= id'

  const storeDeleteRule =
    storeListViewUpdateRule + ' && @collection.store_members.role ?= "owner"'

  const storeMembers = app.findCollectionByNameOrId("store_members")
  storeMembers.listRule = storeMemberRule
  storeMembers.viewRule = storeMemberRule
  storeMembers.updateRule = storeMemberOwnerRule
  storeMembers.deleteRule = storeMemberOwnerRule
  app.save(storeMembers)

  const stores = app.findCollectionByNameOrId("stores")
  stores.listRule = storeListViewUpdateRule
  stores.viewRule = storeListViewUpdateRule
  stores.updateRule = storeListViewUpdateRule
  stores.deleteRule = storeDeleteRule
  app.save(stores)
})
