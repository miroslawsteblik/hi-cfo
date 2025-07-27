package account

import (
	"context"
	"fmt"
	"hi-cfo/server/internal/logger"
	"hi-cfo/server/internal/shared/errors"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type AccountStore interface {
	GetAccounts(ctx context.Context, userID uuid.UUID, filter AccountFilter) (*AccountResponse, error)
	CreateAccount(ctx context.Context, userID uuid.UUID, request *CreateAccountRequest) (*Account, error)
	GetAccountByID(ctx context.Context, userID, accountID uuid.UUID) (*Account, error)
	UpdateAccount(ctx context.Context, userID, accountID uuid.UUID, request *UpdateAccountRequest) (*Account, error)
	DeleteAccount(ctx context.Context, userID, accountID uuid.UUID) error
	GetAccountSummary(ctx context.Context, userID uuid.UUID) (*AccountSummary, error)
	ValidateAccount(account *Account) error
	ValidateAccountRequest(req *CreateAccountRequest) error
}

type CreateAccountRequest struct {
	AccountName         string   `json:"account_name" binding:"required,min=1,max=100"`
	AccountNumberMasked *string  `json:"account_number_masked,omitempty" binding:"omitempty,max=20"`
	AccountType         string   `json:"account_type" binding:"required,oneof=checking savings credit_card investment loan other"`
	BankName            string   `json:"bank_name" binding:"required,min=1,max=100"`
	RoutingNumber       *string  `json:"routing_number,omitempty" binding:"omitempty,max=20"`
	CurrentBalance      *float64 `json:"current_balance,omitempty"`
	Currency            *string  `json:"currency,omitempty" binding:"omitempty,len=3"`
}

type UpdateAccountRequest struct {
	AccountName         *string  `json:"account_name,omitempty" binding:"omitempty,min=1,max=100"`
	AccountNumberMasked *string  `json:"account_number_masked,omitempty" binding:"omitempty,max=20"`
	AccountType         *string  `json:"account_type,omitempty" binding:"omitempty,oneof=checking savings credit_card investment loan other"`
	BankName            *string  `json:"bank_name,omitempty" binding:"omitempty,min=1,max=100"`
	RoutingNumber       *string  `json:"routing_number,omitempty" binding:"omitempty,max=20"`
	IsActive            *bool    `json:"is_active,omitempty"`
	CurrentBalance      *float64 `json:"current_balance,omitempty"`
	Currency            *string  `json:"currency,omitempty" binding:"omitempty,len=3"`
}

type AccountService struct {
	repo   Repository
	logger *logrus.Entry
}

func NewAccountService(repo Repository) *AccountService {
	return &AccountService{
		repo:   repo,
		logger: logger.WithDomain("account"),
	}
}

// ========================================
// CRUD OPERATIONS
// ========================================

func (s *AccountService) GetAccounts(ctx context.Context, userID uuid.UUID, filter AccountFilter) (*AccountResponse, error) {
	s.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"filter":  filter,
	}).Debug("Getting accounts for user")

	result, err := s.repo.GetAccounts(ctx, userID, filter)
	if err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to retrieve accounts").
			WithDomain("account").
			WithUserID(userID).
			WithDetails(map[string]any{
				"filter":    filter,
				"operation": "get_accounts",
			})

		appErr.Log()
		return nil, appErr
	}

	s.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"count":   len(result.Data),
		"total":   result.Total,
	}).Info("Successfully retrieved accounts")

	return result, nil
}

func (s *AccountService) GetAccountByID(ctx context.Context, userID, accountID uuid.UUID) (*Account, error) {
	s.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"account_id": accountID,
	}).Debug("Getting account by ID")

	account, err := s.repo.GetAccountByID(ctx, userID, accountID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			appErr := errors.NewAccountNotFound(accountID).
				WithDomain("account").
				WithUserID(userID)
			appErr.Log()
			return nil, appErr
		}
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to retrieve account").
			WithDomain("account").
			WithUserID(userID).
			WithDetail("account_id", accountID)
		appErr.Log()
		return nil, appErr
	}

	return account, nil
}

