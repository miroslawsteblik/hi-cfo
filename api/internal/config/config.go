package config

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"hi-cfo/api/internal/logger"

	"github.com/gin-gonic/gin"
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

	// Critical security validation
	if secret == "" {
		logger.Fatal("JWT_SECRET environment variable is required and cannot be empty")
	}

	// Ensure minimum security requirements
	if len(secret) < 32 {
		logger.Fatal("JWT_SECRET must be at least 32 characters long for security")
	}

	// Check for weak common secrets in production
	if os.Getenv("APP_ENV") == "production" {
		weakSecrets := []string{"secret", "password", "123456", "jwt_secret", "change_me"}
		for _, weak := range weakSecrets {
			if secret == weak {
				logger.Fatal("JWT_SECRET cannot use weak/default values in production")
			}
		}
	}

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

// Redis configuration
func GetRedisAddr() string {
	host := os.Getenv("REDIS_HOST")
	port := os.Getenv("REDIS_PORT")
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

// Proxy configuration structures and functions
type ProxyConfig struct {
	TrustedProxies []string `json:"trusted_proxies"`
}

type AppProxyConfig struct {
	Development ProxyConfig `json:"development"`
	Staging     ProxyConfig `json:"staging"`
	Production  ProxyConfig `json:"production"`
}

// SetupTrustedProxies configures trusted proxy settings for the Gin router
func SetupTrustedProxies(r *gin.Engine) {
	proxies := LoadTrustedProxies()

	if len(proxies) == 0 {
		logger.Info("No trusted proxies configured, using defaults")
		proxies = getDefaultProxies()
	}

	validProxies := validateProxies(proxies)

	if len(validProxies) == 0 {
		logger.Fatal("No valid trusted proxies found")
	}
	// Set trusted proxies
	r.SetTrustedProxies(validProxies)

	logger.WithField("proxies", validProxies).Info("Trusted proxies configured")
}

// LoadTrustedProxies loads proxy configuration from environment and config file
func LoadTrustedProxies() []string {
	environment := os.Getenv("APP_ENV")
	if environment == "" {
		environment = "development"
	}

	configFile := os.Getenv("TRUSTED_PROXIES_CONFIG")
	if configFile == "" {
		return getDefaultProxies()
	}

	data, err := os.ReadFile(configFile)
	if err != nil {
		logger.WithFields(map[string]any{
			"config_file": configFile,
			"error":       err.Error(),
		}).Warn("Could not read config file, using defaults")
		return getDefaultProxies()
	}

	var config AppProxyConfig
	if err := json.Unmarshal(data, &config); err != nil {
		logger.WithField("error", err.Error()).Warn("Could not parse config file, using defaults")
		return getDefaultProxies()
	}

	switch environment {
	case "production":
		return config.Production.TrustedProxies
	case "staging":
		return config.Staging.TrustedProxies
	default:
		return config.Development.TrustedProxies
	}
}

func getDefaultProxies() []string {
	return []string{"172.16.0.0/12", "192.168.0.0/16"}
}

func validateProxies(proxies []string) []string {
	var validProxies []string

	for _, proxy := range proxies {
		proxy = strings.TrimSpace(proxy)
		if proxy == "" {
			continue
		}

		// Check if it's a valid CIDR
		if _, _, err := net.ParseCIDR(proxy); err == nil {
			validProxies = append(validProxies, proxy)
			continue
		}

		// Check if it's a valid IP
		if net.ParseIP(proxy) != nil {
			validProxies = append(validProxies, proxy)
			continue
		}

		// Allow hostnames (for Docker container names like "nginx")
		if isValidHostname(proxy) {
			validProxies = append(validProxies, proxy)
			continue
		}

		logger.WithField("proxy", proxy).Warn("Invalid proxy address, skipping")
	}

	return validProxies
}

func isValidHostname(hostname string) bool {
	// Basic hostname validation
	if len(hostname) == 0 || len(hostname) > 253 {
		return false
	}

	// Allow alphanumeric, hyphens, underscores, and dots
	for _, char := range hostname {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '-' || char == '_' || char == '.') {
			return false
		}
	}

	return true
}
