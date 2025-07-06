package services

import (
	"errors"
	"hi-cfo/server/internal/models"
	"hi-cfo/server/internal/repository"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type UserService interface {
	RegisterUser(req *models.UserRequest) (*models.UserResponse, error)
	LoginUser(req *models.LoginRequest) (*models.LoginResponse, error)
	GetAllUsers() ([]models.UserResponse, error)
	CreateUser(req *models.UserRequest) (*models.UserResponse, error)
	GetUser(id uint) (*models.UserResponse, error)
	UpdateUser(id uint, req *models.UserRequest) (*models.UserResponse, error)
	DeleteUser(id uint) error
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
    // Create a new user
    user := models.User{
        Email:     req.Email,
        Password:  req.Password,
        FirstName: req.FirstName,
        LastName:  req.LastName,
        Role: "user", // Default role
    }

    if err := user.HashPassword(); err != nil {
        return nil, err
    }

    if _, err := s.userRepo.Create(user); err != nil {
        return nil, err
    }

    resp := user.ToResponse()
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
func (s *userService) generateToken(userID uint) (string, error) {
    claims := &jwt.RegisteredClaims{
        Subject: strconv.Itoa(int(userID)),
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // Token valid for 24 hours
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
func (s *userService) CreateUser(req *models.UserRequest) (*models.UserResponse, error) {
    return s.RegisterUser(req)
}
func (s *userService) GetUser(id uint) (*models.UserResponse, error) {
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
func (s *userService) UpdateUser(id uint, req *models.UserRequest) (*models.UserResponse, error) {
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
        user.Password = req.Password
        if err := user.HashPassword(); err != nil {
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
func (s *userService) DeleteUser(id uint) error {
    user, err := s.userRepo.GetByID(id)
    if err != nil {
        return err
    }
    if user == nil {
        return errors.New("user not found")
    }

    return s.userRepo.Delete(id)
}