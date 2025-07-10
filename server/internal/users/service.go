package users

import (
	"errors"
	"hi-cfo/server/internal/models"
    "hi-cfo/server/internal/auth"

    "fmt"
    "golang.org/x/crypto/bcrypt"
	"github.com/google/uuid"


)

type UserService interface {
    RegisterUser(req *models.UserRequest) (*models.UserResponse, error)
    LoginUser(req *models.LoginRequest) (*auth.TokenPair, error)
    GetAllUsers() ([]models.UserResponse, error)
    GetUser(id uuid.UUID) (*models.UserResponse, error)
    UpdateUser(id uuid.UUID, req *models.UserRequest) (*models.UserResponse, error)
    DeleteUser(id uuid.UUID) error
    GetUserByEmail(email string) (*models.User, error) 
    UpdateCurrentUser(id uuid.UUID, req *models.UserRequest) (*models.UserResponse, error)
	ChangePassword(id uuid.UUID, currentPassword, newPassword string) error
}
type userService struct {
    userRepo UserRepository
    authService *auth.Service
}

func NewUserService(userRepo UserRepository, authService *auth.Service) UserService {
    return &userService{
        userRepo: userRepo,
        authService: authService,
    }
}
func (s *userService) RegisterUser(req *models.UserRequest) (*models.UserResponse, error) {
    existingUser, _ := s.userRepo.GetUserByEmail(req.Email)
    if existingUser != nil {
        return nil, errors.New("user already exists")
    }
    
    // Create a new user with UUID generated in repository
    user := models.User{
        Email:     req.Email,
        FirstName: req.FirstName,
        LastName:  req.LastName,
        Role:      "user", // Default role
    }

    // Set password using the model method
    if err := user.SetPassword(req.Password); err != nil {
        return nil, err
    }

    createdUser, err := s.userRepo.CreateUser(user)
    if err != nil {
        return nil, err
    }

    resp := createdUser.ToResponse()
    return &resp, nil
}

func (s *userService) LoginUser(req *models.LoginRequest) (*auth.TokenPair, error) {
    user, err := s.userRepo.GetUserByEmail(req.Email)
    if err != nil || user == nil {
        return nil, errors.New("invalid email or password")
    }

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

    return s.authService.Login(user)
}



func (s *userService) GetAllUsers() ([]models.UserResponse, error) {
    users, err := s.userRepo.GetAllUsers()
    if err != nil {
        return nil, err
    }

    var userResponses []models.UserResponse
    for _, user := range users {
        userResponses = append(userResponses, user.ToResponse())
    }

    return userResponses, nil
}

func (s *userService) GetUser(id uuid.UUID) (*models.UserResponse, error) {
    user, err := s.userRepo.GetUserByID(id)
    if err != nil {
        return nil, err
    }
    if user == nil {
        return nil, errors.New("user not found")
    }
    resp := user.ToResponse()
    return &resp, nil
}
func (s *userService) UpdateUser(id uuid.UUID, req *models.UserRequest) (*models.UserResponse, error) {
    user, err := s.userRepo.GetUserByID(id)
    if err != nil {
        return nil, err
    }
    if user == nil {
        return nil, errors.New("user not found")
    }

    // Update user fields
    user.Email = req.Email
    user.FirstName = req.FirstName
    user.LastName = req.LastName

    if req.Password != "" {
        if err := user.SetPassword(req.Password); err != nil {
            return nil, err
        }
    }

    updatedUser, err := s.userRepo.UpdateUser(*user)
    if err != nil {
        return nil, err
    }

    resp := updatedUser.ToResponse()
    return &resp, nil
}


func (s *userService) DeleteUser(id uuid.UUID) error {
    user, err := s.userRepo.GetUserByID(id)
    if err != nil {
        return err
    }
    if user == nil {
        return errors.New("user not found")
    }

    return s.userRepo.DeleteUser(id)
}

func (s *userService) GetUserByEmail(email string) (*models.User, error) {
    return s.userRepo.GetUserByEmail(email)
}

func (s *userService) UpdateCurrentUser(id uuid.UUID, req *models.UserRequest) (*models.UserResponse, error) {
	user, err := s.userRepo.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Check if email is being changed and if it already exists
	if req.Email != user.Email {
		existingUser, _ := s.userRepo.GetUserByEmail(req.Email)
		if existingUser != nil {
			return nil, errors.New("email already exists")
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

	resp := updatedUser.ToResponse()
	return &resp, nil
}

func (s *userService) ChangePassword(id uuid.UUID, currentPassword, newPassword string) error {
	user, err := s.userRepo.GetUserByID(id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	// Verify current password
	if !user.CheckPassword(currentPassword) {
		return errors.New("invalid current password")
	}

	// Set new password
	if err := user.SetPassword(newPassword); err != nil {
		return err
	}

	// Update user in database
	_, err = s.userRepo.UpdateUser(*user)
	if err != nil {
		return err
	}

	return nil
}