package middlewares

import (
	"net/http"
	"example.com/blog_backend/utils"
	"github.com/gin-gonic/gin"
)

func Authenticate(context *gin.Context) {

	token := context.Request.Header.Get("Authorization")

	if token == "" {
		context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	userId, role, err := utils.VerifyJWTToken(token)
	
	if err != nil {
		context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	context.Set("userId", userId)
	context.Set("role", role)
	context.Next()
}

// RequireAdmin ensures that the authenticated user has the "admin" role.
// It assumes the Authenticate middleware has already run and populated the
// "role" value in the Gin context.
func RequireAdmin(context *gin.Context) {
	roleValue, exists := context.Get("role")
	if !exists {
		context.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Admin access required"})
		return
	}
	role, ok := roleValue.(string)
	if !ok || role != "admin" {
		context.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Admin access required"})
		return
	}

	context.Next()
}

// RequireEditorOrAdmin ensures that the authenticated user has either the
// "editor" or "admin" role. It assumes the Authenticate middleware has
// already run and populated the "role" value in the Gin context.
func RequireEditorOrAdmin(context *gin.Context) {
	roleValue, exists := context.Get("role")
	if !exists {
		context.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Editor or admin access required"})
		return
	}
	role, ok := roleValue.(string)
	if !ok || (role != "admin" && role != "editor") {
		context.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Editor or admin access required"})
		return
	}

	context.Next()
}