package category

import (
	"net/http"

	"hi-cfo/api/internal/logger"
	"hi-cfo/api/internal/shared"
	customerrors "hi-cfo/api/internal/shared/errors"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type CategoryHandler struct {
	shared.BaseHandler
	service *CategoryService
	logger  *logrus.Entry
}

func NewCategoryHandler(service *CategoryService) *CategoryHandler {
	return &CategoryHandler{
		service: service,
		logger:  logger.WithDomain("category"),
	}
}

// GET /categories
func (h *CategoryHandler) GetCategories(c *gin.Context) {

	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	var filter CategoryFilter
	if !h.BindQuery(c, &filter) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"filter":  filter,
	}).Debug("Getting categories for user")

	// call service
	categories, err := h.service.GetCategories(c.Request.Context(), userID, filter)
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
		}).Error("Unexpected error retrieving categories")
		h.RespondWithInternalError(c, "Failed to retrieve categories")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"category_count": len(categories.Data),
		"total":          categories.Total,
		"page":           categories.Page,
	}).Info("Successfully retrieved categories")

	h.RespondWithSuccess(c, http.StatusOK, categories)
}

// GET /categories/simple - returns just categories array without pagination
func (h *CategoryHandler) GetCategoriesSimple(c *gin.Context) {
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Simple filter with defaults
	filter := CategoryFilter{
		Page:  1,
		Limit: 200, // Get all categories
	}

	// Apply basic filters if provided using common helpers
	if categoryType := c.Query("category_type"); categoryType != "" {
		filter.CategoryType = &categoryType
	}

	if isActive, err := h.ParseQueryBool(c, "is_active"); err != nil {
		h.RespondWithValidationError(c, "Invalid is_active parameter", err.Error())
		return
	} else if isActive != nil {
		filter.IsActive = isActive
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"filter":  filter,
	}).Debug("Getting simple categories list")

	categories, err := h.service.GetCategories(c.Request.Context(), userID, filter)
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
		}).Error("Unexpected error retrieving simple categories")
		h.RespondWithInternalError(c, "Failed to retrieve categories")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"category_count": len(categories.Data),
	}).Info("Successfully retrieved simple categories")

	// Return just the categories array (not paginated response)
	h.RespondWithSuccess(c, http.StatusOK, categories.Data)
}

// CreateCategory handles POST /categories
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Bind and validate request
	var req CreateCategoryRequest
	if !h.BindJSON(c, &req) {
		return
	}

	// Validate through service (business logic)
	if err := h.service.ValidateCategoryRequest(&req); err != nil {
		h.RespondWithValidationError(c, "Invalid category data", err.Error())
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"category_name": req.Name,
		"category_type": req.CategoryType,
	}).Debug("Creating new category")

	// Create category
	category, err := h.service.CreateCategory(c.Request.Context(), userID, &req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":       userID,
			"category_name": req.Name,
			"error":         err.Error(),
		}).Error("Unexpected error creating category")
		h.RespondWithInternalError(c, "Failed to create category")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"category_id":   category.ID,
		"category_name": category.Name,
	}).Info("Category created successfully")

	h.RespondWithSuccess(c, http.StatusCreated, category, "Category created successfully")
}

// GET /categories/:id
func (h *CategoryHandler) GetCategoryByID(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse category ID from URL parameter
	categoryID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":     userID,
		"category_id": categoryID,
	}).Debug("Getting category by ID")

	// Get category from service
	category, err := h.service.GetCategoryByID(c.Request.Context(), userID, categoryID)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":     userID,
			"category_id": categoryID,
			"error":       err.Error(),
		}).Error("Unexpected error getting category")
		h.RespondWithNotFound(c, "Category")
		return
	}

	h.RespondWithSuccess(c, http.StatusOK, category)
}

// PUT /categories/:id
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse category ID
	categoryID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	// Bind request
	var req UpdateCategoryRequest
	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":     userID,
		"category_id": categoryID,
	}).Debug("Updating category")

	// Update category
	category, err := h.service.UpdateCategory(c.Request.Context(), userID, categoryID, &req)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":     userID,
			"category_id": categoryID,
			"error":       err.Error(),
		}).Error("Unexpected error updating category")
		h.RespondWithInternalError(c, "Failed to update category")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":     userID,
		"category_id": categoryID,
	}).Info("Category updated successfully")

	h.RespondWithSuccess(c, http.StatusOK, category, "Category updated successfully")
}

// DeleteCategory handles DELETE /categories/:id
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Parse category ID
	categoryID, ok := h.HandleUUIDParsing(c, "id")
	if !ok {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":     userID,
		"category_id": categoryID,
	}).Debug("Deleting category")

	// Delete category
	if err := h.service.DeleteCategory(c.Request.Context(), userID, categoryID); err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":     userID,
			"category_id": categoryID,
			"error":       err.Error(),
		}).Error("Unexpected error deleting category")
		h.RespondWithInternalError(c, "Failed to delete category")
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":     userID,
		"category_id": categoryID,
	}).Info("Category deleted successfully")

	h.RespondWithSuccess(c, http.StatusOK, nil, "Category deleted successfully")
}

// AutoCategorize handles POST /categories/auto-categorize
func (h *CategoryHandler) AutoCategorize(c *gin.Context) {
	// Extract user ID
	userID, ok := h.HandleUserIDExtraction(c)
	if !ok {
		return
	}

	// Define and bind request structure
	var req struct {
		MerchantName string `json:"merchant_name" binding:"required"`
	}

	if !h.BindJSON(c, &req) {
		return
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"merchant_name": req.MerchantName,
	}).Debug("Auto-categorizing transaction")

	// Call auto-categorization service
	match, err := h.service.AutoCategorizeTransaction(c.Request.Context(), userID, req.MerchantName)
	if err != nil {
		// Check if it's a custom error
		if appErr, ok := err.(*customerrors.AppError); ok {
			// Custom error already logged in service, just return appropriate response
			c.JSON(appErr.StatusCode, appErr)
			return
		}
		// Fallback for unexpected errors
		h.logger.WithFields(logrus.Fields{
			"user_id":       userID,
			"merchant_name": req.MerchantName,
			"error":         err.Error(),
		}).Error("Unexpected error auto-categorizing transaction")
		h.RespondWithInternalError(c, "Failed to auto-categorize transaction")
		return
	}

	// Prepare response data
	var responseData any
	var message string

	if match == nil {
		responseData = nil
		message = "No matching category found"
		h.logger.WithFields(logrus.Fields{
			"user_id":       userID,
			"merchant_name": req.MerchantName,
		}).Info("No category match found for auto-categorization")
	} else {
		responseData = map[string]any{"match": match}
		message = "Category match found"
		h.logger.WithFields(logrus.Fields{
			"user_id":       userID,
			"merchant_name": req.MerchantName,
			"category_id":   match.CategoryID,
			"category_name": match.CategoryName,
			"confidence":    match.Confidence,
			"match_method":  match.SimilarityType,
		}).Info("Category match found for auto-categorization")
	}

	h.RespondWithSuccess(c, http.StatusOK, responseData, message)
}
