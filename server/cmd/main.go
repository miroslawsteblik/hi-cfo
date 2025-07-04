package main

import (
    "log"
    "hi-cfo/server/internal/routes"
    "hi-cfo/server/internal/config"

)

func main() {
    // Initialize database in main
    db := config.NewDatabase()
    defer db.Close()


    // Setup routes with middleware
    r := routes.SetupRoutes(db.DB)
    
    log.Println("Server starting on :8080")
    if err := r.Run(":8080"); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}