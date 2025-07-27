package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter stores rate limiter instances
type RateLimiter struct {
	limiter *rate.Limiter
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(requestsPerSecond int, burstSize int) *RateLimiter {
	return &RateLimiter{
		limiter: rate.NewLimiter(rate.Limit(requestsPerSecond), burstSize),
	}
}

// GlobalRateLimit applies global rate limiting
func GlobalRateLimit(requestsPerSecond, burstSize int) gin.HandlerFunc {
	limiter := NewRateLimiter(requestsPerSecond, burstSize)

	return func(c *gin.Context) {
		if !limiter.limiter.Allow() {
			c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerSecond))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("Retry-After", "1")

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"code":  "RATE_LIMIT_EXCEEDED",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// AuthRateLimit applies stricter rate limiting for authentication endpoints
func AuthRateLimit() gin.HandlerFunc {
	// Stricter limits for auth endpoints: 5 requests per minute
	limiter := rate.NewLimiter(rate.Every(12*time.Second), 5)

	return func(c *gin.Context) {
		if !limiter.Allow() {
			c.Header("X-RateLimit-Limit", "5")
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("Retry-After", "60")

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many authentication attempts. Please try again later.",
				"code":  "AUTH_RATE_LIMIT_EXCEEDED",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// IPBasedRateLimit implements per-IP rate limiting (simplified version)
func IPBasedRateLimit(requestsPerMinute int) gin.HandlerFunc {
	// In production, you would use Redis or another distributed store
	// This is a simple in-memory implementation
	clients := make(map[string]*rate.Limiter)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		// Get or create limiter for this IP
		limiter, exists := clients[clientIP]
		if !exists {
			limiter = rate.NewLimiter(rate.Every(time.Minute/time.Duration(requestsPerMinute)), requestsPerMinute)
			clients[clientIP] = limiter
		}

		if !limiter.Allow() {
			c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerMinute))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("Retry-After", "60")

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded for your IP address",
				"code":  "IP_RATE_LIMIT_EXCEEDED",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
