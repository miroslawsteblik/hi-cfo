package router

import (
	"hi-cfo/server/internal/auth"
	"hi-cfo/server/internal/middleware"
	"hi-cfo/server/internal/users"

	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"

	"context"
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
	"gorm.io/gorm"
)

type Dependencies struct {
	UserHandler users.UserHandler
	AuthService *auth.Service
	DB          *gorm.DB
	RedisClient *redis.Client
}



func SetupRoutes(deps *Dependencies) *gin.Engine {
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
	router.Use(middleware.CORSMiddleware())

	setupHealthRoutes(router)
	setupAPIRoutes(router, deps)

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


func setupHealthRoutes(router *gin.Engine) {
	router.GET("/health", healthCheck)
	router.HEAD("/health", healthCheck)
	router.GET("/ping", ping)
	router.HEAD("/ping", ping)
	router.GET("/ready", readinessCheck)
	router.HEAD("/ready", readinessCheck)
	// router.GET("/health/detailed", middleware.OptionalAuth(), detailedHealthCheck)
}

func setupAPIRoutes(router *gin.Engine, deps *Dependencies) {
	v1 := router.Group("/api/v1")

	setupAuthRoutes(v1, deps)
	setupProtectedRoutes(v1, deps)
}

func setupAuthRoutes(v1 *gin.RouterGroup, deps *Dependencies) {
	auth := v1.Group("/auth")
	{
		auth.POST("/register", deps.UserHandler.RegisterUser)
		auth.POST("/login", deps.UserHandler.LoginUser)
		auth.POST("/logout", deps.AuthService.LogoutHandler())
		auth.POST("/refresh", deps.AuthService.RefreshTokenHandler())
	}
}

func setupProtectedRoutes(v1 *gin.RouterGroup, deps *Dependencies) {
	// Protected routes group with auth middleware
	protected := v1.Group("/")
	protected.Use(deps.AuthService.Middleware())
	{
		setupUserManagementRoutes(protected, deps)
		setupCurrentUserRoutes(protected, deps)
		setupAdminRoutes(protected, deps)
	}
}

func setupUserManagementRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	users := protected.Group("/users")
	{
		users.GET("", deps.UserHandler.GetAllUsers)       // Get all users
		users.POST("", deps.UserHandler.CreateUser)       // Create a new user
		users.GET("/:id", deps.UserHandler.GetUser)       // Get user by ID
		users.PUT("/:id", deps.UserHandler.UpdateUser)    // Update user by ID
		users.DELETE("/:id", deps.UserHandler.DeleteUser) // Delete user by ID
	}
}

// setupCurrentUserRoutes configures current user profile routes
func setupCurrentUserRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	me := protected.Group("/me")
	{
		me.GET("", deps.UserHandler.GetCurrentUser)                  // Get current user
		me.PUT("", deps.UserHandler.UpdateCurrentUser)               // Update current user
		me.DELETE("", deps.UserHandler.DeleteCurrentUser)            // Delete current user
		me.POST("/change-password", deps.UserHandler.ChangePassword) // Change password
	}
}

func setupAdminRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	admin := protected.Group("/admin")
	admin.Use(auth.RequireRole("admin"))
	{
		// Future admin routes can be added here
		// admin.GET("/analytics", getAnalytics)
		// admin.POST("/bulk-operations", bulkOperations)
		// admin.GET("/system-logs", getSystemLogs)
	}
}



// Health check handlers
func healthCheck(c *gin.Context) {
	if c.Request.Method == "HEAD" {
		c.Status(http.StatusOK)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   getVersion(),
		"service":   "hi-cfo-api",
	})
}

func ping(c *gin.Context) {
	if c.Request.Method == "HEAD" {
		c.Status(http.StatusOK)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "pong",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func readinessCheck(c *gin.Context) {
	checks := gin.H{}
	status := http.StatusOK

	// Database check
	if err := checkDatabase(); err != nil {
		checks["database"] = gin.H{
			"status": "error",
			"error":  err.Error(),
		}
		status = http.StatusServiceUnavailable
	} else {
		checks["database"] = gin.H{"status": "ok"}
	}

	// Redis check
	if err := checkRedis(); err != nil {
		checks["redis"] = gin.H{
			"status": "error",
			"error":  err.Error(),
		}
		status = http.StatusServiceUnavailable
	} else {
		checks["redis"] = gin.H{"status": "ok"}
	}

	readinessStatus := "ready"
	if status != http.StatusOK {
		readinessStatus = "not ready"
	}

	c.JSON(status, gin.H{
		"status":    readinessStatus,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"checks":    checks,
	})
}

// getVersion returns the application version
func getVersion() string {
	if version := os.Getenv("APP_VERSION"); version != "" {
		return version
	}
	return "1.0.0"
}

// Database and Redis health check functions
var db *gorm.DB
var redisClient *redis.Client
var redisFailures int
var redisLastCheck time.Time

func SetDB(database *gorm.DB) {
	db = database
}

func SetRedisClient(client *redis.Client) {
	redisClient = client
}

func checkDatabase() error {
	if db == nil {
		return errors.New("database not initialized")
	}

	sqlDB, err := db.DB()
	if err != nil {
		return errors.New("failed to get database instance")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return sqlDB.PingContext(ctx)
}

func checkRedis() error {
	// Circuit breaker pattern for Redis
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







