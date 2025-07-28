package user

import (
	"net/http"

	"hi-cfo/api/internal/shared"

	"hi-cfo/api/internal/logger"
	customerrors "hi-cfo/api/internal/shared/errors"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type UserHandler struct {
	shared.BaseHandler
	userService *UserService
	logger      *logrus.Entry
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(userService *UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
		logger:      logger.WithDomain("user"),
	}
}

// RegisterUser godoc
// @Summary Register a new user
// @Description Create a new user account with email and password
// @Tags Authentication
// @Accept json
// @Produce json
// @Param user body UserRequest true "User registration data"
// @Success 201 {object} shared.Response[UserResponse] "User created successfully"
// @Failure 400 {object} shared.ErrorResponse "Invalid request data"
// @Failure 409 {object} shared.ErrorResponse "Email already exists"
// @Failure 500 {object} shared.ErrorResponse "Internal server error"
// @Router /auth/register [post]
func (h *UserHandler) RegisterUser(c *gin.Context) {
	var req UserRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"email":      req.Email,
		"first_name": req.FirstName,
		"last_name":  req.LastName,
	}).Debug("Registering new user")

	result, err := h.userService.RegisterUser(&req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"email": req.Email,
			"error": err.Error(),
		}).Error("Unexpected error during user registration")
		h.RespondWithInternalError(c, "Registration failed")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": result.ID,
		"email":   result.Email,
	}).Info("User registered successfully")

	h.RespondWithSuccess(c, http.StatusCreated, result, "User registered successfully")
}

// LoginUser godoc
// @Summary Login user
// @Description Authenticate user with email and password
// @Tags Authentication
// @Accept json
// @Produce json
// @Param credentials body LoginRequest true "Login credentials"
// @Success 200 {object} map[string]interface{} "Login successful"
// @Failure 400 {object} shared.ErrorResponse "Invalid request data"
// @Failure 401 {object} shared.ErrorResponse "Invalid credentials"
// @Failure 500 {object} shared.ErrorResponse "Internal server error"
// @Router /auth/login [post]
func (h *UserHandler) LoginUser(c *gin.Context) {
	var req LoginRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithField("email", req.Email).Debug("User login attempt")

	response, err := h.userService.LoginUser(&req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"email": req.Email,
			"error": err.Error(),
		}).Error("Unexpected error during user login")
		h.RespondWithUnauthorized(c)
		return
	}

	h.logger.WithField("email", req.Email).Info("User login successful")
	h.RespondWithSuccess(c, http.StatusOK, response, "Login successful")
}

func (h *UserHandler) LogoutUser(c *gin.Context) {
	// For stateless JWT, logout is handled client-side
	// Could add token blacklisting here if needed
	h.RespondWithSuccess(c, http.StatusOK, nil, "Logged out successfully")
}

func (h *UserHandler) GetAllUsers(c *gin.Context) {
	h.logger.Debug("Getting all users")

	users, err := h.userService.GetAllUsers()
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithField("error", err.Error()).Error("Unexpected error retrieving all users")
		h.RespondWithInternalError(c, "Failed to retrieve users")
		return
	}

	h.logger.WithField("user_count", len(users)).Info("Successfully retrieved all users")
	h.RespondWithSuccess(c, http.StatusOK, users)
}

// CreateUser handles POST /api/users (admin endpoint)
func (h *UserHandler) CreateUser(c *gin.Context) {
	// This is essentially the same as RegisterUser but for admin use
	// Could be consolidated or use a common helper
	var req UserRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"email":      req.Email,
		"first_name": req.FirstName,
		"last_name":  req.LastName,
		"action":     "admin_create",
	}).Debug("Admin creating new user")

	user, err := h.userService.RegisterUser(&req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"email": req.Email,
			"error": err.Error(),
		}).Error("Unexpected error during admin user creation")
		h.RespondWithInternalError(c, "Failed to create user")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": user.ID,
		"email":   user.Email,
		"action":  "admin_create",
	}).Info("User created successfully by admin")

	h.RespondWithSuccess(c, http.StatusCreated, user, "User created successfully")
}

