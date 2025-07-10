package auth

import (
	"net/http"
	"strings"
	"github.com/gin-gonic/gin"
	"hi-cfo/server/internal/ginctx"
)

// Middlewae validates JWT tokens and sets user context
func (s *Service) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := extractTokenFromHeader(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing token"})
			c.Abort()
			return
		}

		claims, err := s.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}
		// Set user context using ginctx
		ginctx.SetUserContext(c, &ginctx.UserContext{
			UserID: claims.UserID,
			Email:  claims.Email,
			Role:   claims.Role,
		})
		c.Next()
	}	
}

func (s *Service) OptionalMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := extractTokenFromHeader(c)
		if err != nil {
			c.Next() // Continue without aborting if no token is provided
			return
		}

		claims, err := s.ValidateToken(tokenString)
		if err != nil {
			c.Next() // Continue without aborting if token is invalid
			return
		}

		// Set user context using ginctx
		ginctx.SetUserContext(c, &ginctx.UserContext{
			UserID: claims.UserID,
			Email:  claims.Email,
			Role:   claims.Role,
		})
		c.Next()
	}
}

func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userCtx := ginctx.GetUserContext(c)
		if userCtx == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		if userCtx.Role != requiredRole {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func extractTokenFromHeader(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", gin.Error{
			Err:  http.ErrNoCookie,
			Type: gin.ErrorTypePublic,
		}
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		return "", gin.Error{
			Err:  http.ErrNoCookie,
			Type: gin.ErrorTypePublic,
		}
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == "" {
		return "", gin.Error{
			Err:  http.ErrNoCookie,
			Type: gin.ErrorTypePublic,
		}
	}

	return tokenString, nil
}