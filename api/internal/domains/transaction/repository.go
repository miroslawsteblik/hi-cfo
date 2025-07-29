package transaction

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/lib/pq"

	"hi-cfo/api/internal/logger"
	customerrors "hi-cfo/api/internal/shared/errors"

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
	
	// Analytics operations
	GetTransactionPivotData(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time) (*PivotData, error)
	GetTransactionTrends(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time, groupBy string) (*TrendsData, error)
	GetTransactionComparison(ctx context.Context, userID uuid.UUID, period, current string) (*ComparisonData, error)
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

// ========================================
// Analytics Repository Methods
// ========================================

func (r *TransactionRepository) GetTransactionPivotData(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time) (*PivotData, error) {
	var dateRange DateRange
	now := time.Now()
	
	if startDate == nil {
		start := now.AddDate(0, -12, 0)
		dateRange.StartDate = start
	} else {
		dateRange.StartDate = *startDate
	}
	
	if endDate == nil {
		dateRange.EndDate = now
	} else {
		dateRange.EndDate = *endDate
	}

	// Query to get pivot data grouped by category and month
	var pivotResults []struct {
		CategoryID   *uuid.UUID `json:"category_id"`
		CategoryName *string    `json:"category_name"`
		CategoryType *string    `json:"category_type"`
		Color        *string    `json:"color"`
		Period       string     `json:"period"`
		Amount       float64    `json:"amount"`
		Count        int        `json:"count"`
	}

	query := r.db.WithContext(ctx).
		Table("transactions t").
		Select(`
			t.category_id as category_id,
			COALESCE(c.name, 'Uncategorized') as category_name,
			COALESCE(c.category_type, 'expense') as category_type,
			c.color as color,
			TO_CHAR(t.transaction_date, 'YYYY-MM') as period,
			SUM(ABS(t.amount)) as amount,
			COUNT(*) as count
		`).
		Joins("LEFT JOIN categories c ON c.id = t.category_id").
		Where("t.user_id = ?", userID).
		Where("t.transaction_date >= ?", dateRange.StartDate).
		Where("t.transaction_date <= ?", dateRange.EndDate).
		Group("t.category_id, c.name, c.category_type, c.color, TO_CHAR(t.transaction_date, 'YYYY-MM')").
		Order("period, category_name")

	if err := query.Find(&pivotResults).Error; err != nil {
		return nil, customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get pivot data").
			WithDomain("transaction").
			WithUserID(userID)
	}

	// Process results into pivot structure
	categoryMap := make(map[string]*CategoryPivot)
	periodSet := make(map[string]bool)
	totalsByPeriod := make(map[string]float64)
	totalIncome := 0.0
	totalExpense := 0.0
	transactionCount := 0

	for _, result := range pivotResults {
		categoryKey := "uncategorized"
		categoryName := "Uncategorized"
		categoryType := "expense"
		
		if result.CategoryID != nil {
			categoryKey = result.CategoryID.String()
			if result.CategoryName != nil {
				categoryName = *result.CategoryName
			}
			if result.CategoryType != nil {
				categoryType = *result.CategoryType
			}
		}

		if _, exists := categoryMap[categoryKey]; !exists {
			categoryMap[categoryKey] = &CategoryPivot{
				CategoryID:   categoryKey,
				CategoryName: categoryName,
				CategoryType: categoryType,
				Color:        result.Color,
				Periods:      make(map[string]float64),
				Total:        0,
				Count:        0,
			}
		}

		categoryMap[categoryKey].Periods[result.Period] = result.Amount
		categoryMap[categoryKey].Total += result.Amount
		categoryMap[categoryKey].Count += result.Count
		
		periodSet[result.Period] = true
		totalsByPeriod[result.Period] += result.Amount
		
		if categoryType == "income" {
			totalIncome += result.Amount
		} else {
			totalExpense += result.Amount
		}
		transactionCount += result.Count
	}

	// Convert maps to slices
	var categories []CategoryPivot
	for _, category := range categoryMap {
		// Calculate average
		if len(category.Periods) > 0 {
			category.Average = category.Total / float64(len(category.Periods))
		}
		categories = append(categories, *category)
	}

	var periods []string
	for period := range periodSet {
		periods = append(periods, period)
	}

	pivotData := &PivotData{
		Categories: categories,
		Periods:    periods,
		Totals: PivotTotals{
			Periods:      totalsByPeriod,
			GrandTotal:   totalIncome + totalExpense,
			TotalIncome:  totalIncome,
			TotalExpense: totalExpense,
		},
		Summary: PivotSummary{
			DateRange:        dateRange,
			TotalCategories:  len(categories),
			TotalPeriods:     len(periods),
			TransactionCount: transactionCount,
		},
	}

	return pivotData, nil
}