func (s *AccountService) CreateAccount(ctx context.Context, userID uuid.UUID, request *CreateAccountRequest) (*Account, error) {
	s.logger.WithFields(logrus.Fields{
		"user_id":      userID,
		"account_name": request.AccountName,
		"account_type": request.AccountType,
	}).Debug("Creating new account")

	exists, err := s.repo.CheckAccountExists(ctx, userID, request.AccountName)
	if err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to check account existence").
			WithDomain("account").
			WithUserID(userID).
			WithDetail("account_name", request.AccountName)
		appErr.Log()
		return nil, appErr
	}
	if exists {
		appErr := errors.New(errors.ErrCodeConflict, fmt.Sprintf("Account with name '%s' already exists", request.AccountName)).
			WithDomain("account").
			WithUserID(userID).
			WithDetail("account_name", request.AccountName)
		appErr.Log()
		return nil, appErr
	}

	// Create account from request
	account := &Account{
		UserID:              userID,
		AccountName:         request.AccountName,
		AccountNumberMasked: request.AccountNumberMasked,
		AccountType:         request.AccountType,
		BankName:            request.BankName,
		RoutingNumber:       request.RoutingNumber,
		IsActive:            true, // Default to active
		CurrentBalance:      request.CurrentBalance,
		Currency:            "USD", // Default currency
	}

	// Override currency if provided
	if request.Currency != nil {
		account.Currency = *request.Currency
	}

	if err := s.ValidateAccount(account); err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeValidation, "Account validation failed").
			WithDomain("account").
			WithUserID(userID).
			WithDetails(map[string]interface{}{
				"account_name": request.AccountName,
				"account_type": request.AccountType,
			})
		appErr.Log()
		return nil, appErr
	}

	if err := s.repo.CreateAccount(ctx, account); err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to create account in database").
			WithDomain("account").
			WithUserID(userID).
			WithDetails(map[string]interface{}{
				"account_name": request.AccountName,
				"account_type": request.AccountType,
			})
		appErr.Log()
		return nil, appErr
	}

	s.logger.WithFields(logrus.Fields{
		"user_id":      userID,
		"account_id":   account.ID,
		"account_name": account.AccountName,
	}).Info("Account created successfully")

	return account, nil
}

func (s *AccountService) UpdateAccount(ctx context.Context, userID, accountID uuid.UUID, req *UpdateAccountRequest) (*Account, error) {
	// Check if account exists
	existingAccount, err := s.repo.GetAccountByID(ctx, userID, accountID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			appErr := errors.NewAccountNotFound(accountID).
				WithDomain("account").
				WithUserID(userID)
			appErr.Log()
			return nil, appErr
		}
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to retrieve account").
			WithDomain("account").
			WithUserID(userID).
			WithDetail("account_id", accountID)
		appErr.Log()
		return nil, appErr
	}

	updates := make(map[string]any)

	if req.AccountName != nil {
		// Check for duplicate account name (excluding current account)
		if *req.AccountName != existingAccount.AccountName {
			exists, err := s.repo.CheckAccountExists(ctx, userID, *req.AccountName)
			if err != nil {
				appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to check account name availability").
					WithDomain("account").
					WithUserID(userID).
					WithDetails(map[string]any{
						"account_id":       accountID,
						"new_account_name": *req.AccountName,
					})
				appErr.Log()
				return nil, appErr
			}
			if exists {
				appErr := errors.New(errors.ErrCodeConflict, fmt.Sprintf("Account with name '%s' already exists", *req.AccountName)).
					WithDomain("account").
					WithUserID(userID).
					WithDetails(map[string]interface{}{
						"account_id":       accountID,
						"conflicting_name": *req.AccountName,
					})
				appErr.Log()
				return nil, appErr
			}
		}
		updates["account_name"] = *req.AccountName
	}
	if req.AccountNumberMasked != nil {
		updates["account_number_masked"] = *req.AccountNumberMasked
	}
	if req.AccountType != nil {
		updates["account_type"] = *req.AccountType
	}
	if req.BankName != nil {
		updates["bank_name"] = *req.BankName
	}
	if req.RoutingNumber != nil {
		updates["routing_number"] = *req.RoutingNumber
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.CurrentBalance != nil {
		updates["current_balance"] = *req.CurrentBalance
	}
	if req.Currency != nil {
		updates["currency"] = *req.Currency
	}

	updatedAccount, err := s.repo.UpdateAccount(ctx, userID, accountID, updates)
	if err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to update account").
			WithDomain("account").
			WithUserID(userID).
			WithDetails(map[string]interface{}{
				"account_id": accountID,
				"updates":    updates,
			})
		appErr.Log()
		return nil, appErr
	}

	s.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"account_id":    accountID,
		"updates_count": len(updates),
	}).Info("Account updated successfully")

	return updatedAccount, nil
}

