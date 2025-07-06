package handlers

import (
	"net/http"

	"hi-cfo/server/internal/models"
	"hi-cfo/server/internal/services"

    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"
    "github.com/google/uuid"
)

type UserHandler struct {
    userService services.UserService
    validator *validator.Validate
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(userService services.UserService) *UserHandler {
    return &UserHandler{
        userService: userService,
        validator: validator.New(),
    }
}
// Register handles user registration
func (h *UserHandler) Register(c *gin.Context) {
    var req models.UserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
        return
    }
    
    if err := h.validator.Struct(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
        return
    }
    
    // Use the service method directly
    createdUser, err := h.userService.RegisterUser(&req)
    if err != nil {
        if err.Error() == "user already exists" {
            c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{"user": createdUser})
}
func (h *UserHandler) Login(c *gin.Context) {
    var req models.LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if err := h.validator.Struct(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    response, err := h.userService.LoginUser(&req)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, response)
}
// GetAllUsers handles GET /api/users
func (h *UserHandler) GetAllUsers(c *gin.Context) {
    users, err := h.userService.GetAllUsers()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
        return
    }
    c.JSON(http.StatusOK, users)
}
// CreateUser handles POST /api/users
func (h *UserHandler) CreateUser(c *gin.Context) {
    var req models.UserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
        return
    }

    if err := h.validator.Struct(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
        return
    }

    user, err := h.userService.CreateUser(&req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
        return
    }
    c.JSON(http.StatusCreated, user)
}
func (h *UserHandler) GetUser(c *gin.Context) {
    idStr := c.Param("id")
    uuidID, err := uuid.Parse(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    user, err := h.userService.GetUser(uuidID)
    if err != nil {
        if err.Error() == "user not found" {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
        return
    }
    c.JSON(http.StatusOK, user)
}

// UpdateUser handles PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
    idStr := c.Param("id")
    uuidID, err := uuid.Parse(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    var req models.UserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
        return
    }

    if err := h.validator.Struct(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
        return
    }

    user, err := h.userService.UpdateUser(uuidID, &req)
    if err != nil {
        if err.Error() == "user not found" {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
        return
    }
    c.JSON(http.StatusOK, user)
}
// DeleteUser handles DELETE /api/users/:id
func (h *UserHandler) DeleteUser(c *gin.Context) {
    idStr := c.Param("id")
    uuidID, err := uuid.Parse(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    if err := h.userService.DeleteUser(uuidID); err != nil {
        if err.Error() == "user not found" {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
        return
    }
    c.Status(http.StatusNoContent)
}