func (r *TransactionRepository) GetTransactionTrends(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time, groupBy string) (*TrendsData, error) {
	var dateRange DateRange
	now := time.Now()
	
	if startDate == nil {
		start := now.AddDate(0, -12, 0)
		dateRange.StartDate = start
	} else {
		dateRange.StartDate = *startDate
	}
	
	if endDate == nil {
		dateRange.EndDate = now
	} else {
		dateRange.EndDate = *endDate
	}

	// Determine date format based on groupBy
	var dateFormat string
	switch groupBy {
	case "day":
		dateFormat = "YYYY-MM-DD"
	case "week":
		dateFormat = "YYYY-\"W\"WW"
	case "month":
		dateFormat = "YYYY-MM"
	case "year":
		dateFormat = "YYYY"
	default:
		dateFormat = "YYYY-MM"
	}

	// Query for trend data
	var trendResults []struct {
		Period           string  `json:"period"`
		Income           float64 `json:"income"`
		Expenses         float64 `json:"expenses"`
		NetIncome        float64 `json:"net_income"`
		TransactionCount int     `json:"transaction_count"`
	}

	query := r.db.WithContext(ctx).
		Table("transactions").
		Select(fmt.Sprintf(`
			TO_CHAR(transaction_date, '%s') as period,
			SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
			SUM(CASE WHEN transaction_type != 'income' THEN ABS(amount) ELSE 0 END) as expenses,
			SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -ABS(amount) END) as net_income,
			COUNT(*) as transaction_count
		`, dateFormat)).
		Where("user_id = ?", userID).
		Where("transaction_date >= ?", dateRange.StartDate).
		Where("transaction_date <= ?", dateRange.EndDate).
		Group(fmt.Sprintf("TO_CHAR(transaction_date, '%s')", dateFormat)).
		Order("period")

	if err := query.Find(&trendResults).Error; err != nil {
		return nil, customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get trend data").
			WithDomain("transaction").
			WithUserID(userID)
	}

	// Convert to trend periods
	periods := make([]TrendPeriod, len(trendResults))
	totalIncome := make([]float64, len(trendResults))
	totalExpenses := make([]float64, len(trendResults))
	netIncome := make([]float64, len(trendResults))

	var avgIncome, avgExpenses, totalIncomeSum, totalExpensesSum float64
	for i, result := range trendResults {
		periods[i] = TrendPeriod{
			Period:           result.Period,
			Income:           result.Income,
			Expenses:         result.Expenses,
			NetIncome:        result.NetIncome,
			TransactionCount: result.TransactionCount,
		}
		totalIncome[i] = result.Income
		totalExpenses[i] = result.Expenses
		netIncome[i] = result.NetIncome
		
		totalIncomeSum += result.Income
		totalExpensesSum += result.Expenses
	}

	if len(trendResults) > 0 {
		avgIncome = totalIncomeSum / float64(len(trendResults))
		avgExpenses = totalExpensesSum / float64(len(trendResults))
	}

	// Calculate growth rate and volatility
	growthRate := 0.0
	if len(netIncome) > 1 && netIncome[0] != 0 {
		growthRate = ((netIncome[len(netIncome)-1] - netIncome[0]) / math.Abs(netIncome[0])) * 100
	}

	trendsData := &TrendsData{
		Periods:       periods,
		TotalIncome:   totalIncome,
		TotalExpenses: totalExpenses,
		NetIncome:     netIncome,
		TopCategories: []CategoryTrend{}, // TODO: Implement top categories
		Summary: TrendSummary{
			DateRange:       dateRange,
			AverageIncome:   avgIncome,
			AverageExpenses: avgExpenses,
			GrowthRate:      growthRate,
			Volatility:      0.0, // TODO: Calculate volatility
		},
	}

	return trendsData, nil
}

func (r *TransactionRepository) GetTransactionComparison(ctx context.Context, userID uuid.UUID, period, current string) (*ComparisonData, error) {
	// Parse current period
	currentTime, err := time.Parse("2006-01", current)
	if err != nil {
		return nil, customerrors.Wrap(err, customerrors.ErrCodeValidation, "Invalid current period format").
			WithDomain("transaction").
			WithUserID(userID)
	}

	// Calculate previous period
	var previousTime time.Time
	switch period {
	case "month":
		previousTime = currentTime.AddDate(0, -1, 0)
	case "quarter":
		previousTime = currentTime.AddDate(0, -3, 0)
	case "year":
		previousTime = currentTime.AddDate(-1, 0, 0)
	default:
		previousTime = currentTime.AddDate(0, -1, 0)
	}

	// Get current period data
	currentData, err := r.getPeriodData(ctx, userID, currentTime, period)
	if err != nil {
		return nil, err
	}

	// Get previous period data
	previousData, err := r.getPeriodData(ctx, userID, previousTime, period)
	if err != nil {
		return nil, err
	}

	// Calculate comparison metrics
	comparison := ComparisonMetrics{
		IncomeChange:  currentData.Income - previousData.Income,
		ExpenseChange: currentData.Expenses - previousData.Expenses,
		NetIncomeChange: currentData.NetIncome - previousData.NetIncome,
		TransactionCountChange: currentData.TransactionCount - previousData.TransactionCount,
	}

	// Calculate percentage changes
	if previousData.Income != 0 {
		comparison.IncomeChangePercent = (comparison.IncomeChange / previousData.Income) * 100
	}
	if previousData.Expenses != 0 {
		comparison.ExpenseChangePercent = (comparison.ExpenseChange / previousData.Expenses) * 100
	}
	if previousData.NetIncome != 0 {
		comparison.NetIncomeChangePercent = (comparison.NetIncomeChange / previousData.NetIncome) * 100
	}

	// Calculate category changes
	var categoryChanges []CategoryComparison
	allCategories := make(map[string]bool)
	
	for category := range currentData.Categories {
		allCategories[category] = true
	}
	for category := range previousData.Categories {
		allCategories[category] = true
	}

	for category := range allCategories {
		currentAmount := currentData.Categories[category]
		previousAmount := previousData.Categories[category]
		
		change := currentAmount - previousAmount
		changePercent := 0.0
		if previousAmount != 0 {
			changePercent = (change / previousAmount) * 100
		}

		categoryChanges = append(categoryChanges, CategoryComparison{
			CategoryID:     category,
			CategoryName:   category, // TODO: Get actual category name
			CurrentAmount:  currentAmount,
			PreviousAmount: previousAmount,
			Change:         change,
			ChangePercent:  changePercent,
			IsNew:          previousAmount == 0 && currentAmount > 0,
			IsGone:         previousAmount > 0 && currentAmount == 0,
		})
	}

	comparisonData := &ComparisonData{
		Current:         *currentData,
		Previous:        *previousData,
		Comparison:      comparison,
		CategoryChanges: categoryChanges,
	}

	return comparisonData, nil
}

