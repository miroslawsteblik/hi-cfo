package transaction

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/lib/pq"

	"hi-cfo/server/internal/logger"
	customerrors "hi-cfo/server/internal/shared/errors"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Repository interface {
	// core CRUD operations
	GetTransactionByID(ctx context.Context, userID, transactionID uuid.UUID) (*Transaction, error)
	GetTransactions(ctx context.Context, userID uuid.UUID, filter TransactionFilter) (*TransactionListResponse, error)
	UpdateTransaction(ctx context.Context, userID, transactionID uuid.UUID, updates map[string]any) (*Transaction, error)
	DeleteTransaction(ctx context.Context, userID, transactionID uuid.UUID) error
	CreateTransactions(ctx context.Context, userID uuid.UUID, transactions []*Transaction) (*BatchOperationResult, error)
	GetTransactionsByFitIDs(ctx context.Context, userID uuid.UUID, fitIDs []string) (map[string]*Transaction, error)
	GetTransactionStats(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time, groupBy string) (*TransactionStats, error)
}

type TransactionRepository struct {
	db     *gorm.DB
	logger *logrus.Entry
}

func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{
		db:     db,
		logger: logger.WithDomain("transaction"),
	}
}

func (r *TransactionRepository) GetTransactions(ctx context.Context, userID uuid.UUID, filter TransactionFilter) (*TransactionListResponse, error) {
	var transactions []Transaction
	var total int64

	// Build base query
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)

	// Apply filters
	if filter.AccountID != nil {
		query = query.Where("account_id = ?", *filter.AccountID)
	}
	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}
	if filter.StartDate != nil {
		query = query.Where("transaction_date >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("transaction_date <= ?", *filter.EndDate)
	}
	if filter.TransactionType != nil {
		query = query.Where("transaction_type = ?", *filter.TransactionType)
	}
	if filter.MinAmount != nil {
		query = query.Where("amount >= ?", *filter.MinAmount)
	}
	if filter.MaxAmount != nil {
		query = query.Where("amount <= ?", *filter.MaxAmount)
	}
	if filter.SearchTerm != nil {
		searchPattern := "%" + *filter.SearchTerm + "%"
		query = query.Where("description ILIKE ? OR merchant_name ILIKE ?", searchPattern, searchPattern)
	}
	// don't include deleted transactions
	query = query.Where("deleted_at IS NULL")

	// Get total count
	if err := query.Model(&Transaction{}).Count(&total).Error; err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to count transactions").
			WithDomain("transaction").
			WithDetail("operation", "count_transactions")
		appErr.Log()
		return nil, appErr
	}

	// Fetch full transactions first, then convert to list items
	offset := (filter.Page - 1) * filter.Limit
	if err := query.
		Offset(offset).
		Limit(filter.Limit).
		Order("transaction_date DESC, created_at DESC").
		Find(&transactions).Error; err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to fetch transactions").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"operation": "fetch_transactions",
				"user_id":   userID,
				"offset":    offset,
				"limit":     filter.Limit,
			})
		appErr.Log()
		return nil, appErr
	}

	// Convert to TransactionListItems manually to handle Tags properly
	transactionItems := make([]TransactionListItem, len(transactions))
	for i, tx := range transactions {
		transactionItems[i] = tx.ToListItem()
	}
	// Calculate pages
	pages := int(math.Ceil(float64(total) / float64(filter.Limit)))

	return &TransactionListResponse{
		Data:  transactionItems,
		Total: total,
		Page:  filter.Page,
		Limit: filter.Limit,
		Pages: pages,
	}, nil
}

func (r *TransactionRepository) GetTransactionByID(ctx context.Context, userID, transactionID uuid.UUID) (*Transaction, error) {
	var transaction Transaction
	err := r.db.WithContext(ctx).Where("user_id = ? AND id = ? AND deleted_at IS NULL", userID, transactionID).First(&transaction).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			appErr := customerrors.New(customerrors.ErrCodeNotFound, "Transaction not found").
				WithDomain("transaction").
				WithDetails(map[string]any{
					"user_id":        userID,
					"transaction_id": transactionID,
				})
			appErr.Log()
			return nil, appErr
		}
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get transaction").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":        userID,
				"transaction_id": transactionID,
			})
		appErr.Log()
		return nil, appErr
	}
	return &transaction, nil
}

