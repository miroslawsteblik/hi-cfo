package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"
	"github.com/google/uuid"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"hi-cfo/server/internal/config"
	"hi-cfo/server/internal/users"
)

// Claims represents the JWT claims
type Claims struct {
    UserID    string `json:"user_id"`  // Change from uint to string
    Email     string `json:"email"`
    Role      string `json:"role,omitempty"`
    TokenType string `json:"token_type"`
    jwt.RegisteredClaims
}

// AuthMiddleware validates JWT tokens and sets user context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check if header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token is required"})
			c.Abort()
			return
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			// Make sure the signing method is what we expect
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(config.GetJWTSecret()), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(*Claims)
		if !ok || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}



// RequireRoles middleware checks if user has one of the required roles
func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		if role.(string) != requiredRole {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth middleware for endpoints that can work with or without auth
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No auth header, continue without setting user info
			c.Next()
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			// Invalid format, continue without setting user info
			c.Next()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			// No token, continue without setting user info
			c.Next()
			return
		}

		// Try to parse token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(config.GetJWTSecret()), nil
		})

		if err != nil {
			// Invalid token, continue without setting user info
			c.Next()
			return
		}

		claims, ok := token.Claims.(*Claims)
		if !ok || !token.Valid {
			// Invalid claims, continue without setting user info
			c.Next()
			return
		}

		// Set user information in context
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// GetCurrentUser helper function to get current user from context
func GetCurrentUser(c *gin.Context) *users.User {
	userID, exists := c.Get("user_id")
	if !exists {
		return nil
	}

	userEmail, _ := c.Get("user_email")
	// userRole, _ := c.Get("user_role")

	uuid, ok := userID.(uuid.UUID) // or uuid.UUID if that's your type
	if !ok {
		return nil
	}
	return &users.User{
		ID:    uuid,
		Email: userEmail.(string),
		// Role:  userRole.(string),
	}
}

// RateLimitMiddleware for API rate limiting
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// This would integrate with a rate limiting library like
		// github.com/ulule/limiter/v3 or implement custom logic
		
		// For now, just continue
		c.Next()
	}
}

// RequestIDMiddleware adds request ID to context (if not using gin-contrib/requestid)
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// generateRequestID generates a simple request ID
func generateRequestID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}