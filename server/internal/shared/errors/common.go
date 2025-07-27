// shared/errors/types.go
package errors

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"hi-cfo/server/internal/logger"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// ErrorCode represents application-specific error codes
type ErrorCode string

const (
	// General errors
	ErrCodeInternal     ErrorCode = "INTERNAL_ERROR"
	ErrCodeInvalidInput ErrorCode = "INVALID_INPUT"
	ErrCodeUnauthorized ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden    ErrorCode = "FORBIDDEN"
	ErrCodeNotFound     ErrorCode = "NOT_FOUND"
	ErrCodeConflict     ErrorCode = "CONFLICT"
	ErrCodeValidation   ErrorCode = "VALIDATION_ERROR"

	// Account-specific errors
	ErrCodeAccountNotFound    ErrorCode = "ACCOUNT_NOT_FOUND"
	ErrCodeInsufficientFunds  ErrorCode = "INSUFFICIENT_FUNDS"
	ErrCodeAccountBlocked     ErrorCode = "ACCOUNT_BLOCKED"
	ErrCodeInvalidAccountType ErrorCode = "INVALID_ACCOUNT_TYPE"

	// Transaction-specific errors
	ErrCodeTransactionNotFound ErrorCode = "TRANSACTION_NOT_FOUND"
	ErrCodeInvalidAmount       ErrorCode = "INVALID_AMOUNT"
	ErrCodeTransactionBlocked  ErrorCode = "TRANSACTION_BLOCKED"

	// User-specific errors
	ErrCodeUserNotFound       ErrorCode = "USER_NOT_FOUND"
	ErrCodeEmailExists        ErrorCode = "EMAIL_EXISTS"
	ErrCodeInvalidCredentials ErrorCode = "INVALID_CREDENTIALS"
)

// AppError represents a custom application error
type AppError struct {
	Code       ErrorCode      `json:"code"`
	Message    string         `json:"message"`
	Details    map[string]any `json:"details,omitempty"`
	StatusCode int            `json:"-"`
	Err        error          `json:"-"`
	Domain     string         `json:"-"`
	UserID     *uuid.UUID     `json:"-"`
	RequestID  string         `json:"-"`
	Timestamp  time.Time      `json:"-"`
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (caused by: %v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap returns the wrapped error
func (e *AppError) Unwrap() error {
	return e.Err
}

// MarshalJSON customizes JSON serialization
func (e *AppError) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		Code    ErrorCode              `json:"code"`
		Message string                 `json:"message"`
		Details map[string]interface{} `json:"details,omitempty"`
	}{
		Code:    e.Code,
		Message: e.Message,
		Details: e.Details,
	})
}

// ValidationError represents validation errors
type ValidationError struct {
	Field   string `json:"field"`
	Value   string `json:"value"`
	Message string `json:"message"`
}

// ValidationErrors represents multiple validation errors
type ValidationErrors struct {
	Errors []ValidationError `json:"errors"`
}

func (v *ValidationErrors) Error() string {
	return fmt.Sprintf("validation failed with %d errors", len(v.Errors))
}

// ===== ERROR CONSTRUCTORS =====

// New creates a new AppError
func New(code ErrorCode, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: getStatusCode(code),
		Timestamp:  time.Now(),
	}
}

// Newf creates a new AppError with formatted message
func Newf(code ErrorCode, format string, args ...interface{}) *AppError {
	return &AppError{
		Code:       code,
		Message:    fmt.Sprintf(format, args...),
		StatusCode: getStatusCode(code),
		Timestamp:  time.Now(),
	}
}

func Is(err error, code ErrorCode) bool {
	if appErr, ok := err.(*AppError); ok {
		return appErr.Code == code
	}
	return false
}

// Wrap wraps an existing error with additional context
func Wrap(err error, code ErrorCode, message string) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: getStatusCode(code),
		Err:        err,
		Timestamp:  time.Now(),
	}
}

// WithDetails adds details to an error
func (e *AppError) WithDetails(details map[string]interface{}) *AppError {
	e.Details = details
	return e
}

// WithDetail adds a single detail to an error
func (e *AppError) WithDetail(key string, value interface{}) *AppError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// WithDomain sets the domain context for the error
func (e *AppError) WithDomain(domain string) *AppError {
	e.Domain = domain
	return e
}

// WithUserID sets the user context for the error
func (e *AppError) WithUserID(userID uuid.UUID) *AppError {
	e.UserID = &userID
	return e
}

// WithRequestID sets the request context for the error
func (e *AppError) WithRequestID(requestID string) *AppError {
	e.RequestID = requestID
	return e
}

