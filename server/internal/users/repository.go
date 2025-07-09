package users

import (
	"errors"
	"fmt"

	// "hi-cfo/server/internal/users"

	"github.com/google/uuid"

	"gorm.io/gorm"
)

var ErrUserNotFound = errors.New("user not found")

type UserRepository interface {
	CreateUser(user User) (*User, error)
	GetUserByID(id uuid.UUID) (*User, error)
	GetUserByEmail(email string) (*User, error)
	GetAllUsers() ([]User, error)
	UpdateUser(user User) (*User, error)
	DeleteUser(id uuid.UUID) error
}

// userRepository implements UserRepository interface
type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}
func (r *userRepository) CreateUser(user User) (*User, error) {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}

	if err := r.db.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
func (r *userRepository) GetUserByID(id uuid.UUID) (*User, error) {
	var user User
	if err := r.db.First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // User not found
		}
		return nil, err // Other error
	}
	return &user, nil
}
func (r *userRepository) GetUserByEmail(email string) (*User, error) {
	var user User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("error retrieving user by email: %v", err)
	}
	return &user, nil
}

func (r *userRepository) GetAllUsers() ([]User, error) {
	var users []User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err // Error retrieving users
	}
	return users, nil
}
func (r *userRepository) UpdateUser(user User) (*User, error) {
	if err := r.db.Save(&user).Error; err != nil {
		return nil, err // Error updating user
	}
	return &user, nil
}
func (r *userRepository) DeleteUser(id uuid.UUID) error {
	if err := r.db.Delete(&User{}, "id = ?", id).Error; err != nil {
		return err // Error deleting user
	}
	return nil
}