func (r *TransactionRepository) getPeriodData(ctx context.Context, userID uuid.UUID, periodTime time.Time, period string) (*PeriodData, error) {
	var startDate, endDate time.Time
	
	switch period {
	case "month":
		startDate = time.Date(periodTime.Year(), periodTime.Month(), 1, 0, 0, 0, 0, periodTime.Location())
		endDate = startDate.AddDate(0, 1, -1)
	case "quarter":
		quarter := (int(periodTime.Month()) - 1) / 3
		startDate = time.Date(periodTime.Year(), time.Month(quarter*3+1), 1, 0, 0, 0, 0, periodTime.Location())
		endDate = startDate.AddDate(0, 3, -1)
	case "year":
		startDate = time.Date(periodTime.Year(), 1, 1, 0, 0, 0, 0, periodTime.Location())
		endDate = startDate.AddDate(1, 0, -1)
	default:
		startDate = time.Date(periodTime.Year(), periodTime.Month(), 1, 0, 0, 0, 0, periodTime.Location())
		endDate = startDate.AddDate(0, 1, -1)
	}

	var result struct {
		Income           float64 `json:"income"`
		Expenses         float64 `json:"expenses"`
		NetIncome        float64 `json:"net_income"`
		TransactionCount int     `json:"transaction_count"`
	}

	err := r.db.WithContext(ctx).
		Table("transactions").
		Select(`
			SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
			SUM(CASE WHEN transaction_type != 'income' THEN ABS(amount) ELSE 0 END) as expenses,
			SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -ABS(amount) END) as net_income,
			COUNT(*) as transaction_count
		`).
		Where("user_id = ?", userID).
		Where("transaction_date >= ?", startDate).
		Where("transaction_date <= ?", endDate).
		First(&result).Error

	if err != nil {
		return nil, customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get period data").
			WithDomain("transaction").
			WithUserID(userID)
	}

	// Get categories breakdown
	var categoryResults []struct {
		CategoryName string  `json:"category_name"`
		Amount       float64 `json:"amount"`
		Count        int     `json:"count"`
	}

	err = r.db.WithContext(ctx).
		Table("transactions t").
		Select(`
			COALESCE(c.name, 'Uncategorized') as category_name,
			SUM(ABS(t.amount)) as amount,
			COUNT(*) as count
		`).
		Joins("LEFT JOIN categories c ON c.id = t.category_id").
		Where("t.user_id = ?", userID).
		Where("t.transaction_date >= ?", startDate).
		Where("t.transaction_date <= ?", endDate).
		Group("c.name").
		Find(&categoryResults).Error

	if err != nil {
		return nil, customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get category data").
			WithDomain("transaction").
			WithUserID(userID)
	}

	categories := make(map[string]float64)
	var topCategories []CategorySummary
	
	for _, cat := range categoryResults {
		categories[cat.CategoryName] = cat.Amount
		percentage := 0.0
		if result.Expenses > 0 {
			percentage = (cat.Amount / result.Expenses) * 100
		}
		
		topCategories = append(topCategories, CategorySummary{
			CategoryID:   cat.CategoryName, // TODO: Use actual category ID
			CategoryName: cat.CategoryName,
			Amount:       cat.Amount,
			Count:        cat.Count,
			Percentage:   percentage,
		})
	}

	periodData := &PeriodData{
		Period:           periodTime.Format("2006-01"),
		Income:           result.Income,
		Expenses:         result.Expenses,
		NetIncome:        result.NetIncome,
		TransactionCount: result.TransactionCount,
		Categories:       categories,
		TopCategories:    topCategories,
	}

	return periodData, nil
}
