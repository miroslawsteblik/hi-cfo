package middleware

import (
	"os"
	"strings"
	"time"

	"hi-cfo/api/internal/logger"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowOrigins: getAllowedOrigins(),
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Requested-With",
			"X-Request-ID",
			"X-Real-IP",
			"X-Forwarded-For",
			"X-Forwarded-Proto",
			"X-Forwarded-Host",
			"X-Forwarded-Port",
			"Cache-Control",
			"Pragma",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
		ExposeHeaders:    []string{"X-Request-ID", "Content-Length", "Authorization"},
	})
}

// getAllowedOrigins returns environment-specific allowed origins
func getAllowedOrigins() []string {
	env := os.Getenv("APP_ENV")

	switch env {
	case "production":
		// In production, only allow configured origins
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			// Critical security: Production MUST have ALLOWED_ORIGINS configured
			logger.Fatal("ALLOWED_ORIGINS environment variable is required in production environment")
		}

		// Parse and validate origins
		origins := strings.Split(allowedOrigins, ",")
		var validOrigins []string
		for _, origin := range origins {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				// Basic validation: must start with https:// in production
				if !strings.HasPrefix(origin, "https://") {
					logger.WithField("origin", origin).Fatal("Production CORS origin must use HTTPS")
				}
				validOrigins = append(validOrigins, origin)
			}
		}

		if len(validOrigins) == 0 {
			logger.Fatal("No valid origins found in ALLOWED_ORIGINS")
		}

		logger.WithField("origins", validOrigins).Info("Production CORS configured")
		return validOrigins

	case "staging":
		// Staging environment with controlled origins
		return []string{
			"https://staging.yourapp.com",
			"https://preview.yourapp.com",
		}

	default:
		// Development environment - allow localhost
		return []string{
			"http://localhost:3000",
			"http://localhost:8088",
			"http://localhost:80",
			"http://localhost",
			"https://localhost:3000",
			"https://localhost:8088",
			"https://localhost:80",
			"https://localhost",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:8088",
			"http://127.0.0.1:80",
			"http://127.0.0.1",
		}
	}
}