func (r *TransactionRepository) CreateTransactions(ctx context.Context, userID uuid.UUID, transactions []*Transaction) (*BatchOperationResult, error) {
	if len(transactions) == 0 {
		return &BatchOperationResult{}, nil
	}

	result := &BatchOperationResult{
		Total:      len(transactions),
		CreatedIDs: make([]uuid.UUID, 0, len(transactions)),
		Duplicates: make([]string, 0),
		Errors:     make([]string, 0),
	}

	toCreate := make([]*Transaction, 0, len(transactions))

	if err := r.processDuplicateDetection(ctx, userID, transactions, result, &toCreate); err != nil {
		r.logger.WithFields(logrus.Fields{
			"error":   err,
			"user_id": userID,
			"total":   len(transactions),
		}).Error("Duplicate detection failed")
		return nil, customerrors.Wrap(err, customerrors.ErrCodeInternal, "duplicate detection failed").
			WithDomain("transaction")
	}

	// Prepare transactions for insert
	for _, tx := range toCreate {
		if err := r.prepareAndValidateTransaction(tx, userID); err != nil {
			appErr := customerrors.Wrap(err, customerrors.ErrCodeValidation, "failed to prepare transaction").
				WithDomain("transaction")
			result.Errors = append(result.Errors, fmt.Sprintf("Invalid transaction %s: %v", tx.Description, appErr))
			result.Skipped++
			continue
		}
	}

	// Remove invalid transactions
	validTransactions := make([]*Transaction, 0, len(toCreate))
	for _, tx := range toCreate {
		if r.validateTransactionData(tx) {
			validTransactions = append(validTransactions, tx)
		} else {
			result.Errors = append(result.Errors, fmt.Sprintf("Validation failed for transaction: %s", tx.Description))
			result.Skipped++
		}
	}

	r.logger.WithFields(logrus.Fields{
		"valid_count": len(validTransactions),
		"user_id":     userID,
	}).Info("Inserting valid transactions after validation")

	if len(validTransactions) == 0 {
		return result, nil
	}

	if err := r.insertTransactionsIndividually(ctx, validTransactions, result); err != nil {
		r.logger.WithFields(logrus.Fields{
			"error":       err,
			"user_id":     userID,
			"valid_count": len(validTransactions),
		}).Error("Individual insert failed")
		return result, customerrors.Wrap(err, customerrors.ErrCodeInternal, "failed to insert transactions").
			WithDomain("transaction")
	}

	r.logger.WithFields(logrus.Fields{
		"created": result.Created,
		"skipped": result.Skipped,
		"errors":  len(result.Errors),
		"user_id": userID,
	}).Info("Successfully processed batch")

	return result, nil
}

// Enhanced preparation with validation
func (r *TransactionRepository) prepareAndValidateTransaction(tx *Transaction, userID uuid.UUID) error {
	now := time.Now().UTC()

	if tx.ID == uuid.Nil {
		tx.ID = uuid.New()
	}
	tx.UserID = userID
	tx.CreatedAt = now
	tx.UpdatedAt = now

	if tx.TransactionDate.IsZero() {
		tx.TransactionDate = now
	}

	if tx.Tags == nil {
		tx.Tags = pq.StringArray{}
	}

	// Validate required fields
	if tx.AccountID == uuid.Nil {
		return errors.New("account_id is required")
	}

	if strings.TrimSpace(tx.Description) == "" {
		return errors.New("description is required")
	}

	if tx.Amount == 0 {
		r.logger.WithFields(logrus.Fields{
			"description": tx.Description,
			"user_id":     userID,
		}).Warn("Transaction has zero amount")
	}

	// Clean and validate FitID
	if tx.FitID != nil {
		originalFitID := *tx.FitID
		cleaned := strings.TrimSpace(*tx.FitID)
		if cleaned == "" {
			tx.FitID = nil
			r.logger.WithFields(logrus.Fields{
				"description": tx.Description,
			}).Debug("Removed empty FitID for transaction")
		} else {
			// Store the original case but trimmed
			tx.FitID = &cleaned
			r.logger.WithFields(logrus.Fields{
				"original_fit_id": originalFitID,
				"cleaned_fit_id":  cleaned,
				"description":     tx.Description,
			}).Debug("Normalized FitID for transaction")
		}
	}

	return nil
}

