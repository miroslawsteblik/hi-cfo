package main

import (
	"log"
	"os"
	"time"
	"github.com/go-redis/redis/v8"

	"hi-cfo/server/internal/auth"
	"hi-cfo/server/internal/router"

	"hi-cfo/server/internal/config"
	"hi-cfo/server/internal/infra"
	"hi-cfo/server/internal/users"
)

func main() {
	os.Setenv("APP_START_TIME", time.Now().UTC().Format(time.RFC3339))
	
	// // Load configuration
	if err := config.LoadConfig(); err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Database connection
	db, err := infra.InitializeDatabase()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	// Redis connection
	redisClient, err := infra.InitializeRedis()
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	router.SetDB(db)
	router.SetRedisClient(redisClient)

	deps := setupDependencies(db, redisClient)
	
	r := router.SetupRoutes(deps)

	// Setup trusted proxies for nginx
	if err := r.SetTrustedProxies([]string{"nginx", "nginx_proxy"}); err != nil {
		log.Printf("Warning: Failed to set trusted proxies: %v", err)
	}


	// Start server
	port := config.GetPort()
	log.Printf("Starting server on port %s", port)
	log.Printf("Health check available at: http://localhost:%s/health", port)
	log.Printf("API documentation available at: http://localhost:%s/api/v1", port)

	if err := r.Run("0.0.0.0:" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupDependencies(db *infra.DB, redisClient *redis.Client) *router.Dependencies {

	authService := auth.NewService()
	userRepo := users.NewUserRepository(db)
	userService := users.NewUserService(userRepo, authService)
	userHandler := users.NewUserHandler(userService)

	return &router.Dependencies{
		UserHandler: userHandler,
		AuthService: authService,
		DB:          db,
		RedisClient: redisClient,
	}
}
