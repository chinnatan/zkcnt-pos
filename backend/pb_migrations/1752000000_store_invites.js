/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const stores = app.findCollectionByNameOrId("stores")
  const storesId = stores.id

  const storeManagerRule =
    '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && (@collection.store_members.role ?= "owner" || @collection.store_members.role ?= "manager")'

  const storeInvites = new Collection({
    type: "base",
    name: "store_invites",
    listRule: storeManagerRule,
    viewRule: storeManagerRule,
    createRule: storeManagerRule,
    updateRule: storeManagerRule,
    deleteRule: storeManagerRule,
    fields: [
      { name: "store", type: "relation", collectionId: storesId, required: true, cascadeDelete: true },
      { name: "email", type: "email", required: true },
      { name: "role", type: "select", values: ["manager", "cashier"], required: true },
      { name: "token", type: "text", required: true },
      { name: "status", type: "select", values: ["pending", "accepted", "expired", "cancelled"], required: true },
      { name: "invited_by", type: "relation", collectionId: "_pb_users_auth_", required: true, cascadeDelete: false },
      { name: "expires", type: "date", required: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_store_invites_token ON store_invites (token)",
      "CREATE INDEX idx_store_invites_store_email ON store_invites (store, email)",
    ],
  })
  app.save(storeInvites)

  const storeMemberListViewRule =
    '@request.auth.id != "" && (user = @request.auth.id || (@collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && (@collection.store_members.role ?= "owner" || @collection.store_members.role ?= "manager")))'

  const storeMemberCreateRule =
    '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && (@collection.store_members.role ?= "owner" || @collection.store_members.role ?= "manager")'

  const storeMemberOwnerRule =
    '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && @collection.store_members.role ?= "owner"'

  const storeMembers = app.findCollectionByNameOrId("store_members")
  storeMembers.listRule = storeMemberListViewRule
  storeMembers.viewRule = storeMemberListViewRule
  storeMembers.createRule = storeMemberCreateRule
  storeMembers.updateRule = storeMemberOwnerRule
  storeMembers.deleteRule = storeMemberOwnerRule
  app.save(storeMembers)
}, (app) => {
  const storeMemberSelfRule =
    '@request.auth.id != "" && user = @request.auth.id'

  const storeMemberOwnerRule =
    '@request.auth.id != "" && @collection.store_members.user ?= @request.auth.id && @collection.store_members.store ?= store && @collection.store_members.role ?= "owner"'

  const storeMembers = app.findCollectionByNameOrId("store_members")
  storeMembers.listRule = storeMemberSelfRule
  storeMembers.viewRule = storeMemberSelfRule
  storeMembers.updateRule = storeMemberOwnerRule
  storeMembers.deleteRule = storeMemberOwnerRule
  app.save(storeMembers)

  const storeInvites = app.findCollectionByNameOrId("store_invites")
  app.delete(storeInvites)
})
