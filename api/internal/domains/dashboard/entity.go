package dashboard

import (
	"time"

	"hi-cfo/api/internal/domains/transaction"

	"github.com/google/uuid"
)

type DashboardOverview struct {
	TotalRevenue       float64                   `json:"total_revenue"`
	TotalExpenses      float64                   `json:"total_expenses"`
	NetIncome          float64                   `json:"net_income"`
	ActiveProjects     int                       `json:"active_projects"`
	RecentTransactions []transaction.Transaction `json:"recent_transactions"`
	LastUpdated        time.Time                 `json:"last_updated"`
}

type DashboardStats struct {
	Period            string         `json:"period"`
	MonthlyData       []MonthlyData  `json:"monthly_data"`
	CategoryBreakdown []CategoryData `json:"category_breakdown"`
	StartDate         time.Time      `json:"start_date"`
	EndDate           time.Time      `json:"end_date"`
}

type PaginatedResponse[T any] struct {
	Data  []T   `json:"data"`
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Pages int   `json:"pages"`
}

type ReportsResponse = PaginatedResponse[Report]

type MonthlyData struct {
	Month    string  `json:"month"`
	Revenue  float64 `json:"revenue"`
	Expenses float64 `json:"expenses"`
}

type CategoryData struct {
	Category   string  `json:"category"`
	Amount     float64 `json:"amount"`
	Percentage float64 `json:"percentage"`
}

type Report struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title     string    `json:"title"`
	Type      string    `json:"type"`
	CreatedAt time.Time `json:"created_at"`
}
