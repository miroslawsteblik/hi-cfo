package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"hi-cfo/api/internal/domains/account"
	"hi-cfo/api/internal/domains/category"
	"hi-cfo/api/internal/domains/transaction"
	"hi-cfo/api/internal/domains/user"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DB = gorm.DB

// MigrationRecord tracks applied migrations
type MigrationRecord struct {
	ID        string `gorm:"primaryKey"`
	Name      string
	AppliedAt time.Time
}

func (MigrationRecord) TableName() string {
	return "schema_migrations"
}

func InitializeDatabase() (*DB, error) {

	// Build DSN from environment variables
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, password, host, port, dbname)

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn), // Adjust log level as needed
	}
	db, err := gorm.Open(postgres.Open(connStr), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(25)
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetConnMaxLifetime(5 * time.Minute) // No limit on connection lifetime

	// test the connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	log.Println("Connected to PostgreSQL database successfully")

	if err := runMigration(db); err != nil {
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	return db, nil
}

func runMigration(db *DB) error {
	log.Println("📋 Starting database migration...")

	if err := db.AutoMigrate(&MigrationRecord{}); err != nil {
		return fmt.Errorf("failed to create migration table: %w", err)
	}

	if err := runTableMigrations(db); err != nil {
		return fmt.Errorf("table migrations failed: %w", err)
	}

	return nil
}

// runTableMigrations creates/updates all table structures
func runTableMigrations(db *DB) error {
	log.Println("Running table migrations...")

	models := []interface{}{
		&user.User{},
		&account.Account{},
		&category.Category{},
		&transaction.Transaction{},
	}

	if err := db.AutoMigrate(models...); err != nil {
		return err
	}

	log.Println("Table migrations completed")
	return nil
}
