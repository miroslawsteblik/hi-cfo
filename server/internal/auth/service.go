package auth

import (
	"fmt"
	"time"	
	"hi-cfo/server/internal/models"
	"github.com/google/uuid"
)

type Service struct {
	tokenService *TokenService
}

func NewService() *Service {
	return &Service{
		tokenService: NewTokenService(),
	}
}

func (s *Service) GetTokenService() *TokenService {
	return s.tokenService
}

func (s *Service) Login(user *models.User) (*TokenPair, error) {
	if user == nil {
		return nil, fmt.Errorf("user cannot be nil")
	}

	// Validate user credentials (this should be done in a real application)
	if user.Email == "" || user.PasswordHash == "" {
		return nil, fmt.Errorf("invalid user credentials")
	}

	// Generate token pair
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
	// Check if the token is expired
	if claims.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("token has expired")
	}

	return claims, nil
}

func (s *Service) RefreshToken(refreshToken string) (*TokenPair, error) {
	claims, err := s.tokenService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Parse the UUID from string
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID in token: %w", err)
	}

	// Create user object from claims
	user := &models.User{
		ID:    userID,
		Email: claims.Email,
		Role:  claims.Role,
	}

	// Generate new token pair
	return s.tokenService.GenerateTokenPair(user)
}

