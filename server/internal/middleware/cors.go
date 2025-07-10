package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

)

func CORSMiddleware() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
			"http://localhost:8088", // Docker nginx port
			"http://localhost:80",
			"http://localhost",
			"https://localhost:3000",
			"https://localhost:8088", // Docker nginx port
			"https://localhost:80",
			"https://localhost",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:8088", // your Docker nginx port
			"http://127.0.0.1:80",
			"http://127.0.0.1",
		},
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