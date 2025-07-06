package config

import (
	"fmt"
	"log"
	"hi-cfo/server/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func ConnectPostgreSQL(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test the connection
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to PostgreSQL database")
	return db, nil
}

// AutoMigrate runs database migrations
func AutoMigrate(db *gorm.DB) error {
	log.Println("Running database migrations...")
	
	err := db.AutoMigrate(
		&models.User{},
		// Add other models here as you create them
		// &models.Product{},
		// &models.Order{},
	)
	
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	
	log.Println("Database migrations completed successfully")
	return nil
}

// Alternative: You can also create a combined function
func ConnectAndMigrate(dsn string) (*gorm.DB, error) {
	db, err := ConnectPostgreSQL(dsn)
	if err != nil {
		return nil, err
	}
	
	if err := AutoMigrate(db); err != nil {
		return nil, err
	}
	
	return db, nil
}