// Validate transaction data before insert
func (r *TransactionRepository) validateTransactionData(tx *Transaction) bool {
	if tx.UserID == uuid.Nil {
		r.logger.WithFields(logrus.Fields{
			"description": tx.Description,
		}).Error("VALIDATION: Missing UserID for transaction")
		return false
	}

	if tx.AccountID == uuid.Nil {
		r.logger.WithFields(logrus.Fields{
			"description": tx.Description,
		}).Error("VALIDATION: Missing AccountID for transaction")
		return false
	}

	if strings.TrimSpace(tx.Description) == "" {
		r.logger.Error("VALIDATION: Missing Description for transaction")
		return false
	}

	return true
}

// Individual inserts with comprehensive error handling
func (r *TransactionRepository) insertTransactionsIndividually(ctx context.Context, transactions []*Transaction, result *BatchOperationResult) error {
	for i, tx := range transactions {
		r.logger.WithFields(logrus.Fields{
			"index":       i + 1,
			"total":       len(transactions),
			"description": tx.Description,
			"fit_id": func() string {
				if tx.FitID != nil {
					return *tx.FitID
				}
				return "nil"
			}(),
		}).Debug("Inserting transaction")

		if err := r.db.WithContext(ctx).Create(tx).Error; err != nil {
			// Enhanced error logging
			r.logger.WithFields(logrus.Fields{
				"error":       err,
				"index":       i + 1,
				"id":          tx.ID,
				"user_id":     tx.UserID,
				"account_id":  tx.AccountID,
				"description": tx.Description,
			}).Error("Failed to insert transaction")

			// Check for specific error types
			errorMsg := r.categorizeError(err, tx)
			result.Errors = append(result.Errors, errorMsg)
			result.Skipped++
			continue
		}

		result.CreatedIDs = append(result.CreatedIDs, tx.ID)
		result.Created++
		r.logger.WithFields(logrus.Fields{
			"index":       i + 1,
			"description": tx.Description,
			"id":          tx.ID,
		}).Debug("Successfully inserted transaction")
	}

	return nil
}

// Categorize database errors for better user feedback
func (r *TransactionRepository) categorizeError(err error, tx *Transaction) string {
	errStr := err.Error()

	if strings.Contains(errStr, "duplicate key") || strings.Contains(errStr, "unique constraint") {
		if tx.FitID != nil {
			return fmt.Sprintf("Duplicate transaction with FitID %s: %s", *tx.FitID, tx.Description)
		}
		return fmt.Sprintf("Duplicate transaction: %s", tx.Description)
	}

	if strings.Contains(errStr, "foreign key") {
		if strings.Contains(errStr, "account") {
			return fmt.Sprintf("Invalid account for transaction: %s", tx.Description)
		}
		if strings.Contains(errStr, "category") {
			return fmt.Sprintf("Invalid category for transaction: %s", tx.Description)
		}
		return fmt.Sprintf("Foreign key constraint violation for transaction: %s", tx.Description)
	}

	if strings.Contains(errStr, "not null") {
		return fmt.Sprintf("Missing required field for transaction: %s", tx.Description)
	}

	if strings.Contains(errStr, "check constraint") {
		return fmt.Sprintf("Data validation error for transaction: %s", tx.Description)
	}

	// Generic error with more context
	return fmt.Sprintf("Database error for transaction '%s' (FitID: %v): %v",
		tx.Description,
		func() string {
			if tx.FitID != nil {
				return *tx.FitID
			} else {
				return "none"
			}
		}(),
		err)
}

