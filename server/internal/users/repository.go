package users

import (
	"errors"
	"fmt"

	"hi-cfo/server/internal/models"

	"github.com/google/uuid"

	"gorm.io/gorm"
)

var ErrUserNotFound = errors.New("user not found")

type UserRepository interface {
	CreateUser(user models.User) (*models.User, error)
	GetUserByID(id uuid.UUID) (*models.User, error)
	GetUserByEmail(email string) (*models.User, error)
	GetAllUsers() ([]models.User, error)
	UpdateUser(user models.User) (*models.User, error)
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
func (r *userRepository) CreateUser(user models.User) (*models.User, error) {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}

	if err := r.db.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetUserByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	
	if err := r.db.First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // User not found
		}
		return nil, err // Other error
	}
	return &user, nil
}

func (r *userRepository) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("error retrieving user by email: %v", err)
	}
	return &user, nil
}

func (r *userRepository) GetAllUsers() ([]models.User, error) {
	var users []models.User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err // Error retrieving users
	}
	return users, nil
}
func (r *userRepository) UpdateUser(user models.User) (*models.User, error) {
	if err := r.db.Save(&user).Error; err != nil {
		return nil, err // Error updating user
	}
	return &user, nil
}
func (r *userRepository) DeleteUser(id uuid.UUID) error {
	if err := r.db.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		return err // Error deleting user
	}
	return nil
}
