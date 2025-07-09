package main

import (
	"log"

	"hi-cfo/server/internal/router"

	"hi-cfo/server/internal/config"
	"hi-cfo/server/internal/infra"
	"hi-cfo/server/internal/users"
)

func main() {
	// Database connection
	db, err := infra.ConnectPostgreSQL()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run auto-migration
	if err := infra.AutoMigrate(db); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}

	jwtSecret := config.GetJWTSecret()

	// Initialize repository, service, and handler
	userRepo := users.NewUserRepository(db)
	userService := users.NewUserService(userRepo, jwtSecret)
	userHandler := users.NewUserHandler(userService)

	// Setup router - USE the router returned by SetupRoutes
	router := router.SetupRoutes(userHandler)

	// Setup nginx reverse proxy
	router.SetTrustedProxies([]string{"nginx", "nginx_proxy"})

	// Get port from environment
	port := config.GetPort()

	log.Println("Starting server on port", port)
	log.Println("Health check available at: http://localhost:" + port + "/health")
	log.Println("Ping available at: http://localhost:" + port + "/ping")
	log.Println("Ready check available at: http://localhost:" + port + "/ready")

	// Start server - bind to all interfaces
	if err := router.Run("0.0.0.0:" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
