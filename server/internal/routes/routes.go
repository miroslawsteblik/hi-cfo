package routes

import (
	"hi-cfo/server/internal/handlers"
	"hi-cfo/server/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/requestid"

	"net/http"
	"time"
	"context"
	"errors"
	"database/sql"
	"github.com/go-redis/redis/v8" 
	"runtime"
	"os"

)


func SetupRoutes(userHandler *handlers.UserHandler) *gin.Engine {
	// set based on environemnt
	if gin.Mode() == gin.ReleaseMode {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}
	router := gin.New()

	// Global middleware
	router.Use(gin.Recovery())
	router.Use(gin.Logger())
	router.Use(requestid.New())
	router.Use(gzip.Gzip(gzip.DefaultCompression))

	// CORS configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{
			"http://localhost:3000",
			"http://localhost:8088",  // Docker nginx port
			"http://localhost:80",
			"http://localhost",
			"https://localhost:3000",
			"https://localhost:8088", // Docker nginx port
			"https://localhost:80", 
			"https://localhost",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:8088",  // your Docker nginx port
			"http://127.0.0.1:80",
			"http://127.0.0.1",
			},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"},
		AllowHeaders:     []string{
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
		ExposeHeaders:  []string{"X-Request-ID","Content-Length", "Authorization"},
	}))

	// Health check endpoint

	router.GET("/health", healthCheck)
	router.HEAD("/health", healthCheck)  
	router.GET("/health/detailed", middleware.OptionalAuth(), detailedHealthCheck)

	router.GET("/ping", ping)
	router.HEAD("/ping", ping)  

	router.GET("/ready", readinessCheck)
	router.HEAD("/ready", readinessCheck)  
	
	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", userHandler.Register)
			auth.POST("/login", userHandler.Login)
			// auth.POST("/refresh", userHandler.RefreshToken)
			// auth.POST("/forgot-password", userHandler.ForgotPassword)
			// auth.POST("/reset-password", userHandler.ResetPassword)
		}

		// protected routes (no auth required)
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// user management routes
			users := protected.Group("/users")
			{
				users.GET("", userHandler.GetAllUsers) // Get all users
				users.POST("", userHandler.CreateUser) // Create a new user
				users.GET("/:id", userHandler.GetUser) // Get user by ID
				users.PUT("/:id", userHandler.UpdateUser) // Update user by ID
				users.DELETE("/:id", userHandler.DeleteUser) // Delete user by ID
			}

			//current user routes
			currentUser := protected.Group("/me")
			{
				currentUser.GET("", userHandler.GetCurrentUser) // Get current user
				currentUser.PUT("", userHandler.UpdateCurrentUser) // Update current user
				currentUser.DELETE("", userHandler.DeleteCurrentUser) // Delete current user
				currentUser.POST("/change-password", userHandler.ChangePassword) // Change current user's password
			}

			//admin routes
			admin := protected.Group("/admin")
			admin.Use(middleware.RequireRole("admin"))
			{
				// admin.GET("/users", userHandler.GetAllUsersAdmin) // Admin can get all users
				// admin.POST("/users", userHandler.CreateUserAdmin) // Admin can create a new user
				// admin.PUT("/users/:id/role", userHandler.UpdateUserAdmin) // Admin can update user by ID
				// admin.DELETE("/users/:id", userHandler.DeleteUserAdmin) // Admin can delete user
			}
		}
	}

	// Fallback for undefined routes
	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Not Found",
			"message": "The requested resource was not found",
			"path":    c.Request.URL.Path,
		})
	})

	return router
}








