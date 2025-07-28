package transaction

import (
	"context"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"hi-cfo/api/internal/domains/category"
	"hi-cfo/api/internal/logger"
	customerrors "hi-cfo/api/internal/shared/errors"

	"github.com/sirupsen/logrus"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type TransactionStore interface {
	// Core processing methods
	ProcessTransactionInput(ctx context.Context, userID uuid.UUID, request TransactionRequest) (*ProcessedTransaction, error)
	ProcessTransactionBatch(ctx context.Context, userID uuid.UUID, batch BatchTransactionRequest) (*BatchOperationResult, error)
	CreateTransaction(ctx context.Context, userID uuid.UUID, request TransactionRequest) (*Transaction, error)

	// Categorization preview and analysis methods
	PreviewBatchCategorization(ctx context.Context, userID uuid.UUID, batch BatchTransactionRequest) (*BulkCategorizationPreview, error)
	AnalyzeTransactionCategorization(ctx context.Context, userID uuid.UUID, descriptions []string) (*CategorizationAnalysis, error)
	TestSingleCategorization(ctx context.Context, userID uuid.UUID, merchantName string) (*CategorizationResult, error)

	// CRUD operations
	GetTransactions(ctx context.Context, userID uuid.UUID, filter TransactionFilter) (*TransactionListResponse, error)
	GetTransactionByID(ctx context.Context, userID, transactionID uuid.UUID) (*Transaction, error)
	UpdateTransaction(ctx context.Context, userID, transactionID uuid.UUID, req *UpdateTransactionRequest) (*Transaction, error)
	DeleteTransaction(ctx context.Context, userID, transactionID uuid.UUID) error
	GetTransactionStats(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time, groupBy string) (*TransactionStats, error)
}

type TransactionService struct {
	repo            Repository
	categoryService *category.CategoryService
	logger          *logrus.Entry
}

type AutoCategorizationConfig struct {
	Enabled             bool
	ConfidenceThreshold float64
	MaxBatchSize        int
}

func NewTransactionService(repo Repository, categoryService *category.CategoryService) *TransactionService {
	return &TransactionService{
		repo:            repo,
		categoryService: categoryService,
		logger:          logger.WithDomain("transaction"),
	}
}

func (s *TransactionService) getAutoCategorizationConfig() AutoCategorizationConfig {
	return AutoCategorizationConfig{
		Enabled:             true,
		ConfidenceThreshold: 0.3,
		MaxBatchSize:        100,
	}
}

// ========================================
// CORE PROCESSING METHODS
// ========================================

// ProcessTransactionInput - Main method to convert input to processed transaction
func (s *TransactionService) ProcessTransactionInput(ctx context.Context, userID uuid.UUID, input TransactionRequest) (*ProcessedTransaction, error) {
	processed := &ProcessedTransaction{
		OriginalInput: input,
		ParseErrors:   make([]string, 0),
	}

	// Parse AccountID (required)
	accountID, err := s.parseUUID(input.AccountID, "account_id")
	if err != nil {
		return nil, err
	}
	processed.AccountID = accountID

	// Parse CategoryID (optional)
	if input.CategoryID != nil && *input.CategoryID != "" {
		categoryID, err := s.parseUUID(*input.CategoryID, "category_id")
		if err != nil {
			return nil, err
		}
		processed.CategoryID = &categoryID
	}

	// Parse FileUploadID (optional)
	if input.FileUploadID != nil && *input.FileUploadID != "" {
		fileUploadID, err := s.parseUUID(*input.FileUploadID, "file_upload_id")
		if err != nil {
			return nil, err
		}
		processed.FileUploadID = &fileUploadID
	}

	// Parse TransactionDate (required)
	transactionDate, err := s.parseTransactionDate(input.TransactionDate)
	if err != nil {
		return nil, customerrors.Wrap(err, customerrors.ErrCodeValidation, fmt.Sprintf("invalid transaction_date '%s'", input.TransactionDate)).WithDomain("transaction")
	}
	processed.TransactionDate = transactionDate

	// Copy simple fields
	processed.FitID = input.FitID
	processed.Description = strings.TrimSpace(input.Description)
	processed.Amount = input.Amount
	processed.TransactionType = strings.ToLower(strings.TrimSpace(input.TransactionType))
	processed.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	processed.MerchantName = s.cleanStringPointer(input.MerchantName)
	processed.Memo = s.cleanStringPointer(input.Memo)
	processed.Tags = s.cleanStringSlice(input.Tags)
	processed.ReferenceNumber = s.cleanStringPointer(input.ReferenceNumber)
	processed.UserNotes = s.cleanStringPointer(input.UserNotes)

	// Validate business rules
	if err := s.validateProcessedTransaction(processed); err != nil {
		return nil, err
	}

	return processed, nil
}

func (s *TransactionService) ProcessTransactionBatch(ctx context.Context, userID uuid.UUID, batch BatchTransactionRequest) (*BatchOperationResult, error) {
	if len(batch.Transactions) == 0 {
		return &BatchOperationResult{}, nil
	}

	// Step 1: Process and validate all inputs
	processedTransactions := make([]*ProcessedTransaction, 0, len(batch.Transactions))
	skippedCount := 0

	for i, input := range batch.Transactions {
		processed, err := s.ProcessTransactionInput(ctx, userID, input)
		if err != nil {
			s.logger.WithFields(logrus.Fields{
				"transaction_index": i,
				"error":             err.Error(),
			}).Warn("Skipping transaction due to processing error")
			skippedCount++
			continue
		}
		processedTransactions = append(processedTransactions, processed)
	}

	if len(processedTransactions) == 0 {
		return &BatchOperationResult{
			Total:   len(batch.Transactions),
			Skipped: skippedCount,
			Errors:  []string{"no valid transactions to process"},
		}, nil
	}

	// Step 2: Auto-categorize uncategorized transactions
	if s.categoryService != nil {
		config := s.getAutoCategorizationConfig()
		if config.Enabled {
			if err := s.autoCategorizeProcessedTransactions(ctx, userID, processedTransactions); err != nil {
				s.logger.WithFields(logrus.Fields{
					"error": err.Error(),
				}).Warn("Auto-categorization warning")
			}
		}
	}

	// Step 3: Convert to database models
	dbTransactions := make([]*Transaction, len(processedTransactions))
	for i, processed := range processedTransactions {
		dbTransactions[i] = s.convertToDBModel(userID, processed)
	}

	// Step 4: Use unified repository method (handles both single and bulk)
	result, err := s.repo.CreateTransactions(ctx, userID, dbTransactions)
	if err != nil {
		return nil, customerrors.Wrap(err, customerrors.ErrCodeInternal, "database operation failed").WithDomain("transaction")
	}

	// Step 5: Add any service-level metadata to the result
	result.Source = batch.Source
	result.Skipped += skippedCount // Add validation failures to skip count

	return result, nil
}

func (s *TransactionService) CreateTransaction(ctx context.Context, userID uuid.UUID, request TransactionRequest) (*Transaction, error) {
	batch := BatchTransactionRequest{
		Transactions: []TransactionRequest{request},
		Source:       "api",
	}
	s.logger.WithFields(logrus.Fields{
		"user_id":          userID,
		"transaction_type": request.TransactionType,
		"currency":         request.Currency,
	}).Debug("Creating new transaction")

	result, err := s.ProcessTransactionBatch(ctx, userID, batch)
	if err != nil {
		return nil, err
	}

	if result.Created == 0 {
		if len(result.Errors) > 0 {
			return nil, customerrors.New(customerrors.ErrCodeValidation, fmt.Sprintf("transaction creation failed: %s", result.Errors[0])).WithDomain("transaction")
		}
		return nil, customerrors.New(customerrors.ErrCodeInternal, "transaction creation failed: unknown error").WithDomain("transaction")
	}

	s.logger.WithFields(logrus.Fields{
		"user_id":          userID,
		"transaction_id":   result.CreatedIDs[0],
		"transaction_type": request.TransactionType,
		"currency":         request.Currency,
	}).Info("Transaction created successfully")

	return s.repo.GetTransactionByID(ctx, userID, result.CreatedIDs[0])
}

// ========================================
// PARSING AND VALIDATION UTILITIES
// ========================================

func (s *TransactionService) parseUUID(uuidStr, fieldName string) (uuid.UUID, error) {
	if uuidStr == "" {
		return uuid.Nil, customerrors.New(customerrors.ErrCodeValidation, fmt.Sprintf("%s cannot be empty", fieldName)).WithDomain("transaction")
	}

	parsedUUID, err := uuid.Parse(uuidStr)
	if err != nil {
		return uuid.Nil, customerrors.Wrap(err, customerrors.ErrCodeValidation, fmt.Sprintf("invalid %s '%s'", fieldName, uuidStr)).WithDomain("transaction")
	}

	return parsedUUID, nil
}

func (s *TransactionService) parseTransactionDate(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, customerrors.New(customerrors.ErrCodeValidation, "transaction date cannot be empty").WithDomain("transaction")
	}

	// Try common date formats
	formats := []string{
		time.RFC3339,          // "2006-01-02T15:04:05Z07:00" (API standard)
		time.RFC3339Nano,      // "2006-01-02T15:04:05.999999999Z07:00"
		"2006-01-02T15:04:05", // "2023-12-25T10:30:00" (without timezone)
		"2006-01-02",          // "2023-12-25" (CSV standard)
		"01/02/2006",          // "12/25/2023" (US format)
		"02/01/2006",          // "25/12/2023" (EU format)
		"2006-01-02 15:04:05", // "2023-12-25 10:30:00"
		"01-02-2006",          // "12-25-2023"
		"02-01-2006",          // "25-12-2023"
	}

	for _, format := range formats {
		if parsed, err := time.Parse(format, dateStr); err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, customerrors.New(customerrors.ErrCodeValidation, fmt.Sprintf("unsupported date format: %s", dateStr)).WithDomain("transaction")
}

func (s *TransactionService) cleanStringPointer(str *string) *string {
	if str == nil {
		return nil
	}
	cleaned := strings.TrimSpace(*str)
	if cleaned == "" {
		return nil
	}
	return &cleaned
}

func (s *TransactionService) cleanStringSlice(slice []string) []string {
	if slice == nil {
		return []string{}
	}

	cleaned := make([]string, 0, len(slice))
	for _, s := range slice {
		if trimmed := strings.TrimSpace(s); trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	return cleaned
}

func (s *TransactionService) validateProcessedTransaction(pt *ProcessedTransaction) error {
	if pt.Amount == 0 {
		return customerrors.New(customerrors.ErrCodeValidation, "transaction amount cannot be zero").WithDomain("transaction")
	}

	if pt.Description == "" {
		return customerrors.New(customerrors.ErrCodeValidation, "transaction description is required").WithDomain("transaction")
	}

	validTypes := map[string]bool{
		"income": true, "expense": true, "transfer": true,
		"fee": true, "interest": true, "dividend": true, "refund": true,
	}

	if !validTypes[pt.TransactionType] {
		return customerrors.New(customerrors.ErrCodeValidation, fmt.Sprintf("invalid transaction type: %s", pt.TransactionType)).WithDomain("transaction")
	}

	if pt.Currency == "" {
		return customerrors.New(customerrors.ErrCodeValidation, "currency is required").WithDomain("transaction")
	}

	if pt.AccountID == uuid.Nil {
		return customerrors.New(customerrors.ErrCodeValidation, "account ID is required").WithDomain("transaction")
	}

	return nil
}

// ========================================
// AUTO-CATEGORIZATION
// ========================================

func (s *TransactionService) autoCategorizeProcessedTransactions(ctx context.Context, userID uuid.UUID, transactions []*ProcessedTransaction) error {
	// Collect uncategorized transactions
	uncategorized := make([]*ProcessedTransaction, 0)
	searchTexts := make([]string, 0)

	for _, tx := range transactions {
		if tx.CategoryID == nil {
			searchText := s.getSearchTextFromProcessed(tx)
			if searchText != "" {
				uncategorized = append(uncategorized, tx)
				searchTexts = append(searchTexts, searchText)
			}
		}
	}

	if len(searchTexts) == 0 {
		return nil
	}

	// Batch categorization
	results, err := s.categoryService.AutoCategorizeTransactions(ctx, userID, searchTexts)
	if err != nil {
		return customerrors.Wrap(err, customerrors.ErrCodeInternal, "batch categorization failed").WithDomain("transaction")
	}

	// Apply results
	config := s.getAutoCategorizationConfig()
	categorizedCount := 0

	for i, tx := range uncategorized {
		searchText := searchTexts[i]
		if result := results[searchText]; result != nil && result.Confidence >= config.ConfidenceThreshold {
			tx.CategoryID = &result.CategoryID
			categorizedCount++
		}
	}

	if categorizedCount > 0 {
		s.logger.WithFields(logrus.Fields{
			"categorized_count": categorizedCount,
			"total_count":       len(uncategorized),
			"success_rate":      float64(categorizedCount) / float64(len(uncategorized)) * 100,
		}).Info("Auto-categorization completed")
	}

	return nil
}

func (s *TransactionService) getSearchTextFromProcessed(tx *ProcessedTransaction) string {
	if tx.MerchantName != nil && *tx.MerchantName != "" {
		return *tx.MerchantName
	}
	return tx.Description
}

// ========================================
// CONVERSION UTILITIES
// ========================================

func (s *TransactionService) convertToDBModel(userID uuid.UUID, processed *ProcessedTransaction) *Transaction {
	return &Transaction{
		UserID:          userID,
		AccountID:       processed.AccountID,
		CategoryID:      processed.CategoryID,
		FitID:           processed.FitID,
		FileUploadID:    processed.FileUploadID,
		TransactionDate: processed.TransactionDate,
		Description:     processed.Description,
		Amount:          processed.Amount,
		TransactionType: processed.TransactionType,
		Currency:        processed.Currency,
		MerchantName:    processed.MerchantName,
		Memo:            processed.Memo,
		Tags:            pq.StringArray(processed.Tags),
		ReferenceNumber: processed.ReferenceNumber,
		UserNotes:       processed.UserNotes,
	}
}

// ========================================
// CATEGORIZATION PREVIEW AND ANALYSIS
// ========================================

func (s *TransactionService) PreviewBatchCategorization(ctx context.Context, userID uuid.UUID, batch BatchTransactionRequest) (*BulkCategorizationPreview, error) {
	s.logger.WithFields(logrus.Fields{
		"user_id":           userID,
		"transaction_count": len(batch.Transactions),
	}).Debug("Starting batch categorization preview")

	if s.categoryService == nil {
		return nil, customerrors.New(customerrors.ErrCodeInternal, "category service not available").WithDomain("transaction")
	}

	if len(batch.Transactions) == 0 {
		return &BulkCategorizationPreview{
			TotalTransactions: 0,
			WillBeCategorized: 0,
			Previews:          make([]CategorizationResult, 0), // Ensure empty slice, not nil
		}, nil
	}

	preview := &BulkCategorizationPreview{
		TotalTransactions: len(batch.Transactions),
		WillBeCategorized: 0,
		Previews:          make([]CategorizationResult, len(batch.Transactions)),
	}

	// Create search texts for categorization
	searchTexts := make([]string, 0)
	transactionToSearchIndex := make(map[int]int)
	processedCount := 0

	// First pass: process all transactions and collect search texts
	for i, input := range batch.Transactions {

		// Initialize result with basic info
		result := CategorizationResult{
			Index:             &i,
			Description:       input.Description,
			WillBeCategorized: false,
		}

		// Try to process transaction
		processed, err := s.ProcessTransactionInput(ctx, userID, input)
		if err != nil {
			s.logger.WithFields(logrus.Fields{
				"transaction_index": i,
				"error":             err.Error(),
			}).Warn("Skipping transaction due to processing error")
			preview.Previews[i] = result
			continue
		}

		processedCount++

		// Set merchant name if available
		if processed.MerchantName != nil {
			result.MerchantName = processed.MerchantName
		}

		// Set original category if provided
		if processed.CategoryID != nil {
			result.OriginalCategory = processed.CategoryID
			preview.Previews[i] = result
			continue
		}

		// Transaction needs categorization
		searchText := s.getSearchTextFromProcessed(processed)
		if searchText != "" {
			transactionToSearchIndex[i] = len(searchTexts)
			searchTexts = append(searchTexts, searchText)
		}

		preview.Previews[i] = result
	}

	s.logger.WithFields(logrus.Fields{
		"processed_count":     processedCount,
		"total_count":         len(batch.Transactions),
		"need_categorization": len(searchTexts),
	}).Debug("Processed transactions for categorization")

	// Perform batch categorization if needed
	if len(searchTexts) > 0 {

		results, err := s.categoryService.AutoCategorizeTransactions(ctx, userID, searchTexts)
		if err != nil {
			s.logger.WithFields(logrus.Fields{
				"error": err.Error(),
			}).Error("Batch categorization failed")
			return nil, customerrors.Wrap(err, customerrors.ErrCodeInternal, "categorization preview failed").WithDomain("transaction")
		}

		config := s.getAutoCategorizationConfig()
		categorizedCount := 0

		// Apply categorization results
		for transactionIndex, searchIndex := range transactionToSearchIndex {
			searchText := searchTexts[searchIndex]
			categorizationResult := results[searchText]

			if categorizationResult != nil {

				preview.Previews[transactionIndex].SuggestedCategory = &categorizationResult.CategoryID
				preview.Previews[transactionIndex].SuggestedCategoryName = &categorizationResult.CategoryName
				preview.Previews[transactionIndex].Confidence = categorizationResult.Confidence
				preview.Previews[transactionIndex].MatchMethod = categorizationResult.SimilarityType
				preview.Previews[transactionIndex].WillBeCategorized = categorizationResult.Confidence >= config.ConfidenceThreshold

				if preview.Previews[transactionIndex].WillBeCategorized {
					preview.WillBeCategorized++
					categorizedCount++
				}
			} else {
			}
		}

	}

	// Final validation
	if preview.Previews == nil {
		s.logger.Error("Critical error: Previews slice is nil, this should never happen")
		preview.Previews = make([]CategorizationResult, 0)
	}

	s.logger.WithFields(logrus.Fields{
		"total_transactions":  preview.TotalTransactions,
		"will_be_categorized": preview.WillBeCategorized,
		"previews_count":      len(preview.Previews),
	}).Info("Categorization preview completed")

	return preview, nil
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (s *TransactionService) AnalyzeTransactionCategorization(ctx context.Context, userID uuid.UUID, descriptions []string) (*CategorizationAnalysis, error) {
	if s.categoryService == nil {
		return nil, customerrors.New(customerrors.ErrCodeInternal, "category service not available").WithDomain("transaction")
	}

	analysis := &CategorizationAnalysis{
		TotalTransactions: len(descriptions),
		Results:           make([]CategorizationResult, 0, len(descriptions)),
		MethodStats:       make(map[string]int),
	}

	config := s.getAutoCategorizationConfig()

	for _, description := range descriptions {
		if description == "" {
			continue
		}

		// Use the consistent categorization method
		result, err := s.categoryService.AutoCategorizeTransaction(ctx, userID, description)
		if err != nil {
			s.logger.WithFields(logrus.Fields{
				"description": description,
				"error":       err.Error(),
			}).Warn("Analysis error for transaction description")
			continue
		}

		stats, err := s.categoryService.GetAutoCategorizationStats(ctx, userID, description)
		if err != nil {
			s.logger.WithFields(logrus.Fields{
				"description": description,
				"error":       err.Error(),
			}).Warn("Stats error for transaction description")
		}

		categorizationResult := CategorizationResult{
			Description: description,
			Stats:       stats,
		}

		if result != nil {
			categorizationResult.SuggestedCategory = &result.CategoryID
			categorizationResult.SuggestedCategoryName = &result.CategoryName
			categorizationResult.Confidence = result.Confidence
			categorizationResult.MatchMethod = result.SimilarityType
			categorizationResult.WillBeCategorized = result.Confidence >= config.ConfidenceThreshold

			analysis.MethodStats[result.SimilarityType]++

			if categorizationResult.WillBeCategorized {
				analysis.SuccessfulCategorizations++
			}
		}

		analysis.Results = append(analysis.Results, categorizationResult)
	}

	if analysis.TotalTransactions > 0 {
		analysis.SuccessRate = float64(analysis.SuccessfulCategorizations) / float64(analysis.TotalTransactions)
	}

	return analysis, nil
}

func (s *TransactionService) TestSingleCategorization(ctx context.Context, userID uuid.UUID, merchantName string) (*CategorizationResult, error) {
	if s.categoryService == nil {
		return nil, customerrors.New(customerrors.ErrCodeInternal, "category service not available").WithDomain("transaction")
	}

	// Use the consistent method
	result, err := s.categoryService.AutoCategorizeTransaction(ctx, userID, merchantName)
	if err != nil {
		return nil, err
	}

	stats, _ := s.categoryService.GetAutoCategorizationStats(ctx, userID, merchantName)

	config := s.getAutoCategorizationConfig()
	categorizationResult := &CategorizationResult{
		Description:       merchantName,
		Stats:             stats,
		WillBeCategorized: result != nil && result.Confidence >= config.ConfidenceThreshold,
	}

	if result != nil {
		categorizationResult.SuggestedCategory = &result.CategoryID
		categorizationResult.SuggestedCategoryName = &result.CategoryName
		categorizationResult.Confidence = result.Confidence
		categorizationResult.MatchMethod = result.SimilarityType
	}

	return categorizationResult, nil
}

// ========================================
// CRUD OPERATIONS
// ========================================

func (s *TransactionService) GetTransactions(ctx context.Context, userID uuid.UUID, filter TransactionFilter) (*TransactionListResponse, error) {
	s.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"filter":  filter,
	}).Debug("Getting transactions for user")

	result, err := s.repo.GetTransactions(ctx, userID, filter)
	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to retrieve transactions").
			WithDomain("transaction").
			WithUserID(userID).
			WithDetails(map[string]any{
				"filter":    filter,
				"operation": "get_transactions",
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

func (s *TransactionService) GetTransactionByID(ctx context.Context, userID, transactionID uuid.UUID) (*Transaction, error) {
	s.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
	}).Debug("Getting transaction by ID")

	transaction, err := s.repo.GetTransactionByID(ctx, userID, transactionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			appErr := customerrors.NewTransactionNotFound(transactionID).
				WithDomain("transaction").
				WithUserID(userID)
			appErr.Log()
			return nil, appErr
		}
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to retrieve transaction").
			WithDomain("transaction").
			WithUserID(userID).
			WithDetail("transaction_id", transactionID)
		appErr.Log()
		return nil, appErr
	}

	return transaction, nil
}

func (s *TransactionService) UpdateTransaction(ctx context.Context, userID, transactionID uuid.UUID, req *UpdateTransactionRequest) (*Transaction, error) {
	updates := make(map[string]interface{})

	if req.AccountID != nil {
		updates["account_id"] = *req.AccountID
	}
	if req.CategoryID != nil {
		updates["category_id"] = *req.CategoryID
	}
	if req.TransactionDate != nil {
		updates["transaction_date"] = *req.TransactionDate
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Amount != nil {
		updates["amount"] = *req.Amount
	}
	if req.TransactionType != nil {
		updates["transaction_type"] = *req.TransactionType
	}
	if req.MerchantName != nil {
		updates["merchant_name"] = *req.MerchantName
	}
	if req.Memo != nil {
		updates["memo"] = *req.Memo
	}
	if req.Tags != nil {
		updates["tags"] = pq.StringArray(req.Tags)
	}
	if req.UserNotes != nil {
		updates["user_notes"] = *req.UserNotes
	}

	updatedTransaction, err := s.repo.UpdateTransaction(ctx, userID, transactionID, updates)
	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to update transaction").
			WithDomain("transaction").
			WithUserID(userID).
			WithDetails(map[string]interface{}{
				"transaction_id": transactionID,
				"updates":        updates,
			})
		appErr.Log()
		return nil, appErr
	}

	s.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
		"updates_count":  len(updates),
	}).Info("Transaction updated successfully")

	return updatedTransaction, nil
}

func (s *TransactionService) DeleteTransaction(ctx context.Context, userID, transactionID uuid.UUID) error {
	s.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
	}).Debug("Deleting transaction")
	return s.repo.DeleteTransaction(ctx, userID, transactionID)
}

func (s *TransactionService) GetTransactionStats(ctx context.Context, userID uuid.UUID, startDate, endDate *time.Time, groupBy string) (*TransactionStats, error) {
	return s.repo.GetTransactionStats(ctx, userID, startDate, endDate, groupBy)
}
