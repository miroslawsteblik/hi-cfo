package category

import (
	"context"

	"hi-cfo/server/internal/logger"

	customerrors "hi-cfo/server/internal/shared/errors"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/sirupsen/logrus"
)

type CategoryStore interface {
	AutoCategorizeTransaction(ctx context.Context, userID uuid.UUID, merchantName string) (*CategoryMatchResult, error)
	AutoCategorizeTransactions(ctx context.Context, userID uuid.UUID, merchantNames []string) (map[string]*CategoryMatchResult, error)
	GetAutoCategorizationStats(ctx context.Context, userID uuid.UUID, merchantName string) (*MatchingStats, error)

	GetCategories(ctx context.Context, userID uuid.UUID, filter CategoryFilter) (*CategoryResponse, error)
	GetSystemCategories(ctx context.Context) ([]Category, error)
	CreateCategory(ctx context.Context, userID uuid.UUID, req *CreateCategoryRequest) (*Category, error)
	GetCategoryByID(ctx context.Context, userID, categoryID uuid.UUID) (*Category, error)
	UpdateCategory(ctx context.Context, userID, categoryID uuid.UUID, req *UpdateCategoryRequest) (*Category, error)
	DeleteCategory(ctx context.Context, userID, categoryID uuid.UUID) error
	ValidateCategory(category *Category) error
	ValidateCategoryRequest(req *CreateCategoryRequest) error
}

type CategoryService struct {
	repo   Repository
	logger *logrus.Entry
}

func NewCategoryService(repo Repository) *CategoryService {
	return &CategoryService{
		repo:   repo,
		logger: logger.WithDomain("category"),
	}
}

func (s *CategoryService) AutoCategorizeTransactions(ctx context.Context, userID uuid.UUID, merchantNames []string) (map[string]*CategoryMatchResult, error) {
	results := make(map[string]*CategoryMatchResult)

	// Process in batches for better performance
	batchSize := 50
	for i := 0; i < len(merchantNames); i += batchSize {
		end := i + batchSize
		if end > len(merchantNames) {
			end = len(merchantNames)
		}

		batch := merchantNames[i:end]
		for _, merchantName := range batch {
			if merchantName != "" {
				result, err := s.AutoCategorizeTransaction(ctx, userID, merchantName)
				if err != nil {
					s.logger.WithFields(logrus.Fields{
						"merchant_name": merchantName,
						"user_id":       userID,
						"error":         err,
					}).Warn("Error categorizing transaction")
					continue
				}
				results[merchantName] = result
			}
		}
	}

	return results, nil
}

func (s *CategoryService) AutoCategorizeTransaction(ctx context.Context, userID uuid.UUID, merchantName string) (*CategoryMatchResult, error) {
	if merchantName == "" {
		return nil, nil
	}
	return s.repo.MatchCategoryByMerchant(ctx, userID, merchantName)
}

func (s *CategoryService) GetAutoCategorizationStats(ctx context.Context, userID uuid.UUID, merchantName string) (*MatchingStats, error) {
	if merchantName == "" {
		return nil, nil
	}

	// Just delegate to repository - keep it simple
	return s.repo.GetMatchingStats(ctx, userID, merchantName)
}

func (s *CategoryService) GetCategories(ctx context.Context, userID uuid.UUID, filter CategoryFilter) (*CategoryResponse, error) {
	return s.repo.GetCategories(ctx, userID, filter)
}

func (s *CategoryService) GetSystemCategories(ctx context.Context) ([]Category, error) {
	return s.repo.GetSystemCategories(ctx)
}

func (s *CategoryService) CreateCategory(ctx context.Context, userID uuid.UUID, req *CreateCategoryRequest) (*Category, error) {
	exists, err := s.repo.CheckCategoryExists(ctx, userID, req.Name)
	if err != nil {
		return nil, err
	}
	if exists {
		appErr := customerrors.New(customerrors.ErrCodeConflict, "Category with this name already exists").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":       userID,
				"category_name": req.Name,
			})
		appErr.Log()
		return nil, appErr
	}

	category := &Category{
		UserID:           &userID,
		Name:             req.Name,
		Description:      req.Description,
		Color:            req.Color,
		Icon:             req.Icon,
		CategoryType:     req.CategoryType,
		IsSystemCategory: false,
		IsActive:         true,
		Keywords:         pq.StringArray(req.Keywords),
		CategoryLevel:    1,
	}

	if err := s.ValidateCategory(category); err != nil {
		return nil, err
	}

	if err := s.repo.CreateCategory(ctx, category); err != nil {
		return nil, err
	}

	return category, nil
}

