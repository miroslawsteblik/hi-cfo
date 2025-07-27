package user

import (
	"hi-cfo/server/internal/logger"
	"hi-cfo/server/internal/shared/errors"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

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
	db     *gorm.DB
	logger *logrus.Entry
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{
		db:     db,
		logger: logger.WithDomain("user"),
	}
}

func (r *userRepository) CreateUser(user User) (*User, error) {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}

	if err := r.db.Create(&user).Error; err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to create user").
			WithDomain("user").
			WithDetail("user_email", user.Email)
		appErr.Log()
		return nil, appErr
	}

	r.logger.WithField("user_id", user.ID).Info("User created successfully")
	return &user, nil
}

func (r *userRepository) GetUserByID(id uuid.UUID) (*User, error) {
	var user User

	if err := r.db.First(&user, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // User not found
		}
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to get user by ID").
			WithDomain("user").
			WithDetail("user_id", id)
		appErr.Log()
		return nil, appErr
	}
	return &user, nil
}

func (r *userRepository) GetUserByEmail(email string) (*User, error) {
	var user User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeUserNotFound, "User not found").
				WithDomain("user").
				WithDetail("email", email)
		}
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to get user by email").
			WithDomain("user").
			WithDetail("email", email)
		appErr.Log()
		return nil, appErr
	}
	return &user, nil
}

func (r *userRepository) GetAllUsers() ([]User, error) {
	var users []User
	if err := r.db.Find(&users).Error; err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to get all users").
			WithDomain("user")
		appErr.Log()
		return nil, appErr
	}

	r.logger.WithField("user_count", len(users)).Info("Retrieved all users")
	return users, nil
}
func (r *userRepository) UpdateUser(user User) (*User, error) {
	if err := r.db.Save(&user).Error; err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to update user").
			WithDomain("user").
			WithDetail("user_id", user.ID)
		appErr.Log()
		return nil, appErr
	}

	r.logger.WithField("user_id", user.ID).Info("User updated successfully")
	return &user, nil
}
func (r *userRepository) DeleteUser(id uuid.UUID) error {
	if err := r.db.Delete(&User{}, "id = ?", id).Error; err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to delete user").
			WithDomain("user").
			WithDetail("user_id", id)
		appErr.Log()
		return appErr
	}

	r.logger.WithField("user_id", id).Info("User deleted successfully")
	return nil
}
