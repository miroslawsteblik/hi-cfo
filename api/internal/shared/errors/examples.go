// shared/errors/examples.go
package errors

import (
	"context"
	"database/sql"
	"fmt"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// ===== DOMAIN-SPECIFIC ERROR EXAMPLES =====

// Example 1: Account Service Errors
func ExampleAccountServiceErrors() {
	userID := uuid.New()
	accountID := uuid.New()

	// Example: Account not found with logging
	accountNotFoundErr := NewAccountNotFound(accountID).
		WithDomain("account").
		WithUserID(userID).
		WithRequestID("req-123")

	// Log the error
	accountNotFoundErr.Log()

	// Example: Insufficient funds with detailed context
	insufficientFundsErr := NewInsufficientFunds(100.50, 200.00).
		WithDomain("account").
		WithUserID(userID).
		WithDetail("account_id", accountID).
		WithDetail("attempted_operation", "withdrawal")

	// Log with additional context
	insufficientFundsErr.LogWithContext(logrus.Fields{
		"transaction_type": "withdrawal",
		"merchant":         "ATM_BANK_001",
	})
}

// Example 2: Database Error Handling
func ExampleDatabaseErrorHandling(ctx context.Context, db *gorm.DB, userID uuid.UUID) (*Account, error) {
	var account Account

	err := db.WithContext(ctx).Where("user_id = ? AND id = ?", userID, "some-id").First(&account).Error
	if err != nil {
		switch {
		case err == gorm.ErrRecordNotFound:
			// Convert GORM error to custom error with context
			return nil, NewAccountNotFound(uuid.MustParse("some-id")).
				WithDomain("account").
				WithUserID(userID).
				WithDetail("operation", "get_account")
		case err == sql.ErrConnDone:
			// Database connection error
			return nil, Wrap(err, ErrCodeInternal, "Database connection lost").
				WithDomain("account").
				WithUserID(userID)
		default:
			// Generic database error
			return nil, Wrap(err, ErrCodeInternal, "Database operation failed").
				WithDomain("account").
				WithUserID(userID).
				WithDetail("query", "get_account")
		}
	}

	return &account, nil
}

// Example 3: Business Logic Validation Errors
func ExampleBusinessLogicValidation(userID uuid.UUID, amount float64, accountType string) error {
	// Example: Invalid amount validation
	if amount <= 0 {
		return NewInvalidAmount(amount).
			WithDomain("transaction").
			WithUserID(userID).
			WithDetail("validation_rule", "amount_must_be_positive")
	}

	// Example: Business rule validation
	if accountType == "savings" && amount > 10000 {
		return New(ErrCodeValidation, "Savings account withdrawal exceeds daily limit").
			WithDomain("account").
			WithUserID(userID).
			WithDetails(map[string]interface{}{
				"amount":       amount,
				"limit":        10000,
				"account_type": accountType,
				"rule":         "daily_withdrawal_limit",
			})
	}

	return nil
}

// Example 4: External Service Integration Errors
func ExampleExternalServiceErrors(userID uuid.UUID, bankCode string) error {
	// Simulate external bank API call failure
	externalErr := fmt.Errorf("bank API returned 503: service unavailable")

	return Wrap(externalErr, ErrCodeInternal, "External bank service unavailable").
		WithDomain("integration").
		WithUserID(userID).
		WithDetails(map[string]interface{}{
			"bank_code":   bankCode,
			"service":     "account_verification",
			"retry_after": "300s",
		})
}

// Example 5: Authentication and Authorization Errors
func ExampleAuthErrors(userID uuid.UUID, requiredRole string, userRole string) error {
	if userRole != requiredRole {
		return New(ErrCodeForbidden, "Insufficient permissions for this operation").
			WithDomain("auth").
			WithUserID(userID).
			WithDetails(map[string]interface{}{
				"required_role": requiredRole,
				"user_role":     userRole,
				"operation":     "admin_dashboard_access",
			})
	}

	return nil
}

// Example 6: Rate Limiting Errors
func ExampleRateLimitError(userID uuid.UUID, operation string) error {
	return New(ErrCodeValidation, "Rate limit exceeded").
		WithDomain("rate_limit").
		WithUserID(userID).
		WithDetails(map[string]interface{}{
			"operation":     operation,
			"limit":         "100 requests per hour",
			"reset_time":    "2024-01-01T15:00:00Z",
			"current_count": 101,
		})
}

// Example 7: File Processing Errors
func ExampleFileProcessingError(userID uuid.UUID, fileName string, fileSize int64) error {
	if fileSize > 10*1024*1024 { // 10MB
		return New(ErrCodeInvalidInput, "File size exceeds maximum limit").
			WithDomain("file_processing").
			WithUserID(userID).
			WithDetails(map[string]interface{}{
				"file_name":       fileName,
				"file_size_bytes": fileSize,
				"max_size_bytes":  10 * 1024 * 1024,
				"file_type":       "OFX",
			})
	}

	return nil
}

// Example 8: Concurrent Access Errors
func ExampleConcurrencyError(userID uuid.UUID, resourceID string) error {
	return New(ErrCodeConflict, "Resource is being modified by another process").
		WithDomain("concurrency").
		WithUserID(userID).
		WithDetails(map[string]interface{}{
			"resource_id":     resourceID,
			"resource_type":   "account",
			"lock_holder":     "process_123",
			"retry_suggested": true,
		})
}

// Example 9: Configuration Errors
func ExampleConfigurationError(service string, configKey string) error {
	return New(ErrCodeInternal, "Required configuration missing").
		WithDomain("config").
		WithDetails(map[string]interface{}{
			"service":    service,
			"config_key": configKey,
			"env_var":    fmt.Sprintf("%s_%s", service, configKey),
		})
}

// Example 10: Error Chain Example
func ExampleErrorChain(ctx context.Context, userID uuid.UUID) error {
	// Simulate a chain of errors
	originalErr := fmt.Errorf("network timeout")

	// Wrap at database layer
	dbErr := Wrap(originalErr, ErrCodeInternal, "Failed to connect to database").
		WithDomain("database").
		WithDetail("timeout_seconds", 30)

	// Wrap at service layer
	serviceErr := Wrap(dbErr, ErrCodeInternal, "Account service unavailable").
		WithDomain("account").
		WithUserID(userID).
		WithDetail("operation", "get_accounts")

	// Log the complete error chain
	serviceErr.LogWithContext(logrus.Fields{
		"caller":  "AccountService.GetAccounts",
		"attempt": 3,
	})

	return serviceErr
}

// Account struct for examples
type Account struct {
	ID      uuid.UUID `json:"id"`
	UserID  uuid.UUID `json:"user_id"`
	Name    string    `json:"name"`
	Balance float64   `json:"balance"`
}
