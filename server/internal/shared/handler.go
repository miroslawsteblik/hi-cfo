package shared

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Standard response structures
type Response[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
}

type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details string `json:"details,omitempty"`
}

type PaginatedResponse[T any] struct {
	Success bool  `json:"success"`
	Data    []T   `json:"data"`
	Total   int64 `json:"total"`
	Page    int   `json:"page"`
	Limit   int   `json:"limit"`
	Pages   int   `json:"pages"`
}

// Error codes for consistent error handling
const (
	ErrCodeValidation   = "VALIDATION_ERROR"
	ErrCodeUnauthorized = "UNAUTHORIZED"
	ErrCodeNotFound     = "NOT_FOUND"
	ErrCodeConflict     = "CONFLICT"
	ErrCodeInternal     = "INTERNAL_ERROR"
	ErrCodeBadRequest   = "BAD_REQUEST"
	ErrCodeForbidden    = "FORBIDDEN"
)

// User context constants and types
const (
	userContextKey = "user_context"
)

// UserContext holds basic user info from JWT for request context
type UserContext struct {
	UserID string
	Email  string
	Role   string
}

// User context helper functions
func SetUserContext(c *gin.Context, userCtx *UserContext) {
	c.Set(userContextKey, userCtx)
}

func GetUserContext(c *gin.Context) *UserContext {
	if userCtx, exists := c.Get(userContextKey); exists {
		if ctx, ok := userCtx.(*UserContext); ok {
			return ctx
		}
	}
	return nil
}

func GetUserIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	userCtx := GetUserContext(c)
	if userCtx == nil {
		return uuid.UUID{}, false
	}

	userID, err := uuid.Parse(userCtx.UserID)
	if err != nil {
		return uuid.UUID{}, false
	}

	return userID, true
}

func IsAuthenticated(c *gin.Context) bool {
	return GetUserContext(c) != nil
}

// BaseHandler provides common functionality for all handlers
type BaseHandler struct{}

// GetUserID extracts user ID from context with proper error handling
func (h *BaseHandler) GetUserID(c *gin.Context) (uuid.UUID, error) {
	userID, ok := GetUserIDFromContext(c)
	if !ok {
		return uuid.Nil, errors.New("user not authenticated")
	}

	return userID, nil
}

// ParseUUID parses UUID from URL parameter
func (h *BaseHandler) ParseUUID(c *gin.Context, param string) (uuid.UUID, error) {
	idStr := c.Param(param)
	if idStr == "" {
		return uuid.Nil, errors.New("missing parameter: " + param)
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return uuid.Nil, errors.New("invalid UUID format for parameter: " + param)
	}

	return id, nil
}

// ParseQueryInt parses integer from query parameter
func (h *BaseHandler) ParseQueryInt(c *gin.Context, param string, defaultValue int) (int, error) {
	valueStr := c.Query(param)
	if valueStr == "" {
		return defaultValue, nil
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return 0, errors.New("invalid integer format for parameter: " + param)
	}

	return value, nil
}

// ParseQueryBool parses boolean from query parameter
func (h *BaseHandler) ParseQueryBool(c *gin.Context, param string) (*bool, error) {
	valueStr := c.Query(param)
	if valueStr == "" {
		return nil, nil
	}

	switch valueStr {
	case "true", "1":
		value := true
		return &value, nil
	case "false", "0":
		value := false
		return &value, nil
	default:
		return nil, errors.New("invalid boolean format for parameter: " + param)
	}
}

// Response helpers
func (h *BaseHandler) RespondWithSuccess(c *gin.Context, status int, data any, message ...string) {
	response := Response[any]{
		Success: true,
		Data:    data,
	}

	if len(message) > 0 {
		response.Message = message[0]
	}

	log.Printf("Status code: %d", status)
	// log.Printf("Response data: %v", response.Data)

	if response.Data == nil {
		response.Data = gin.H{} // Ensure Data is never nil
	}
	if response.Message == "" {
		response.Message = "Operation successful"
	}

	c.JSON(status, response)
}

func (h *BaseHandler) RespondWithError(c *gin.Context, status int, message, code string, details ...string) {
	response := ErrorResponse{
		Success: false,
		Error:   message,
		Code:    code,
	}

	if len(details) > 0 && details[0] != "" {
		// Only include details in development or for specific error types
		// In production, you might want to log details but not expose them
		response.Details = details[0]
	}

	c.JSON(status, response)
}

// RespondWithPaginated is a helper function for paginated responses
// Note: This is a function, not a method, because Go methods cannot have type parameters
// func RespondWithPaginated[T any](c *gin.Context, data []T, total int64, page, limit, pages int) {
// 	response := PaginatedResponse[T]{
// 		Success: true,
// 		Data:    data,
// 		Total:   total,
// 		Page:    page,
// 		Limit:   limit,
// 		Pages:   pages,
// 	}

// 	c.JSON(http.StatusOK, response)
// }

// Common error response helpers
func (h *BaseHandler) RespondWithValidationError(c *gin.Context, message string, details ...string) {
	h.RespondWithError(c, http.StatusBadRequest, message, ErrCodeValidation, details...)
}

func (h *BaseHandler) RespondWithUnauthorized(c *gin.Context) {
	h.RespondWithError(c, http.StatusUnauthorized, "Unauthorized access", ErrCodeUnauthorized)
}

func (h *BaseHandler) RespondWithNotFound(c *gin.Context, resource string) {
	h.RespondWithError(c, http.StatusNotFound, resource+" not found", ErrCodeNotFound)
}

func (h *BaseHandler) RespondWithConflict(c *gin.Context, message string) {
	h.RespondWithError(c, http.StatusConflict, message, ErrCodeConflict)
}

func (h *BaseHandler) RespondWithInternalError(c *gin.Context, message string) {
	h.RespondWithError(c, http.StatusInternalServerError, message, ErrCodeInternal)
}

// HandleUserIDExtraction combines user ID extraction with error response
func (h *BaseHandler) HandleUserIDExtraction(c *gin.Context) (uuid.UUID, bool) {
	userID, err := h.GetUserID(c)
	if err != nil {
		h.RespondWithUnauthorized(c)
		return uuid.Nil, false
	}
	return userID, true
}

// HandleUUIDParsing combines UUID parsing with error response
func (h *BaseHandler) HandleUUIDParsing(c *gin.Context, param string) (uuid.UUID, bool) {
	id, err := h.ParseUUID(c, param)
	if err != nil {
		h.RespondWithValidationError(c, err.Error())
		return uuid.Nil, false
	}
	return id, true
}

// BindJSON binds JSON request body with proper error handling
func (h *BaseHandler) BindJSON(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindJSON(obj); err != nil {
		h.RespondWithValidationError(c, "Invalid request body", err.Error())
		return false
	}
	return true
}

// BindQuery binds query parameters with proper error handling
func (h *BaseHandler) BindQuery(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindQuery(obj); err != nil {
		h.RespondWithValidationError(c, "Invalid query parameters", err.Error())
		return false
	}
	return true
}
