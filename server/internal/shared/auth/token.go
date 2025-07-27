package auth

import (
	"fmt"
	"time"

	"hi-cfo/server/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims represents the JWT claims
type Claims struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role,omitempty"`
	TokenType string `json:"token_type"`
	jwt.RegisteredClaims
}

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// UserForAuth interface defines what the auth package needs from a user
type UserForAuth interface {
	GetID() uuid.UUID
	GetEmail() string
	GetRole() string
	GetPasswordHash() string
}

// TokenService handles token operations
type TokenService struct {
	secret        []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
	issuer        string
}

func NewTokenService() *TokenService {
	return &TokenService{
		secret:        []byte(config.GetJWTSecret()),
		accessExpiry:  config.GetJWTExpiry(),
		refreshExpiry: config.GetJWTRefreshExpiry(),
		issuer:        config.GetAppName(),
	}
}

func (ts *TokenService) GenerateTokenPair(user UserForAuth) (*TokenPair, error) {
	accessToken, err := ts.GenerateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token
	refreshToken, err := ts.GenerateRefreshToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(config.GetJWTExpiry().Seconds()),
		TokenType:    "Bearer",
	}, nil
}

func (ts *TokenService) GenerateAccessToken(user UserForAuth) (string, error) {
	return ts.generateToken(user, ts.accessExpiry, "access")
}
func (ts *TokenService) GenerateRefreshToken(user UserForAuth) (string, error) {
	return ts.generateToken(user, ts.refreshExpiry, "refresh")
}

func (ts *TokenService) generateToken(user UserForAuth, expiry time.Duration, tokenType string) (string, error) {
	expirationTime := time.Now().Add(expiry)

	claims := &Claims{
		UserID:    user.GetID().String(),
		Email:     user.GetEmail(),
		Role:      user.GetRole(),
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    ts.issuer,
			Subject:   user.GetID().String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(ts.secret)
}

func (ts *TokenService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return ts.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrTokenMalformed
}

func (ts *TokenService) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := ts.ValidateToken(tokenString)
	if err != nil {
		return nil, fmt.Errorf("failed to validate refresh token: %w", err)
	}

	if claims.TokenType != "refresh" {
		return nil, fmt.Errorf("invalid token type: expected 'refresh', got '%s'", claims.TokenType)
	}

	return claims, nil
}
