package services

import (
	"errors"
	"hi-cfo/server/internal/models"
	"hi-cfo/server/internal/repository"

    "github.com/google/uuid"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type UserService interface {
    RegisterUser(req *models.UserRequest) (*models.UserResponse, error)
    LoginUser(req *models.LoginRequest) (*models.LoginResponse, error)
    GetAllUsers() ([]models.UserResponse, error)
    GetUser(id uuid.UUID) (*models.UserResponse, error)
    UpdateUser(id uuid.UUID, req *models.UserRequest) (*models.UserResponse, error)
    DeleteUser(id uuid.UUID) error
    GetUserByEmail(email string) (*models.User, error) 
    UpdateCurrentUser(id uuid.UUID, req *models.UserRequest) (*models.UserResponse, error)
	ChangePassword(id uuid.UUID, currentPassword, newPassword string) error
}
type userService struct {
    userRepo repository.UserRepository
    jwtSecret string
}

func NewUserService(userRepo repository.UserRepository, jwtSecret string) UserService {
    return &userService{
        userRepo: userRepo,
        jwtSecret: jwtSecret,
    }
}
func (s *userService) RegisterUser(req *models.UserRequest) (*models.UserResponse, error) {
    existingUser, _ := s.userRepo.GetByEmail(req.Email)
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

    createdUser, err := s.userRepo.Create(user)
    if err != nil {
        return nil, err
    }

    resp := createdUser.ToResponse()
    return &resp, nil
}
func (s *userService) LoginUser(req *models.LoginRequest) (*models.LoginResponse, error) {
    user, err := s.userRepo.GetByEmail(req.Email)
    if err != nil || user == nil {
        return nil, errors.New("invalid email or password")
    }

    if !user.CheckPassword(req.Password) {
        return nil, errors.New("invalid email or password")
    }

    // Update last login time
    now := time.Now()
    user.LastLogin = &now
    s.userRepo.Update(*user) // Update last login (ignore error for now)

    // Generate JWT token
    token, err := s.generateToken(user.ID)
    if err != nil {
        return nil, err
    }

    return &models.LoginResponse{
        Token: token,
        User:  user.ToResponse(),
    }, nil
}
func (s *userService) generateToken(userID uuid.UUID) (string, error) {
    claims := &jwt.RegisteredClaims{
        Subject:   userID.String(),
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    signedToken, err := token.SignedString([]byte(s.jwtSecret))
    if err != nil {
        return "", err
    }

    return signedToken, nil
}

func (s *userService) GetAllUsers() ([]models.UserResponse, error) {
    users, err := s.userRepo.GetAll()
    if err != nil {
        return nil, err
    }

    var userResponses []models.UserResponse
    for _, user := range users {
        userResponses = append(userResponses, user.ToResponse())
    }

    return userResponses, nil
}
// func (s *userService) CreateUser(req *models.UserRequest) (*models.UserResponse, error) {
//     return s.RegisterUser(req)
// }
func (s *userService) GetUser(id uuid.UUID) (*models.UserResponse, error) {
    user, err := s.userRepo.GetByID(id)
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
    user, err := s.userRepo.GetByID(id)
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

    updatedUser, err := s.userRepo.Update(*user)
    if err != nil {
        return nil, err
    }

    resp := updatedUser.ToResponse()
    return &resp, nil
}


func (s *userService) DeleteUser(id uuid.UUID) error {
    user, err := s.userRepo.GetByID(id)
    if err != nil {
        return err
    }
    if user == nil {
        return errors.New("user not found")
    }

    return s.userRepo.Delete(id)
}

func (s *userService) GetUserByEmail(email string) (*models.User, error) {
    return s.userRepo.GetByEmail(email)
}

func (s *userService) UpdateCurrentUser(id uuid.UUID, req *models.UserRequest) (*models.UserResponse, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Check if email is being changed and if it already exists
	if req.Email != user.Email {
		existingUser, _ := s.userRepo.GetByEmail(req.Email)
		if existingUser != nil {
			return nil, errors.New("email already exists")
		}
	}

	// Update user fields (excluding password)
	user.Email = req.Email
	user.FirstName = req.FirstName
	user.LastName = req.LastName

	// Don't update password in profile update - use ChangePassword for that

	updatedUser, err := s.userRepo.Update(*user)
	if err != nil {
		return nil, err
	}

	resp := updatedUser.ToResponse()
	return &resp, nil
}

func (s *userService) ChangePassword(id uuid.UUID, currentPassword, newPassword string) error {
	user, err := s.userRepo.GetByID(id)
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
	_, err = s.userRepo.Update(*user)
	if err != nil {
		return err
	}

	return nil
}