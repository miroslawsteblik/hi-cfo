package models

import (
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"time"
)

type User struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	Email        string     `json:"email" gorm:"unique;not null"`
	PasswordHash string     `json:"-" gorm:"column:password_hash;not null"` // Store hashed password
	FirstName    string     `json:"first_name" gorm:"not null"`
	LastName     string     `json:"last_name" gorm:"not null"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	LastLogin    *time.Time `json:"last_login"`
	Role         string     `json:"role" gorm:"default:'user';not null"` // Default role is 'user'
}

// TableName specifies the table name for GORM
func (User) TableName() string {
	return "users"
}

// BeforeCreate is a GORM hook that runs before creating a user
// func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
// 	if u.ID == uuid.Nil {
// 		u.ID = uuid.New()
// 	}
// 	return
// }

// UserRequest for creating/updating users
type UserRequest struct {
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=6"`
	Role      string `json:"role" validate:"omitempty"`
}

// UserResponse for API responses
type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// LoginRequest for authentication
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// SetPassword hashes and sets the user's password
func (u *User) SetPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hashedPassword)
	return nil
}

// CheckPassword verifies the provided password against the stored hash
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Role:      u.Role,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}