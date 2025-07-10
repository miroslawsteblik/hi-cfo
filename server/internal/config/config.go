package config

import (
	"os"
	"strconv"
	"time"
	"fmt"
)


// LoadConfig validates and loads the required environment variables for the application.
func LoadConfig() error {
	// Validate required environment variables
	required := []string{
		"DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME",
		"JWT_SECRET", "API_PORT",
	}

	for _, env := range required {
		if os.Getenv(env) == "" {
			return fmt.Errorf("required environment variable %s is not set", env)
		}
	}

	return nil
}


// JWT configuration
func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	return secret
}


func GetJWTExpiry() time.Duration {
	expiryStr := os.Getenv("JWT_EXPIRY")
	if expiryStr == "" {
		return 24 * time.Hour // Default 24 hours
	}
	
	expiry, err := time.ParseDuration(expiryStr)
	if err != nil {
		return 24 * time.Hour
	}
	
	return expiry
}

func GetJWTRefreshExpiry() time.Duration {
	expiryStr := os.Getenv("JWT_REFRESH_EXPIRY")
	if expiryStr == "" {
		return 7 * 24 * time.Hour // Default 7 days
	}
	
	expiry, err := time.ParseDuration(expiryStr)
	if err != nil {
		return 7 * 24 * time.Hour
	}
	
	return expiry
}


// APP configuration
func GetAppName() string {
	name := os.Getenv("APP_NAME")
	if name == "" {
		return "HiCFO"
	}
	return name
}

func GetPort() string {
	port := os.Getenv("API_PORT")
	return port
}

func IsDevelopment() bool {
	return os.Getenv("APP_ENV") == "development"
}


// Redis configuration
func GetRedisAddr() string {
	host := os.Getenv("REDIS_HOST")
	port := os.Getenv("REDIS_PORT")
	
	if host == "" {
		host = "localhost"
	}
	if port == "" {
		port = "6379"
	}
	
	return host + ":" + port
}

func GetRedisPassword() string {
	return os.Getenv("REDIS_PASSWORD")
}

func GetRedisDB() int {
	dbStr := os.Getenv("REDIS_DB")
	if dbStr == "" {
		return 0
	}
	
	if db, err := strconv.Atoi(dbStr); err == nil {
		return db
	}
	
	return 0
}


// Bcrypt configuration
func GetBcryptRounds() int {
	rounds := os.Getenv("BCRYPT_ROUNDS")
	if rounds == "" {
		return 12
	}
	
	r, err := strconv.Atoi(rounds)
	if err != nil {
		return 12
	}
	
	return r
}


// File upload configuration
func GetMaxFileSize() int64 {
	sizeStr := os.Getenv("MAX_FILE_SIZE")
	if sizeStr == "" {
		return 10 * 1024 * 1024 // 10MB default
	}
	
	// Parse size string (e.g., "10MB", "5GB")
	size, err := parseSize(sizeStr)
	if err != nil {
		return 10 * 1024 * 1024
	}
	
	return size
}

// parseSize parses size strings like "10MB", "5GB"
func parseSize(sizeStr string) (int64, error) {
	// Simple implementation - you might want to use a library
	// like github.com/docker/go-units for more robust parsing
	
	if len(sizeStr) < 2 {
		return strconv.ParseInt(sizeStr, 10, 64)
	}
	
	unit := sizeStr[len(sizeStr)-2:]
	valueStr := sizeStr[:len(sizeStr)-2]
	
	value, err := strconv.ParseInt(valueStr, 10, 64)
	if err != nil {
		return 0, err
	}
	
	switch unit {
	case "KB":
		return value * 1024, nil
	case "MB":
		return value * 1024 * 1024, nil
	case "GB":
		return value * 1024 * 1024 * 1024, nil
	default:
		return value, nil
	}
}



// Database configuration
func GetDatabaseURL() string {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		user, password, host, port, dbname)
}