// Log logs the error with structured logging
func (e *AppError) Log() {
	logEntry := logger.DefaultLogger.WithFields(logrus.Fields{
		"error_code":  e.Code,
		"status_code": e.StatusCode,
		"timestamp":   e.Timestamp,
	})

	if e.Domain != "" {
		logEntry = logEntry.WithField("domain", e.Domain)
	}
	if e.UserID != nil {
		logEntry = logEntry.WithField("user_id", e.UserID.String())
	}
	if e.RequestID != "" {
		logEntry = logEntry.WithField("request_id", e.RequestID)
	}
	if e.Details != nil {
		logEntry = logEntry.WithField("error_details", e.Details)
	}

	if e.StatusCode >= 500 {
		if e.Err != nil {
			logEntry.WithError(e.Err).Error(e.Message)
		} else {
			logEntry.Error(e.Message)
		}
	} else {
		logEntry.Warn(e.Message)
	}
}

// LogWithContext logs the error with additional context
func (e *AppError) LogWithContext(fields logrus.Fields) {
	logEntry := logger.DefaultLogger.WithFields(fields)

	logEntry = logEntry.WithFields(logrus.Fields{
		"error_code":  e.Code,
		"status_code": e.StatusCode,
		"timestamp":   e.Timestamp,
	})

	if e.Domain != "" {
		logEntry = logEntry.WithField("domain", e.Domain)
	}
	if e.UserID != nil {
		logEntry = logEntry.WithField("user_id", e.UserID.String())
	}
	if e.RequestID != "" {
		logEntry = logEntry.WithField("request_id", e.RequestID)
	}
	if e.Details != nil {
		logEntry = logEntry.WithField("error_details", e.Details)
	}

	if e.StatusCode >= 500 {
		if e.Err != nil {
			logEntry.WithError(e.Err).Error(e.Message)
		} else {
			logEntry.Error(e.Message)
		}
	} else {
		logEntry.Warn(e.Message)
	}
}

// ===== HTTP STATUS CODE MAPPING =====

func getStatusCode(code ErrorCode) int {
	switch code {
	case ErrCodeInvalidInput, ErrCodeValidation, ErrCodeInvalidAmount, ErrCodeInvalidAccountType:
		return http.StatusBadRequest
	case ErrCodeUnauthorized, ErrCodeInvalidCredentials:
		return http.StatusUnauthorized
	case ErrCodeForbidden, ErrCodeAccountBlocked, ErrCodeTransactionBlocked:
		return http.StatusForbidden
	case ErrCodeNotFound, ErrCodeAccountNotFound, ErrCodeTransactionNotFound, ErrCodeUserNotFound:
		return http.StatusNotFound
	case ErrCodeConflict, ErrCodeEmailExists, ErrCodeInsufficientFunds:
		return http.StatusConflict
	case ErrCodeInternal:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

// ===== DOMAIN-SPECIFIC ERROR CONSTRUCTORS =====

// Account errors
func NewAccountNotFound(accountID uuid.UUID) *AppError {
	return New(ErrCodeAccountNotFound, "Account not found").
		WithDetail("account_id", accountID)
}

func NewInsufficientFunds(balance, required float64) *AppError {
	return New(ErrCodeInsufficientFunds, "Insufficient funds for transaction").
		WithDetails(map[string]interface{}{
			"current_balance": balance,
			"required_amount": required,
			"shortage":        required - balance,
		})
}

func NewAccountBlocked(accountID uuid.UUID, reason string) *AppError {
	return New(ErrCodeAccountBlocked, "Account is blocked").
		WithDetails(map[string]interface{}{
			"account_id": accountID,
			"reason":     reason,
		})
}

// User errors
func NewUserNotFound(userID uuid.UUID) *AppError {
	return New(ErrCodeUserNotFound, "User not found").
		WithDetail("user_id", userID)
}

func NewEmailExists(email string) *AppError {
	return New(ErrCodeEmailExists, "Email address already exists").
		WithDetail("email", email)
}

func NewInvalidCredentials() *AppError {
	return New(ErrCodeInvalidCredentials, "Invalid email or password")
}

// Transaction errors
func NewTransactionNotFound(transactionID uuid.UUID) *AppError {
	return New(ErrCodeTransactionNotFound, "Transaction not found").
		WithDetail("transaction_id", transactionID)
}

func NewInvalidAmount(amount float64) *AppError {
	return New(ErrCodeInvalidAmount, "Invalid transaction amount").
		WithDetail("amount", amount)
}

// Validation errors
func NewValidationError(errors []ValidationError) *AppError {
	return &AppError{
		Code:       ErrCodeValidation,
		Message:    "Validation failed",
		StatusCode: http.StatusBadRequest,
		Details: map[string]interface{}{
			"validation_errors": errors,
		},
	}
}