func (s *CategoryService) GetCategoryByID(ctx context.Context, userID, categoryID uuid.UUID) (*Category, error) {
	return s.repo.GetCategoryByID(ctx, userID, categoryID)
}

func (s *CategoryService) UpdateCategory(ctx context.Context, userID, categoryID uuid.UUID, req *UpdateCategoryRequest) (*Category, error) {
	existingCategory, err := s.repo.GetCategoryByID(ctx, userID, categoryID)
	if err != nil {
		return nil, err
	}

	if existingCategory.IsSystemCategory {
		appErr := customerrors.New(customerrors.ErrCodeForbidden, "Cannot update system categories").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":     userID,
				"category_id": categoryID,
			})
		appErr.Log()
		return nil, appErr
	}

	updates := make(map[string]interface{})

	if req.Name != nil {
		if *req.Name != existingCategory.Name {
			exists, err := s.repo.CheckCategoryExists(ctx, userID, *req.Name)
			if err != nil {
				return nil, err
			}
			if exists {
				appErr := customerrors.New(customerrors.ErrCodeConflict, "Category with this name already exists").
					WithDomain("category").
					WithDetails(map[string]any{
						"user_id":       userID,
						"category_name": *req.Name,
						"category_id":   categoryID,
					})
				appErr.Log()
				return nil, appErr
			}
		}
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Color != nil {
		updates["color"] = *req.Color
	}
	if req.Icon != nil {
		updates["icon"] = *req.Icon
	}
	if req.CategoryType != nil {
		updates["category_type"] = *req.CategoryType
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Keywords != nil {
		updates["keywords"] = pq.StringArray(req.Keywords)
	}

	return s.repo.UpdateCategory(ctx, userID, categoryID, updates)
}

func (s *CategoryService) DeleteCategory(ctx context.Context, userID, categoryID uuid.UUID) error {
	existingCategory, err := s.repo.GetCategoryByID(ctx, userID, categoryID)
	if err != nil {
		return err
	}

	if existingCategory.IsSystemCategory {
		appErr := customerrors.New(customerrors.ErrCodeForbidden, "Cannot delete system categories").
			WithDomain("category").
			WithDetails(map[string]any{
				"user_id":     userID,
				"category_id": categoryID,
			})
		appErr.Log()
		return appErr
	}

	return s.repo.DeleteCategory(ctx, userID, categoryID)
}

// ============== VALIDATION ==============//

func (s *CategoryService) ValidateCategory(category *Category) error {
	if category.Name == "" {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Category name is required").
			WithDomain("category")
		appErr.Log()
		return appErr
	}

	if category.CategoryType == "" {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Category type is required").
			WithDomain("category")
		appErr.Log()
		return appErr
	}

	validTypes := map[string]bool{
		"income":   true,
		"expense":  true,
		"transfer": true,
	}

	if !validTypes[category.CategoryType] {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Invalid category type").
			WithDomain("category").
			WithDetail("category_type", category.CategoryType)
		appErr.Log()
		return appErr
	}

	if category.Color != nil && len(*category.Color) != 7 {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Color must be a valid hex color code (e.g., #FF0000)").
			WithDomain("category").
			WithDetail("color", *category.Color)
		appErr.Log()
		return appErr
	}

	return nil
}

func (s *CategoryService) ValidateCategoryRequest(req *CreateCategoryRequest) error {
	if req.Name == "" {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Category name is required").
			WithDomain("category")
		appErr.Log()
		return appErr
	}

	if req.CategoryType == "" {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Category type is required").
			WithDomain("category")
		appErr.Log()
		return appErr
	}

	validTypes := map[string]bool{
		"income":   true,
		"expense":  true,
		"transfer": true,
	}

	if !validTypes[req.CategoryType] {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Invalid category type").
			WithDomain("category").
			WithDetail("category_type", req.CategoryType)
		appErr.Log()
		return appErr
	}

	if req.Color != nil && len(*req.Color) != 7 {
		appErr := customerrors.New(customerrors.ErrCodeValidation, "Color must be a valid hex color code (e.g., #FF0000)").
			WithDomain("category").
			WithDetail("color", *req.Color)
		appErr.Log()
		return appErr
	}

	return nil
}