func (h *UserHandler) GetUser(c *gin.Context) {
	userID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithField("user_id", userID).Debug("Getting user by ID")

	user, err := h.userService.GetUser(userID)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id": userID,
			"error":   err.Error(),
		}).Error("Unexpected error getting user")
		h.RespondWithInternalError(c, "Failed to retrieve user")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, user)
}

// UpdateUser handles PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	var req UserRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"email":   req.Email,
	}).Debug("Updating user")

	user, err := h.userService.UpdateUser(userID, &req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id": userID,
			"error":   err.Error(),
		}).Error("Unexpected error updating user")
		h.RespondWithInternalError(c, "Failed to update user")
		return
	}

	h.logger.WithField("user_id", userID).Info("User updated successfully")
	h.RespondWithSuccess(c, http.StatusOK, user, "User updated successfully")
}

// DeleteUser handles DELETE /api/users/:id
func (h *UserHandler) DeleteUser(c *gin.Context) {
	userID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithField("user_id", userID).Debug("Deleting user")

	if err := h.userService.DeleteUser(userID); err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id": userID,
			"error":   err.Error(),
		}).Error("Unexpected error deleting user")
		h.RespondWithInternalError(c, "Failed to delete user")
		return
	}

	h.logger.WithField("user_id", userID).Info("User deleted successfully")
	h.RespondWithSuccess(c, http.StatusNoContent, nil, "User deleted successfully")
}

// Current user methods GET /api/v1/me
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	h.logger.WithField("user_id", userID).Debug("Getting current user profile")

	user, err := h.userService.GetUser(userID)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id": userID,
			"error":   err.Error(),
		}).Error("Unexpected error getting current user")
		h.RespondWithInternalError(c, "Failed to retrieve user")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, user)
}

// UpdateCurrentUser handles PUT /api/v1/me
func (h *UserHandler) UpdateCurrentUser(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Use models.UserRequest directly instead of intermediate struct
	var req UserRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"email":   req.Email,
	}).Debug("Updating current user profile")

	updatedUser, err := h.userService.UpdateCurrentUser(userID, &req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id": userID,
			"error":   err.Error(),
		}).Error("Unexpected error updating current user profile")
		h.RespondWithInternalError(c, "Failed to update profile")
		return
	}

	h.logger.WithField("user_id", userID).Info("User profile updated successfully")
	h.RespondWithSuccess(c, http.StatusOK, updatedUser, "Profile updated successfully")
}

// DeleteCurrentUser handles DELETE /api/v1/me
func (h *UserHandler) DeleteCurrentUser(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	h.logger.WithField("user_id", userID).Debug("Deleting current user account")

	if err := h.userService.DeleteUser(userID); err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id": userID,
			"error":   err.Error(),
		}).Error("Unexpected error deleting current user account")
		h.RespondWithInternalError(c, "Failed to delete account")
		return
	}

	h.logger.WithField("user_id", userID).Info("User account deleted successfully")
	h.RespondWithSuccess(c, http.StatusOK, nil, "Account deleted successfully")
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=6"`
		ConfirmPassword string `json:"confirm_password" binding:"required"`
	}

	if !h.BindJSON(c, &req) {
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		h.RespondWithValidationError(c, "New password and confirm password do not match", "")
		return
	}

	h.logger.WithField("user_id", userID).Debug("Changing user password")

	err := h.userService.ChangePassword(userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id": userID,
			"error":   err.Error(),
		}).Error("Unexpected error changing password")
		h.RespondWithInternalError(c, "Failed to change password")
		return
	}

	h.logger.WithField("user_id", userID).Info("Password changed successfully")
	h.RespondWithSuccess(c, http.StatusOK, nil, "Password changed successfully")
}
