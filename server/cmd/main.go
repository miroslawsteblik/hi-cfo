// Package main HiCFO API Server
//
// This is the main package for the HiCFO financial management API server.
// It provides comprehensive financial tracking, categorization, and analytics.
//
// Terms Of Service: http://swagger.io/terms/
//
// Schemes: http, https
// Host: localhost:8080
// BasePath: /api/v1
// Version: 1.0.0
//
// Consumes:
// - application/json
//
// Produces:
// - application/json
//
// Security:
// - BearerAuth: []
//
// SecurityDefinitions:
// BearerAuth:
//
//	type: apiKey
//	name: Authorization
//	in: header
//	description: "Enter 'Bearer {token}'"
//
// @title HiCFO API
// @description Financial management API for tracking transactions, categories, and accounts
// @version 1.0.0
// @host localhost:8080
// @basePath /api/v1
// @schemes http https
//
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter 'Bearer {token}'
//
// @contact.name HiCFO Support
// @contact.url https://github.com/miroslawsteblik/hi-cfo
// @contact.email support@hicfo.com
//
// @license.name MIT
// @license.url https://opensource.org/licenses/MIT
//
// @tag.name Authentication
// @tag.description User authentication endpoints
//
// @tag.name Users
// @tag.description User management operations
//
// @tag.name Accounts
// @tag.description Bank account management
//
// @tag.name Categories
// @tag.description Transaction category management
//
// @tag.name Transactions
// @tag.description Transaction tracking and management
//
// @tag.name Dashboard
// @tag.description Dashboard analytics and statistics
package main

import (
	"os"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/sirupsen/logrus"

	"hi-cfo/server/internal/logger"
	"hi-cfo/server/internal/router"
	"hi-cfo/server/internal/shared/auth"

	"hi-cfo/server/internal/config"
	"hi-cfo/server/internal/infrastructure/cache"
	"hi-cfo/server/internal/infrastructure/database"

	"hi-cfo/server/internal/domains/account"
	"hi-cfo/server/internal/domains/category"
	"hi-cfo/server/internal/domains/transaction"
	"hi-cfo/server/internal/domains/user"

	// Import swagger docs to register them
	_ "hi-cfo/server/docs"
)

func main() {
	appLogger := logger.InitLogger(os.Getenv("ENV"))
	os.Setenv("APP_START_TIME", time.Now().UTC().Format(time.RFC3339))

	// // Load configuration
	if err := config.LoadConfig(); err != nil {
		logger.Fatal("Failed to load configuration:", err)
	}

	// Database connection
	db, err := database.InitializeDatabase()
	if err != nil {
		logger.Fatal("Failed to connect to database:", err)
	}
	// Redis connection
	redisClient, err := cache.InitializeRedis()
	if err != nil {
		logger.Fatal("Failed to connect to Redis:", err)
		redisClient = nil // Set to nil if Redis is not available
	} else {
		logger.Info("Connected to Redis successfully")
	}

	router.SetDB(db)
	router.SetRedisClient(redisClient)

	deps := setupDependencies(db, redisClient, appLogger)

	r := router.SetupRoutes(deps)

	// Start server
	port := config.GetPort()
	logger.Infof("Starting server on port %s", port)
	logger.Infof("Health check available at: http://localhost:%s/health", port)
	logger.Infof("API documentation available at: http://localhost:%s/swagger/index.html", port)

	if err := r.Run("0.0.0.0:" + port); err != nil {
		logger.Fatal("Failed to start server:", err)
	}
}

func setupDependencies(db *database.DB, redisClient *redis.Client, appLogger *logrus.Logger) *router.Dependencies {
	// Auth service with Redis for token blacklisting
	authService := auth.NewService(redisClient)

	userRepo := user.NewUserRepository(db)
	userService := user.NewUserService(userRepo, authService)
	userHandler := user.NewUserHandler(userService)

	accountRepo := account.NewAccountRepository(db)
	accountService := account.NewAccountService(accountRepo)
	accountHandler := account.NewAccountHandler(accountService)

	categoryRepo := category.NewCategoryRepository(db)
	categoryService := category.NewCategoryService(categoryRepo)
	categoryHandler := category.NewCategoryHandler(categoryService)

	transactionRepo := transaction.NewTransactionRepository(db)
	transactionService := transaction.NewTransactionService(transactionRepo, categoryService)
	transactionHandler := transaction.NewTransactionHandler(transactionService)

	return &router.Dependencies{
		UserHandler:        userHandler,
		TransactionHandler: transactionHandler,
		AccountHandler:     accountHandler,
		CategoryHandler:    categoryHandler,
		AuthService:        authService,
		DB:                 db,
		RedisClient:        redisClient,
		Logger:             appLogger,
	}
}
