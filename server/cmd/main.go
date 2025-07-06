package main

import (
	"log"
	"os"


	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"hi-cfo/server/internal/models"
	"hi-cfo/server/internal/routes"

	"hi-cfo/server/internal/handlers"
	"hi-cfo/server/internal/repository"
	"hi-cfo/server/internal/services"
    "hi-cfo/server/internal/middleware"
)

func main() {
	// Database connection
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=password dbname=userdb port=5432 sslmode=disable"
	}
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
    
	// Auto migrate
	err = db.AutoMigrate(&models.User{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// JWT Secret
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-this-in-production"
	}




	// Initialize repository, service, and handler
	userRepo := repository.NewUserRepository(db)
	userService := services.NewUserService(userRepo, jwtSecret)
	userHandler := handlers.NewUserHandler(userService)

	// Setup router
	router := gin.Default()
	
	// setup nginx reverse proxy
	router.SetTrustedProxies([]string{"nginx"})
    
    // Middleware for CORS
    corsMiddleware := middleware.SetupCORS()
    router.Use(corsMiddleware)

    // Setup routes
    routes.SetupUserRoutes(router, userHandler)

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    log.Println("Starting server on port", port)
    if err := router.Run(":" + port); err != nil {
        log.Fatal("Failed to start server:", err)
    }
    log.Println("Server started successfully")
}