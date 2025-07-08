package repository

import (
    "errors"
    "fmt"

    "hi-cfo/server/internal/models"

    "github.com/google/uuid"

    "gorm.io/gorm"
)

var ErrUserNotFound = errors.New("user not found")


type UserRepository interface {
    Create(user models.User) (*models.User, error)
    GetByID(id uuid.UUID) (*models.User, error)
    GetByEmail(email string) (*models.User, error)
    GetAll() ([]models.User, error)
    Update(user models.User) (*models.User, error)
    Delete(id uuid.UUID) error
}

// userRepository implements UserRepository interface
type userRepository struct {
    db *gorm.DB
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *gorm.DB) UserRepository {
    return &userRepository{db: db}
}
func (r *userRepository) Create(user models.User) (*models.User, error) {
    if user.ID == uuid.Nil {
        user.ID = uuid.New()
    }
    
    if err := r.db.Create(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}
func (r *userRepository) GetByID(id uuid.UUID) (*models.User, error) {
    var user models.User
    if err := r.db.First(&user, "id = ?", id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil // User not found
        }
        return nil, err // Other error
    }
    return &user, nil
}
func (r *userRepository) GetByEmail(email string) (*models.User, error) {
    var user models.User
    if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound 
        }
        return nil, fmt.Errorf("error retrieving user by email: %v", err)
    }
    return &user, nil
}

func (r *userRepository) GetAll() ([]models.User, error) {
    var users []models.User
    if err := r.db.Find(&users).Error; err != nil {
        return nil, err // Error retrieving users
    }
    return users, nil
}
func (r *userRepository) Update(user models.User) (*models.User, error) {
    if err := r.db.Save(&user).Error; err != nil {
        return nil, err // Error updating user
    }
    return &user, nil
}
func (r *userRepository) Delete(id uuid.UUID) error {
    if err := r.db.Delete(&models.User{}, "id = ?", id).Error; err != nil {
        return err // Error deleting user
    }
    return nil
}
