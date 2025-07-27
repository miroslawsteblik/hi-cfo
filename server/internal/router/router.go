package router

import (
	"context"
	"errors"
	"net/http"
	"os"
	"time"

	"hi-cfo/server/internal/config"
	"hi-cfo/server/internal/shared/auth"
	"hi-cfo/server/internal/shared/middleware"

	"hi-cfo/server/internal/domains/account"
	"hi-cfo/server/internal/domains/category"
	"hi-cfo/server/internal/domains/dashboard"
	"hi-cfo/server/internal/domains/transaction"
	"hi-cfo/server/internal/domains/user"
	customerrors "hi-cfo/server/internal/shared/errors"

	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	// Swagger imports
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

type Dependencies struct {
	UserHandler        *user.UserHandler
	DashboardHandler   *dashboard.DashboardHandler
	TransactionHandler *transaction.TransactionHandler
	AccountHandler     *account.AccountHandler
	CategoryHandler    *category.CategoryHandler
	AuthService        *auth.Service
	DB                 *gorm.DB
	RedisClient        *redis.Client
	Logger             *logrus.Logger
}

func LoggerMiddleware(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		duration := time.Since(start)

		logger.WithFields(logrus.Fields{
			"method":      c.Request.Method,
			"path":        path,
			"status_code": c.Writer.Status(),
			"duration_ms": duration.Milliseconds(),
			"ip":          c.ClientIP(),
			"user_agent":  c.Request.UserAgent(),
			"request_id":  c.GetString("request_id"),
		}).Info("HTTP request completed")
	}
}

func SetupRoutes(deps *Dependencies) *gin.Engine {
	// set based on environemnt
	if gin.Mode() == gin.ReleaseMode {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.New()

	config.SetupTrustedProxies(router)

	// Global middleware
	router.Use(gin.Recovery())
	router.Use(gin.Logger())
	router.Use(requestid.New())
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(LoggerMiddleware(deps.Logger))
	router.Use(customerrors.ErrorHandler(deps.Logger))

	// Security middleware
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.RequestSizeLimit(10 * 1024 * 1024)) // 10MB limit
	router.Use(middleware.GlobalRateLimit(100, 200))          // 100 req/sec, burst 200
	router.Use(middleware.CORSMiddleware())

	setupHealthRoutes(router)
	setupSwaggerRoutes(router)
	setupAPIRoutes(router, deps)

	// Fallback for undefined routes
	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Not Found",
			"message": "The requested route was not found",
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

func setupSwaggerRoutes(router *gin.Engine) {
	// Swagger documentation route
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Redirect /docs to /swagger for convenience
	router.GET("/docs", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})

	// Also serve at /api-docs for alternative access
	router.GET("/api-docs", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
}

func setupAPIRoutes(router *gin.Engine, deps *Dependencies) {
	v1 := router.Group("/api/v1")

	setupAuthRoutes(v1, deps)
	setupProtectedRoutes(v1, deps)
}

func setupAuthRoutes(v1 *gin.RouterGroup, deps *Dependencies) {
	auth := v1.Group("/auth")
	// Apply stricter rate limiting to auth endpoints
	auth.Use(middleware.AuthRateLimit())
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
		setupDashboardRoutes(protected, deps)
		setupTransactionRoutes(protected, deps)
		setupAccountRoutes(protected, deps)
		setupCategoryRoutes(protected, deps)
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

func setupDashboardRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	dashboard := protected.Group("/dashboard")
	{
		dashboard.GET("/overview", deps.DashboardHandler.GetOverview)
		dashboard.GET("/stats", deps.DashboardHandler.GetStats)
		dashboard.GET("/reports", deps.DashboardHandler.GetReports)
	}
}

func setupTransactionRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	transactionRoutes := protected.Group("/transactions")
	{
		transactionRoutes.GET("", deps.TransactionHandler.GetTransactions)               // Get all transactions
		transactionRoutes.POST("", deps.TransactionHandler.CreateTransaction)            // Create a new transaction
		transactionRoutes.GET("/stats", deps.TransactionHandler.GetTransactionStats)     // Get transaction stats
		transactionRoutes.GET("/:id", deps.TransactionHandler.GetTransactionByID)        // Get transaction by ID
		transactionRoutes.PUT("/:id", deps.TransactionHandler.UpdateTransaction)         // Update transaction by ID
		transactionRoutes.DELETE("/:id", deps.TransactionHandler.DeleteTransaction)      // Delete transaction by ID
		transactionRoutes.POST("/bulk", deps.TransactionHandler.CreateBatchTransactions) // Bulk upload transactions

		transactionRoutes.POST("/categorization/preview", deps.TransactionHandler.PreviewCategorization)
		transactionRoutes.POST("/categorization/analyze", deps.TransactionHandler.AnalyzeTransactionCategorization)

		transactionRoutes.GET("/categorization/settings", deps.TransactionHandler.GetCategorizationSettings)
		transactionRoutes.PUT("/categorization/settings", deps.TransactionHandler.UpdateCategorizationSettings)

	}
}

func setupAccountRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	accounts := protected.Group("/accounts")
	{
		accounts.GET("", deps.AccountHandler.GetAccounts)               // Get all accounts
		accounts.POST("", deps.AccountHandler.CreateAccount)            // Create a new account
		accounts.GET("/summary", deps.AccountHandler.GetAccountSummary) // Get account summary
		accounts.GET("/:id", deps.AccountHandler.GetAccountByID)        // Get account by ID
		accounts.PUT("/:id", deps.AccountHandler.UpdateAccount)         // Update account by ID
		accounts.DELETE("/:id", deps.AccountHandler.DeleteAccount)      // Delete account by ID
	}
}

func setupCategoryRoutes(protected *gin.RouterGroup, deps *Dependencies) {
	categories := protected.Group("/categories")
	{
		categories.GET("", deps.CategoryHandler.GetCategories)              // Get all categories
		categories.POST("", deps.CategoryHandler.CreateCategory)            // Create a new category
		categories.GET("/simple", deps.CategoryHandler.GetCategoriesSimple) // Get simple categories
		categories.GET("/:id", deps.CategoryHandler.GetCategoryByID)        // Get category by ID
		categories.PUT("/:id", deps.CategoryHandler.UpdateCategory)         // Update category by ID
		categories.DELETE("/:id", deps.CategoryHandler.DeleteCategory)      // Delete category by ID
		categories.POST("/auto-categorize", deps.CategoryHandler.AutoCategorize)

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
	if redisClient == nil {
		return errors.New("redis client not initialized")
	}
	// Circuit breaker pattern for Redis
	if redisFailures > 3 && time.Since(redisLastCheck) < 30*time.Second {
		return errors.New("circuit open: too many recent failures")
	}

	redisLastCheck = time.Now()

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