// Health check handler
func healthCheck(c *gin.Context) {
    if c.Request.Method == "HEAD" {
        c.Status(200)
        return
    }
    
    c.JSON(200, gin.H{
        "status": "healthy",
        "timestamp": time.Now().Format(time.RFC3339),
        "version": "1.0.0",
    })
}
// Detailed health check with comprehensive system information
func detailedHealthCheck(c *gin.Context) {
    // Get start time from a package variable set at application launch
    startTime := getApplicationStartTime()
    
    // Build detailed response
    details := gin.H{
        "status": "healthy",
        "timestamp": time.Now().UTC().Format(time.RFC3339),
        "version": "1.0.0",
        "build": os.Getenv("BUILD_ID"),
        "environment": os.Getenv("APP_ENV"),
        "uptime": time.Since(startTime).String(),
        "resources": gin.H{
            "goroutines": runtime.NumGoroutine(),
            "memory": getMemoryStats(),
        },
        "dependencies": gin.H{
            "database": checkDatabaseWithStats(),
            "redis": checkRedisWithStats(),
        },
    }
    
    c.JSON(http.StatusOK, details)
}
// Get application start time from an environment variable or a package variable
func getApplicationStartTime() time.Time {
		startTimeStr := os.Getenv("APP_START_TIME")
		if startTimeStr == "" {
				// Default to current time if not set
				return time.Now()
		}
		
		startTime, err := time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
				// If parsing fails, return current time
				return time.Now()
		}
		
		return startTime
}
func getMemoryStats() gin.H {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	
	return gin.H{
		"alloc":      memStats.Alloc,
		"totalAlloc": memStats.TotalAlloc,
		"sys":        memStats.Sys,
		"numGC":      memStats.NumGC,
	}
}
// Check database status and return detailed stats
func checkDatabaseWithStats() gin.H {
	err := checkDatabase()
	if err != nil {
		return gin.H{"status": "error", "error": err.Error()}
	}
	
	// If database is healthy, return additional stats
	return gin.H{
		"status": "ok",
		"stats": gin.H{
			"connection_count": 0, // Placeholder for actual connection count
			"last_checked": time.Now().UTC().Format(time.RFC3339),
		},
	}
}
// Check Redis status and return detailed stats
func checkRedisWithStats() gin.H {
	err := checkRedis()
	if err != nil {
		return gin.H{"status": "error", "error": err.Error()}
	}
	
	// If Redis is healthy, return additional stats
	return gin.H{
		"status": "ok",
		"stats": gin.H{
			"connection_count": 0, // Placeholder for actual connection count
			"last_checked": time.Now().UTC().Format(time.RFC3339),
		},
	}
}

// Ping endpoint
func ping(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message":   "pong",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Readiness check (checks dependencies)
func readinessCheck(c *gin.Context) {
    checks := gin.H{}
    status := http.StatusOK
    
    // Database check
    if err := checkDatabase(); err != nil {
        checks["database"] = "error: " + err.Error()
        status = http.StatusServiceUnavailable
    } else {
        checks["database"] = "ok"
    }
    
    // Redis check
    if err := checkRedis(); err != nil {
        checks["redis"] = "error: " + err.Error()
        status = http.StatusServiceUnavailable
    } else {
        checks["redis"] = "ok"
    }
    
	var readinessStatus string
	if status == http.StatusOK {
		readinessStatus = "ready"
	} else {
		readinessStatus = "not ready"
	}
	c.JSON(status, gin.H{
		"status": readinessStatus,
		"checks": checks,
	})
}



var db *sql.DB 

func SetDB(database *sql.DB) {
	db = database
}

func checkDatabase() error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	
	// Use ctx with your database operations
	if db == nil {
		return errors.New("database not initialized")
	}
	return db.PingContext(ctx)
}



var redisClient *redis.Client
var redisFailures int
var redisLastCheck time.Time

func SetRedisClient(client *redis.Client) {
	redisClient = client
}

func checkRedis() error {
	// If too many recent failures, skip actual check
	if redisFailures > 3 && time.Since(redisLastCheck) < 30*time.Second {
		return errors.New("circuit open: too many recent failures")
	}
	
	redisLastCheck = time.Now()
	if redisClient == nil {
		return errors.New("redis client not initialized")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	err := redisClient.Ping(ctx).Err()
	
	if err != nil {
		redisFailures++
	} else {
		redisFailures = 0
	}
	
	return err
}