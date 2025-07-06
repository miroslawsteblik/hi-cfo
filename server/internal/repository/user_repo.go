package repository

import (
	"errors"

	"hi-cfo/server/internal/models"

	"gorm.io/gorm"
)

// UserRepository provides methods to interact with the user database
type UserRepository interface {
    Create(user models.User) (*models.User, error)
    GetByID(id uint) (*models.User, error)
    GetByEmail(email string) (*models.User, error)
    GetAll() ([]models.User, error)
    Update(user models.User) (*models.User, error)
    Delete(id uint) error
}

// userRepository implements UserRepository interface
type userRepository struct {
    db *gorm.DB
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *gorm.DB) UserRepository {
    return &userRepository{db: db}
}
// Create inserts a new user into the database
func (r *userRepository) Create(user models.User) (*models.User, error) {
    if err := r.db.Create(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}    
// GetByID retrieves a user by their ID
func (r *userRepository) GetByID(id uint) (*models.User, error) {
    var user models.User
    if err := r.db.First(&user, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil // User not found
        }
        return nil, err // Other error
    }
    return &user, nil
}
// GetByEmail retrieves a user by their email
func (r *userRepository) GetByEmail(email string) (*models.User, error) {
    var user models.User
    if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil // User not found
        }
        return nil, err // Other error
    }
    return &user, nil
}
// GetAll retrieves all users from the database
func (r *userRepository) GetAll() ([]models.User, error) {
    var users []models.User
    if err := r.db.Find(&users).Error; err != nil {
        return nil, err // Error retrieving users
    }
    return users, nil
}
// Update modifies an existing user in the database
func (r *userRepository) Update(user models.User) (*models.User, error) {
    if err := r.db.Save(&user).Error; err != nil {
        return nil, err // Error updating user
    }
    return &user, nil
}
// Delete removes a user from the database by their ID
func (r *userRepository) Delete(id uint) error {
    if err := r.db.Delete(&models.User{}, id).Error; err != nil {
        return err // Error deleting user
    }
    return nil
}
