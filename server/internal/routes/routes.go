package routes

import (
    "hi-cfo/server/internal/handlers"

    "github.com/gin-gonic/gin"
)


    
		
		
		
func SetupUserRoutes(router *gin.Engine, userHandler *handlers.UserHandler) {
	// Auth routes
	auth := router.Group("/api/auth")
	{
		auth.POST("/register", userHandler.Register)
		auth.POST("/login", userHandler.Login)
	}

	// User routes
	users := router.Group("/api/users")
	{
		users.GET("", userHandler.GetAllUsers)
		users.POST("", userHandler.CreateUser)
		users.GET("/:id", userHandler.GetUser)
		users.PUT("/:id", userHandler.UpdateUser)
		users.DELETE("/:id", userHandler.DeleteUser)
	}
  // Health check endpoint
  router.GET("/health", func(c *gin.Context) {
    c.JSON(200, gin.H{"status": "ok"})

  })
  router.GET("/ping", func(c *gin.Context) {
    c.JSON(200, gin.H{"message": "pong"})
  })
}