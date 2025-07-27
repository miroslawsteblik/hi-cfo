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

// LogoutHandler handles logout by blacklisting the JWT tokens
func (s *Service) LogoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract access token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Authorization header required"})
			return
		}

		// Remove "Bearer " prefix
		var accessToken string
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			accessToken = authHeader[7:]
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid authorization header format"})
			return
		}

		// Get refresh token from request body (optional)
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		c.ShouldBindJSON(&req)

		// Blacklist the tokens
		err := s.LogoutUser(accessToken, req.RefreshToken)
		if err != nil {
			// Log the error but still return success to avoid breaking client flow
			// In production, you might want to log this to monitoring system
			c.JSON(http.StatusOK, gin.H{
				"message": "Logged out successfully",
				"warning": "Some cleanup operations failed",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}
