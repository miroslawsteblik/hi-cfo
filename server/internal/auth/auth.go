package auth

import (
	"time"
	"fmt"
	"github.com/google/uuid"

	"github.com/golang-jwt/jwt/v5"
	"hi-cfo/server/internal/config"
	"hi-cfo/server/internal/middleware"
	"hi-cfo/server/internal/models"
)

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// GenerateTokenPair creates both access and refresh tokens
func GenerateTokenPair(user *models.User) (*TokenPair, error) {
	// Generate access token
	accessToken, err := GenerateAccessToken(user)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, err := GenerateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(config.GetJWTExpiry().Seconds()),
		TokenType:    "Bearer",
	}, nil
}

// GenerateAccessToken creates an access token
func GenerateAccessToken(user *models.User) (string, error) {
	expirationTime := time.Now().Add(config.GetJWTExpiry())
	
	claims := &middleware.Claims{
		UserID:    user.ID.String(),  // Always use string format
		Email:     user.Email,
		// Role:      user.Role,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    config.GetAppName(),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.GetJWTSecret()))
}

// GenerateRefreshToken creates a refresh token
func GenerateRefreshToken(user *models.User) (string, error) {
	expirationTime := time.Now().Add(config.GetJWTRefreshExpiry())
	
	claims := &middleware.Claims{
		UserID:    user.ID.String(),
		Email:     user.Email,
		Role:      user.Role,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    config.GetAppName(),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.GetJWTSecret()))
}

// ValidateRefreshToken validates and extracts claims from refresh token
func ValidateRefreshToken(tokenString string) (*middleware.Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &middleware.Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(config.GetJWTSecret()), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*middleware.Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenMalformed
	}

	// Ensure it's a refresh token
	if claims.TokenType != "refresh" {
		return nil, jwt.ErrTokenMalformed
	}

	// Check if token is expired
	if claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, jwt.ErrTokenExpired
	}

	return claims, nil
}

// RefreshAccessToken generates a new access token using refresh token
func RefreshAccessToken(refreshToken string) (*TokenPair, error) {
    claims, err := ValidateRefreshToken(refreshToken)
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
        ID:    userID, // Now correctly using uuid.UUID type
        Email: claims.Email,
        // Role:  claims.Role,
    }

    // Generate new token pair
    return GenerateTokenPair(user)
}