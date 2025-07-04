package services

import (
    "hi-cfo/server/internal/models"
    "hi-cfo/server/internal/repository"
)

type UserService struct {
    userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
    return &UserService{userRepo: userRepo}
}

func (s *UserService) CreateUser(req models.CreateUserRequest) (*models.User, error) {
    // Add business logic here (validation, etc.)
    return s.userRepo.Create(req)
}

func (s *UserService) GetUser(id int) (*models.User, error) {
    return s.userRepo.GetByID(id)
}

func (s *UserService) GetAllUsers() ([]models.User, error) {
    return s.userRepo.GetAll()
}

func (s *UserService) UpdateUser(id int, req models.UpdateUserRequest) (*models.User, error) {
    return s.userRepo.Update(id, req)
}

func (s *UserService) DeleteUser(id int) error {
    return s.userRepo.Delete(id)
}