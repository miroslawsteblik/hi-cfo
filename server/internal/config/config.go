package config

import (
	"os"
	"strconv"
	"time"
)


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

func GetAppName() string {
	name := os.Getenv("APP_NAME")

	return name
}

func GetPort() string {
	port := os.Getenv("API_PORT")
	return port
}

func IsDevelopment() bool {
	return os.Getenv("APP_ENV") == "development"
}

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