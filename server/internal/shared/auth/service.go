package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

type Service struct {
	tokenService *TokenService
	redisClient  *redis.Client
}

// simpleUser is a minimal implementation of UserForAuth for token refresh
type simpleUser struct {
	id           uuid.UUID
	email        string
	role         string
	passwordHash string
}

func (u *simpleUser) GetID() uuid.UUID {
	return u.id
}

func (u *simpleUser) GetEmail() string {
	return u.email
}

func (u *simpleUser) GetRole() string {
	return u.role
}

func (u *simpleUser) GetPasswordHash() string {
	return u.passwordHash
}

func NewService(redisClient *redis.Client) *Service {
	return &Service{
		tokenService: NewTokenService(),
		redisClient:  redisClient,
	}
}

func (s *Service) GetTokenService() *TokenService {
	return s.tokenService
}

func (s *Service) Login(user UserForAuth) (*TokenPair, error) {
	if user == nil {
		return nil, fmt.Errorf("user cannot be nil")
	}

	// Validate user credentials (this should be done in a real application)
	if user.GetEmail() == "" || user.GetPasswordHash() == "" {
		return nil, fmt.Errorf("invalid user credentials")
	}

	tokenPair, err := s.tokenService.GenerateTokenPair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token pair: %w", err)
	}

	return tokenPair, nil
}

func (s *Service) ValidateToken(token string) (*Claims, error) {
	claims, err := s.tokenService.ValidateToken(token)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	// Check if the token type is valid
	if claims.TokenType != "access" && claims.TokenType != "refresh" {
		return nil, fmt.Errorf("invalid token type: %s", claims.TokenType)
	}

	// Critical security: Check if token is blacklisted
	if s.redisClient != nil {
		blacklisted, err := s.IsTokenBlacklisted(token)
		if err != nil {
			// Log error but don't fail validation to avoid breaking the app if Redis is down
			// Consider implementing fallback logic based on your requirements
			fmt.Printf("Warning: Failed to check token blacklist: %v\n", err)
		} else if blacklisted {
			return nil, fmt.Errorf("token has been revoked")
		}
	}

	// Token expiry is already validated by JWT library during parsing
	return claims, nil
}

func (s *Service) RefreshToken(refreshToken string) (*TokenPair, error) {
	claims, err := s.tokenService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID in token: %w", err)
	}

	// Create user object from claims
	user := &simpleUser{
		id:    userID,
		email: claims.Email,
		role:  claims.Role,
	}

	return s.tokenService.GenerateTokenPair(user)
}

// BlacklistToken adds a token to the blacklist
func (s *Service) BlacklistToken(token string) error {
	if s.redisClient == nil {
		return fmt.Errorf("Redis client not available")
	}

	// Get token claims to extract expiry time for TTL
	claims, err := s.tokenService.ValidateToken(token)
	if err != nil {
		// Even if token is invalid, we should blacklist it to be safe
		return s.setTokenBlacklist(token, 24*time.Hour) // Default TTL
	}

	// Calculate TTL: time until token expires
	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl <= 0 {
		// Token already expired, no need to blacklist
		return nil
	}

	return s.setTokenBlacklist(token, ttl)
}

// IsTokenBlacklisted checks if a token is blacklisted
func (s *Service) IsTokenBlacklisted(token string) (bool, error) {
	if s.redisClient == nil {
		return false, fmt.Errorf("Redis client not available")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	exists, err := s.redisClient.Exists(ctx, s.getBlacklistKey(token)).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check Redis: %w", err)
	}

	return exists == 1, nil
}

// setTokenBlacklist adds token to blacklist with TTL
func (s *Service) setTokenBlacklist(token string, ttl time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	key := s.getBlacklistKey(token)
	err := s.redisClient.Set(ctx, key, "blacklisted", ttl).Err()
	if err != nil {
		return fmt.Errorf("failed to blacklist token: %w", err)
	}

	return nil
}

// getBlacklistKey generates Redis key for blacklisted token
func (s *Service) getBlacklistKey(token string) string {
	// Use first 32 characters of token for key (sufficient for uniqueness)
	if len(token) > 32 {
		token = token[:32]
	}
	return fmt.Sprintf("blacklist:token:%s", token)
}

// LogoutUser blacklists both access and refresh tokens
func (s *Service) LogoutUser(accessToken, refreshToken string) error {
	var errors []string

	// Blacklist access token
	if err := s.BlacklistToken(accessToken); err != nil {
		errors = append(errors, fmt.Sprintf("failed to blacklist access token: %v", err))
	}

	// Blacklist refresh token
	if refreshToken != "" {
		if err := s.BlacklistToken(refreshToken); err != nil {
			errors = append(errors, fmt.Sprintf("failed to blacklist refresh token: %v", err))
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("logout partial failure: %v", errors)
	}

	return nil
}
