package account

import (
	"context"
	"errors"
	"math"
	"time"

	customerrors "hi-cfo/api/internal/shared/errors"

	"hi-cfo/api/internal/logger"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Repository interface {
	GetAccountByID(ctx context.Context, userID, accountID uuid.UUID) (*Account, error)
	GetAccounts(ctx context.Context, userID uuid.UUID, filter AccountFilter) (*AccountResponse, error)
	CreateAccount(ctx context.Context, account *Account) error
	UpdateAccount(ctx context.Context, userID, accountID uuid.UUID, updates map[string]interface{}) (*Account, error)
	DeleteAccount(ctx context.Context, userID, accountID uuid.UUID) error
	GetAccountSummary(ctx context.Context, userID uuid.UUID) (*AccountSummary, error)
	CheckAccountExists(ctx context.Context, userID uuid.UUID, accountName string) (bool, error)
}

type AccountRepository struct {
	db     *gorm.DB
	logger *logrus.Entry
}

func NewAccountRepository(db *gorm.DB) *AccountRepository {
	return &AccountRepository{
		db:     db,
		logger: logger.WithDomain("transaction"),
	}
}

func (r *AccountRepository) GetAccounts(ctx context.Context, userID uuid.UUID, filter AccountFilter) (*AccountResponse, error) {
	var accounts []Account
	var total int64

	// Build base query
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)

	// Apply filters
	if filter.AccountType != nil {
		query = query.Where("account_type = ?", *filter.AccountType)
	}
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}
	if filter.Search != nil {
		searchPattern := "%" + *filter.Search + "%"
		query = query.Where("account_name ILIKE ? OR bank_name ILIKE ? OR account_number_masked ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// Get total count
	if err := query.Model(&Account{}).Count(&total).Error; err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to count accounts").
			WithDomain("account").
			WithDetail("operation", "count_accounts")
		appErr.Log()
		return nil, appErr
	}

	// Apply pagination and ordering
	offset := (filter.Page - 1) * filter.Limit
	if err := query.
		Offset(offset).
		Limit(filter.Limit).
		Order("created_at DESC").
		Find(&accounts).Error; err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to fetch accounts").
			WithDomain("account").
			WithDetails(map[string]any{
				"operation": "fetch_accounts",
				"user_id":   userID,
				"offset":    offset,
				"limit":     filter.Limit,
			})
		appErr.Log()
		return nil, err
	}

	pages := int(math.Ceil(float64(total) / float64(filter.Limit)))

	return &AccountResponse{
		Data:  accounts,
		Total: total,
		Page:  filter.Page,
		Limit: filter.Limit,
		Pages: pages,
	}, nil
}

func (r *AccountRepository) CreateAccount(ctx context.Context, account *Account) error {
	// Generate UUID if not set
	if account.ID == uuid.Nil {
		account.ID = uuid.New()
	}

	// Set timestamps
	now := time.Now()
	account.CreatedAt = now
	account.UpdatedAt = now

	// Set default currency if not provided
	if account.Currency == "" {
		account.Currency = "USD"
	}

	// Set default active status
	account.IsActive = true

	return r.db.WithContext(ctx).Create(account).Error
}

func (r *AccountRepository) GetAccountByID(ctx context.Context, userID, accountID uuid.UUID) (*Account, error) {
	var account Account
	err := r.db.WithContext(ctx).Where("user_id = ? AND id = ?", userID, accountID).First(&account).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			appErr := customerrors.New(customerrors.ErrCodeNotFound, "Account not found").
				WithDomain("account").
				WithDetails(map[string]any{
					"user_id":    userID,
					"account_id": accountID,
				})
			appErr.Log()
			return nil, appErr
		}
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get account").
			WithDomain("account").
			WithDetails(map[string]any{
				"user_id":    userID,
				"account_id": accountID,
			})
		appErr.Log()
		return nil, appErr
	}
	return &account, nil
}

