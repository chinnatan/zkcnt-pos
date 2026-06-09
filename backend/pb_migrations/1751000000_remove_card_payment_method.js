/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const cardOrders = app.findRecordsByFilter("orders", 'payment_method = "card"', "", 0, 0)
  for (const order of cardOrders) {
    order.set("payment_method", "qr")
    app.save(order)
  }

  const orders = app.findCollectionByNameOrId("orders")
  const field = orders.fields.getByName("payment_method")
  field.values = ["cash", "qr"]
  app.save(orders)
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders")
  const field = orders.fields.getByName("payment_method")
  field.values = ["cash", "qr", "card"]
  app.save(orders)
})
