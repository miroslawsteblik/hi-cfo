
package account

import (
	"net/http"

	"hi-cfo/server/internal/logger"
	"hi-cfo/server/internal/shared"
	customerrors "hi-cfo/server/internal/shared/errors"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type AccountHandler struct {
	shared.BaseHandler
	service *AccountService
	logger  *logrus.Entry
}

func NewAccountHandler(service *AccountService) *AccountHandler {
	return &AccountHandler{
		service: service,
		logger:  logger.WithDomain("account"),
	}
}

// GET /accounts
func (h *AccountHandler) GetAccounts(c *gin.Context) {

	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var filter AccountFilter
	if !h.BindQuery(c, &filter) {
		return
	}

	// Set defaults (business logic that should eventually move to service)
	if filter.Page == 0 {
		filter.Page = 1
	}
	if filter.Limit == 0 {
		filter.Limit = 20
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"filter":  filter,
	}).Debug("Getting accounts for user")

	// Call service
	accounts, err := h.service.GetAccounts(c.Request.Context(), userID, filter)
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
		}).Error("Unexpected error retrieving accounts")
		h.RespondWithInternalError(c, "Failed to retrieve accounts")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"account_count": len(accounts.Data),
		"total":         accounts.Total,
		"page":          accounts.Page,
	}).Info("Successfully retrieved accounts")

	h.RespondWithSuccess(c, http.StatusOK, accounts)
}

// CreateAccount handles POST /accounts
func (h *AccountHandler) CreateAccount(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Bind and validate request
	var req CreateAccountRequest
	if !h.BindJSON(c, &req) {
		return
	}

	// Validate through service (business logic)
	if err := h.service.ValidateAccountRequest(&req); err != nil {
		h.RespondWithValidationError(c, "Invalid account data", err.Error())
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":      userID,
		"account_name": req.AccountName,
		"account_type": req.AccountType,
	}).Debug("Creating new account")

	// Create account
	account, err := h.service.CreateAccount(c.Request.Context(), userID, &req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":      userID,
			"account_name": req.AccountName,
			"error":        err.Error(),
		}).Error("Unexpected error creating account")
		h.RespondWithInternalError(c, "Failed to create account")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":      userID,
		"account_id":   account.ID,
		"account_name": account.AccountName,
	}).Info("Account created successfully")

	h.RespondWithSuccess(c, http.StatusCreated, account, "Account created successfully")
}

// GET /accounts/:id
func (h *AccountHandler) GetAccountByID(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse account ID from URL parameter
	accountID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"account_id": accountID,
	}).Debug("Getting account by ID")

	// Get account from service
	account, err := h.service.GetAccountByID(c.Request.Context(), userID, accountID)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":    userID,
			"account_id": accountID,
			"error":      err.Error(),
		}).Error("Unexpected error getting account")
		h.RespondWithNotFound(c, "Account")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, account)
}

// PUT /accounts/:id
func (h *AccountHandler) UpdateAccount(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse account ID
	accountID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	// Bind request
	var req UpdateAccountRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"account_id": accountID,
	}).Debug("Updating account")

	// Update account
	account, err := h.service.UpdateAccount(c.Request.Context(), userID, accountID, &req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":    userID,
			"account_id": accountID,
			"error":      err.Error(),
		}).Error("Unexpected error updating account")
		h.RespondWithInternalError(c, "Failed to update account")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, account, "Account updated successfully")
}

// DeleteAccount handles DELETE /accounts/:id
func (h *AccountHandler) DeleteAccount(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse account ID
	accountID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"account_id": accountID,
	}).Debug("Deleting account")

	// Delete account
	if err := h.service.DeleteAccount(c.Request.Context(), userID, accountID); err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":    userID,
			"account_id": accountID,
			"error":      err.Error(),
		}).Error("Unexpected error deleting account")
		h.RespondWithInternalError(c, "Failed to delete account")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"account_id": accountID,
	}).Info("Account deleted successfully")

	h.RespondWithSuccess(c, http.StatusNoContent, nil, "Account deleted successfully")
}

// GetAccountSummary handles GET /accounts/summary
func (h *AccountHandler) GetAccountSummary(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	h.logger.WithField("user_id", userID).Debug("Getting account summary")

	// Get summary from service
	summary, err := h.service.GetAccountSummary(c.Request.Context(), userID)
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
		}).Error("Unexpected error getting account summary")
		h.RespondWithInternalError(c, "Failed to retrieve account summary")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"total_accounts": summary.TotalAccounts,
	}).Info("Account summary retrieved successfully")

	h.RespondWithSuccess(c, http.StatusOK, summary)
}
