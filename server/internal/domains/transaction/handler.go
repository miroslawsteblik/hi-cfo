package transaction

import (
	"fmt"
	"net/http"
	"time"

	"hi-cfo/server/internal/logger"
	"hi-cfo/server/internal/shared"
	customerrors "hi-cfo/server/internal/shared/errors"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type TransactionHandler struct {
	shared.BaseHandler
	service *TransactionService
	logger  *logrus.Entry
}

func NewTransactionHandler(service *TransactionService) *TransactionHandler {
	return &TransactionHandler{
		service: service,
		logger:  logger.WithDomain("transaction"),
	}
}

func (h *TransactionHandler) PreviewCategorization(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var batch BatchTransactionRequest
	if !h.BindJSON(c, &batch) {
		return
	}

	// Add source to batch if not provided
	if batch.Source == "" {
		batch.Source = "preview"
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":           userID,
		"transaction_count": len(batch.Transactions),
		"source":            batch.Source,
	}).Debug("Starting categorization preview")

	preview, err := h.service.PreviewBatchCategorization(c.Request.Context(), userID, batch)
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
		}).Error("Unexpected error in categorization preview")
		h.RespondWithInternalError(c, "Categorization preview failed")
		return
	}

	if preview == nil {
		h.RespondWithInternalError(c, "Preview result is nil")
		return
	}

	// Ensure Previews is never nil
	if preview.Previews == nil {
		preview.Previews = make([]CategorizationResult, 0)
	}

	h.RespondWithSuccess(c, http.StatusOK, preview, "Categorization preview generated successfully")
}

func (h *TransactionHandler) AnalyzeTransactionCategorization(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var req struct {
		Descriptions []string `json:"descriptions" binding:"required"`
	}

	if !h.BindJSON(c, &req) {
		return
	}

	if len(req.Descriptions) > 100 {
		h.RespondWithValidationError(c, "Maximum 100 descriptions allowed per analysis", "")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":           userID,
		"description_count": len(req.Descriptions),
	}).Debug("Analyzing transaction categorization")

	analysis, err := h.service.AnalyzeTransactionCategorization(c.Request.Context(), userID, req.Descriptions)
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
		}).Error("Unexpected error analyzing transaction categorization")
		h.RespondWithInternalError(c, "Failed to analyze transaction categorization")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, analysis)
}

// GET /transactions =
func (h *TransactionHandler) GetTransactions(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse query parameters
	var filter TransactionFilter
	if !h.BindQuery(c, &filter) {
		return
	}

	// Set defaults
	if filter.Page == 0 {
		filter.Page = 1
	}
	if filter.Limit == 0 {
		filter.Limit = 20
	}

	// Parse date strings with flexible parsing (date-only or full datetime)
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := shared.ParseFlexibleDate(startDateStr); err == nil {
			filter.StartDate = &startDate
		} else {
			h.RespondWithValidationError(c, "Invalid start_date format", err.Error())
			return
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := shared.ParseFlexibleDate(endDateStr); err == nil {
			filter.EndDate = &endDate
		} else {
			h.RespondWithValidationError(c, "Invalid end_date format", err.Error())
			return
		}
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"filter":  filter,
	}).Debug("Getting transactions for user")

	transactions, err := h.service.GetTransactions(c.Request.Context(), userID, filter)
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
		}).Error("Unexpected error retrieving transactions")
		h.RespondWithInternalError(c, "Failed to retrieve transactions")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":           userID,
		"transaction_count": len(transactions.Data),
		"total":             transactions.Total,
	}).Info("Successfully retrieved transactions")

	h.RespondWithSuccess(c, http.StatusOK, transactions)
}

// POST /transactions
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var input TransactionRequest
	if !h.BindJSON(c, &input) {
		return
	}

	// Optional: Quick client-side validation for better UX
	if validationErrors := input.IsValid(); len(validationErrors) > 0 {
		h.RespondWithValidationError(c, "Request validation failed", fmt.Sprintf("%v", validationErrors))
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":          userID,
		"transaction_type": input.TransactionType,
		"amount":           input.Amount,
		"description":      input.Description,
	}).Debug("Creating new transaction")

	// Delegate to service (where ALL real validation happens)
	transaction, err := h.service.CreateTransaction(c.Request.Context(), userID, input)
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
		}).Error("Unexpected error creating transaction")
		h.RespondWithInternalError(c, "Failed to create transaction")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transaction.ID,
		"amount":         transaction.Amount,
	}).Info("Transaction created successfully")

	h.RespondWithSuccess(c, http.StatusCreated, transaction, "Transaction created successfully")
}