// Enhanced duplicate detection with better error handling and robust FitID comparison
func (r *TransactionRepository) processDuplicateDetection(ctx context.Context, userID uuid.UUID, transactions []*Transaction, result *BatchOperationResult, toCreate *[]*Transaction) error {
	fitIDs := make([]string, 0)
	fitIDToTransaction := make(map[string]*Transaction)
	transactionsWithoutFitID := make([]*Transaction, 0)

	for _, tx := range transactions {
		if tx.FitID != nil && strings.TrimSpace(*tx.FitID) != "" {
			// ✅ Normalize FitID: trim whitespace and convert to lowercase for comparison
			fitIDValue := strings.ToLower(strings.TrimSpace(*tx.FitID))
			fitIDs = append(fitIDs, fitIDValue)
			fitIDToTransaction[fitIDValue] = tx
		} else {
			transactionsWithoutFitID = append(transactionsWithoutFitID, tx)
		}
	}

	// Handle FitID-based deduplication (only against active transactions)
	if len(fitIDs) > 0 {
		existingTransactions, err := r.GetTransactionsByFitIDs(ctx, userID, fitIDs)
		if err != nil {
			return customerrors.Wrap(err, customerrors.ErrCodeInternal, "failed to check existing transactions").
				WithDomain("transaction")
		}

		for fitID, tx := range fitIDToTransaction {
			if existingTransactions[fitID] != nil {
				result.Duplicates = append(result.Duplicates, *tx.FitID) // Use original FitID, not normalized
				result.Skipped++
			} else {
				*toCreate = append(*toCreate, tx)
			}
		}
	}

	// Handle signature-based deduplication for transactions without FitID (only against active transactions)
	if len(transactionsWithoutFitID) > 0 {
		duplicateMap, err := r.CheckExistingTransactionsBySignature(ctx, userID, transactionsWithoutFitID)
		if err != nil {
			// Continue with processing - add all transactions without FitID
			*toCreate = append(*toCreate, transactionsWithoutFitID...)
		} else {
			// Add only non-duplicates
			for i, tx := range transactionsWithoutFitID {
				if duplicateMap[i] {
					sigID := fmt.Sprintf("SIG_%s_%.2f_%s", tx.Description, tx.Amount, tx.TransactionDate.Format("2006-01-02"))
					result.Duplicates = append(result.Duplicates, sigID)
					result.Skipped++
				} else {
					*toCreate = append(*toCreate, tx)
				}
			}
		}
	}

	r.logger.WithFields(logrus.Fields{
		"to_create":  len(*toCreate),
		"duplicates": result.Skipped,
		"user_id":    userID,
	}).Info("Duplicate detection completed - checked only against active transactions")
	return nil
}

func (r *TransactionRepository) GetTransactionsByFitIDs(ctx context.Context, userID uuid.UUID, fitIDs []string) (map[string]*Transaction, error) {
	if len(fitIDs) == 0 {
		return make(map[string]*Transaction), nil
	}

	var transactions []Transaction

	err := r.db.WithContext(ctx).
		Where("user_id = ? AND LOWER(TRIM(fit_id)) IN ? AND deleted_at IS NULL", userID, fitIDs).
		Find(&transactions).Error
	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "FitID query failed").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":   userID,
				"fit_ids":   fitIDs,
				"fit_count": len(fitIDs),
			})
		appErr.Log()
		return nil, appErr
	}

	r.logger.WithFields(logrus.Fields{
		"found_count": len(transactions),
		"user_id":     userID,
		"search_type": "fitid",
	}).Debug("Found existing active transactions by FitID")

	// Convert to map for easy lookup using normalized FitIDs
	result := make(map[string]*Transaction, len(transactions))
	for i := range transactions {
		if transactions[i].FitID != nil {
			// ✅ Normalize both stored and lookup FitIDs for consistent comparison
			normalizedFitID := strings.ToLower(strings.TrimSpace(*transactions[i].FitID))
			result[normalizedFitID] = &transactions[i]
		}
	}

	return result, nil
}

