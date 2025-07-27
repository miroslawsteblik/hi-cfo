package errors

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"net/http"
)

// ErrorHandler middleware handles all errors in a consistent way
func ErrorHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there are any errors
		if len(c.Errors) == 0 {
			return
		}

		err := c.Errors.Last().Err

		// Handle different error types
		switch e := err.(type) {
		case *AppError:
			handleAppError(c, e, logger)
		case *ValidationErrors:
			handleValidationErrors(c, e, logger)
		default:
			handleGenericError(c, err, logger)
		}
	}
}

func handleAppError(c *gin.Context, err *AppError, logger *logrus.Logger) {
	// Set request context if not already set
	if err.RequestID == "" {
		err.RequestID = c.GetString("request_id")
	}
	if err.UserID == nil {
		if userID := c.GetString("user_id"); userID != "" {
			if uuid, parseErr := uuid.Parse(userID); parseErr == nil {
				err.UserID = &uuid
			}
		}
	}

	// Log with enhanced context from HTTP request
	err.LogWithContext(logrus.Fields{
		"path":       c.Request.URL.Path,
		"method":     c.Request.Method,
		"client_ip":  c.ClientIP(),
		"user_agent": c.Request.UserAgent(),
	})

	// Send error response
	c.JSON(err.StatusCode, err)
}

func handleValidationErrors(c *gin.Context, err *ValidationErrors, logger *logrus.Logger) {
	logger.WithFields(logrus.Fields{
		"path":        c.Request.URL.Path,
		"method":      c.Request.Method,
		"error_count": len(err.Errors),
	}).Info("Validation errors occurred")

	c.JSON(http.StatusBadRequest, gin.H{
		"code":    ErrCodeValidation,
		"message": "Validation failed",
		"errors":  err.Errors,
	})
}

func handleGenericError(c *gin.Context, err error, logger *logrus.Logger) {
	// Create AppError from generic error
	appErr := Wrap(err, ErrCodeInternal, "Internal server error").
		WithRequestID(c.GetString("request_id"))

	// Set user context if available
	if userID := c.GetString("user_id"); userID != "" {
		if uuid, parseErr := uuid.Parse(userID); parseErr == nil {
			appErr = appErr.WithUserID(uuid)
		}
	}

	// Log with request context
	appErr.LogWithContext(logrus.Fields{
		"path":       c.Request.URL.Path,
		"method":     c.Request.Method,
		"client_ip":  c.ClientIP(),
		"user_agent": c.Request.UserAgent(),
		"error_type": fmt.Sprintf("%T", err),
	})

	c.JSON(appErr.StatusCode, appErr)
}
