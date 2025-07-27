package account

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ==================================
// ACCOUNT MODEL
// ==================================

type Account struct {
	ID                  uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	UserID              uuid.UUID      `json:"user_id" gorm:"type:uuid;not null;index;constraint:OnDelete:CASCADE"`
	AccountName         string         `json:"account_name" gorm:"size:100;not null"`
	AccountNumberMasked *string        `json:"account_number_masked,omitempty" gorm:"size:20"`
	AccountType         string         `json:"account_type" gorm:"size:50;not null;check:account_type IN ('checking','savings','credit_card','investment','loan','other')"`
	BankName            string         `json:"bank_name" gorm:"size:100;not null"`
	RoutingNumber       *string        `json:"routing_number,omitempty" gorm:"size:20"`
	IsActive            bool           `json:"is_active" gorm:"default:true"`
	CurrentBalance      *float64       `json:"current_balance,omitempty" gorm:"type:decimal(12,2)"`
	Currency            string         `json:"currency" gorm:"size:3;default:'USD'"`
	CreatedAt           time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt           time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt           gorm.DeletedAt `gorm:"index"`
}

func (Account) TableName() string {
	return "accounts"
}

// BeforeCreate GORM hook
func (a *Account) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type AccountFilter struct {
	Page        int     `form:"page" binding:"omitempty,min=1"`
	Limit       int     `form:"limit" binding:"omitempty,min=1,max=100"`
	Search      *string `form:"search"`
	AccountType *string `form:"account_type"`
	IsActive    *bool   `form:"is_active"`
}

type PaginatedResponse[T any] struct {
	Data  []T   `json:"data"`
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Pages int   `json:"pages"`
}

type AccountResponse = PaginatedResponse[Account]

// AccountSummary represents aggregated account information
type AccountSummary struct {
	TotalAccounts    int                `json:"total_accounts"`
	TotalBalance     float64            `json:"total_balance"`
	ActiveAccounts   int                `json:"active_accounts"`
	InactiveAccounts int                `json:"inactive_accounts"`
	ByType           []AccountTypeStats `json:"by_type"`
}

type AccountTypeStats struct {
	AccountType  string  `json:"account_type"`
	Count        int     `json:"count"`
	TotalBalance float64 `json:"total_balance"`
}

type AccountDetailResponse struct {
	Account
}

func (a *Account) ToResponse() AccountDetailResponse {
	return AccountDetailResponse{Account: *a}
}
