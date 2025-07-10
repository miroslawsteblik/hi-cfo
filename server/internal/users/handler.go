package users

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"hi-cfo/server/internal/ginctx"
	"hi-cfo/server/internal/models"
)

type UserHandler interface {
    RegisterUser(c *gin.Context)
    LoginUser(c *gin.Context)
    LogoutUser(c *gin.Context) 
    GetAllUsers(c *gin.Context)
    CreateUser(c *gin.Context)
    GetUser(c *gin.Context)
    UpdateUser(c *gin.Context)
    DeleteUser(c *gin.Context)
    GetCurrentUser(c *gin.Context)
    UpdateCurrentUser(c *gin.Context)
    DeleteCurrentUser(c *gin.Context)
    ChangePassword(c *gin.Context)
}

type userHandler struct {
	userService UserService
	validator   *validator.Validate
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(userService UserService) UserHandler {
	return &userHandler{
		userService: userService,
		validator:   validator.New(),
	}
}

func (h *userHandler) RegisterUser(c *gin.Context) {
	var req models.UserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	result, err := h.userService.RegisterUser(&req)
	if err != nil {
		switch err.Error() {
		case "user already exists":
			c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Registration failed"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    result,
	})
}

func (h *userHandler) LoginUser(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	response, err := h.userService.LoginUser(&req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *userHandler) LogoutUser(c *gin.Context) {
	// For stateless JWT, logout is handled client-side
	// Could add token blacklisting here if needed
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *userHandler) GetAllUsers(c *gin.Context) {
	users, err := h.userService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// CreateUser handles POST /api/users
func (h *userHandler) CreateUser(c *gin.Context) {
	var req models.UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	user, err := h.userService.RegisterUser(&req)
	if err != nil {
		switch err.Error() {
		case "user already exists":
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		}
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *userHandler) GetUser(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	user, err := h.userService.GetUser(userID)
	if err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		}
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateUser handles PUT /api/users/:id
func (h *userHandler) UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	var req models.UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	user, err := h.userService.UpdateUser(userID, &req)
	if err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		case "email already exists":
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		}
		return
	}
	c.JSON(http.StatusOK, user)
}

// DeleteUser handles DELETE /api/users/:id
func (h *userHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	userID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	if err := h.userService.DeleteUser(userID); err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		}
		return
	}
	c.Status(http.StatusNoContent)
}

// Current user methods using the new context utilities
func (h *userHandler) GetCurrentUser(c *gin.Context) {
	// Step 1: Get user ID from Gin context (set by auth middleware)
	userID, ok := ginctx.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Step 2: Use the user ID to fetch full User model from database via service
	user, err := h.userService.GetUser(userID)
	if err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		}
		return
	}

	// Step 3: Return the full User model
	c.JSON(http.StatusOK, user)
}

// UpdateCurrentUser handles PUT /api/v1/me
func (h *userHandler) UpdateCurrentUser(c *gin.Context) {
	// Step 1: Get user ID from context
	userID, ok := ginctx.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Step 2: Bind request data
	var req struct {
		FirstName string `json:"first_name" validate:"required"`
		LastName  string `json:"last_name" validate:"required"`
		Email     string `json:"email" validate:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Step 3: Convert to UserRequest
	userReq := &models.UserRequest{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
	}

	// Step 4: Update via service
	updatedUser, err := h.userService.UpdateCurrentUser(userID, userReq)
	if err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		case "email already exists":
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    updatedUser,
	})
}

// DeleteCurrentUser handles DELETE /api/v1/me
func (h *userHandler) DeleteCurrentUser(c *gin.Context) {
	userID, ok := ginctx.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := h.userService.DeleteUser(userID); err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}

func (h *userHandler) ChangePassword(c *gin.Context) {
	userID, ok := ginctx.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" validate:"required"`
		NewPassword     string `json:"new_password" validate:"required,min=6"`
		ConfirmPassword string `json:"confirm_password" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password and confirm password do not match"})
		return
	}

	err := h.userService.ChangePassword(userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		switch err.Error() {
		case "user not found":
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		case "invalid current password":
			c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is incorrect"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change password"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
