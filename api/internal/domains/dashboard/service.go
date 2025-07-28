package dashboard

import (
	"context"
	"fmt"
	"time"

	"hi-cfo/api/internal/logger"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

type DashboardStore interface {
	GetOverview(ctx context.Context, userID uuid.UUID) (*DashboardOverview, error)
	GetStats(ctx context.Context, userID uuid.UUID, period, category string) (*DashboardStats, error)
	GetReports(ctx context.Context, userID uuid.UUID, page, limit int, reportType string) (*ReportsResponse, error)
}

// DashboardService provides methods to interact with the dashboard data.
type DashboardService struct {
	repo   *DashboardRepository
	logger *logrus.Entry
}

// NewDashboardService creates a new instance of DashboardService.
func NewDashboardService(repo *DashboardRepository) *DashboardService {
	return &DashboardService{
		repo:   repo,
		logger: logger.WithDomain("account"),
	}
}

// GetOverview retrieves the dashboard overview for a user.
func (s *DashboardService) GetOverview(ctx context.Context, userID uuid.UUID) (*DashboardOverview, error) {
	// Get key metrics for the dashboard overview
	totalRevenue, err := s.repo.GetTotalRevenue(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total revenue: %w", err)
	}

	totalExpenses, err := s.repo.GetTotalExpenses(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total expenses: %w", err)
	}

	activeProjects, err := s.repo.GetActiveProjectsCount(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active projects: %w", err)
	}

	recentTransactions, err := s.repo.GetRecentTransactions(ctx, userID, 5)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent transactions: %w", err)
	}

	overview := &DashboardOverview{
		TotalRevenue:       totalRevenue,
		TotalExpenses:      totalExpenses,
		NetIncome:          totalRevenue - totalExpenses,
		ActiveProjects:     int(activeProjects),
		RecentTransactions: recentTransactions,
		LastUpdated:        time.Now(),
	}

	return overview, nil
}

// GetStats retrieves various statistics for the dashboard.
func (s *DashboardService) GetStats(ctx context.Context, userID uuid.UUID, period, category string) (*DashboardStats, error) {
	// Parse period into time range
	endDate := time.Now()
	var startDate time.Time

	switch period {
	case "7d":
		startDate = endDate.AddDate(0, 0, -7)
	case "30d":
		startDate = endDate.AddDate(0, 0, -30)
	case "90d":
		startDate = endDate.AddDate(0, 0, -90)
	case "1y":
		startDate = endDate.AddDate(-1, 0, 0)
	default:
		startDate = endDate.AddDate(0, 0, -30)
	}

	monthlyData, err := s.repo.GetMonthlyData(ctx, userID, startDate, endDate, category)
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly data: %w", err)
	}

	categoryBreakdown, err := s.repo.GetCategoryBreakdown(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get category breakdown: %w", err)
	}

	stats := &DashboardStats{
		Period:            period,
		MonthlyData:       monthlyData,
		CategoryBreakdown: categoryBreakdown,
		StartDate:         startDate,
		EndDate:           endDate,
	}

	return stats, nil
}

// GetReports retrieves paginated reports for the dashboard.
func (s *DashboardService) GetReports(ctx context.Context, userID uuid.UUID, page, limit int, reportType string) (*ReportsResponse, error) {
	offset := (page - 1) * limit

	reports, total, err := s.repo.GetReports(ctx, userID, offset, limit, reportType)
	if err != nil {
		return nil, fmt.Errorf("failed to get reports: %w", err)
	}

	pages := int((int64(total) + int64(limit) - 1) / int64(limit))
	response := &ReportsResponse{
		Data:  reports,
		Total: int64(total),
		Page:  page,
		Limit: limit,
		Pages: pages,
	}

	return response, nil
}
