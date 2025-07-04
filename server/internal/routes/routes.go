package routes

import (
    "hi-cfo/server/internal/handlers"
    "hi-cfo/server/internal/middleware"

		"hi-cfo/server/internal/repository"
		"hi-cfo/server/internal/services"

		"database/sql"
    "github.com/gin-gonic/gin"
)


    
		
		
		
func SetupRoutes(db *sql.DB) *gin.Engine {
		// Initialize layers
		userRepo := repository.NewUserRepository(db)
		userService := services.NewUserService(userRepo)
		userHandler := handlers.NewUserHandler(userService)

    r := gin.Default()
    
    // Apply CORS middleware
    r.Use(middleware.SetupCORS())

		// Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })
    
    // API routes
    api := r.Group("/api")
    {
			  api.GET("/hello", func(c *gin.Context) {
            c.JSON(200, gin.H{"message": "Hello from Go!"})
        })

				// Public routes
        api.GET("/users", userHandler.GetAllUsers)
        api.POST("/users", userHandler.CreateUser)
        api.GET("/users/:id", userHandler.GetUser)
        // api.PUT("/users/:id", userHandler.UpdateUser)
        // api.DELETE("/users/:id", userHandler.DeleteUser)
    }
    
    return r
}