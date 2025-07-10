// internal/auth/handlers.go (NEW - auth-specific HTTP handlers)
package auth

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

// RefreshTokenHandler handles token refresh requests
func (s *Service) RefreshTokenHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		tokenPair, err := s.RefreshToken(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
			return
		}

		c.JSON(http.StatusOK, tokenPair)
	}
}

// LogoutHandler handles logout (for stateless JWT, this is mainly a client-side operation)
func (s *Service) LogoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// For stateless JWT, logout is handled client-side by deleting the token
		// Could implement token blacklisting here if needed
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}