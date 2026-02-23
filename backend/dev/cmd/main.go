package main

import (
	"log"
	"zkcnt-pos-api/internal/auth"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		g := e.Router.Group("/api/v1")

		auth.RegisterRoutes(app, g.Group("/auth"))
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