// POST /transactions/bulk-upload
func (h *TransactionHandler) CreateBatchTransactions(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var batch BatchTransactionRequest
	if !h.BindJSON(c, &batch) {
		return
	}

	// Basic batch size validation (HTTP-specific concern)
	if len(batch.Transactions) == 0 {
		h.RespondWithValidationError(c, "Batch cannot be empty", "")
		return
	}

	if len(batch.Transactions) > 1000 { // HTTP-specific limit
		h.RespondWithValidationError(c, "Batch too large (max 1000 transactions)", "")
		return
	}

	// Set source if not provided
	if batch.Source == "" {
		batch.Source = "api"
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":           userID,
		"transaction_count": len(batch.Transactions),
		"source":            batch.Source,
	}).Debug("Processing transaction batch")

	// Delegate to service (where ALL real validation happens)
	result, err := h.service.ProcessTransactionBatch(c.Request.Context(), userID, batch)
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
		}).Error("Unexpected error processing transaction batch")
		h.RespondWithInternalError(c, "Failed to process transaction batch")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"created": result.Created,
		"skipped": result.Skipped,
		"errors":  len(result.Errors),
	}).Info("Transaction batch processing completed")

	// Return appropriate HTTP status based on results
	status := http.StatusCreated
	if result.Created == 0 {
		status = http.StatusBadRequest
	} else if result.Skipped > 0 {
		status = http.StatusPartialContent // 206 - some succeeded, some failed
	}

	c.JSON(status, gin.H{
		"success": result.Created > 0,
		"data":    result,
	})
}

func (h *TransactionHandler) GetCategorizationSettings(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Here you would typically fetch user-specific settings from the database
	// For now, we'll return a default settings structure
	// You might want to add a method in the service to get user settings

	// This would require access to the category service
	// For now, return default settings structure

	settings := gin.H{
		"confidence_threshold":      0.5,
		"auto_categorize_on_upload": true,
		"enabled_methods": []string{
			"keyword",
			"jaccard",
			"levenshtein",
			"cosine_tfidf",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":  userID,
		"settings": settings,
	})
}

func (h *TransactionHandler) UpdateCategorizationSettings(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var req struct {
		ConfidenceThreshold    *float64 `json:"confidence_threshold"`
		AutoCategorizeOnUpload *bool    `json:"auto_categorize_on_upload"`
		EnabledMethods         []string `json:"enabled_methods"`
	}

	if !h.BindJSON(c, &req) {
		return
	}

	// Validate confidence threshold
	if req.ConfidenceThreshold != nil {
		if *req.ConfidenceThreshold < 0 || *req.ConfidenceThreshold > 1 {
			h.RespondWithValidationError(c, "Confidence threshold must be between 0 and 1", "")
			return
		}
	}

	// This would update the user's settings
	// For now, just return success
	h.RespondWithSuccess(c, http.StatusOK, gin.H{"user_id": userID}, "Settings updated successfully")
}

// ============ GET /transactions/:id
func (h *TransactionHandler) GetTransactionByID(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	transactionID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
	}).Debug("Getting transaction by ID")

	transaction, err := h.service.GetTransactionByID(c.Request.Context(), userID, transactionID)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":        userID,
			"transaction_id": transactionID,
			"error":          err.Error(),
		}).Error("Unexpected error getting transaction")
		h.RespondWithNotFound(c, "Transaction")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, transaction)

}

// ================== PUT /transactions/:id
func (h *TransactionHandler) UpdateTransaction(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	transactionID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	var req UpdateTransactionRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
	}).Debug("Updating transaction")

	transaction, err := h.service.UpdateTransaction(c.Request.Context(), userID, transactionID, &req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":        userID,
			"transaction_id": transactionID,
			"error":          err.Error(),
		}).Error("Unexpected error updating transaction")
		h.RespondWithInternalError(c, "Failed to update transaction")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
	}).Info("Transaction updated successfully")

	h.RespondWithSuccess(c, http.StatusOK, transaction, "Transaction updated successfully")
}

// =============== DELETE /transactions/:id
func (h *TransactionHandler) DeleteTransaction(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	transactionID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
	}).Debug("Deleting transaction")

	if err := h.service.DeleteTransaction(c.Request.Context(), userID, transactionID); err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":        userID,
			"transaction_id": transactionID,
			"error":          err.Error(),
		}).Error("Unexpected error deleting transaction")
		h.RespondWithInternalError(c, "Failed to delete transaction")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"transaction_id": transactionID,
	}).Info("Transaction deleted successfully")

	h.RespondWithSuccess(c, http.StatusNoContent, nil, "Transaction deleted successfully")
}

// ============ GET /transactions/stats
func (h *TransactionHandler) GetTransactionStats(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse date range
	var startDate, endDate *time.Time
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if parsed, err := shared.ParseFlexibleDate(startDateStr); err == nil {
			startDate = &parsed
		} else {
			h.RespondWithValidationError(c, "Invalid start_date format", err.Error())
			return
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if parsed, err := shared.ParseFlexibleDate(endDateStr); err == nil {
			endDate = &parsed
		} else {
			h.RespondWithValidationError(c, "Invalid end_date format", err.Error())
			return
		}
	}

	groupBy := c.DefaultQuery("group_by", "category")

	h.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"start_date": startDate,
		"end_date":   endDate,
		"group_by":   groupBy,
	}).Debug("Getting transaction stats")

	stats, err := h.service.GetTransactionStats(c.Request.Context(), userID, startDate, endDate, groupBy)
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
		}).Error("Unexpected error retrieving transaction stats")
		h.RespondWithInternalError(c, "Failed to retrieve transaction stats")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":           userID,
		"transaction_count": stats.TransactionCount,
		"total_income":      stats.TotalIncome,
		"total_expenses":    stats.TotalExpenses,
	}).Info("Successfully retrieved transaction stats")

	h.RespondWithSuccess(c, http.StatusOK, stats)
}
