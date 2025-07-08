package main

import (
	"log"
	"os"

	"hi-cfo/server/internal/routes"

	"hi-cfo/server/internal/handlers"
	"hi-cfo/server/internal/repository"
	"hi-cfo/server/internal/services"
	"hi-cfo/server/internal/config"

)

func main() {
	// Database connection
	db, err := config.ConnectPostgreSQL()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run auto-migration
	if err := config.AutoMigrate(db); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}

	// JWT Secret
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}


	// Initialize repository, service, and handler
	userRepo := repository.NewUserRepository(db)
	userService := services.NewUserService(userRepo, jwtSecret)
	userHandler := handlers.NewUserHandler(userService)

	// Setup router - USE the router returned by SetupRoutes
	router := routes.SetupRoutes(userHandler)

	// Setup nginx reverse proxy
	router.SetTrustedProxies([]string{"nginx", "nginx_proxy"})

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Println("Starting server on port", port)
	log.Println("Health check available at: http://localhost:" + port + "/health")
	log.Println("Ping available at: http://localhost:" + port + "/ping")
	log.Println("Ready check available at: http://localhost:" + port + "/ready")
	
	// Start server - bind to all interfaces
	if err := router.Run("0.0.0.0:" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}