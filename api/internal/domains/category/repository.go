package category

import (
	"context"
	"errors"
	"math"
	"time"

	"hi-cfo/api/internal/logger"
	customerrors "hi-cfo/api/internal/shared/errors"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Repository interface {
	GetCategories(ctx context.Context, userID uuid.UUID, filter CategoryFilter) (*CategoryResponse, error)
	GetSystemCategories(ctx context.Context) ([]Category, error)
	CreateCategory(ctx context.Context, category *Category) error
	GetCategoryByID(ctx context.Context, userID, categoryID uuid.UUID) (*Category, error)
	UpdateCategory(ctx context.Context, userID, categoryID uuid.UUID, updates map[string]interface{}) (*Category, error)
	DeleteCategory(ctx context.Context, userID, categoryID uuid.UUID) error
	CheckCategoryExists(ctx context.Context, userID uuid.UUID, categoryName string) (bool, error)
	MatchCategoryByMerchant(ctx context.Context, userID uuid.UUID, merchantName string) (*CategoryMatchResult, error)
	GetMatchingStats(ctx context.Context, userID uuid.UUID, merchantName string) (*MatchingStats, error)
	UpdateConfidenceThreshold(ctx context.Context, userID uuid.UUID, newThreshold float64) error
}

type CategoryRepository struct {
	db     *gorm.DB
	logger *logrus.Entry
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{
		db:     db,
		logger: logger.WithDomain("category"),
	}
}

func (r *CategoryRepository) GetCategories(ctx context.Context, userID uuid.UUID, filter CategoryFilter) (*CategoryResponse, error) {
	var categories []Category
	var total int64

	query := r.db.WithContext(ctx).Where("user_id = ? OR user_id IS NULL", userID)

	// Apply filters
	if filter.CategoryType != nil {
		query = query.Where("category_type = ?", *filter.CategoryType)
	}
	if filter.IsSystemCategory != nil {
		query = query.Where("is_system_category = ?", *filter.IsSystemCategory)
	}
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}
	if filter.Search != nil {
		searchPattern := "%" + *filter.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Get total count
	if err := query.Model(&Category{}).Count(&total).Error; err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to count categories").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id": userID,
				"filter":  filter,
			})
		appErr.Log()
		return nil, appErr
	}

	// Set defaults for pagination
	if filter.Page == 0 {
		filter.Page = 1
	}
	if filter.Limit == 0 {
		filter.Limit = 100 // Default higher for categories
	}

	// Apply pagination and ordering
	offset := (filter.Page - 1) * filter.Limit
	if err := query.Offset(offset).Limit(filter.Limit).Order("is_system_category DESC, name ASC").Find(&categories).Error; err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to fetch categories").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id": userID,
				"filter":  filter,
				"offset":  offset,
				"limit":   filter.Limit,
			})
		appErr.Log()
		return nil, appErr
	}

	// Calculate pages
	pages := int(math.Ceil(float64(total) / float64(filter.Limit)))

	return &CategoryResponse{
		Data:  categories,
		Total: total,
		Page:  filter.Page,
		Limit: filter.Limit,
		Pages: pages,
	}, nil
}

func (r *CategoryRepository) GetSystemCategories(ctx context.Context) ([]Category, error) {
	var categories []Category
	err := r.db.WithContext(ctx).Where("is_system_category = true AND is_active = true").Find(&categories).Error
	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to fetch system categories").
			WithDomain("category")
		appErr.Log()
		return nil, appErr
	}
	return categories, nil
}

func (r *CategoryRepository) CreateCategory(ctx context.Context, category *Category) error {
	if category.ID == uuid.Nil {
		category.ID = uuid.New()
	}

	now := time.Now()
	category.CreatedAt = now
	category.UpdatedAt = now

	if err := r.db.WithContext(ctx).Create(category).Error; err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to create category").
			WithDomain("category").
			WithDetails(map[string]any{
				"category_name": category.Name,
				"user_id":       category.UserID,
			})
		appErr.Log()
		return appErr
	}
	return nil
}

func (r *CategoryRepository) GetCategoryByID(ctx context.Context, userID, categoryID uuid.UUID) (*Category, error) {
	var category Category
	err := r.db.WithContext(ctx).Where("(user_id = ? OR user_id IS NULL) AND id = ?", userID, categoryID).First(&category).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			appErr := customerrors.New(customerrors.ErrCodeNotFound, "Category not found").
				WithDomain("category").
				WithDetails(map[string]any{
					"user_id":     userID,
					"category_id": categoryID,
				})
			appErr.Log()
			return nil, appErr
		}
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to get category").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":     userID,
				"category_id": categoryID,
			})
		appErr.Log()
		return nil, appErr
	}
	return &category, nil
}

func (r *CategoryRepository) UpdateCategory(ctx context.Context, userID, categoryID uuid.UUID, updates map[string]any) (*Category, error) {
	updates["updated_at"] = time.Now()

	// Only allow updating user categories, not system categories
	result := r.db.WithContext(ctx).Model(&Category{}).Where("user_id = ? AND id = ? AND is_system_category = false", userID, categoryID).Updates(updates)
	if result.Error != nil {
		appErr := customerrors.Wrap(result.Error, customerrors.ErrCodeInternal, "Failed to update category").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":     userID,
				"category_id": categoryID,
				"updates":     updates,
			})
		appErr.Log()
		return nil, appErr
	}
	if result.RowsAffected == 0 {
		appErr := customerrors.New(customerrors.ErrCodeNotFound, "Category not found or no changes made").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":     userID,
				"category_id": categoryID,
			})
		appErr.Log()
		return nil, appErr
	}

	// Return the updated category
	return r.GetCategoryByID(ctx, userID, categoryID)
}

func (r *CategoryRepository) DeleteCategory(ctx context.Context, userID, categoryID uuid.UUID) error {
	// Only allow deleting user categories, not system categories
	result := r.db.WithContext(ctx).Where("user_id = ? AND id = ? AND is_system_category = false", userID, categoryID).Delete(&Category{})
	if result.Error != nil {
		appErr := customerrors.Wrap(result.Error, customerrors.ErrCodeInternal, "Failed to delete category").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":     userID,
				"category_id": categoryID,
			})
		appErr.Log()
		return appErr
	}
	if result.RowsAffected == 0 {
		appErr := customerrors.New(customerrors.ErrCodeNotFound, "Category not found").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":     userID,
				"category_id": categoryID,
			})
		appErr.Log()
		return appErr
	}
	return nil
}

func (r *CategoryRepository) CheckCategoryExists(ctx context.Context, userID uuid.UUID, categoryName string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Category{}).
		Where("user_id = ? AND name ILIKE ?", userID, categoryName).
		Count(&count).Error
	if err != nil {
		appErr := customerrors.Wrap(err, customerrors.ErrCodeInternal, "Failed to check category existence").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":       userID,
				"category_name": categoryName,
			})
		appErr.Log()
		return false, appErr
	}

	return count > 0, nil
}

func (r *CategoryRepository) UpdateConfidenceThreshold(ctx context.Context, userID uuid.UUID, newThreshold float64) error {
	// This method updates the confidence threshold for auto-categorization for a specific user
	// For now, we'll implement a simple approach - this could be stored in a user settings table
	// or as part of user preferences in the future

	r.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"new_threshold": newThreshold,
	}).Info("Updating confidence threshold for user")

	// TODO: Implement actual threshold storage in database
	// For now, we'll just log the operation and return success
	// This could be implemented by:
	// 1. Adding a user_settings table
	// 2. Storing per-user confidence thresholds
	// 3. Using this threshold in the MatchCategoryByMerchant method

	return nil
}
