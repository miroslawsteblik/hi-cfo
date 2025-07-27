package category

import (
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
	"time"
)

// ========================================
// Core Domain Model (Database Entity)
// ========================================

type Category struct {
	ID               uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	UserID           *uuid.UUID     `json:"user_id,omitempty" gorm:"type:uuid;index"` // NULL for system categories
	Name             string         `json:"name" gorm:"size:100;not null"`
	Description      *string        `json:"description,omitempty"`
	Color            *string        `json:"color,omitempty" gorm:"size:7"` // Hex color code
	Icon             *string        `json:"icon,omitempty" gorm:"size:50"`
	ParentCategoryID *uuid.UUID     `json:"parent_category_id,omitempty" gorm:"type:uuid"`
	CategoryLevel    int            `json:"category_level" gorm:"default:1"`
	CategoryType     string         `json:"category_type" gorm:"size:20;default:'expense';check:category_type IN ('income','expense','transfer')"`
	IsSystemCategory bool           `json:"is_system_category" gorm:"default:false"`
	IsActive         bool           `json:"is_active" gorm:"default:true"`
	Keywords         pq.StringArray `json:"keywords,omitempty" gorm:"type:text[]"`
	CreatedAt        time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt        gorm.DeletedAt `gorm:"index"`
}

func (Category) TableName() string {
	return "categories"
}

// BeforeCreate GORM hook
func (a *Category) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// ========================================
// Request DTOs (Data Transfer Objects)
// ========================================

type CreateCategoryRequest struct {
	Name         string   `json:"name" binding:"required,min=1,max=100"`
	Description  *string  `json:"description,omitempty" binding:"omitempty,max=255"`
	Color        *string  `json:"color,omitempty" binding:"omitempty,len=7"`
	Icon         *string  `json:"icon,omitempty" binding:"omitempty,max=50"`
	CategoryType string   `json:"category_type" binding:"required,oneof=income expense transfer"`
	Keywords     []string `json:"keywords,omitempty"`
}

// UpdateCategoryRequest represents the request payload for updating a category
type UpdateCategoryRequest struct {
	Name         *string  `json:"name,omitempty" binding:"omitempty,min=1,max=100"`
	Description  *string  `json:"description,omitempty" binding:"omitempty,max=255"`
	Color        *string  `json:"color,omitempty" binding:"omitempty,len=7"`
	Icon         *string  `json:"icon,omitempty" binding:"omitempty,max=50"`
	CategoryType *string  `json:"category_type,omitempty" binding:"omitempty,oneof=income expense transfer"`
	IsActive     *bool    `json:"is_active,omitempty"`
	Keywords     []string `json:"keywords,omitempty"`
}

// ========================================
// Query/Filter DTOs
// ========================================

type CategoryFilter struct {
	Page             int     `form:"page" binding:"omitempty,min=1"`
	Limit            int     `form:"limit" binding:"omitempty,min=1,max=100"`
	Search           *string `form:"search"`
	CategoryType     *string `form:"category_type"`
	IsSystemCategory *bool   `form:"is_system_category"`
	IsActive         *bool   `form:"is_active"`
}

// ========================================
// Response DTOs
// ========================================

type PaginatedResponse[T any] struct {
	Data  []T   `json:"data"`
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Pages int   `json:"pages"`
}

type CategoryResponse = PaginatedResponse[Category]

type MethodPerformance struct {
	UsageCount        int     `json:"usage_count"`
	TotalConfidence   float64 `json:"total_confidence"`
	AverageConfidence float64 `json:"average_confidence"`
}

type AutoCategorizationSettings struct {
	ConfidenceThreshold    float64  `json:"confidence_threshold"`
	EnabledMethods         []string `json:"enabled_methods"`
	AutoCategorizeOnUpload bool     `json:"auto_categorize_on_upload"`
}

type MatchDetail struct {
	CategoryID   uuid.UUID `json:"category_id"`
	CategoryName string    `json:"category_name"`
	Confidence   float64   `json:"confidence"`
	MatchedText  string    `json:"matched_text"`
}

// CategoryDetailResponse represents a single category response
type CategoryDetailResponse struct {
	Category
}

// ToResponse converts Category to a single category response
func (c *Category) ToResponse() CategoryDetailResponse {
	return CategoryDetailResponse{Category: *c}
}

// ========================================
// Auto-categorization Models
// ========================================

type CategoryMatchResult struct {
	CategoryID     uuid.UUID `json:"category_id"`
	CategoryName   string    `json:"category_name"`
	MatchType      string    `json:"match_type"`
	SimilarityType string    `json:"similarity_type"`
	MatchedText    string    `json:"matched_text"`
	Confidence     float64   `json:"confidence"`
}

type MethodStats struct {
	BestScore    float64 `json:"best_score"`
	MatchCount   int     `json:"match_count"`
	BestCategory string  `json:"best_category"`
}

type MatchingStats struct {
	MerchantName string                 `json:"merchant_name"`
	Methods      map[string]MethodStats `json:"methods"`
}
