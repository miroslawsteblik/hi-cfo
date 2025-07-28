package user

import (
	"hi-cfo/api/internal/logger"
	"hi-cfo/api/internal/shared/auth"
	"hi-cfo/api/internal/shared/errors"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

type UserStore interface {
	RegisterUser(req *UserRequest) (*UserResponse, error)
	LoginUser(req *LoginRequest) (*auth.TokenPair, error)
	GetAllUsers() ([]UserResponse, error)
	GetUser(id uuid.UUID) (*UserResponse, error)
	UpdateUser(id uuid.UUID, req *UserRequest) (*UserResponse, error)
	DeleteUser(id uuid.UUID) error
	GetUserByEmail(email string) (*User, error)
	UpdateCurrentUser(id uuid.UUID, req *UserRequest) (*UserResponse, error)
	ChangePassword(id uuid.UUID, currentPassword, newPassword string) error
}

type UserService struct {
	userRepo    UserRepository
	authService *auth.Service
	logger      *logrus.Entry
}

func NewUserService(userRepo UserRepository, authService *auth.Service) *UserService {
	return &UserService{
		userRepo:    userRepo,
		authService: authService,
		logger:      logger.WithDomain("user"),
	}
}
func (s *UserService) RegisterUser(req *UserRequest) (*UserResponse, error) {
	existingUser, _ := s.userRepo.GetUserByEmail(req.Email)
	if existingUser != nil {
		appErr := errors.NewEmailExists(req.Email).
			WithDomain("user")
		appErr.Log()
		return nil, appErr
	}

	// Create a new user with UUID generated in repository
	user := User{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Role:      "user", // Default role
	}

	// Set password using the model method
	if err := user.SetPassword(req.Password); err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeValidation, "Failed to set password").
			WithDomain("user").
			WithDetail("email", req.Email)
		appErr.Log()
		return nil, appErr
	}

	createdUser, err := s.userRepo.CreateUser(user)
	if err != nil {
		return nil, err
	}

	s.logger.WithField("user_id", createdUser.ID).Info("User registered successfully")
	resp := createdUser.ToResponse()
	return &resp, nil
}

func (s *UserService) LoginUser(req *LoginRequest) (*auth.TokenPair, error) {
	user, err := s.userRepo.GetUserByEmail(req.Email)
	if err != nil || user == nil {
		appErr := errors.NewInvalidCredentials().
			WithDomain("user").
			WithDetail("email", req.Email)
		appErr.Log()
		return nil, appErr
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		appErr := errors.NewInvalidCredentials().
			WithDomain("user").
			WithDetail("email", req.Email)
		appErr.Log()
		return nil, appErr
	}

	s.logger.WithFields(logrus.Fields{
		"user_id": user.ID,
		"email":   user.Email,
	}).Info("User logged in successfully")
	return s.authService.Login(user)
}

func (s *UserService) GetAllUsers() ([]UserResponse, error) {
	users, err := s.userRepo.GetAllUsers()
	if err != nil {
		return nil, err
	}

	var userResponses []UserResponse
	for _, user := range users {
		userResponses = append(userResponses, user.ToResponse())
	}

	s.logger.WithField("user_count", len(userResponses)).Info("Retrieved all users")
	return userResponses, nil
}

func (s *UserService) GetUser(id uuid.UUID) (*UserResponse, error) {
	user, err := s.userRepo.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		appErr := errors.New(errors.ErrCodeUserNotFound, "User not found").
			WithDomain("user").
			WithDetail("user_id", id)
		appErr.Log()
		return nil, appErr
	}
	resp := user.ToResponse()
	return &resp, nil
}
func (s *UserService) UpdateUser(id uuid.UUID, req *UserRequest) (*UserResponse, error) {
	user, err := s.userRepo.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		appErr := errors.NewUserNotFound(id).
			WithDomain("user")
		appErr.Log()
		return nil, appErr
	}

	// Update user fields
	user.Email = req.Email
	user.FirstName = req.FirstName
	user.LastName = req.LastName

	if req.Password != "" {
		if err := user.SetPassword(req.Password); err != nil {
			appErr := errors.Wrap(err, errors.ErrCodeValidation, "Failed to set password").
				WithDomain("user").
				WithDetail("user_id", id)
			appErr.Log()
			return nil, appErr
		}
	}

	updatedUser, err := s.userRepo.UpdateUser(*user)
	if err != nil {
		return nil, err
	}

	s.logger.WithField("user_id", id).Info("User updated successfully")
	resp := updatedUser.ToResponse()
	return &resp, nil
}

func (s *UserService) DeleteUser(id uuid.UUID) error {
	user, err := s.userRepo.GetUserByID(id)
	if err != nil {
		return err
	}
	if user == nil {
		appErr := errors.NewUserNotFound(id).
			WithDomain("user")
		appErr.Log()
		return appErr
	}

	err = s.userRepo.DeleteUser(id)
	if err != nil {
		return err
	}

	s.logger.WithField("user_id", id).Info("User deleted successfully")
	return nil
}

func (s *UserService) GetUserByEmail(email string) (*User, error) {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return nil, err
	}

	s.logger.WithField("email", email).Debug("Retrieved user by email")
	return user, nil
}

func (s *UserService) UpdateCurrentUser(id uuid.UUID, req *UserRequest) (*UserResponse, error) {
	user, err := s.userRepo.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		appErr := errors.NewUserNotFound(id).
			WithDomain("user")
		appErr.Log()
		return nil, appErr
	}

	// Check if email is being changed and if it already exists
	if req.Email != user.Email {
		existingUser, _ := s.userRepo.GetUserByEmail(req.Email)
		if existingUser != nil {
			appErr := errors.NewEmailExists(req.Email).
				WithDomain("user").
				WithDetail("user_id", id)
			appErr.Log()
			return nil, appErr
		}
	}

	// Update user fields (excluding password)
	user.Email = req.Email
	user.FirstName = req.FirstName
	user.LastName = req.LastName

	// Don't update password in profile update - use ChangePassword for that

	updatedUser, err := s.userRepo.UpdateUser(*user)
	if err != nil {
		return nil, err
	}

	s.logger.WithField("user_id", id).Info("User profile updated successfully")
	resp := updatedUser.ToResponse()
	return &resp, nil
}

func (s *UserService) ChangePassword(id uuid.UUID, currentPassword, newPassword string) error {
	user, err := s.userRepo.GetUserByID(id)
	if err != nil {
		return err
	}
	if user == nil {
		appErr := errors.NewUserNotFound(id).
			WithDomain("user")
		appErr.Log()
		return appErr
	}

	// Verify current password
	if !user.CheckPassword(currentPassword) {
		appErr := errors.NewInvalidCredentials().
			WithDomain("user").
			WithDetail("user_id", id).
			WithDetail("action", "change_password")
		appErr.Log()
		return appErr
	}

	// Set new password
	if err := user.SetPassword(newPassword); err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeValidation, "Failed to set new password").
			WithDomain("user").
			WithDetail("user_id", id)
		appErr.Log()
		return appErr
	}

	// Update user in database
	_, err = s.userRepo.UpdateUser(*user)
	if err != nil {
		return err
	}

	s.logger.WithField("user_id", id).Info("Password changed successfully")
	return nil
}