func (r *AccountRepository) UpdateAccount(ctx context.Context, userID, accountID uuid.UUID, updates map[string]interface{}) (*Account, error) {
	updates["updated_at"] = time.Now()

	result := r.db.WithContext(ctx).Model(&Account{}).Where("user_id = ? AND id = ?", userID, accountID).Updates(updates)
	if result.Error != nil {
		appErr := customerrors.Wrap(result.Error, customerrors.ErrCodeInternal, "Failed to update account").
			WithDomain("account").
			WithDetails(map[string]any{
				"user_id":    userID,
				"account_id": accountID,
				"updates":    updates,
			})
		appErr.Log()
		return nil, appErr
	}
	if result.RowsAffected == 0 {
		appErr := customerrors.New(customerrors.ErrCodeNotFound, "Account not found or no changes made").
			WithDomain("account").
			WithDetails(map[string]any{
				"user_id":    userID,
				"account_id": accountID,
			})
		appErr.Log()
		return nil, appErr
	}

	return r.GetAccountByID(ctx, userID, accountID)
}

func (r *AccountRepository) DeleteAccount(ctx context.Context, userID, accountID uuid.UUID) error {
	result := r.db.WithContext(ctx).Where("user_id = ? AND id = ?", userID, accountID).Delete(&Account{})
	if result.Error != nil {
		appErr := customerrors.Wrap(result.Error, customerrors.ErrCodeInternal, "Failed to delete account").
			WithDomain("account").
			WithDetails(map[string]any{
				"user_id":    userID,
				"account_id": accountID,
			})
		appErr.Log()
		return appErr
	}
	if result.RowsAffected == 0 {
		appErr := customerrors.New(customerrors.ErrCodeNotFound, "Transaction not found").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":    userID,
				"account_id": accountID,
			})
		appErr.Log()
		return appErr
	}
	return nil
}

func (r *AccountRepository) GetAccountSummary(ctx context.Context, userID uuid.UUID) (*AccountSummary, error) {
	var summary AccountSummary

	// Get total accounts and balances
	var totalQuery struct {
		TotalAccounts    int64   `json:"total_accounts"`
		ActiveAccounts   int64   `json:"active_accounts"`
		InactiveAccounts int64   `json:"inactive_accounts"`
		TotalBalance     float64 `json:"total_balance"`
	}

	err := r.db.WithContext(ctx).
		Table("accounts").
		Select(`
			COUNT(*) as total_accounts,
			COUNT(CASE WHEN is_active = true THEN 1 END) as active_accounts,
			COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_accounts,
			COALESCE(SUM(CASE WHEN current_balance IS NOT NULL THEN current_balance ELSE 0 END), 0) as total_balance
		`).
		Where("user_id = ?", userID).
		Scan(&totalQuery).Error

	if err != nil {
		return nil, err
	}

	summary.TotalAccounts = int(totalQuery.TotalAccounts)
	summary.ActiveAccounts = int(totalQuery.ActiveAccounts)
	summary.InactiveAccounts = int(totalQuery.InactiveAccounts)
	summary.TotalBalance = totalQuery.TotalBalance

	// Get stats by account type
	var typeStats []AccountTypeStats
	err = r.db.WithContext(ctx).
		Table("accounts").
		Select(`
			account_type,
			COUNT(*) as count,
			COALESCE(SUM(CASE WHEN current_balance IS NOT NULL THEN current_balance ELSE 0 END), 0) as total_balance
		`).
		Where("user_id = ?", userID).
		Group("account_type").
		Find(&typeStats).Error

	if err != nil {
		return nil, err
	}

	summary.ByType = typeStats

	return &summary, nil
}

func (r *AccountRepository) CheckAccountExists(ctx context.Context, userID uuid.UUID, accountName string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Account{}).
		Where("user_id = ? AND account_name = ?", userID, accountName).
		Count(&count).Error

	return count > 0, err
}
