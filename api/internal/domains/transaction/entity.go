package transaction

import (
	"fmt"
	"time"

	"hi-cfo/api/internal/domains/category"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// ========================================
// Core Domain Model (Database Entity)
// ========================================

type Transaction struct {
	ID               uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	UserID           uuid.UUID      `json:"user_id" gorm:"type:uuid;not null;index"`
	AccountID        uuid.UUID      `json:"account_id" gorm:"type:uuid;not null"`
	CategoryID       *uuid.UUID     `json:"category_id,omitempty" gorm:"type:uuid"`
	FileUploadID     *uuid.UUID     `json:"file_upload_id,omitempty" gorm:"type:uuid"`
	FitID            *string        `json:"fit_id,omitempty" gorm:"size:100;index"` // For OFX imports
	TransactionDate  time.Time      `json:"transaction_date" gorm:"not null;index"`
	PostedDate       *time.Time     `json:"posted_date,omitempty"`
	Description      string         `json:"description" gorm:"not null"`
	MerchantName     *string        `json:"merchant_name,omitempty" gorm:"size:200"`
	Amount           float64        `json:"amount" gorm:"type:decimal(12,2);not null"`
	TransactionType  string         `json:"transaction_type" gorm:"size:20;default:'expense';check:transaction_type IN ('income','expense','transfer','fee','interest','dividend','refund')"`
	Currency         string         `json:"currency" gorm:"size:3;default:'USD'"`
	ReferenceNumber  *string        `json:"reference_number,omitempty" gorm:"size:100"`
	Memo             *string        `json:"memo,omitempty"`
	BalanceAfter     *float64       `json:"balance_after,omitempty" gorm:"type:decimal(12,2)"`
	IsRecurring      bool           `json:"is_recurring" gorm:"default:false"`
	RecurringPattern *string        `json:"recurring_pattern,omitempty" gorm:"size:50"`
	Tags             pq.StringArray `json:"tags,omitempty" gorm:"type:text[]"`
	IsDuplicate      bool           `json:"is_duplicate" gorm:"default:false"`
	ConfidenceScore  *float64       `json:"confidence_score,omitempty" gorm:"type:decimal(3,2)"`
	NeedsReview      bool           `json:"needs_review" gorm:"default:false"`
	IsHidden         bool           `json:"is_hidden" gorm:"default:false"`
	UserDescription  *string        `json:"user_description,omitempty"`
	UserNotes        *string        `json:"user_notes,omitempty"`
	CreatedAt        time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt        gorm.DeletedAt `gorm:"index"`
}

func (Transaction) TableName() string {
	return "transactions"
}

// BeforeCreate GORM hook
func (a *Transaction) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// Single input struct for ALL transaction sources (API, CSV, OFX, Forms)
type TransactionRequest struct {
	// Core fields (all as strings - get parsed by service layer)
	AccountID       string  `json:"account_id" binding:"required"`
	CategoryID      *string `json:"category_id,omitempty"`
	FitID           *string `json:"fit_id,omitempty"`
	FileUploadID    *string `json:"file_upload_id,omitempty"`
	TransactionDate string  `json:"transaction_date" binding:"required"` // ISO string, CSV date, etc.
	Description     string  `json:"description" binding:"required"`
	Amount          float64 `json:"amount" binding:"required"`
	TransactionType string  `json:"transaction_type" binding:"required"`
	Currency        string  `json:"currency" binding:"required"`

	// Optional fields
	MerchantName    *string  `json:"merchant_name,omitempty"`
	Memo            *string  `json:"memo,omitempty"`
	Tags            []string `json:"tags,omitempty"`
	ReferenceNumber *string  `json:"reference_number,omitempty"`
	UserNotes       *string  `json:"user_notes,omitempty"`
}

// Container for batch operations
type BatchTransactionRequest struct {
	Transactions []TransactionRequest `json:"transactions" binding:"required"`
	Source       string               `json:"source,omitempty"` // "api", "csv", "ofx", "form"
}

// Intermediate processing model (service layer)
type ProcessedTransaction struct {
	// Parsed and validated fields ready for database
	AccountID       uuid.UUID
	CategoryID      *uuid.UUID
	FitID           *string
	FileUploadID    *uuid.UUID
	TransactionDate time.Time
	Description     string
	Amount          float64
	TransactionType string
	Currency        string
	MerchantName    *string
	Memo            *string
	Tags            []string
	ReferenceNumber *string
	UserNotes       *string

	// Processing metadata
	OriginalInput TransactionRequest `json:"-"`
	ParseErrors   []string           `json:"-"`
}

// UpdateTransactionRequest - For updating existing transactions
type UpdateTransactionRequest struct {
	AccountID       *uuid.UUID `json:"account_id,omitempty"`
	CategoryID      *uuid.UUID `json:"category_id,omitempty"`
	TransactionDate *time.Time `json:"transaction_date,omitempty"`
	Description     *string    `json:"description,omitempty"`
	Amount          *float64   `json:"amount,omitempty"`
	TransactionType *string    `json:"transaction_type,omitempty"`
	MerchantName    *string    `json:"merchant_name,omitempty"`
	Memo            *string    `json:"memo,omitempty"`
	Tags            []string   `json:"tags,omitempty"`
	UserNotes       *string    `json:"user_notes,omitempty"`
}

// Single result type for all batch operations
type BatchOperationResult struct {
	Total        int         `json:"total"`
	Created      int         `json:"created"`
	Skipped      int         `json:"skipped"`
	CreatedIDs   []uuid.UUID `json:"created_ids,omitempty"`
	Duplicates   []string    `json:"duplicates,omitempty"` // FitIDs of duplicates
	Errors       []string    `json:"errors,omitempty"`
	Source       string      `json:"source,omitempty"` // Source that created this batch
	FileUploadID *string     `json:"file_upload_id,omitempty"`
}

// ========================================
// VIEW MODELS
// ========================================

// Base transaction view for common fields
type TransactionView struct {
	ID              uuid.UUID  `json:"id"`
	AccountID       uuid.UUID  `json:"account_id"`
	CategoryID      *uuid.UUID `json:"category_id,omitempty"`
	TransactionDate time.Time  `json:"transaction_date"`
	Description     string     `json:"description"`
	MerchantName    *string    `json:"merchant_name,omitempty"`
	Amount          float64    `json:"amount"`
	TransactionType string     `json:"transaction_type"`
	Currency        string     `json:"currency"`
	Tags            []string   `json:"tags,omitempty"`
}

// List view (for transaction lists)
type TransactionListItem struct {
	TransactionView
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Summary view (for dashboards/stats)
type TransactionSummary struct {
	ID              uuid.UUID `json:"id"`
	Description     string    `json:"description"`
	Amount          float64   `json:"amount"`
	TransactionType string    `json:"transaction_type"`
	TransactionDate time.Time `json:"transaction_date"`
	Currency        string    `json:"currency"`
}

// Detail view (for single transaction with enriched data)
type TransactionDetail struct {
	Transaction
	CategoryName *string `json:"category_name,omitempty"`
	AccountName  string  `json:"account_name"`
}

// ========================================
// UNIFIED CATEGORIZATION MODELS
// ========================================

type CategorizationResult struct {
	TransactionID         *uuid.UUID              `json:"transaction_id,omitempty"`
	Description           string                  `json:"description"`
	MerchantName          *string                 `json:"merchant_name,omitempty"`
	OriginalCategory      *uuid.UUID              `json:"original_category,omitempty"`
	SuggestedCategory     *uuid.UUID              `json:"suggested_category,omitempty"`
	SuggestedCategoryName *string                 `json:"suggested_category_name,omitempty"`
	Confidence            float64                 `json:"confidence"`
	MatchMethod           string                  `json:"match_method"`
	WillBeCategorized     bool                    `json:"will_be_categorized"`
	Index                 *int                    `json:"index,omitempty"` // For batch operations
	Stats                 *category.MatchingStats `json:"stats,omitempty"`
}

// Bulk categorization preview
type BulkCategorizationPreview struct {
	TotalTransactions int                    `json:"total_transactions"`
	WillBeCategorized int                    `json:"will_be_categorized"`
	Previews          []CategorizationResult `json:"previews"`
}

// Categorization analysis
type CategorizationAnalysis struct {
	TotalTransactions         int                    `json:"total_transactions"`
	SuccessfulCategorizations int                    `json:"successful_categorizations"`
	SuccessRate               float64                `json:"success_rate"`
	Results                   []CategorizationResult `json:"results"`
	MethodStats               map[string]int         `json:"method_stats"`
}

// ========================================
// RESPONSE CONTAINERS
// ========================================

type PaginatedResponse[T any] struct {
	Data  []T   `json:"data"`
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Pages int   `json:"pages"`
}

// Specific response types
type TransactionListResponse = PaginatedResponse[TransactionListItem]

// ========================================
// FILTER MODELS
// ========================================
type TransactionFilter struct {
	Page            int        `form:"page" binding:"min=1"`
	Limit           int        `form:"limit" binding:"min=1,max=100"`
	AccountID       *uuid.UUID `form:"account_id"`
	CategoryID      *uuid.UUID `form:"category_id"`
	StartDate       *time.Time `form:"-"`
	EndDate         *time.Time `form:"-"`
	TransactionType *string    `form:"transaction_type"`
	MinAmount       *float64   `form:"min_amount"`
	MaxAmount       *float64   `form:"max_amount"`
	SearchTerm      *string    `form:"search"`
}

// ========================================
// STATISTICS MODELS
// ========================================

// TransactionStats - For analytics
type TransactionStats struct {
	TotalIncome      float64        `json:"total_income"`
	TotalExpenses    float64        `json:"total_expenses"`
	NetIncome        float64        `json:"net_income"`
	TransactionCount int64          `json:"transaction_count"`
	ByCategory       []CategoryStat `json:"by_category"`
	ByPeriod         []PeriodStat   `json:"by_period,omitempty"`
}

// CategoryStat - For category breakdown
type CategoryStat struct {
	CategoryID   *uuid.UUID `json:"category_id"`
	CategoryName *string    `json:"category_name,omitempty"`
	Amount       float64    `json:"amount"`
	Count        int64      `json:"count"`
}

// PeriodStat - For time-based breakdown
type PeriodStat struct {
	Period string  `json:"period"`
	Amount float64 `json:"amount"`
	Count  int64   `json:"count"`
}

// Update CategoryMatchResult to match auto-categorize.go
type CategoryMatchResult struct {
	CategoryID     uuid.UUID `json:"category_id"`
	CategoryName   string    `json:"category_name"`
	MatchType      string    `json:"match_type"`
	SimilarityType string    `json:"similarity_type"`
	MatchedText    string    `json:"matched_text"`
	Confidence     float64   `json:"confidence"`
}

// ========================================
// CONVERSION METHODS
// ========================================

// Convert Transaction to different view types
func (t *Transaction) ToListItem() TransactionListItem {
	return TransactionListItem{
		TransactionView: TransactionView{
			ID:              t.ID,
			AccountID:       t.AccountID,
			CategoryID:      t.CategoryID,
			TransactionDate: t.TransactionDate,
			Description:     t.Description,
			MerchantName:    t.MerchantName,
			Amount:          t.Amount,
			TransactionType: t.TransactionType,
			Currency:        t.Currency,
			Tags:            []string(t.Tags),
		},
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}
}

func (t *Transaction) ToSummary() TransactionSummary {
	return TransactionSummary{
		ID:              t.ID,
		Description:     t.Description,
		Amount:          t.Amount,
		TransactionType: t.TransactionType,
		TransactionDate: t.TransactionDate,
		Currency:        t.Currency,
	}
}

func (t *Transaction) ToDetail(categoryName *string, accountName string) TransactionDetail {
	return TransactionDetail{
		Transaction:  *t,
		CategoryName: categoryName,
		AccountName:  accountName,
	}
}

// ========================================
// VALIDATION HELPERS
// ========================================

func (ti *TransactionRequest) IsValid() []string {
	var errors []string

	if ti.AccountID == "" {
		errors = append(errors, "account_id is required")
	}

	if ti.TransactionDate == "" {
		errors = append(errors, "transaction_date is required")
	}

	if ti.Description == "" {
		errors = append(errors, "description is required")
	}

	if ti.Amount == 0 {
		errors = append(errors, "amount cannot be zero")
	}

	if ti.TransactionType == "" {
		errors = append(errors, "transaction_type is required")
	}

	if ti.Currency == "" {
		errors = append(errors, "currency is required")
	}

	// Validate transaction type
	validTypes := map[string]bool{
		"income": true, "expense": true, "transfer": true,
		"fee": true, "interest": true, "dividend": true, "refund": true,
	}

	if !validTypes[ti.TransactionType] {
		errors = append(errors, fmt.Sprintf("invalid transaction_type: %s", ti.TransactionType))
	}

	return errors
}

// BulkUploadResponse - For bulk import results
type BulkUploadResponse struct {
	Created      int      `json:"created"`
	Skipped      int      `json:"skipped"`
	Duplicates   []string `json:"duplicates,omitempty"` // FitIDs of duplicates
	Errors       []string `json:"errors,omitempty"`
	FileUploadID *string  `json:"file_upload_id,omitempty"`
}

type TransactionCategorizationResult struct {
	Description        string                  `json:"description"`
	Result             *CategoryMatchResult    `json:"result,omitempty"`
	Stats              *category.MatchingStats `json:"stats,omitempty"`
	WouldBeCategorized bool                    `json:"would_be_categorized"`
}

type TransactionPreview struct {
	Index                 int        `json:"index"`
	Description           string     `json:"description"`
	MerchantName          *string    `json:"merchant_name,omitempty"`
	OriginalCategory      *string    `json:"original_category,omitempty"`
	SuggestedCategory     *uuid.UUID `json:"suggested_category,omitempty"`
	SuggestedCategoryName *string    `json:"suggested_category_name,omitempty"`
	Confidence            float64    `json:"confidence"`
	MatchMethod           string     `json:"match_method"`
	WillBeCategorized     bool       `json:"will_be_categorized"`
}
