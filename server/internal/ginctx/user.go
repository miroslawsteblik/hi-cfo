
// internal/ginctx/user.go
// This package ONLY handles storing/retrieving simple data from Gin context
// It doesn't know about User models or business logic
package ginctx

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	userContextKey = "user_context"
)

// UserContext is a simple struct that holds basic user info from JWT
// This is NOT your domain User model - it's just context data
type UserContext struct {
	UserID string
	Email  string
	Role   string
}

// SetUserContext stores user info in Gin context (called by auth middleware)
func SetUserContext(c *gin.Context, userCtx *UserContext) {
	c.Set(userContextKey, userCtx)
}

// GetUserContext retrieves user info from Gin context
func GetUserContext(c *gin.Context) *UserContext {
	if userCtx, exists := c.Get(userContextKey); exists {
		if ctx, ok := userCtx.(*UserContext); ok {
			return ctx
		}
	}
	return nil
}

// GetUserID is a convenience function to get just the user ID
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	userCtx := GetUserContext(c)
	if userCtx == nil {
		return uuid.UUID{}, false
	}

	userID, err := uuid.Parse(userCtx.UserID)
	if err != nil {
		return uuid.UUID{}, false
	}

	return userID, true
}

// IsAuthenticated checks if there's user info in context
func IsAuthenticated(c *gin.Context) bool {
	return GetUserContext(c) != nil
}