func (r *TransactionRepository) CheckExistingTransactionsBySignature(ctx context.Context, userID uuid.UUID, transactions []*Transaction) (map[int]bool, error) {
	if len(transactions) == 0 {
		return make(map[int]bool), nil
	}

	duplicateMap := make(map[int]bool)

	for i, tx := range transactions {
		var count int64

		err := r.db.WithContext(ctx).Model(&Transaction{}).Where(`
			user_id = ? AND 
			account_id = ? AND 
			ABS(amount - ?) < 0.01 AND 
			transaction_date = ? AND 
			LOWER(TRIM(description)) = LOWER(TRIM(?)) AND
			deleted_at IS NULL
		`, userID, tx.AccountID, tx.Amount, tx.TransactionDate, tx.Description).Count(&count).Error

		if err != nil {
			continue
		}

		if count > 0 {
			duplicateMap[i] = true
		}
	}

	return duplicateMap, nil
}

func (r *TransactionRepository) UpdateTransaction(ctx context.Context, userID, transactionID uuid.UUID, updates map[string]interface{}) (*Transaction, error) {
	updates["updated_at"] = time.Now()

	result := r.db.WithContext(ctx).Model(&Transaction{}).Where("user_id = ? AND id = ?", userID, transactionID).Updates(updates)
	if result.Error != nil {
		appErr := customerrors.Wrap(result.Error, customerrors.ErrCodeInternal, "Failed to update transaction").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":        userID,
				"transaction_id": transactionID,
				"updates":        updates,
			})
		appErr.Log()
		return nil, appErr
	}
	if result.RowsAffected == 0 {
		appErr := customerrors.New(customerrors.ErrCodeNotFound, "Transaction not found or no changes made").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":        userID,
				"transaction_id": transactionID,
			})
		appErr.Log()
		return nil, appErr
	}

	return r.GetTransactionByID(ctx, userID, transactionID)
}

func (r *TransactionRepository) DeleteTransaction(ctx context.Context, userID, transactionID uuid.UUID) error {
	result := r.db.WithContext(ctx).Where("user_id = ? AND id = ?", userID, transactionID).Delete(&Transaction{})
	if result.Error != nil {
		appErr := customerrors.Wrap(result.Error, customerrors.ErrCodeInternal, "Failed to delete transaction").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":        userID,
				"transaction_id": transactionID,
			})
		appErr.Log()
		return appErr
	}
	if result.RowsAffected == 0 {
		appErr := customerrors.New(customerrors.ErrCodeNotFound, "Transaction not found").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":        userID,
				"transaction_id": transactionID,
			})
		appErr.Log()
		return appErr
	}
	return nil
}

func (r *TransactionRepository) GetTransactionStats(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time, groupBy string) (*TransactionStats, error) {
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)

	if startDate != nil {
		query = query.Where("transaction_date >= ?", *startDate)
	}
	if endDate != nil {
		query = query.Where("transaction_date <= ?", *endDate)
	}

	var stats TransactionStats

	var results []struct {
		TransactionType string
		TotalAmount     float64
		Count           int64
	}

	err := query.Select("transaction_type, SUM(amount) as total_amount, COUNT(*) as count").
		Group("transaction_type").
		Find(&results).Error
	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get transaction stats").
			WithDomain("transaction").
			WithDetails(map[string]any{
				"user_id":    userID,
				"start_date": startDate,
				"end_date":   endDate,
				"group_by":   groupBy,
			})
		appErr.Log()
		return nil, appErr
	}

	for _, result := range results {
		stats.TransactionCount += result.Count
		if result.TransactionType == "income" {
			stats.TotalIncome = result.TotalAmount
		} else {
			stats.TotalExpenses += math.Abs(result.TotalAmount)
		}
	}
	stats.NetIncome = stats.TotalIncome - stats.TotalExpenses

	if groupBy == "category" {
		var categoryStats []CategoryStat
		err = query.Select(`
			category_id,
			SUM(amount) as amount,
			COUNT(*) as count
		`).Group("category_id").Find(&categoryStats).Error
		if err != nil {
			appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get category stats").
				WithDomain("transaction").
				WithDetails(map[string]any{
					"user_id":    userID,
					"start_date": startDate,
					"end_date":   endDate,
					"group_by":   groupBy,
				})
			appErr.Log()
			return nil, appErr
		}
		stats.ByCategory = categoryStats
	}

	return &stats, nil
}
