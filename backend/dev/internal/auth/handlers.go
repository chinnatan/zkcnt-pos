package auth

import (
	"net/http"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type AuthHandler struct {
	app *pocketbase.PocketBase
}

// NewAuthHandler สร้าง instance ของ handler เพื่อใช้ app ร่วมกัน
func NewAuthHandler(app *pocketbase.PocketBase) *AuthHandler {
	return &AuthHandler{app: app}
}

// Login จะทำการลงชื่อเข้าใช้งาน
func (h *AuthHandler) Login(ctx *core.RequestEvent) error {
	return ctx.String(http.StatusOK, "Login success")
}

// SignUp จะทำการสมัครสมาชิก
func (h *AuthHandler) SignUp(ctx *core.RequestEvent) error {
	return ctx.String(http.StatusOK, "Sign up success")
}
