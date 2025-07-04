package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
    "time"
)

func SetupCORS() gin.HandlerFunc {
    return cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:3000"},
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Content-Type", "Authorization"},
        AllowCredentials: true,
        MaxAge:           12 * time.Hour,
    })
}

// Or custom CORS middleware - if you need more control or specific headers
func CustomCORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        c.Header("Access-Control-Allow-Credentials", "true")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}