// DeleteAccount deletes an account by ID for a user.
func (s *AccountService) DeleteAccount(ctx context.Context, userID, accountID uuid.UUID) error {
	s.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"account_id": accountID,
	}).Debug("Deleting account")

	// TODO: Check if account has transactions before allowing deletion
	// For now, we'll allow deletion
	err := s.repo.DeleteAccount(ctx, userID, accountID)
	if err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to delete account").
			WithDomain("account").
			WithUserID(userID).
			WithDetail("account_id", accountID)
		appErr.Log()
		return appErr
	}

	s.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"account_id": accountID,
	}).Info("Account deleted successfully")

	return nil
}

// GetAccountSummary retrieves account summary statistics for a user.
func (s *AccountService) GetAccountSummary(ctx context.Context, userID uuid.UUID) (*AccountSummary, error) {
	s.logger.WithField("user_id", userID).Debug("Getting account summary")

	summary, err := s.repo.GetAccountSummary(ctx, userID)
	if err != nil {
		appErr := errors.Wrap(err, errors.ErrCodeInternal, "Failed to retrieve account summary").
			WithDomain("account").
			WithUserID(userID)
		appErr.Log()
		return nil, appErr
	}

	s.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"total_accounts": summary.TotalAccounts,
	}).Info("Account summary retrieved successfully")

	return summary, nil
}

// ValidateAccount checks if the account has valid data.
func (s *AccountService) ValidateAccount(account *Account) error {
	if account.AccountName == "" {
		return fmt.Errorf("account name is required")
	}

	if account.AccountType == "" {
		return fmt.Errorf("account type is required")
	}

	// Validate account type
	validTypes := map[string]bool{
		"checking":    true,
		"savings":     true,
		"credit_card": true,
		"investment":  true,
		"loan":        true,
		"other":       true,
	}

	if !validTypes[account.AccountType] {
		return fmt.Errorf("invalid account type: %s", account.AccountType)
	}

	if account.BankName == "" {
		return fmt.Errorf("bank name is required")
	}

	if account.UserID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Validate currency if provided
	if account.Currency != "" && len(account.Currency) != 3 {
		return fmt.Errorf("currency must be a 3-letter code")
	}

	return nil
}

// ValidateAccountRequest validates a create account request.
func (s *AccountService) ValidateAccountRequest(req *CreateAccountRequest) error {
	if req.AccountName == "" {
		return fmt.Errorf("account name is required")
	}

	if req.AccountType == "" {
		return fmt.Errorf("account type is required")
	}

	// Validate account type
	validTypes := map[string]bool{
		"checking":    true,
		"savings":     true,
		"credit_card": true,
		"investment":  true,
		"loan":        true,
		"other":       true,
	}

	if !validTypes[req.AccountType] {
		return fmt.Errorf("invalid account type: %s", req.AccountType)
	}

	if req.BankName == "" {
		return fmt.Errorf("bank name is required")
	}

	// Validate currency if provided
	if req.Currency != nil && len(*req.Currency) != 3 {
		return fmt.Errorf("currency must be a 3-letter code")
	}

	return nil
}
